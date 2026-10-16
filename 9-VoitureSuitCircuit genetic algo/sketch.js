
// Configuration globale et constantes
const TOTAL = 60;
let MUTATION_RATE = 0.1;
let LIFESPAN = 35;
let SIGHT = 90;

let generationCount = 0;
let bestFitnessEver = 0;
let bestCheckpointsEver = 0;

// Murs et géométrie du circuit
let walls = [];
let checkpoints = [];
let inside = [];
let outside = [];
let start, end;

// Flotte de véhicules
let population = [];
let savedVehicles = [];
let bestP = null;

// Paramètres interactifs
let currentTopologyPreset = '2-layers-2x-1x';
let showAllSensors = false;
let debugMode = false;

// Sélecteur de topologie : Nombre de neurones par couche calculé dynamiquement selon les rayons
function getHiddenLayersTopology(numRays) {
  const preset = document.getElementById('topologySelect')?.value || currentTopologyPreset;
  switch (preset) {
    case '1-layer-2x':
      // 1 couche cachée : 2 * N
      return [numRays * 2];
    case '2-layers-2x-1x':
      // 2 couches cachées : 2 * N puis 1 * N
      return [numRays * 2, numRays];
    case '2-layers-3x-1.5x':
      // 2 couches profondes : 3 * N puis 1.5 * N
      return [numRays * 3, Math.max(2, Math.round(numRays * 1.5))];
    case '3-layers-pyramid':
      // 3 couches pyramidales : 2 * N -> 1.5 * N -> 1 * N
      return [numRays * 2, Math.max(2, Math.round(numRays * 1.5)), numRays];
    default:
      return [numRays * 2, numRays];
  }
}

// Getters pour les valeurs dynamiques des curseurs
function getActiveRayCount() {
  const slider = document.getElementById('raysSlider');
  return slider ? parseInt(slider.value) : 7;
}

function getActiveFOV() {
  const slider = document.getElementById('fovSlider');
  return slider ? parseInt(slider.value) : 120;
}

function getActiveSight() {
  const slider = document.getElementById('sightSlider');
  return slider ? parseInt(slider.value) : 90;
}

function getActiveMaxSpeed() {
  const slider = document.getElementById('maxSpeedSlider');
  return slider ? parseFloat(slider.value) : 6.0;
}

function getActiveMaxForce() {
  const slider = document.getElementById('maxForceSlider');
  return slider ? parseFloat(slider.value) : 0.25;
}

function getActiveLifespan() {
  const slider = document.getElementById('lifespanSlider');
  return slider ? parseInt(slider.value) : 35;
}

function getActiveMutationRate() {
  const slider = document.getElementById('mutationSlider');
  return slider ? parseFloat(slider.value) / 100 : 0.1;
}

function getActiveCycles() {
  const slider = document.getElementById('simSpeedSlider');
  return slider ? parseInt(slider.value) : 1;
}

// Mise à jour de l'affichage textuel de la topologie
function updateTopologyDisplay() {
  const numRays = getActiveRayCount();
  const hidden = getHiddenLayersTopology(numRays);
  const topologyBadge = document.getElementById('topologyBadge');
  if (topologyBadge) {
    const hiddenStr = hidden.map((h, i) => `Cachée ${i + 1}: ${h} neurones`).join(' → ');
    topologyBadge.innerText = `Topologie [ ${numRays} Entrées (rayons) → ${hiddenStr} → 2 Sorties ]`;
  }
}

// Construit un nouveau circuit procédural
function buildTrack() {
  checkpoints = [];
  inside = [];
  outside = [];

  let noiseMax = 3.5;
  const total = 50;
  const pathWidth = 55;
  let startX = random(1000);
  let startY = random(1000);

  // Largeur du tracé adaptée au canvas (garder une marge pour l'HUD à droite)
  const trackCenterX = 480;
  const trackCenterY = 380;

  for (let i = 0; i < total; i++) {
    let a = map(i, 0, total, 0, TWO_PI);
    let xoff = map(cos(a), -1, 1, 0, noiseMax) + startX;
    let yoff = map(sin(a), -1, 1, 0, noiseMax) + startY;
    let xr = map(noise(xoff, yoff), 0, 1, 110, 340);
    let yr = map(noise(xoff, yoff), 0, 1, 110, 270);
    let x1 = trackCenterX + (xr - pathWidth) * cos(a);
    let y1 = trackCenterY + (yr - pathWidth) * sin(a);
    let x2 = trackCenterX + (xr + pathWidth) * cos(a);
    let y2 = trackCenterY + (yr + pathWidth) * sin(a);
    checkpoints.push(new Boundary(x1, y1, x2, y2));
    inside.push(createVector(x1, y1));
    outside.push(createVector(x2, y2));
  }

  walls = [];
  for (let i = 0; i < checkpoints.length; i++) {
    let a1 = inside[i];
    let b1 = inside[(i + 1) % checkpoints.length];
    walls.push(new Boundary(a1.x, a1.y, b1.x, b1.y));
    let a2 = outside[i];
    let b2 = outside[(i + 1) % checkpoints.length];
    walls.push(new Boundary(a2.x, a2.y, b2.x, b2.y));
  }

  start = checkpoints[0].midpoint();
  end = checkpoints[checkpoints.length - 1].midpoint();
}

// Réinitialisation complète de la population (ex: si changement de topologie)
function resetPopulation() {
  for (let v of population) {
    if (v.dispose) v.dispose();
  }
  for (let v of savedVehicles) {
    if (v.dispose) v.dispose();
  }
  population = [];
  savedVehicles = [];
  generationCount = 1;
  bestFitnessEver = 0;
  bestCheckpointsEver = 0;

  for (let i = 0; i < TOTAL; i++) {
    population[i] = new CircuitVehicle();
  }
  updateTopologyDisplay();
}

function setup() {
  const canvas = createCanvas(1260, 740);
  canvas.parent('canvas-container');

  // TensorFlow sur CPU
  tf.setBackend('cpu');

  buildTrack();

  for (let i = 0; i < TOTAL; i++) {
    population[i] = new CircuitVehicle();
  }

  updateTopologyDisplay();
  bindUIEvents();
}

// Liaison des interactions UI (boutons, sliders, raccourcis)
function bindUIEvents() {
  // Synchronisation des étiquettes des curseurs
  const sliders = [
    { id: 'maxSpeedSlider', valId: 'maxSpeedVal', suffix: ' px/f' },
    { id: 'simSpeedSlider', valId: 'simSpeedVal', suffix: 'x' },
    { id: 'raysSlider', valId: 'raysVal', suffix: '' },
    { id: 'sightSlider', valId: 'sightVal', suffix: ' px' },
    { id: 'fovSlider', valId: 'fovVal', suffix: '°' },
    { id: 'maxForceSlider', valId: 'maxForceVal', suffix: '' },
    { id: 'mutationSlider', valId: 'mutationVal', suffix: '%' },
    { id: 'lifespanSlider', valId: 'lifespanVal', suffix: ' f' }
  ];

  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    const valEl = document.getElementById(s.valId);
    if (el && valEl) {
      el.addEventListener('input', () => {
        valEl.innerText = el.value + s.suffix;
        if (s.id === 'raysSlider') {
          updateTopologyDisplay();
        }
      });
    }
  });

  // Changement de topologie
  const topoSelect = document.getElementById('topologySelect');
  if (topoSelect) {
    topoSelect.addEventListener('change', () => {
      currentTopologyPreset = topoSelect.value;
      updateTopologyDisplay();
      resetPopulation();
    });
  }

  // Changement du nombre de rayons -> recréation nécessaire car dimension d'entrée modifiée
  const raysSlider = document.getElementById('raysSlider');
  if (raysSlider) {
    raysSlider.addEventListener('change', () => {
      resetPopulation();
    });
  }

  // Boutons d'action
  const newTrackBtn = document.getElementById('newTrackBtn');
  if (newTrackBtn) {
    newTrackBtn.addEventListener('click', () => {
      buildTrack();
      for (let v of population) {
        v.pos = createVector(start.x, start.y);
        v.vel.set(0, 0);
        v.acc.set(0, 0);
        v.fitness = 0;
        v.checkpointsPassed = 0;
        v.index = 0;
        v.counter = 0;
      }
    });
  }

  const nextGenBtn = document.getElementById('nextGenBtn');
  if (nextGenBtn) {
    nextGenBtn.addEventListener('click', () => {
      for (let v of population) {
        savedVehicles.push(v);
      }
      population = [];
      nextGeneration();
      generationCount++;
    });
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetPopulation();
      buildTrack();
    });
  }

  const sensorsCheckbox = document.getElementById('showSensorsToggle');
  if (sensorsCheckbox) {
    sensorsCheckbox.addEventListener('change', () => {
      showAllSensors = sensorsCheckbox.checked;
    });
  }
}

// Raccourci touche 'd' pour le mode debug
function keyPressed() {
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
  }
}

function draw() {
  const cycles = getActiveCycles();
  background(13, 16, 23); // Thème sombre racing

  // Boucle de simulation (époques par frame)
  for (let n = 0; n < cycles; n++) {
    bestP = population[0];

    for (let vehicle of population) {
      vehicle.applyBehaviors(walls);
      vehicle.check(checkpoints);
      vehicle.update();

      if (vehicle.checkpointsPassed > (bestP ? bestP.checkpointsPassed : 0)) {
        bestP = vehicle;
      }
    }

    // Records
    if (bestP) {
      if (bestP.fitness > bestFitnessEver) bestFitnessEver = bestP.fitness;
      if (bestP.checkpointsPassed > bestCheckpointsEver) bestCheckpointsEver = bestP.checkpointsPassed;
    }

    // Élimination des véhicules morts ou ayant terminé
    for (let i = population.length - 1; i >= 0; i--) {
      const vehicle = population[i];
      if (vehicle.dead || vehicle.finished) {
        savedVehicles.push(population.splice(i, 1)[0]);
      }
    }

    // Transition vers génération suivante si extinction
    if (population.length === 0) {
      nextGeneration();
      generationCount++;
    }
  }

  // --- RENDU GRAPHIQUE AMÉLIORÉ ---

  // 1. Piste de course (Asphalte texturé)
  drawAsphaltTrack();

  // 2. Lignes laser des checkpoints
  drawCheckpoints();

  // 3. Murs et barrières néon
  drawCircuitWalls();

  // 4. Véhicules
  for (let vehicle of population) {
    if (vehicle !== bestP) {
      vehicle.show(showAllSensors);
    }
  }

  // 5. Mise en valeur du leader
  if (bestP) {
    bestP.highlight();
  }

  // 6. Visualiseur de réseau de neurones et télémétrie en direct
  drawTelemetryAndNeuralNet(bestP);
}

// Dessin de la surface d'asphalte du circuit
function drawAsphaltTrack() {
  push();
  noStroke();
  fill(22, 27, 36); // Asphalte foncé
  for (let i = 0; i < checkpoints.length; i++) {
    let next = (i + 1) % checkpoints.length;
    quad(
      inside[i].x, inside[i].y,
      outside[i].x, outside[i].y,
      outside[next].x, outside[next].y,
      inside[next].x, inside[next].y
    );
  }

  // Ligne médiane en pointillés
  stroke(255, 255, 255, 30);
  strokeWeight(2);
  if (drawingContext && drawingContext.setLineDash) {
    drawingContext.setLineDash([8, 12]);
  }
  noFill();
  beginShape();
  for (let i = 0; i <= checkpoints.length; i++) {
    let idx = i % checkpoints.length;
    let mid = checkpoints[idx].midpoint();
    vertex(mid.x, mid.y);
  }
  endShape();
  if (drawingContext && drawingContext.setLineDash) {
    drawingContext.setLineDash([]);
  }
  pop();
}

// Dessin des checkpoints interactifs
function drawCheckpoints() {
  for (let i = 0; i < checkpoints.length; i++) {
    let cp = checkpoints[i];
    push();
    if (i === 0) {
      // Ligne de départ / arrivée (Damiers vert-or)
      stroke(0, 255, 180, 220);
      strokeWeight(4);
      line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);
    } else {
      // Portes laser discrètes
      stroke(0, 160, 255, 45);
      if (drawingContext && drawingContext.setLineDash) drawingContext.setLineDash([3, 5]);
      line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);
      if (drawingContext && drawingContext.setLineDash) drawingContext.setLineDash([]);
    }

    if (debugMode) {
      let mid = cp.midpoint();
      fill(0, 220, 255, 120);
      noStroke();
      textSize(9);
      textAlign('center', 'center');
      text(i, mid.x, mid.y);
    }
    pop();
  }
}

// Dessin des bordures néon de sécurité
function drawCircuitWalls() {
  // Bordure intérieure
  push();
  stroke(255, 0, 110, 200); // Néon Magenta
  strokeWeight(3);
  for (let i = 0; i < inside.length; i++) {
    let a = inside[i];
    let b = inside[(i + 1) % inside.length];
    line(a.x, a.y, b.x, b.y);
  }

  // Bordure extérieure
  stroke(0, 229, 255, 220); // Néon Cyan
  strokeWeight(3);
  for (let i = 0; i < outside.length; i++) {
    let a = outside[i];
    let b = outside[(i + 1) % outside.length];
    line(a.x, a.y, b.x, b.y);
  }
  pop();
}

// Visualisation du réseau de neurones et télémétrie du leader
function drawTelemetryAndNeuralNet(leader) {
  const panelX = 980;
  const panelY = 20;
  const panelW = 260;
  const panelH = 700;

  push();
  // Fond du panneau translucide (glassmorphism)
  fill(18, 22, 31, 220);
  stroke(35, 44, 60);
  strokeWeight(1.5);
  rect(panelX, panelY, panelW, panelH, 12);

  // En-tête télémétrie
  fill(0, 229, 255);
  noStroke();
  textSize(15);
  textStyle('bold');
  textAlign('left', 'top');
  text("TÉLÉMÉTRIE DU LEADER", panelX + 16, panelY + 16);

  // Données de course
  textSize(12);
  textStyle('normal');
  fill(180, 195, 215);

  let curSpeed = leader ? leader.vel.mag().toFixed(1) : "0.0";
  let maxSpd = getActiveMaxSpeed().toFixed(1);
  let passed = leader ? leader.checkpointsPassed : 0;
  let fitnessVal = leader ? leader.fitness : 0;

  let infoY = panelY + 45;
  text(`Génération : ${generationCount}`, panelX + 16, infoY);
  text(`Voitures en vie : ${population.length} / ${TOTAL}`, panelX + 16, infoY + 20);
  text(`Vitesse leader : ${curSpeed} / ${maxSpd} px/f`, panelX + 16, infoY + 40);
  text(`Checkpoints franchis : ${passed}`, panelX + 16, infoY + 60);
  text(`Record checkpoints : ${bestCheckpointsEver}`, panelX + 16, infoY + 80);

  // Jauge de vitesse
  stroke(30, 40, 55);
  strokeWeight(6);
  line(panelX + 16, infoY + 115, panelX + panelW - 16, infoY + 115);

  let speedRatio = constrain(parseFloat(curSpeed) / (parseFloat(maxSpd) || 1), 0, 1);
  stroke(0, 255, 180);
  line(panelX + 16, infoY + 115, panelX + 16 + (panelW - 32) * speedRatio, infoY + 115);

  // Séparateur
  stroke(35, 44, 60);
  strokeWeight(1);
  line(panelX + 16, infoY + 135, panelX + panelW - 16, infoY + 135);

  // Titre Visualiseur Réseau de Neurones
  noStroke();
  fill(0, 229, 255);
  textStyle('bold');
  text("CERVEAU IA (RÉSEAU DE NEURONES)", panelX + 16, infoY + 150);

  // Dessin de la topologie active du réseau
  if (leader && leader.brain) {
    const topology = leader.brain.getTopology();
    drawNetworkGraph(panelX + 20, infoY + 180, panelW - 40, 320, topology, leader.brain);
  }

  // Légende des sorties
  let legendY = infoY + 520;
  fill(160, 180, 205);
  textSize(11);
  textStyle('normal');
  text("Sortie 1 : Braquage (-π à +π)", panelX + 16, legendY);
  text("Sortie 2 : Accélération (0 à VMax)", panelX + 16, legendY + 20);

  // Mode debug indicateur
  if (debugMode) {
    fill(255, 200, 0);
    text("• Mode Debug Actif (Touche 'D')", panelX + 16, legendY + 50);
  }

  pop();
}

// Rendu interactif du graphe de neurones et des connexions
function drawNetworkGraph(x, y, w, h, topology, brain) {
  const numLayers = topology.length;
  const layerSpacing = w / (numLayers - 1);
  const layerCoords = [];

  // Calcul des coordonnées de chaque neurone
  for (let l = 0; l < numLayers; l++) {
    const numNeurons = topology[l];
    const coords = [];
    const neuronSpacing = min(h / (numNeurons + 1), 28);
    const startY = y + (h - (numNeurons - 1) * neuronSpacing) / 2;

    for (let n = 0; n < numNeurons; n++) {
      coords.push({
        x: x + l * layerSpacing,
        y: startY + n * neuronSpacing
      });
    }
    layerCoords.push(coords);
  }

  // 1. Synapses (liens)
  strokeWeight(0.7);
  for (let l = 0; l < numLayers - 1; l++) {
    const currentLayer = layerCoords[l];
    const nextLayer = layerCoords[l + 1];

    for (let c of currentLayer) {
      for (let nx of nextLayer) {
        stroke(60, 85, 120, 60);
        line(c.x, c.y, nx.x, nx.y);
      }
    }
  }

  // 2. Neurones
  for (let l = 0; l < numLayers; l++) {
    const coords = layerCoords[l];
    for (let i = 0; i < coords.length; i++) {
      let pt = coords[i];
      let val = 0.5;

      // Entrées
      if (l === 0 && brain.lastInputs && brain.lastInputs[i] !== undefined) {
        val = brain.lastInputs[i]; // 1 = obstacle proche, 0 = champ libre
      }
      // Sorties
      else if (l === numLayers - 1 && brain.lastOutputs && brain.lastOutputs[i] !== undefined) {
        val = brain.lastOutputs[i];
      }

      // Couleur du neurone selon son activation
      if (l === 0) {
        // Entrée : vert clair si libre, rouge si mur
        stroke(255 * val, 255 * (1 - val), 100);
        fill(255 * val, 255 * (1 - val), 100, 180);
      } else if (l === numLayers - 1) {
        // Sortie : jaune or / cyan
        stroke(0, 255, 200);
        fill(0, 255 * val, 200, 200);
      } else {
        // Couches cachées
        stroke(0, 180, 255);
        fill(0, 180, 255, 120);
      }

      strokeWeight(1.5);
      ellipse(pt.x, pt.y, 9, 9);
    }
  }

  // Étiquettes sous les couches
  noStroke();
  fill(120, 150, 185);
  textSize(9);
  textAlign('center', 'top');
  for (let l = 0; l < numLayers; l++) {
    let lbl = l === 0 ? "Rayons" : (l === numLayers - 1 ? "Actions" : `C${l}`);
    text(lbl, x + l * layerSpacing, y + h + 5);
  }
}