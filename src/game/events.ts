import type { HudState } from './types'

export function emitHud(payload: HudState) {
  window.dispatchEvent(new CustomEvent('ecsig-game', { detail: { type: 'hud', payload } }))
}

export function emitGameOver() {
  window.dispatchEvent(new CustomEvent('ecsig-game', { detail: { type: 'game-over' } }))
}

export function emitVictory() {
  window.dispatchEvent(new CustomEvent('ecsig-game', { detail: { type: 'victory' } }))
}
