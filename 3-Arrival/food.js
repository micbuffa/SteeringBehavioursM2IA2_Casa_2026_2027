/**
 * Food — Sous-classe de Vehicle représentant un aliment mobile autonome.
 * Utilise les steering behaviors de Reynolds :
 * - Errance (wander) pour un déplacement autonome fluide et imprévisible
 * - Détection des bords (boundaries) pour rester confiné dans l'arène de jeu
 * - Comportement optionnel de fuite (flee / evade) lorsque le prédateur s'approche
 */
class Food extends Vehicle {
  constructor(x, y, type = 'apple') {
    super(x, y);
    this.r = 11;
    this.type = type;

    // Paramètres de locomotion autonome
    this.maxSpeed = 2.5;
    this.maxForce = 0.15;

    // Paramètres spécifiques au wander (errance)
    this.distanceCercle = 60;
    this.wanderRadius = 28;
    this.wanderTheta = Math.random() * Math.PI * 2;
    this.displaceRange = 0.45;

    // Propriétés visuelles et animations
    this.pulseAngle = Math.random() * Math.PI * 2;
    this.wingAngle = 0;
    this.fleeRadius = 140;
    this.isEvading = false;

    // Couleurs selon le type d'aliment
    this.types = ['apple', 'berry', 'firefly', 'star'];
    this.setType(type);
  }

  /**
   * Définit le type et le profil chromatique de l'aliment
   * @param {string} type - 'apple', 'berry', 'firefly', ou 'star'
   */
  setType(type) {
    this.type = type;
    switch (type) {
      case 'berry':
        this.primaryColor = '#a855f7'; // Violet myrtille
        this.secondaryColor = '#c084fc';
        break;
      case 'firefly':
        this.primaryColor = '#eab308'; // Jaune luciole
        this.secondaryColor = '#fef08a';
        break;
      case 'star':
        this.primaryColor = '#06b6d4'; // Cyan étoile
        this.secondaryColor = '#67e8f9';
        break;
      case 'apple':
      default:
        this.primaryColor = '#ef4444'; // Rouge pomme
        this.secondaryColor = '#f87171';
        break;
    }
  }

  /**
   * Cycle de mise à jour autonome avec les steering behaviors Reynolds
   * @param {p5.Vector} snakeHeadPos - Position de la tête du prédateur
   * @param {boolean} fleeEnabled - Si vrai, fuit le serpent à proximité
   * @param {number} arenaWidth - Largeur de l'arène
   * @param {number} arenaHeight - Hauteur de l'arène
   */
  autonomousUpdate(snakeHeadPos = null, fleeEnabled = false, arenaWidth = width, arenaHeight = height) {
    // 1. Calcul de la force de fuite si activée et prédateur proche
    this.isEvading = false;
    if (fleeEnabled && snakeHeadPos) {
      const distToSnake = p5.Vector.dist(this.pos, snakeHeadPos);
      if (distToSnake < this.fleeRadius && distToSnake > 0.001) {
        this.isEvading = true;
        // Direction de fuite opposée au serpent
        const desired = p5.Vector.sub(this.pos, snakeHeadPos);
        desired.setMag(this.maxSpeed * 1.4);
        const fleeForce = p5.Vector.sub(desired, this.vel);
        fleeForce.limit(this.maxForce * 1.6);
        this.applyForce(fleeForce);
      }
    }

    // 2. Si pas en fuite, application de l'errance autonome (Wander)
    if (!this.isEvading) {
      const wanderForce = this.wander();
      this.applyForce(wanderForce);
    }

    // 3. Répulsion des bords de scène pour rester en jeu (Boundaries)
    const margin = 40;
    const boundForce = this.boundaries(0, 0, arenaWidth, arenaHeight, margin);
    if (boundForce && (boundForce.x !== 0 || boundForce.y !== 0)) {
      this.applyForce(boundForce);
    }

    // Sécurité de confinement d'arène douce
    this.keepInArena(arenaWidth, arenaHeight);

    // 4. Locomotion Reynolds
    this.update();

    // 5. Progression des cycles d'animation
    this.pulseAngle += 0.07;
    this.wingAngle += 0.25;
  }

  /**
   * Maintient l'entité à l'intérieur du rectangle d'arène
   */
  keepInArena(w, h) {
    const pad = this.r * 2;
    if (this.pos.x < pad) {
      this.pos.x = pad;
      this.vel.x = Math.abs(this.vel.x);
    } else if (this.pos.x > w - pad) {
      this.pos.x = w - pad;
      this.vel.x = -Math.abs(this.vel.x);
    }
    if (this.pos.y < pad) {
      this.pos.y = pad;
      this.vel.y = Math.abs(this.vel.y);
    } else if (this.pos.y > h - pad) {
      this.pos.y = h - pad;
      this.vel.y = -Math.abs(this.vel.y);
    }
  }

  /**
   * Repositionne l'aliment à une position aléatoire valide
   */
  respawn(w = width, h = height) {
    const margin = 80;
    this.pos.set(random(margin, w - margin), random(margin, h - margin));
    this.vel = p5.Vector.random2D().mult(random(1, this.maxSpeed));
    this.acc.set(0, 0);
    // Choix aléatoire d'un type d'aliment
    const randType = this.types[Math.floor(random(this.types.length))];
    this.setType(randType);
  }

  /**
   * Rendu graphique animé de l'aliment
   */
  show() {
    push();
    translate(this.pos.x, this.pos.y);

    // Orientation dans la direction du mouvement
    if (this.vel && this.vel.mag() > 0.1) {
      rotate(this.vel.heading());
    }

    // Pulsation lumineuse
    const pulseFactor = 1 + Math.sin(this.pulseAngle) * 0.18;
    const rAnim = this.r * pulseFactor;

    // Halo lumineux extérieur
    noStroke();
    if (this.isEvading) {
      // Halo d'alerte rouge clignotant
      fill(255, 60, 60, 90 + Math.sin(this.pulseAngle * 2) * 50);
      circle(0, 0, rAnim * 3.2);
    } else {
      // Halo doux
      fill(red(color(this.secondaryColor)), green(color(this.secondaryColor)), blue(color(this.secondaryColor)), 55);
      circle(0, 0, rAnim * 2.8);
    }

    // Dessin selon le type
    if (this.type === 'firefly') {
      // Petite luciole avec ailes battantes
      fill(this.primaryColor);
      stroke(255, 255, 255, 180);
      strokeWeight(1);
      circle(0, 0, rAnim * 1.8);

      // Battement d'ailes
      const wingSpan = Math.sin(this.wingAngle) * (rAnim * 1.2);
      stroke(255, 255, 255, 200);
      strokeWeight(1.2);
      line(-rAnim * 0.3, 0, -rAnim * 0.3, wingSpan);
      line(-rAnim * 0.3, 0, -rAnim * 0.3, -wingSpan);
    } else {
      // Fruit/Orbe appétissant
      fill(this.primaryColor);
      stroke(255, 255, 255, 120);
      strokeWeight(1.2);
      circle(0, 0, rAnim * 2);

      // Petite feuille verte au sommet
      fill(34, 197, 94);
      noStroke();
      ellipse(-rAnim * 0.4, -rAnim * 0.7, rAnim * 0.7, rAnim * 0.4);

      // Éclat brillant
      fill(255, 255, 255, 200);
      circle(rAnim * 0.35, -rAnim * 0.35, rAnim * 0.5);
    }

    // Visualisation de détection en mode Debug
    if (Vehicle.debug) {
      noFill();
      stroke(this.isEvading ? color(255, 0, 0, 180) : color(255, 255, 0, 120));
      strokeWeight(1);
      circle(0, 0, this.fleeRadius * 2);
    }

    pop();
  }
}
