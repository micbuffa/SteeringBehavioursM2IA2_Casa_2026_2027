// Cible autonome se déplaçant automatiquement et bouclant continuellement sur les bords.
// Conforme à AGENTS.md : toute entité visible étend Vehicle.
class Target extends Vehicle {
  constructor(x, y, speed = 3) {
    super(x, y);
<<<<<<< HEAD
    this.r = 16;
    this.color = 'red';
    this.baseSpeed = speed;
    this.maxSpeed = speed;

    // Zone d'alerte de 250px et boost temporaire de vitesse
    this.alertRadius = 250;
    this.alertEnabled = true;
    this.boostSpeed = 8;
    this.boostDuration = 1500; // ms (entre 1s et 2s, 1.5s par défaut)
    this.isBoosted = false;
    this.boostEndTime = 0;
    this.cooldownEndTime = 0;
    this.cooldownDuration = 500; // délai après réinitialisation pour lisibilité

    // Vitesse autonome initiale
    if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.random2D === 'function') {
      this.vel = p5.Vector.random2D();
      this.vel.setMag(speed);
    } else if (typeof createVector === 'function') {
      this.vel = createVector(speed, 0);
    }
  }

  setAlertEnabled(enabled) {
    this.alertEnabled = Boolean(enabled);
    if (!this.alertEnabled && this.isBoosted) {
      this.resetSpeed();
    }
  }

  setBoostDuration(ms) {
    const val = Number(ms);
    if (!Number.isNaN(val) && val > 0) {
      this.boostDuration = val;
    }
  }

  setBoostSpeed(speed) {
    const val = Number(speed);
    if (!Number.isNaN(val) && val > 0) {
      this.boostSpeed = val;
    }
  }

  boost(currentTime = (typeof millis === 'function' ? millis() : Date.now()), intruder = null) {
    this.isBoosted = true;
    this.boostEndTime = currentTime + this.boostDuration;
    this.maxSpeed = this.boostSpeed;

    // Si un intrus est détecté, orienter la vitesse à l'opposé pour une manœuvre d'évasion vive
    if (intruder && intruder.pos) {
      let escapeDir;
      if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.sub === 'function') {
        escapeDir = p5.Vector.sub(this.pos, intruder.pos);
      } else if (typeof createVector === 'function') {
        escapeDir = createVector(this.pos.x - intruder.pos.x, this.pos.y - intruder.pos.y);
      }
      if (escapeDir && (escapeDir.x !== 0 || escapeDir.y !== 0)) {
        escapeDir.setMag(this.boostSpeed);
        this.vel = escapeDir;
        return;
      }
    }

    if (this.vel && typeof this.vel.setMag === 'function') {
      if (this.vel.mag() === 0) {
        this.vel.set(this.boostSpeed, 0);
      } else {
        this.vel.setMag(this.boostSpeed);
      }
    }
  }

  resetSpeed() {
    this.isBoosted = false;
    this.maxSpeed = this.baseSpeed;
    if (this.vel && typeof this.vel.setMag === 'function') {
      if (this.vel.mag() === 0) {
        this.vel.set(this.baseSpeed, 0);
      } else {
        this.vel.setMag(this.baseSpeed);
      }
    }
  }

  checkAlert(vehicles, currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    if (!this.alertEnabled) {
      if (this.isBoosted) this.resetSpeed();
      return false;
    }

    // Si le boost est en cours, vérifier si la durée (1s à 2s) est écoulée
    if (this.isBoosted) {
      if (currentTime >= this.boostEndTime) {
        this.resetSpeed();
        this.cooldownEndTime = currentTime + this.cooldownDuration;
      }
      return this.isBoosted;
    }

    // Cooldown après réinitialisation
    if (currentTime < this.cooldownEndTime) {
      return false;
    }

    // Détection de tout vaisseau touchant ou pénétrant le cercle de rayon 250px
    let nearestIntruder = null;
    let minDistanceSq = Infinity;
    const radiusSq = this.alertRadius * this.alertRadius;

    if (Array.isArray(vehicles)) {
      for (const vehicle of vehicles) {
        if (!vehicle || !vehicle.pos) continue;
        const dx = vehicle.pos.x - this.pos.x;
        const dy = vehicle.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= radiusSq) {
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            nearestIntruder = vehicle;
          }
        }
      }
    }

    if (nearestIntruder) {
      this.boost(currentTime, nearestIntruder);
      return true;
    }

    return false;
  }

  update(currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    if (this.isBoosted && currentTime >= this.boostEndTime) {
      this.resetSpeed();
      this.cooldownEndTime = currentTime + this.cooldownDuration;
    }
    super.update();
    this.edges();
  }

  // Tâche 10 - Variante B : repositionnement aléatoire de la cible lorsqu'elle est atteinte
  respawn(w, h, rng = Math.random) {
    const margin = this.r * 2;
    const minW = Math.max(0, w - margin * 2);
    const minH = Math.max(0, h - margin * 2);
    const x = margin + rng() * minW;
    const y = margin + rng() * minH;
    this.pos.set(x, y);
  }

  drawAlertCircle() {
    if (typeof push !== 'function' || typeof pop !== 'function' || typeof circle !== 'function') {
      return;
    }

    push();
    const isAlert = this.isBoosted;
    const now = typeof millis === 'function' ? millis() : Date.now();

    // Rendu visuel net, clair et contrasté pour la présentation au professeur
    if (isAlert) {
      fill(255, 50, 50, 40);
      stroke(255, 65, 65, 240);
      strokeWeight(3.5);
    } else {
      fill(0, 210, 255, 25);
      stroke(0, 230, 255, 220);
      strokeWeight(2.5);
    }

    // Cercle principal de rayon 250px (diamètre 500px)
    circle(this.pos.x, this.pos.y, this.alertRadius * 2);

    // Onde de pulsation en mode alerte
    if (isAlert) {
      const pulse = typeof sin === 'function' ? sin(now * 0.015) * 6 : 0;
      stroke(255, 140, 0, 160);
      strokeWeight(1.5);
      noFill();
      circle(this.pos.x, this.pos.y, (this.alertRadius + pulse) * 2);
    }

    // Tracé explicite du rayon (segment du centre jusqu'au bord) avec repère visuel
    const angle = -Math.PI / 6;
    const edgeX = this.pos.x + Math.cos(angle) * this.alertRadius;
    const edgeY = this.pos.y + Math.sin(angle) * this.alertRadius;

    stroke(isAlert ? 'rgba(255, 90, 90, 0.95)' : 'rgba(0, 230, 255, 0.95)');
    strokeWeight(2);
    line(this.pos.x, this.pos.y, edgeX, edgeY);

    fill(isAlert ? '#ff4040' : '#00e5ff');
    noStroke();
    circle(edgeX, edgeY, 7);

    // Étiquettes explicatives claires
    if (typeof text === 'function' && typeof textWidth === 'function') {
      const midX = (this.pos.x + edgeX) / 2;
      const midY = (this.pos.y + edgeY) / 2 - 10;
      const radiusLabel = 'R = 250 px';

      rectMode(CENTER);
      fill(18, 22, 30, 210);
      stroke(isAlert ? 'rgba(255, 80, 80, 0.85)' : 'rgba(0, 220, 255, 0.85)');
      strokeWeight(1);
      rect(midX, midY, textWidth(radiusLabel) + 14, 18, 4);

      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(11);
      textStyle(BOLD);
      text(radiusLabel, midX, midY);

      // Badge d'état au-dessus du cercle de 250px
      const remainingSec = Math.max(0, (this.boostEndTime - now) / 1000).toFixed(1);
      const statusText = isAlert
        ? `⚠️ ALERTE INTRUSION ! Vitesse boostée : ${this.boostSpeed} px/f (${remainingSec}s)`
        : `🛡️ Zone de détection : 250 px | Vitesse : ${this.baseSpeed} px/f`;

      const badgeY = this.pos.y - this.alertRadius - 16;
      const badgeW = textWidth(statusText) + 18;
      fill(isAlert ? 'rgba(60, 12, 12, 0.92)' : 'rgba(15, 25, 40, 0.92)');
      stroke(isAlert ? '#ff4040' : '#00e5ff');
      strokeWeight(1.5);
      rect(this.pos.x, badgeY, badgeW, 22, 6);

      fill(isAlert ? '#ff8080' : '#66f0ff');
      noStroke();
      textSize(12);
      text(statusText, this.pos.x, badgeY);
    }

    pop();
=======
    this.r = 100;
    this.color = 'red';
    this.vel = p5.Vector.random2D().setMag(random(1, 6));
    this.normalHeading = this.vel.heading();
    this.appearanceElapsedMs = 0;
  }

  advanceAppearance(deltaMilliseconds) {
    const elapsed = Number(deltaMilliseconds);
    this.appearanceElapsedMs += Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
    if (this.appearanceElapsedMs >= 1000) {
      this.appearanceElapsedMs %= 1000;
      this.normalHeading = random(-Math.PI, Math.PI);
      this.r = random(20, 50);
      this.color = color(random(255), random(255), random(255));
    }
  }

  applyNormalSteering() {
    this.normalHeading += random(-0.2, 0.2);
    const destination = this.pos.copy().add(createVector(
      Math.cos(this.normalHeading) * 100, Math.sin(this.normalHeading) * 100
    ));
    this.applyForce(super.seek(destination));
  }

  integrate() { super.update(); }

  update(deltaMilliseconds = 1000 / 60) {
    this.advanceAppearance(deltaMilliseconds);
    this.applyNormalSteering();
    this.integrate();
>>>>>>> upstream/main
  }

  show() {
    push();
<<<<<<< HEAD

    // Rendu du cercle d'alerte de 250px si activé
    if (this.alertEnabled) {
      this.drawAlertCircle();
    }

    // Rendu de la cible (disque rouge)
    fill(this.color);
    noStroke();
    circle(this.pos.x, this.pos.y, this.r * 2);

    // Halo lumineux en alerte
    if (this.isBoosted) {
      stroke(255, 210, 50, 200);
      strokeWeight(3);
      noFill();
      circle(this.pos.x, this.pos.y, this.r * 2 + 6);
    }

=======
    fill(this.color);
    noStroke();
    circle(this.pos.x, this.pos.y, this.r * 2);
>>>>>>> upstream/main
    pop();
  }
}
