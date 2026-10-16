import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vector(this.x, this.y); }
  add(v, y) { if (typeof v === 'number') { this.x += v; this.y += y; } else { this.x += v.x; this.y += v.y; } return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { this.x /= n; this.y /= n; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { const m = this.mag(); if (m) this.div(m); return this; }
  setMag(n) { return this.normalize().mult(n); }
  set(x, y) { this.x = x; this.y = y; return this; }
  limit(n) { if (this.magSq() > n * n) this.setMag(n); return this; }
  heading() { return Math.atan2(this.y, this.x); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new Vector(a.x + b.x, a.y + b.y); }
  static dist(a, b) { return Vector.sub(a, b).mag(); }
}

const context = {
  createVector: (x, y) => new Vector(x, y), p5: { Vector },
  random: (a, b) => b === undefined ? a * 0.5 : (a + b) / 2,
  PI: Math.PI, cos: Math.cos, sin: Math.sin, min: Math.min, max: Math.max,
  debug: false, width: 800, height: 600,
};
vm.createContext(context);
for (const file of ['vehicle.js', 'SportCar.js', 'Obstacle.js']) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
}
const { SportCar, Vehicle, Obstacle } = vm.runInContext('({ SportCar, Vehicle, Obstacle })', context);

function pathFixture() {
  return { radius: 5, points: [new Vector(0, 0), new Vector(400, 0), new Vector(400, 400)] };
}

test('SportCar est une Vehicle avec des poids réglables', () => {
  const car = new SportCar(100, 80, 'red');
  assert.ok(car instanceof Vehicle);
  assert.equal(car.followPathWeight, 1.7);
  assert.equal(car.separateWeight, 1.2);
  car.followPathWeight = 0.5;
  car.separateWeight = 3;
  assert.equal(car.followPathWeight, 0.5);
  assert.equal(car.separateWeight, 3);
});

test('les poids zéro désactivent le steering correspondant', () => {
  const car = new SportCar(150, 100);
  car.followPathWeight = 0;
  car.separateWeight = 0;
  car.applyBehaviors([car], pathFixture());
  assert.equal(car.acc.mag(), 0);
});

test('la force composée reste bornée par maxForce', () => {
  const car = new SportCar(100, 150);
  const neighbor = new SportCar(101, 150);
  car.followPathWeight = 5;
  car.separateWeight = 5;
  car.applyBehaviors([car, neighbor], pathFixture());
  assert.ok(car.acc.mag() <= car.maxForce + 1e-9);
});

test('le suivi précis trouve une projection finie et suit une tangente du circuit', () => {
  const car = new SportCar(100, 7);
  const force = car.followPrecise(pathFixture());
  assert.ok(Number.isFinite(force.x) && Number.isFinite(force.y));
  assert.ok(car.lastPathError > 0);
  assert.ok(force.mag() <= car.maxForce + 1e-9);
});

test('un obstacle dans le corridor de détection déclenche une force d’évitement', () => {
  const car = new SportCar(100, 100);
  const safe = car.avoidObstacles([{ pos: new Vector(180, 100), r: 20 }]);
  const clear = car.avoidObstacles([{ pos: new Vector(150, 190), r: 20 }]);
  assert.ok(safe.urgency > 0);
  assert.ok(safe.force.mag() > 0);
  assert.equal(clear.urgency, 0);
});

test('l’évitement anticipe une voiture rapide en approche', () => {
  const car = new SportCar(100, 100);
  car.vel = new Vector(3, 0);
  const other = new SportCar(175, 100);
  other.vel = new Vector(-4, 0);
  const threat = car.avoidVehicles([car, other]);
  assert.ok(threat.urgency > 0);
  assert.ok(threat.force.mag() > 0);
});

test('un obstacle visible est une Vehicle et conserve sa position', () => {
  const obstacle = new Obstacle(80, 120, 28);
  const before = obstacle.pos.copy();
  assert.ok(obstacle instanceof Vehicle);
  obstacle.update();
  assert.equal(obstacle.pos.x, before.x);
  assert.equal(obstacle.pos.y, before.y);
  assert.equal(obstacle.r, 28);
});

test('la voiture se dévie avant de toucher un obstacle sur une ligne droite', () => {
  const car = new SportCar(100, 100);
  car.vel = new Vector(3, 0);
  const obstacle = { pos: new Vector(180, 100), r: 20 };
  const straightTrack = { radius: 52, points: [
    new Vector(0, 100), new Vector(500, 100),
    new Vector(500, 500), new Vector(0, 500),
  ] };
  let closestDistance = Infinity;
  for (let i = 0; i < 60; i++) {
    car.applyBehaviors([car], straightTrack, [obstacle]);
    car.update();
    closestDistance = Math.min(closestDistance, Vector.dist(car.pos, obstacle.pos));
  }
  assert.ok(closestDistance > car.r + obstacle.r - 2, `collision margin: ${closestDistance.toFixed(1)} px`);
});

test('deux voitures en approche se séparent avant leur collision', () => {
  const first = new SportCar(100, 200);
  const second = new SportCar(185, 200);
  first.vel = new Vector(3, 0);
  second.vel = new Vector(-3, 0);
  const straightTrack = { radius: 52, points: [
    new Vector(0, 200), new Vector(500, 200),
    new Vector(500, 500), new Vector(0, 500),
  ] };
  let closestDistance = Vector.dist(first.pos, second.pos);
  for (let i = 0; i < 50; i++) {
    first.applyBehaviors([first, second], straightTrack);
    second.applyBehaviors([first, second], straightTrack);
    first.update();
    second.update();
    closestDistance = Math.min(closestDistance, Vector.dist(first.pos, second.pos));
  }
  assert.ok(closestDistance > first.r + second.r - 2, `collision margin: ${closestDistance.toFixed(1)} px`);
});

test('une voiture plus rapide évite aussi un véhicule lent devant elle', () => {
  const faster = new SportCar(100, 300);
  const slower = new SportCar(160, 300);
  faster.vel = new Vector(4, 0);
  slower.vel = new Vector(3, 0);
  const straightTrack = { radius: 52, points: [
    new Vector(0, 300), new Vector(500, 300),
    new Vector(500, 500), new Vector(0, 500),
  ] };
  let closestDistance = Vector.dist(faster.pos, slower.pos);
  for (let i = 0; i < 50; i++) {
    faster.applyBehaviors([faster, slower], straightTrack);
    slower.applyBehaviors([faster, slower], straightTrack);
    faster.update();
    slower.update();
    closestDistance = Math.min(closestDistance, Vector.dist(faster.pos, slower.pos));
  }
  assert.ok(closestDistance > faster.r + slower.r - 2, `collision margin: ${closestDistance.toFixed(1)} px`);
});
