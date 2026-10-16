/**
 * SnakeHead — Sous-classe de Vehicle représentant la tête animée du serpent.
 * Intègre les comportements de pilotage (arrivée vers cible / nourriture)
 * et des animations multimédia riches : clignotement des yeux, pupilles mobiles,
 * langue fourchue ondulante animée, ouverture dynamique de la mâchoire à l'approche de la nourriture
 * et claquement de dents à la déglutition.
 */
class SnakeHead extends Vehicle {
  constructor(x, y, r = 18, headColor = '#22c55e') {
    super(x, y);
    this.r = r;
    this.baseRadius = r;
    this.headColor = headColor;

    this.maxSpeed = 5;
    this.maxForce = 0.3;
    this.rayonZoneDeFreinage = 120;

    // État d'animation des yeux
    this.blinkTimer = 0;
    this.blinkInterval = 180 + Math.floor(Math.random() * 80);
    this.isBlinking = false;
    this.blinkDuration = 10;
    this.blinkCounter = 0;

    // État d'animation de la langue
    this.tongueCycle = 0;
    this.tongueActive = false;
    this.tongueExtension = 0; // 0 = rentrée, 1 = complètement sortie
    this.tongueTimer = 0;
    this.tongueInterval = 90 + Math.floor(Math.random() * 60);

    // État d'animation de la mâchoire (ouverture adaptative)
    this.mouthOpenness = 0; // de 0 (fermée) à 1 (grande ouverte)
    this.targetMouthOpenness = 0;

    // État d'animation de déglutition (morsure/claquement)
    this.eatingCooldown = 0;
    this.chewTimer = 0;

    // Maintien de l'angle précédent pour un affichage stable à vitesse nulle
    this.currentHeading = 0;
  }

  /**
   * Pilote la tête vers la cible en utilisant le comportement d'arrivée
   * @param {p5.Vector} targetPos - Position cible
   * @param {boolean} arrival - Si vrai, utilise l'arrivée de Reynolds avec freinage
   */
  steerTowards(targetPos, arrival = true) {
    const steering = arrival ? this.arrive(targetPos, 0) : this.seek(targetPos);
    this.applyForce(steering);
    this.update();

    if (this.vel && this.vel.mag() > 0.05) {
      this.currentHeading = this.vel.heading();
    }
  }

  /**
   * Met à jour les cycles d'animation de la tête (yeux, langue, bouche)
   * @param {number} nearestFoodDist - Distance à l'aliment le plus proche
   */
  updateAnimations(nearestFoodDist = Infinity) {
    // 1. Clignotement des yeux
    this.blinkTimer++;
    if (!this.isBlinking && this.blinkTimer >= this.blinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkCounter = 0;
      this.blinkInterval = 140 + Math.floor(Math.random() * 100);
    }
    if (this.isBlinking) {
      this.blinkCounter++;
      if (this.blinkCounter >= this.blinkDuration) {
        this.isBlinking = false;
      }
    }

    // 2. Langue fourchue ondulante
    this.tongueTimer++;
    if (!this.tongueActive && this.tongueTimer >= this.tongueInterval) {
      this.tongueActive = true;
      this.tongueTimer = 0;
      this.tongueInterval = 80 + Math.floor(Math.random() * 70);
    }
    if (this.tongueActive) {
      this.tongueCycle += 0.35;
      this.tongueExtension = (Math.sin(this.tongueCycle) + 1) / 2;
      // Termine le coup de langue après un cycle complet
      if (this.tongueCycle >= Math.PI * 2) {
        this.tongueCycle = 0;
        this.tongueActive = false;
        this.tongueExtension = 0;
      }
    } else {
      this.tongueExtension = 0;
    }

    // 3. Mâchoire : s'ouvre à proximité d'un aliment
    const detectionDist = this.r * 4.0;
    if (nearestFoodDist < detectionDist) {
      // Plus on est proche, plus la gueule s'ouvre grand
      const openness = (detectionDist - nearestFoodDist) / (detectionDist - this.r);
      this.targetMouthOpenness = Math.min(1.0, Math.max(0, openness));
    } else {
      this.targetMouthOpenness = 0;
    }

    // Effet de claquement de dents si on vient de manger
    if (this.eatingCooldown > 0) {
      this.eatingCooldown--;
      this.chewTimer += 0.6;
      // Mouvement oscillant rapide de mastication
      this.targetMouthOpenness = Math.max(0, Math.sin(this.chewTimer) * 0.8);
    }

    // Interpolation fluide de l'ouverture de la bouche
    this.mouthOpenness += (this.targetMouthOpenness - this.mouthOpenness) * 0.25;
  }

  /**
   * Déclenche l'animation de morsure / déglutition
   */
  triggerEat() {
    this.eatingCooldown = 18;
    this.chewTimer = 0;
    this.mouthOpenness = 1.0;
  }

  /**
   * Rendu graphique complet de la tête avec animations p5.js
   * @param {p5.Vector} targetPos - Position de la cible pour l'orientation du regard
   */
  show(targetPos = null) {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.currentHeading);

    const r = this.r;

    // --- 1. Dessin de la langue fourchue ondulante (sous la tête) ---
    if (this.tongueExtension > 0.05) {
      push();
      stroke(220, 20, 60);
      strokeWeight(Math.max(1.5, r * 0.1));
      noFill();

      const maxLen = r * 1.5;
      const currentLen = maxLen * this.tongueExtension;
      const wave = Math.sin(this.tongueCycle * 3) * (r * 0.25);

      // Tronc de la langue
      line(r * 0.8, 0, r * 0.8 + currentLen * 0.7, wave);

      // Fourchettes terminales
      const tipX = r * 0.8 + currentLen;
      line(r * 0.8 + currentLen * 0.7, wave, tipX, wave - r * 0.2);
      line(r * 0.8 + currentLen * 0.7, wave, tipX, wave + r * 0.2);
      pop();
    }

    // --- 2. Dessin du crâne / corps de la tête ---
    push();
    fill(this.headColor);
    stroke(15, 60, 20);
    strokeWeight(2);

    // Forme reptilienne profilée
    beginShape();
    vertex(r * 1.3, 0); // Museau avant
    bezierVertex(r * 1.1, -r * 0.7, r * 0.2, -r * 0.95, -r * 0.7, -r * 0.8); // Joue supérieure
    bezierVertex(-r * 1.0, -r * 0.6, -r * 1.1, 0, -r * 1.0, 0); // Arrière crâne
    bezierVertex(-r * 1.0, 0, -r * 1.0, r * 0.6, -r * 0.7, r * 0.8); // Arrière crâne bas
    bezierVertex(r * 0.2, r * 0.95, r * 1.1, r * 0.7, r * 1.3, 0); // Joue inférieure
    endShape(CLOSE);

    // Écailles dorsales / reflets
    noStroke();
    fill(255, 255, 255, 50);
    ellipse(0, -r * 0.25, r * 1.4, r * 0.5);
    pop();

    // --- 3. Dessin de la mâchoire et des crocs (si ouverte) ---
    if (this.mouthOpenness > 0.08) {
      push();
      // Intérieur sombre de la gueule
      fill(120, 20, 30);
      noStroke();
      const mouthGap = r * 0.55 * this.mouthOpenness;
      triangle(r * 1.25, 0, r * 0.5, -mouthGap, r * 0.5, mouthGap);

      // Crocs blancs acérés
      fill(255);
      stroke(180);
      strokeWeight(0.8);
      // Croc supérieur
      triangle(r * 0.9, -mouthGap * 0.8, r * 0.8, -mouthGap * 0.1, r * 0.75, -mouthGap * 0.8);
      // Croc inférieur
      triangle(r * 0.9, mouthGap * 0.8, r * 0.8, mouthGap * 0.1, r * 0.75, mouthGap * 0.8);
      pop();
    }

    // --- 4. Narines sur le museau ---
    push();
    fill(10, 40, 15);
    noStroke();
    circle(r * 1.05, -r * 0.22, r * 0.14);
    circle(r * 1.05, r * 0.22, r * 0.14);
    pop();

    // --- 5. Yeux animés & Pupilles réactives ---
    this.dessineYeux(r, targetPos);

    // Cercle de zone de freinage en mode Debug
    if (Vehicle.debug) {
      noFill();
      stroke(255, 200, 0, 150);
      strokeWeight(1);
      circle(0, 0, this.rayonZoneDeFreinage * 2);
    }

    pop();
  }

  /**
   * Rendu des yeux avec clignotement et pupilles mobiles orientées
   * @param {number} r - Rayon de référence
   * @param {p5.Vector} targetPos - Position cible
   */
  dessineYeux(r, targetPos) {
    const eyeX = r * 0.25;
    const eyeY = r * 0.58;
    const eyeW = r * 0.55;
    const eyeH = r * 0.45;

    // Si le serpent cligne des yeux
    if (this.isBlinking) {
      stroke(15, 60, 20);
      strokeWeight(2.5);
      // Fente paupière fermée
      line(eyeX - eyeW * 0.4, -eyeY, eyeX + eyeW * 0.4, -eyeY);
      line(eyeX - eyeW * 0.4, eyeY, eyeX + eyeW * 0.4, eyeY);
      return;
    }

    // Blanc / Jaune des yeux de serpent
    fill(255, 230, 80);
    stroke(15, 60, 20);
    strokeWeight(1.5);
    ellipse(eyeX, -eyeY, eyeW, eyeH);
    ellipse(eyeX, eyeY, eyeW, eyeH);

    // Calcul de l'orientation de la pupille vers la cible
    let pupilShiftX = eyeW * 0.15;
    let pupilShiftY = 0;

    if (targetPos) {
      const toTarget = p5.Vector.sub(targetPos, this.pos);
      toTarget.rotate(-this.currentHeading); // Ramener dans le repère local de la tête
      if (toTarget.mag() > 0.001) {
        toTarget.normalize();
        pupilShiftX = toTarget.x * (eyeW * 0.2);
        pupilShiftY = toTarget.y * (eyeH * 0.2);
      }
    }

    // Pupilles verticales reptiliennes
    fill(10, 10, 10);
    noStroke();
    ellipse(eyeX + pupilShiftX, -eyeY + pupilShiftY, eyeW * 0.25, eyeH * 0.7);
    ellipse(eyeX + pupilShiftX, eyeY + pupilShiftY, eyeW * 0.25, eyeH * 0.7);

    // Éclat de lumière dans les yeux
    fill(255, 255, 255, 220);
    circle(eyeX + pupilShiftX - eyeW * 0.08, -eyeY + pupilShiftY - eyeH * 0.15, eyeW * 0.15);
    circle(eyeX + pupilShiftX - eyeW * 0.08, eyeY + pupilShiftY - eyeH * 0.15, eyeW * 0.15);
  }
}
