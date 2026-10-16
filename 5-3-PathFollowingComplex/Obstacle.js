/** Obstacle immobile visible du circuit : un objet du monde dérivé de Vehicle. */
class Obstacle extends Vehicle {
  constructor(x, y, radius = 24) {
    super(x, y, 0, 0);
    this.vel.set(0, 0);
    this.maxSpeed = 0;
    this.maxForce = 0;
    this.r = radius;
    this.color = '#f97316';
  }

  update() {
    // Un obstacle reste fixe ; sa locomotion n'est pas sollicitée.
  }

  render() {
    push();
    noStroke();
    fill(0, 0, 0, 65);
    ellipse(this.pos.x + 5, this.pos.y + 8, this.r * 2.15, this.r * 1.6);
    fill('#b91c1c');
    ellipse(this.pos.x, this.pos.y + 4, this.r * 2, this.r * 1.65);
    fill(this.color);
    stroke('#7c2d12');
    strokeWeight(2);
    ellipse(this.pos.x, this.pos.y, this.r * 2, this.r * 1.65);
    noStroke();
    fill('#fed7aa');
    ellipse(this.pos.x - this.r * 0.2, this.pos.y - this.r * 0.16, this.r * 0.72, this.r * 0.34);
    if (Vehicle.debug) {
      noFill();
      stroke('#fff7ed');
      circle(this.pos.x, this.pos.y, this.r * 2);
    }
    pop();
  }
}
