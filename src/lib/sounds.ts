/**
 * Sound Manager - Web Audio API based sound effects
 * Generates sounds programmatically for zero latency and no network requests
 */

type SoundType = 'buzz' | 'winner' | 'join' | 'countdown' | 'reset';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Ensure audio context is running (required after user gesture)
   */
  private async ensureContext(): Promise<AudioContext | null> {
    if (!this.audioContext) {
      await this.init();
    }

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  /**
   * Set sound enabled state
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if sound is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Play a sound effect
   */
  async play(type: SoundType): Promise<void> {
    if (!this.isEnabled) return;

    const ctx = await this.ensureContext();
    if (!ctx) return;

    switch (type) {
      case 'buzz':
        this.playBuzz(ctx);
        break;
      case 'winner':
        this.playWinner(ctx);
        break;
      case 'join':
        this.playJoin(ctx);
        break;
      case 'countdown':
        this.playCountdown(ctx);
        break;
      case 'reset':
        this.playReset(ctx);
        break;
    }
  }

  /**
   * Buzz sound - satisfying electronic buzz
   * Quick, impactful sound when pressing the buzzer
   */
  private playBuzz(ctx: AudioContext): void {
    const now = ctx.currentTime;

    // Main buzz tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.15);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Impact click
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.05);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  /**
   * Winner fanfare - short celebratory sound
   */
  private playWinner(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });

    // Add sparkle
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sine';
    noise.frequency.setValueAtTime(2000, now + 0.32);
    noise.frequency.exponentialRampToValueAtTime(4000, now + 0.5);
    noiseGain.gain.setValueAtTime(0.05, now + 0.32);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.32);
    noise.stop(now + 0.5);
  }

  /**
   * Join notification - subtle pop
   */
  private playJoin(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Countdown beep
   */
  private playCountdown(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Reset sound - descending tone
   */
  private playReset(ctx: AudioContext): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (type: SoundType) => soundManager.play(type);
export const initSound = () => soundManager.init();
export const toggleSound = () => soundManager.toggle();
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
