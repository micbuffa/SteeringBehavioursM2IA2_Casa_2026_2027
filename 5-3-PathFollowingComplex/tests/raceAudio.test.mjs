import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Oscillator {
  constructor(type) { this.type = type; this.amplitudes = []; this.frequencies = []; }
  amp(value) { this.amplitudes.push(value); }
  freq(value) { this.frequencies.push(value); }
  start() { this.started = true; }
}
const context = { p5: { Oscillator }, userStartAudio() {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../raceAudio.js', import.meta.url), 'utf8'), context);
const RaceAudio = vm.runInContext('RaceAudio', context);

test('le son reste inactif sans activation, puis suit la vitesse et se coupe en pause', () => {
  const audio = new RaceAudio();
  audio.update([]);
  assert.equal(audio.oscillators, null);
  audio.setEnabled(true);
  audio.setVolume(0.4);
  audio.update([{ vel: { mag: () => 4 } }]);
  const engine = audio.oscillators.engine;
  assert.equal(engine.started, true);
  assert.ok(engine.frequencies.at(-1) > 48);
  audio.update([], true);
  assert.equal(engine.amplitudes.at(-1), 0);
});
