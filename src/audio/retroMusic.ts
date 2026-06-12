let audioContext: AudioContext | null = null
let loopTimer: number | undefined
let leadStep = 0
let currentTrack = 0

type SoundEffect = 'jump' | 'invoice' | 'enemy' | 'damage' | 'level' | 'victory'

const tracks = [
  {
    lead: [659, 784, 988, 784, 659, 523, 587, 659, 784, 988, 1175, 988, 784, 659, 587, 523],
    bass: [165, 165, 196, 196, 220, 220, 196, 196],
    tempo: 150,
  },
  {
    lead: [587, 740, 880, 988, 880, 740, 659, 740, 880, 1109, 988, 880, 740, 659, 587, 494],
    bass: [147, 147, 185, 185, 220, 220, 185, 165],
    tempo: 142,
  },
  {
    lead: [784, 988, 1047, 988, 880, 784, 659, 587, 659, 784, 880, 988, 880, 784, 659, 587],
    bass: [196, 196, 247, 247, 220, 220, 165, 165],
    tempo: 165,
  },
  {
    lead: [523, 622, 740, 831, 740, 622, 523, 466, 523, 622, 740, 932, 831, 740, 622, 523],
    bass: [131, 156, 185, 156, 139, 165, 208, 165],
    tempo: 132,
  },
  {
    lead: [880, 988, 1175, 1319, 1175, 988, 880, 740, 784, 932, 1047, 1245, 1175, 1047, 932, 784],
    bass: [220, 220, 196, 196, 175, 175, 196, 247],
    tempo: 128,
  },
]

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

function getAudioContext() {
  if (audioContext) return audioContext
  const AudioCtor = window.AudioContext ?? window.webkitAudioContext
  if (!AudioCtor) return null
  audioContext = new AudioCtor()
  return audioContext
}

function playTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'square',
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function scheduleBeat() {
  const context = getAudioContext()
  if (!context) return
  const track = tracks[currentTrack]
  const now = context.currentTime
  playTone(context, track.lead[leadStep % track.lead.length], now, 0.105, 0.023)
  if (leadStep % 2 === 0) playTone(context, track.bass[(leadStep / 2) % track.bass.length], now, 0.14, 0.017)
  leadStep += 1
}

function restartLoop() {
  if (loopTimer) window.clearInterval(loopTimer)
  scheduleBeat()
  loopTimer = window.setInterval(scheduleBeat, tracks[currentTrack].tempo)
}

export async function startRetroMusic() {
  const context = getAudioContext()
  if (!context) return
  if (context.state === 'suspended') await context.resume()
  if (loopTimer) return
  restartLoop()
}

export function setRetroMusicLevel(levelIndex: number) {
  const nextTrack = Math.max(0, Math.min(levelIndex, tracks.length - 1))
  if (nextTrack === currentTrack) return
  currentTrack = nextTrack
  leadStep = 0
  if (loopTimer) restartLoop()
}

export function playActionSound(effect: SoundEffect) {
  const context = getAudioContext()
  if (!context || context.state !== 'running') return
  const now = context.currentTime

  if (effect === 'jump') {
    playTone(context, 523, now, 0.055, 0.035, 'triangle')
    playTone(context, 784, now + 0.045, 0.075, 0.03, 'triangle')
  } else if (effect === 'invoice') {
    playTone(context, 988, now, 0.055, 0.035)
    playTone(context, 1319, now + 0.055, 0.08, 0.032)
  } else if (effect === 'enemy') {
    playTone(context, 196, now, 0.05, 0.04, 'sawtooth')
    playTone(context, 330, now + 0.05, 0.08, 0.035, 'square')
  } else if (effect === 'damage') {
    playTone(context, 220, now, 0.08, 0.045, 'sawtooth')
    playTone(context, 147, now + 0.07, 0.12, 0.04, 'sawtooth')
  } else if (effect === 'level') {
    playTone(context, 659, now, 0.08, 0.035)
    playTone(context, 880, now + 0.08, 0.08, 0.035)
    playTone(context, 1175, now + 0.16, 0.12, 0.035)
  } else {
    playTone(context, 784, now, 0.09, 0.035)
    playTone(context, 988, now + 0.09, 0.09, 0.035)
    playTone(context, 1319, now + 0.18, 0.16, 0.035)
  }
}

export function stopRetroMusic() {
  if (!loopTimer) return
  window.clearInterval(loopTimer)
  loopTimer = undefined
}
