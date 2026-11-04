import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCw,
  Shuffle,
  Volume2,
  VolumeX,
  Lightbulb,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';
import { Flashcard } from '../types/study';
import { speechService } from '../utils/speech';

interface FlashcardsDeckProps {
  cards: Flashcard[];
  deckTitle: string;
  onExplainConcept?: (term: string) => void;
  onCardsUpdated?: (cards: Flashcard[]) => void;
}

export const FlashcardsDeck: React.FC<FlashcardsDeckProps> = ({
  cards: initialCards,
  deckTitle,
  onExplainConcept,
  onCardsUpdated,
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [masteryStats, setMasteryStats] = useState<Record<string, number>>({
    unseen: initialCards.length,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  });

  useEffect(() => {
    setDeck(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    updateStats(initialCards);
  }, [initialCards]);

  const updateStats = (cardsList: Flashcard[]) => {
    const stats = { unseen: 0, learning: 0, reviewing: 0, mastered: 0 };
    cardsList.forEach((c) => {
      const level = c.masteryLevel || 'unseen';
      stats[level] = (stats[level] || 0) + 1;
    });
    setMasteryStats(stats);
  };

  const currentCard = deck[currentIndex];

  const handleFlip = useCallback(() => {
    speechService.stop();
    setIsSpeaking(false);
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      speechService.stop();
      setIsSpeaking(false);
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      speechService.stop();
      setIsSpeaking(false);
      setIsFlipped(false);
      setShowHint(false);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleConfidenceRating = (level: 'learning' | 'reviewing' | 'mastered') => {
    if (!currentCard) return;

    const updated = [...deck];
    updated[currentIndex] = {
      ...currentCard,
      masteryLevel: level,
      lastReviewed: Date.now(),
    };
    setDeck(updated);
    updateStats(updated);
    onCardsUpdated?.(updated);

    // If card mastered and last card, trigger confetti!
    if (level === 'mastered' && currentIndex === deck.length - 1) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Auto advance if not last
    if (currentIndex < deck.length - 1) {
      handleNext();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        handleConfidenceRating('learning');
      } else if (e.key === '2') {
        handleConfidenceRating('reviewing');
      } else if (e.key === '3') {
        handleConfidenceRating('mastered');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, currentIndex, deck]);

  const toggleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
    } else {
      const textToSpeak = isFlipped ? currentCard.back : currentCard.front;
      setIsSpeaking(true);
      speechService.speak(
        textToSpeak,
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  if (!deck.length || !currentCard) {
    return (
      <div className="p-12 text-center text-slate-400">
        No flashcards available in this study kit.
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / deck.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Active Recall Deck</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {deck.length} Flashcards
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Card {currentIndex + 1} of {deck.length} · Tap card or press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">Space</kbd> to flip
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Mastery Stats Bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="text-xs text-slate-400">Unseen</div>
          <div className="text-lg font-bold text-slate-300">{masteryStats.unseen}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs text-amber-400">Learning</div>
          <div className="text-lg font-bold text-amber-300">{masteryStats.learning}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="text-xs text-indigo-400">Reviewing</div>
          <div className="text-lg font-bold text-indigo-300">{masteryStats.reviewing}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-xs text-emerald-400">Mastered</div>
          <div className="text-lg font-bold text-emerald-300">{masteryStats.mastered}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Flashcard 3D Perspective Container */}
      <div
        onClick={handleFlip}
        className="group relative cursor-pointer select-none min-h-[320px] sm:min-h-[360px] rounded-3xl p-1 bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-indigo-500/40 hover:to-slate-700/40 transition-all shadow-xl"
      >
        <div className="w-full h-full min-h-[320px] sm:min-h-[360px] rounded-[22px] bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Card Top Pill & Audio Button */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  currentCard.difficulty === 'Easy'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : currentCard.difficulty === 'Hard'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {currentCard.difficulty}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currentCard.category}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {speechService.isSupported() && (
                <button
                  onClick={toggleSpeech}
                  title={isSpeaking ? 'Stop audio' : 'Listen with Speech'}
                  className={`p-2 rounded-xl transition-all ${
                    isSpeaking
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
              <span className="text-xs text-slate-500 font-medium">
                {isFlipped ? 'ANSWER' : 'QUESTION'}
              </span>
            </div>
          </div>

          {/* Card Center Content */}
          <div className="my-auto py-6 text-center z-10 space-y-4">
            {!isFlipped ? (
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Prompt
                </span>
                <h4 className="text-xl sm:text-2xl font-bold text-white leading-relaxed max-w-xl mx-auto">
                  {currentCard.front}
                </h4>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Solution &amp; Core Insight
                </span>
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl mx-auto font-medium">
                  {currentCard.back}
                </p>
                {onExplainConcept && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExplainConcept(currentCard.front);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 mt-2 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explain this concept with Feynman AI</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hint Drawer & Flip Helper */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 z-10">
            {currentCard.hint ? (
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="flex items-center gap-1 text-amber-400/90 hover:text-amber-300 font-medium"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide hint' : 'Show hint'}</span>
                </button>
                {showHint && (
                  <p className="mt-1 text-slate-300 italic text-[11px] animate-fade-in">
                    {currentCard.hint}
                  </p>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1 text-slate-500">
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Click to {isFlipped ? 'flip back' : 'reveal answer'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls: Spaced Repetition Confidence Buttons */}
      {isFlipped ? (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-fade-in">
          <div className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider">
            How well did you know this? (Spaced Repetition)
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleConfidenceRating('learning')}
              className="py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 flex flex-col items-center gap-1 transition-all"
            >
              <span className="font-bold">Again [1]</span>
              <span className="text-[10px] text-rose-400/80">Needs Practice</span>
            </button>
            <button
              onClick={() => handleConfidenceRating('reviewing')}
              className="py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex flex-col items-center gap-1 transition-all"
            >
              <span className="font-bold">Good [2]</span>
              <span className="text-[10px] text-amber-400/80">Remembered with effort</span>
            </button>
            <button
              onClick={() => handleConfidenceRating('mastered')}
              className="py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex flex-col items-center gap-1 transition-all"
            >
              <span className="font-bold">Easy [3]</span>
              <span className="text-[10px] text-emerald-400/80">Instant Recall</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleFlip}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
          >
            Reveal Solution
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              currentIndex === deck.length - 1
                ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
