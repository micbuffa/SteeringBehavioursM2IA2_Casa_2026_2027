/** État et locomotion partagés par les entités mobiles du flocking. */
class Vehicle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 5;
    this.maxForce = 0.2;
    this.r = 6;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    // Conserve l'ordre de locomotion utilisé dans le Boid d'origine.
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.acc.mult(0);
  }
}
