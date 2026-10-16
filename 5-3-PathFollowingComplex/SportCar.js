/** Voiture de course pilotée par le chemin et séparée de ses voisines. */
class SportCar extends Vehicle {
  static nextId = 1;
  constructor(x, y, color = '#ef4444') {
    super(x, y, random(2, 3), 0.3);
    this.r = 24;
    this.couleur = color;
    this.followPathWeight = 1.7;
    this.separateWeight = 1.2;
    this.pathMaxLength = 0;
    this.precision = 1.6;
    this.detectionDistance = 150;
    this.drivingStyle = 'normal';
    this.collisionMargin = 12;
    this.speedFactor = 1;
    this.lastPathError = 0;
    this.carId = SportCar.nextId++;
    this.avoidanceFactor = 1;
    this.avoidanceObstacle = null;
    this.obstacleAvoidanceSide = 0;
  }

  setDrivingStyle(style) {
    this.drivingStyle = style;
    const profiles = {
      prudent: { collisionMargin: 28, speedFactor: 0.82, avoidanceFactor: 1.25 },
      normal: { collisionMargin: 12, speedFactor: 1, avoidanceFactor: 1 },
      agressif: { collisionMargin: 5, speedFactor: 1.08, avoidanceFactor: 0.9 },
    };
    Object.assign(this, profiles[style] || profiles.normal);
  }

  applyBehaviors(vehicles, path, obstacles = []) {
    const follow = this.followPrecise(path).mult(this.followPathWeight * this.precision);
    const separation = this.separate(vehicles).mult(this.separateWeight);
    follow.add(separation);
    const obstacleThreat = this.avoidObstacles(obstacles);
    const carThreat = this.avoidVehicles(vehicles);
    const safety = createVector(0, 0);
    if (obstacleThreat.urgency >= carThreat.urgency && obstacleThreat.urgency > 0) {
      safety.add(obstacleThreat.force.mult(0.75 + 0.25 * obstacleThreat.urgency));
      safety.add(carThreat.force.mult(carThreat.urgency * 0.3));
    } else if (carThreat.urgency > 0) {
      safety.add(carThreat.force.mult(0.75 + 0.25 * carThreat.urgency));
      safety.add(obstacleThreat.force.mult(obstacleThreat.urgency * 0.3));
    }

    // Les forces de sécurité dominent le suivi tant qu'un risque est détecté.
    if (obstacleThreat.urgency > 0 || carThreat.urgency > 0) {
      follow.mult(0.22);
      safety.mult(this.avoidanceFactor);
      safety.add(follow).limit(this.maxForce);
      this.applyForce(safety);
    } else {
      follow.limit(this.maxForce);
      this.applyForce(follow);
    }
  }

  followPrecise(path) {
    if (!path || path.points.length < 2) return createVector(0, 0);
    const heading = this.vel.magSq() > 0.001 ? this.vel.copy().normalize() : createVector(1, 0);
    const lookAhead = Math.max(16, Math.min(74, 52 - this.precision * 12 + this.vel.mag() * 2));
    const predicted = this.pos.copy().add(heading.copy().mult(lookAhead));
    let nearest = null;
    let nearestTangent = null;
    let nearestDistanceSq = Infinity;

    for (let i = 0; i < path.points.length; i++) {
      const a = path.points[i];
      const b = path.points[(i + 1) % path.points.length];
      const segment = p5.Vector.sub(b, a);
      const lengthSq = segment.magSq();
      if (lengthSq < 0.001) continue;
      const t = Math.max(0, Math.min(1, p5.Vector.sub(predicted, a).dot(segment) / lengthSq));
      const projection = a.copy().add(segment.copy().mult(t));
      const distanceSq = p5.Vector.sub(predicted, projection).magSq();
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearest = projection;
        nearestTangent = segment.normalize();
      }
    }

    if (!nearest) return createVector(0, 0);
    this.lastPathError = Math.sqrt(nearestDistanceSq);
    const target = nearest.copy().add(nearestTangent.copy().mult(lookAhead));
    const alignment = Math.max(0, heading.dot(nearestTangent));
    const cornerSpeed = this.maxSpeed * this.speedFactor * (0.58 + 0.42 * alignment);
    return this.steerTo(target, cornerSpeed);
  }

  steerTo(target, desiredSpeed) {
    const desired = p5.Vector.sub(target, this.pos);
    if (desired.magSq() < 0.001) return createVector(0, 0);
    desired.setMag(desiredSpeed);
    return desired.sub(this.vel).limit(this.maxForce);
  }

  avoidObstacles(obstacles) {
    const heading = this.vel.magSq() > 0.001 ? this.vel.copy().normalize() : createVector(1, 0);
    if (this.avoidanceObstacle) {
      const oldRelative = p5.Vector.sub(this.avoidanceObstacle.pos, this.pos);
      if (!obstacles.includes(this.avoidanceObstacle) || oldRelative.dot(heading) < -this.r) {
        this.avoidanceObstacle = null;
        this.obstacleAvoidanceSide = 0;
      }
    }
    let threat = null;
    for (const obstacle of obstacles) {
      const relative = p5.Vector.sub(obstacle.pos, this.pos);
      const ahead = relative.dot(heading);
      if (ahead < 0 || ahead > this.detectionDistance) continue;
      const lateral = Math.abs(heading.x * relative.y - heading.y * relative.x);
      const clearance = this.r + obstacle.r + this.collisionMargin;
      const continuing = obstacle === this.avoidanceObstacle;
      if (lateral >= clearance && !(continuing && lateral < clearance * 1.8)) continue;
      const approachUrgency = 0.55 + 0.45 * (1 - ahead / this.detectionDistance);
      const lateralUrgency = Math.max(0.25, Math.min(1, (clearance * 1.8 - lateral) / (clearance * 0.8)));
      const urgency = approachUrgency * lateralUrgency;
      if (!threat || ahead < threat.ahead) threat = { obstacle, relative, ahead, lateral, clearance, urgency };
    }
    if (!threat) return { force: createVector(0, 0), urgency: 0 };

    if (this.avoidanceObstacle !== threat.obstacle) {
      this.avoidanceObstacle = threat.obstacle;
      const side = heading.x * threat.relative.y - heading.y * threat.relative.x;
      this.obstacleAvoidanceSide = Math.abs(side) < threat.clearance
        ? (this.carId % 2 ? 1 : -1)
        : Math.sign(side);
    }
    // Rotation opposée au côté où se trouve l'obstacle (le contour reste stable).
    const normal = createVector(heading.y * this.obstacleAvoidanceSide, -heading.x * this.obstacleAvoidanceSide);
    const desiredSpeed = this.maxSpeed * this.speedFactor *
      Math.max(0.55, Math.min(1, 0.55 + 0.45 * threat.ahead / this.detectionDistance));
    const desired = heading.mult(desiredSpeed * 0.35).add(normal.mult(desiredSpeed * 1.25));
    if (desired.magSq() > 0.001) desired.setMag(desiredSpeed);
    return { force: desired.sub(this.vel).limit(this.maxForce), urgency: threat.urgency };
  }

  avoidVehicles(vehicles) {
    const horizon = Math.max(6, this.detectionDistance / Math.max(this.vel.mag(), 1));
    let threat = null;
    for (const other of vehicles) {
      if (other === this) continue;
      const relativePosition = p5.Vector.sub(other.pos, this.pos);
      const relativeVelocity = p5.Vector.sub(other.vel, this.vel);
      const speedSq = relativeVelocity.magSq();
      const time = speedSq > 0.001
        ? Math.max(0, Math.min(horizon, -relativePosition.dot(relativeVelocity) / speedSq))
        : 0;
      const closest = relativePosition.add(relativeVelocity.mult(time));
      const distance = closest.mag();
      const clearance = this.r + other.r + this.collisionMargin;
      if (distance >= clearance + 20) continue;
      const urgency = 0.45 + 0.55 * Math.max(0, Math.min(1, (clearance + 20 - distance) / 20));
      if (!threat || urgency > threat.urgency) threat = { closest, urgency };
    }
    if (!threat) return { force: createVector(0, 0), urgency: 0 };

    const heading = this.vel.magSq() > 0.001 ? this.vel.copy().normalize() : createVector(1, 0);
    let side = heading.x * threat.closest.y - heading.y * threat.closest.x;
    if (Math.abs(side) < 1) side = this.carId % 2 ? 1 : -1;
    const normal = createVector(heading.y * Math.sign(side), -heading.x * Math.sign(side));
    const desiredSpeed = this.maxSpeed * this.speedFactor * 0.65;
    const desired = heading.mult(desiredSpeed * 0.35).add(normal.mult(desiredSpeed * 1.25));
    if (desired.magSq() > 0.001) desired.setMag(desiredSpeed);
    return { force: desired.sub(this.vel).limit(this.maxForce), urgency: threat.urgency };
  }

  render() {
    if (Vehicle.debug && this.vel.magSq() > 0.001) {
      push();
      stroke('#fef08a');
      strokeWeight(2);
      const direction = this.vel.copy().normalize().mult(this.detectionDistance);
      line(this.pos.x, this.pos.y, this.pos.x + direction.x, this.pos.y + direction.y);
      pop();
    }
    push();
    translate(this.pos.x, this.pos.y);
    if (this.vel.magSq() > 0.01) rotate(this.vel.heading());
    noStroke();
    fill(this.couleur);
    // Carrosserie, capot, habitacle et roues sont le rendu d'un seul Vehicle.
    rectMode(CENTER);
    rect(0, 0, 42, 22, 7);
    fill('#f8fafc');
    rect(3, 0, 18, 15, 4);
    fill('#111827');
    rect(-11, -13, 10, 4, 2); rect(11, -13, 10, 4, 2);
    rect(-11, 13, 10, 4, 2); rect(11, 13, 10, 4, 2);
    fill('#fde68a');
    rect(19, -6, 3, 4, 1); rect(19, 6, 3, 4, 1);
    pop();
  }
}
