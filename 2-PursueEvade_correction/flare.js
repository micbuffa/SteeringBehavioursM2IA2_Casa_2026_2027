class Flare extends Vehicle {
  constructor(x, y, vel, birthTime = (typeof millis === 'function' ? millis() : Date.now())) {
    super(x, y);
    this.vel = vel ? vel.copy() : createVector(0, 0);
    this.birthTime = birthTime;
    this.lifespan = 1000; // Se détruit après 1 seconde (1000 ms)
    this.r = 5;
    this.maxSpeed = 12;
    this.maxForce = 0.2;
    this.dragCoeff = 0.05;
  }

  isDead(currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    return (currentTime - this.birthTime) >= this.lifespan;
  }

  getAge(currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    return currentTime - this.birthTime;
  }

  getProgress(currentTime = (typeof millis === 'function' ? millis() : Date.now())) {
    const age = this.getAge(currentTime);
    return Math.min(Math.max(age / this.lifespan, 0), 1);
  }

  update() {
    // Force de traînée / amortissement aérodynamique
    const drag = this.vel.copy().mult(-this.dragCoeff);
    this.applyForce(drag);
    super.update();
  }

  show() {
    if (typeof push !== 'function') return;
    const progress = this.getProgress();
    const alpha = (1 - progress) * 255;
    const coreSize = this.r * (1.6 - progress * 0.8);

    push();
    translate(this.pos.x, this.pos.y);
    noStroke();

    // Halo lumineux extérieur
    fill(255, 90, 20, alpha * 0.4);
    circle(0, 0, coreSize * 4.5);

    // Flamme orange intermédiaire
    fill(255, 170, 30, alpha * 0.75);
    circle(0, 0, coreSize * 2.6);

    // Cœur incandescent blanc/jaune
    fill(255, 255, 210, alpha);
    circle(0, 0, coreSize);

    // Étincelle / particule de combustion
    const jitterX = (Math.random() - 0.5) * 6;
    const jitterY = (Math.random() - 0.5) * 6;
    fill(255, 240, 150, alpha * 0.9);
    circle(jitterX, jitterY, coreSize * 0.5);
    pop();
  }
}
