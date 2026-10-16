// Entité FleeVehicle : sous-classe de Vehicle implémentant le comportement de fuite (flee)
// selon les règles locales et réactives de Craig W. Reynolds (1999).
class FleeVehicle extends Vehicle {
  constructor(x, y, mode = 'seek') {
    super(x, y);
    // Mode actif : 'seek' (poursuite, Tâche 9) ou 'flee' (fuite)
    this.mode = mode;
  }

  // Comportement de fuite autonome (Craig W. Reynolds, 1999)
  // Formule : desiredSpeed opposée à la cible, steering = desiredSpeed - currentSpeed
  flee(target) {
    const targetPos = (target && target.pos) ? target.pos : target;

    // 1. Vitesse désirée orientée à l'opposé de la cible
    let desiredSpeed = p5.Vector.sub(this.pos, targetPos);

    // Normalisation et mise à l'échelle à maxSpeed
    desiredSpeed.setMag(this.maxSpeed);

    // 2. Force de braquage selon Reynolds : steering = vitesseDésirée - vitesseActuelle
    let force = p5.Vector.sub(desiredSpeed, this.vel);

    // 3. Limitation de la force à maxForce
    force.limit(this.maxForce);

    return force;
  }

  // Sélection du comportement actif et application de la force
  applyBehaviors(target) {
    let force = (this.mode === 'seek') ? this.seek(target) : this.flee(target);
    this.applyForce(force);
  }
}
