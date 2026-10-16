let pursuer;
let targets = [];
let flares = [];
const NB_TARGETS = 4;
let isSimulationPaused = false;
let globalFlaresEnabled = true;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. Initialisation du vaisseau poursuiveur (hérite de Vehicle)
  pursuer = new Pursuer(width / 2, height / 2);
  pursuer.maxSpeed = 9;
  pursuer.maxForce = 0.35;
  pursuer.vel = createVector(2, 3);

  // 2. Initialisation exacte de 4 cibles au même temps (héritent de Vehicle)
  spawnTargets(NB_TARGETS);
}

function spawnTargets(count) {
  targets = [];
  for (let i = 0; i < count; i++) {
    const margin = 80;
    const x = random(margin, width - margin);
    const y = random(margin, height - margin);
    const t = new Target(x, y, i + 1);
    t.flaresEnabled = globalFlaresEnabled;
    targets.push(t);
  }
}

function respawnTarget(target) {
  // Réapparition à distance sécurisée du poursuiveur
  let newX, newY, d;
  let attempts = 0;
  do {
    newX = random(80, width - 80);
    newY = random(80, height - 80);
    d = dist(newX, newY, pursuer.pos.x, pursuer.pos.y);
    attempts++;
  } while (d < 250 && attempts < 20);

  target.pos.set(newX, newY);
  target.vel = p5.Vector.random2D().mult(random(3, 5));
  target.isAlerted = false;
}

function draw() {
  background(10, 14, 23);

  // Fond de grille radar tactique
  drawTacticalGrid();

<<<<<<< HEAD
  if (!isSimulationPaused) {
    // 3. Le vaisseau poursuit TOUJOURS la cible la plus proche
    const closestTarget = pursuer.findClosestTarget(targets);
    pursuer.currentTarget = closestTarget;
=======
  let force = pursuer.pursuePerfect(target);
  //let force = pursuer.pursue(target);
  pursuer.applyForce(force);
>>>>>>> upstream/main

    if (closestTarget) {
      const pursueForce = pursuer.calculatePursuitForce(closestTarget);
      pursuer.applyForce(pursueForce);
    }

    pursuer.update();
    pursuer.edges();

    // 4. Mise à jour des 4 cibles
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      target.flaresEnabled = globalFlaresEnabled;

      const d = p5.Vector.dist(pursuer.pos, target.pos);

      // Détection du poursuiveur
      if (target.detects(pursuer)) {
        target.isAlerted = true;

        // Comportement d'évasion (accélération et fuite)
        target.maxSpeed = 11;
        target.maxForce = 0.7;
        const evadeForce = target.evade(pursuer);
        target.applyForce(evadeForce);

        // Option de largage de leurres (flares) derrière la cible
        target.launchFlare(flares);
      } else {
        target.isAlerted = false;
        target.maxSpeed = 6;
        target.maxForce = 0.3;
      }

      // Détection d'interception / contact
      if (d < pursuer.r + target.r) {
        // La cible est touchée : réapparition immédiate pour maintenir 4 cibles
        respawnTarget(target);
      }

      target.update();
    }

    // 5. Mise à jour et nettoyage des leurres (détruits après 1s)
    const currentTime = millis();
    for (let i = flares.length - 1; i >= 0; i--) {
      const flare = flares[i];
      flare.update();
      if (flare.isDead(currentTime)) {
        flares.splice(i, 1); // Destruction automatique après 1s
      }
    }
  }

  // --- RENDU GRAPHIQUE ---

  // Rendu des leurres
  for (let i = 0; i < flares.length; i++) {
    flares[i].show();
  }

  // Rendu des cibles
  for (let i = 0; i < targets.length; i++) {
    targets[i].show();
  }

  // Rendu du poursuiveur (avec trajectoire haute précision et traînée)
  pursuer.show();

  // Affichage du HUD d'informations tactiques
  drawTacticalHUD();
}

function drawTacticalGrid() {
  push();
  stroke(25, 40, 60, 60);
  strokeWeight(1);
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += gridSize) {
    line(0, y, width, y);
  }
  pop();
}

function drawTacticalHUD() {
  push();
  fill(15, 23, 42, 220);
  stroke(0, 255, 200, 100);
  strokeWeight(1);
  rect(16, 16, 320, 210, 8);

  noStroke();
  fill(0, 255, 200);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("RADAR TACTIQUE — PURSUE & EVADE", 28, 26);

  textStyle(NORMAL);
  textSize(11);
  fill(180, 210, 230);

  // Statut des cibles
  text(`Cibles simultanées : ${targets.length} / ${NB_TARGETS}`, 28, 48);

  const closest = pursuer.currentTarget;
  if (closest) {
    const distToClosest = Math.round(p5.Vector.dist(pursuer.pos, closest.pos));
    fill(0, 255, 150);
    text(`Cible la plus proche : Cible #${closest.id} (${distToClosest} px)`, 28, 66);
  } else {
    fill(180, 180, 180);
    text("Cible la plus proche : Aucune", 28, 66);
  }

  // Statut de la trajectoire
  fill(180, 210, 230);
  text("Trajectoire : Prédiction continue Euler (55 pas)", 28, 86);

  // Statut des leurres
  fill(255, 170, 50);
  text(`Leurres actifs (vie 1.0s) : ${flares.length}`, 28, 106);

  const flareStatusColor = globalFlaresEnabled ? color(0, 255, 150) : color(255, 80, 80);
  fill(flareStatusColor);
  text(`Option leurres [F] : ${globalFlaresEnabled ? "ACTIVÉE" : "DÉSACTIVÉE"}`, 28, 126);

  // Liste des distances des 4 cibles
  fill(150, 180, 200);
  textSize(10);
  text("Distances des 4 cibles :", 28, 148);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const d = Math.round(p5.Vector.dist(pursuer.pos, t.pos));
    const isTargeted = closest && closest.id === t.id;
    fill(isTargeted ? color(0, 255, 200) : color(140, 160, 180));
    text(`#${t.id}: ${d}px ${isTargeted ? "◄ VERROUILLÉE" : ""}`, 28 + (i % 2) * 140, 166 + Math.floor(i / 2) * 16);
  }

  // Raccourcis clavier
  fill(100, 140, 160);
  text("[F] Activer/Désactiver leurres  |  [R] Réinitialiser", 28, 202);

  pop();
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    globalFlaresEnabled = !globalFlaresEnabled;
    targets.forEach(t => t.flaresEnabled = globalFlaresEnabled);
  } else if (key === 'r' || key === 'R') {
    spawnTargets(NB_TARGETS);
    flares = [];
    pursuer.pos.set(width / 2, height / 2);
    pursuer.vel.set(2, 3);
  } else if (key === ' ') {
    isSimulationPaused = !isSimulationPaused;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}