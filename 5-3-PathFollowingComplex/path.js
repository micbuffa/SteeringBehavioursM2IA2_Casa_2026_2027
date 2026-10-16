class Path {
  constructor() {
    // Rayon arbitraire de 20 (c'est la demi-largeur de la route)
    // Un chemin a un rayon qui définit la zone ou le véhicule doit rester
    this.radius = 52;
    // Path = tableau de points (vecteurs)
    this.points = [];
  }

  // Ajout d'un point dans le chemin
  addPoint(x, y) {
    let point = createVector(x, y);
    this.points.push(point);
  }

  // Dessin du chemin
  display() {
    this.drawTrack();
    return;
    // bords arrondis dans les irages
    strokeJoin(ROUND);

    // couleur de la route = gris
    stroke(175);
    // On dessine le chemin deux fois plus large que la droite qui relie deux points
    strokeWeight(this.radius * 2);
    // pas de contours
    noFill();

    // dessin du chemin
    beginShape();
    for (let v of this.points) {
      vertex(v.x, v.y);
    }
    endShape(CLOSE); // CLOSE signifie : on relie le dernier point au premier

    // Draw thin line for center of path
    // couleur noire fil de fer
    stroke(0);
    // épaisseur 1 pixel
    strokeWeight(1);
    noFill();
    beginShape();
    for (let v of this.points) {
      vertex(v.x, v.y);
    }

    endShape(CLOSE);
  }

  drawTrack() {
    if (this.points.length < 2) return;
    strokeJoin(ROUND);
    strokeCap(ROUND);
    noFill();
    push();
    translate(0, 12);
    this.drawStroke('#17212b55', (this.radius + 22) * 2);
    pop();
    this.drawStroke('#cbd5e1', (this.radius + 12) * 2);
    this.drawStroke('#dc3545', (this.radius + 7) * 2);
    this.drawStroke('#252b33', this.radius * 2);
    push();
    drawingContext.setLineDash([20, 20]);
    this.drawStroke('#f8fafc', 13, this.radius + 7);
    this.drawStroke('#f8fafc', 13, -(this.radius + 7));
    drawingContext.setLineDash([]);
    pop();
    this.drawStroke('#f1f5f9', 3, this.radius - 8);
    this.drawStroke('#f1f5f9', 3, -(this.radius - 8));
    push();
    drawingContext.setLineDash([22, 24]);
    this.drawStroke('#fbbf24', 3);
    drawingContext.setLineDash([]);
    pop();
  }

  drawStroke(colorValue, weight, offset = 0) {
    stroke(colorValue);
    strokeWeight(weight);
    noFill();
    beginShape();
    for (let i = 0; i < this.points.length; i++) {
      const previous = this.points[(i - 1 + this.points.length) % this.points.length];
      const next = this.points[(i + 1) % this.points.length];
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const length = Math.hypot(tangentX, tangentY) || 1;
      const normalX = -tangentY / length;
      const normalY = tangentX / length;
      const point = this.points[i];
      vertex(point.x + normalX * offset, point.y + normalY * offset);
    }
    endShape(CLOSE);
  }
}
