import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  FileText,
  Sliders,
  CheckCircle2,
  Loader2,
  Flame,
  ArrowRight,
  Globe,
  Layers,
  Zap,
  Upload,
  FileUp,
  X,
  FileCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Timer,
  Clock,
} from 'lucide-react';
import { generateStudyMaterial, generateQuestions, extractFileText } from '../services/api';
import { StudyMaterial, QuestionSuite } from '../types/study';

interface StudyGeneratorProps {
  onGenerated: (material: StudyMaterial, questionSuite?: QuestionSuite, autoSwitchToQuiz?: boolean) => void;
}

const PRESET_TOPICS = [
  {
    title: 'Quantum Computing & Qubits',
    category: 'Physics & CS',
    level: 'Undergraduate / College',
    goal: 'Conceptual Intuition & Superposition',
  },
  {
    title: 'Cellular Respiration & ATP Synthesis',
    category: 'Biochemistry',
    level: 'High School (AP/IB)',
    goal: 'Exam Cram & High-Yield',
  },
  {
    title: 'Microservices & Distributed Consensus (Raft/Paxos)',
    category: 'System Design',
    level: 'Professional / Certification',
    goal: 'Architecture & Edge Cases',
  },
  {
    title: 'Macroeconomics: Monetary Policy & Inflation',
    category: 'Economics',
    level: 'Undergraduate / College',
    goal: 'In-depth Mastery & Principles',
  },
  {
    title: 'Organic Chemistry: SN1 vs SN2 Reactions',
    category: 'Chemistry',
    level: 'Undergraduate / College',
    goal: 'Exam Problem Solving & Stereochemistry',
  },
  {
    title: 'World War II: Turning Points & Geopolitics',
    category: 'History',
    level: 'High School (AP/IB)',
    goal: 'Critical Analysis & Timelines',
  },
];

const EDUCATION_LEVELS = [
  'High School (AP / IB / Standard)',
  'Undergraduate / College',
  'Graduate / Master’s & PhD',
  'Professional / Board Certification (USMLE, CFA, AWS, Bar Exam)',
  'Curious General Learner',
];

const STUDY_GOALS = [
  'In-depth Mastery & Foundations',
  'Rapid Exam Cram / High-Yield',
  'Interview & Practical Problem Solving',
  'Intuitive Mental Models & Feynman Technique',
];

export const StudyGenerator: React.FC<StudyGeneratorProps> = ({ onGenerated }) => {
  const [topic, setTopic] = useState<string>('');
  const [contextText, setContextText] = useState<string>('');
  const [educationLevel, setEducationLevel] = useState<string>('Undergraduate / College');
  const [studyGoal, setStudyGoal] = useState<string>('In-depth Mastery & Foundations');
  const [language, setLanguage] = useState<string>('English');
  const [generateQuestionsAlso, setGenerateQuestionsAlso] = useState<boolean>(true);
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // PDF & File Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    sizeKb: number;
    numPages: number;
    base64: string;
  } | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showExtractedPreview, setShowExtractedPreview] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Timer while generating
  useEffect(() => {
    let interval: any = null;
    if (loading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.5).toFixed(1));
      }, 500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSelectPreset = (preset: typeof PRESET_TOPICS[0]) => {
    setTopic(preset.title);
    setEducationLevel(preset.level);
    setStudyGoal(preset.goal);
  };

  const handleFileProcess = async (file: File) => {
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      setError('File is too large. Please upload documents under 30MB.');
      return;
    }

    setIsExtractingFile(true);
    setError(null);

    try {
      const extracted = await extractFileText(file);
      setUploadedFile({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        numPages: extracted.numPages,
        base64: extracted.fileBase64,
      });

      // Populate context text with extracted plain text
      setContextText(extracted.text);

      // If topic is empty, suggest from title or file name
      if (!topic.trim()) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/chapter|notes|lecture|syllabus|pdf/gi, '')
          .trim();
        if (cleanName) {
          setTopic(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to parse file. You can still paste text directly below.');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setShowExtractedPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 1. FAST MODE: Generates practice questions directly in ~3-4 seconds!
  const handleGenerateQuestionsFast = async () => {
    if (!topic.trim() && !contextText.trim() && !uploadedFile) {
      setError('Please provide a subject topic, paste notes, or upload a PDF document.');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep('⚡ Rapid Question Engine: Formulating diagnostic test items...');

    const targetTopic = topic.trim() || uploadedFile?.name || 'Document Assessment';
    const trimmedContext = contextText.trim();

    try {
      // 1. Generate questions directly and quickly
      const questionsPromise = generateQuestions({
        topic: targetTopic,
        contextText: trimmedContext.slice(0, 8000),
        count: questionCount,
        difficulty: 'Medium',
      });

      // 2. Generate a lightweight instant companion guide in parallel
      const miniGuidePromise = generateStudyMaterial({
        topic: targetTopic,
        contextText: trimmedContext.slice(0, 6000),
        educationLevel,
        studyGoal,
        language,
      }).catch(() => ({
        id: `study-${Date.now()}`,
        createdAt: Date.now(),
        topic: targetTopic,
        educationLevel,
        studyGoal,
        language,
        title: `Study Guide: ${targetTopic}`,
        overview: {
          summary: `Study and practice suite synthesized from "${targetTopic}".`,
          coreMentalModel: 'Mastery through active recall and continuous diagnostic testing.',
          learningObjectives: ['Comprehend key principles', 'Apply knowledge in test scenarios'],
        },
        modules: [],
        cheatSheet: {
          keyFormulasOrRules: [],
          mnemonics: [],
          highYieldQuickFacts: [],
          crucialDefinitions: [],
        },
        flashcards: [],
        mindmap: [],
      }));

      const [questionSuite, material] = await Promise.all([questionsPromise, miniGuidePromise]);

      setLoadingStep('Ready! Launching test session...');
      setTimeout(() => {
        onGenerated(material, questionSuite, true); // true = auto-switch directly to quiz!
      }, 200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // 2. FULL MODE: Generates Full Package (Guide + Flashcards + Quiz) in Parallel
  const handleGenerateFull = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() && !contextText.trim() && !uploadedFile) {
      setError('Please provide a subject topic, paste notes, or upload a PDF document.');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep('⚡ Parallel Engine: Synthesizing study guide & exam questions simultaneously...');

    const targetTopic = topic.trim() || uploadedFile?.name || 'Uploaded Document';
    const trimmedContext = contextText.trim();

    try {
      // Execute BOTH requests concurrently via Promise.all (halves waiting time!)
      const materialPromise = generateStudyMaterial({
        topic: targetTopic,
        contextText: trimmedContext.slice(0, 8000),
        educationLevel,
        studyGoal,
        language,
      });

      const questionsPromise = generateQuestionsAlso
        ? generateQuestions({
            topic: targetTopic,
            contextText: trimmedContext.slice(0, 8000),
            count: questionCount,
            difficulty: 'Medium',
          })
        : Promise.resolve(undefined);

      const [material, questionSuite] = await Promise.all([materialPromise, questionsPromise]);

      setLoadingStep('Complete! Finalizing your study suite...');
      setTimeout(() => {
        onGenerated(material, questionSuite, false);
      }, 200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate study suite. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Welcome */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>High-Speed Generative AI Study Suite</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          What would you like to master today?
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Upload any <strong>PDF textbook or lecture notes</strong>. Powered by low-latency parallel processing to synthesize questions and study materials in seconds.
        </p>
      </div>

      {/* Preset Inspiration Chips */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Popular Study Topics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {PRESET_TOPICS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group"
            >
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                {preset.category}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white mt-0.5 line-clamp-1">
                {preset.title}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>{preset.level}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerateFull} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* PDF & Document Upload Zone */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload PDF, Textbook Excerpt, or Lecture Document</span>
            </span>
            <span className="text-xs font-normal text-slate-400">PDF, TXT, MD up to 30MB</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
            accept=".pdf,.txt,.md"
            className="hidden"
          />

          {!uploadedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              {isExtractingFile ? (
                <div className="py-4 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">
                    Extracting and analyzing document text...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      <span className="text-indigo-400 underline">Click to upload PDF</span> or drag and drop here
                    </p>
                    <p className="text-xs text-slate-500">
                      Textbook chapters, lecture slides, syllabus outlines, and research notes
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-500/40 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    PDF
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white max-w-xs sm:max-w-md truncate">
                        {uploadedFile.name}
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Processed
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {uploadedFile.sizeKb} KB &bull; {uploadedFile.numPages} Page{uploadedFile.numPages > 1 ? 's' : ''} &bull; {contextText.length.toLocaleString()} characters extracted
                    </p>
                  </div>
                </div>

                {/* Direct 1-Click Fast Quiz Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateQuestionsFast}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Generate Questions (Fast ~4s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title={showExtractedPreview ? 'Hide extracted text' : 'Preview extracted text'}
                  >
                    {showExtractedPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove uploaded document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Extracted text preview drawer */}
              {showExtractedPreview && (
                <div className="mt-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Extracted Text Preview:</span>
                    <span>Editable below</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 max-h-40 overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                    {contextText || 'No text content.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Topic Input */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Subject or Topic Title
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Distributed Consensus Algorithms, Cellular Respiration, Calculus III..."
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* Source Text / Syllabus Notes (Optional / Editable) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Or Paste Raw Notes / Syllabus Text Directly</span>
            </label>
            <span className="text-xs text-slate-500">
              {contextText.length} characters
            </span>
          </div>
          <textarea
            rows={3}
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Paste raw lecture transcripts, meeting notes, PDF textbook excerpts, or syllabus bullet points here. CogniLearn will digest and synthesize them into structured study modules."
            className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 resize-none leading-relaxed"
          />
        </div>

        {/* Customization Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {/* Education Level */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Target Academic Level
            </label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Study Goal */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Learning Focus &amp; Goal
            </label>
            <select
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STUDY_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>

          {/* Question Count */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Question Count
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={5}>5 Questions (Fastest ~3s)</option>
              <option value={8}>8 Questions (Standard ~5s)</option>
              <option value={12}>12 Questions (Comprehensive)</option>
            </select>
          </div>
        </div>

        {/* Live Loading Stopwatch & Status */}
        {loading && (
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>{loadingStep}</span>
              </span>
              <span className="font-mono text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{elapsedSeconds}s</span>
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500 h-full animate-pulse w-3/4 rounded-full" />
            </div>
          </div>
        )}

        {/* Dual Action Buttons: Fast Questions vs Full Suite */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Button 1: Fast Questions Only */}
          <button
            type="button"
            onClick={handleGenerateQuestionsFast}
            disabled={loading || (!topic.trim() && !contextText.trim() && !uploadedFile)}
            className="py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 text-white shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>⚡ Generate Questions Only (Fastest ~3-5s)</span>
          </button>

          {/* Button 2: Full Study Kit */}
          <button
            type="submit"
            disabled={loading || (!topic.trim() && !contextText.trim() && !uploadedFile)}
            className="py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Full Study Kit (Guide + Cards + Quiz)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
