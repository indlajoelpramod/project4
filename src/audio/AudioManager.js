/**
 * AudioManager — Procedural Web Audio API implementation.
 */
export class AudioManager {
  constructor() {
    this.masterVolume = 0.8;
    this.musicVolume = 0.6;
    this.sfxVolume = 0.8;

    this.loadSettings();

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);
    
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.ambientNodes = [];
    this.engineOsc = null;
    this.engineGain = null;

    console.log('[AudioManager] Procedural Web Audio API initialized.');
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem('fiveCluesSettings');
      if (raw) {
        const s = JSON.parse(raw);
        this.masterVolume = s.masterVolume !== undefined ? s.masterVolume / 100 : this.masterVolume;
        this.musicVolume  = s.musicVolume !== undefined ? s.musicVolume / 100 : this.musicVolume;
        this.sfxVolume    = s.sfxVolume !== undefined ? s.sfxVolume / 100 : this.sfxVolume;
      }
    } catch { /* ignore */ }
  }

  saveSettings() {
    try {
      localStorage.setItem('fiveCluesSettings', JSON.stringify({
        masterVolume: this.masterVolume * 100,
        musicVolume:  this.musicVolume * 100,
        sfxVolume:    this.sfxVolume * 100,
      }));
    } catch { /* ignore */ }
  }

  setMasterVolume(v) { 
    this.masterVolume = v / 100; 
    if(this.masterGain) this.masterGain.gain.value = this.masterVolume;
    this.saveSettings(); 
  }
  
  setMusicVolume(v) { 
    this.musicVolume = v / 100; 
    if(this.musicGain) this.musicGain.gain.value = this.musicVolume;
    this.saveSettings(); 
  }
  
  setSfxVolume(v) { 
    this.sfxVolume = v / 100; 
    if(this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    this.saveSettings(); 
  }

  /* ── Procedural Generators ── */

  createNoiseBuffer(duration) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /* ── Ambient & Music ── */

  playAmbient() {
    this.resume();
    this.stopAmbient(); // Ensure no duplicates
    
    // Wind noise
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.createNoiseBuffer(5);
    noiseSrc.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.3;

    noiseSrc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noiseSrc.start();
    lfo.start();

    this.ambientNodes.push(noiseSrc, lfo);
  }

  stopAmbient() {
    this.ambientNodes.forEach(n => {
      try { n.stop(); } catch(e){}
      n.disconnect();
    });
    this.ambientNodes = [];
  }

  playGameMusic() {
    this.playAmbient(); // Music is just ambient drones in this horror game
  }

  stopGameMusic() {
    this.stopAmbient();
  }
  
  playMenuMusic() {
    this.playAmbient();
  }

  stopMenuMusic() {
    this.stopAmbient();
  }

  /* ── SFX ── */

  playFootstep() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playZombieGrowl() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 1.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
  }

  playZombieAttack() {
    this.playZombieGrowl();
    // Add a noise burst for impact
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.2);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  playGhostWhisper() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 2);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(815, this.ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1185, this.ctx.currentTime + 2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc2.start();
    osc.stop(this.ctx.currentTime + 2);
    osc2.stop(this.ctx.currentTime + 2);
  }

  playDoorSound() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playCluePickup() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playDamage() {
    this.resume();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.3);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  playDeath() {
    this.playZombieAttack();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + 3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 3);
  }

  playEscape() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 4);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 2);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 4);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 4);
  }

  /* ── Vehicles ── */

  playEngineStart() {
    this.resume();
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1);
  }

  playEngineLoop(speedPercentage = 0) {
    this.resume();
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.2;
      
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);
      
      this.engineOsc.start();
    }
    
    // Map speed percentage (0-1) to pitch (40Hz to 150Hz)
    const targetFreq = 40 + (Math.abs(speedPercentage) * 110);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch(e){}
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  stopAll() {
    this.stopAmbient();
    this.stopEngine();
  }
}
