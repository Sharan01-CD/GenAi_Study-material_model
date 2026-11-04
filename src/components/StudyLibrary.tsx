import React, { useState } from 'react';
import {
  FolderHeart,
  BookOpen,
  GraduationCap,
  Layers,
  Trash2,
  Calendar,
  Search,
  ExternalLink,
  Download,
  Sparkles,
} from 'lucide-react';
import { StudyMaterial, QuestionSuite } from '../types/study';
import { exportStudyMaterialToMarkdown, triggerDownload } from '../utils/export';

interface StudyDeckRecord {
  material: StudyMaterial;
  questionSuite?: QuestionSuite;
}

interface StudyLibraryProps {
  decks: StudyDeckRecord[];
  activeDeckId: string;
  onSelectDeck: (record: StudyDeckRecord, targetTab: 'study' | 'quiz') => void;
  onDeleteDeck: (id: string) => void;
  onOpenGenerator: () => void;
}

export const StudyLibrary: React.FC<StudyLibraryProps> = ({
  decks,
  activeDeckId,
  onSelectDeck,
  onDeleteDeck,
  onOpenGenerator,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDecks = decks.filter(
    (d) =>
      d.material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.material.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.material.educationLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportDeck = (e: React.MouseEvent, material: StudyMaterial) => {
    e.stopPropagation();
    const md = exportStudyMaterialToMarkdown(material);
    triggerDownload(md, `${material.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, 'text/markdown');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FolderHeart className="w-6 h-6 text-indigo-400" />
            <span>Saved Study Decks &amp; Exam Kits</span>
          </h2>
          <p className="text-xs text-slate-400">
            {decks.length} total generative study materials stored locally
          </p>
        </div>

        <button
          onClick={onOpenGenerator}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Create New Study Material</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by subject, title, or academic level..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No study decks found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'Try clearing your search query.' : 'Generate your first study guide to build your library!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDecks.map((record) => {
            const { material, questionSuite } = record;
            const isActive = material.id === activeDeckId;

            return (
              <div
                key={material.id}
                className={`p-6 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {material.educationLevel}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          Active Deck
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                      {material.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {material.overview.summary}
                    </p>
                  </div>

                  {/* Badges Count */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{material.modules.length} Modules</span>
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>{material.flashcards.length} Flashcards</span>
                    </span>
                    {questionSuite && (
                      <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{questionSuite.questions.length} Questions</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDeck(record, 'study')}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      Open Guide
                    </button>
                    {questionSuite && (
                      <button
                        onClick={() => onSelectDeck(record, 'quiz')}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                      >
                        Practice Quiz
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleExportDeck(e, material)}
                      title="Download Markdown"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {decks.length > 1 && (
                      <button
                        onClick={() => onDeleteDeck(material.id)}
                        title="Delete Deck"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
