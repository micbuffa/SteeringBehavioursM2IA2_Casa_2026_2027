
// Rayon pour le raycasting de capteurs d'obstacles
// S'appuie sur la formule d'intersection segment-segment
class Ray {
  constructor(pos, angle) {
    this.pos = pos;
    this.angle = angle;
    this.dir = p5.Vector.fromAngle(angle);
  }

  lookAt(x, y) {
    this.dir.x = x - this.pos.x;
    this.dir.y = y - this.pos.y;
    this.dir.normalize();
  }

  rotate(offset) {
    this.dir = p5.Vector.fromAngle(this.angle + offset);
  }

  // Affiche le rayon avec couleur dynamique selon proximité
  show(sightDistance, hitPt = null, hitDist = null) {
    const range = (typeof sightDistance === 'number') ? sightDistance : (typeof SIGHT !== 'undefined' ? SIGHT : 80);
    push();
    translate(this.pos.x, this.pos.y);

    if (hitPt && hitDist !== null) {
      // Si obstacle détecté : couleur laser verte -> jaune -> rouge
      let ratio = constrain(hitDist / range, 0, 1);
      if (ratio < 0.25) {
        stroke(255, 40, 80, 200); // Rouge critique
        strokeWeight(2.5);
      } else if (ratio < 0.6) {
        stroke(255, 200, 30, 180); // Jaune alerte
        strokeWeight(2);
      } else {
        stroke(0, 255, 180, 150); // Vert-cyan sécurisé
        strokeWeight(1.5);
      }
      line(0, 0, this.dir.x * hitDist, this.dir.y * hitDist);

      // Point d'impact laser
      noStroke();
      fill(255, 50, 80, 220);
      ellipse(this.dir.x * hitDist, this.dir.y * hitDist, 6, 6);
    } else {
      // Rayon libre dans le vide
      stroke(0, 220, 255, 60);
      strokeWeight(1);
      line(0, 0, this.dir.x * range, this.dir.y * range);
    }
    pop();
  }

  // Intersection segment-segment (murs)
  cast(wall) {
    const x1 = wall.a.x;
    const y1 = wall.a.y;
    const x2 = wall.b.x;
    const y2 = wall.b.y;

    const x3 = this.pos.x;
    const y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x;
    const y4 = this.pos.y + this.dir.y;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) {
      return null;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
    if (t > 0 && t < 1 && u > 0) {
      const pt = createVector();
      pt.x = x1 + t * (x2 - x1);
      pt.y = y1 + t * (y2 - y1);
      return pt;
    }
    return null;
  }
}