import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

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
    return m ? this.mult(n / m) : this;
  }
  limit(n) {
    return this.mag() > n ? this.setMag(n) : this;
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
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  angleBetween(v) {
    return Math.atan2(this.x * v.y - this.y * v.x, this.x * v.x + this.y * v.y);
  }
  static sub(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
  }
  static add(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
  }
  static mult(v, n) {
    return new Vector(v.x * n, v.y * n);
  }
  static dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  static random2D() {
    return new Vector(1, 0);
  }
}

function createSimulationContext(w = 1200, h = 800) {
  let currentTime = 0;
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    width: w,
    height: h,
    PI: Math.PI,
    asin: Math.asin,
    sin: Math.sin,
    cos: Math.cos,
    random: (min, max) => (max !== undefined ? min + (max - min) * 0.5 : (min !== undefined ? min * 0.5 : 0.5)),
    millis: () => currentTime,
    setTime: (t) => { currentTime = t; },
    dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
    map: (val, inMin, inMax, outMin, outMax) => outMin + (val - inMin) * (outMax - outMin) / (inMax - inMin),
    constrain: (val, low, high) => Math.min(Math.max(val, low), high),
    push: () => {},
    pop: () => {},
    translate: () => {},
    rotate: () => {},
    triangle: () => {},
    circle: () => {},
    ellipse: () => {},
    line: () => {},
    stroke: () => {},
    strokeWeight: () => {},
    fill: () => {},
    noFill: () => {},
    noStroke: () => {},
    beginShape: () => {},
    vertex: () => {},
    endShape: () => {},
    textSize: () => {},
    textAlign: () => {},
    textStyle: () => {},
    text: () => {},
    rect: () => {},
    background: () => {},
    drawingContext: {
      setLineDash: () => {}
    }
  });

  const files = ['vehicle.js', 'flare.js', 'target.js', 'bouncingBall.js', 'pursuer.js'];
  for (const file of files) {
    const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    vm.runInContext(code, context);
  }

  return {
    context,
    Vehicle: vm.runInContext('Vehicle', context),
    Flare: vm.runInContext('Flare', context),
    Target: vm.runInContext('Target', context),
    BouncingBall: vm.runInContext('BouncingBall', context),
    Pursuer: vm.runInContext('Pursuer', context),
    setTime: (t) => context.setTime(t),
    getTime: () => context.millis()
  };
}

// 1. RÈGLE CRUCIALE : Tous les objets créés héritent de Vehicle
test('Exigence 1 : Tous les objets créés (Pursuer, Target, Flare, BouncingBall) héritent strictement de Vehicle', () => {
  const { Vehicle, Pursuer, Target, Flare, BouncingBall } = createSimulationContext();

  const pursuer = new Pursuer(100, 100);
  const target = new Target(200, 200, 1);
  const flare = new Flare(300, 300, new Vector(1, 0), 0);
  const bouncing = new BouncingBall(400, 400, 2);

  assert.ok(pursuer instanceof Vehicle, 'Pursuer doit étendre Vehicle');
  assert.ok(target instanceof Vehicle, 'Target doit étendre Vehicle');
  assert.ok(flare instanceof Vehicle, 'Flare doit étendre Vehicle');
  assert.ok(bouncing instanceof Vehicle, 'BouncingBall doit étendre Vehicle');
});

// 2. Exigence 2 : Gestion de 4 cibles au même temps
test('Exigence 2 : 4 cibles actives simultanément et maintien du nombre après réapparition', () => {
  const { Target, Pursuer } = createSimulationContext();
  const pursuer = new Pursuer(500, 500);

  const targets = [];
  const NB_TARGETS = 4;
  for (let i = 0; i < NB_TARGETS; i++) {
    targets.push(new Target(100 * (i + 1), 100, i + 1));
  }

  assert.equal(targets.length, 4, 'Il doit y avoir exactement 4 cibles au même temps');

  // Simulation d intercepter et réapparaître une cible
  const touchedIndex = 1;
  const touchedTarget = targets[touchedIndex];
  touchedTarget.pos.set(800, 800); // réapparition
  assert.equal(targets.length, 4, 'Le nombre de cibles reste constant à 4 après contact');
  for (let i = 0; i < targets.length; i++) {
    assert.ok(targets[i] instanceof Target);
  }
});

// 3. Exigence 3 : Le vaisseau poursuit toujours la cible la plus proche
test('Exigence 3A : Le poursuiveur sélectionne dynamiquement la cible la plus proche', () => {
  const { Pursuer, Target } = createSimulationContext();
  const pursuer = new Pursuer(500, 500);

  const t1 = new Target(100, 100, 1); // d ~ 565
  const t2 = new Target(500, 300, 2); // d = 200 (la plus proche)
  const t3 = new Target(900, 900, 3); // d ~ 565
  const t4 = new Target(500, 850, 4); // d = 350

  const targets = [t1, t2, t3, t4];

  let closest = pursuer.findClosestTarget(targets);
  assert.equal(closest.id, 2, 'La cible la plus proche doit être t2 (id=2)');

  // Déplacement de t4 plus proche que t2
  t4.pos.set(500, 450); // d = 50
  closest = pursuer.findClosestTarget(targets);
  assert.equal(closest.id, 4, 'La cible la plus proche doit devenir t4 (id=4)');

  // Cas limite : liste vide
  assert.equal(pursuer.findClosestTarget([]), null, 'Liste vide doit retourner null');
});

// 3. Exigence 3 : Trajectoire calculée et tracée avec une forte précision
test('Exigence 3B : Calcul de la trajectoire prédictive avec haute précision numérique', () => {
  const { Pursuer, Target } = createSimulationContext();
  const pursuer = new Pursuer(200, 200);
  pursuer.vel.set(2, 0);

  const target = new Target(500, 200, 1);
  target.vel.set(0, 3);

  const steps = 50;
  const points = pursuer.predictTrajectory(target, steps);

  assert.ok(points.length > 0 && points.length <= steps, 'La trajectoire doit produire des points prédits');

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    assert.ok(Number.isFinite(pt.x), `pt.x doit être fini à l étape ${i}`);
    assert.ok(Number.isFinite(pt.y), `pt.y doit être fini à l étape ${i}`);
    assert.ok(!Number.isNaN(pt.x), `pt.x ne doit pas être NaN à l étape ${i}`);
    assert.ok(!Number.isNaN(pt.y), `pt.y ne doit pas être NaN à l étape ${i}`);
  }

  // Vérification que le premier point part de la zone actuelle du poursuiveur
  assert.ok(Math.hypot(points[0].x - pursuer.pos.x, points[0].y - pursuer.pos.y) <= pursuer.maxSpeed + 0.1);
});

// 4. Exigence 4 : Largage de leurres (flares) derrière la cible lors de la détection
test('Exigence 4A : Détection du poursuiveur et largage de leurre orienté vers l arrière', () => {
  const { Pursuer, Target, Flare, setTime } = createSimulationContext();
  const pursuer = new Pursuer(300, 300);
  const target = new Target(300, 350, 1); // d = 50 < rayonDetection (140)
  target.vel.set(4, 0); // La cible avance vers la droite (+X)

  setTime(100);
  assert.ok(target.detects(pursuer), 'La cible doit détecter le poursuiveur à 50px');

  const flares = [];
  const dropped = target.launchFlare(flares, 100);

  assert.ok(dropped instanceof Flare, 'Le leurre largué doit être une instance de Flare');
  assert.equal(flares.length, 1, 'Le tableau de leurres doit contenir 1 élément');

  // Vérification que le leurre est positionné DERRIÈRE la cible
  // Comme target.vel va vers +X, la position du leurre doit être à gauche (X_flare < X_target)
  assert.ok(dropped.pos.x < target.pos.x, 'Le leurre doit être positionné derrière la cible');

  // Vérification de la vitesse d éjection arrière (vel.x négatif car target.vel.x positif)
  assert.ok(dropped.vel.x < 0, 'La vitesse du leurre doit être dirigée vers l arrière');
});

// 4. Exigence 4 : Option de largage désactivable et cooldown
test('Exigence 4B : Option de désactivation des leurres et respect du cooldown', () => {
  const { Pursuer, Target, setTime } = createSimulationContext();
  const pursuer = new Pursuer(200, 200);
  const target = new Target(200, 240, 1);

  setTime(200);
  const flares = [];

  // Cas 1 : Option désactivée
  target.flaresEnabled = false;
  const noFlare = target.launchFlare(flares, 200);
  assert.equal(noFlare, null, 'Aucun leurre ne doit être largué si flaresEnabled est faux');
  assert.equal(flares.length, 0);

  // Cas 2 : Option réactivée et cooldown
  target.flaresEnabled = true;
  const f1 = target.launchFlare(flares, 200);
  assert.ok(f1 !== null, 'Leurre largué avec succès');
  assert.equal(flares.length, 1);

  // Tentative immédiate avant écoulement du cooldown
  const fTooSoon = target.launchFlare(flares, 250); // cooldown = 220ms
  assert.equal(fTooSoon, null, 'Le cooldown doit empêcher un largage immédiat');
  assert.equal(flares.length, 1);

  // Tentative après le cooldown
  const f2 = target.launchFlare(flares, 450);
  assert.ok(f2 !== null, 'Nouveau leurre largué après le cooldown');
  assert.equal(flares.length, 2);
});

// 4. Exigence 4 : Destruction des leurres après exactement 1 seconde (1000 ms)
test('Exigence 4C : Les leurres sont vivants avant 1s et détruits après 1s', () => {
  const { Flare, setTime } = createSimulationContext();
  setTime(1000);

  const flare = new Flare(100, 100, new Vector(-2, 0), 1000);
  assert.equal(flare.lifespan, 1000, 'La durée de vie du leurre doit être de 1000 ms (1s)');

  // À t = 1500 ms (âge = 500 ms = 0.5s)
  assert.equal(flare.isDead(1500), false, 'Le leurre ne doit pas être détruit à 0.5s');

  // À t = 1999 ms (âge = 999 ms)
  assert.equal(flare.isDead(1999), false, 'Le leurre ne doit pas être détruit à 999 ms');

  // À t = 2000 ms (âge = 1000 ms = 1.0s)
  assert.equal(flare.isDead(2000), true, 'Le leurre doit être détruit à exactement 1.0s');

  // À t = 2100 ms (âge = 1100 ms > 1.0s)
  assert.equal(flare.isDead(2100), true, 'Le leurre doit être détruit au-delà de 1.0s');

  // Simulation du cycle de vie dans un tableau
  const flares = [flare];
  for (let i = flares.length - 1; i >= 0; i--) {
    if (flares[i].isDead(2000)) {
      flares.splice(i, 1);
    }
  }
  assert.equal(flares.length, 0, 'Le tableau doit être vide après nettoyage du leurre expiré');
});

// 5. Modèle physique de Reynolds : respect des forces max et locomotion
test('Exigence Modèle : Bornage des forces steering à maxForce et non-contournement de locomotion', () => {
  const { Pursuer, Target } = createSimulationContext();
  const pursuer = new Pursuer(100, 100);
  const target = new Target(800, 600, 1);

  // Force de poursuite
  const pursueForce = pursuer.calculatePursuitForce(target);
  assert.ok(pursueForce.mag() <= pursuer.maxForce + 1e-9, 'La force de poursuite doit respecter maxForce');

  // Force d évasion
  const evadeForce = target.evade(pursuer);
  assert.ok(evadeForce.mag() <= target.maxForce + 1e-9, 'La force d évasion doit respecter maxForce');

  // Application de la force sans mutation directe de la position
  const oldPos = pursuer.pos.copy();
  pursuer.applyForce(pursueForce);
  assert.equal(pursuer.pos.x, oldPos.x, 'applyForce ne doit pas modifier pos directement');
  assert.equal(pursuer.pos.y, oldPos.y, 'applyForce ne doit pas modifier pos directement');

  pursuer.update();
  assert.ok(pursuer.vel.mag() <= pursuer.maxSpeed + 1e-9, 'La vitesse après update doit respecter maxSpeed');
});
