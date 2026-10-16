
// Algorithme génétique pour l'évolution de la flotte de véhicules autonomes

// Passe à la génération suivante
function nextGeneration() {
  calculateFitnessForAllCars();

  // Identifier le champion absolu de la génération précédente (élitisme)
  let bestParent = savedVehicles[0];
  for (let v of savedVehicles) {
    if (v.fitness > (bestParent ? bestParent.fitness : 0)) {
      bestParent = v;
    }
  }

  // Nouvelle population
  population = [];

  // Élitisme : On conserve un clone intact du meilleur champion sans mutation
  if (bestParent && bestParent.brain) {
    let eliteChild = new CircuitVehicle(bestParent.brain);
    eliteChild.isElite = true;
    population.push(eliteChild);
  }

  // Remplissage du reste de la population avec roulette et mutations
  const targetTotal = (typeof TOTAL !== 'undefined') ? TOTAL : 100;
  while (population.length < targetTotal) {
    population.push(pickOne());
  }

  // Libération mémoire TensorFlow des anciens véhicules
  for (let vehicle of savedVehicles) {
    if (vehicle.dispose) {
      vehicle.dispose();
    }
  }
  savedVehicles = [];
}

// Sélection par roulette proportionnelle à la fitness
function pickOne() {
  if (savedVehicles.length === 0) {
    return new CircuitVehicle();
  }

  let index = 0;
  let r = random(1);
  while (r > 0 && index < savedVehicles.length) {
    r = r - savedVehicles[index].fitness;
    index++;
  }
  index--;
  if (index < 0) index = 0;
  if (index >= savedVehicles.length) index = savedVehicles.length - 1;

  const parent = savedVehicles[index];
  const child = new CircuitVehicle(parent.brain);

  // Application du taux de mutation dynamique
  const mutRate = (typeof getActiveMutationRate === 'function') 
    ? getActiveMutationRate() 
    : (typeof MUTATION_RATE !== 'undefined' ? MUTATION_RATE : 0.1);

  child.brain.mutate(mutRate);
  return child;
}

// Calcul et normalisation de la fitness pour tous les véhicules morts
function calculateFitnessForAllCars() {
  if (savedVehicles.length === 0) return;

  // Calcul brut de la fitness (pondération exponentielle du nombre de checkpoints)
  for (let vehicle of savedVehicles) {
    vehicle.calculateFitness();
  }

  // Normalisation des fitness pour la roulette
  let sum = 0;
  for (let vehicle of savedVehicles) {
    sum += vehicle.fitness;
  }

  if (sum > 0) {
    for (let vehicle of savedVehicles) {
      vehicle.fitness = vehicle.fitness / sum;
    }
  } else {
    // Si toutes les voitures ont 0 fitness, distribution uniforme
    const uniform = 1 / savedVehicles.length;
    for (let vehicle of savedVehicles) {
      vehicle.fitness = uniform;
    }
  }
}