let audioContext: AudioContext | null = null
let loopTimer: number | undefined
let leadStep = 0

const lead = [659, 784, 988, 784, 659, 523, 587, 659, 784, 988, 1175, 988, 784, 659, 587, 523]
const bass = [165, 165, 196, 196, 220, 220, 196, 196]

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

function playTone(context: AudioContext, frequency: number, start: number, duration: number, gainValue: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'square'
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
  const now = context.currentTime
  playTone(context, lead[leadStep % lead.length], now, 0.105, 0.025)
  if (leadStep % 2 === 0) playTone(context, bass[(leadStep / 2) % bass.length], now, 0.14, 0.018)
  leadStep += 1
}

export async function startRetroMusic() {
  const context = getAudioContext()
  if (!context) return
  if (context.state === 'suspended') await context.resume()
  if (loopTimer) return
  scheduleBeat()
  loopTimer = window.setInterval(scheduleBeat, 150)
}

export function stopRetroMusic() {
  if (!loopTimer) return
  window.clearInterval(loopTimer)
  loopTimer = undefined
}
