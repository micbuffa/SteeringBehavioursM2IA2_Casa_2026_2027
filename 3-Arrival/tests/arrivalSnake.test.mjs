import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/**
 * Adaptateur vectoriel p5.Vector pour tester vehicle.js et ses sous-classes sous Node.js
 */
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  mag() {
    return Math.hypot(this.x, this.y);
  }

  dist(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  normalize() {
    const m = this.mag();
    if (m > 0) this.mult(1 / m);
    return this;
  }

  setMag(n) {
    const m = this.mag();
    return m > 0 ? this.mult(n / m) : this;
  }

  limit(n) {
    if (this.mag() > n) {
      this.setMag(n);
    }
    return this;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  rotate(a) {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  static sub(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
  }

  static dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  static random2D() {
    const angle = Math.random() * Math.PI * 2;
    return new Vector(Math.cos(angle), Math.sin(angle));
  }
}

/**
 * Prépare le contexte d'exécution sandbox pour charger vehicle.js et les sous-classes
 */
function createSimulationContext(w = 1000, h = 800) {
  const context = vm.createContext({
    createVector: (x = 0, y = 0) => new Vector(x, y),
    p5: {
      Vector: Vector
    },
    width: w,
    height: h,
    TWO_PI: Math.PI * 2,
    PI: Math.PI,
    random: (min, max) => {
      if (max === undefined) {
        if (Array.isArray(min)) return min[0];
        return Math.random() * (min || 1);
      }
      return min + Math.random() * (max - min);
    },
    map: (val, inMin, inMax, outMin, outMax) => {
      return outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
    },
    lerp: (start, stop, amt) => start + (stop - start) * amt,
    color: (r, g, b) => ({ r: r || 0, g: g || 0, b: b || 0 }),
    lerpColor: (c1, c2, amt) => ({ r: 50, g: 150, b: 50 }),
    red: () => 200,
    green: () => 50,
    blue: () => 50,
    background: () => {},
    push: () => {},
    pop: () => {},
    rect: () => {},
    circle: () => {},
    line: () => {},
    ellipse: () => {},
    triangle: () => {},
    translate: () => {},
    rotate: () => {},
    stroke: () => {},
    noStroke: () => {},
    strokeWeight: () => {},
    fill: () => {},
    noFill: () => {},
    beginShape: () => {},
    endShape: () => {},
    vertex: () => {},
    bezierVertex: () => {},
    CLOSE: 'close',
    cos: Math.cos,
    sin: Math.sin,
    floor: Math.floor,
    windowWidth: w,
    windowHeight: h,
    drawingContext: {
      setLineDash: () => {}
    }
  });

  const files = [
    '../vehicle.js',
    '../soundEffects.js',
    '../snakeSegment.js',
    '../snakeHead.js',
    '../snake.js',
    '../food.js'
  ];

  for (const file of files) {
    const code = readFileSync(new URL(file, import.meta.url), 'utf8');
    vm.runInContext(code, context);
  }

  return vm.runInContext('({ Vehicle, Target, SnakeHead, SnakeSegment, Snake, Food, SoundFX })', context);
}

// -------------------------------------------------------------
// TESTS DES 5 EXIGENCES
// -------------------------------------------------------------

test('Exigence 1 : Architecture POO — Tous les objets héritent strictement de Vehicle', () => {
  const env = createSimulationContext();

  const head = new env.SnakeHead(100, 100);
  assert.equal(head instanceof env.Vehicle, true, 'SnakeHead doit être une sous-classe directe de Vehicle');

  const segment = new env.SnakeSegment(80, 100);
  assert.equal(segment instanceof env.Vehicle, true, 'SnakeSegment doit être une sous-classe directe de Vehicle');

  const food = new env.Food(200, 200);
  assert.equal(food instanceof env.Vehicle, true, 'Food doit être une sous-classe directe de Vehicle');

  const snake = new env.Snake(300, 300, 6);
  assert.equal(snake instanceof env.Vehicle, true, 'Snake doit être une sous-classe directe de Vehicle');
  assert.equal(snake.head instanceof env.Vehicle, true, 'La tête du serpent doit être un Vehicle');
  assert.equal(snake.segments.length, 6, 'Le serpent doit posséder ses anneaux initiaux');
  for (const seg of snake.segments) {
    assert.equal(seg instanceof env.Vehicle, true, 'Chaque anneau du corps doit être un Vehicle');
  }
});

test('Exigence 2A : Contrôle du serpent — Pilotage de la tête avec Arrive Reynolds et limitation de force', () => {
  const env = createSimulationContext();
  const head = new env.SnakeHead(100, 100);
  head.maxSpeed = 6;
  head.maxForce = 0.4;
  head.rayonZoneDeFreinage = 150;

  // Cible éloignée (distance = 400 > rayonZoneDeFreinage)
  const distantTarget = new Vector(500, 100);
  const distantForce = head.arrive(distantTarget);
  assert.ok(distantForce.mag() <= head.maxForce + 1e-6, 'La force de steering ne doit jamais dépasser maxForce');
  assert.ok(distantForce.x > 0, 'La force de steering doit pointer vers la cible');

  // Déplacement via locomotion sans téléportation
  const initialPos = head.pos.copy();
  head.applyForce(distantForce);
  head.update();
  assert.notDeepEqual(head.pos, initialPos, 'Le véhicule doit progresser via update()');
  assert.ok(head.vel.mag() <= head.maxSpeed, 'La vitesse ne doit jamais dépasser maxSpeed');

  // Cible proche dans la zone de freinage (distance = 50 < rayonZoneDeFreinage = 150)
  head.pos.set(450, 100);
  head.vel.set(6, 0); // Vitesse actuelle élevée
  const closeTarget = new Vector(500, 100);
  const brakeForce = head.arrive(closeTarget);
  assert.ok(brakeForce.mag() <= head.maxForce + 1e-6, 'La force de freinage doit respecter maxForce');
  // La force désirée ralentit la vitesse actuelle, produisant un vecteur de correction
  head.applyForce(brakeForce);
  head.update();
  assert.ok(head.vel.x <= 6, 'La vitesse doit être freinée à l approche de la cible');
});

test('Exigence 2B : Contrôle du serpent — Suivi en chaîne des anneaux du corps', () => {
  const env = createSimulationContext();
  const snake = new env.Snake(200, 200, 5);
  const target = new Vector(350, 200);

  // Déplacement du serpent sur 15 pas de simulation
  for (let step = 0; step < 15; step++) {
    snake.move(target, true);
  }

  // La tête s'est rapprochée de la cible
  assert.ok(snake.head.pos.x > 200, 'La tête doit avancer vers la cible');

  // Chaque anneau suit fidèlement son prédécesseur
  for (let i = 0; i < snake.segments.length; i++) {
    const preceding = i === 0 ? snake.head.pos : snake.segments[i - 1].pos;
    const current = snake.segments[i].pos;
    const dist = Vector.dist(preceding, current);
    assert.ok(dist > 0 && dist < 120, 'L espacement entre anneaux consécutifs doit rester cohérent');
  }
});

test('Exigence 3A : Nourriture animée — Déplacement autonome par errance (Wander)', () => {
  const env = createSimulationContext();
  const food = new env.Food(300, 300);
  food.maxSpeed = 3;
  food.maxForce = 0.2;

  const wanderForce = food.wander();
  assert.ok(wanderForce.mag() <= food.maxForce + 1e-6, 'La force d errance doit être bornée par maxForce');

  const startPos = food.pos.copy();
  // Mise à jour autonome
  for (let i = 0; i < 10; i++) {
    food.autonomousUpdate(null, false, 800, 600);
  }

  assert.notDeepEqual(food.pos, startPos, 'La nourriture autonome doit se déplacer dans l espace');
  assert.ok(food.vel.mag() <= food.maxSpeed, 'La vitesse de la nourriture ne doit pas dépasser maxSpeed');
});

test('Exigence 3B : Nourriture animée — Fuite de la nourriture (Evade/Flee) à proximité du serpent', () => {
  const env = createSimulationContext();
  const food = new env.Food(250, 200);
  const snakeHeadPos = new Vector(220, 200); // Serpent très proche à gauche

  food.vel.set(0, 0);
  food.autonomousUpdate(snakeHeadPos, true, 800, 600);

  // La fuite doit propulser la nourriture à l'opposé du serpent (vers la droite : vel.x > 0)
  assert.equal(food.isEvading, true, 'L aliment doit détecter le prédateur et passer en état d évasion');
  assert.ok(food.vel.x > 0, 'La force de fuite doit diriger l aliment à l opposé du prédateur');
});

test('Exigence 4 : Croissance progressive du serpent lorsqu’il mange de la nourriture', () => {
  const env = createSimulationContext();
  const initialLength = 6;
  const snake = new env.Snake(200, 200, initialLength);
  const food = new env.Food(210, 200); // Très proche de la tête

  assert.equal(snake.segments.length, initialLength, 'Nombre initial d anneaux correct');
  assert.equal(snake.pendingGrowth, 0, 'Aucune croissance en attente au départ');

  // Consommation de nourriture (croissance de +3 anneaux)
  const eaten = snake.eat(food, 3);
  assert.equal(eaten, true, 'L aliment doit être consommé lorsque la tête le touche');
  assert.equal(snake.score, 1, 'Le score doit s incrémenter de 1');
  assert.equal(snake.pendingGrowth, 3, 'La croissance de 3 anneaux doit être mise en file d attente');

  // La croissance doit être progressive (non brutale) :
  // Immédiatement après la consommation, les 3 anneaux ne sont pas encore tous créés
  assert.equal(snake.segments.length, initialLength, 'Les anneaux ne doivent pas apparaître tous en un seul instant');

  // En avançant la simulation au fil des pas de temps, les anneaux sont ajoutés progressivement
  let addedCount = 0;
  for (let frame = 0; frame < 30; frame++) {
    snake.move(new Vector(300, 200), true);
  }

  assert.equal(snake.segments.length, initialLength + 3, 'Tous les anneaux de croissance doivent avoir été ajoutés au fil des cycles');
  assert.equal(snake.pendingGrowth, 0, 'La file d attente de croissance doit être épuisée');
});

test('Exigence 5 : Paramètres personnalisables (vitesse, taille, freinage, nourriture)', () => {
  const env = createSimulationContext();
  const snake = new env.Snake(200, 200, 4, 15);
  const food = new env.Food(100, 100);

  // Test du réglage de la vitesse du serpent
  snake.setSpeed(9);
  assert.equal(snake.head.maxSpeed, 9, 'La vitesse max de la tête doit être mise à jour');
  assert.ok(snake.segments[0].maxSpeed >= 9, 'La vitesse des anneaux doit être adaptée');

  // Test du réglage de la taille du serpent
  snake.setSize(24);
  assert.equal(snake.r, 24, 'Le rayon de l organisme doit être mis à jour');
  assert.equal(snake.head.r, 24 * 1.15, 'Le rayon de la tête doit être adapté');
  assert.equal(snake.segments[0].r, 24 * 0.9, 'Le rayon des anneaux doit être adapté');

  // Test du réglage de la zone de freinage
  snake.setBrakingRadius(180);
  assert.equal(snake.head.rayonZoneDeFreinage, 180, 'Le rayon de freinage doit être mis à jour');

  // Test du réglage de la vitesse de la nourriture
  food.maxSpeed = 4.5;
  assert.equal(food.maxSpeed, 4.5, 'La vitesse max de la nourriture doit être personnalisable');
});

test('Exigence Cas Limites : Cible sur la tête, nourriture hors de portée, sécurité des vecteurs', () => {
  const env = createSimulationContext();
  const snake = new env.Snake(200, 200, 4);

  // 1. Cible exactement à la position de la tête (distance = 0)
  const zeroDistTarget = new Vector(200, 200);
  assert.doesNotThrow(() => {
    snake.move(zeroDistTarget, true);
  }, 'Une cible à distance nulle ne doit pas provoquer de division par zéro ni de crash');
  assert.ok(!Number.isNaN(snake.head.pos.x) && !Number.isNaN(snake.head.pos.y), 'Les positions ne doivent pas être NaN');

  // 2. Nourriture trop éloignée : ne doit pas être mangée
  const farFood = new env.Food(800, 800);
  const notEaten = snake.eat(farFood, 3);
  assert.equal(notEaten, false, 'Une nourriture hors de portée ne doit pas être mangée');

  // 3. Aliment nul ou indéfini
  const nullEaten = snake.eat(null, 3);
  assert.equal(nullEaten, false, 'Un aliment null ne doit pas générer d erreur');
});
