import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Globe, Download, Copy, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { GlobalNote } from '../types/cms';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Note } from '../types';

interface GlobalNotePageProps {
  onForkNote: (note: Note) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const GlobalNotePage: React.FC<GlobalNotePageProps> = ({ onForkNote, addToast }) => {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<GlobalNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileName) {
      loadNote(fileName);
    }
  }, [fileName]);

  const loadNote = async (fileName: string) => {
    try {
      setLoading(true);
      setError(null);
      const loadedNote = await cmsService.fetchNote(fileName);
      if (loadedNote) {
        setNote(loadedNote);
      } else {
        setError('Note not found');
      }
    } catch (err) {
      console.error('Error loading note:', err);
      setError('Failed to load note');
    } finally {
      setLoading(false);
    }
  };

  const handleFork = () => {
    if (!note) return;

    const forkedNote: Note = {
      id: crypto.randomUUID(),
      title: `${note.title} (Copy)`,
      content: note.content,
      subject: note.subject,
      tags: [...note.tags, 'forked'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
    };

    onForkNote(forkedNote);
    addToast('Note forked to your collection!', 'success');
    navigate(`/note/${forkedNote.id}`);
  };

  const handleCopyContent = () => {
    if (!note) return;
    navigator.clipboard.writeText(note.content);
    addToast('Content copied to clipboard!', 'success');
  };

  const handleDownload = () => {
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Note downloaded!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">{error || 'Note not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h1 className="text-xl font-bold text-gray-900">{note.title}</h1>
          </div>
          
          <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded">
            Community Note
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyContent}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy content"
          >
            <Copy className="w-4 h-4" />
            <span className="text-sm">Copy</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download as markdown"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download</span>
          </button>
          
          <button
            onClick={handleFork}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Fork to My Notes</span>
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-sm">
        <span className="text-gray-600">
          <strong>Subject:</strong> {note.subject}
        </span>
        <span className="text-gray-600">
          <strong>Author:</strong> {note.author}
        </span>
        {note.estimatedReadTime && (
          <span className="text-gray-600">
            <strong>Read Time:</strong> {note.estimatedReadTime} minutes
          </span>
        )}
        {note.difficulty && (
          <span className="text-gray-600">
            <strong>Level:</strong> {note.difficulty}
          </span>
        )}
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto p-8">
          <MarkdownRenderer content={note.content} />
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
};
