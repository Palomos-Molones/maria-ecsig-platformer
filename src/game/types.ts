export type RunState = 'intro' | 'playing' | 'game-over' | 'victory'

export type HudState = {
  levelName: string
  levelIndex: number
  score: number
  health: number
  invoices: number
  totalInvoices: number
}

export type LevelTheme = {
  skyTop: number
  skyBottom: number
  wall: number
  platform: number
  accent: number
  hazard: number
}

export type PlatformSpec = {
  x: number
  y: number
  width: number
  height: number
  label?: string
}

export type EnemySpec = {
  x: number
  y: number
  minX: number
  maxX: number
  speed: number
  texture: 'bug' | 'ticket'
}

export type ObstacleSpec = {
  x: number
  y: number
  texture: 'cable' | 'panel'
}

export type DecorationSpec = {
  x: number
  y: number
  texture: 'server' | 'erp'
  label?: string
}

export type LevelSpec = {
  name: string
  subtitle: string
  worldWidth: number
  playerStart: { x: number; y: number }
  goal: { x: number; y: number }
  theme: LevelTheme
  platforms: PlatformSpec[]
  invoices: { x: number; y: number }[]
  enemies: EnemySpec[]
  obstacles: ObstacleSpec[]
  decorations: DecorationSpec[]
}
