import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Layers,
  GraduationCap,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Target,
  Zap,
  BellRing,
  AlertTriangle,
  CalendarClock,
  Check,
  Calendar,
} from 'lucide-react';
import { StudyMaterial, QuestionSuite } from '../types/study';

export interface QuizAttemptRecord {
  id: string;
  deckId: string;
  timestamp: number;
  scorePercentage: number;
  correctCount: number;
  totalCount: number;
  mode: 'practice' | 'exam';
}

interface PerformanceOverviewProps {
  material: StudyMaterial;
  questionSuite?: QuestionSuite;
  attempts: QuizAttemptRecord[];
  activeAnswers?: Record<string, any>;
  lastStudiedAt?: number;
  reviewIntervalHours?: number;
  onStartQuiz: () => void;
  onOpenFlashcards: () => void;
  onResetProgress: () => void;
  onMarkReviewed?: () => void;
  onUpdateInterval?: (hours: number) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diffSecs = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  material,
  questionSuite,
  attempts = [],
  activeAnswers = {},
  lastStudiedAt,
  reviewIntervalHours = 24,
  onStartQuiz,
  onOpenFlashcards,
  onResetProgress,
  onMarkReviewed,
  onUpdateInterval,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showIntervalPicker, setShowIntervalPicker] = useState<boolean>(false);

  // 1. Calculate Quiz Completion
  const totalQuestions = questionSuite?.questions?.length || 0;
  const answeredQuestionIds = Object.keys(activeAnswers).filter(
    (key) => activeAnswers[key] !== undefined && activeAnswers[key] !== ''
  );
  
  const answeredCount = Math.min(answeredQuestionIds.length, totalQuestions);
  const completionPercentage = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  // 2. Calculate Average & Best Scores
  const averageScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercentage, 0) / attempts.length)
    : 0;

  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.scorePercentage))
    : 0;

  // 3. Calculate Flashcards Mastery
  const flashcards = material?.flashcards || [];
  const masteredCards = flashcards.filter((f) => f.masteryLevel === 'mastered').length;
  const reviewingCards = flashcards.filter((f) => f.masteryLevel === 'reviewing').length;
  const learningCards = flashcards.filter((f) => f.masteryLevel === 'learning').length;
  const flashcardMasteryPercent = flashcards.length > 0
    ? Math.round((masteredCards / flashcards.length) * 100)
    : 0;

  // 4. Smart Study Scheduler calculation
  const now = Date.now();
  const effectiveLastStudied = lastStudiedAt || (material.createdAt || now);
  const elapsedMs = Math.max(0, now - effectiveLastStudied);
  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const intervalMs = reviewIntervalHours * 60 * 60 * 1000;
  
  // Review is overdue if accessed over reviewIntervalHours (default 24h)
  const isReviewDue = elapsedMs >= intervalMs;
  const nextDueTimestamp = effectiveLastStudied + intervalMs;
  const hoursUntilNext = Math.max(0, Math.ceil((nextDueTimestamp - now) / (60 * 60 * 1000)));

  // Grade helper
  const getGradePill = (pct: number) => {
    if (pct >= 90) return { label: 'Grade: A+', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (pct >= 80) return { label: 'Grade: A', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (pct >= 70) return { label: 'Grade: B', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    if (pct >= 60) return { label: 'Grade: C', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { label: 'In Progress', color: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  const gradeInfo = getGradePill(averageScore);

  return (
    <section className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden mb-6 transition-all">
      {/* Overview Top Bar */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Performance Overview
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Active Deck Analytics
              </span>

              {isReviewDue ? (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  <BellRing className="w-3 h-3" />
                  <span>Review Due Now (&gt;24h)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3" />
                  <span>Up to date</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live study progress &bull; Last studied: <span className="text-slate-200 font-semibold">{formatTimeAgo(effectiveLastStudied)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scheduler Quick Config */}
          <div className="relative">
            <button
              onClick={() => setShowIntervalPicker(!showIntervalPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
              title="Configure Spaced Repetition interval"
            >
              <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Interval: {reviewIntervalHours}h</span>
            </button>

            {showIntervalPicker && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-30 space-y-1 animate-fade-in text-xs">
                <div className="px-2 py-1 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Spaced Repetition Target
                </div>
                {[12, 24, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => {
                      onUpdateInterval?.(hours);
                      setShowIntervalPicker(false);
                    }}
                    className={`w-full px-3 py-1.5 rounded-xl text-left font-medium transition-colors ${
                      reviewIntervalHours === hours
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Every {hours} hours {hours === 24 ? '(Recommended)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          >
            <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* SMART STUDY SCHEDULER: 'Next Review Due' Notification Banner */}
      {isReviewDue && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-slate-900 border-b border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Smart Study Scheduler Alert
                </span>
                <span className="text-[11px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 font-medium">
                  Overdue by {Math.max(1, elapsedHours - reviewIntervalHours)}h
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                Next Review Due for "{material.topic}"
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                This study kit hasn't been accessed for over <strong className="text-rose-300">{elapsedHours} hours</strong> (last studied {formatTimeAgo(effectiveLastStudied)}). According to the Ebbinghaus forgetting curve, active recall retention decays rapidly without periodic retrieval practice.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 ml-11 md:ml-0">
            <button
              onClick={() => {
                onMarkReviewed?.();
                onStartQuiz();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-600/30 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              <span>Review Now (Practice Quiz)</span>
            </button>

            <button
              onClick={() => {
                onMarkReviewed?.();
                onOpenFlashcards();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Flashcard Drill</span>
            </button>

            <button
              onClick={onMarkReviewed}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Acknowledge and mark deck as reviewed now"
            >
              Mark Reviewed
            </button>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Main Metrics KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Quiz Completion */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Quiz Completion</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {answeredCount}/{totalQuestions} Qs
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {completionPercentage}%
                  </span>
                  <span className="text-xs text-slate-400">attempted</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>{totalQuestions - answeredCount} questions remaining</span>
                <button
                  onClick={onStartQuiz}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Continue &rarr;
                </button>
              </div>
            </div>

            {/* Metric 2: Average Score */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Average Score</span>
                </span>
                {attempts.length > 0 && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${gradeInfo.color}`}>
                    {gradeInfo.label}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {attempts.length > 0 ? `${averageScore}%` : 'N/A'}
                  </span>
                  {attempts.length > 0 && (
                    <span className="text-xs text-slate-400">
                      across {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                    </span>
                  )}
                </div>

                {/* Bar representation */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${averageScore}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Best score: <strong className="text-emerald-300 font-mono">{attempts.length > 0 ? `${bestScore}%` : 'None'}</strong></span>
                <span className="text-slate-500">Passing: 70%</span>
              </div>
            </div>

            {/* Metric 3: Flashcard Mastery */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flashcard Recall</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {masteredCards}/{flashcards.length} Cards
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {flashcardMasteryPercent}%
                  </span>
                  <span className="text-xs text-slate-400">mastered</span>
                </div>

                {/* Stacked bar for flashcards */}
                <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${(masteredCards / (flashcards.length || 1)) * 100}%` }}
                    title={`Mastered: ${masteredCards}`}
                  />
                  <div
                    className="bg-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${(reviewingCards / (flashcards.length || 1)) * 100}%` }}
                    title={`Reviewing: ${reviewingCards}`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${(learningCards / (flashcards.length || 1)) * 100}%` }}
                    title={`Learning: ${learningCards}`}
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>{learningCards + reviewingCards} in active review</span>
                <button
                  onClick={onOpenFlashcards}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Drill &rarr;
                </button>
              </div>
            </div>

            {/* Metric 4: Smart Scheduler Status Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Next Review</span>
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isReviewDue
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {isReviewDue ? 'Due Now' : `In ${hoursUntilNext}h`}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                    isReviewDue ? 'text-rose-400' : 'text-emerald-300'
                  }`}>
                    {isReviewDue ? 'Overdue' : 'On Schedule'}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Last session:</span>
                    <strong className="text-slate-300">{formatTimeAgo(effectiveLastStudied)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due interval:</span>
                    <strong className="text-slate-300">{reviewIntervalHours} hours</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <button
                  onClick={onMarkReviewed}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Log Review Today
                </button>
                <button
                  onClick={onResetProgress}
                  title="Reset practice progress for this deck"
                  className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-[10px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Quiz Attempts History */}
          {attempts.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Recent Assessment Attempts on this Deck</span>
                </span>
                <span className="text-xs text-slate-500">
                  {attempts.length} total recorded
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {attempts.slice(0, 3).map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {att.mode}
                        </span>
                        <span className="text-slate-400">
                          {new Date(att.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {att.correctCount} of {att.totalCount} correct
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded-lg ${
                          att.scorePercentage >= 80
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : att.scorePercentage >= 60
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {att.scorePercentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
