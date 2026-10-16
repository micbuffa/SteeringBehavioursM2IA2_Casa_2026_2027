// Gestion de scène : aucun calcul de steering ou de locomotion ici.
const SeekPopulation = (() => {
  const MIN_COUNT = 1;
  const MAX_COUNT = 200;
  const INITIAL_COUNT = 20;
  const ARRIVAL_RADIUS = 16;

  const MIN_SPEED = 1;
  const MAX_SPEED = 20;
  const INITIAL_SPEED = 4;

  const MIN_FORCE = 0.01;
  const MAX_FORCE = 1;
  const INITIAL_FORCE = 0.1;

  function distanceSquared(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function targetPosition(target) {
    if (Array.isArray(target)) return target.length ? targetPosition(target[0]) : { x: 0, y: 0 };
    return target.pos ?? target;
  }

  function nearestTarget(vehicle, targets) {
    const list = Array.isArray(targets) ? targets : [targets];
    if (!list.length) return null;
    return list.reduce((nearest, candidate) => {
      if (!nearest) return candidate;
      return distanceSquared(vehicle.pos, targetPosition(candidate))
        < distanceSquared(vehicle.pos, targetPosition(nearest)) ? candidate : nearest;
    }, null);
  }

  function arrivalRadius(vehicle, target) {
    return (target.r ?? ARRIVAL_RADIUS) + vehicle.r;
  }

  function hasArrived(vehicle, target) {
    return distanceSquared(vehicle.pos, targetPosition(target)) <= arrivalRadius(vehicle, target) ** 2;
  }

  // null signifie qu'aucune position ne respecte la zone d'exclusion.
  function spawnPosition(target, w, h, radius, rng = Math.random) {
    const targetPoint = targetPosition(target);
    const exclusion = (target.r ?? ARRIVAL_RADIUS) + radius + 4;
    const marginX = w >= radius * 2 ? radius : 0;
    const marginY = h >= radius * 2 ? radius : 0;
    const bounds = { left: marginX, right: w - marginX, top: marginY, bottom: h - marginY };
    for (let attempt = 0; attempt < 32; attempt++) {
      const point = {
        x: bounds.left + rng() * (bounds.right - bounds.left),
        y: bounds.top + rng() * (bounds.bottom - bounds.top),
      };
      if (distanceSquared(point, targetPoint) > exclusion ** 2) return point;
    }
    const corner = farthestCorner(targetPoint, bounds);
    if (distanceSquared(corner, targetPoint) > exclusion ** 2) return corner;
    const fallback = farthestCorner(targetPoint, { left: 0, right: w, top: 0, bottom: h });
    return distanceSquared(fallback, targetPoint) > exclusion ** 2 ? fallback : null;
  }

  function farthestCorner(target, bounds) {
    const corners = [
      { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom },
    ];
    return corners.reduce((best, point) =>
      distanceSquared(point, target) > distanceSquared(best, target) ? point : best);
  }

  function resize(vehicles, count, target, w, h, createVehicle, rng = Math.random) {
    if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
      throw new RangeError('Le nombre de véhicules doit être un entier entre 1 et 200.');
    }
    const currentSpeed = vehicles.length > 0 ? vehicles[0].maxSpeed : undefined;
    const currentForce = vehicles.length > 0 ? vehicles[0].maxForce : undefined;
    const currentMode = vehicles.length > 0 ? vehicles[0].mode : undefined;
    if (count < vehicles.length) vehicles.length = count;
    while (vehicles.length < count) {
      const vehicle = createVehicle(0, 0);
      if (currentSpeed !== undefined && vehicle.maxSpeed !== currentSpeed) {
        vehicle.maxSpeed = currentSpeed;
      }
      if (currentForce !== undefined && vehicle.maxForce !== currentForce) {
        vehicle.maxForce = currentForce;
      }
      if (currentMode !== undefined && vehicle.mode !== undefined && vehicle.mode !== currentMode) {
        vehicle.mode = currentMode;
      }
      const point = spawnPosition(target, w, h, vehicle.r, rng)
        ?? farthestCorner(targetPosition(target), { left: 0, right: w, top: 0, bottom: h });
      vehicle.pos.set(point.x, point.y);
      vehicles.push(vehicle);
    }
  }

  function respawn(vehicle, target, w, h, rng = Math.random) {
    const point = spawnPosition(target, w, h, vehicle.r, rng);
    if (!point) return false;
    vehicle.pos.set(point.x, point.y);
    vehicle.vel.set(0, 0);
    vehicle.acc.set(0, 0);
    return true;
  }

<<<<<<< HEAD
  function step(vehicle, target, w, h, rng = Math.random, arrivalVariant = 'vehicle', onArrival = null) {
    const targetPos = (target && target.pos) ? target.pos : target;
    const isTargetEntity = Boolean(target && target.pos);

    if (hasArrived(vehicle, targetPos)) {
      if (arrivalVariant === 'target' && isTargetEntity && typeof target.respawn === 'function') {
        target.respawn(w, h, rng);
      } else {
        respawn(vehicle, targetPos, w, h, rng);
      }
      if (typeof onArrival === 'function') onArrival(arrivalVariant);
      return;
    }
    vehicle.applyBehaviors(targetPos);
    vehicle.update();
    vehicle.edges();
    if (hasArrived(vehicle, targetPos)) {
      if (arrivalVariant === 'target' && isTargetEntity && typeof target.respawn === 'function') {
        target.respawn(w, h, rng);
      } else {
        respawn(vehicle, targetPos, w, h, rng);
      }
      if (typeof onArrival === 'function') onArrival(arrivalVariant);
=======
  function step(vehicle, target, w, h, rng = Math.random) {
    target = nearestTarget(vehicle, target);
    if (!target) return;
    if (hasArrived(vehicle, target)) {
      respawn(vehicle, target, w, h, rng);
      return { arrived: true, target };
    }
    vehicle.applyBehaviors(targetPosition(target));
    vehicle.update();
    vehicle.edges();
    if (hasArrived(vehicle, target)) {
      respawn(vehicle, target, w, h, rng);
      return { arrived: true, target };
    }
    return { arrived: false, target };
  }

  function setLimits(vehicles, maxSpeed, maxForce) {
    for (const vehicle of vehicles) {
      vehicle.maxSpeed = maxSpeed;
      vehicle.maxForce = maxForce;
      vehicle.vel.limit(maxSpeed);
>>>>>>> upstream/main
    }
  }

  function bindSlider(slider, output, vehicles, target, dimensions, createVehicle, rng = Math.random) {
    const synchronize = () => {
      const { width: w, height: h } = dimensions();
      const activeTarget = typeof target === 'function' ? target() : target;
      resize(vehicles, Number(slider.value), activeTarget, w, h, createVehicle, rng);
      output.value = `${vehicles.length} / ${MAX_COUNT}`;
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  function setMaxSpeed(vehicles, speed) {
    if (typeof speed !== 'number' || Number.isNaN(speed) || speed < MIN_SPEED || speed > MAX_SPEED) {
      throw new RangeError(`La vitesse maximale doit être comprise entre ${MIN_SPEED} et ${MAX_SPEED}.`);
    }
    for (const vehicle of vehicles) {
      vehicle.maxSpeed = speed;
    }
  }

  function bindSpeedSlider(slider, output, vehicles, onSpeedChange) {
    const synchronize = () => {
      const speed = Number(slider.value);
      setMaxSpeed(vehicles, speed);
      output.value = `${speed} / ${MAX_SPEED}`;
      if (onSpeedChange) onSpeedChange(speed);
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  function setMaxForce(vehicles, force) {
    if (typeof force !== 'number' || Number.isNaN(force) || force < MIN_FORCE || force > MAX_FORCE) {
      throw new RangeError(`La force maximale doit être comprise entre ${MIN_FORCE} et ${MAX_FORCE}.`);
    }
    for (const vehicle of vehicles) {
      vehicle.maxForce = force;
    }
  }

  function bindForceSlider(slider, output, vehicles, onForceChange) {
    const synchronize = () => {
      const force = Number(slider.value);
      setMaxForce(vehicles, force);
      output.value = `${force.toFixed(2)} / ${MAX_FORCE.toFixed(2)}`;
      if (onForceChange) onForceChange(force);
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  const MODES = ['seek', 'flee'];
  const INITIAL_MODE = 'seek';

  function setBehaviorMode(vehicles, mode) {
    if (!MODES.includes(mode)) {
      throw new TypeError(`Mode de comportement invalide : ${mode}. Modes autorisés : ${MODES.join(', ')}.`);
    }
    for (const vehicle of vehicles) {
      vehicle.mode = mode;
    }
  }

  function bindBehaviorSelect(select, vehicles, onModeChange) {
    const synchronize = () => {
      const mode = select.value;
      setBehaviorMode(vehicles, mode);
      if (onModeChange) onModeChange(mode);
    };
    select.addEventListener('change', synchronize);
    synchronize();
  }

  const ARRIVAL_VARIANTS = ['vehicle', 'target'];
  const INITIAL_ARRIVAL_VARIANT = 'vehicle';

  function bindArrivalSelect(select, onVariantChange) {
    const synchronize = () => {
      const variant = select.value;
      if (!ARRIVAL_VARIANTS.includes(variant)) {
        throw new TypeError(`Variante d'arrivée invalide : ${variant}. Variantes autorisées : ${ARRIVAL_VARIANTS.join(', ')}.`);
      }
      if (onVariantChange) onVariantChange(variant);
    };
    select.addEventListener('change', synchronize);
    synchronize();
  }

  const SCENARIOS = ['scenario-1', 'scenario-2'];
  const INITIAL_SCENARIO = 'scenario-1';

  function bindScenarioSelect(select, onScenarioChange) {
    const synchronize = () => {
      const scenario = select.value;
      if (!SCENARIOS.includes(scenario)) {
        throw new TypeError(`Scénario invalide : ${scenario}. Scénarios autorisés : ${SCENARIOS.join(', ')}.`);
      }
      if (onScenarioChange) onScenarioChange(scenario);
    };
    select.addEventListener('change', synchronize);
    synchronize();
  }

  const MIN_DETECTION_RADIUS = 50;
  const MAX_DETECTION_RADIUS = 400;
  const INITIAL_DETECTION_RADIUS = 200;

  function bindDetectionSlider(slider, output, onRadiusChange) {
    const synchronize = () => {
      const r = Number(slider.value);
      if (typeof r !== 'number' || Number.isNaN(r) || r < MIN_DETECTION_RADIUS || r > MAX_DETECTION_RADIUS) {
        throw new RangeError(`Le rayon de détection doit être compris entre ${MIN_DETECTION_RADIUS} et ${MAX_DETECTION_RADIUS}.`);
      }
      if (output) output.value = `${r} px`;
      if (onRadiusChange) onRadiusChange(r);
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  const MIN_FLEE_DURATION = 0.5;
  const MAX_FLEE_DURATION = 10.0;
  const INITIAL_FLEE_DURATION = 2.5;

  function bindDurationSlider(slider, output, onDurationChange) {
    const synchronize = () => {
      const dur = Number(slider.value);
      if (typeof dur !== 'number' || Number.isNaN(dur) || dur < MIN_FLEE_DURATION || dur > MAX_FLEE_DURATION) {
        throw new RangeError(`La durée d'endurance doit être comprise entre ${MIN_FLEE_DURATION} et ${MAX_FLEE_DURATION}.`);
      }
      if (output) output.value = `${dur.toFixed(1)} s`;
      if (onDurationChange) onDurationChange(dur);
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  function bindDebugToggle(checkbox, onToggle) {
    const synchronize = () => {
      const active = Boolean(checkbox.checked);
      if (onToggle) onToggle(active);
    };
    checkbox.addEventListener('change', synchronize);
    synchronize();
  }

  return { MIN_COUNT, MAX_COUNT, INITIAL_COUNT, ARRIVAL_RADIUS,
<<<<<<< HEAD
    MIN_SPEED, MAX_SPEED, INITIAL_SPEED,
    MIN_FORCE, MAX_FORCE, INITIAL_FORCE,
    MODES, INITIAL_MODE,
    ARRIVAL_VARIANTS, INITIAL_ARRIVAL_VARIANT,
    SCENARIOS, INITIAL_SCENARIO,
    MIN_DETECTION_RADIUS, MAX_DETECTION_RADIUS, INITIAL_DETECTION_RADIUS,
    MIN_FLEE_DURATION, MAX_FLEE_DURATION, INITIAL_FLEE_DURATION,
    hasArrived, spawnPosition, resize, respawn, step, bindSlider,
    setMaxSpeed, bindSpeedSlider,
    setMaxForce, bindForceSlider,
    setBehaviorMode, bindBehaviorSelect,
    bindArrivalSelect,
    bindScenarioSelect,
    bindDetectionSlider,
    bindDurationSlider,
    bindDebugToggle };
=======
    hasArrived, nearestTarget, spawnPosition, resize, respawn, step, bindSlider, setLimits };
>>>>>>> upstream/main
})();

