// Synthesized Web Audio API Sound Engine (100% self-contained, no external audio files required)

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, duration, type = 'sine', gainVal = 0.2, delay = 0, targetFreq = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const startTime = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (targetFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq), startTime + duration);
      }

      const peakGain = gainVal * this.volume;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain), startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.03);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  playNoise(duration, gainVal = 0.1, delay = 0, cutoff = 900) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;

      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + delay;
      gain.gain.setValueAtTime(gainVal * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(startTime);
    } catch (e) {
      console.warn('Noise play error', e);
    }
  }

  // --- Game SFX Events ---

  start() {
    this.playTone(523, 0.14, 'triangle', 0.2);
    this.playTone(784, 0.22, 'triangle', 0.25, 0.09);
    this.playTone(1047, 0.28, 'sine', 0.2, 0.18);
    this.playNoise(0.2, 0.08, 0.05, 1200);
  }

  cardFlip() {
    this.playTone(440, 0.12, 'sine', 0.15, 0, 700);
    this.playNoise(0.15, 0.08, 0, 800);
  }

  cardHide() {
    this.playTone(600, 0.12, 'sine', 0.12, 0, 320);
    this.playNoise(0.12, 0.06, 0, 600);
  }

  tick() {
    this.playTone(1800 + Math.random() * 200, 0.03, 'square', 0.06);
    this.playNoise(0.015, 0.04, 0, 3500);
  }

  timerAlert() {
    this.playTone(520, 0.12, 'sine', 0.2, 0, 330);
    this.playTone(390, 0.2, 'sine', 0.22, 0.12, 200);
  }

  buzzer() {
    this.playTone(150, 0.35, 'sawtooth', 0.25, 0, 100);
    this.playTone(120, 0.45, 'sawtooth', 0.28, 0.15, 80);
    this.playNoise(0.3, 0.1, 0, 400);
  }

  voteSelect() {
    this.playTone(560, 0.08, 'sine', 0.18, 0, 300);
  }

  voteSubmit() {
    this.playTone(560, 0.11, 'sine', 0.2, 0, 300);
    this.playTone(1120, 0.15, 'sine', 0.15, 0.05, 600);
  }

  suspenseDrone() {
    this.playTone(62, 0.6, 'sine', 0.25);
    this.playTone(54, 0.7, 'sine', 0.2, 0.17);
    this.playNoise(0.4, 0.06, 0, 400);
  }

  guardianShield() {
    [523, 659, 784, 1047].forEach((f, idx) => {
      this.playTone(f, 0.3, 'sine', 0.15, idx * 0.08);
    });
    this.playNoise(0.3, 0.07, 0, 2000);
  }

  crewVictory() {
    [392, 523, 659, 784].forEach((f, idx) => {
      this.playTone(f, 0.35, 'triangle', 0.2, idx * 0.09);
    });
    this.playTone(1047, 0.6, 'sine', 0.25, 0.38);
    this.playNoise(0.4, 0.08, 0, 1500);
  }

  imposterVictory() {
    this.playTone(110, 0.6, 'sawtooth', 0.22, 0, 70);
    this.playTone(82, 0.8, 'sine', 0.3, 0, 55);
    this.playTone(55, 1.2, 'sawtooth', 0.25, 0.2, 40);
    this.playNoise(0.6, 0.1, 0, 450);
  }

  playerEliminated() {
    this.playTone(160, 0.45, 'sawtooth', 0.22, 0, 60);
    this.playNoise(0.3, 0.12, 0, 500);
  }
}

export const sound = new SoundEngine();
