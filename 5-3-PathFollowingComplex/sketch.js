// Circuit complexe suivi par une flotte de voitures autonomes.
let debug = false;
let path;
let vehicles = [];
let carColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];
let nextColor = 0;
let obstacles = [];
let paused = false;
let obstacleMode = false;
let circuitDifficulty = 'normal';
let raceAudio;
let selectedCarId = null;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('scene');
  newPath();
  raceAudio = new RaceAudio();
  setupControls();
  const start = path.points[0];
  newVehicle(start.x, start.y);
}

function draw() {
  drawCircuitBackground();
  path.display();
  for (const obstacle of obstacles) obstacle.render();
  if (!paused) {
    // Tous les comportements observent le même état avant l'intégration de la frame.
    for (const car of vehicles) car.applyBehaviors(vehicles, path, obstacles);
    for (const car of vehicles) car.update();
  }
  for (const car of vehicles) car.render();
  raceAudio.update(vehicles, paused);
  document.getElementById('car-count').textContent = `${vehicles.length} voitures · ${obstacles.length} obstacles${paused ? ' · en pause' : ''}`;
}

function drawCircuitBackground() {
  background('#39734b');
  noStroke();
  for (let y = 0; y < height; y += 44) {
    fill(255, 255, 255, y % 88 === 0 ? 10 : 4);
    rect(0, y, width, 22);
  }
  fill('#f8fafc');
  textAlign(LEFT, BOTTOM);
  textSize(11);
  text('SPORT CIRCUIT  •  PATH FOLLOWING', 18, height - 18);
}

function newPath() {
  path = new Path();
  const levels = { facile: 18, normal: 30, difficile: 44 };
  const count = levels[circuitDifficulty] || levels.normal;
  const rx = Math.max(80, Math.min(width * 0.34, height * 0.46));
  const ry = Math.max(70, Math.min(height * 0.34, width * 0.42));
  for (let i = 0; i < count; i++) {
    const angle = TWO_PI * i / count;
    const complexity = circuitDifficulty === 'difficile' ? 1 : circuitDifficulty === 'normal' ? 0.55 : 0.18;
    const wobble = 1 + complexity * (0.055 * Math.sin(3 * angle + 0.4) + 0.025 * Math.cos(5 * angle));
    path.addPoint(width / 2 + cos(angle) * rx * wobble,
      height / 2 + sin(angle) * ry * wobble);
  }
}

function newVehicle(x, y) {
  const car = new SportCar(x, y, carColors[nextColor++ % carColors.length]);
  car.followPathWeight = Number(document.getElementById('follow-weight').value);
  car.separateWeight = Number(document.getElementById('separate-weight').value);
  vehicles.push(car);
  selectedCarId = car.carId;
  refreshCarSelector();
  loadCarSettings(car);
  return car;
}

function setupControls() {
  bindWeight('follow-weight', 'follow-value', 'followPathWeight');
  bindWeight('separate-weight', 'separate-value', 'separateWeight');
  document.getElementById('add-car').addEventListener('click', () => newVehicle(mouseX, mouseY));
  document.getElementById('toggle-debug').addEventListener('change', event => {
    debug = event.target.checked;
    Vehicle.debug = debug;
  });

  document.getElementById('car-select').addEventListener('change', event => {
    selectedCarId = Number(event.target.value);
    loadCarSettings(getSelectedCar());
  });
  bindCarSlider('car-speed', 'maxSpeed', value => `${Number(value).toFixed(1)} px/f`);
  bindCarSlider('car-acceleration', 'maxForce', value => Number(value).toFixed(2));
  bindCarSlider('car-precision', 'precision', value => `${Number(value).toFixed(1)}×`);
  bindCarSlider('car-detection', 'detectionDistance', value => `${value} px`);
  document.getElementById('driving-style').addEventListener('change', event => getSelectedCar()?.setDrivingStyle(event.target.value));
  document.getElementById('circuit-difficulty').addEventListener('change', event => {
    circuitDifficulty = event.target.value;
    newPath();
  });
  document.getElementById('obstacle-mode').addEventListener('click', event => {
    obstacleMode = !obstacleMode;
    event.currentTarget.classList.toggle('active', obstacleMode);
    event.currentTarget.textContent = obstacleMode ? 'Clique sur la piste pour placer' : 'Ajouter un obstacle';
  });
  document.getElementById('clear-obstacles').addEventListener('click', () => { obstacles = []; });
  document.getElementById('sound-enabled').addEventListener('change', event => raceAudio.setEnabled(event.target.checked));
  document.getElementById('sound-volume').addEventListener('input', event => {
    raceAudio.setVolume(event.target.value);
    document.getElementById('sound-volume-value').textContent = `${Math.round(event.target.value * 100)}%`;
  });
  document.getElementById('pause-button').addEventListener('click', event => {
    paused = !paused;
    event.currentTarget.textContent = paused ? 'Reprendre' : 'Pause';
  });
  document.getElementById('reset-button').addEventListener('click', resetSimulation);
}

function bindCarSlider(id, property, format) {
  const slider = document.getElementById(id);
  slider.addEventListener('input', () => {
    const car = getSelectedCar();
    if (!car) return;
    car[property] = Number(slider.value);
    document.getElementById(`${id}-value`).textContent = format(slider.value);
  });
}

function getSelectedCar() {
  return vehicles.find(car => car.carId === selectedCarId) || vehicles[0] || null;
}

function refreshCarSelector() {
  const selector = document.getElementById('car-select');
  selector.replaceChildren(...vehicles.map((car, index) => {
    const option = document.createElement('option');
    option.value = car.carId;
    option.textContent = `Voiture ${index + 1}`;
    option.selected = car.carId === selectedCarId;
    return option;
  }));
}

function loadCarSettings(car) {
  if (!car) return;
  const settings = [
    ['car-speed', car.maxSpeed], ['car-acceleration', car.maxForce],
    ['car-precision', car.precision], ['car-detection', car.detectionDistance],
  ];
  for (const [id, value] of settings) {
    const slider = document.getElementById(id);
    slider.value = value;
    slider.dispatchEvent(new Event('input'));
  }
  document.getElementById('driving-style').value = car.drivingStyle;
}

function resetSimulation() {
  vehicles = [];
  obstacles = [];
  nextColor = 0;
  paused = false;
  obstacleMode = false;
  document.getElementById('pause-button').textContent = 'Pause';
  document.getElementById('obstacle-mode').classList.remove('active');
  document.getElementById('obstacle-mode').textContent = 'Ajouter un obstacle';
  newPath();
  newVehicle(path.points[0].x, path.points[0].y);
}

function mousePressed(event) {
  if (obstacleMode && event?.target?.tagName === 'CANVAS') {
    obstacles.push(new Obstacle(mouseX, mouseY, random(18, 32)));
    return false;
  }
}

function bindWeight(sliderId, outputId, property) {
  const slider = document.getElementById(sliderId);
  const output = document.getElementById(outputId);
  const update = () => {
    const value = Number(slider.value);
    output.value = value.toFixed(1);
    for (const car of vehicles) car[property] = value;
  };
  slider.addEventListener('input', update);
  update();
}

function keyPressed() {
  const focusedTag = document.activeElement?.tagName;
  if (['INPUT', 'SELECT', 'BUTTON'].includes(focusedTag)) return;
  if (key === "'" || key === '"') newVehicle(mouseX, mouseY);
  if (key === 'd' || key === 'D') {
    debug = !debug;
    Vehicle.debug = debug;
    document.getElementById('toggle-debug').checked = debug;
  }
  if (key === 'p' || key === 'P') document.getElementById('pause-button').click();
  if (key === 'o' || key === 'O') document.getElementById('obstacle-mode').click();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  newPath();
}
