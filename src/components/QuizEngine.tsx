import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flag,
  RotateCcw,
  Sparkles,
  Download,
  Send,
  Loader2,
  Award,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  FileText,
  Sliders,
  Check,
  Zap,
  List,
  LayoutList,
  PlayCircle,
  Search,
  Filter,
  Eye,
  BookOpen,
} from 'lucide-react';
import { QuestionSuite, PracticeQuestion, AnswerEvaluation } from '../types/study';
import { evaluateAnswer, generateQuestions } from '../services/api';
import { exportQuestionsToMarkdown, triggerDownload } from '../utils/export';

interface QuizEngineProps {
  suite: QuestionSuite;
  onUpdateSuite?: (newSuite: QuestionSuite) => void;
  topicTitle?: string;
  onOpenExplainer?: (concept: string) => void;
  initialAnswers?: Record<string, any>;
  onAnswersChanged?: (answers: Record<string, any>) => void;
  onQuizCompleted?: (attempt: {
    scorePercentage: number;
    correctCount: number;
    totalCount: number;
    timestamp: number;
    mode: 'practice' | 'exam';
  }) => void;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({
  suite: initialSuite,
  onUpdateSuite,
  topicTitle,
  onOpenExplainer,
  initialAnswers = {},
  onAnswersChanged,
  onQuizCompleted,
}) => {
  const [suite, setSuite] = useState<QuestionSuite>(initialSuite);
  const [testMode, setTestMode] = useState<'practice' | 'exam'>('practice');
  const [viewFormat, setViewFormat] = useState<'interactive' | 'list'>('interactive');
  const [listFilterType, setListFilterType] = useState<string>('all');
  const [listDifficulty, setListDifficulty] = useState<string>('all');
  const [listSearch, setListSearch] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>(initialAnswers);
  const [flaggedIds, setFlaggedIds] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(initialSuite.estimatedTimeMinutes * 60);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});

  // Free-response AI evaluation state
  const [evaluatingMap, setEvaluatingMap] = useState<Record<string, boolean>>({});
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>({});
  const [evalError, setEvalError] = useState<Record<string, string>>({});

  // Question generator modal / drawer inside Quiz
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<boolean>(false);
  const [genDifficulty, setGenDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [genCount, setGenCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    setSuite(initialSuite);
    setCurrentIndex(0);
    setUserAnswers({});
    setFlaggedIds({});
    setIsSubmitted(false);
    setTimeLeft(initialSuite.estimatedTimeMinutes * 60);
    setTimerActive(false);
    setEvaluations({});
  }, [initialSuite]);

  // Countdown timer in exam mode
  useEffect(() => {
    let interval: any = null;
    if (timerActive && !isSubmitted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isSubmitted, timeLeft]);

  const questions = suite.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => {
      const updated = { ...prev, [questionId]: optionIndex };
      onAnswersChanged?.(updated);
      return updated;
    });
  };

  const handleSelectTrueFalse = (questionId: string, value: boolean) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      onAnswersChanged?.(updated);
      return updated;
    });
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => {
      const updated = { ...prev, [questionId]: text };
      onAnswersChanged?.(updated);
      return updated;
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedIds((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleEvaluateShortAnswer = async (q: PracticeQuestion) => {
    const writtenText = userAnswers[q.id];
    if (!writtenText || !writtenText.trim()) return;

    setEvaluatingMap((prev) => ({ ...prev, [q.id]: true }));
    setEvalError((prev) => ({ ...prev, [q.id]: '' }));

    try {
      const evaluation = await evaluateAnswer({
        question: q.question,
        sampleAnswer: q.sampleAnswer,
        rubric: q.rubric,
        keyPoints: q.keyPoints,
        userAnswer: writtenText,
      });

      setEvaluations((prev) => ({
        ...prev,
        [q.id]: evaluation,
      }));
    } catch (err: any) {
      setEvalError((prev) => ({
        ...prev,
        [q.id]: err.message || 'Failed to evaluate answer',
      }));
    } finally {
      setEvaluatingMap((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    setTimerActive(false);

    // Calculate score
    let score = 0;
    let scorableQuestions = 0;

    questions.forEach((q) => {
      const answer = userAnswers[q.id];
      if (q.type === 'mcq' || q.type === 'scenario') {
        scorableQuestions++;
        if (answer === q.correctAnswerIndex) score++;
      } else if (q.type === 'true-false') {
        scorableQuestions++;
        if (answer === q.statementIsTrue) score++;
      } else if (q.type === 'short-answer') {
        scorableQuestions++;
        const ev = evaluations[q.id];
        if (ev) {
          score += ev.score / 100;
        }
      }
    });

    const percent = scorableQuestions > 0 ? Math.round((score / scorableQuestions) * 100) : 0;
    if (percent >= 70) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    onQuizCompleted?.({
      scorePercentage: percent,
      correctCount: Math.round(score),
      totalCount: scorableQuestions,
      timestamp: Date.now(),
      mode: testMode,
    });
  };

  const handleRestart = () => {
    setUserAnswers({});
    setFlaggedIds({});
    setIsSubmitted(false);
    setTimeLeft(suite.estimatedTimeMinutes * 60);
    setTimerActive(testMode === 'exam');
    setCurrentIndex(0);
  };

  const handleRetakeMissed = () => {
    const missedQuestions = questions.filter((q) => {
      const ans = userAnswers[q.id];
      if (q.type === 'mcq' || q.type === 'scenario') {
        return ans !== q.correctAnswerIndex;
      }
      if (q.type === 'true-false') {
        return ans !== q.statementIsTrue;
      }
      if (q.type === 'short-answer') {
        const ev = evaluations[q.id];
        return !ev || ev.score < 70;
      }
      return false;
    });

    if (missedQuestions.length === 0) return;

    const newSuite: QuestionSuite = {
      ...suite,
      id: `quiz-missed-${Date.now()}`,
      testTitle: `Targeted Review: Missed Questions (${missedQuestions.length})`,
      questions: missedQuestions,
    };

    setSuite(newSuite);
    setUserAnswers({});
    setFlaggedIds({});
    setIsSubmitted(false);
    setCurrentIndex(0);
    onUpdateSuite?.(newSuite);
  };

  const handleGenerateCustomQuestions = async () => {
    setIsGenerating(true);
    try {
      const newSuite = await generateQuestions({
        topic: suite.topic || topicTitle || 'Current Subject',
        count: genCount,
        difficulty: genDifficulty,
      });
      setSuite(newSuite);
      setUserAnswers({});
      setFlaggedIds({});
      setIsSubmitted(false);
      setCurrentIndex(0);
      setIsGeneratingCustom(false);
      onUpdateSuite?.(newSuite);
    } catch (err: any) {
      alert(err.message || 'Failed to generate additional questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExam = () => {
    const md = exportQuestionsToMarkdown(suite);
    triggerDownload(md, `${suite.testTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, 'text/markdown');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Score Calculation
  let totalScoreCount = 0;
  let correctCount = 0;
  questions.forEach((q) => {
    const ans = userAnswers[q.id];
    if (q.type === 'mcq' || q.type === 'scenario') {
      totalScoreCount++;
      if (ans === q.correctAnswerIndex) correctCount++;
    } else if (q.type === 'true-false') {
      totalScoreCount++;
      if (ans === q.statementIsTrue) correctCount++;
    } else if (q.type === 'short-answer') {
      totalScoreCount++;
      const ev = evaluations[q.id];
      if (ev && ev.score >= 70) correctCount++;
    }
  });

  const finalPercentage = totalScoreCount > 0 ? Math.round((correctCount / totalScoreCount) * 100) : 0;

  if (!questions.length || !currentQ) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <p>No questions currently loaded in this suite.</p>
        <button
          onClick={() => setIsGeneratingCustom(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white"
        >
          Generate Questions with AI
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Test Header Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {suite.difficulty} Difficulty
              </span>
              <span className="text-xs text-slate-400">
                {questions.length} Diagnostic Questions
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {suite.testTitle}
            </h2>
          </div>

          {/* Test Mode Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Format Selector */}
            <div className="flex p-1 rounded-xl bg-slate-800 border border-slate-700">
              <button
                onClick={() => setViewFormat('interactive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewFormat === 'interactive'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Interactive Quiz</span>
              </button>
              <button
                onClick={() => setViewFormat('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewFormat === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>View All Questions ({questions.length})</span>
              </button>
            </div>

            {viewFormat === 'interactive' && !isSubmitted && (
              <div className="flex p-1 rounded-xl bg-slate-800 border border-slate-700">
                <button
                  onClick={() => {
                    setTestMode('practice');
                    setTimerActive(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    testMode === 'practice'
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => {
                    setTestMode('exam');
                    setTimerActive(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    testMode === 'exam'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Timed Exam
                </button>
              </div>
            )}

            <button
              onClick={handleDownloadExam}
              title="Download Exam as Markdown"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsGeneratingCustom(!isGeneratingCustom)}
              title="Generate new questions"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>More Questions</span>
            </button>
          </div>
        </div>

        {/* List View Search & Filter Bar */}
        {viewFormat === 'list' && (
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search questions, scenarios, concepts..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={listFilterType}
                onChange={(e) => setListFilterType(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Question Types</option>
                <option value="mcq">Multiple Choice</option>
                <option value="scenario">Scenario Cases</option>
                <option value="true-false">True / False</option>
                <option value="short-answer">Short Answer</option>
              </select>
              <select
                value={listDifficulty}
                onChange={(e) => setListDifficulty(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
        )}

        {/* Exam Timer & Status */}
        {viewFormat === 'interactive' && testMode === 'exam' && !isSubmitted && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Time Remaining: {formatTimer(timeLeft)}</span>
            </div>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="text-xs text-amber-200 hover:text-white font-medium underline"
            >
              {timerActive ? 'Pause Timer' : 'Resume Timer'}
            </button>
          </div>
        )}

        {/* Question Navigation Grid Pills (Interactive Mode Only) */}
        {viewFormat === 'interactive' && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1">
            {questions.map((q, idx) => {
              const hasAnswer = userAnswers[q.id] !== undefined && userAnswers[q.id] !== '';
              const isFlagged = flaggedIds[q.id];
              const isCurrent = idx === currentIndex;

              let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

              if (isSubmitted) {
                const ans = userAnswers[q.id];
                const isCorrect =
                  (q.type === 'mcq' && ans === q.correctAnswerIndex) ||
                  (q.type === 'scenario' && ans === q.correctAnswerIndex) ||
                  (q.type === 'true-false' && ans === q.statementIsTrue) ||
                  (q.type === 'short-answer' && evaluations[q.id]?.score >= 70);

                badgeStyle = isCorrect
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              } else if (hasAnswer) {
                badgeStyle = 'bg-indigo-600 text-white border-indigo-500';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative shrink-0 w-8 h-8 rounded-lg text-xs font-bold border transition-all ${badgeStyle} ${
                    isCurrent ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Generator Drawer for Custom Questions */}
      {isGeneratingCustom && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Generate Additional Questions</span>
            </h3>
            <button
              onClick={() => setIsGeneratingCustom(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setGenDifficulty(diff)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      genDifficulty === diff
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Question Count
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setGenCount(cnt)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      genCount === cnt
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateCustomQuestions}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-md transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting psychometric exam questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Generate Questions with Gemini 3.8 Flash</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Test Submission Summary Banner */}
      {isSubmitted && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Award className="w-4 h-4" />
                <span>Official Assessment Scorecard</span>
              </div>
              <h3 className="text-2xl font-extrabold text-white">
                {finalPercentage >= 80 ? 'Mastery Achieved! 🏆' : finalPercentage >= 60 ? 'Solid Comprehension 👍' : 'Needs Further Review 📖'}
              </h3>
              <p className="text-xs text-slate-400">
                You correctly answered {correctCount} out of {totalScoreCount} graded questions.
              </p>
            </div>

            <div className="text-center sm:text-right">
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-400 to-amber-300 bg-clip-text text-transparent">
                {finalPercentage}%
              </div>
              <span className="text-xs text-slate-400">Final Grade</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Entire Exam</span>
            </button>

            {finalPercentage < 100 && (
              <button
                onClick={handleRetakeMissed}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Drill Missed Questions Only</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Active Question Card */}
      {viewFormat === 'interactive' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        {/* Question Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {currentQ.topicTag}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                currentQ.difficulty === 'Easy'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : currentQ.difficulty === 'Hard'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {currentQ.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFlag(currentQ.id)}
              className={`p-2 rounded-xl border transition-all ${
                flaggedIds[currentQ.id]
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Flag question for review"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scenario Context (if applicable) */}
        {currentQ.scenarioContext && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs sm:text-sm text-indigo-200 leading-relaxed space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Clinical / Case Scenario
            </span>
            <p className="font-serif italic">{currentQ.scenarioContext}</p>
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
            {currentQ.question}
          </h3>
        </div>

        {/* Question Input Type Handling */}

        {/* 1. MCQ & Scenario Options */}
        {(currentQ.type === 'mcq' || currentQ.type === 'scenario') && currentQ.options && (
          <div className="space-y-3">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = userAnswers[currentQ.id] === optIdx;
              const isCorrectAnswer = optIdx === currentQ.correctAnswerIndex;
              const showResult = isSubmitted || (testMode === 'practice' && userAnswers[currentQ.id] !== undefined);

              let optionStyle =
                'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-200';

              if (showResult) {
                if (isCorrectAnswer) {
                  optionStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200';
                } else {
                  optionStyle = 'bg-slate-800/30 border-slate-800 text-slate-500';
                }
              } else if (isSelected) {
                optionStyle = 'bg-indigo-600/30 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500';
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  disabled={showResult && testMode === 'practice'}
                  className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${optionStyle}`}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                    {option}
                  </div>
                  {showResult && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {showResult && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. True / False */}
        {currentQ.type === 'true-false' && (
          <div className="grid grid-cols-2 gap-4">
            {[true, false].map((val) => {
              const isSelected = userAnswers[currentQ.id] === val;
              const isCorrectAnswer = val === currentQ.statementIsTrue;
              const showResult = isSubmitted || (testMode === 'practice' && userAnswers[currentQ.id] !== undefined);

              let btnStyle = 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200';

              if (showResult) {
                if (isCorrectAnswer) {
                  btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                } else if (isSelected && !isCorrectAnswer) {
                  btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                } else {
                  btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-500';
                }
              } else if (isSelected) {
                btnStyle = 'bg-indigo-600 border-indigo-500 text-white font-bold';
              }

              return (
                <button
                  key={val ? 'true' : 'false'}
                  onClick={() => handleSelectTrueFalse(currentQ.id, val)}
                  className={`py-4 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all ${btnStyle}`}
                >
                  {val ? 'TRUE' : 'FALSE'}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Short Answer / Free Response with AI Evaluator */}
        {currentQ.type === 'short-answer' && (
          <div className="space-y-4">
            <textarea
              rows={4}
              value={userAnswers[currentQ.id] || ''}
              onChange={(e) => handleTextAnswerChange(currentQ.id, e.target.value)}
              placeholder="Synthesize your answer explaining the core mechanisms and principles..."
              className="w-full p-4 rounded-2xl bg-slate-950/60 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Write freely. Our Gemini 3.8 Flash evaluator will grade against academic criteria.
              </span>

              <button
                onClick={() => handleEvaluateShortAnswer(currentQ)}
                disabled={evaluatingMap[currentQ.id] || !userAnswers[currentQ.id]?.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white shadow-md transition-all"
              >
                {evaluatingMap[currentQ.id] ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Grading with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Evaluate with AI Grader</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Evaluation Output Card */}
            {evaluations[currentQ.id] && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      AI Professor Rubric Assessment
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        evaluations[currentQ.id].score >= 80
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : evaluations[currentQ.id].score >= 50
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {evaluations[currentQ.id].grade} ({evaluations[currentQ.id].score}/100)
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {evaluations[currentQ.id].feedback}
                </p>

                {evaluations[currentQ.id].strengths?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-emerald-400">
                      Demonstrated Strengths
                    </span>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      {evaluations[currentQ.id].strengths.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluations[currentQ.id].missingOrWeakPoints?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-amber-400">
                      Points to Strengthen
                    </span>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      {evaluations[currentQ.id].missingOrWeakPoints.map((m, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detailed Solution / Explanation (Shown in Practice mode after answering, or after exam submission) */}
        {(isSubmitted || (testMode === 'practice' && userAnswers[currentQ.id] !== undefined)) && (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pedagogical Solution &amp; Deep Rationale</span>
              </span>

              {onOpenExplainer && (
                <button
                  onClick={() => onOpenExplainer(currentQ.topicTag || currentQ.question)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Explain Topic with Feynman AI</span>
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {currentQ.explanation}
            </p>

            {currentQ.sampleAnswer && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Model Exemplar Phrasing:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {currentQ.sampleAnswer}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Hint toggle */}
        {currentQ.hint && (
          <div className="pt-2">
            <button
              onClick={() =>
                setShowHint((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
              }
              className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{showHint[currentQ.id] ? 'Hide Hint' : 'Need a hint?'}</span>
            </button>
            {showHint[currentQ.id] && (
              <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                {currentQ.hint}
              </div>
            )}
          </div>
        )}

        {/* Question Footer Navigation */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {!isSubmitted && (
            <button
              onClick={handleSubmitTest}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all"
            >
              Submit &amp; Finish Test
            </button>
          )}

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-colors ${
              currentIndex === questions.length - 1
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          </div>
        </div>
      )}

      {/* Complete Question Bank List View */}
      {viewFormat === 'list' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header count & export bar */}
          <div className="flex items-center justify-between px-2">
            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white">
                {questions.filter((q) => {
                  if (listFilterType !== 'all' && q.type !== listFilterType) return false;
                  if (listDifficulty !== 'all' && q.difficulty !== listDifficulty) return false;
                  if (listSearch.trim()) {
                    const s = listSearch.toLowerCase();
                    const matchPrompt = q.question.toLowerCase().includes(s);
                    const matchContext = q.scenarioContext?.toLowerCase().includes(s);
                    const matchOptions = q.options?.some((opt) => opt.toLowerCase().includes(s));
                    const matchTopic = q.topicTag?.toLowerCase().includes(s);
                    if (!matchPrompt && !matchContext && !matchOptions && !matchTopic) return false;
                  }
                  return true;
                }).length}
              </span> of {questions.length} generated questions
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Print Question Sheet</span>
            </button>
          </div>

          <div className="space-y-6">
            {questions
              .map((q, originalIndex) => ({ q, originalIndex }))
              .filter(({ q }) => {
                if (listFilterType !== 'all' && q.type !== listFilterType) return false;
                if (listDifficulty !== 'all' && q.difficulty !== listDifficulty) return false;
                if (listSearch.trim()) {
                  const s = listSearch.toLowerCase();
                  const matchPrompt = q.question.toLowerCase().includes(s);
                  const matchContext = q.scenarioContext?.toLowerCase().includes(s);
                  const matchOptions = q.options?.some((opt) => opt.toLowerCase().includes(s));
                  const matchTopic = q.topicTag?.toLowerCase().includes(s);
                  if (!matchPrompt && !matchContext && !matchOptions && !matchTopic) return false;
                }
                return true;
              })
              .map(({ q, originalIndex }) => (
                <div
                  key={q.id}
                  className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 transition-all hover:border-slate-700"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Question #{originalIndex + 1}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {q.type === 'scenario'
                          ? 'Scenario Case'
                          : q.type === 'mcq'
                          ? 'Multiple Choice'
                          : q.type === 'true-false'
                          ? 'True / False'
                          : 'Short Answer'}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          q.difficulty === 'Easy'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : q.difficulty === 'Hard'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {q.topicTag && (
                        <span className="text-xs text-slate-400 font-medium">
                          {q.topicTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentIndex(originalIndex);
                          setViewFormat('interactive');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Practice in Quiz</span>
                      </button>
                    </div>
                  </div>

                  {/* Scenario Context */}
                  {q.scenarioContext && (
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs sm:text-sm text-indigo-200 leading-relaxed space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Applied Scenario / Case Prompt:
                      </span>
                      <p>{q.scenarioContext}</p>
                    </div>
                  )}

                  {/* Question text */}
                  <div className="text-base sm:text-lg font-bold text-white leading-snug">
                    {q.question}
                  </div>

                  {/* Multiple Choice Options */}
                  {(q.type === 'mcq' || q.type === 'scenario') && q.options && (
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Options &amp; Correct Answer:
                      </span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((option, optIdx) => {
                          const isCorrect = optIdx === q.correctAnswerIndex;
                          const optionLetter = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100 shadow-sm'
                                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                              }`}
                            >
                              <span
                                className={`shrink-0 w-6 h-6 rounded-lg font-bold flex items-center justify-center text-xs ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {optionLetter}
                              </span>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium leading-relaxed">{option}</span>
                                  {isCorrect && (
                                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      Correct Answer
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* True / False Options */}
                  {q.type === 'true-false' && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Statement Evaluation:
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`p-3 rounded-2xl border text-center font-bold text-sm flex items-center justify-center gap-2 ${
                            q.statementIsTrue
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                          }`}
                        >
                          <span>True</span>
                          {q.statementIsTrue && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-2xl border text-center font-bold text-sm flex items-center justify-center gap-2 ${
                            !q.statementIsTrue
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                          }`}
                        >
                          <span>False</span>
                          {!q.statementIsTrue && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Short Answer Rubric & Sample */}
                  {q.type === 'short-answer' && (
                    <div className="space-y-3">
                      {q.sampleAnswer && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Exemplar Model Answer:
                          </span>
                          <p className="text-xs text-slate-200 font-mono leading-relaxed">
                            {q.sampleAnswer}
                          </p>
                        </div>
                      )}
                      {q.keyPoints && q.keyPoints.length > 0 && (
                        <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            Essential Grading Criteria / Key Points:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                            {q.keyPoints.map((pt, pIdx) => (
                              <li key={pIdx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rationale & Distractor Breakdown Box */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detailed Explanation &amp; Rationale</span>
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>

                    {/* Distractor Rationales */}
                    {q.distractorRationales && Object.keys(q.distractorRationales).length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Distractor Analysis (Why other choices are incorrect):
                        </span>
                        <div className="space-y-1 text-xs text-slate-300">
                          {Object.entries(q.distractorRationales).map(([key, rationale]) => (
                            <div key={key} className="flex items-start gap-1.5">
                              <span className="font-semibold text-rose-300 shrink-0">
                                {key}:
                              </span>
                              <span className="text-slate-400">{String(rationale)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deep dive with AI button */}
                    {onOpenExplainer && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => onOpenExplainer(q.topicTag || q.question)}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Ask Gemini to explain this concept in-depth</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
