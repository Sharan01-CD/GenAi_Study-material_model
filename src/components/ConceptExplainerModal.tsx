import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Baby,
  Cpu,
  Layers,
  Briefcase,
  HelpCircle,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { explainConcept } from '../services/api';
import { ConceptExplanation } from '../types/study';
import { speechService } from '../utils/speech';

interface ConceptExplainerModalProps {
  conceptName: string | null;
  contextText?: string;
  onClose: () => void;
}

export const ConceptExplainerModal: React.FC<ConceptExplainerModalProps> = ({
  conceptName,
  contextText,
  onClose,
}) => {
  const [style, setStyle] = useState<'eli5' | 'analogy' | 'deep-dive' | 'practical-example'>('eli5');
  const [loading, setLoading] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conceptName) {
      loadExplanation(style);
    }
    return () => {
      speechService.stop();
    };
  }, [conceptName]);

  const loadExplanation = async (selectedStyle: 'eli5' | 'analogy' | 'deep-dive' | 'practical-example') => {
    if (!conceptName) return;
    speechService.stop();
    setIsSpeaking(false);
    setLoading(true);
    setError(null);
    setShowAnswer(false);
    try {
      const data = await explainConcept({
        concept: conceptName,
        context: contextText,
        style: selectedStyle,
      });
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleChange = (newStyle: 'eli5' | 'analogy' | 'deep-dive' | 'practical-example') => {
    setStyle(newStyle);
    loadExplanation(newStyle);
  };

  const toggleSpeech = () => {
    if (!explanation) return;
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
    } else {
      const speechText = `${explanation.headline}. ${explanation.content}. Quick check question: ${explanation.quickCheckQuestion}`;
      setIsSpeaking(true);
      speechService.speak(
        speechText,
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  if (!conceptName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  AI Concept Explainer (Feynman Mode)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deep dive for: <span className="text-indigo-300 font-semibold">{conceptName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              speechService.stop();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/40 flex flex-wrap gap-2">
          <button
            onClick={() => handleStyleChange('eli5')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              style === 'eli5'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            <span>Explain Like I'm 5</span>
          </button>

          <button
            onClick={() => handleStyleChange('analogy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              style === 'analogy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Memorable Analogy</span>
          </button>

          <button
            onClick={() => handleStyleChange('deep-dive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              style === 'deep-dive'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Academic Deep Dive</span>
          </button>

          <button
            onClick={() => handleStyleChange('practical-example')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              style === 'practical-example'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Industry Example</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400 font-medium">
                Synthesizing Feynman perspective for <span className="text-indigo-300 font-semibold">{conceptName}</span>...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <p className="font-semibold mb-1">Could not load explanation</p>
              <p>{error}</p>
              <button
                onClick={() => loadExplanation(style)}
                className="mt-3 px-3 py-1 text-xs rounded-md bg-rose-500/20 text-rose-200 hover:bg-rose-500/30"
              >
                Retry
              </button>
            </div>
          ) : explanation ? (
            <div className="space-y-5">
              {/* Headline & Audio control */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Core Intuition
                  </span>
                  <p className="text-base font-semibold text-white mt-1 leading-snug">
                    "{explanation.headline}"
                  </p>
                </div>
                {speechService.isSupported() && (
                  <button
                    onClick={toggleSpeech}
                    title={isSpeaking ? 'Stop Audio' : 'Listen with Audio'}
                    className={`p-2 rounded-lg border transition-all ${
                      isSpeaking
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Main Content */}
              <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-3">
                {explanation.content}
              </div>

              {/* Quick Thought Experiment / Self-Check */}
              {explanation.quickCheckQuestion && (
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4" />
                    <span>Quick Intuition Check</span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium">
                    {explanation.quickCheckQuestion}
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showAnswer ? 'Hide answer' : 'Reveal thought-experiment answer'}</span>
                    </button>
                    {showAnswer && (
                      <div className="mt-2 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed animate-fade-in">
                        <strong>Answer:</strong> {explanation.quickCheckAnswer}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Click any style above to reframe explanation instantly
          </span>
          <button
            onClick={() => {
              speechService.stop();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
