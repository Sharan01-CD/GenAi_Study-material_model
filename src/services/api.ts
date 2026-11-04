import {
  StudyMaterial,
  QuestionSuite,
  AnswerEvaluation,
  ConceptExplanation,
} from '../types/study';

export async function extractFileText(file: File): Promise<{
  text: string;
  numPages: number;
  title: string;
  fileBase64: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        const res = await fetch('/api/study/extract-file-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
            fileName: file.name,
          }),
        });
        const resJson = await res.json();
        if (!res.ok || !resJson.success) {
          throw new Error(resJson.error || 'Failed to extract document text');
        }
        resolve({
          text: resJson.text || '',
          numPages: resJson.numPages || 1,
          title: resJson.title || file.name,
          fileBase64: base64Data,
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from system'));
    reader.readAsDataURL(file);
  });
}

async function handleResponse<T = any>(response: Response, defaultError: string): Promise<T> {
  const resJson = await response.json().catch(() => null);
  if (!response.ok || !resJson?.success) {
    const errorStr = typeof resJson?.error === 'string' ? resJson.error : JSON.stringify(resJson?.error || '');
    if (
      response.status === 401 ||
      errorStr.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
      errorStr.includes('API key not valid') ||
      errorStr.includes('UNAUTHENTICATED') ||
      errorStr.includes('GEMINI_API_KEY')
    ) {
      throw new Error(
        'Gemini API key is not configured or invalid. Please check that an active API key is selected in the AI Studio Settings > Secrets panel.'
      );
    }
    throw new Error(resJson?.error || defaultError);
  }
  return resJson.data;
}

export async function generateStudyMaterial(params: {
  topic: string;
  contextText?: string;
  pdfBase64?: string;
  educationLevel?: string;
  studyGoal?: string;
  language?: string;
}): Promise<StudyMaterial> {
  const response = await fetch('/api/study/generate-material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await handleResponse<any>(response, 'Failed to generate study material');

  return {
    ...data,
    id: `study-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    topic: params.topic || 'Custom Notes',
    educationLevel: params.educationLevel || 'Undergraduate',
    studyGoal: params.studyGoal || 'Mastery',
    language: params.language || 'English',
  };
}

export async function generateQuestions(params: {
  topic: string;
  contextSummary?: string;
  contextText?: string;
  questionTypes?: string[];
  count?: number;
  difficulty?: string;
  focusArea?: string;
  studyMaterialId?: string;
}): Promise<QuestionSuite> {
  const response = await fetch('/api/study/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await handleResponse<any>(response, 'Failed to generate practice questions');

  return {
    ...data,
    id: `quiz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studyMaterialId: params.studyMaterialId,
    topic: params.topic,
    createdAt: Date.now(),
  };
}

export async function evaluateAnswer(params: {
  question: string;
  sampleAnswer?: string;
  rubric?: string;
  keyPoints?: string[];
  userAnswer: string;
}): Promise<AnswerEvaluation> {
  const response = await fetch('/api/study/evaluate-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await handleResponse<AnswerEvaluation>(response, 'Failed to evaluate answer');
}

export async function explainConcept(params: {
  concept: string;
  context?: string;
  style?: 'eli5' | 'deep-dive' | 'analogy' | 'practical-example';
}): Promise<ConceptExplanation> {
  const response = await fetch('/api/study/explain-concept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await handleResponse<ConceptExplanation>(response, 'Failed to explain concept');
}
