import { RotateCcw, Trophy, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { startRetroMusic } from './audio/retroMusic'
import { GameCanvas } from './game/GameCanvas'
import type { HudState, RunState, TouchControl } from './game/types'
import './App.css'

const initialHud: HudState = {
  levelName: 'Desenvolupament',
  levelIndex: 0,
  score: 0,
  health: 5,
  invoices: 0,
  totalInvoices: 8,
}

function App() {
  const [runState, setRunState] = useState<RunState>('intro')
  const [runId, setRunId] = useState(0)
  const [hud, setHud] = useState<HudState>(initialHud)

  useEffect(() => {
    const onGameEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail.type === 'hud') setHud(detail.payload)
      if (detail.type === 'game-over') setRunState('game-over')
      if (detail.type === 'victory') setRunState('victory')
    }

    window.addEventListener('ecsig-game', onGameEvent)
    return () => window.removeEventListener('ecsig-game', onGameEvent)
  }, [])

  const start = async () => {
    await startRetroMusic()
    setHud(initialHud)
    setRunId((current) => current + 1)
    setRunState('playing')
  }

  const pressControl = (control: TouchControl, pressed: boolean) => {
    window.dispatchEvent(new CustomEvent('ecsig-control', { detail: { control, pressed } }))
  }

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Maria a Ecsig">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-mark"><Zap size={18} /></span>
            <div>
              <p>Ecsig Arcade</p>
              <strong>Maria contra el caos ERP</strong>
            </div>
          </div>
          <div className="hud-grid" aria-live="polite">
            <span>Nivell <strong>{hud.levelIndex + 1}/5</strong></span>
            <span>{hud.levelName}</span>
            <span>Punts <strong>{hud.score}</strong></span>
            <span>Vida <strong>{'♥'.repeat(hud.health)}</strong></span>
            <span>Factures <strong>{hud.invoices}/{hud.totalInvoices}</strong></span>
          </div>
        </header>

        <div className="stage-wrap">
          {runState !== 'intro' && <GameCanvas key={runId} active={runState === 'playing'} />}

          {runState === 'playing' && (
            <div className="touch-controls" aria-label="Controls tàctils">
              <div className="touch-move">
                <button
                  type="button"
                  aria-label="Moure Maria a l'esquerra"
                  onPointerDown={() => pressControl('left', true)}
                  onPointerUp={() => pressControl('left', false)}
                  onPointerLeave={() => pressControl('left', false)}
                  onPointerCancel={() => pressControl('left', false)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Moure Maria a la dreta"
                  onPointerDown={() => pressControl('right', true)}
                  onPointerUp={() => pressControl('right', false)}
                  onPointerLeave={() => pressControl('right', false)}
                  onPointerCancel={() => pressControl('right', false)}
                >
                  →
                </button>
              </div>
              <button
                type="button"
                className="touch-jump"
                aria-label="Fer saltar Maria"
                onPointerDown={() => pressControl('jump', true)}
                onPointerUp={() => pressControl('jump', false)}
                onPointerLeave={() => pressControl('jump', false)}
                onPointerCancel={() => pressControl('jump', false)}
              >
                ↑
              </button>
            </div>
          )}

          {runState === 'intro' && (
            <div className="overlay intro-panel">
              <div className="pixel-badge">React 19 + Phaser · 8-bit</div>
              <h1>Maria a Ecsig</h1>
              <p>
                Maria salta entre ERPs, factures i quadres elèctrics per derrotar bugs,
                devs maliciosos i el CEO que tampoc vol treballar.
              </p>
              <div className="level-strip">
                <span>Desenvolupament</span>
                <span>Suport</span>
                <span>Facturació</span>
                <span>Infraestructura</span>
                <span>Direcció</span>
              </div>
              <button className="primary-action" type="button" onClick={start}>
                Jugar
              </button>
              <p className="keys">Fletxes o WASD per moure, espai per saltar. En mòbil, botons tàctils.</p>
            </div>
          )}

          {runState === 'game-over' && (
            <div className="overlay result-panel danger">
              <RotateCcw size={42} />
              <h2>Game over</h2>
              <p>Els tickets han col·lapsat el sprint. Maria necessita una altra ronda.</p>
              <button className="primary-action" type="button" onClick={start}>
                Reintentar
              </button>
            </div>
          )}

          {runState === 'victory' && (
            <div className="overlay result-panel">
              <Trophy size={46} />
              <h2>Victòria</h2>
              <p>
                Maria supera Direcció, aconsegueix un augment i una cita amb el DevOps.
                Està canyón.
              </p>
              <button className="primary-action" type="button" onClick={start}>
                Tornar a jugar
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
