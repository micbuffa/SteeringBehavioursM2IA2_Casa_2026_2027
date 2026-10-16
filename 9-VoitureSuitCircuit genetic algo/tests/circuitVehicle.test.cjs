const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Mock pour p5.Vector
class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { this.x /= n; this.y /= n; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { const m = this.mag(); if (m) this.mult(1 / m); return this; }
  limit(n) { if (this.mag() > n) this.setMag(n); return this; }
  setMag(n) { return this.normalize().mult(n); }
  heading() { return Math.atan2(this.y, this.x); }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  static fromAngle(angle) { return new Vector(Math.cos(angle), Math.sin(angle)); }
}

// Mock léger pour TensorFlow.js afin de tester sans dépendance GPU/C++
const mockTf = {
  Sequential: class Sequential {
    constructor() { this.layers = []; this.weights = []; }
    add(layer) { this.layers.push(layer); }
    getWeights() { return this.weights; }
    setWeights(w) { this.weights = w; }
    dispose() {}
    predict(tensor) {
      return {
        dataSync: () => [0.5, 0.8]
      };
    }
  },
  layers: {
    dense: (opts) => ({ ...opts })
  },
  sequential: function() { return new mockTf.Sequential(); },
  tidy: (fn) => fn(),
  setBackend: () => {},
  tensor2d: (data) => ({ dataSync: () => data[0] }),
  tensor: (val, shape) => ({
    shape,
    dataSync: () => val,
    clone: function() { return mockTf.tensor(val.slice(), shape); }
  })
};

const noop = () => {};
const context = vm.createContext({
  createVector: (x, y) => new Vector(x, y),
  p5: { Vector },
  tf: mockTf,
  random: (min = 0, max) => {
    if (max === undefined) { max = min; min = 0; }
    return min + 0.5 * (max - min);
  },
  randomGaussian: (m = 0, sd = 1) => 0.05,
  radians: (deg) => deg * Math.PI / 180,
  degrees: (rad) => rad * 180 / Math.PI,
  map: (val, in_min, in_max, out_min, out_max) => (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min,
  constrain: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  abs: Math.abs,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  cos: Math.cos,
  sin: Math.sin,
  PI: Math.PI,
  TWO_PI: Math.PI * 2,
  width: 1200,
  height: 800,
  SIGHT: 80,
  LIFESPAN: 35,
  MUTATION_RATE: 0.1,
  start: new Vector(100, 100),
  push: noop,
  pop: noop,
  translate: noop,
  rotate: noop,
  stroke: noop,
  fill: noop,
  noFill: noop,
  noStroke: noop,
  strokeWeight: noop,
  line: noop,
  ellipse: noop,
  rect: noop,
  rectMode: noop,
  beginShape: noop,
  vertex: noop,
  endShape: noop,
  CLOSE: 1,
  drawingContext: { setLineDash: noop }
});

// Chargement des fichiers du projet 9
const files = ['boundary.js', 'ray.js', 'nn.js', 'vehicle.js', 'circuitVehicle.js'];
for (const file of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

const { Boundary, Ray, NeuralNetwork, Vehicle, CircuitVehicle } = vm.runInContext(
  '({ Boundary, Ray, NeuralNetwork, Vehicle, CircuitVehicle })',
  context
);

test('CircuitVehicle hérite de Vehicle et initialise la locomotion', () => {
  const car = new CircuitVehicle(null, { numRays: 7, fov: 120, maxSpeed: 6 });
  assert.ok(car instanceof Vehicle, 'CircuitVehicle doit hériter de Vehicle');
  assert.equal(car.dead, false);
  assert.equal(car.maxspeed, 6);
  assert.equal(car.sight, 90);
});

test('Le nombre de neurones par couche varie selon le nombre de rayons', () => {
  // Test avec 5 rayons
  const car5 = new CircuitVehicle(null, { numRays: 5 });
  assert.equal(car5.rays.length, 5, '5 rayons capteurs attendus');
  const topology5 = car5.brain.getTopology();
  assert.equal(topology5[0], 5, 'Couche entrée = 5');
  assert.equal(topology5[1], 10, 'Couche cachée 1 = 2 * 5 = 10');
  assert.equal(topology5[topology5.length - 1], 2, 'Couche sortie = 2');

  // Test avec 9 rayons
  const car9 = new CircuitVehicle(null, { numRays: 9 });
  assert.equal(car9.rays.length, 9, '9 rayons capteurs attendus');
  const topology9 = car9.brain.getTopology();
  assert.equal(topology9[0], 9, 'Couche entrée = 9');
  assert.equal(topology9[1], 18, 'Couche cachée 1 = 2 * 9 = 18');
  assert.equal(topology9[topology9.length - 1], 2, 'Couche sortie = 2');
});

test('Distribution angulaire symétrique des rayons selon le FOV', () => {
  const fov = 120;
  const car = new CircuitVehicle(null, { numRays: 5, fov: fov });
  assert.equal(car.rays.length, 5);

  const halfRad = (fov / 2) * Math.PI / 180;
  // Premier rayon doit être à -60°, le dernier à +60°, le milieu à 0°
  assert.ok(Math.abs(car.rays[0].angle - (-halfRad)) < 1e-4);
  assert.ok(Math.abs(car.rays[2].angle - 0) < 1e-4);
  assert.ok(Math.abs(car.rays[4].angle - halfRad) < 1e-4);
});

test('Le réglage de la vitesse max (curseur) limite la vitesse du véhicule', () => {
  const car = new CircuitVehicle(null, { maxSpeed: 10, maxForce: 0.5 });
  assert.equal(car.maxspeed, 10);

  // Vitesse initiale élevée
  car.vel.set(15, 0);
  car.update();
  assert.ok(car.vel.mag() <= 10.0001, 'La vitesse doit être bornée par maxspeed');

  // Mise à jour de la vitesse max (changement de curseur)
  car.maxspeed = 4;
  car.update();
  assert.ok(car.vel.mag() <= 4.0001, 'La vitesse doit respecter la nouvelle vitesse max');
});

test('Steering behavior de Reynolds : la force est bornée par maxForce', () => {
  const car = new CircuitVehicle(null, { maxForce: 0.3 });
  const walls = [new Boundary(0, 0, 1000, 0)];

  const force = car.look(walls);
  assert.ok(force instanceof Vector);
  assert.ok(force.mag() <= 0.3001, `Force (${force.mag()}) doit être <= maxForce (0.3)`);
});

test('Franchissement de checkpoint incrémente la fitness et réinitialise l endurance', () => {
  const car = new CircuitVehicle(null, {});
  const checkpoints = [
    new Boundary(100, 90, 100, 110),
    new Boundary(200, 90, 200, 110)
  ];

  car.pos.set(100, 100); // Directement sur le checkpoint 0
  car.counter = 20;
  car.check(checkpoints);

  assert.equal(car.fitness, 1, 'Fitness doit être incrémentée');
  assert.equal(car.counter, 0, 'Endurance counter doit être réinitialisé');
  assert.equal(car.index, 1, 'Index doit pointer vers le checkpoint suivant');
});

test('Endurance limitée : le véhicule meurt en cas d inactivité prolongée', () => {
  const car = new CircuitVehicle(null, {});
  car.counter = 36;
  car.update();
  assert.equal(car.dead, true, 'Le véhicule doit mourir après dépassement du lifespan');
});

test('Reproduction génétique : l enfant conserve la topologie parentale', () => {
  const parent = new CircuitVehicle(null, { numRays: 7 });
  const child = parent.reproduce();

  assert.ok(child instanceof CircuitVehicle);
  assert.equal(child.rays.length, 7);
  assert.deepEqual(child.brain.getTopology(), parent.brain.getTopology());
});
