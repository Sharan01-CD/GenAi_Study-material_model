import React from 'react';
import {
  Brain,
  Sparkles,
  BookOpen,
  GraduationCap,
  FolderHeart,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'generator' | 'study' | 'quiz' | 'library';
  setActiveTab: (tab: 'generator' | 'study' | 'quiz' | 'library') => void;
  activeTopicName?: string;
  hasActiveDeck: boolean;
  savedDecksCount: number;
  totalCardsMastered?: number;
  questionsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeTopicName,
  hasActiveDeck,
  savedDecksCount,
  totalCardsMastered = 0,
  questionsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-amber-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  CogniLearn AI
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  GenAI Study Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous curriculum synthesis, active recall &amp; adaptive assessment
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">Generate New</span>
            </button>

            <button
              onClick={() => setActiveTab('study')}
              disabled={!hasActiveDeck}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : hasActiveDeck
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Study Guide</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              disabled={!hasActiveDeck}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : hasActiveDeck
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Questions &amp; Quiz</span>
              {questionsCount > 0 && (
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                  <span>{questionsCount}</span>
                  <span className="hidden sm:inline text-[9px] uppercase font-bold text-emerald-400">Q's</span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <FolderHeart className="w-4 h-4" />
              <span className="hidden md:inline">Library</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {savedDecksCount}
              </span>
            </button>
          </nav>

          {/* Active Topic Badge / Quick Stats */}
          {activeTopicName && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 max-w-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate font-medium">
                {activeTopicName}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
