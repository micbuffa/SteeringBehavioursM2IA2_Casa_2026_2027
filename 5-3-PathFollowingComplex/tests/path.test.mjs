import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const widths = [];
const dashPatterns = [];
const context = {
  createVector: (x, y) => ({ x, y }),
  strokeJoin() {}, strokeCap() {}, noFill() {}, push() {}, pop() {}, translate() {},
  stroke() {}, strokeWeight(value) { widths.push(value); }, beginShape() {}, vertex() {}, endShape() {},
  drawingContext: { setLineDash(value) { dashPatterns.push(value); } },
  ROUND: 1, CLOSE: 2,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../path.js', import.meta.url), 'utf8'), context);
const Path = vm.runInContext('Path', context);

test('la route est plus large et son rendu superpose relief, vibreurs et marquages', () => {
  widths.length = 0;
  dashPatterns.length = 0;
  const path = new Path();
  path.addPoint(0, 0);
  path.addPoint(100, 0);
  path.addPoint(100, 100);
  path.display();
  assert.equal(path.radius, 52);
  assert.ok(widths.includes(104), 'asphalte de 104 px');
  assert.ok(widths.includes(148), 'ombre en relief');
  assert.ok(dashPatterns.some(pattern => pattern.length === 2), 'marquages discontinus');
});
