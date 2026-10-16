/** Repère circulaire piloté directement par la souris. */
class Target extends Vehicle {
  constructor(x, y, radius = 50, margin = 14) {
    super(x, y);
    this.radius = radius;
    this.r = radius;
    this.margin = margin;
  }

  followMouse(x, y) {
    // Cette cible est une commande d'entrée : sa position représente le curseur.
    this.pos.set(x, y);
  }

  show() {
    push();
    noFill();
    stroke('#fde047');
    strokeWeight(2);
    circle(this.pos.x, this.pos.y, this.radius * 2);
    stroke(253, 224, 71, 70);
    circle(this.pos.x, this.pos.y, (this.radius + this.margin) * 2);
    noStroke();
    fill('#fde047');
    circle(this.pos.x, this.pos.y, 6);
    pop();
  }
}
