class Target extends Vehicle {
  constructor(x, y, id = 1) {
    super(x, y);
<<<<<<< HEAD
    this.id = id;
    this.vel = typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.random2D === 'function'
      ? p5.Vector.random2D().mult(typeof random === 'function' ? random(3, 5) : 4)
      : (typeof createVector === 'function' ? createVector(3, 2) : { x: 3, y: 2 });
    this.rayonDetection = 140;
    this.flaresEnabled = true; // Option de largage de leurres (activable / désactivable)
    this.flareCooldown = 220; // Intervalle minimum entre deux largages (ms)
    this.lastFlareTime = -Infinity; // Prêt à larguer immédiatement lors de la première détection
    this.r = 13;
    this.maxSpeed = 7;
    this.maxForce = 0.35;
    this.isAlerted = false;
  }
=======
    this.vel = p5.Vector.random2D();
    this.vel.mult(3 );
>>>>>>> upstream/main

  detects(pursuer) {
    if (!pursuer) return false;
    const d = p5.Vector.dist(this.pos, pursuer.pos);
    return d < this.rayonDetection;
  }

  launchFlare(flaresArray, currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    if (!this.flaresEnabled) return null;
    if (currentTime - this.lastFlareTime < this.flareCooldown) return null;

    // Calcul de la direction arrière (opposée à la vitesse de la cible)
    let backward;
    if (this.vel && this.vel.mag && this.vel.mag() > 0.01) {
      backward = this.vel.copy().normalize().mult(-1);
    } else {
      backward = typeof createVector === 'function' ? createVector(-1, 0) : { x: -1, y: 0 };
    }

    // Positionnement du leurre juste derrière la cible
    const spawnPos = p5.Vector.add(this.pos, p5.Vector.mult(backward, this.r + 5));

    // Vitesse d'éjection arrière avec dispersion angulaire
    const ejectionSpeed = typeof random === 'function' ? random(3, 5) : 4;
    const dispersionAngle = typeof random === 'function' ? random(-0.3, 0.3) : 0;
    const flareVel = backward.copy().mult(ejectionSpeed);
    if (typeof flareVel.rotate === 'function') {
      flareVel.rotate(dispersionAngle);
    }

    const flare = new Flare(spawnPos.x, spawnPos.y, flareVel, currentTime);
    flaresArray.push(flare);
    this.lastFlareTime = currentTime;
    return flare;
  }

  evade(pursuer) {
    if (!pursuer) return typeof createVector === 'function' ? createVector(0, 0) : null;
    const d = p5.Vector.dist(this.pos, pursuer.pos);
    const lookahead = Math.min(d / Math.max(pursuer.maxSpeed || 1, 0.001), 30);
    const futurePursuer = p5.Vector.add(pursuer.pos, p5.Vector.mult(pursuer.vel, lookahead));

    // Vitesse désirée orientée à l'opposé de la position future du poursuiveur
    const desired = p5.Vector.sub(this.pos, futurePursuer);
    desired.setMag(this.maxSpeed);

    const steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  bounceEdges(w = (typeof width !== 'undefined' ? width : 800), h = (typeof height !== 'undefined' ? height : 600)) {
    if (this.pos.x + this.r >= w) {
      this.pos.x = w - this.r;
      this.vel.x = -Math.abs(this.vel.x);
    } else if (this.pos.x - this.r <= 0) {
      this.pos.x = this.r;
      this.vel.x = Math.abs(this.vel.x);
    }

    if (this.pos.y + this.r >= h) {
      this.pos.y = h - this.r;
      this.vel.y = -Math.abs(this.vel.y);
    } else if (this.pos.y - this.r <= 0) {
      this.pos.y = this.r;
      this.vel.y = Math.abs(this.vel.y);
    }
  }

  update() {
    super.update();
    if (typeof width !== 'undefined' && typeof height !== 'undefined') {
      this.bounceEdges();
    }
  }

  show() {
    if (typeof push !== 'function') return;

    push();
    const timeVal = typeof millis === 'function' ? millis() : Date.now();

    // 1. Cercle de détection
    push();
    noFill();
    if (this.isAlerted) {
      // Alerte rouge clignotante lors de la détection du poursuiveur
      const pulse = Math.sin(timeVal * 0.012) * 5;
      stroke(255, 60, 60, 180);
      strokeWeight(1.8);
      circle(this.pos.x, this.pos.y, (this.rayonDetection + pulse) * 2);
    } else {
      // Rayon de détection discret
      stroke(255, 255, 255, 45);
      strokeWeight(1);
      if (typeof drawingContext !== 'undefined' && drawingContext.setLineDash) {
        drawingContext.setLineDash([4, 6]);
      }
      circle(this.pos.x, this.pos.y, this.rayonDetection * 2);
    }
    pop();

    // 2. Corps de la cible (Drone mobile)
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Halo d'énergie
    noStroke();
    if (this.isAlerted) {
      fill(255, 80, 80, 80);
    } else {
      fill(255, 140, 190, 60);
    }
    circle(0, 0, this.r * 2.6);

    // Coque extérieure
    stroke(255);
    strokeWeight(1.5);
    if (this.isAlerted) {
      fill(255, 70, 70);
    } else {
      fill(245, 120, 180);
    }
    circle(0, 0, this.r * 2);

    // Marqueur de direction / nez du drone
    fill(255);
    noStroke();
    triangle(this.r * 0.4, -this.r * 0.45, this.r * 0.4, this.r * 0.45, this.r * 1.1, 0);

    // Numéro de la cible
    rotate(-this.vel.heading()); // Garder le texte droit
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(10);
    textStyle(BOLD);
    text(this.id, 0, 0);

    pop();
  }
}