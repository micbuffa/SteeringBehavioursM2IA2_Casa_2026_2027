/**
 * Snake — Organisme complet de serpent, sous-classe de Vehicle.
 * Orchestre la tête (SnakeHead) et la chaîne d'anneaux (SnakeSegment).
 * Implémente la croissance progressive : lorsqu'un aliment est mangé,
 * de nouveaux anneaux sont ajoutés progressivement avec une onde de digestion
 * qui ondule de la tête à la queue.
 */
class Snake extends Vehicle {
  constructor(x, y, initialLength = 12, size = 16, color = '#22c55e') {
    super(x, y);
    this.r = size;
    this.baseRadius = size;
    this.color = color;

    // Création de la tête (sous-classe de Vehicle)
    this.head = new SnakeHead(x, y, this.r * 1.15, this.color);

    // Synchronisation de la position et vitesse de l'organisme avec sa tête
    this.pos = this.head.pos;
    this.vel = this.head.vel;
    this.acc = this.head.acc;

    // Chaîne d'anneaux du corps
    this.segments = [];
    this.segmentSpacing = this.r * 1.05;

    // File d'attente de croissance progressive
    this.pendingGrowth = 0;
    this.growthTimer = 0;
    this.growthInterval = 4; // Ajout progressif d'un anneau toutes les 4 frames

    // Ondes de digestion en transit le long du corps
    this.digestionWaves = [];

    // Score / aliments mangés
    this.score = 0;

    // Initialisation des anneaux initiaux
    this.initSegments(initialLength);
  }

  /**
   * Initialise les anneaux du corps derrière la tête
   * @param {number} count - Nombre initial d'anneaux
   */
  initSegments(count) {
    this.segments = [];
    for (let i = 1; i <= count; i++) {
      const segX = this.head.pos.x - i * this.segmentSpacing;
      const segY = this.head.pos.y;
      const seg = new SnakeSegment(segX, segY, this.r * 0.9, this.color);
      seg.scaleFactor = 1.0; // Anneaux initiaux immédiatement à taille pleine
      this.segments.push(seg);
    }
  }

  /**
   * Met à jour dynamiquement la vitesse maximale du serpent et de ses anneaux
   * @param {number} speed - Vitesse maximale souhaitée
   */
  setSpeed(speed) {
    this.maxSpeed = speed;
    this.head.maxSpeed = speed;
    const segmentSpeed = Math.max(speed * 1.4, 6);
    for (const seg of this.segments) {
      seg.maxSpeed = segmentSpeed;
    }
  }

  /**
   * Met à jour dynamiquement la force maximale du serpent
   * @param {number} force - Force maximale de virage
   */
  setForce(force) {
    this.maxForce = force;
    this.head.maxForce = force;
    const segmentForce = Math.max(force * 1.4, 0.4);
    for (const seg of this.segments) {
      seg.maxForce = segmentForce;
    }
  }

  /**
   * Met à jour dynamiquement la taille du corps et des anneaux
   * @param {number} size - Rayon de base
   */
  setSize(size) {
    this.r = size;
    this.head.r = size * 1.15;
    this.segmentSpacing = size * 1.05;
    for (const seg of this.segments) {
      seg.r = size * 0.9;
      seg.baseRadius = size * 0.9;
    }
  }

  /**
   * Règle le rayon de la zone de freinage pour l'arrivée Reynolds
   * @param {number} radius - Rayon en pixels
   */
  setBrakingRadius(radius) {
    this.rayonZoneDeFreinage = radius;
    this.head.rayonZoneDeFreinage = radius;
  }

  /**
   * Déplace le serpent vers la cible et propage le mouvement le long du corps
   * @param {p5.Vector} targetPos - Position cible (souris ou aliment)
   * @param {boolean} arrival - Utiliser ou non le comportement d'arrivée
   * @param {number} nearestFoodDist - Distance à la nourriture pour l'animation
   */
  move(targetPos, arrival = true, nearestFoodDist = Infinity) {
    // 1. Déplacement de la tête par pilotage Reynolds
    this.head.steerTowards(targetPos, arrival);
    this.pos = this.head.pos;
    this.vel = this.head.vel;

    // Mise à jour des animations faciales
    this.head.updateAnimations(nearestFoodDist);

    // 2. Propagation du mouvement anneau par anneau
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const cibleAnneau = i === 0 ? this.head.pos : this.segments[i - 1].pos;
      seg.follow(cibleAnneau, this.segmentSpacing);
    }

    // 3. Gestion de la croissance progressive
    this.updateProgressiveGrowth();

    // 4. Gestion de la propagation des ondes digestives
    this.updateDigestionWaves();
  }

  /**
   * Ajoute progressivement de nouveaux anneaux si une croissance est en attente
   */
  updateProgressiveGrowth() {
    if (this.pendingGrowth > 0) {
      this.growthTimer++;
      if (this.growthTimer >= this.growthInterval) {
        this.growthTimer = 0;
        this.pendingGrowth--;

        // Position d'apparition à la queue du serpent
        const lastSeg = this.segments[this.segments.length - 1];
        const newX = lastSeg ? lastSeg.pos.x : this.head.pos.x;
        const newY = lastSeg ? lastSeg.pos.y : this.head.pos.y;

        const newSeg = new SnakeSegment(newX, newY, this.r * 0.9, this.color);
        newSeg.scaleFactor = 0.15; // Naît petit et grandit progressivement
        newSeg.maxSpeed = Math.max(this.head.maxSpeed * 1.4, 6);
        newSeg.maxForce = Math.max(this.head.maxForce * 1.4, 0.4);
        this.segments.push(newSeg);
      }
    }
  }

  /**
   * Propage les ondes de gonflement digestif de la tête jusqu'au bout de la queue
   */
  updateDigestionWaves() {
    for (let w = this.digestionWaves.length - 1; w >= 0; w--) {
      const wave = this.digestionWaves[w];
      wave.stepCounter++;

      // Toutes les 2 frames, l'onde avance à l'anneau suivant
      if (wave.stepCounter % 2 === 0) {
        wave.segmentIndex++;
      }

      if (wave.segmentIndex < this.segments.length) {
        this.segments[wave.segmentIndex].pulse(0.65);
      } else {
        // L'onde a traversé toute la queue, on la supprime
        this.digestionWaves.splice(w, 1);
      }
    }
  }

  /**
   * Tente de manger un aliment s'il est en contact avec la tête
   * @param {Food} food - Entité nourriture
   * @param {number} growthAmount - Nombre d'anneaux à faire pousser
   * @returns {boolean} Vrai si l'aliment a été mangé
   */
  eat(food, growthAmount = 3) {
    if (!food) return false;
    const distance = p5.Vector.dist(this.head.pos, food.pos);
    const contactDistance = this.head.r + food.r;

    if (distance <= contactDistance) {
      // Déclenche l'animation de mâchoire/déglutition sur la tête
      this.head.triggerEat();

      // Enfile la croissance progressive
      this.pendingGrowth += growthAmount;

      // Déclenche une onde digestive
      this.digestionWaves.push({ segmentIndex: 0, stepCounter: 0 });

      // Augmente le score
      this.score++;

      return true;
    }
    return false;
  }

  /**
   * Rendu complet du serpent : de la queue vers la tête pour superposition correcte
   * @param {p5.Vector} targetPos - Position cible pour les yeux
   */
  show(targetPos = null) {
    // 1. Dessin des anneaux du corps (de l'arrière vers l'avant)
    const total = this.segments.length;
    for (let i = total - 1; i >= 0; i--) {
      this.segments[i].show(i + 1, total);
    }

    // 2. Dessin de la tête en premier plan
    this.head.show(targetPos);
  }
}
