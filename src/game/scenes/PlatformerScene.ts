import Phaser from 'phaser'
import { playActionSound, setRetroMusicLevel } from '../../audio/retroMusic'
import { emitGameOver, emitHud, emitVictory } from '../events'
import { levels } from '../levels'
import type { EnemyKind, EnemySpec, HudState, LevelSpec, MovingPlatformSpec, TouchControl } from '../types'

const worldHeight = 720
const fallDeathY = worldHeight + 42
const playerDisplay = { width: 74, height: 98 }
const playerBody = { width: 50, height: 78, offsetX: 39, offsetY: 80 }
const invoiceDisplay = { width: 48, height: 58, yOffset: -22 }

type SceneData = {
  levelIndex?: number
  score?: number
  health?: number
}

type MovingPlatform = {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody
  label?: Phaser.GameObjects.Text
  axis: MovingPlatformSpec['axis']
  min: number
  max: number
  speed: number
  direction: 1 | -1
}

export class PlatformerScene extends Phaser.Scene {
  private levelIndex = 0
  private level!: LevelSpec
  private score = 0
  private health = 5
  private invoices = 0
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Record<'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>
  private enemies!: Phaser.Physics.Arcade.Group
  private touchControls: Record<TouchControl, boolean> = { left: false, right: false, jump: false }
  private touchJumpWasDown = false
  private onTouchControl?: (event: Event) => void
  private invulnerableUntil = 0
  private completed = false
  private movingPlatforms: MovingPlatform[] = []
  private bossAlive = false

  constructor() {
    super('PlatformerScene')
  }

  preload() {
    const artPath = `${import.meta.env.BASE_URL}game-art/`
    this.load.spritesheet('maria', `${artPath}maria-spritesheet.png`, {
      frameWidth: 128,
      frameHeight: 170,
    })
    this.load.image('platform-block', `${artPath}platform-block.png`)
    this.load.image('moving-platform-block', `${artPath}moving-platform-block.png`)
    this.load.image('invoice', `${artPath}invoice.png`)
    this.load.image('server', `${artPath}server.png`)
    this.load.image('erp', `${artPath}erp.png`)
    this.load.image('cable', `${artPath}cable.png`)
    this.load.image('panel', `${artPath}panel.png`)
    this.load.image('ground-dev', `${artPath}ground-dev.png`)
    this.load.image('flying-bug', `${artPath}flying-bug.png`)
    this.load.image('ceo', `${artPath}ceo.png`)
    this.load.image('goal', `${artPath}goal.png`)
  }

  init(data: SceneData) {
    const requestedLevel = Number(new URLSearchParams(window.location.search).get('level') ?? '1') - 1
    const fallbackLevel = Number.isFinite(requestedLevel) ? Phaser.Math.Clamp(requestedLevel, 0, levels.length - 1) : 0
    this.levelIndex = data.levelIndex ?? fallbackLevel
    this.score = data.score ?? 0
    this.health = data.health ?? 5
    this.invoices = 0
    this.completed = false
    this.movingPlatforms = []
    this.bossAlive = false
  }

  create() {
    this.level = levels[this.levelIndex]
    setRetroMusicLevel(this.levelIndex)
    this.physics.world.setBounds(0, 0, this.level.worldWidth, worldHeight + 180)
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, worldHeight)
    this.createBackdrop()
    this.createPlayerAnimations()

    const platforms = this.physics.add.staticGroup()
    for (const spec of this.level.platforms) {
      const texture = spec.moving ? 'moving-platform-block' : 'platform-block'
      const platform = platforms.create(spec.x, spec.y, texture) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody
      platform
        .setDisplaySize(spec.width, spec.height)
        .refreshBody()

      let label: Phaser.GameObjects.Text | undefined
      if (spec.label) {
        label = this.add.text(spec.x, spec.y - 6, spec.label, {
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '16px',
          fontStyle: '900',
          stroke: '#0f172a',
          strokeThickness: 4,
        }).setOrigin(0.5)
      }
      if (spec.moving) {
        platform.setData('moving', true)
        this.movingPlatforms.push({
          sprite: platform,
          label,
          axis: spec.moving.axis,
          min: spec.moving.min,
          max: spec.moving.max,
          speed: spec.moving.speed,
          direction: 1,
        })
      }
    }

    this.createDecorations()
    const invoiceGroup = this.physics.add.staticGroup()
    for (const invoice of this.level.invoices) {
      const invoiceSprite = invoiceGroup.create(
        invoice.x,
        invoice.y + invoiceDisplay.yOffset,
        'invoice',
      ) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody
      invoiceSprite
        .setDisplaySize(invoiceDisplay.width, invoiceDisplay.height)
        .refreshBody()
    }

    const obstacleGroup = this.physics.add.staticGroup()
    for (const obstacle of this.level.obstacles) {
      const sprite = obstacleGroup.create(obstacle.x, obstacle.y, obstacle.texture) as Phaser.Types.Physics.Arcade.SpriteWithStaticBody
      if (obstacle.texture === 'panel') sprite.setDisplaySize(74, 92).refreshBody()
      if (obstacle.texture === 'cable') sprite.setDisplaySize(80, 46).refreshBody()
    }

    const goal = this.physics.add.staticSprite(this.level.goal.x, this.level.goal.y, 'goal')
    goal.setDisplaySize(92, 112).refreshBody()

    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true })
    for (const enemy of this.level.enemies) this.createEnemy(enemy)

    this.player = this.physics.add.sprite(this.level.playerStart.x, this.level.playerStart.y, 'maria')
    this.player.setCollideWorldBounds(true)
    this.player.setDisplaySize(playerDisplay.width, playerDisplay.height)
    this.player.setSize(playerBody.width, playerBody.height)
    this.player.setOffset(playerBody.offsetX, playerBody.offsetY)
    this.player.setMaxVelocity(330, 760)
    this.player.play('maria-idle')

    this.physics.add.collider(this.player, platforms)
    this.physics.add.collider(this.enemies, platforms)
    this.physics.add.overlap(this.player, invoiceGroup, (_player, invoice) => {
      this.collectInvoice(invoice as Phaser.GameObjects.GameObject)
    }, undefined, this)
    this.physics.add.overlap(this.player, obstacleGroup, () => this.damagePlayer(1), undefined, this)
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.hitEnemy(enemy as Phaser.GameObjects.GameObject)
    }, undefined, this)
    this.physics.add.overlap(this.player, goal, () => this.finishLevel(), undefined, this)

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(130, 80)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keys = this.input.keyboard!.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>
    this.bindTouchControls()
    this.emitHud()
  }

  override update(_time: number, delta: number) {
    if (!this.player || this.completed) return

    const left = this.cursors.left.isDown || this.keys.a.isDown || this.touchControls.left
    const right = this.cursors.right.isDown || this.keys.d.isDown || this.touchControls.right
    const touchJump = this.touchControls.jump && !this.touchJumpWasDown
    this.touchJumpWasDown = this.touchControls.jump
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space) ||
      touchJump

    if (left) {
      this.player.setVelocityX(-250)
      this.player.setFlipX(true)
    } else if (right) {
      this.player.setVelocityX(250)
      this.player.setFlipX(false)
    } else {
      this.player.setVelocityX(0)
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(-530)
      playActionSound('jump')
    }
    if (this.player.y > fallDeathY) this.damagePlayer(this.health)

    this.updatePlayerAnimation(left || right)
    this.updateMovingPlatforms(delta)
    this.updateEnemies()
  }

  private createBackdrop() {
    const { width, height } = this.scale
    const compact = width < 560
    const sky = this.add.graphics().setScrollFactor(0)
    sky.fillGradientStyle(
      this.level.theme.skyTop,
      this.level.theme.skyTop,
      this.level.theme.skyBottom,
      this.level.theme.skyBottom,
    )
    sky.fillRect(0, 0, width, height)

    for (let x = 0; x < this.level.worldWidth; x += 260) {
      this.add.rectangle(x + 92, 575, 142, 150, this.level.theme.wall, 0.32)
      this.add.rectangle(x + 92, 512, 96, 36, 0xffffff, 0.16)
      this.add.line(x + 160, 520, 0, 0, 82, 38, this.level.theme.accent, 0.58).setLineWidth(5)
      this.add.rectangle(x + 210, 624, 54, 110, 0x111827, 0.18)
    }

    this.add.text(36, 32, `Ecsig · ${this.level.name}`, {
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: compact ? '19px' : '24px',
      fontStyle: '900',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setScrollFactor(0)

    this.add.text(38, 64, this.level.subtitle, {
      color: '#eff6ff',
      fontFamily: 'monospace',
      fontSize: compact ? '10px' : '14px',
      fontStyle: '700',
      stroke: '#0f172a',
      strokeThickness: compact ? 3 : 4,
    }).setScrollFactor(0)
  }

  private createPlayerAnimations() {
    if (this.anims.exists('maria-idle')) return
    this.anims.create({
      key: 'maria-idle',
      frames: this.anims.generateFrameNumbers('maria', { frames: [0, 1] }),
      frameRate: 3,
      repeat: -1,
    })
    this.anims.create({
      key: 'maria-run',
      frames: this.anims.generateFrameNumbers('maria', { frames: [2, 3, 4, 3] }),
      frameRate: 10,
      repeat: -1,
    })
    this.anims.create({
      key: 'maria-jump',
      frames: this.anims.generateFrameNumbers('maria', { frames: [5] }),
      frameRate: 1,
    })
    this.anims.create({
      key: 'maria-fall',
      frames: this.anims.generateFrameNumbers('maria', { frames: [6] }),
      frameRate: 1,
    })
  }

  private updatePlayerAnimation(moving: boolean) {
    if (!this.player.body.blocked.down) {
      this.player.play(this.player.body.velocity.y < 0 ? 'maria-jump' : 'maria-fall', true)
      return
    }
    this.player.play(moving ? 'maria-run' : 'maria-idle', true)
  }

  private bindTouchControls() {
    this.touchControls = { left: false, right: false, jump: false }
    this.touchJumpWasDown = false
    this.onTouchControl = (event: Event) => {
      const detail = (event as CustomEvent<{ control: TouchControl; pressed: boolean }>).detail
      if (!detail || !(detail.control in this.touchControls)) return
      this.touchControls[detail.control] = detail.pressed
    }
    window.addEventListener('ecsig-control', this.onTouchControl)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.onTouchControl) window.removeEventListener('ecsig-control', this.onTouchControl)
    })
  }

  private createDecorations() {
    for (const decoration of this.level.decorations) {
      this.add.image(decoration.x, decoration.y, decoration.texture)
      if (decoration.label) {
        this.add.text(decoration.x, decoration.y + 48, decoration.label, {
          color: '#fef3c7',
          fontFamily: 'monospace',
          fontSize: '13px',
          fontStyle: '900',
          stroke: '#111827',
          strokeThickness: 4,
        }).setOrigin(0.5)
      }
    }
  }

  private createEnemy(spec: EnemySpec) {
    const enemy = this.enemies.create(spec.x, spec.y, this.getEnemyTexture(spec.kind)) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    const scale = spec.scale ?? (spec.kind === 'ceo' ? 1.45 : 1)
    if (spec.kind === 'ceo') enemy.setDisplaySize(104 * scale, 118 * scale)
    else if (spec.kind === 'flying-bug') enemy.setDisplaySize(68 * scale, 58 * scale)
    else enemy.setDisplaySize(72 * scale, 66 * scale)
    enemy.setData('minX', spec.minX)
    enemy.setData('maxX', spec.maxX)
    enemy.setData('speed', spec.speed)
    enemy.setData('kind', spec.kind)
    enemy.setData('health', spec.health ?? 1)
    enemy.setData('baseY', spec.y)
    enemy.setData('amplitude', spec.amplitude ?? 0)
    enemy.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2))
    enemy.setVelocityX(spec.speed)
    enemy.body.setSize(spec.kind === 'ceo' ? 74 : 52, spec.kind === 'flying-bug' ? 38 : 48)
    if (spec.kind === 'ceo') enemy.body.setOffset(29, 30)
    if (spec.kind === 'ceo') this.bossAlive = true
  }

  private getEnemyTexture(kind: EnemyKind) {
    if (kind === 'flying-bug') return 'flying-bug'
    if (kind === 'ceo') return 'ceo'
    return 'ground-dev'
  }

  private updateMovingPlatforms(delta: number) {
    for (const platform of this.movingPlatforms) {
      const distance = platform.speed * (delta / 1000) * platform.direction
      const next = platform.sprite[platform.axis] + distance
      if (next >= platform.max) platform.direction = -1
      if (next <= platform.min) platform.direction = 1
      platform.sprite[platform.axis] = Phaser.Math.Clamp(next, platform.min, platform.max)
      platform.sprite.refreshBody()
      if (platform.label) platform.label[platform.axis] = platform.sprite[platform.axis]
    }
  }

  private updateEnemies() {
    for (const item of this.enemies.getChildren()) {
      const enemy = item as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const minX = enemy.getData('minX') as number
      const maxX = enemy.getData('maxX') as number
      const speed = enemy.getData('speed') as number
      const kind = enemy.getData('kind') as EnemyKind

      if (enemy.x <= minX) enemy.setVelocityX(speed)
      if (enemy.x >= maxX) enemy.setVelocityX(-speed)
      enemy.setFlipX(enemy.body.velocity.x < 0)
      if (kind === 'flying-bug') {
        const amplitude = enemy.getData('amplitude') as number
        const baseY = enemy.getData('baseY') as number
        const phase = enemy.getData('phase') as number
        enemy.y = baseY + Math.sin(this.time.now / 260 + phase) * amplitude
      }
    }
  }

  private collectInvoice(invoice: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.GameObjects.GameObject) {
    invoice.destroy()
    playActionSound('invoice')
    this.invoices += 1
    this.score += 120
    this.emitHud()
  }

  private hitEnemy(enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.GameObjects.GameObject) {
    const enemy = enemyObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    if (this.player.body.velocity.y > 120 && this.player.y < enemy.y - 8) {
      const kind = enemy.getData('kind') as EnemyKind
      const nextHealth = (enemy.getData('health') as number) - 1
      enemy.setData('health', nextHealth)
      this.player.setVelocityY(-360)
      playActionSound('enemy')
      this.score += kind === 'ceo' ? 320 : 180
      if (nextHealth <= 0) {
        if (kind === 'ceo') {
          this.bossAlive = false
          this.cameras.main.flash(260, 255, 232, 121)
        }
        enemy.destroy()
      } else {
        enemy.setTint(0xfff86b)
        this.time.delayedCall(120, () => enemy.clearTint())
      }
      this.emitHud()
      return
    }
    this.damagePlayer(1)
  }

  private damagePlayer(amount: number) {
    if (this.time.now < this.invulnerableUntil || this.completed) return

    this.health -= amount
    playActionSound('damage')
    this.invulnerableUntil = this.time.now + 1100
    this.cameras.main.shake(130, 0.008)
    this.player.setTint(0xff6b6b)
    this.time.delayedCall(180, () => this.player.clearTint())
    this.emitHud()

    if (this.health <= 0) {
      this.completed = true
      this.physics.pause()
      emitGameOver()
      return
    }

    if (amount >= 3) {
      this.player.setPosition(this.level.playerStart.x, this.level.playerStart.y)
      this.player.setVelocity(0, 0)
    }
  }

  private finishLevel() {
    if (this.completed) return
    if (this.levelIndex === levels.length - 1 && this.bossAlive) {
      this.damagePlayer(1)
      this.cameras.main.shake(180, 0.012)
      return
    }
    this.completed = true
    this.score += 500 + this.invoices * 50
    this.emitHud()

    if (this.levelIndex === levels.length - 1) {
      playActionSound('victory')
      this.physics.pause()
      emitVictory()
      return
    }

    playActionSound('level')
    this.cameras.main.flash(450, 255, 250, 205)
    this.time.delayedCall(620, () => {
      this.scene.restart({
        levelIndex: this.levelIndex + 1,
        score: this.score,
        health: this.health,
      } satisfies SceneData)
    })
  }

  private emitHud() {
    const payload: HudState = {
      levelName: this.level.name,
      levelIndex: this.levelIndex,
      score: this.score,
      health: Math.max(this.health, 0),
      invoices: this.invoices,
      totalInvoices: this.level.invoices.length,
    }
    emitHud(payload)
  }
}
