const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  static random2D() { return new Vector(1, 0); }
}

const noop = () => {};
const context = vm.createContext({
  createVector: (x, y) => new Vector(x, y),
  p5: { Vector }, random: (min = 1) => min,
  width: 800, height: 600, constrain: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  push: noop, pop: noop, translate: noop, rotate: noop, imageMode: noop, image: noop,
  noStroke: noop, fill: noop, triangle: noop, stroke: noop, strokeWeight: noop,
  point: noop, line: noop, circle: noop, ellipse: noop, noFill: noop,
});
for (const file of ['vehicleBase.js', 'boids.js', 'obstacle.js', 'target.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInContext(source, context, { filename: file });
}
const { Boid, Vehicle, Obstacle, Target } = vm.runInContext('({Boid, Vehicle, Obstacle, Target})', context);

test('les entités du monde héritent de Vehicle et l’obstacle expose son rayon', () => {
  const obstacle = new Obstacle(20, 30, 18);
  const target = new Target(40, 50);
  assert.ok(obstacle instanceof Vehicle);
  assert.ok(target instanceof Vehicle);
  assert.equal(obstacle.pos.x, 20);
  assert.equal(obstacle.radius, 18);
  assert.equal(obstacle.vel.mag(), 0);
});

test('la cible souris suit la position demandée', () => {
  const target = new Target(0, 0);
  target.followMouse(120, 75);
  assert.deepEqual([target.pos.x, target.pos.y], [120, 75]);
});

test('la répulsion est nulle hors sécurité et bornée à proximité', () => {
  const boid = new Boid(200, 200);
  boid.vel.set(0, 0);
  assert.equal(boid.fleeCircle(new Vector(0, 0), 10, 10).mag(), 0);
  const force = boid.fleeCircle(new Vector(180, 200), 20, 12);
  assert.ok(force.x > 0, 'le boid doit être repoussé loin du centre');
  assert.ok(force.mag() <= boid.maxForce + 1e-9);
});

test('avoid accepte une liste vide et combine cible et obstacles sans dépassement', () => {
  const boid = new Boid(100, 100);
  boid.vel.set(0, 0);
  assert.equal(boid.avoid([]).mag(), 0);
  const force = boid.avoid([new Obstacle(105, 100, 20)], new Target(100, 100));
  assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y));
  assert.ok(force.mag() <= boid.maxForce * 2 + 1e-9);
});

test('flock conserve les forces collectives et tolère une scène sans obstacle', () => {
  const boid = new Boid(100, 100);
  const neighbor = new Boid(112, 100);
  boid.vel.set(1, 0);
  neighbor.vel.set(1, 0);
  assert.doesNotThrow(() => boid.flock([boid, neighbor], []));
  assert.ok(boid.acc.mag() > 0, 'séparation ou cohésion doit contribuer au mouvement');
});

test('un boid sans image dispose d’un rendu de remplacement', () => {
  const boid = new Boid(100, 100);
  assert.doesNotThrow(() => boid.show());
});
