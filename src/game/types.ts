export type RunState = 'intro' | 'playing' | 'game-over' | 'victory'

export type TouchControl = 'left' | 'right' | 'jump'

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
  platformEdge: number
  accent: number
  hazard: number
}

export type MovingPlatformSpec = {
  axis: 'x' | 'y'
  min: number
  max: number
  speed: number
}

export type PlatformSpec = {
  x: number
  y: number
  width: number
  height: number
  label?: string
  moving?: MovingPlatformSpec
}

export type EnemyKind = 'ground-dev' | 'flying-bug' | 'ceo'

export type EnemySpec = {
  x: number
  y: number
  minX: number
  maxX: number
  speed: number
  kind: EnemyKind
  health?: number
  amplitude?: number
  scale?: number
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
