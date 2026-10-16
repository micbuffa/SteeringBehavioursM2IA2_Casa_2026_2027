import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Adaptateur vectoriel minimal pour exercer le vrai vehicle.js sans DOM.
class Vector {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static random2D() { return new Vector(1, 0); }
}
function scene(w = 800, h = 600) {
<<<<<<< HEAD
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    width: w,
    height: h,
    background: () => {},
    push: () => {},
    pop: () => {},
    rect: () => {},
    stroke: () => {},
    noStroke: () => {},
    fill: () => {},
    noFill: () => {},
    strokeWeight: () => {},
    circle: () => {},
    line: () => {},
    translate: () => {},
    rotate: () => {},
    triangle: () => {},
    rectMode: () => {},
    CORNER: 'corner',
    CENTER: 'center',
    textAlign: () => {},
    textSize: () => {},
    textStyle: () => {},
    text: () => {},
    textWidth: () => 50,
    drawingContext: {
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillStyle: '',
      globalAlpha: 1,
      setLineDash: () => {}
    }
  });
  for (const file of ['vehicle.js', 'target.js', 'targetFuyante.js', 'fleeVehicle.js', 'population.js', 'mouseTarget.js', 'backgroundEffects.js', 'soundEffects.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return vm.runInContext('({ Vehicle, Target, TargetFuyante, FleeVehicle, MouseTarget, population: SeekPopulation, BackgroundFX, SoundFX })', context);
=======
  const context = vm.createContext({ createVector: (x, y) => new Vector(x, y),
    p5: { Vector }, width: w, height: h });
  for (const file of ['vehicle.js', 'population.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return vm.runInContext('({ Vehicle, population: SeekPopulation })', context);
>>>>>>> upstream/main
}
const rng = () => 0.1;
const target = new Vector(400, 300);

test('population : bornes, conservation des instances et valeurs invalides', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [];
  const resize = n => p.resize(vehicles, n, target, 800, 600, (x, y) => new Vehicle(x, y), rng);
  resize(20);
  const first = vehicles[0]; first.vel.set(2, 1);
  resize(35); assert.equal(vehicles.length, 35); assert.equal(vehicles[0], first);
  resize(8); assert.equal(vehicles.length, 8); assert.equal(first.vel.x, 2);
  resize(8); assert.equal(vehicles[0], first);
  resize(200); assert.equal(vehicles.length, 200);
  resize(1); assert.equal(vehicles.length, 1);
  for (const n of [0, 201, 1.5, NaN, '20']) assert.throws(() => resize(n), { name: 'RangeError' });
});

test('slider : input met à jour population et compteur sans change', () => {
  const { Vehicle, population: p } = scene();
  const events = {}; const slider = { value: '20', addEventListener: (name, fn) => events[name] = fn };
  const output = {}; const vehicles = [];
  p.bindSlider(slider, output, vehicles, target, () => ({ width: 800, height: 600 }),
    (x, y) => new Vehicle(x, y), rng);
  for (const count of [1, 57, 200, 8]) {
    slider.value = String(count); events.input();
    assert.equal(vehicles.length, count); assert.equal(output.value, `${count} / 200`);
  }
  assert.equal(events.change, undefined);
});

test('limites : vitesse et force sont appliquées à toute la population', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(0, 0), new Vehicle(10, 10)];
  vehicles[0].vel.set(20, 0);
  p.setLimits(vehicles, 7, 2.5);
  for (const vehicle of vehicles) {
    assert.equal(vehicle.maxSpeed, 7);
    assert.equal(vehicle.maxForce, 2.5);
    assert.ok(vehicle.vel.mag() <= 7);
  }
});

test('edges fourni : quatre seuils stricts, angles et vitesse conservée', () => {
  const { Vehicle } = scene();
  for (const [x, y, expectedX, expectedY] of [
    [817, 100, -16, 100], [-17, 100, 816, 100],
    [100, 617, 100, -16], [100, -17, 100, 616],
    [817, -17, -16, 616], [816, 616, 816, 616], [-16, -16, -16, -16],
  ]) {
    const v = new Vehicle(x, y); v.vel.set(2, -3); v.edges();
    assert.deepEqual([v.pos.x, v.pos.y], [expectedX, expectedY]);
    assert.deepEqual([v.vel.x, v.vel.y], [2, -3]);
  }
});

test('seek fourni : forces proches/lointaines limitées et cible intacte', () => {
  const { Vehicle } = scene();
  for (const position of [new Vector(0.001, 0), new Vector(800, 600), new Vector(0, 0)]) {
    const v = new Vehicle(0, 0); const original = [position.x, position.y];
    const force = v.seek(position);
    assert.ok(force.mag() <= v.maxForce + 1e-12);
    if (position.mag()) assert.ok(force.x > 0);
    assert.deepEqual([position.x, position.y], original);
    v.vel.set(100, 100); v.applyBehaviors(position); v.update();
    assert.ok(v.vel.mag() <= v.maxSpeed + 1e-12);
    assert.equal(v.acc.mag(), 0);
  }
});

test('arrivée : seuil inclusif, même instance et paramètres préservés', () => {
  const { Vehicle, population: p } = scene();
  const v = new Vehicle(432.01, 300);
  assert.equal(p.hasArrived(v, target), false);
  v.pos.x = 432; assert.equal(p.hasArrived(v, target), true);
  v.vel.set(3, 1); v.acc.set(1, 2);
  const parameters = [v.r, v.maxSpeed, v.maxForce];
  p.step(v, target, 800, 600, rng);
  assert.equal(v.vel.mag(), 0); assert.equal(v.acc.mag(), 0);
  assert.ok(Math.hypot(v.pos.x - target.x, v.pos.y - target.y) > 20);
  assert.deepEqual([v.r, v.maxSpeed, v.maxForce], parameters);
});

test('arrivée avant/après déplacement, après wrap, et une seule réapparition', () => {
  const { Vehicle, population: p } = scene();
  const before = new Vehicle(400, 300);
  before.update = () => assert.fail('Pas de locomotion après une arrivée avant déplacement');
  let calls = 0;
  p.step(before, target, 800, 600, () => { calls++; return 0.1; });
  assert.equal(calls, 2);
  const after = new Vehicle(418, 300); after.vel.set(-4, 0);
  p.step(after, target, 800, 600, rng); assert.equal(after.vel.mag(), 0);
  const wrap = new Vehicle(815, 100); wrap.vel.set(4, 0);
  p.step(wrap, new Vector(0, 100), 800, 600, rng);
  assert.equal(wrap.vel.mag(), 0); assert.ok(wrap.pos.x >= 0);
});

test('tirage : marges, repli déterministe borné, petite géométrie impossible', () => {
  const { Vehicle, population: p } = scene();
  const point = p.spawnPosition(target, 800, 600, 16, rng);
  assert.ok(point.x >= 16 && point.x <= 784 && point.y >= 16 && point.y <= 584);
  let calls = 0;
  const fallback = p.spawnPosition(target, 800, 600, 16, () => { calls++; return 0.5; });
  assert.equal(calls, 64); assert.equal(fallback.x, 16); assert.equal(fallback.y, 16);
  assert.equal(p.spawnPosition(new Vector(20, 20), 40, 40, 16, () => 0.5), null);
  const smallTarget = new Vector(5, 5);
  assert.equal(p.spawnPosition(smallTarget, 10, 10, 16, rng), null);
  const v = new Vehicle(5, 5); v.vel.set(1, 2);
  assert.equal(p.respawn(v, smallTarget, 10, 10, rng), false);
  assert.deepEqual([v.pos.x, v.pos.y, v.vel.x, v.vel.y], [5, 5, 1, 2]);
  const vehicles = [];
  p.resize(vehicles, 200, smallTarget, 10, 10, (x, y) => new Vehicle(x, y), rng);
  assert.equal(vehicles.length, 200);
});

test('population : arrivées simultanées et véhicules supprimés non mis à jour', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(400, 300), new Vehicle(400, 300)];
  for (const v of vehicles) p.step(v, target, 800, 600, rng);
  assert.equal(vehicles.length, 2);
  assert.ok(vehicles.every(v => !p.hasArrived(v, target)));
  const removed = vehicles[1]; removed.update = () => assert.fail('Véhicule supprimé');
  p.resize(vehicles, 1, target, 800, 600, () => assert.fail('Création inutile'));
  for (const v of vehicles) p.step(v, target, 800, 600, rng);
});
<<<<<<< HEAD

test('MouseTarget hérite de Vehicle et garde le rayon visuel attendu', () => {
  const { Vehicle, MouseTarget } = scene(); const t = new MouseTarget(50, 60);
  assert.ok(t instanceof Vehicle); assert.equal(t.r, 16); assert.equal(t.vel.mag(), 0);
});

test('vitesse max : bornes, mise à jour des véhicules et valeurs invalides', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(0, 0), new Vehicle(10, 10)];
  p.setMaxSpeed(vehicles, 10);
  assert.equal(vehicles[0].maxSpeed, 10);
  assert.equal(vehicles[1].maxSpeed, 10);

  p.setMaxSpeed(vehicles, p.MIN_SPEED);
  assert.equal(vehicles[0].maxSpeed, 1);
  p.setMaxSpeed(vehicles, p.MAX_SPEED);
  assert.equal(vehicles[0].maxSpeed, 20);

  for (const s of [0, 21, -1, NaN, '10', null, undefined]) {
    assert.throws(() => p.setMaxSpeed(vehicles, s), { name: 'RangeError' });
  }
});

test('speed slider : input met à jour maxSpeed de tous les véhicules et le compteur sans change', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(0, 0), new Vehicle(10, 10)];
  const events = {};
  const slider = { value: '4', addEventListener: (name, fn) => { events[name] = fn; } };
  const output = {};
  let notifiedSpeed = null;

  p.bindSpeedSlider(slider, output, vehicles, speed => { notifiedSpeed = speed; });
  assert.equal(vehicles[0].maxSpeed, 4);
  assert.equal(vehicles[1].maxSpeed, 4);
  assert.equal(output.value, '4 / 20');
  assert.equal(notifiedSpeed, 4);

  for (const speed of [1, 8, 20, 2]) {
    slider.value = String(speed);
    events.input();
    assert.equal(vehicles[0].maxSpeed, speed);
    assert.equal(vehicles[1].maxSpeed, speed);
    assert.equal(output.value, `${speed} / 20`);
    assert.equal(notifiedSpeed, speed);
  }
  assert.equal(events.change, undefined);
});

test('vitesse max et population : les véhicules ajoutés conservent la vitesse configurée', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [];
  let currentSpeed = p.INITIAL_SPEED;
  const speedSlider = { value: '4', addEventListener: (name, fn) => {} };
  const speedOutput = {};

  p.bindSpeedSlider(speedSlider, speedOutput, vehicles, s => { currentSpeed = s; });
  p.resize(vehicles, 2, target, 800, 600, (x, y) => {
    const v = new Vehicle(x, y);
    v.maxSpeed = currentSpeed;
    return v;
  }, rng);

  p.setMaxSpeed(vehicles, 12);
  currentSpeed = 12;

  p.resize(vehicles, 5, target, 800, 600, (x, y) => {
    const v = new Vehicle(x, y);
    v.maxSpeed = currentSpeed;
    return v;
  }, rng);

  assert.equal(vehicles.length, 5);
  for (const v of vehicles) {
    assert.equal(v.maxSpeed, 12);
  }
});

test('force max : bornes, mise à jour des véhicules et valeurs invalides', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(0, 0), new Vehicle(10, 10)];
  p.setMaxForce(vehicles, 0.5);
  assert.equal(vehicles[0].maxForce, 0.5);
  assert.equal(vehicles[1].maxForce, 0.5);

  p.setMaxForce(vehicles, p.MIN_FORCE);
  assert.equal(vehicles[0].maxForce, 0.01);
  p.setMaxForce(vehicles, p.MAX_FORCE);
  assert.equal(vehicles[0].maxForce, 1);

  for (const f of [0, -0.01, 1.05, NaN, '0.5', null, undefined]) {
    assert.throws(() => p.setMaxForce(vehicles, f), { name: 'RangeError' });
  }
});

test('force slider : input met à jour maxForce de tous les véhicules et le compteur sans change', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [new Vehicle(0, 0), new Vehicle(10, 10)];
  const events = {};
  const slider = { value: '0.1', addEventListener: (name, fn) => { events[name] = fn; } };
  const output = {};
  let notifiedForce = null;

  p.bindForceSlider(slider, output, vehicles, force => { notifiedForce = force; });
  assert.equal(vehicles[0].maxForce, 0.1);
  assert.equal(vehicles[1].maxForce, 0.1);
  assert.equal(output.value, '0.10 / 1.00');
  assert.equal(notifiedForce, 0.1);

  for (const force of [0.01, 0.25, 0.8, 1]) {
    slider.value = String(force);
    events.input();
    assert.equal(vehicles[0].maxForce, force);
    assert.equal(vehicles[1].maxForce, force);
    assert.equal(output.value, `${force.toFixed(2)} / 1.00`);
    assert.equal(notifiedForce, force);
  }
  assert.equal(events.change, undefined);
});

test('force max et population : les véhicules ajoutés conservent la force configurée', () => {
  const { Vehicle, population: p } = scene();
  const vehicles = [];
  let currentForce = p.INITIAL_FORCE;
  const forceSlider = { value: '0.1', addEventListener: (name, fn) => {} };
  const forceOutput = {};

  p.bindForceSlider(forceSlider, forceOutput, vehicles, f => { currentForce = f; });
  p.resize(vehicles, 2, target, 800, 600, (x, y) => {
    const v = new Vehicle(x, y);
    v.maxForce = currentForce;
    return v;
  }, rng);

  p.setMaxForce(vehicles, 0.35);
  currentForce = 0.35;

  p.resize(vehicles, 5, target, 800, 600, (x, y) => {
    const v = new Vehicle(x, y);
    v.maxForce = currentForce;
    return v;
  }, rng);

  assert.equal(vehicles.length, 5);
  for (const v of vehicles) {
    assert.equal(v.maxForce, 0.35);
  }
});

test('Target autonome : hérite de Vehicle, vitesse autonome et bouclage edges()', () => {
  const { Vehicle, Target } = scene();
  const t = new Target(100, 200, 4);

  assert.ok(t instanceof Vehicle, 'Target doit étendre Vehicle');
  assert.equal(t.r, 16);
  assert.ok(t.vel.mag() > 0, 'Target doit posséder une vitesse autonome');

  // Déplacement autonome via update()
  const initialX = t.pos.x;
  t.update();
  assert.notEqual(t.pos.x, initialX, 'Target doit se déplacer automatiquement');

  // Bouclage des bords (edges)
  t.pos.set(817, 300);
  t.edges();
  assert.equal(t.pos.x, -16, 'Target doit boucler du bord droit vers le bord gauche');

  t.pos.set(-17, 300);
  t.edges();
  assert.equal(t.pos.x, 816, 'Target doit boucler du bord gauche vers le bord droit');
});

test('FleeVehicle et formule de Craig Reynolds pour flee()', () => {
  const { Vehicle, FleeVehicle } = scene();
  const v = new FleeVehicle(200, 100);
  assert.ok(v instanceof Vehicle, 'FleeVehicle doit étendre Vehicle');

  // 1. Cible à gauche (100, 100) : fuite vers la droite (+x)
  const targetPos = new Vector(100, 100);
  const force = v.flee(targetPos);

  // La force doit pointer à l'opposé de la cible (+x)
  assert.ok(force.x > 0, 'La force de fuite doit être orientée à l opposé de la cible');
  assert.equal(force.y, 0);
  assert.ok(force.mag() <= v.maxForce + 1e-9, 'La force de fuite doit respecter maxForce');

  // 2. Correction d inertie selon Reynolds : steering = desiredSpeed - currentSpeed
  // Si le véhicule se dirigeait vers la cible à vitesse maximale (-4, 0)
  v.vel.set(-4, 0);
  const brakingForce = v.flee(targetPos);
  // desiredSpeed = (+4, 0), force brute = (+4, 0) - (-4, 0) = (+8, 0)
  // force limitée = (+maxForce, 0)
  assert.equal(brakingForce.x, v.maxForce, 'Reynolds flee doit braquer/freiner avec maxForce vers la droite');

  // 3. Modes de comportement dans applyBehaviors
  v.vel.set(0, 0);
  v.mode = 'flee';
  v.applyBehaviors(targetPos);
  assert.ok(v.acc.x > 0, 'En mode flee, applyBehaviors doit appliquer une force de fuite');

  v.acc.set(0, 0);
  v.mode = 'seek';
  v.applyBehaviors(targetPos);
  assert.ok(v.acc.x < 0, 'En mode seek, applyBehaviors doit appliquer une force de poursuite vers la gauche');
});

test('réapparition aléatoire avec FleeVehicle lors d un contact avec la cible', () => {
  const { FleeVehicle, population: p } = scene();
  const v = new FleeVehicle(400, 300);
  const targetPos = new Vector(400, 300); // Même position => distance 0 <= 16

  v.vel.set(2, 3);
  v.acc.set(0.1, 0.1);

  // Exécution d'un pas de simulation
  p.step(v, targetPos, 800, 600, rng);

  // Le véhicule doit avoir été réapparu loin de la cible avec vitesse et accélération nulles
  assert.notEqual(v.pos.x, targetPos.x, 'Le véhicule doit être déplacé à une nouvelle position');
  assert.equal(v.vel.x, 0, 'La vitesse doit être réinitialisée');
  assert.equal(v.vel.y, 0, 'La vitesse doit être réinitialisée');
  assert.equal(v.acc.x, 0, 'L accélération doit être réinitialisée');
});

test('gestion du mode de comportement : setBehaviorMode et bindBehaviorSelect', () => {
  const { FleeVehicle, population: p } = scene();
  const vehicles = [new FleeVehicle(10, 10), new FleeVehicle(20, 20)];

  p.setBehaviorMode(vehicles, 'seek');
  assert.equal(vehicles[0].mode, 'seek');
  assert.equal(vehicles[1].mode, 'seek');

  p.setBehaviorMode(vehicles, 'flee');
  assert.equal(vehicles[0].mode, 'flee');
  assert.equal(vehicles[1].mode, 'flee');

  assert.throws(() => p.setBehaviorMode(vehicles, 'invalid'), { name: 'TypeError' });

  // Sélecteur d'interface
  const events = {};
  const select = { value: 'seek', addEventListener: (name, fn) => { events[name] = fn; } };
  let notifiedMode = null;

  p.bindBehaviorSelect(select, vehicles, mode => { notifiedMode = mode; });
  assert.equal(vehicles[0].mode, 'seek');
  assert.equal(notifiedMode, 'seek');

  select.value = 'flee';
  events.change();
  assert.equal(vehicles[0].mode, 'flee');
  assert.equal(notifiedMode, 'flee');
});

test('Tâche 9 : les véhicules poursuivent la cible mobile Target', () => {
  const { FleeVehicle, Target, population: p } = scene();
  const targetEntity = new Target(400, 300, 2);
  const vehicle = new FleeVehicle(100, 300, 'seek');

  assert.equal(vehicle.mode, 'seek');

  // Simulation d'un pas : le véhicule doit se déplacer vers la cible
  const distBefore = Math.hypot(vehicle.pos.x - targetEntity.pos.x, vehicle.pos.y - targetEntity.pos.y);
  p.step(vehicle, targetEntity, 800, 600, rng, 'vehicle');
  const distAfter = Math.hypot(vehicle.pos.x - targetEntity.pos.x, vehicle.pos.y - targetEntity.pos.y);

  assert.ok(distAfter < distBefore, 'Le véhicule doit se rapprocher de la cible mobile');
  assert.ok(vehicle.vel.x > 0, 'La vitesse doit être orientée vers la cible (vers la droite)');
});

test('Tâche 10 - Variante A : le véhicule réapparaît aléatoirement à l arrivée', () => {
  const { FleeVehicle, Target, population: p } = scene();
  const targetEntity = new Target(400, 300, 2);
  // Véhicule placé exactement sur la cible (distance 0 <= 16)
  const vehicle = new FleeVehicle(400, 300, 'seek');
  vehicle.vel.set(3, 1);
  vehicle.acc.set(0.1, 0.1);

  const targetInitialX = targetEntity.pos.x;
  const targetInitialY = targetEntity.pos.y;

  p.step(vehicle, targetEntity, 800, 600, rng, 'vehicle');

  // Variante A : le véhicule réapparaît ailleurs
  assert.notEqual(vehicle.pos.x, 400, 'Le véhicule doit être déplacé à une nouvelle position aléatoire');
  assert.equal(vehicle.vel.x, 0, 'La vitesse du véhicule doit être remise à zéro');
  assert.equal(vehicle.acc.x, 0, 'L accélération du véhicule doit être remise à zéro');

  // La cible ne doit pas avoir été téléportée par la Variante A
  assert.equal(targetEntity.pos.x, targetInitialX);
  assert.equal(targetEntity.pos.y, targetInitialY);
});

test('Tâche 10 - Variante B : la cible réapparaît aléatoirement à l arrivée', () => {
  const { FleeVehicle, Target, population: p } = scene();
  const targetEntity = new Target(400, 300, 2);
  // Véhicule placé exactement sur la cible (distance 0 <= 16)
  const vehicle = new FleeVehicle(400, 300, 'seek');
  vehicle.vel.set(2, 2);

  p.step(vehicle, targetEntity, 800, 600, rng, 'target');

  // Variante B : la cible est téléportée aléatoirement
  assert.notEqual(targetEntity.pos.x, 400, 'La cible doit être repositionnée aléatoirement');

  // Les véhicules continuent de poursuivre la cible depuis sa nouvelle position
  const force = vehicle.seek(targetEntity.pos);
  assert.ok(force.mag() > 0, 'Le véhicule continue de calculer une force vers la nouvelle position de la cible');
});

test('sélecteur de variante d arrivée : bindArrivalSelect', () => {
  const { population: p } = scene();
  const events = {};
  const select = { value: 'vehicle', addEventListener: (name, fn) => { events[name] = fn; } };
  let chosenVariant = null;

  p.bindArrivalSelect(select, variant => { chosenVariant = variant; });
  assert.equal(chosenVariant, 'vehicle');

  select.value = 'target';
  events.change();
  assert.equal(chosenVariant, 'target');

  select.value = 'invalid';
  assert.throws(() => events.change(), { name: 'TypeError' });
});

test('BackgroundFX : gestion des dégradés, presets et traînées', () => {
  const { BackgroundFX: bg } = scene();

  // Présence des présets demandés
  assert.ok(bg.PRESETS['gradient-midnight'], 'Le preset gradient-midnight doit exister');
  assert.ok(bg.PRESETS['gradient-cyberpunk'], 'Le preset gradient-cyberpunk doit exister');
  assert.ok(bg.PRESETS['gradient-sunset'], 'Le preset gradient-sunset doit exister');
  assert.ok(bg.PRESETS['gradient-ocean'], 'Le preset gradient-ocean doit exister');
  assert.ok(bg.PRESETS['gradient-matrix'], 'Le preset gradient-matrix doit exister');
  assert.ok(bg.PRESETS['black'], 'Le preset black doit exister');

  // Changement de preset
  bg.setPreset('gradient-cyberpunk');
  assert.equal(bg.getPreset(), 'gradient-cyberpunk');

  // Traînées
  assert.equal(bg.hasTrails(), false);
  bg.setTrails(true);
  assert.equal(bg.hasTrails(), true);

  // Rendu sans erreur
  assert.doesNotThrow(() => bg.render(800, 600));

  // Validation d'erreur
  assert.throws(() => bg.setPreset('unknown-preset'), { name: 'RangeError' });
});

test('SoundFX : muet, volume et résistance en environnement headless', () => {
  const { SoundFX: sfx } = scene();

  assert.equal(sfx.isMuted(), false);
  sfx.setMuted(true);
  assert.equal(sfx.isMuted(), true);

  const toggled = sfx.toggleMute();
  assert.equal(toggled, false);
  assert.equal(sfx.isMuted(), false);

  assert.doesNotThrow(() => sfx.setVolume(0.5));
  assert.doesNotThrow(() => sfx.setVolume(1.5)); // Borné proprement

  // En environnement test headless (sans AudioContext natif), playArrivalSound ne doit pas planter
  assert.doesNotThrow(() => sfx.playArrivalSound('vehicle'));
  assert.doesNotThrow(() => sfx.playArrivalSound('target'));
});

test('step avec notification sonore onArrival lors d un impact', () => {
  const { FleeVehicle, Target, population: p } = scene();
  const targetEntity = new Target(400, 300, 2);
  const vehicle = new FleeVehicle(400, 300, 'seek');

  let notifiedArrival = null;
  p.step(vehicle, targetEntity, 800, 600, rng, 'vehicle', variant => {
    notifiedArrival = variant;
  });

  assert.equal(notifiedArrival, 'vehicle', 'onArrival doit être appelé avec la variante vehicle');

  let notifiedTargetArrival = null;
  const vehicle2 = new FleeVehicle(targetEntity.pos.x, targetEntity.pos.y, 'seek');
  p.step(vehicle2, targetEntity, 800, 600, rng, 'target', variant => {
    notifiedTargetArrival = variant;
  });

  assert.equal(notifiedTargetArrival, 'target', 'onArrival doit être appelé avec la variante target');
});

test('TargetFuyante : héritage de Vehicle et Target, initialisation et paramètres', () => {
  const { Vehicle, Target, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);

  assert.ok(tf instanceof Vehicle, 'TargetFuyante doit hériter de Vehicle');
  assert.ok(tf instanceof Target, 'TargetFuyante doit hériter de Target');
  assert.equal(tf.baseSpeed, 3);
  assert.equal(tf.maxSpeed, 3);
  assert.equal(tf.detectionRadius, 200);
  assert.equal(tf.escapeRadius, 300);
  assert.equal(tf.maxFleeDuration, 2.5);
  assert.equal(tf.stamina, 2.5);
  assert.equal(tf.isFleeing, false);
  assert.equal(tf.hasIntruder, false);
  assert.equal(tf.debug, false);
});

test('TargetFuyante : comportement autonome normal lorsque aucun prédateur n est dans le cercle de 200px', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  // Prédateur situé à distance 250px (> 200px)
  const predator = new FleeVehicle(150, 300);

  tf.applyBehaviors([predator], 0.1);

  assert.equal(tf.hasIntruder, false, 'Aucun intrus ne doit être détecté hors des 200px');
  assert.equal(tf.isFleeing, false, 'La cible ne doit pas fuir hors du cercle de détection');
  assert.equal(tf.maxSpeed, 3, 'La vitesse maximale doit rester la vitesse normale');
  assert.equal(tf.maxForce, 0.1, 'La force maximale doit rester la force normale');
  assert.equal(tf.stamina, 2.5, 'L endurance ne doit pas être entamée');
});

test('TargetFuyante : détection d un prédateur dans le cercle de 200px, accélération et force de fuite flee()', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  // Prédateur situé à 150px à gauche de la cible (250, 300)
  const predator = new FleeVehicle(250, 300);

  tf.applyBehaviors([predator], 0.5);

  assert.equal(tf.hasIntruder, true, 'Un intrus doit être détecté dans le cercle de 200px');
  assert.equal(tf.isFleeing, true, 'La cible doit entrer en état de fuite');
  assert.ok(tf.maxSpeed > tf.baseSpeed, 'La vitesse doit augmenter pendant la fuite');
  assert.equal(tf.maxSpeed, 6, 'Vitesse de fuite attendue à 6 px/f');
  assert.equal(tf.maxForce, 0.4, 'Force maximale accrue pour accélérer pendant la fuite');
  assert.equal(tf.stamina, 2.0, 'L endurance doit être réduite de la durée écoulée (0.5s)');

  // La force de fuite appliquée doit pointer à l opposé du prédateur (+x)
  assert.ok(tf.acc.x > 0, 'L accélération doit éloigner la cible du prédateur');
});

test('TargetFuyante : hystérésis de fuite entre 200px et 300px', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  const predator = new FleeVehicle(250, 300); // 150px -> déclenche la fuite

  tf.applyBehaviors([predator], 0.1);
  assert.equal(tf.isFleeing, true, 'La cible commence à fuir');

  // Le prédateur recule à 260px (hors des 200px, mais en-dessous des 300px)
  predator.pos.set(140, 300); // Distance = 260px
  tf.applyBehaviors([predator], 0.1);

  assert.equal(tf.hasIntruder, false, 'Le prédateur est sorti du cercle de détection de 200px');
  assert.equal(tf.isFleeing, true, 'La cible doit continuer à fuir tant qu elle n a pas atteint 300px');
});

test('TargetFuyante : arrêt de la fuite au-delà de 300px et reprise du comportement normal', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  const predator = new FleeVehicle(250, 300); // 150px -> déclenche la fuite

  tf.applyBehaviors([predator], 0.5);
  assert.equal(tf.isFleeing, true);

  // Le prédateur est maintenant à 350px (>= 300px)
  predator.pos.set(50, 300); // Distance = 350px
  tf.applyBehaviors([predator], 0.2);

  assert.equal(tf.isFleeing, false, 'La cible doit cesser de fuir une fois à plus de 300px');
  assert.equal(tf.maxSpeed, 3, 'La cible reprend sa vitesse normale de base');
  assert.equal(tf.maxForce, 0.1, 'La cible reprend sa force normale de base');
});

test('TargetFuyante : limite d endurance (2,5s max) et arrêt forcé de la fuite', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  const predator = new FleeVehicle(350, 300); // Distance = 50px

  // Écoulement de 2.5 secondes de fuite
  tf.applyBehaviors([predator], 2.5);

  assert.equal(tf.stamina, 0, 'L endurance doit être entièrement consommée');
  assert.equal(tf.isFleeing, false, 'La cible ne peut plus fuir après 2.5s d endurance épuisée');
  assert.equal(tf.maxSpeed, 3, 'La cible retourne à sa vitesse normale malgré la proximité du prédateur');

  // Au repos (prédateur éloigné), l endurance récupère progressivement
  predator.pos.set(0, 0); // loin
  tf.applyBehaviors([predator], 1.0);
  assert.ok(tf.stamina > 0, 'L endurance doit récupérer progressivement au repos');
});

test('TargetFuyante : fuite orientée par rapport au prédateur le plus proche', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);
  // P1 à gauche à 120px (280, 300)
  const p1 = new FleeVehicle(280, 300);
  // P2 à droite à 40px (440, 300) -> plus proche !
  const p2 = new FleeVehicle(440, 300);

  tf.applyBehaviors([p1, p2], 0.1);

  assert.equal(tf.nearestPredator, p2, 'La cible doit cibler le prédateur le plus proche');
  // P2 étant à droite, la fuite doit pousser la cible vers la gauche (-x)
  assert.ok(tf.acc.x < 0, 'La force de fuite doit s éloigner du prédateur le plus proche');
});

test('TargetFuyante : mode debug et visibilité du cercle', () => {
  const { FleeVehicle, TargetFuyante } = scene();
  const tf = new TargetFuyante(400, 300, 3, 200, 300, 2.5);

  assert.equal(tf.debug, false);
  tf.setDebug(true);
  assert.equal(tf.debug, true);

  const toggled = tf.toggleDebug();
  assert.equal(toggled, false);
  assert.equal(tf.debug, false);

  // Rendu en mode debug avec et sans intrus
  tf.setDebug(true);
  assert.doesNotThrow(() => tf.show(), 'Le rendu show() avec debug actif ne doit pas lever d exception');

  const predator = new FleeVehicle(300, 300); // Dans le cercle (100px <= 200px)
  tf.applyBehaviors([predator], 0.1);
  assert.equal(tf.hasIntruder, true);
  assert.doesNotThrow(() => tf.show(), 'Le rendu avec intrus (cercle rouge) ne doit pas lever d exception');
});

test('SeekPopulation : gestion du sélecteur de scénario', () => {
  const { population: p } = scene();
  const events = {};
  const select = { value: 'scenario-1', addEventListener: (name, fn) => { events[name] = fn; } };
  let chosenScenario = null;

  p.bindScenarioSelect(select, s => { chosenScenario = s; });
  assert.equal(chosenScenario, 'scenario-1');

  select.value = 'scenario-2';
  events.change();
  assert.equal(chosenScenario, 'scenario-2');

  select.value = 'invalid';
  assert.throws(() => events.change(), { name: 'TypeError' });
});

test('SeekPopulation : sliders de rayon de détection, endurance et debug', () => {
  const { population: p } = scene();

  // 1. Rayon de détection
  const detectEvents = {};
  const detectSlider = { value: '200', addEventListener: (name, fn) => { detectEvents[name] = fn; } };
  const detectOutput = {};
  let chosenRadius = null;
  p.bindDetectionSlider(detectSlider, detectOutput, r => { chosenRadius = r; });
  assert.equal(chosenRadius, 200);
  assert.equal(detectOutput.value, '200 px');

  detectSlider.value = '350';
  detectEvents.input();
  assert.equal(chosenRadius, 350);
  assert.equal(detectOutput.value, '350 px');

  detectSlider.value = '10'; // sous la borne min (50)
  assert.throws(() => detectEvents.input(), { name: 'RangeError' });

  // 2. Endurance
  const durEvents = {};
  const durSlider = { value: '2.5', addEventListener: (name, fn) => { durEvents[name] = fn; } };
  const durOutput = {};
  let chosenDur = null;
  p.bindDurationSlider(durSlider, durOutput, d => { chosenDur = d; });
  assert.equal(chosenDur, 2.5);
  assert.equal(durOutput.value, '2.5 s');

  durSlider.value = '4.0';
  durEvents.input();
  assert.equal(chosenDur, 4.0);
  assert.equal(durOutput.value, '4.0 s');

  durSlider.value = '0.1'; // sous la borne min (0.5)
  assert.throws(() => durEvents.input(), { name: 'RangeError' });

  // 3. Toggle Debug
  const dbgEvents = {};
  const dbgCheckbox = { checked: false, addEventListener: (name, fn) => { dbgEvents[name] = fn; } };
  let chosenDebug = null;
  p.bindDebugToggle(dbgCheckbox, d => { chosenDebug = d; });
  assert.equal(chosenDebug, false);

  dbgCheckbox.checked = true;
  dbgEvents.change();
  assert.equal(chosenDebug, true);
});





=======
>>>>>>> upstream/main
