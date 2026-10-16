// Module BackgroundFX : Gestion des fonds et dégradés de couleurs (Canvas 2D / p5.js)
const BackgroundFX = (() => {
  const PRESETS = {
    'black': {
      label: 'Noir classique',
      render: (w, h, alpha = 255) => {
        background(0, alpha);
      }
    },
    'gradient-midnight': {
      label: 'Nuit boréale (Bleu / Violet)',
      render: (w, h, alpha = 255) => {
        push();
        const grad = drawingContext.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a0d1a');
        grad.addColorStop(0.5, '#121026');
        grad.addColorStop(1, '#231238');
        drawingContext.fillStyle = grad;
        drawingContext.globalAlpha = alpha / 255;
        rect(0, 0, w, h);
        pop();
      }
    },
    'gradient-cyberpunk': {
      label: 'Cyberpunk (Néon / Sombre)',
      render: (w, h, alpha = 255) => {
        push();
        const grad = drawingContext.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#070b19');
        grad.addColorStop(0.6, '#180e29');
        grad.addColorStop(1, '#3a082b');
        drawingContext.fillStyle = grad;
        drawingContext.globalAlpha = alpha / 255;
        rect(0, 0, w, h);
        pop();
      }
    },
    'gradient-sunset': {
      label: 'Crépuscule (Violet / Ambre)',
      render: (w, h, alpha = 255) => {
        push();
        const grad = drawingContext.createLinearGradient(w, 0, 0, h);
        grad.addColorStop(0, '#1a0b2e');
        grad.addColorStop(0.5, '#2e1437');
        grad.addColorStop(1, '#441d24');
        drawingContext.fillStyle = grad;
        drawingContext.globalAlpha = alpha / 255;
        rect(0, 0, w, h);
        pop();
      }
    },
    'gradient-ocean': {
      label: 'Abysses (Océan profond)',
      render: (w, h, alpha = 255) => {
        push();
        const grad = drawingContext.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h));
        grad.addColorStop(0, '#0b1d3a');
        grad.addColorStop(0.7, '#071124');
        grad.addColorStop(1, '#02050e');
        drawingContext.fillStyle = grad;
        drawingContext.globalAlpha = alpha / 255;
        rect(0, 0, w, h);
        pop();
      }
    },
    'gradient-matrix': {
      label: 'Matrice (Vert sombre)',
      render: (w, h, alpha = 255) => {
        push();
        const grad = drawingContext.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#020d08');
        grad.addColorStop(0.5, '#05180f');
        grad.addColorStop(1, '#0a2e1d');
        drawingContext.fillStyle = grad;
        drawingContext.globalAlpha = alpha / 255;
        rect(0, 0, w, h);
        pop();
      }
    }
  };

  let currentPreset = 'gradient-midnight';
  let trailsEnabled = false;

  function render(w, h) {
    const preset = PRESETS[currentPreset] || PRESETS['black'];
    const alpha = trailsEnabled ? 45 : 255;
    preset.render(w, h, alpha);
  }

  function setPreset(key) {
    if (!PRESETS[key]) {
      throw new RangeError(`Preset de fond inconnu : ${key}. Disponibles : ${Object.keys(PRESETS).join(', ')}.`);
    }
    currentPreset = key;
  }

  function setTrails(enabled) {
    trailsEnabled = Boolean(enabled);
  }

  return {
    PRESETS,
    render,
    setPreset,
    setTrails,
    getPreset: () => currentPreset,
    hasTrails: () => trailsEnabled
  };
})();
