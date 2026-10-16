
// Entité autonome de course apprenant par algorithme génétique
// Étend obligatoirement la classe de base Vehicle (règles AGENTS.md)
class CircuitVehicle extends Vehicle {
  constructor(brain, customConfig = {}) {
    // Configuration dynamique des capteurs et de la locomotion
    const numRays = customConfig.numRays || (typeof getActiveRayCount === 'function' ? getActiveRayCount() : 7);
    const fovDeg = customConfig.fov || (typeof getActiveFOV === 'function' ? getActiveFOV() : 120);
    const sightDist = customConfig.sight || (typeof getActiveSight === 'function' ? getActiveSight() : 90);
    const maxSpeed = customConfig.maxSpeed || (typeof getActiveMaxSpeed === 'function' ? getActiveMaxSpeed() : 6);
    const maxForce = customConfig.maxForce || (typeof getActiveMaxForce === 'function' ? getActiveMaxForce() : 0.25);

    // Initialisation directe du bon réseau de neurones
    let brainToPass = brain;
    if (!brainToPass || brainToPass.input_nodes !== numRays) {
      const hiddenTopology = (typeof getHiddenLayersTopology === 'function') 
        ? getHiddenLayersTopology(numRays) 
        : [numRays * 2, numRays];
      brainToPass = new NeuralNetwork(numRays, hiddenTopology, 2);
    }

    // Appel du constructeur parent avec le bon réseau
    super(brainToPass);

    this.maxspeed = maxSpeed;
    this.maxforce = maxForce;
    this.sight = sightDist;
    this.pos = (typeof start !== 'undefined' && start) ? createVector(start.x, start.y) : createVector(width / 2, height / 2);
    this.vel = createVector();
    this.acc = createVector();
    this.fitness = 0;
    this.checkpointsPassed = 0;
    this.dead = false;
    this.finished = false;
    this.index = 0;
    this.counter = 0;
    this.rayHits = [];

    // Initialisation des rayons
    this.initRays(numRays, fovDeg);
  }

  // Distribution angulaire symétrique des rayons capteurs
  initRays(numRays, fovDeg) {
    this.rays = [];
    this.rayHits = [];
    const halfFov = radians(fovDeg / 2);

    if (numRays <= 1) {
      this.rays.push(new Ray(this.pos, 0));
    } else {
      for (let i = 0; i < numRays; i++) {
        let angle = map(i, 0, numRays - 1, -halfFov, halfFov);
        this.rays.push(new Ray(this.pos, angle));
      }
    }

    for (let i = 0; i < this.rays.length; i++) {
      this.rayHits.push({ pt: null, dist: this.sight });
    }
  }

  // Applique les steering behaviors autonomes
  applyBehaviors(walls) {
    if (this.dead || this.finished) return;
    const force = this.look(walls);
    this.applyForce(force);
  }

  // Locomotion et mise à jour dynamique des capacités
  update() {
    if (this.dead || this.finished) return;

    // Mise à jour de la vitesse max en temps réel via le curseur utilisateur
    if (typeof getActiveMaxSpeed === 'function') {
      this.maxspeed = getActiveMaxSpeed();
    }
    if (typeof getActiveMaxForce === 'function') {
      this.maxforce = getActiveMaxForce();
    }
    if (typeof getActiveSight === 'function') {
      this.sight = getActiveSight();
    }

    // Intégration d'Euler standard
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.vel.limit(this.maxspeed);
    this.acc.set(0, 0);

    // Gestion du temps de vie sans checkpoint (lifespan)
    const limitLifespan = (typeof getActiveLifespan === 'function') ? getActiveLifespan() : (typeof LIFESPAN !== 'undefined' ? LIFESPAN : 35);
    this.counter++;
    if (this.counter > limitLifespan) {
      this.dead = true;
    }

    // Orientation des rayons selon le cap de déplacement
    const heading = this.vel.heading();
    for (let ray of this.rays) {
      ray.rotate(heading);
    }
  }

  // Détection des checkpoints du circuit
  check(checkpoints) {
    if (this.dead || this.finished || !checkpoints || checkpoints.length === 0) return;

    this.goal = checkpoints[this.index];
    const d = pldistance(this.goal.a, this.goal.b, this.pos.x, this.pos.y);

    // Traversée du checkpoint
    if (d < 12) {
      this.index = (this.index + 1) % checkpoints.length;
      this.fitness++;
      this.checkpointsPassed++;
      this.counter = 0; // Réinitialisation de l'endurance

      // Fin de tour complet
      if (this.fitness >= checkpoints.length * 3) {
        this.finished = true;
      }
    }
  }

  // Comportement de perception et pilotage réactif
  look(walls) {
    const inputs = [];

    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      let closest = null;
      let record = this.sight;

      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record && d < this.sight) {
            record = d;
            closest = pt;
          }
        }
      }

      // Proximité fatale d'un mur (< 6 pixels)
      if (record < 6) {
        this.dead = true;
      }

      this.rayHits[i] = { pt: closest, dist: record };
      // Normalisation de l'entrée : 1 si obstacle collé, 0 si champ totalement libre
      inputs[i] = map(record, 0, this.sight, 1, 0);
    }

    if (this.dead) return createVector(0, 0);

    // Décision du réseau de neurones
    const output = this.brain.predict(inputs);

    // Sortie 0 : angle de braquage relatif (-PI à PI ou -PI/2 à PI/2)
    let steeringAngle = map(output[0], 0, 1, -PI, PI);
    // Sortie 1 : vitesse désirée modulée par maxspeed
    let desiredSpeed = map(output[1], 0, 1, 0, this.maxspeed);

    let angle = steeringAngle + this.vel.heading();

    // Vitesse désirée (Desired Velocity) selon Reynolds
    const desiredVelocity = p5.Vector.fromAngle(angle);
    desiredVelocity.setMag(desiredSpeed);

    // Force de steering : desired - current
    let steer = p5.Vector.sub(desiredVelocity, this.vel);
    steer.limit(this.maxforce);

    return steer;
  }

  // Reproduction pour l'algorithme génétique
  reproduce() {
    return new CircuitVehicle(this.brain);
  }

  // Rendu graphique esthétique d'un véhicule de course
  show(showSensors = false) {
    push();
    translate(this.pos.x, this.pos.y);
    const heading = this.vel.heading();
    rotate(heading);

    // Carrosserie profilée sportive
    noStroke();
    // Ombre de châssis
    fill(0, 0, 0, 90);
    ellipse(-2, 2, 22, 12);

    // Corps principal
    fill(40, 180, 255, 180);
    beginShape();
    vertex(12, 0);       // Nez aérodynamique
    vertex(4, -5);       // Aile avant gauche
    vertex(-8, -6);      // Flanc gauche
    vertex(-10, -3);     // Écope arrière gauche
    vertex(-12, 0);      // Arrière / Diffuseur
    vertex(-10, 3);      // Écope arrière droite
    vertex(-8, 6);       // Flanc droit
    vertex(4, 5);        // Aile avant droite
    endShape(typeof CLOSE !== 'undefined' ? CLOSE : 2);

    // Pare-brise / Cockpit
    fill(10, 25, 45, 230);
    stroke(0, 240, 255, 120);
    strokeWeight(1);
    ellipse(0, 0, 7, 5);

    // Feux avant LED
    fill(255, 255, 200, 220);
    noStroke();
    ellipse(9, -3, 2, 2);
    ellipse(9, 3, 2, 2);

    // Tuyères d'échappement néon
    if (this.vel.mag() > 0.5) {
      fill(255, 100, 50, 150);
      ellipse(-12, 0, random(2, 5), 3);
    }
    pop();

    // Rendu optionnel de tous les rayons pour toute la flotte
    if (showSensors) {
      for (let i = 0; i < this.rays.length; i++) {
        const hit = this.rayHits[i];
        this.rays[i].show(this.sight, hit?.pt, hit?.dist);
      }
    }
  }

  // Surbrillance du véhicule leader (meilleur de la génération)
  highlight() {
    push();
    translate(this.pos.x, this.pos.y);
    const heading = this.vel.heading();
    rotate(heading);

    // Aura néon dorée
    noFill();
    stroke(255, 215, 0, 180);
    strokeWeight(2);
    ellipse(0, 0, 28, 18);

    // Châssis doré d'élite
    fill(255, 215, 0);
    noStroke();
    beginShape();
    vertex(14, 0);
    vertex(5, -6);
    vertex(-10, -7);
    vertex(-14, 0);
    vertex(-10, 7);
    vertex(5, 6);
    endShape(typeof CLOSE !== 'undefined' ? CLOSE : 2);

    // Cockpit
    fill(20, 20, 30);
    stroke(255, 255, 255, 180);
    strokeWeight(1);
    ellipse(0, 0, 8, 6);

    // Phares halogènes puissants
    fill(255, 255, 255);
    ellipse(11, -3.5, 3, 3);
    ellipse(11, 3.5, 3, 3);

    // Flamme réacteur
    fill(0, 255, 200, 200);
    ellipse(-15, 0, random(4, 8), 4);

    pop();

    // Faisceaux laser des rayons avec détection d'impact
    for (let i = 0; i < this.rays.length; i++) {
      const hit = this.rayHits[i];
      this.rays[i].show(this.sight, hit?.pt, hit?.dist);
    }

    // Trait laser vers le prochain checkpoint objectif
    if (this.goal) {
      push();
      const mid = this.goal.midpoint();
      stroke(0, 255, 180, 140);
      if (drawingContext && drawingContext.setLineDash) drawingContext.setLineDash([4, 4]);
      line(this.pos.x, this.pos.y, mid.x, mid.y);
      if (drawingContext && drawingContext.setLineDash) drawingContext.setLineDash([]);
      noStroke();
      fill(0, 255, 180);
      ellipse(mid.x, mid.y, 6, 6);
      pop();
    }
  }
}
