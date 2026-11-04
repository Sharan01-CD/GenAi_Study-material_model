import { StudyMaterial, QuestionSuite } from '../types/study';

export const sampleStudyMaterial: StudyMaterial = {
  id: 'deck-neural-networks',
  createdAt: Date.now() - 3600000,
  topic: 'Neural Networks & Deep Learning',
  educationLevel: 'Undergraduate / College',
  studyGoal: 'Master backpropagation, activation functions, and training dynamics',
  language: 'English',
  title: 'Foundations of Deep Neural Networks & Backpropagation',
  overview: {
    summary:
      'Artificial neural networks are computational models inspired by biological neural circuits. They map high-dimensional inputs to complex non-linear outputs through interconnected layers of parameterized artificial neurons, trained via gradient descent and backpropagation.',
    coreMentalModel:
      'Think of a neural network as an elaborate plumbing system with millions of adjustable valves (weights). Water flows in as inputs; pressure gauges at the end measure error. Backpropagation is sending a pulse backwards through every pipe to compute precisely how much each valve needs to be tightened or loosened to minimize leaks.',
    learningObjectives: [
      'Understand forward propagation, affine transformations, and non-linear activation functions',
      'Derive the chain rule intuition powering backpropagation and gradient descent',
      'Diagnose vanishing vs. exploding gradients and recognize remedies like ReLU, Batch Normalization, and Residual connections',
      'Evaluate loss functions (Cross-Entropy vs MSE) and regularization techniques (Dropout, L2 Weight Decay)',
    ],
  },
  modules: [
    {
      id: 'mod-1',
      title: 'Perceptron Architecture & Forward Propagation',
      summary: 'The building blocks of artificial neurons, dot products, biases, and activation functions.',
      concepts: [
        {
          name: 'The Artificial Neuron & Linear Transformation',
          explanation:
            'A single neuron calculates a weighted sum of its inputs plus a bias term: z = w · x + b. Without a non-linear activation function, stacking multiple layers collapses mathematically into a single linear matrix transformation, rendering deep architectures incapable of learning non-linear decision boundaries.',
          analogy:
            'Imagine combining two filters that only let blue light pass. Stacking a hundred linear filters still just produces a linear filter; you need an active chemical prism (non-linearity) to bend light into new wavelengths.',
          keyTakeaway:
            'Linear layers alone cannot compute XOR; non-linear activations provide universal function approximation power.',
          commonPitfalls:
            'Forgetting the bias term, which shifts the activation threshold away from the origin (0,0).',
          examples: [
            'Single-layer perceptron separating linearly separable AND/OR logic gates',
            'Multi-layer perceptron resolving the XOR non-linear boundary',
          ],
        },
        {
          name: 'Activation Functions: Sigmoid vs ReLU vs GELU',
          explanation:
            'Sigmoid squashes values between 0 and 1, but suffers severe gradient saturation at extremes (dy/dx ≈ 0 when |z| is large). Rectified Linear Unit (ReLU: max(0, z)) solves vanishing gradients for positive inputs and computes 6x faster, though it introduces "dying ReLU" when units stay permanently negative.',
          analogy:
            'Sigmoid is like a dim dimmer switch that barely changes brightness near maximum or off; ReLU is an instant one-way gate with clear transmission.',
          keyTakeaway:
            'ReLU and its variants (Leaky ReLU, GELU) dominate hidden layers because their derivative is 1 for positive values, preventing gradient death across deep stacks.',
          commonPitfalls:
            'Using Sigmoid in hidden layers of networks with more than 3 layers, causing early layer gradients to freeze.',
          examples: [
            'GELU used in Modern Transformers (BERT, GPT, LLaMA)',
            'Softmax reserved specifically for the final classification layer output probabilities',
          ],
        },
      ],
    },
    {
      id: 'mod-2',
      title: 'Backpropagation & Optimization Dynamics',
      summary: 'Automating credit assignment through the multivariable calculus chain rule.',
      concepts: [
        {
          name: 'Backpropagation via the Multivariate Chain Rule',
          explanation:
            'Backpropagation calculates the partial derivative of the scalar loss L with respect to every weight: ∂L/∂w = (∂L/∂y) · (∂y/∂z) · (∂z/∂w). By caching intermediate activations during the forward pass, gradients can be propagated backward in O(W) linear time relative to network parameters.',
          analogy:
            'Like a game of telephone in reverse, where the receiver whispers how wrong the final message was, and each person tells their neighbor exactly which word they garbled.',
          keyTakeaway:
            'Backprop is reverse-mode automatic differentiation applied to a computational graph.',
          commonPitfalls:
            'Assuming backprop updates weights; backprop only computes gradients. An optimizer (SGD, Adam, RMSProp) applies the updates.',
          examples: [
            'Updating weight matrices using learning rate η: W_new = W_old - η * ∇L',
            'Gradient clipping to avoid catastrophic exploding gradients in recurrent networks',
          ],
        },
        {
          name: 'Overfitting & Modern Regularization',
          explanation:
            'When a model memorizes training noise rather than generalizing, test loss diverges from training loss. Techniques include Dropout (stochastically zeroing neuron activations during training to prevent co-adaptation), L2 weight decay (penalizing large weights), and Early Stopping.',
          analogy:
            'Dropout is like holding team meetings while randomly barring half the engineers each day; everyone is forced to learn all facets of the codebase rather than relying on one hero.',
          keyTakeaway:
            'Regularization constraints reduce hypothesis space complexity, trading slight bias for lower generalization variance.',
          commonPitfalls:
            'Leaving Dropout active during inference or evaluation mode, causing unpredictable, degraded test predictions.',
          examples: [
            'Setting model.eval() in PyTorch before testing',
            'L2 penalty term: Loss_total = Loss_task + λ/2 * ||W||²',
          ],
        },
      ],
    },
  ],
  cheatSheet: {
    keyFormulasOrRules: [
      'Affine Layer: z = W · x + b',
      'ReLU Activation: f(z) = max(0, z); f\'(z) = 1 if z > 0 else 0',
      'Sigmoid: σ(z) = 1 / (1 + e^(-z)); σ\'(z) = σ(z)(1 - σ(z))',
      'Cross-Entropy Loss: L = -Σ y_i * log(ŷ_i)',
      'SGD with Momentum: v_t = γ*v_{t-1} + η*∇L; θ_t = θ_{t-1} - v_t',
      'Universal Approximation Theorem: A single hidden layer with sufficient non-linear neurons can approximate any continuous function.',
    ],
    mnemonics: [
      {
        phrase: 'F-L-B-U',
        meaning: 'Forward pass -> Loss computation -> Backpropagation -> Update weights (The 4 core steps of training)',
      },
      {
        phrase: 'B-R-A-D',
        meaning: 'Batch norm, ReLU, Adam, Dropout (The modern standard deep learning recipe)',
      },
    ],
    highYieldQuickFacts: [
      'Softmax outputs strictly sum to 1.0, representing a valid categorical probability distribution.',
      'Dying ReLU occurs when weights update such that the neuron never activates (z <= 0) for any input in the dataset.',
      'He Initialization scales initial weights by sqrt(2/n_in) specifically optimized for ReLU activation layers.',
      'Adam combines Momentum (first moment estimate) and RMSProp (second moment estimate of squared gradients).',
      'Vanishing gradient happens because multiplying numbers < 1 over dozens of layers drives gradients asymptotically to zero.',
    ],
    crucialDefinitions: [
      {
        term: 'Backpropagation',
        definition:
          'Reverse-mode automatic differentiation algorithm calculating loss gradients with respect to all network weights using the chain rule.',
      },
      {
        term: 'Vanishing Gradient',
        definition:
          'Phenomenon where backpropagated error gradients shrink exponentially as they travel toward initial layers, halting learning.',
      },
      {
        term: 'Batch Normalization',
        definition:
          'Technique that normalizes layer inputs by minibatch mean and variance, reducing internal covariate shift and stabilizing training.',
      },
      {
        term: 'Epoch vs Iteration',
        definition:
          'One epoch is a full pass through the entire dataset; an iteration is one gradient update on a single mini-batch.',
      },
    ],
  },
  flashcards: [
    {
      id: 'fc-1',
      front: 'Why does stacking multiple purely linear layers fail to produce a deep expressive neural network?',
      back: 'The composition of linear functions is always strictly linear (i.e., W2 * (W1 * x) = (W2 * W1) * x = W_combined * x). Without non-linear activation functions, the network collapses mathematically into a single-layer matrix transformation.',
      category: 'Network Architecture',
      difficulty: 'Medium',
      hint: 'Think about matrix multiplication properties (A * B = C).',
    },
    {
      id: 'fc-2',
      front: 'What is the mathematical derivative of the Sigmoid function σ(z)?',
      back: "σ'(z) = σ(z) · (1 - σ(z)). Notice that its maximum possible value is 0.25 (at z = 0), which causes severe gradient attenuation when multiplied across layers.",
      category: 'Activations',
      difficulty: 'Hard',
      hint: 'Expressed in terms of σ(z) itself.',
    },
    {
      id: 'fc-3',
      front: 'What is the primary benefit of ReLU over Sigmoid in deep networks?',
      back: 'ReLU has a constant derivative of 1 for all positive inputs (z > 0), eliminating gradient saturation and allowing gradients to flow unimpeded through hundreds of layers.',
      category: 'Activations',
      difficulty: 'Easy',
      hint: 'What is the slope of f(x) = x when x is positive?',
    },
    {
      id: 'fc-4',
      front: 'How does Dropout prevent overfitting during training?',
      back: 'It randomly sets a fraction (e.g., 20-50%) of activations to zero on each training iteration. This prevents neurons from co-adapting and forces the network to learn robust, distributed representations.',
      category: 'Regularization',
      difficulty: 'Medium',
      hint: 'Team members who must not over-rely on a single person.',
    },
    {
      id: 'fc-5',
      front: 'What is the difference between Gradient Descent, Mini-Batch SGD, and Stochastic Gradient Descent (SGD)?',
      back: 'Batch GD computes gradients across the full dataset (slow, high memory). Pure SGD updates weights per individual sample (fast, noisy). Mini-Batch SGD updates on small batches (e.g. 32-256 samples), balancing vectorization hardware efficiency and convergence stability.',
      category: 'Optimization',
      difficulty: 'Medium',
      hint: 'How many training samples are evaluated before each weight update?',
    },
    {
      id: 'fc-6',
      front: 'Why must Dropout be disabled during inference (model.eval())?',
      back: 'During inference, we want deterministic and maximally accurate predictions using all learned weights simultaneously. Leaving Dropout on would cause random drops and unstable predictions.',
      category: 'Regularization',
      difficulty: 'Easy',
      hint: 'Do we want random omissions during final evaluation?',
    },
  ],
  mindmap: [
    { id: 'root', label: 'Neural Networks & Deep Learning', parentId: null, description: 'Core discipline of modern artificial intelligence' },
    { id: 'arch', label: 'Architecture & Layers', parentId: 'root', description: 'Structural composition of deep networks' },
    { id: 'opt', label: 'Optimization & Training', parentId: 'root', description: 'Algorithms and mechanics of convergence' },
    { id: 'reg', label: 'Regularization & Generalization', parentId: 'root', description: 'Preventing overfitting and ensuring real-world performance' },
    { id: 'percept', label: 'Affine Neurons (Wx + b)', parentId: 'arch', description: 'Fundamental linear units' },
    { id: 'activations', label: 'Non-Linear Activations', parentId: 'arch', description: 'ReLU, GELU, Sigmoid, Softmax' },
    { id: 'backprop', label: 'Backpropagation Chain Rule', parentId: 'opt', description: 'Reverse-mode automatic differentiation' },
    { id: 'optimizers', label: 'Optimizers (Adam, SGD)', parentId: 'opt', description: 'Gradient descent with adaptive learning rates' },
    { id: 'dropout', label: 'Dropout & Weight Decay', parentId: 'reg', description: 'Co-adaptation prevention & L2 penalties' },
    { id: 'batchnorm', label: 'Batch Normalization', parentId: 'reg', description: 'Internal covariate shift reduction' },
  ],
};

export const sampleQuestionSuite: QuestionSuite = {
  id: 'quiz-neural-networks',
  studyMaterialId: 'deck-neural-networks',
  testTitle: 'Diagnostic Exam: Neural Networks & Backprop Mastery',
  topic: 'Neural Networks & Deep Learning',
  difficulty: 'Medium',
  estimatedTimeMinutes: 15,
  instructions:
    'Test your conceptual understanding, problem-solving, and diagnostic intuition across forward propagation, backpropagation, and training dynamics. Explanations are provided for all choices.',
  createdAt: Date.now() - 1800000,
  questions: [
    {
      id: 'q-1',
      type: 'mcq',
      difficulty: 'Medium',
      topicTag: 'Architecture',
      question:
        'A machine learning engineer constructs a 10-layer network where each hidden layer performs only linear matrix transformations (f(z) = z). What is the effective expressive capacity of this model?',
      options: [
        'Equivalent to a single-layer linear model, unable to separate non-linear decision boundaries',
        'Capable of learning piecewise linear boundaries like high-order decision trees',
        'Equal to a deep ReLU network because multiple matrix multiplications introduce dimensionality expansion',
        'Equivalent to a polynomial kernel of degree 10',
      ],
      correctAnswerIndex: 0,
      explanation:
        'Because matrix multiplication is associative and closed under multiplication, any sequence of linear mappings W10 · W9 ... W1 · x simplifies to a single equivalent matrix W_total · x. Without non-linearities, depth provides zero added representation capacity.',
      distractorExplanations: [
        'Correct! Matrix composition remains strictly linear.',
        'Piecewise linear boundaries require activation functions that bend or clamp (like ReLU).',
        'Matrix multiplication alone cannot introduce non-linearities, regardless of layer count.',
        'Polynomial transformations require explicit powers or kernel functions, not simple linear matrices.',
      ],
      hint: 'Recall linear algebra properties: what happens when you multiply 10 matrices together?',
    },
    {
      id: 'q-2',
      type: 'mcq',
      difficulty: 'Hard',
      topicTag: 'Activations & Gradients',
      question:
        'When training a deep network using Sigmoid activations, why do early layers (closer to the input) train significantly slower than layers near the output?',
      options: [
        'The maximum derivative of Sigmoid is 0.25; chaining multiple terms shrinks gradients exponentially toward the input',
        'Input data is unnormalized, which causes saturation only in initial layers',
        'The loss function only has direct access to the final layer, so backprop cannot reach layer 1',
        'Weights in early layers are initialized to zero by default',
      ],
      correctAnswerIndex: 0,
      explanation:
        'By the chain rule, each layer multiplies the gradient by σ\'(z). Since σ\'(z) <= 0.25, multiplying 10 such terms yields (0.25)^10 ≈ 9.5e-7. Consequently, the gradient reaching early layers shrinks to near zero (the vanishing gradient problem).',
      distractorExplanations: [
        'Correct! Multiplying values <= 0.25 repeatedly causes exponential decay.',
        'Input normalization helps, but Sigmoid saturation occurs throughout hidden activations regardless.',
        'Backprop reaches all layers mathematically, but the numeric values can vanish.',
        'Weights should never be initialized to zero (symmetry problem); they are initialized randomly.',
      ],
      hint: 'What is the maximum value of the derivative of the Sigmoid function?',
    },
    {
      id: 'q-3',
      type: 'scenario',
      difficulty: 'Hard',
      topicTag: 'Training Diagnostics',
      scenarioContext:
        'You are training an image classifier with Cross-Entropy loss. At epoch 5, your training loss drops to 0.05 and training accuracy reaches 99.4%. However, your validation loss begins rising sharply from 0.45 to 1.80, and validation accuracy plateaus at 78%.',
      question:
        'What diagnostic conclusion should you draw, and what is the most appropriate remedy to test first?',
      options: [
        'The model is severely overfitting; introduce Dropout, increase L2 weight decay, or collect/augment training data',
        'The learning rate is too low; increase the learning rate by a factor of 10 to escape local minima',
        'The model is underfitting; add 5 additional hidden layers to increase hypothesis capacity',
        'The loss function is invalid; switch from Cross-Entropy to Mean Squared Error',
      ],
      correctAnswerIndex: 0,
      explanation:
        'The classic hallmark of overfitting is diverging training and validation curves: training loss drops near zero while validation loss spikes. Regularization techniques like Dropout, data augmentation, and weight decay directly counter this.',
      distractorExplanations: [
        'Correct! High training accuracy with declining validation metric indicates severe overfitting.',
        'Increasing learning rate would exacerbate divergence and destabilize training.',
        'Adding more capacity would worsen overfitting further by giving the model more parameters to memorize noise.',
        'Cross-Entropy is the standard, mathematically optimal loss for classification; MSE is inappropriate here.',
      ],
      hint: 'Compare training performance vs. validation performance.',
    },
    {
      id: 'q-4',
      type: 'true-false',
      difficulty: 'Easy',
      topicTag: 'Regularization',
      question:
        'True or False: Dropout should remain active during the inference/prediction phase so the model can evaluate uncertainty.',
      statementIsTrue: false,
      explanation:
        'False. In standard deployment and inference, Dropout is switched OFF (e.g., model.eval()) so the model outputs deterministic predictions using the full ensemble of all trained neurons. (While Monte Carlo Dropout exists for specialized Bayesian uncertainty estimation, standard inference explicitly turns Dropout off).',
      hint: 'Think about whether you want random neurons dropping out when a patient or user needs a reliable answer.',
    },
    {
      id: 'q-5',
      type: 'short-answer',
      difficulty: 'Hard',
      topicTag: 'Optimization & Theory',
      question:
        'Explain why initializing all weights in a neural network to zero (W = 0) breaks gradient descent training, and describe how symmetry breaking fixes this.',
      sampleAnswer:
        'If all weights are initialized to zero, every neuron in a given hidden layer receives identical inputs, computes the exact same activation, and yields identical gradients during backpropagation. Consequently, every weight updates by the exact same delta, causing all neurons to remain clones of each other indefinitely (the symmetry problem). Symmetry breaking via random initialization (e.g. He or Xavier initialization with small Gaussian noise) ensures neurons compute different features and learn distinct representations.',
      keyPoints: [
        'Identical activations in hidden layer neurons',
        'Identical gradients during backpropagation',
        'Neurons update identically and cannot learn distinct features (symmetry problem)',
        'Random initialization breaks symmetry so each neuron specializes',
      ],
      rubric:
        'Full credit (90-100%): Mentions identical forward activations, identical backprop gradients, inability to learn distinct features, and random initialization breaking symmetry. Partial credit (50-80%): Explains that weights will be identical but misses the mathematical gradient link.',
      explanation:
        'Zero weight initialization leads to identical forward passes for all neurons in a layer, which produces identical backward gradients. Since all weights update by the identical value, the neurons never differentiate. Random weight initialization breaks this symmetry, allowing diverse feature detection.',
      hint: 'Consider what two parallel neurons would calculate if their weights and incoming inputs were 100% identical.',
    },
  ],
};
