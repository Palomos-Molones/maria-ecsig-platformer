import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { PlatformerScene } from './scenes/PlatformerScene'

type GameCanvasProps = {
  active: boolean
}

export function GameCanvas({ active }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!hostRef.current) return undefined

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      width: 960,
      height: 540,
      backgroundColor: '#7dd3fc',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 980, x: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [PlatformerScene],
      render: {
        pixelArt: false,
        antialias: true,
      },
    })

    gameRef.current = game
    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!gameRef.current) return
    if (active) gameRef.current.scene.resume('PlatformerScene')
    else gameRef.current.scene.pause('PlatformerScene')
  }, [active])

  return <div className="game-host" ref={hostRef} />
}
