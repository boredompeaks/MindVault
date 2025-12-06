import React, { useState, useEffect } from 'react';
import { Globe, BookOpen, Clock, Star, Loader2 } from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { GlobalNoteMetadata } from '../types/cms';

interface GlobalNotesSectionProps {
  onSelectNote: (fileName: string) => void;
  selectedFileName?: string;
}

export const GlobalNotesSection: React.FC<GlobalNotesSectionProps> = ({
  onSelectNote,
  selectedFileName
}) => {
  const [notes, setNotes] = useState<GlobalNoteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalNotes();
  }, []);

  const loadGlobalNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const index = await cmsService.fetchNotesIndex();
      setNotes(index.notes);
    } catch (err) {
      console.error('Error loading global notes:', err);
      setError('Failed to load global notes');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-50';
      case 'intermediate':
        return 'text-blue-600 bg-blue-50';
      case 'advanced':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        No global notes available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase">
        <Globe className="w-3 h-3" />
        <span>Community Notes</span>
      </div>

      {notes.map((note) => (
        <button
          key={note.id}
          onClick={() => onSelectNote(note.fileName)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selectedFileName === note.fileName
              ? 'bg-indigo-50 border-l-2 border-indigo-500'
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {note.featured && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {note.title}
                </h4>
              </div>
              
              {note.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {note.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {note.subject}
                </span>
                
                {note.difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(note.difficulty)}`}>
                    {note.difficulty}
                  </span>
                )}
                
                {note.estimatedReadTime && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {note.estimatedReadTime}m
                  </span>
                )}
              </div>
            </div>
            
            <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
          </div>
        </button>
      ))}
    </div>
  );
};
