class Pursuer extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 9;
    this.maxForce = 0.35;
    this.r = 16;
    this.trail = [];
    this.maxTrailLength = 40;
    this.predictionSteps = 55;
    this.currentTarget = null;
  }

  findClosestTarget(targets) {
    if (!targets || targets.length === 0) return null;
    let closest = null;
    let minDist = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t) continue;
      const d = p5.Vector.dist(this.pos, t.pos);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }
    return closest;
  }

  predictInterceptionPoint(target) {
    if (!target) return this.pos.copy();
    const d = p5.Vector.dist(this.pos, target.pos);
    const lookahead = Math.min(d / Math.max(this.maxSpeed, 0.001), 35);
    return p5.Vector.add(target.pos, p5.Vector.mult(target.vel, lookahead));
  }

  calculatePursuitForce(target) {
    if (!target) return createVector(0, 0);
    const intercept = this.predictInterceptionPoint(target);
    return this.seek(intercept);
  }

  predictTrajectory(target, steps = this.predictionSteps) {
    const points = [];
    if (!target) return points;

    let vPos = this.pos.copy();
    let vVel = this.vel.copy();
    let tPos = target.pos.copy();
    let tVel = target.vel.copy();

    for (let i = 0; i < steps; i++) {
      const d = p5.Vector.dist(vPos, tPos);
      const lookahead = Math.min(d / Math.max(this.maxSpeed, 0.001), 35);
      const futureTarget = p5.Vector.add(tPos, p5.Vector.mult(tVel, lookahead));

      const desired = p5.Vector.sub(futureTarget, vPos);
      desired.setMag(this.maxSpeed);
      const steer = p5.Vector.sub(desired, vVel);
      steer.limit(this.maxForce);

      vVel.add(steer);
      vVel.limit(this.maxSpeed);
      vPos.add(vVel);

      tPos.add(tVel);

      points.push({
        x: vPos.x,
        y: vPos.y,
        step: i + 1,
        interceptionDistance: d
      });

      if (d < this.r + target.r) {
        break;
      }
    }
    return points;
  }

  pursueClosest(targets) {
    this.currentTarget = this.findClosestTarget(targets);
    if (this.currentTarget) {
      const force = this.calculatePursuitForce(this.currentTarget);
      this.applyForce(force);
      return force;
    }
    return createVector(0, 0);
  }

  update() {
    if (typeof createVector === 'function') {
      this.trail.push(this.pos.copy());
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }
    }
    super.update();
  }

  show() {
    if (typeof push !== 'function') return;

    if (this.currentTarget) {
      this.drawTrajectoryPrecision(this.currentTarget);
    }
    this.drawTrail();

    // Dessin du vaisseau poursuiveur
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Ailes delta
    stroke(0, 230, 255);
    strokeWeight(2);
    fill(18, 30, 48);

    beginShape();
    vertex(this.r * 1.4, 0);
    vertex(-this.r * 0.9, -this.r * 0.85);
    vertex(-this.r * 0.5, 0);
    vertex(-this.r * 0.9, this.r * 0.85);
    endShape(CLOSE);

    // Verrière lumineuse
    noStroke();
    fill(0, 255, 200, 230);
    ellipse(this.r * 0.25, 0, this.r * 0.65, this.r * 0.35);

    // Flamme réacteur
    fill(0, 190, 255, 220);
    triangle(
      -this.r * 0.55, -this.r * 0.25,
      -this.r * 0.55, this.r * 0.25,
      -this.r * (1.1 + Math.random() * 0.4), 0
    );
    pop();
  }

  drawTrail() {
    if (this.trail.length < 2) return;
    push();
    noFill();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = (i / this.trail.length) * 110;
      stroke(0, 220, 255, alpha);
      strokeWeight(map(i, 0, this.trail.length, 1, 2.5));
      line(this.trail[i].x, this.trail[i].y, this.trail[i + 1].x, this.trail[i + 1].y);
    }
    pop();
  }

  drawTrajectoryPrecision(target) {
    const points = this.predictTrajectory(target, this.predictionSteps);
    if (points.length === 0) return;

    const intercept = this.predictInterceptionPoint(target);

    push();
    // 1. Trajectoire prédictive fluide à haute précision
    noFill();
    for (let i = 0; i < points.length - 1; i++) {
      const ratio = i / points.length;
      stroke(0, 255, 180, 220 - ratio * 120);
      strokeWeight(2.5 - ratio * 1.2);
      line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);

      // Points de mesure de haute précision à intervalles réguliers
      if (i % 5 === 0) {
        fill(0, 255, 200, 240);
        noStroke();
        circle(points[i].x, points[i].y, 3.5);
        noFill();
      }
    }

    if (points.length > 0) {
      stroke(0, 255, 200, 230);
      strokeWeight(2.5);
      line(this.pos.x, this.pos.y, points[0].x, points[0].y);
    }

    // 2. Réticule d'interception haute précision
    const timeVal = typeof millis === 'function' ? millis() : Date.now();
    const reticleSize = 13 + Math.sin(timeVal * 0.008) * 3;
    stroke(0, 255, 120, 220);
    strokeWeight(1.5);
    noFill();
    circle(intercept.x, intercept.y, reticleSize * 2);

    line(intercept.x - reticleSize - 4, intercept.y, intercept.x - reticleSize + 2, intercept.y);
    line(intercept.x + reticleSize - 2, intercept.y, intercept.x + reticleSize + 4, intercept.y);
    line(intercept.x, intercept.y - reticleSize - 4, intercept.x, intercept.y - reticleSize + 2);
    line(intercept.x, intercept.y + reticleSize - 2, intercept.x, intercept.y + reticleSize + 4);

    // Ligne pointillée liant la cible au point d'interception
    if (typeof drawingContext !== 'undefined' && drawingContext.setLineDash) {
      stroke(255, 80, 80, 150);
      strokeWeight(1.2);
      drawingContext.setLineDash([4, 4]);
      line(target.pos.x, target.pos.y, intercept.x, intercept.y);
      drawingContext.setLineDash([]);
    }

    // Annotation HUD de guidage
    fill(0, 255, 200, 200);
    noStroke();
    textSize(10);
    textAlign(LEFT, CENTER);
    text(`INTERCEPT [${Math.round(intercept.x)}, ${Math.round(intercept.y)}]`, intercept.x + 16, intercept.y - 6);
    pop();
  }
}
