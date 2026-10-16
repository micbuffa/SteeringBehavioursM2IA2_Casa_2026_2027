class Obstacle extends Vehicle {
  constructor(x, y, radius = 28, couleur = 'lightgreen') {
    super(x, y);
    this.radius = radius;
    this.r = radius;
    this.margin = 14;
    this.color = couleur;
    this.maxSpeed = 0;
    this.maxForce = 0;
  }

  show() {
    push();
    fill(this.color);
    stroke(0)
    strokeWeight(3);
    circle(this.pos.x, this.pos.y, this.radius * 2);
    fill(0);
    ellipse(this.pos.x, this.pos.y, 10);
    pop();
  }
}
