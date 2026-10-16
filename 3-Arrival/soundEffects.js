/**
 * SoundFX — Synthétiseur audio léger basé sur la Web Audio API.
 * Fournit les retours sonores multimédia du jeu (mastication, croissance, clic)
 * sans dépendance externe et avec une latence quasi-nulle.
 */
class SoundFX {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.volume = 0.25;
  }

  /**
   * Initialise le contexte audio après la première interaction utilisateur
   */
  ensureContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Joue le son de mastication / capture de nourriture
   */
  playEat() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Variation subtile de la fréquence pour chaque bouchée
      const baseFreq = 380 + Math.random() * 120;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      // Ignorer silencieusement si l'audio n'est pas autorisé
    }
  }

  /**
   * Joue le carillon de croissance progressive
   */
  playGrow() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);

      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      // Ignorer silencieusement
    }
  }

  /**
   * Joue le clic de changement de scénario
   */
  playClick() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.02);

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      // Ignorer
    }
  }

  /**
   * Active ou désactive le son
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
