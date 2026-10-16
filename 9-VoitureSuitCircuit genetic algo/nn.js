
class NeuralNetwork {
  constructor(a, b, c, d) {
    // Si on passe un réseau de neurones en paramètre
    // on l'utilise
    // sinon on crée un réseau de neurones
    // avec les paramètres passés: nombre de neurones en entrée, couches cachées et sortie
    if (a instanceof tf.Sequential) {
      this.model = a;
      this.input_nodes = b;
      this.hidden_nodes = Array.isArray(c) ? [...c] : c;
      this.output_nodes = d;
    } else {
      this.input_nodes = a;
      this.hidden_nodes = Array.isArray(b) ? [...b] : b;
      this.output_nodes = c;
      this.model = this.createModel();
    }
    this.lastInputs = [];
    this.lastOutputs = [];
  }

  // Couches cachées sous forme de tableau normalisé
  getHiddenLayers() {
    return Array.isArray(this.hidden_nodes) ? this.hidden_nodes : [this.hidden_nodes];
  }

  // Nombre total de couches du réseau
  getTopology() {
    return [this.input_nodes, ...this.getHiddenLayers(), this.output_nodes];
  }

  // On crée une copie du réseau de neurones avec tous ses poids
  copy() {
    return tf.tidy(() => {
      const modelCopy = this.createModel();
      const weights = this.model.getWeights();
      const weightCopies = [];
      for (let i = 0; i < weights.length; i++) {
        weightCopies[i] = weights[i].clone();
      }
      modelCopy.setWeights(weightCopies);
      const hiddenCopy = Array.isArray(this.hidden_nodes) ? [...this.hidden_nodes] : this.hidden_nodes;
      return new NeuralNetwork(modelCopy, this.input_nodes, hiddenCopy, this.output_nodes);
    });
  }

  // Applique une mutation aux poids du réseau de neurones
  mutate(rate) {
    tf.tidy(() => {
      const weights = this.model.getWeights();
      const mutatedWeights = [];

      for (let i = 0; i < weights.length; i++) {
        let tensor = weights[i];
        let shape = weights[i].shape;
        let values = tensor.dataSync().slice();

        for (let j = 0; j < values.length; j++) {
          if (random(1) < rate) {
            let w = values[j];
            values[j] = w + randomGaussian(0, 0.5);
          }
        }

        let newTensor = tf.tensor(values, shape);
        mutatedWeights[i] = newTensor;
      }
      this.model.setWeights(mutatedWeights);
    });
  }

  dispose() {
    try {
      if (this.model) {
        const weights = this.model.getWeights();
        for (let i = 0; i < weights.length; i++) {
          weights[i].dispose();
        }
      }
    } catch (e) {
      // Ignorer les erreurs d'optimiseur non compilé
    }
  }

  // Prédit la sortie en fonction des entrées des capteurs
  predict(inputs) {
    this.lastInputs = inputs;
    return tf.tidy(() => {
      const xs = tf.tensor2d([inputs]);
      const ys = this.model.predict(xs);
      const outputs = ys.dataSync();
      this.lastOutputs = Array.from(outputs);
      return outputs;
    });
  }

  createModel() {
    const model = tf.sequential();
    const hiddenLayers = this.getHiddenLayers();

    // Première couche cachée reliée à la couche d'entrée
    model.add(tf.layers.dense({
      units: hiddenLayers[0],
      inputShape: [this.input_nodes],
      activation: 'sigmoid'
    }));

    // Couches cachées intermédiaires supplémentaires éventuelles
    for (let i = 1; i < hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: hiddenLayers[i],
        activation: 'sigmoid'
      }));
    }

    // Couche de sortie (2 neurones : angle/direction et vitesse)
    model.add(tf.layers.dense({
      units: this.output_nodes,
      activation: 'sigmoid'
    }));

    return model;
  }
}