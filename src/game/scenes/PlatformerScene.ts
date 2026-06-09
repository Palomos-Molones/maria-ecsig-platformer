import Phaser from 'phaser'
import { createGeneratedAssets } from '../assets'
import { emitGameOver, emitHud, emitVictory } from '../events'
import { levels } from '../levels'
import type { EnemySpec, HudState, LevelSpec } from '../types'

type SceneData = {
  levelIndex?: number
  score?: number
  health?: number
}

export class PlatformerScene extends Phaser.Scene {
  private levelIndex = 0
  private level!: LevelSpec
  private score = 0
  private health = 3
  private invoices = 0
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keys!: Record<'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>
  private enemies!: Phaser.Physics.Arcade.Group
  private invulnerableUntil = 0
  private completed = false

  constructor() {
    super('PlatformerScene')
  }

  init(data: SceneData) {
    const requestedLevel = Number(new URLSearchParams(window.location.search).get('level') ?? '1') - 1
    const fallbackLevel = Number.isFinite(requestedLevel) ? Phaser.Math.Clamp(requestedLevel, 0, levels.length - 1) : 0
    this.levelIndex = data.levelIndex ?? fallbackLevel
    this.score = data.score ?? 0
    this.health = data.health ?? 3
    this.invoices = 0
    this.completed = false
  }

  create() {
    createGeneratedAssets(this)
    this.level = levels[this.levelIndex]
    this.physics.world.setBounds(0, 0, this.level.worldWidth, 720)
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, 720)
    this.createBackdrop()

    const platforms = this.physics.add.staticGroup()
    for (const spec of this.level.platforms) {
      const platform = this.add.rectangle(spec.x, spec.y, spec.width, spec.height, this.level.theme.platform)
      platform.setStrokeStyle(4, 0xffffff, 0.35)
      platforms.add(platform)
      if (spec.label) {
        this.add.text(spec.x, spec.y - 6, spec.label, {
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '16px',
          fontStyle: '900',
        }).setOrigin(0.5)
      }
    }

    this.createDecorations()
    const invoiceGroup = this.physics.add.staticGroup()
    for (const invoice of this.level.invoices) {
      invoiceGroup.create(invoice.x, invoice.y, 'invoice')
    }

    const obstacleGroup = this.physics.add.staticGroup()
    for (const obstacle of this.level.obstacles) {
      obstacleGroup.create(obstacle.x, obstacle.y, obstacle.texture)
    }

    const goal = this.physics.add.staticSprite(this.level.goal.x, this.level.goal.y, 'goal')

    this.enemies = this.physics.add.group({ allowGravity: false, immovable: true })
    for (const enemy of this.level.enemies) this.createEnemy(enemy)

    this.player = this.physics.add.sprite(this.level.playerStart.x, this.level.playerStart.y, 'maria')
    this.player.setCollideWorldBounds(true)
    this.player.setSize(34, 56)
    this.player.setOffset(11, 8)
    this.player.setMaxVelocity(330, 760)

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
    this.emitHud()
  }

  override update() {
    if (!this.player || this.completed) return

    const left = this.cursors.left.isDown || this.keys.a.isDown
    const right = this.cursors.right.isDown || this.keys.d.isDown
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.w) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)

    if (left) {
      this.player.setVelocityX(-250)
      this.player.setFlipX(true)
    } else if (right) {
      this.player.setVelocityX(250)
      this.player.setFlipX(false)
    } else {
      this.player.setVelocityX(0)
    }

    if (jump && this.player.body.blocked.down) this.player.setVelocityY(-530)
    if (this.player.y > 760) this.damagePlayer(3)

    this.player.setAngle(this.player.body.blocked.down ? 0 : Phaser.Math.Clamp(this.player.body.velocity.y / 65, -8, 8))
    this.updateEnemies()
  }

  private createBackdrop() {
    const { width, height } = this.scale
    const sky = this.add.graphics().setScrollFactor(0)
    sky.fillGradientStyle(
      this.level.theme.skyTop,
      this.level.theme.skyTop,
      this.level.theme.skyBottom,
      this.level.theme.skyBottom,
    )
    sky.fillRect(0, 0, width, height)

    for (let x = 0; x < this.level.worldWidth; x += 260) {
      this.add.rectangle(x + 90, 575, 120, 150, this.level.theme.wall, 0.34)
      this.add.rectangle(x + 90, 512, 76, 36, 0xffffff, 0.18)
      this.add.line(x + 160, 520, 0, 0, 80, 36, this.level.theme.accent, 0.45).setLineWidth(5)
    }

    this.add.text(36, 32, `Ecsig · ${this.level.name}`, {
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '24px',
      fontStyle: '900',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setScrollFactor(0)

    this.add.text(38, 64, this.level.subtitle, {
      color: '#eff6ff',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontStyle: '700',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setScrollFactor(0)
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
    const enemy = this.enemies.create(spec.x, spec.y, spec.texture) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    enemy.setData('minX', spec.minX)
    enemy.setData('maxX', spec.maxX)
    enemy.setData('speed', spec.speed)
    enemy.setVelocityX(spec.speed)
    enemy.body.setSize(44, 34)
  }

  private updateEnemies() {
    for (const item of this.enemies.getChildren()) {
      const enemy = item as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
      const minX = enemy.getData('minX') as number
      const maxX = enemy.getData('maxX') as number
      const speed = enemy.getData('speed') as number

      if (enemy.x <= minX) enemy.setVelocityX(speed)
      if (enemy.x >= maxX) enemy.setVelocityX(-speed)
      enemy.setFlipX(enemy.body.velocity.x < 0)
    }
  }

  private collectInvoice(invoice: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.GameObjects.GameObject) {
    invoice.destroy()
    this.invoices += 1
    this.score += 120
    this.emitHud()
  }

  private hitEnemy(enemyObject: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.GameObjects.GameObject) {
    const enemy = enemyObject as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    if (this.player.body.velocity.y > 120 && this.player.y < enemy.y - 8) {
      enemy.destroy()
      this.player.setVelocityY(-360)
      this.score += 180
      this.emitHud()
      return
    }
    this.damagePlayer(1)
  }

  private damagePlayer(amount: number) {
    if (this.time.now < this.invulnerableUntil || this.completed) return

    this.health -= amount
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
    this.completed = true
    this.score += 500 + this.invoices * 50
    this.emitHud()

    if (this.levelIndex === levels.length - 1) {
      this.physics.pause()
      emitVictory()
      return
    }

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
