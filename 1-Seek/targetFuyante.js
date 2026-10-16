// targetFuyante.js — Sous-classe de Vehicle (via Target) représentant une cible fuyante
// Conforme à AGENTS.md : toute entité visible étend Vehicle et utilise les steering behaviors.
// Craig W. Reynolds (1999) : Action selection (détection/fuite) -> Steering (flee) -> Locomotion (applyForce, update).

class TargetFuyante extends Target {
  constructor(x, y, speed = 3, detectionRadius = 200, escapeRadius = 300, maxFleeDuration = 2.5) {
    super(x, y, speed);

    // Désactivation du cercle d'alerte historique de Target pour utiliser le comportement de fuite
    this.alertEnabled = false;

    // Rayons de détection et d'échappatoire (hystérésis)
    this.detectionRadius = Number(detectionRadius) || 200; // Rayon de détection (200 px par défaut)
    this.escapeRadius = Number(escapeRadius) || 300;       // Distance pour cesser de fuir (300 px par défaut)

    // Endurance (durée maximale de fuite consécutive)
    this.maxFleeDuration = Number(maxFleeDuration) || 2.5; // en secondes (2,5s par défaut)
    this.stamina = this.maxFleeDuration;
    this.staminaRecoveryRate = 0.5; // Taux de récupération de l'endurance au repos (0.5s par sec)

    // Paramètres cinématiques de base et de fuite
    this.baseSpeed = speed;
    this.fleeSpeed = speed * 2; // Vitesse augmentée pendant la fuite (ex: 6 px/f)
    this.baseForce = 0.1;
    this.fleeForce = 0.4;       // Accélération accrue pendant la fuite

    this.maxSpeed = this.baseSpeed;
    this.maxForce = this.baseForce;

    // États internes
    this.isFleeing = false;
    this.hasIntruder = false;
    this.nearestPredator = null;
    this.nearestDistance = Infinity;

    // Mode debug (cercle de détection visible avec la touche 'd')
    this.debug = false;
  }

  setDetectionRadius(r) {
    const val = Number(r);
    if (!Number.isNaN(val) && val > 0) {
      this.detectionRadius = val;
    }
  }

  setMaxFleeDuration(sec) {
    const val = Number(sec);
    if (!Number.isNaN(val) && val > 0) {
      this.maxFleeDuration = val;
      this.stamina = Math.min(this.stamina, this.maxFleeDuration);
    }
  }

  setEscapeRadius(r) {
    const val = Number(r);
    if (!Number.isNaN(val) && val > 0) {
      this.escapeRadius = val;
    }
  }

  setDebug(enabled) {
    this.debug = Boolean(enabled);
  }

  toggleDebug() {
    this.debug = !this.debug;
    return this.debug;
  }

  // Recherche du prédateur (vaisseau) le plus proche
  getNearestVehicle(vehicles) {
    if (!Array.isArray(vehicles) || vehicles.length === 0) return null;
    let nearest = null;
    let minDistSq = Infinity;
    for (const v of vehicles) {
      if (!v || !v.pos) continue;
      const dx = v.pos.x - this.pos.x;
      const dy = v.pos.y - this.pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearest = v;
      }
    }
    return nearest ? { vehicle: nearest, distance: Math.sqrt(minDistSq) } : null;
  }

  // Utilisation de la méthode héritée flee() avec prise en charge d'un Vehicle ou d'un Vector
  flee(target) {
    const targetPos = (target && target.pos) ? target.pos : target;
    return super.flee(targetPos);
  }

  // Sélection d'action et calcul de pilotage (Reynolds 1999)
  applyBehaviors(vehicles, dt = (typeof deltaTime !== 'undefined' && deltaTime > 0 ? deltaTime / 1000 : 1 / 60)) {
    const nearest = this.getNearestVehicle(vehicles);

    if (nearest && nearest.vehicle) {
      this.nearestPredator = nearest.vehicle;
      this.nearestDistance = nearest.distance;
      this.hasIntruder = (this.nearestDistance <= this.detectionRadius);

      if (this.isFleeing) {
        // Fuite en cours : continue jusqu'à être à 300 px ou épuisement de l'endurance
        if (this.stamina <= 0 || this.nearestDistance >= this.escapeRadius) {
          this.isFleeing = false;
        }
      } else {
        // En attente : déclenche la fuite dès l'entrée dans le cercle de détection si endurance disponible
        if (this.hasIntruder && this.stamina > 0) {
          this.isFleeing = true;
        }
      }
    } else {
      this.nearestPredator = null;
      this.nearestDistance = Infinity;
      this.hasIntruder = false;
      this.isFleeing = false;
    }

    if (this.isFleeing && this.nearestPredator) {
      // 1. Décrémentation de l'endurance
      this.stamina = Math.max(0, this.stamina - dt);
      if (this.stamina <= 0) {
        this.isFleeing = false;
        this.maxSpeed = this.baseSpeed;
        this.maxForce = this.baseForce;
      } else {
        // 2. Accélération et augmentation de vitesse
        this.maxSpeed = this.fleeSpeed;
        this.maxForce = this.fleeForce;

        // 3. Force de fuite calculée via la méthode héritée flee()
        const fleeForce = this.flee(this.nearestPredator.pos);
        this.applyForce(fleeForce);
      }
    } else {
      // 4. Reprise du comportement normal (celui de Target par défaut)
      if (this.stamina < this.maxFleeDuration) {
        this.stamina = Math.min(this.maxFleeDuration, this.stamina + dt * this.staminaRecoveryRate);
      }

      this.maxSpeed = this.baseSpeed;
      this.maxForce = this.baseForce;

      // Vitesse autonome de Target préservée à baseSpeed
      if (this.vel && typeof this.vel.mag === 'function') {
        if (this.vel.mag() === 0) {
          if (typeof p5 !== 'undefined' && p5.Vector && typeof p5.Vector.random2D === 'function') {
            this.vel = p5.Vector.random2D().setMag(this.baseSpeed);
          } else if (typeof createVector === 'function') {
            this.vel = createVector(this.baseSpeed, 0);
          }
        } else if (this.vel.mag() > this.baseSpeed) {
          this.vel.limit(this.baseSpeed);
        }
      }
    }
  }

  update() {
    super.update(); // Locomotion standard : vel += acc, vel.limit, pos += vel, acc = 0
    this.edges();   // Rebouclage torique
  }

  respawn(w, h, rng = Math.random) {
    super.respawn(w, h, rng);
    this.isFleeing = false;
    this.stamina = this.maxFleeDuration;
  }

  // Rendu du cercle de détection (uniquement en mode debug)
  drawDetectionCircle() {
    if (typeof push !== 'function' || typeof circle !== 'function') return;
    push();
    strokeWeight(2.5);
    if (this.hasIntruder) {
      // Rouge quand un vaisseau est à l'intérieur
      stroke(255, 60, 60, 230);
      fill(255, 60, 60, 45);
    } else {
      // Jaune par défaut
      stroke(255, 220, 0, 230);
      fill(255, 220, 0, 35);
    }
    circle(this.pos.x, this.pos.y, this.detectionRadius * 2);

    // Repère visuel du rayon de fuite (300px) en pointillés discrets
    if (typeof drawingContext !== 'undefined' && drawingContext.setLineDash) {
      drawingContext.setLineDash([4, 6]);
      stroke(100, 200, 255, 120);
      strokeWeight(1);
      noFill();
      circle(this.pos.x, this.pos.y, this.escapeRadius * 2);
      drawingContext.setLineDash([]);
    }
    pop();
  }

  // Rendu de la barre d'endurance au-dessus de la cible
  drawStaminaBar() {
    if (typeof push !== 'function' || typeof rect !== 'function') return;
    push();
    const barW = 44;
    const barH = 6;
    const x = this.pos.x - barW / 2;
    const y = this.pos.y - this.r - 12;
    const ratio = Math.max(0, Math.min(1, this.stamina / this.maxFleeDuration));

    if (typeof rectMode === 'function' && typeof CORNER !== 'undefined') {
      rectMode(CORNER);
    }
    stroke(20, 24, 30, 220);
    strokeWeight(1.5);
    fill(15, 18, 22, 190);
    rect(x, y, barW, barH, 3);

    // Couleur selon l'endurance restante
    noStroke();
    if (ratio > 0.5) {
      fill(46, 204, 113); // Vert
    } else if (ratio > 0.2) {
      fill(243, 156, 18); // Jaune / Orange
    } else {
      fill(231, 76, 60);  // Rouge
    }

    const fillW = Math.max(0, (barW - 2) * ratio);
    if (fillW > 0) {
      rect(x + 1, y + 1, fillW, barH - 2, 2);
    }
    pop();
  }

  show() {
    push();
    // 1. Cercle de détection uniquement en mode debug
    if (this.debug) {
      this.drawDetectionCircle();
    }

    // 2. Disque de la cible
    fill(this.color);
    stroke(255);
    strokeWeight(1.5);
    circle(this.pos.x, this.pos.y, this.r * 2);

    // 3. Effet visuel pendant la fuite (halo d'accélération)
    if (this.isFleeing) {
      stroke(255, 140, 0, 200);
      strokeWeight(2.5);
      noFill();
      circle(this.pos.x, this.pos.y, this.r * 2 + 6);
    }

    // 4. Barre d'endurance au-dessus de la cible
    this.drawStaminaBar();
    pop();
  }
}
