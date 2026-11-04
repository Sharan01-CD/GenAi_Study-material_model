import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StudyGenerator } from './components/StudyGenerator';
import { StudyMaterialView } from './components/StudyMaterialView';
import { QuizEngine } from './components/QuizEngine';
import { StudyLibrary } from './components/StudyLibrary';
import { ConceptExplainerModal } from './components/ConceptExplainerModal';
import { PerformanceOverview, QuizAttemptRecord } from './components/PerformanceOverview';
import { StudyMaterial, QuestionSuite, Flashcard } from './types/study';
import { sampleStudyMaterial, sampleQuestionSuite } from './data/sampleDecks';
import { generateQuestions } from './services/api';
import { Loader2 } from 'lucide-react';

export interface StoredDeck {
  material: StudyMaterial;
  questionSuite?: QuestionSuite;
  quizAttempts?: QuizAttemptRecord[];
  activeAnswers?: Record<string, any>;
  lastStudiedAt?: number;
  reviewIntervalHours?: number;
}

const STORAGE_KEY = 'cognilearn_study_decks_v3';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'study' | 'quiz' | 'library'>('study');
  const [decks, setDecks] = useState<StoredDeck[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved study decks from localStorage', e);
    }
    return [
      {
        material: sampleStudyMaterial,
        questionSuite: sampleQuestionSuite,
        lastStudiedAt: Date.now() - 26 * 60 * 60 * 1000, // 26 hours ago to demonstrate Smart Study Scheduler notification!
        reviewIntervalHours: 24,
        quizAttempts: [
          {
            id: 'att-neural-1',
            deckId: sampleStudyMaterial.id,
            timestamp: Date.now() - 26 * 60 * 60 * 1000,
            scorePercentage: 80,
            correctCount: 4,
            totalCount: 5,
            mode: 'practice',
          },
        ],
        activeAnswers: {
          'q-1': 0,
          'q-2': 0,
          'q-3': 0,
          'q-4': false,
        },
      },
    ];
  });

  const [activeDeckIndex, setActiveDeckIndex] = useState<number>(0);
  const [explainerTarget, setExplainerTarget] = useState<{ concept: string; context?: string } | null>(null);
  const [isGeneratingQuizFromStudy, setIsGeneratingQuizFromStudy] = useState<boolean>(false);

  // Sync decks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    } catch (e) {
      console.warn('Failed to save study decks to localStorage', e);
    }
  }, [decks]);

  const activeDeck = decks[activeDeckIndex] || decks[0];

  const handleMarkReviewed = () => {
    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          lastStudiedAt: Date.now(),
        };
      }
      return updated;
    });
  };

  const handleUpdateInterval = (hours: number) => {
    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          reviewIntervalHours: hours,
        };
      }
      return updated;
    });
  };

  const handleGeneratedNew = (
    material: StudyMaterial,
    questionSuite?: QuestionSuite,
    autoSwitchToQuiz = false
  ) => {
    const newRecord: StoredDeck = {
      material,
      questionSuite,
      quizAttempts: [],
      activeAnswers: {},
      lastStudiedAt: Date.now(),
      reviewIntervalHours: 24,
    };
    setDecks((prev) => [newRecord, ...prev]);
    setActiveDeckIndex(0);
    setActiveTab(autoSwitchToQuiz && questionSuite ? 'quiz' : 'study');
  };

  const handleGenerateQuizForCurrentDeck = async (material: StudyMaterial) => {
    setIsGeneratingQuizFromStudy(true);
    try {
      const newSuite = await generateQuestions({
        topic: material.topic,
        contextSummary: material.overview.summary,
        count: 8,
        difficulty: 'Medium',
        studyMaterialId: material.id,
      });

      // Update current deck with the newly generated question suite
      setDecks((prev) => {
        const updated = [...prev];
        if (updated[activeDeckIndex]) {
          updated[activeDeckIndex] = {
            ...updated[activeDeckIndex],
            questionSuite: newSuite,
            lastStudiedAt: Date.now(),
          };
        }
        return updated;
      });

      setActiveTab('quiz');
    } catch (err: any) {
      alert(err.message || 'Failed to generate quiz for this study guide.');
    } finally {
      setIsGeneratingQuizFromStudy(false);
    }
  };

  const handleUpdateSuite = (newSuite: QuestionSuite) => {
    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          questionSuite: newSuite,
          lastStudiedAt: Date.now(),
        };
      }
      return updated;
    });
  };

  const handleAnswersChanged = (answers: Record<string, any>) => {
    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          activeAnswers: answers,
          lastStudiedAt: Date.now(),
        };
      }
      return updated;
    });
  };

  const handleQuizCompleted = (attempt: {
    scorePercentage: number;
    correctCount: number;
    totalCount: number;
    timestamp: number;
    mode: 'practice' | 'exam';
  }) => {
    const newAttempt: QuizAttemptRecord = {
      ...attempt,
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deckId: activeDeck?.material?.id || '',
    };

    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        const existingAttempts = updated[activeDeckIndex].quizAttempts || [];
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          quizAttempts: [newAttempt, ...existingAttempts],
          lastStudiedAt: Date.now(),
        };
      }
      return updated;
    });
  };

  const handleFlashcardsUpdated = (cards: Flashcard[]) => {
    setDecks((prev) => {
      const updated = [...prev];
      if (updated[activeDeckIndex]) {
        updated[activeDeckIndex] = {
          ...updated[activeDeckIndex],
          lastStudiedAt: Date.now(),
          material: {
            ...updated[activeDeckIndex].material,
            flashcards: cards,
          },
        };
      }
      return updated;
    });
  };

  const handleResetProgress = () => {
    if (window.confirm('Reset quiz completion and score history for this deck?')) {
      setDecks((prev) => {
        const updated = [...prev];
        if (updated[activeDeckIndex]) {
          const resetCards = updated[activeDeckIndex].material.flashcards.map((f) => ({
            ...f,
            masteryLevel: 'unseen' as const,
          }));

          updated[activeDeckIndex] = {
            ...updated[activeDeckIndex],
            quizAttempts: [],
            activeAnswers: {},
            lastStudiedAt: Date.now() - 26 * 60 * 60 * 1000, // demonstrate alert again on reset
            material: {
              ...updated[activeDeckIndex].material,
              flashcards: resetCards,
            },
          };
        }
        return updated;
      });
    }
  };

  const handleSelectDeckFromLibrary = (record: StoredDeck, targetTab: 'study' | 'quiz') => {
    const idx = decks.findIndex((d) => d.material.id === record.material.id);
    if (idx !== -1) {
      setActiveDeckIndex(idx);
    }
    setActiveTab(targetTab);
  };

  const handleDeleteDeck = (id: string) => {
    setDecks((prev) => {
      const filtered = prev.filter((d) => d.material.id !== id);
      return filtered.length > 0 ? filtered : prev;
    });
    setActiveDeckIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeTopicName={activeDeck?.material?.topic}
        hasActiveDeck={!!activeDeck}
        savedDecksCount={decks.length}
        questionsCount={activeDeck?.questionSuite?.questions?.length || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading overlay when generating quiz from study guide */}
        {isGeneratingQuizFromStudy && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Synthesizing Diagnostic Exam</h3>
              <p className="text-sm text-slate-400">
                Generating MCQs, scenario cases, and psychometric rubrics using Gemini 3.8 Flash...
              </p>
            </div>
          </div>
        )}

        {/* Performance Overview Section (Shown for active deck across study, quiz, and generator) */}
        {activeDeck?.material && activeTab !== 'library' && (
          <PerformanceOverview
            material={activeDeck.material}
            questionSuite={activeDeck.questionSuite}
            attempts={activeDeck.quizAttempts || []}
            activeAnswers={activeDeck.activeAnswers || {}}
            lastStudiedAt={activeDeck.lastStudiedAt}
            reviewIntervalHours={activeDeck.reviewIntervalHours || 24}
            onStartQuiz={() => setActiveTab('quiz')}
            onOpenFlashcards={() => setActiveTab('study')}
            onResetProgress={handleResetProgress}
            onMarkReviewed={handleMarkReviewed}
            onUpdateInterval={handleUpdateInterval}
          />
        )}

        {/* Tab 1: Generator Studio */}
        {activeTab === 'generator' && (
          <StudyGenerator onGenerated={handleGeneratedNew} />
        )}

        {/* Tab 2: Study Guide & Flashcards */}
        {activeTab === 'study' && activeDeck?.material && (
          <StudyMaterialView
            material={activeDeck.material}
            hasExistingQuiz={!!activeDeck.questionSuite?.questions?.length}
            questionCount={activeDeck.questionSuite?.questions?.length || 0}
            onGoToQuiz={() => setActiveTab('quiz')}
            onOpenExplainer={(concept, context) => setExplainerTarget({ concept, context })}
            onGenerateQuizForDeck={handleGenerateQuizForCurrentDeck}
            onCardsUpdated={handleFlashcardsUpdated}
          />
        )}

        {/* Tab 3: Practice & Exam Hub */}
        {activeTab === 'quiz' && (
          activeDeck?.questionSuite ? (
            <QuizEngine
              suite={activeDeck.questionSuite}
              onUpdateSuite={handleUpdateSuite}
              topicTitle={activeDeck.material?.topic}
              onOpenExplainer={(concept) => setExplainerTarget({ concept })}
              initialAnswers={activeDeck.activeAnswers || {}}
              onAnswersChanged={handleAnswersChanged}
              onQuizCompleted={handleQuizCompleted}
            />
          ) : (
            <div className="p-12 text-center max-w-lg mx-auto rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-white">No Exam Questions Generated Yet</h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Generate an adaptive question paper for "{activeDeck?.material?.topic}" with MCQs, scenario challenges, and AI-graded short responses.
              </p>
              <button
                onClick={() => handleGenerateQuizForCurrentDeck(activeDeck.material)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
              >
                Generate Practice Questions Now
              </button>
            </div>
          )
        )}

        {/* Tab 4: Saved Library */}
        {activeTab === 'library' && (
          <StudyLibrary
            decks={decks}
            activeDeckId={activeDeck?.material?.id || ''}
            onSelectDeck={handleSelectDeckFromLibrary}
            onDeleteDeck={handleDeleteDeck}
            onOpenGenerator={() => setActiveTab('generator')}
          />
        )}
      </main>

      {/* Feynman Concept Explainer Modal */}
      {explainerTarget && (
        <ConceptExplainerModal
          conceptName={explainerTarget.concept}
          contextText={explainerTarget.context}
          onClose={() => setExplainerTarget(null)}
        />
      )}
    </div>
  );
}
