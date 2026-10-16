let target;
let scenarios;
let debugMode = false;
const vehicles = [];
let sceneCanvas;
<<<<<<< HEAD
let currentMaxSpeed = SeekPopulation.INITIAL_SPEED;
let currentMaxForce = SeekPopulation.INITIAL_FORCE;
let currentMode = SeekPopulation.INITIAL_MODE;
let currentArrivalVariant = SeekPopulation.INITIAL_ARRIVAL_VARIANT;
let currentScenario = SeekPopulation.INITIAL_SCENARIO;
let debugMode = false;
let currentDetectionRadius = SeekPopulation.INITIAL_DETECTION_RADIUS;
let currentMaxFleeDuration = SeekPopulation.INITIAL_FLEE_DURATION;
=======
let gradientSpeed = 0.35;
let gradientDepth = 0.75;
const audioEngine = new PsychedelicAudio();
const effectsAudio = new SeekEffectsAudio();
const gradientCenter = { x: 0.5, y: 0.5 };
const ambiencePointer = { x: 0.5, y: 0.5 };
let ambienceTime = 0;
>>>>>>> upstream/main

function sceneHeight() {
  return Math.max(1, windowHeight - document.getElementById('controls').offsetHeight);
}

function createTargetForScenario(scenario) {
  const currentPos = (target && target.pos)
    ? { x: target.pos.x, y: target.pos.y }
    : { x: width / 2, y: height / 2 };

  if (scenario === 'scenario-2') {
    const t = new TargetFuyante(
      currentPos.x,
      currentPos.y,
      3,
      currentDetectionRadius,
      300,
      currentMaxFleeDuration
    );
    t.setDebug(debugMode);
    return t;
  }

  // Scénario 1 par défaut : Target classique
  const t = new Target(currentPos.x, currentPos.y, 3);
  return t;
}

function updateScenarioControlsVisibility(scenario) {
  const group = document.getElementById('scenario2-controls');
  if (group) {
    if (scenario === 'scenario-2') {
      group.style.opacity = '1';
      group.style.pointerEvents = 'auto';
    } else {
      group.style.opacity = '0.45';
      group.style.pointerEvents = 'none';
    }
  }
}

function updateStatusBadge() {
  const badge = document.getElementById('target-status-badge');
  if (!badge) return;

  if (currentScenario === 'scenario-2' && target instanceof TargetFuyante) {
    const staminaSec = target.stamina.toFixed(1);
    if (target.isFleeing) {
      badge.textContent = `⚡ Fuite active ! Vitesse : ${target.maxSpeed} px/f (${staminaSec}s)`;
      badge.className = 'target-badge fleeing';
    } else if (target.stamina <= 0) {
      badge.textContent = `⚠️ Cible épuisée ! Vitesse : ${target.maxSpeed} px/f (0.0s)`;
      badge.className = 'target-badge exhausted';
    } else {
      badge.textContent = `🛡️ Cible au calme : ${target.maxSpeed} px/f (${staminaSec}s)`;
      badge.className = 'target-badge normal';
    }
  } else {
    badge.textContent = `🎯 Cible : ${target.maxSpeed || 3} px/f`;
    badge.className = 'target-badge';
  }
}

function setup() {
  sceneCanvas = createCanvas(windowWidth, sceneHeight());
  sceneCanvas.parent('scene');
<<<<<<< HEAD

  // Déverrouillage de l'AudioContext lors de la première interaction utilisateur
  window.addEventListener('pointerdown', () => {
    SoundFX.getContext();
  }, { once: true });

  // Initialisation de la cible selon le scénario actif
  target = createTargetForScenario(currentScenario);

  // Sélecteur de scénario
  const scenarioSelect = document.getElementById('scenario-select');
  if (scenarioSelect) {
    scenarioSelect.value = currentScenario;
    SeekPopulation.bindScenarioSelect(scenarioSelect, scenario => {
      currentScenario = scenario;
      target = createTargetForScenario(scenario);
      updateScenarioControlsVisibility(scenario);
    });
  }

  // Contrôles spécifiques au Scénario 2
  const detectionSlider = document.getElementById('detection-radius');
  const detectionOutput = document.getElementById('detection-radius-value');
  if (detectionSlider && detectionOutput) {
    detectionSlider.value = currentDetectionRadius;
    SeekPopulation.bindDetectionSlider(detectionSlider, detectionOutput, r => {
      currentDetectionRadius = r;
      if (target && typeof target.setDetectionRadius === 'function') {
        target.setDetectionRadius(r);
      }
    });
  }

  const durationSlider = document.getElementById('flee-duration');
  const durationOutput = document.getElementById('flee-duration-value');
  if (durationSlider && durationOutput) {
    durationSlider.value = currentMaxFleeDuration;
    SeekPopulation.bindDurationSlider(durationSlider, durationOutput, d => {
      currentMaxFleeDuration = d;
      if (target && typeof target.setMaxFleeDuration === 'function') {
        target.setMaxFleeDuration(d);
      }
    });
  }

  const debugCheckbox = document.getElementById('toggle-debug');
  if (debugCheckbox) {
    debugCheckbox.checked = debugMode;
    SeekPopulation.bindDebugToggle(debugCheckbox, active => {
      debugMode = active;
      if (target && typeof target.setDebug === 'function') {
        target.setDebug(debugMode);
      }
    });
  }

  updateScenarioControlsVisibility(currentScenario);

  const speedSlider = document.getElementById('max-speed');
  const speedOutput = document.getElementById('max-speed-value');
  speedSlider.value = SeekPopulation.INITIAL_SPEED;
  SeekPopulation.bindSpeedSlider(speedSlider, speedOutput, vehicles, speed => {
    currentMaxSpeed = speed;
  });

  const forceSlider = document.getElementById('max-force');
  const forceOutput = document.getElementById('max-force-value');
  forceSlider.value = SeekPopulation.INITIAL_FORCE;
  SeekPopulation.bindForceSlider(forceSlider, forceOutput, vehicles, force => {
    currentMaxForce = force;
  });

  const behaviorSelect = document.getElementById('behavior-mode');
  if (behaviorSelect) {
    behaviorSelect.value = currentMode;
    SeekPopulation.bindBehaviorSelect(behaviorSelect, vehicles, mode => {
      currentMode = mode;
    });
  }

  const arrivalSelect = document.getElementById('arrival-variant');
  if (arrivalSelect) {
    arrivalSelect.value = currentArrivalVariant;
    SeekPopulation.bindArrivalSelect(arrivalSelect, variant => {
      currentArrivalVariant = variant;
    });
  }

  // Dégradés de fond et traînées
  const bgSelect = document.getElementById('bg-preset');
  if (bgSelect) {
    bgSelect.value = BackgroundFX.getPreset();
    bgSelect.addEventListener('change', () => {
      BackgroundFX.setPreset(bgSelect.value);
    });
  }

  const trailsCheckbox = document.getElementById('toggle-trails');
  if (trailsCheckbox) {
    trailsCheckbox.checked = BackgroundFX.hasTrails();
    trailsCheckbox.addEventListener('change', () => {
      BackgroundFX.setTrails(trailsCheckbox.checked);
    });
  }

  // Contrôles du son Web Audio API
  const soundBtn = document.getElementById('sound-btn');
  const soundVolume = document.getElementById('sound-volume');
  if (soundBtn) {
    soundBtn.classList.toggle('active', !SoundFX.isMuted());
    soundBtn.addEventListener('click', () => {
      const muted = SoundFX.toggleMute();
      soundBtn.textContent = muted ? '🔇 Muet' : '🔊 Son';
      soundBtn.classList.toggle('active', !muted);
    });
  }
  if (soundVolume) {
    soundVolume.addEventListener('input', () => {
      SoundFX.setVolume(Number(soundVolume.value));
    });
  }

  const slider = document.getElementById('vehicle-count');
  slider.value = SeekPopulation.INITIAL_COUNT;
  SeekPopulation.bindSlider(slider, document.getElementById('vehicle-count-value'),
    vehicles, target.pos, () => ({ width, height }), (x, y) => {
      const v = new FleeVehicle(x, y, currentMode);
      v.maxSpeed = currentMaxSpeed;
      v.maxForce = currentMaxForce;
      return v;
    });

  // Repositionnement au clic sur le canvas
  sceneCanvas.elt.addEventListener('pointerdown', event => {
    const rect = sceneCanvas.elt.getBoundingClientRect();
    const x = (event.clientX - rect.left) * width / rect.width;
    const y = (event.clientY - rect.top) * height / rect.height;
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      target.pos.set(x, y);
    }
=======
  scenarios = new SeekScenarios(new Target(width / 2, height / 2), new TargetFutante(width / 2, height / 2));
  scenarios.setTargetCount(4, width, height);
  target = scenarios.target;
  document.getElementById('vehicle-count').value = SeekPopulation.INITIAL_COUNT;
  bindControls();
  sceneCanvas.elt.addEventListener('pointermove', event => {
    const rect = sceneCanvas.elt.getBoundingClientRect();
    ambiencePointer.x = SeekAmbience.clamp((event.clientX - rect.left) / rect.width);
    ambiencePointer.y = SeekAmbience.clamp((event.clientY - rect.top) / rect.height);
>>>>>>> upstream/main
  });
  window.addEventListener('pagehide', () => { void audioEngine.stop(); });
}

function draw() {
<<<<<<< HEAD
  // Rendu du fond dégradé (avec ou sans traînées)
  BackgroundFX.render(width, height);

  // Mise à jour de la cible : en Scénario 2, calcul des comportements face aux véhicules
  if (currentScenario === 'scenario-2' && typeof target.applyBehaviors === 'function') {
    target.applyBehaviors(vehicles);
  }
  target.update();

  // Mise à jour des véhicules avec notification sonore lors de l'arrivée (Web Audio API)
  for (const vehicle of vehicles) {
    SeekPopulation.step(
      vehicle,
      target,
      width,
      height,
      Math.random,
      currentArrivalVariant,
      variant => SoundFX.playArrivalSound(variant)
    );
    vehicle.show();
  }

  target.show();

  // Mise à jour du badge d'état
  updateStatusBadge();
}

// Raccourci clavier 'd' pour activer/désactiver le mode debug
function keyPressed() {
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
    if (target && typeof target.setDebug === 'function') {
      target.setDebug(debugMode);
    }
    const debugCheckbox = document.getElementById('toggle-debug');
    if (debugCheckbox) {
      debugCheckbox.checked = debugMode;
    }
=======
  const dt = Math.min(deltaTime / 1000, 0.1);
  ambienceTime += dt * gradientSpeed;
  // Le centre intérieur se déplace continuellement et se rapproche du pointeur.
  const ease = 1 - Math.exp(-dt * 4);
  const desiredX = 0.08 + 0.84 * ambiencePointer.x + 0.07 * Math.sin(ambienceTime * 2.1);
  const desiredY = 0.08 + 0.84 * ambiencePointer.y + 0.07 * Math.cos(ambienceTime * 1.7);
  gradientCenter.x += (desiredX - gradientCenter.x) * ease;
  gradientCenter.y += (desiredY - gradientCenter.y) * ease;
  audioEngine.update(gradientCenter.x, gradientCenter.y, ambiencePointer.x);
  drawPsychedelicGradient(audioEngine.modulation());
  scenarios.update(vehicles, deltaTime);
  target = scenarios.target;
  effectsAudio.synchronizeTargets(scenarios.targets);
  for (const sceneTarget of scenarios.targets) sceneTarget.edges();
  SeekVehicle.debug = debugMode;
  for (const vehicle of vehicles) {
    const result = SeekPopulation.step(vehicle, scenarios.targets, width, height);
    if (result?.arrived) effectsAudio.playExplosion();
    vehicle.show();
  }
  for (const sceneTarget of scenarios.targets) sceneTarget.show(debugMode);
}

function bindControls() {
  bindScenarioControls();
  const countSlider = document.getElementById('vehicle-count');
  const targetCountSlider = document.getElementById('target-count');
  const maxSpeedSlider = document.getElementById('max-speed');
  const maxForceSlider = document.getElementById('max-force');
  const gradientSpeedSlider = document.getElementById('gradient-speed');
  const gradientDepthSlider = document.getElementById('gradient-depth');
  const musicVolumeSlider = document.getElementById('music-volume');
  const effectsVolumeSlider = document.getElementById('effects-volume');
  SeekPopulation.bindSlider(countSlider, document.getElementById('vehicle-count-value'),
    vehicles, () => scenarios.targets, () => ({ width, height }), (x, y) => {
      const vehicle = new SeekVehicle(x, y);
      vehicle.maxSpeed = Number(maxSpeedSlider.value);
      vehicle.maxForce = Number(maxForceSlider.value);
      return vehicle;
    });
  const synchronizeTargetCount = () => {
    scenarios.setTargetCount(Number(targetCountSlider.value), width, height);
    target = scenarios.target;
    document.getElementById('target-count-value').value = `${scenarios.targets.length} / 30`;
    for (const sceneTarget of scenarios.targets) sceneTarget.edges();
  };
  targetCountSlider.addEventListener('input', synchronizeTargetCount);
  synchronizeTargetCount();
  const synchronizeLimits = () => {
    const maxSpeed = Number(maxSpeedSlider.value);
    const maxForce = Number(maxForceSlider.value);
    SeekPopulation.setLimits(vehicles, maxSpeed, maxForce);
    document.getElementById('max-speed-value').value = maxSpeed.toFixed(1);
    document.getElementById('max-force-value').value = maxForce.toFixed(2);
  };
  maxSpeedSlider.addEventListener('input', synchronizeLimits);
  maxForceSlider.addEventListener('input', synchronizeLimits);
  synchronizeLimits();
  const synchronizeGradient = () => {
    gradientSpeed = Number(gradientSpeedSlider.value);
    gradientDepth = Number(gradientDepthSlider.value);
    document.getElementById('gradient-speed-value').value = gradientSpeed.toFixed(2);
    document.getElementById('gradient-depth-value').value = gradientDepth.toFixed(2);
  };
  gradientSpeedSlider.addEventListener('input', synchronizeGradient);
  gradientDepthSlider.addEventListener('input', synchronizeGradient);
  synchronizeGradient();
  const synchronizeVolumes = () => {
    const musicVolume = Number(musicVolumeSlider.value);
    const effectsVolume = Number(effectsVolumeSlider.value);
    audioEngine.setVolume(musicVolume);
    effectsAudio.setVolume(effectsVolume);
    document.getElementById('music-volume-value').value = musicVolume.toFixed(2);
    document.getElementById('effects-volume-value').value = effectsVolume.toFixed(2);
  };
  musicVolumeSlider.addEventListener('input', synchronizeVolumes);
  effectsVolumeSlider.addEventListener('input', synchronizeVolumes);
  synchronizeVolumes();
  document.getElementById('audio-toggle').addEventListener('click', toggleAudio);
}

function drawPsychedelicGradient(fm) {
  const ctx = drawingContext;
  const cx = gradientCenter.x * width;
  const cy = gradientCenter.y * height;
  const radius = Math.hypot(width, height) * (0.65 + 0.04 * fm);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (let i = 0; i <= 12; i++) {
    const fraction = i / 12;
    const hue = ((ambienceTime * 65 + fraction * 540 + fm * 70) % 360 + 360) % 360;
    const lightness = 18 + gradientDepth * (25 + 20 * (1 - fraction) + 5 * fm);
    gradient.addColorStop(fraction, `hsl(${hue}, 92%, ${lightness}%)`);
  }
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

async function toggleAudio() {
  const button = document.getElementById('audio-toggle');
  if (button.disabled) return;
  button.disabled = true;
  try {
    if (audioEngine.running) {
      effectsAudio.detach();
      await audioEngine.stop();
    } else {
      await audioEngine.start();
      effectsAudio.attach(audioEngine.context);
    }
    button.textContent = audioEngine.running ? 'Couper la musique et les effets' : 'Activer la musique et les effets';
    button.setAttribute('aria-pressed', String(audioEngine.running));
  } catch (error) {
    button.textContent = 'Réessayer la musique et les effets';
    button.setAttribute('aria-pressed', 'false');
    console.error('Impossible de démarrer la musique :', error);
  } finally {
    button.disabled = false;
>>>>>>> upstream/main
  }
}

function windowResized() {
  resizeCanvas(windowWidth, sceneHeight());
<<<<<<< HEAD
  target.edges();
  for (const vehicle of vehicles) vehicle.edges();
}

=======
  for (const sceneTarget of scenarios.targets) {
    sceneTarget.pos.set(constrain(sceneTarget.pos.x, 0, width), constrain(sceneTarget.pos.y, 0, height));
  }
  for (const vehicle of vehicles) vehicle.edges();
}

function bindScenarioControls() {
  const modeSelect = document.getElementById('scenario');
  modeSelect.addEventListener('change', () => {
    scenarios.setMode(modeSelect.value);
    target = scenarios.target;
    document.getElementById('flee-controls').hidden = scenarios.mode !== 'flee';
    windowResized();
  });
  const fields = [
    ['detection-radius', 'detectionRadius'],
    ['exit-distance', 'exitDistance'],
    ['flee-duration', 'maxFleeDuration']
  ];
  for (const [id, setting] of fields) {
    const input = document.getElementById(id);
    const update = () => {
      scenarios.fleeingTargets.forEach(sceneTarget =>
        sceneTarget.setFleeSettings({ [setting]: Number(input.value) }));
      for (const [fieldId, parameter] of fields) {
        const value = scenarios.fleeingTarget[parameter];
        document.getElementById(fieldId).value = value;
        document.getElementById(fieldId + '-value').value = value + (parameter === 'maxFleeDuration' ? ' s' : ' px');
      }
    };
    input.addEventListener('input', update);
  }
  const checkbox = document.getElementById('debug');
  const setDebug = value => { debugMode = value; SeekVehicle.debug = value; checkbox.checked = value; };
  checkbox.addEventListener('change', () => setDebug(checkbox.checked));
  document.addEventListener('keydown', event => {
    const textField = event.target.matches?.('input[type="text"], input[type="number"], textarea');
    if (event.key.toLowerCase() === 'd' && !event.repeat && !textField) setDebug(!debugMode);
  });
}
>>>>>>> upstream/main
