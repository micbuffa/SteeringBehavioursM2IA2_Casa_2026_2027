// Module SoundFX : Gestionnaire audio avec la Web Audio API native (synthèse sonore sans dépendances).
const SoundFX = (() => {
  let audioCtx = null;
  let isMuted = false;
  let masterGain = null;
  let lastHitTime = 0;
  const HIT_COOLDOWN_MS = 40; // Limite la cadence pour éviter toute saturation acoustique

  function getContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.2; // Volume modéré et agréable
        masterGain.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Joue un effet sonore lors de l'arrivée ou du contact d'un véhicule avec la cible
  function playArrivalSound(variant = 'vehicle') {
    if (isMuted) return false;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastHitTime < HIT_COOLDOWN_MS) return false;
    lastHitTime = now;

    const ctx = getContext();
    if (!ctx) return false;

    try {
      const nowCtx = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (variant === 'target') {
        // Variante B (la cible se téléporte) : sonnette cristalline ascendante
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, nowCtx); // Ré5
        osc.frequency.exponentialRampToValueAtTime(880, nowCtx + 0.12); // La5
        gain.gain.setValueAtTime(0.25, nowCtx);
        gain.gain.exponentialRampToValueAtTime(0.001, nowCtx + 0.14);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(nowCtx);
        osc.stop(nowCtx + 0.14);
      } else {
        // Variante A (le véhicule se téléporte) : pop doux et mélodieux (gamme pentatonique)
        osc.type = 'sine';
        const notes = [440, 523.25, 659.25, 783.99]; // La4, Do5, Mi5, Sol5
        const freq = notes[Math.floor(Math.random() * notes.length)];
        osc.frequency.setValueAtTime(freq, nowCtx);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, nowCtx + 0.08);

        gain.gain.setValueAtTime(0.2, nowCtx);
        gain.gain.exponentialRampToValueAtTime(0.001, nowCtx + 0.1);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(nowCtx);
        osc.stop(nowCtx + 0.1);
      }
      return true;
    } catch {
      return false;
    }
  }

  function playBoostSound() {
    if (isMuted) return false;
    const ctx = getContext();
    if (!ctx) return false;

    try {
      const nowCtx = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, nowCtx);
      osc.frequency.exponentialRampToValueAtTime(750, nowCtx + 0.16);

      gain.gain.setValueAtTime(0.2, nowCtx);
      gain.gain.exponentialRampToValueAtTime(0.001, nowCtx + 0.18);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(nowCtx);
      osc.stop(nowCtx + 0.18);
      return true;
    } catch {
      return false;
    }
  }

  function setMuted(muted) {
    isMuted = Boolean(muted);
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (!isMuted) getContext();
    return isMuted;
  }

  function setVolume(val) {
    if (masterGain && typeof val === 'number') {
      masterGain.gain.value = Math.max(0, Math.min(1, val));
    }
  }

  return {
    getContext,
    playArrivalSound,
    playBoostSound,
    setMuted,
    toggleMute,
    setVolume,
    isMuted: () => isMuted
  };
})();
