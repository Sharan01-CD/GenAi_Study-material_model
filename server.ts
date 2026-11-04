import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));

// Server-side Gemini client factory with key sanitization
function getGeminiClient(): GoogleGenAI {
  const raw = process.env.GEMINI_API_KEY || '';
  const apiKey = raw.trim().replace(/^["']|["']$/g, '');

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_UNSET: Gemini API key is not configured. Please select your API key in the AI Studio Settings > Secrets panel.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(err: any, res: express.Response, defaultMsg: string) {
  const errMsg = err?.message || String(err);
  console.error(`${defaultMsg}:`, err);

  if (
    errMsg.includes('GEMINI_API_KEY_UNSET') ||
    errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
    errMsg.includes('API key not valid') ||
    errMsg.includes('UNAUTHENTICATED') ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('PERMISSION_DENIED')
  ) {
    return res.status(401).json({
      error: 'Gemini API key is missing or invalid. Please check that an active API key is selected in the AI Studio Settings > Secrets panel.',
    });
  }

  res.status(500).json({ error: errMsg || defaultMsg });
}

// Helper to sanitize JSON response from LLM
function parseGeminiJson<T = any>(rawText: string, fallback: T): T {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', err, rawText);
    return fallback;
  }
}

// Graceful retry helper for transient network or 503/429 demand spikes
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1200
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes('503') ||
        err?.message?.includes('429') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt <= maxRetries) {
        const jitter = Math.random() * 400;
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        console.warn(`Gemini API transient rate limit (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

// 0. Extract Text from Uploaded PDF or Text File
app.post('/api/study/extract-file-text', async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'No file content received' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const isPdf = mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      await parser.destroy();

      const cleanedText = (textResult.text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return res.json({
        success: true,
        text: cleanedText,
        numPages: textResult.total || textResult.pages?.length || 1,
        title: fileName || 'Uploaded Document',
      });
    } else {
      // Plain text, markdown, csv, or code
      const text = buffer.toString('utf-8');
      return res.json({
        success: true,
        text: text.trim(),
        numPages: 1,
        title: fileName || 'Uploaded Text',
      });
    }
  } catch (err: any) {
    console.error('File extraction error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract text from document' });
  }
});

// 1. Generate Full Study Material
app.post('/api/study/generate-material', async (req, res) => {
  try {
    const { topic, contextText, pdfBase64, educationLevel, studyGoal, language } = req.body;

    if (!topic && !contextText && !pdfBase64) {
      return res.status(400).json({ error: 'Please provide a topic, study text, or upload a PDF document.' });
    }

    const prompt = `You are a world-class academic tutor and cognitive learning specialist.
Generate high-retention study material for:
Topic / Subject: "${topic || 'Provided Study Context'}"
Education Level: ${educationLevel || 'Undergraduate / College'}
Specific Study Goal: ${studyGoal || 'Master core concepts and prepare for exams'}
Target Language: ${language || 'English'}
${contextText ? `Source Material / Syllabus Notes:\n"""\n${contextText.slice(0, 8000)}\n"""` : ''}

Create a thoroughly detailed, structured study guide formatted as valid JSON adhering to this exact schema:
{
  "title": string (concise engaging title),
  "overview": {
    "summary": string (3-4 sentences summarizing essence),
    "coreMentalModel": string (a vivid intuitive mental model or metaphor explaining how this system/concept works),
    "learningObjectives": string[] (3-5 clear actionable objectives)
  },
  "modules": [
    {
      "id": string (e.g. "mod-1"),
      "title": string,
      "summary": string,
      "concepts": [
        {
          "name": string,
          "explanation": string (thorough, clear paragraph),
          "analogy": string (relatable analogy),
          "keyTakeaway": string (one-sentence punchy takeaway),
          "commonPitfalls": string (frequent misconceptions or traps to avoid),
          "examples": string[] (concrete practical examples or applications)
        }
      ]
    }
  ],
  "cheatSheet": {
    "keyFormulasOrRules": string[] (4-6 crucial formulas, rules, or laws),
    "mnemonics": [
      { "phrase": string, "meaning": string }
    ],
    "highYieldQuickFacts": string[] (6-8 rapid-fire facts that frequently appear in tests),
    "crucialDefinitions": [
      { "term": string, "definition": string }
    ]
  },
  "flashcards": [
    {
      "id": string (e.g. "fc-1"),
      "front": string (clear question, term, or prompt),
      "back": string (concise, precise answer with key reasoning),
      "category": string,
      "difficulty": "Easy" | "Medium" | "Hard",
      "hint": string
    }
  ],
  "mindmap": [
    {
      "id": string (e.g. "root", "sub-1", "leaf-1"),
      "label": string,
      "parentId": string | null,
      "description": string
    }
  ]
}

Generate concise, high-yield content adhering to schema. Output pure valid JSON.`;

    const contentParts: any[] = [];
    // Only send raw pdfBase64 if contextText is not already extracted
    if (pdfBase64 && (!contextText || contextText.length < 50)) {
      contentParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }
    contentParts.push({ text: prompt });

    const response = await callGeminiWithRetry(() =>
      getGeminiClient().models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: contentParts },
        config: {
          systemInstruction: 'You are an educational AI. Fast, accurate active recall material generator. Output JSON only.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const parsed = parseGeminiJson<any>(response.text || '{}', null);
    if (!parsed || !parsed.title) {
      throw new Error('Invalid study material structure returned by model.');
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    handleGeminiError(error, res, 'Error generating study material');
  }
});

// 2. Generate Practice Questions & Exam Suite (Fast)
app.post('/api/study/generate-questions', async (req, res) => {
  try {
    const { topic, contextSummary, contextText, questionTypes, count = 6, difficulty = 'Medium', focusArea } = req.body;

    const requestedTypes = Array.isArray(questionTypes) && questionTypes.length > 0
      ? questionTypes.join(', ')
      : 'Multiple Choice (MCQ), Scenario-based Application, True/False with justification';

    const prompt = `You are a master examination question writer.
Create a high-yield diagnostic practice test based on:
Topic: "${topic}"
Difficulty: ${difficulty}
Target Focus: ${focusArea || 'Core concepts and practical application'}
Total Questions requested: ${count}
Question Types to include: ${requestedTypes}
${contextText ? `Source Material / Document Excerpt:\n"""\n${contextText.slice(0, 8000)}\n"""` : ''}
${contextSummary ? `Context Summary:\n"""\n${contextSummary.slice(0, 2500)}\n"""` : ''}

Generate JSON matching this exact structure:
{
  "testTitle": string,
  "difficulty": string,
  "estimatedTimeMinutes": number,
  "instructions": string,
  "questions": [
    {
      "id": string (e.g. "q-1"),
      "type": "mcq" | "short-answer" | "scenario" | "true-false",
      "difficulty": "Easy" | "Medium" | "Hard",
      "topicTag": string,
      "question": string,
      "scenarioContext": string (optional, context story if type is 'scenario'),
      "options": string[] (mandatory for mcq and scenario: exactly 4 plausible options),
      "correctAnswerIndex": number (0-3, index of correct option if mcq or scenario),
      "explanation": string (in-depth rationale for the correct answer),
      "distractorExplanations": string[] (optional for mcq: why option 0, 1, 2, 3 were right/wrong),
      "sampleAnswer": string (for short-answer: ideal model answer),
      "keyPoints": string[] (for short-answer: essential concepts required for full credit),
      "rubric": string (for short-answer: grading criteria),
      "statementIsTrue": boolean (for true-false: whether statement is true),
      "hint": string
    }
  ]
}

Quality Rules:
- Distractors in MCQs must be plausible based on student misconceptions.
- Write clear, unambiguous questions.
- Output pure valid JSON.`;

    const response = await callGeminiWithRetry(() =>
      getGeminiClient().models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an authoritative examination writer. Output clean, valid JSON only.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const parsed = parseGeminiJson<any>(response.text || '{}', null);
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Failed to generate valid practice questions.');
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    handleGeminiError(error, res, 'Error generating questions');
  }
});

// 3. AI Instant Evaluation for Free-Response Answers
app.post('/api/study/evaluate-answer', async (req, res) => {
  try {
    const { question, sampleAnswer, rubric, keyPoints, userAnswer } = req.body;

    if (!userAnswer || !userAnswer.trim()) {
      return res.status(400).json({ error: 'Please enter your answer to evaluate.' });
    }

    const prompt = `You are a fair, encouraging, and rigorous academic professor grading a student's written response.

Question:
"${question}"

Ideal Exemplar Answer:
"${sampleAnswer || 'N/A'}"

Key Grading Criteria / Required Concepts:
${Array.isArray(keyPoints) ? keyPoints.map((k: string) => `- ${k}`).join('\n') : 'Thorough understanding of the mechanism and principles.'}

Grading Rubric:
"${rubric || 'Full credit for identifying core mechanisms and applying them correctly; partial credit for incomplete explanations.'}"

Student's Submitted Answer:
"""
${userAnswer}
"""

Evaluate this response and output JSON matching:
{
  "score": number (0 to 100),
  "grade": "Excellent" | "Good" | "Partial" | "Needs Improvement",
  "feedback": string (2-3 sentences of empathetic constructive feedback),
  "strengths": string[] (2-3 points the student answered well or demonstrated accurate knowledge of),
  "missingOrWeakPoints": string[] (concepts omitted, imprecise, or misunderstood),
  "modelAnswerComparison": string (brief note comparing student phrasing with optimal technical phrasing),
  "encouragement": string (motivational closing sentence)
}`;

    const response = await callGeminiWithRetry(() =>
      getGeminiClient().models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an encouraging academic evaluator. Grade objectively against rubric, give specific actionable feedback, and output JSON only.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const parsed = parseGeminiJson<any>(response.text || '{}', null);
    if (!parsed || typeof parsed.score !== 'number') {
      throw new Error('Invalid evaluation response from model.');
    }

    res.json({ success: true, data: parsed });
  } catch (error: any) {
    handleGeminiError(error, res, 'Error evaluating answer');
  }
});

// 4. On-demand Concept Deep Dive & Clarification (ELI5 / Analogy / Code / Real-world)
app.post('/api/study/explain-concept', async (req, res) => {
  try {
    const { concept, context, style = 'eli5' } = req.body;

    if (!concept) {
      return res.status(400).json({ error: 'Concept name is required' });
    }

    let stylePrompt = 'Explain this concept like I am 5 years old using a memorable real-life analogy, simple vocabulary, and zero jargon.';
    if (style === 'deep-dive') {
      stylePrompt = 'Provide an advanced, rigorous academic explanation covering underlying mechanics, mathematical/logical formulation, and edge cases.';
    } else if (style === 'analogy') {
      stylePrompt = 'Provide two distinct, creative, and memorable analogies that bridge this abstract concept to everyday sensory experiences.';
    } else if (style === 'practical-example') {
      stylePrompt = 'Provide a step-by-step real-world case study or worked practical example showing how industry professionals or researchers use this.';
    }

    const prompt = `Topic / Concept: "${concept}"
Context within broader topic: "${context || 'General Science / Technology / Academics'}"
Instruction: ${stylePrompt}

Format the response as JSON:
{
  "concept": "${concept}",
  "style": "${style}",
  "headline": string (punchy intuitive takeaway),
  "content": string (formatted in clean markdown paragraphs),
  "quickCheckQuestion": string (a quick 1-sentence thought experiment to check understanding),
  "quickCheckAnswer": string (the answer to the thought experiment)
}`;

    const response = await callGeminiWithRetry(() =>
      getGeminiClient().models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: 'You are an engaging tutor inspired by Richard Feynman. Make complex ideas intuitive without sacrificing truth. Output JSON only.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const parsed = parseGeminiJson(response.text || '{}', null);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    handleGeminiError(error, res, 'Error explaining concept');
  }
});

// 5. Mount Vite or static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CogniLearn Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
