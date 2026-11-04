export interface ConceptDetail {
  name: string;
  explanation: string;
  analogy: string;
  keyTakeaway: string;
  commonPitfalls: string;
  examples: string[];
}

export interface StudyModule {
  id: string;
  title: string;
  summary: string;
  concepts: ConceptDetail[];
}

export interface CheatSheet {
  keyFormulasOrRules: string[];
  mnemonics: Array<{ phrase: string; meaning: string }>;
  highYieldQuickFacts: string[];
  crucialDefinitions: Array<{ term: string; definition: string }>;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hint?: string;
  // Local review state
  masteryLevel?: 'unseen' | 'learning' | 'reviewing' | 'mastered';
  lastReviewed?: number;
}

export interface MindmapNode {
  id: string;
  label: string;
  parentId: string | null;
  description: string;
}

export interface StudyMaterial {
  id: string;
  createdAt: number;
  topic: string;
  educationLevel: string;
  studyGoal: string;
  language: string;
  title: string;
  overview: {
    summary: string;
    coreMentalModel: string;
    learningObjectives: string[];
  };
  modules: StudyModule[];
  cheatSheet: CheatSheet;
  flashcards: Flashcard[];
  mindmap: MindmapNode[];
}

export interface PracticeQuestion {
  id: string;
  type: 'mcq' | 'short-answer' | 'scenario' | 'true-false';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topicTag: string;
  question: string;
  scenarioContext?: string;
  options?: string[];
  correctAnswerIndex?: number;
  explanation: string;
  distractorExplanations?: string[];
  distractorRationales?: Record<string, string>;
  sampleAnswer?: string;
  keyPoints?: string[];
  rubric?: string;
  statementIsTrue?: boolean;
  hint?: string;
}

export interface QuestionSuite {
  id: string;
  studyMaterialId?: string;
  testTitle: string;
  topic: string;
  difficulty: string;
  estimatedTimeMinutes: number;
  instructions: string;
  questions: PracticeQuestion[];
  createdAt: number;
}

export interface AnswerEvaluation {
  score: number;
  grade: 'Excellent' | 'Good' | 'Partial' | 'Needs Improvement';
  feedback: string;
  strengths: string[];
  missingOrWeakPoints: string[];
  modelAnswerComparison: string;
  encouragement: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  topic: string;
  startedAt: number;
  completedAt: number;
  timeSpentSeconds: number;
  answers: Record<string, any>;
  evaluations: Record<string, AnswerEvaluation>;
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  flaggedQuestionIds: string[];
}

export interface ConceptExplanation {
  concept: string;
  style: 'eli5' | 'deep-dive' | 'analogy' | 'practical-example';
  headline: string;
  content: string;
  quickCheckQuestion: string;
  quickCheckAnswer: string;
}
