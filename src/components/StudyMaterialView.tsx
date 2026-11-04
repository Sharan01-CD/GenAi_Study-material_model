import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  Layers,
  Network,
  Download,
  Printer,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  ArrowRight,
  Brain,
  Lightbulb,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { StudyMaterial, Flashcard } from '../types/study';
import { FlashcardsDeck } from './FlashcardsDeck';
import {
  exportStudyMaterialToMarkdown,
  exportFlashcardsToAnki,
  triggerDownload,
} from '../utils/export';
import { speechService } from '../utils/speech';

interface StudyMaterialViewProps {
  material: StudyMaterial;
  hasExistingQuiz?: boolean;
  questionCount?: number;
  onGoToQuiz?: () => void;
  onOpenExplainer: (concept: string, context?: string) => void;
  onGenerateQuizForDeck: (material: StudyMaterial) => void;
  onCardsUpdated?: (cards: Flashcard[]) => void;
}

export const StudyMaterialView: React.FC<StudyMaterialViewProps> = ({
  material,
  hasExistingQuiz = false,
  questionCount = 0,
  onGoToQuiz,
  onOpenExplainer,
  onGenerateQuizForDeck,
  onCardsUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'guide' | 'cheat' | 'flashcards' | 'mindmap'>('guide');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    [material.modules[0]?.id || 'mod-1']: true,
  });
  const [speakingConcept, setSpeakingConcept] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const handleSpeak = (key: string, text: string) => {
    if (speakingConcept === key) {
      speechService.stop();
      setSpeakingConcept(null);
    } else {
      speechService.stop();
      setSpeakingConcept(key);
      speechService.speak(
        text,
        () => setSpeakingConcept(null),
        () => setSpeakingConcept(null)
      );
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = exportStudyMaterialToMarkdown(material);
    triggerDownload(md, `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-study-guide.md`, 'text/markdown');
  };

  const handleDownloadAnki = () => {
    const anki = exportFlashcardsToAnki(material.flashcards);
    triggerDownload(anki, `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-anki.txt`, 'text/tab-separated-values');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {material.educationLevel}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {material.studyGoal}
              </span>
              <span className="text-xs text-slate-400">
                Generated {new Date(material.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {material.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {material.overview.summary}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            {hasExistingQuiz ? (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onGoToQuiz}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-indigo-600 to-violet-600 hover:from-emerald-500 hover:to-violet-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>View &amp; Practice Questions ({questionCount})</span>
                </button>
                <button
                  onClick={() => onGenerateQuizForDeck(material)}
                  className="text-[11px] text-slate-400 hover:text-indigo-300 underline text-center"
                >
                  Regenerate Fresh Questions
                </button>
              </div>
            ) : (
              <button
                onClick={() => onGenerateQuizForDeck(material)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Generate Questions &amp; Exam</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadMarkdown}
                title="Download Markdown Guide"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Markdown</span>
              </button>
              <button
                onClick={handleDownloadAnki}
                title="Download Anki TSV"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Anki TSV</span>
              </button>
              <button
                onClick={handlePrint}
                title="Print clean guide"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'guide'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Study Guide ({material.modules.length} Modules)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cheat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'cheat'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>High-Yield Cheat Sheet</span>
        </button>

        <button
          onClick={() => setActiveSubTab('flashcards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'flashcards'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Flashcards ({material.flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mindmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeSubTab === 'mindmap'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Mind Map &amp; Concepts</span>
        </button>
      </div>

      {/* Sub-Tab 1: Study Guide */}
      {activeSubTab === 'guide' && (
        <div className="space-y-6">
          {/* Core Mental Model Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/20 relative">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Core Intuitive Mental Model
                  </h3>
                  {speechService.isSupported() && (
                    <button
                      onClick={() => handleSpeak('mental-model', material.overview.coreMentalModel)}
                      className="text-slate-400 hover:text-white p-1 rounded-md"
                      title="Read mental model aloud"
                    >
                      {speakingConcept === 'mental-model' ? (
                        <VolumeX className="w-4 h-4 text-amber-400 animate-pulse" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium">
                  {material.overview.coreMentalModel}
                </p>
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          {material.overview.learningObjectives?.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <span>Target Learning Objectives</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {material.overview.learningObjectives.map((obj, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs sm:text-sm text-slate-300"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-snug">{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modules Accordion */}
          <div className="space-y-4">
            {material.modules.map((mod, mIdx) => {
              const isOpen = expandedModules[mod.id] ?? true;
              return (
                <div
                  key={mod.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm"
                >
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                          Module {mIdx + 1}
                        </span>
                        <span className="text-xs text-slate-500">
                          · {mod.concepts.length} Concepts
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{mod.title}</h3>
                      <p className="text-xs text-slate-400">{mod.summary}</p>
                    </div>

                    <div className="p-2 text-slate-400">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Module Content */}
                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 space-y-6 border-t border-slate-800/80">
                      {mod.concepts.map((concept, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              <span>{concept.name}</span>
                            </h4>

                            <div className="flex items-center gap-2">
                              {speechService.isSupported() && (
                                <button
                                  onClick={() =>
                                    handleSpeak(
                                      `c-${mod.id}-${cIdx}`,
                                      `${concept.name}. ${concept.explanation}. Analogy: ${concept.analogy}. Key Takeaway: ${concept.keyTakeaway}`
                                    )
                                  }
                                  title="Read explanation aloud"
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                                >
                                  {speakingConcept === `c-${mod.id}-${cIdx}` ? (
                                    <VolumeX className="w-4 h-4 text-amber-400 animate-pulse" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => onOpenExplainer(concept.name, concept.explanation)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Feynman Explainer</span>
                              </button>
                            </div>
                          </div>

                          {/* Main Explanation */}
                          <p className="text-sm text-slate-200 leading-relaxed">
                            {concept.explanation}
                          </p>

                          {/* Analogy & Takeaway Boxes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                                <span>Intuitive Analogy</span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {concept.analogy}
                              </p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                <Check className="w-3.5 h-3.5" />
                                <span>Key Takeaway</span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                {concept.keyTakeaway}
                              </p>
                            </div>
                          </div>

                          {/* Common Pitfalls */}
                          {concept.commonPitfalls && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-200">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Common Student Misconception: </span>
                                <span>{concept.commonPitfalls}</span>
                              </div>
                            </div>
                          )}

                          {/* Concrete Examples */}
                          {concept.examples?.length > 0 && (
                            <div className="pt-2">
                              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Practical Applications &amp; Case Examples
                              </div>
                              <ul className="space-y-1">
                                {concept.examples.map((ex, exIdx) => (
                                  <li key={exIdx} className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <span>{ex}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: High-Yield Cheat Sheet */}
      {activeSubTab === 'cheat' && (
        <div className="space-y-6">
          {/* Quick Notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs sm:text-sm text-amber-200">
                <strong>High-Yield Exam Cram Mode:</strong> Concentrated formulas, high-frequency facts, and mnemonics designed for immediate pre-test revision.
              </p>
            </div>
            <button
              onClick={() => handleCopy(JSON.stringify(material.cheatSheet, null, 2), 'cheat-all')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 shrink-0 ml-3"
            >
              {copiedItem === 'cheat-all' ? 'Copied!' : 'Copy All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulas & Rules */}
            {material.cheatSheet.keyFormulasOrRules?.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">📐</span>
                    <span>Core Formulas &amp; Rules</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {material.cheatSheet.keyFormulasOrRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs sm:text-sm font-mono text-indigo-200"
                    >
                      <span>{rule}</span>
                      <button
                        onClick={() => handleCopy(rule, `rule-${idx}`)}
                        className="text-slate-400 hover:text-white ml-2"
                      >
                        {copiedItem === `rule-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mnemonics */}
            {material.cheatSheet.mnemonics?.length > 0 && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="p-1 rounded bg-amber-500/20 text-amber-400">🧠</span>
                  <span>Memory Mnemonics</span>
                </h3>
                <div className="space-y-3">
                  {material.cheatSheet.mnemonics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 space-y-1"
                    >
                      <span className="text-base font-extrabold text-amber-300 tracking-wider">
                        {m.phrase}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-300">{m.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* High Yield Quick Facts */}
          {material.cheatSheet.highYieldQuickFacts?.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">🎯</span>
                <span>High-Frequency Test Facts (Must Remember)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {material.cheatSheet.highYieldQuickFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-2.5 text-xs sm:text-sm text-slate-300"
                  >
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crucial Definitions */}
          {material.cheatSheet.crucialDefinitions?.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="p-1 rounded bg-violet-500/20 text-violet-400">📚</span>
                <span>Crucial Terminology &amp; Definitions</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {material.cheatSheet.crucialDefinitions.map((def, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 text-sm">{def.term}</span>
                      <button
                        onClick={() => onOpenExplainer(def.term, def.definition)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Feynman</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{def.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Flashcards Deck */}
      {activeSubTab === 'flashcards' && (
        <FlashcardsDeck
          cards={material.flashcards}
          deckTitle={material.title}
          onExplainConcept={onOpenExplainer}
          onCardsUpdated={onCardsUpdated}
        />
      )}

      {/* Sub-Tab 4: Mindmap Tree */}
      {activeSubTab === 'mindmap' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-indigo-400" />
                <span>Hierarchical Knowledge Graph &amp; Mind Map</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cognitive structure illustrating how foundational axioms branch into specialized principles.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {material.mindmap.map((node) => {
              const isRoot = !node.parentId;
              return (
                <div
                  key={node.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isRoot
                      ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/60 border-indigo-500/40 shadow-lg'
                      : 'bg-slate-800/40 border-slate-700/60 ml-4 sm:ml-8'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isRoot ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-indigo-400'
                        }`}
                      />
                      <h4 className={`font-bold ${isRoot ? 'text-lg text-white' : 'text-sm text-slate-200'}`}>
                        {node.label}
                      </h4>
                      {isRoot && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          Root Domain
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenExplainer(node.label, node.description)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Feynman Explainer</span>
                    </button>
                  </div>
                  {node.description && (
                    <p className="text-xs text-slate-400 mt-1.5 ml-5 leading-relaxed">
                      {node.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
