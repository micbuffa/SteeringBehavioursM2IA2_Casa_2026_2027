/**
 * SnakeSegment — Sous-classe de Vehicle représentant un anneau du corps du serpent.
 * Chaque anneau utilise le steering behavior "arrive" pour suivre l'anneau précédent
 * à une distance cible prescrite, respectant maxForce et la locomotion Reynolds.
 */
class SnakeSegment extends Vehicle {
  constructor(x, y, r = 14, segmentColor = '#22c55e') {
    super(x, y);
    this.r = r;
    this.baseRadius = r;
    this.segmentColor = segmentColor;

    // Paramètres de locomotion adaptés au suivi fluide du corps
    this.maxSpeed = 8;
    this.maxForce = 0.5;
    this.rayonZoneDeFreinage = 50;

    // Facteur d'échelle pour l'animation de croissance progressive
    this.scaleFactor = 0.1;
    this.targetScale = 1.0;

    // Amplitude de l'onde de digestion (gonflement temporaire)
    this.digestionPulse = 0;
  }

  /**
   * Suit la position cible (l'anneau précédent ou la tête) avec le comportement d'arrivée
   * @param {p5.Vector} targetPos - Position de l'anneau précédent
   * @param {number} desiredDistance - Distance souhaitée derrière la cible
   */
  follow(targetPos, desiredDistance = 20) {
    const steering = this.arrive(targetPos, desiredDistance);
    this.applyForce(steering);
    this.update();
    this.updateGrowth();
  }

  /**
   * Met à jour les animations d'échelle progressive et d'onde digestive
   */
  updateGrowth() {
    // Croissance progressive douce vers la taille normale
    if (this.scaleFactor < this.targetScale) {
      this.scaleFactor += (this.targetScale - this.scaleFactor) * 0.15;
      if (Math.abs(this.targetScale - this.scaleFactor) < 0.01) {
        this.scaleFactor = this.targetScale;
      }
    }

    // Amortissement de l'onde de digestion
    if (this.digestionPulse > 0.01) {
      this.digestionPulse *= 0.88;
    } else {
      this.digestionPulse = 0;
    }
  }

  /**
   * Déclenche une pulsation digestive sur cet anneau
   * @param {number} intensity - Amplitude du gonflement
   */
  pulse(intensity = 0.5) {
    this.digestionPulse = intensity;
  }

  /**
   * Affichage graphique de l'anneau avec dégradé et détails
   * @param {number} index - Index de l'anneau dans le corps
   * @param {number} totalSegments - Nombre total d'anneaux
   */
  show(index = 1, totalSegments = 10) {
    push();
    translate(this.pos.x, this.pos.y);

    if (this.vel && this.vel.mag() > 0.1) {
      rotate(this.vel.heading());
    }

    // Calcul du rayon effectif avec échelle de croissance et impulsion digestive
    const currentR = this.r * this.scaleFactor * (1 + this.digestionPulse * 0.4);

    // Dégradé de couleur vers la queue (plus sombre vers l'extrémité)
    const factor = totalSegments > 1 ? index / totalSegments : 0;
    const baseCol = color(this.segmentColor);
    const tailCol = color(10, 80, 30);
    const c = lerpColor(baseCol, tailCol, factor * 0.65);

    // Corps de l'anneau
    fill(c);
    stroke(15, 60, 20);
    strokeWeight(1.5);
    circle(0, 0, currentR * 2);

    // Écaille dorsale / reflet supérieur pour effet de volume
    noStroke();
    fill(255, 255, 255, 45);
    ellipse(0, -currentR * 0.25, currentR * 1.2, currentR * 0.6);

    // Motif ventral / motif d'anneau
    if (index % 2 === 0) {
      fill(255, 255, 255, 25);
      circle(0, 0, currentR * 0.7);
    }

    // Cercle de débug si activé
    if (Vehicle.debug) {
      noFill();
      stroke(0, 255, 200, 120);
      strokeWeight(1);
      circle(0, 0, currentR * 2 + 4);
    }

    pop();
  }
}
