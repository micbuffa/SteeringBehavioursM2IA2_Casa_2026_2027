/**
 * TP1 - Steering Behaviors Reynolds : Sous-projet 3 - Arrival (Snake & Autonomous Food)
 * 
 * Respect strict de l'architecture Reynolds :
 * - Tous les objets du jeu sont des sous-classes de Vehicle
 * - Le serpent utilise le comportement "arrive" pour suivre le curseur ou chasser
 * - Les aliments se déplacent de manière autonome via "wander" et "boundaries"
 * - Animations multimédia procédurales au niveau de la tête (yeux, langue, mâchoires) et sons
 * - Croissance progressive lors de la consommation des aliments
 * - Paramètres personnalisables en direct via l'interface utilisateur
 */

let snake;
let foods = [];
let particles = [];
let soundFX;
let target;

// Mode de scénario actuel
let currentScenario = 'mouse'; // 'mouse', 'hunt', 'wander'

// Paramètres de configuration par défaut
let config = {
  snakeSpeed: 5,
  snakeForce: 0.3,
  snakeSize: 16,
  initialLength: 12,
  foodSpeed: 2.5,
  foodCount: 8,
  brakingRadius: 120,
  growthRate: 3,
  foodEvasion: true,
  debug: false,
  sound: true
};

function preload() {
  // Préchargement optionnel si présent
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('scene-container');

  // Initialisation du synthétiseur sonore
  soundFX = new SoundFX();

  // Position cible initiale
  target = createVector(width / 2, height / 2);

  // Instanciation du serpent (Snake extends Vehicle)
  snake = new Snake(width / 2, height / 2, config.initialLength, config.snakeSize, '#22c55e');
  applySnakeConfig();

  // Instanciation de la nourriture autonome (Food extends Vehicle)
  creerNourriture(config.foodCount);

  // Liaison des contrôles HTML
  setupUI();
}

/**
 * Génère une population d'aliments autonomes
 */
function creerNourriture(count) {
  foods = [];
  const types = ['apple', 'berry', 'firefly', 'star'];
  for (let i = 0; i < count; i++) {
    const f = new Food(random(80, width - 80), random(80, height - 80), types[i % types.length]);
    f.maxSpeed = config.foodSpeed;
    foods.push(f);
  }
}

/**
 * Applique la configuration actuelle au serpent
 */
function applySnakeConfig() {
  snake.setSpeed(config.snakeSpeed);
  snake.setForce(config.snakeForce);
  snake.setSize(config.snakeSize);
  snake.setBrakingRadius(config.brakingRadius);
}

function draw() {
  // Arrière-plan sombre avec effet de traînée très subtil
  background(15, 23, 42);

  // Trame de fond discrète
  dessinerGrille();

  // 1. Détermination de la cible selon le scénario sélectionné
  let targetBruitee = target.copy();
  let nearestFood = null;
  let nearestDist = Infinity;

  // Recherche de l'aliment le plus proche
  for (const f of foods) {
    const d = p5.Vector.dist(snake.head.pos, f.pos);
    if (d < nearestDist) {
      nearestDist = d;
      nearestFood = f;
    }
  }

  switch (currentScenario) {
    case 'mouse':
      // Le serpent suit le curseur de la souris avec le comportement "arrive"
      target.x = mouseX;
      target.y = mouseY;
      targetBruitee = target.copy();
      break;

    case 'hunt':
      // Le serpent chasse l'aliment le plus proche de manière autonome
      if (nearestFood) {
        target.x = nearestFood.pos.x;
        target.y = nearestFood.pos.y;
      }
      targetBruitee = target.copy();
      break;

    case 'wander':
      // Errance autonome du serpent : la cible avance devant lui
      targetBruitee = snake.head.pos.copy().add(snake.head.vel.copy().setMag(100));
      break;
  }

  // 2. Dessin du réticule de la cible (en mode souris)
  if (currentScenario === 'mouse') {
    dessinerCible(target);
  }

  // 3. Mise à jour et affichage de la nourriture autonome
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.autonomousUpdate(snake.head.pos, config.foodEvasion, width, height);
    f.show();

    // Détection de collision / mastication
    if (snake.eat(f, config.growthRate)) {
      // Déclenchement de l'effet sonore
      soundFX.playEat();

      // Particules d'explosion gourmande
      creerParticules(f.pos.x, f.pos.y, f.primaryColor);

      // Réapparition de l'aliment à un autre endroit
      f.respawn(width, height);

      // Mise à jour de l'affichage des scores
      updateScoreUI();
    }
  }

  // 4. Déplacement et affichage du serpent
  const arrivalActive = (currentScenario !== 'wander');
  snake.move(targetBruitee, arrivalActive, nearestDist);
  snake.show(targetBruitee);

  // 5. Particules d'effets visuels
  updateAndDrawParticles();

  // 6. Informations en mode débug
  if (Vehicle.debug) {
    drawDebugHUD();
  }
}

/**
 * Dessine un réticule esthétique sur la cible
 */
function dessinerCible(t) {
  push();
  noFill();
  stroke(239, 68, 68, 160);
  strokeWeight(1.5);
  circle(t.x, t.y, 24);
  line(t.x - 16, t.y, t.x + 16, t.y);
  line(t.x, t.y - 16, t.x, t.y + 16);

  // Cercle intérieur
  fill(239, 68, 68, 200);
  noStroke();
  circle(t.x, t.y, 6);

  // Visualisation de la zone de freinage Reynolds en mode debug
  if (Vehicle.debug) {
    noFill();
    stroke(255, 255, 255, 70);
    strokeWeight(1);
    circle(t.x, t.y, config.brakingRadius * 2);
  }
  pop();
}

/**
 * Dessine une grille de fond très discrète
 */
function dessinerGrille() {
  push();
  stroke(255, 255, 255, 12);
  strokeWeight(1);
  const step = 60;
  for (let x = 0; x < width; x += step) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += step) {
    line(0, y, width, y);
  }
  pop();
}

/**
 * Génère des particules lumineuses lors de la capture d'un aliment
 */
function creerParticules(x, y, col) {
  for (let i = 0; i < 14; i++) {
    const angle = random(TWO_PI);
    const speed = random(1.5, 4.5);
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: random(0.03, 0.06),
      size: random(3, 7),
      col: col
    });
  }
}

/**
 * Met à jour et dessine les particules actives
 */
function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    push();
    noStroke();
    const c = color(p.col);
    c.setAlpha(p.life * 255);
    fill(c);
    circle(p.x, p.y, p.size * p.life);
    pop();
  }
}

/**
 * Affichage des informations de débogage
 */
function drawDebugHUD() {
  push();
  fill(255);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  const info = [
    `[DEBUG ACTIF - Touche 'd']`,
    `Vitesse tête: ${snake.head.vel.mag().toFixed(2)} / ${snake.head.maxSpeed}`,
    `Force max: ${snake.head.maxForce.toFixed(2)}`,
    `Zone freinage: ${config.brakingRadius} px`,
    `Anneaux: ${snake.segments.length} (En attente: ${snake.pendingGrowth})`,
    `Aliments actifs: ${foods.length}`
  ];
  let y = 80;
  for (const lineText of info) {
    fill(0, 0, 0, 150);
    rect(15, y - 2, 260, 18, 4);
    fill(147, 197, 253);
    text(lineText, 20, y);
    y += 20;
  }
  pop();
}

/**
 * Met à jour les badges de score et longueur dans l'interface
 */
function updateScoreUI() {
  const scoreElem = document.getElementById('badge-score');
  const lenElem = document.getElementById('badge-length');
  if (scoreElem) scoreElem.textContent = `Score : ${snake.score}`;
  if (lenElem) lenElem.textContent = `Longueur : ${snake.segments.length} anneaux`;
}

/**
 * Configuration des écouteurs d'événements pour les contrôles HTML
 */
function setupUI() {
  // Sélecteur de scénario
  const scenarioSelect = document.getElementById('scenario-select');
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', (e) => {
      currentScenario = e.target.value;
      soundFX.playClick();
    });
  }

  // Sliders avec mise à jour en direct
  bindSlider('snake-speed', (val) => {
    config.snakeSpeed = parseFloat(val);
    snake.setSpeed(config.snakeSpeed);
  }, (v) => `${v} px/f`);

  bindSlider('snake-size', (val) => {
    config.snakeSize = parseFloat(val);
    snake.setSize(config.snakeSize);
  }, (v) => `${v} px`);

  bindSlider('food-speed', (val) => {
    config.foodSpeed = parseFloat(val);
    foods.forEach(f => f.maxSpeed = config.foodSpeed);
  }, (v) => `${v} px/f`);

  bindSlider('food-count', (val) => {
    config.foodCount = parseInt(val);
    creerNourriture(config.foodCount);
  }, (v) => `${v}`);

  bindSlider('braking-radius', (val) => {
    config.brakingRadius = parseFloat(val);
    snake.setBrakingRadius(config.brakingRadius);
  }, (v) => `${v} px`);

  bindSlider('growth-rate', (val) => {
    config.growthRate = parseInt(val);
  }, (v) => `+${v} anneaux`);

  // Cases à cocher
  const evasionCheckbox = document.getElementById('food-evasion');
  if (evasionCheckbox) {
    evasionCheckbox.checked = config.foodEvasion;
    evasionCheckbox.addEventListener('change', (e) => {
      config.foodEvasion = e.target.checked;
    });
  }

  const debugCheckbox = document.getElementById('toggle-debug');
  if (debugCheckbox) {
    debugCheckbox.checked = Vehicle.debug;
    debugCheckbox.addEventListener('change', (e) => {
      Vehicle.debug = e.target.checked;
      config.debug = Vehicle.debug;
    });
  }

  const soundCheckbox = document.getElementById('sound-toggle');
  if (soundCheckbox) {
    soundCheckbox.checked = soundFX.enabled;
    soundCheckbox.addEventListener('change', (e) => {
      soundFX.enabled = e.target.checked;
    });
  }

  // Bouton de réinitialisation
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      snake = new Snake(width / 2, height / 2, config.initialLength, config.snakeSize, '#22c55e');
      applySnakeConfig();
      creerNourriture(config.foodCount);
      updateScoreUI();
      soundFX.playClick();
    });
  }

  updateScoreUI();
}

/**
 * Relie un curseur HTML à sa fonction de rappel et à son affichage de valeur
 */
function bindSlider(id, callback, formatFn) {
  const slider = document.getElementById(id);
  const output = document.getElementById(`${id}-val`);
  if (!slider) return;

  const update = () => {
    const val = slider.value;
    if (output) output.textContent = formatFn ? formatFn(val) : val;
    callback(val);
  };

  slider.addEventListener('input', update);
  update();
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
    config.debug = Vehicle.debug;
    const debugCheckbox = document.getElementById('toggle-debug');
    if (debugCheckbox) debugCheckbox.checked = Vehicle.debug;
  } else if (key === 'r' || key === 'R') {
    snake = new Snake(width / 2, height / 2, config.initialLength, config.snakeSize, '#22c55e');
    applySnakeConfig();
    creerNourriture(config.foodCount);
    updateScoreUI();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}