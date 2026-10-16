/** Sons synthétiques du moteur et des variations d'accélération/freinage. */
class RaceAudio {
  constructor() {
    this.enabled = false;
    this.volume = 0.35;
    this.oscillators = null;
    this.previousAverageSpeed = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled && !this.oscillators) {
      userStartAudio();
      this.oscillators = {
        engine: this.createOscillator('sawtooth'),
        acceleration: this.createOscillator('triangle'),
        braking: this.createOscillator('sine'),
      };
    }
    if (!enabled && this.oscillators) {
      for (const oscillator of Object.values(this.oscillators)) oscillator.amp(0, 0.08);
    }
  }

  createOscillator(type) {
    const oscillator = new p5.Oscillator(type);
    oscillator.amp(0);
    oscillator.start();
    return oscillator;
  }

  update(cars, paused = false) {
    if (!this.enabled || !this.oscillators) return;
    if (paused) {
      for (const oscillator of Object.values(this.oscillators)) oscillator.amp(0, 0.08);
      return;
    }
    const averageSpeed = cars.length
      ? cars.reduce((sum, car) => sum + car.vel.mag(), 0) / cars.length
      : 0;
    const speedChange = averageSpeed - this.previousAverageSpeed;
    const { engine, acceleration, braking } = this.oscillators;
    engine.freq(48 + averageSpeed * 32);
    engine.amp(this.volume * (0.025 + Math.min(averageSpeed / 8, 1) * 0.055), 0.08);
    acceleration.freq(180 + averageSpeed * 18);
    acceleration.amp(Math.max(0, speedChange) * this.volume * 0.09, 0.04);
    braking.freq(95 + averageSpeed * 5);
    braking.amp(Math.max(0, -speedChange) * this.volume * 0.11, 0.04);
    this.previousAverageSpeed = averageSpeed;
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value)));
  }
}
