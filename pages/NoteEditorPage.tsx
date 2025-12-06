import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Note, ViewMode, Attachment, ChatMessage, DeepStudyMode } from '../types';
import { MAX_ATTACHMENT_SIZE } from '../constants';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { AIStudyAssistant } from '../components/AIStudyAssistant';
import { DeepStudyModal } from '../components/DeepStudyModal';
import { FileAttachmentView } from '../components/FileAttachmentView';
import { PDFOverlay } from '../components/PDFOverlay';
import { 
  Trash2, Paperclip, Sparkles, Loader2, BrainCircuit 
} from 'lucide-react';

interface NoteEditorPageProps {
  notes: Note[];
  updateNote: (n: Note) => void;
  deleteNote: (id: string) => void;
  addNote: (n: Note) => void;
  addToast: (m: string, t: 'success'|'error'|'info') => void;
}

export const NoteEditorPage: React.FC<NoteEditorPageProps> = ({
  notes,
  updateNote,
  deleteNote,
  addNote,
  addToast
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const note = notes.find(n => n.id === id);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // UI States
  const [isAIContextMenuOpen, setIsAIContextMenuOpen] = useState(false);
  const [deepStudyMode, setDeepStudyMode] = useState<DeepStudyMode | null>(null);
  const [mode, setMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [isUploading, setIsUploading] = useState(false);
  const [overlayData, setOverlayData] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setChatHistory([]);
  }, [id]);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setTitle(note.title);
      setAttachments(note.attachments || []);
    }
  }, [note?.id]); 

  const handleSave = useCallback(() => {
    if (!note) return;
    if (note.title === title && note.content === content && JSON.stringify(note.attachments) === JSON.stringify(attachments)) {
        return;
    }
    updateNote({
      ...note,
      title,
      content,
      attachments,
      updatedAt: Date.now()
    });
  }, [note, title, content, attachments, updateNote]);

  // Auto-save with proper cleanup to prevent race conditions
  useEffect(() => {
    const timer = setTimeout(handleSave, 1500); 
    // Cleanup: cancel pending save on unmount or when dependencies change
    return () => clearTimeout(timer);
  }, [content, title, attachments, handleSave]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
        addToast("File too large! Max 20MB allowed.", 'error');
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (ev) => {
        try {
            const result = ev.target?.result as string;
            
            if (file.type === 'application/pdf') {
                const newAttachment: Attachment = {
                    id: crypto.randomUUID(),
                    type: 'pdf',
                    name: file.name,
                    data: result
                };
                setAttachments(prev => [...prev, newAttachment]);
                addToast("PDF Attached", 'success');
            } else if (file.type.startsWith('image/')) {
                 const newAttachment: Attachment = {
                    id: crypto.randomUUID(),
                    type: 'image',
                    name: file.name,
                    data: result
                };
                setAttachments(prev => [...prev, newAttachment]);
                 setContent(prev => prev + `\n\n![${file.name}](${result})\n\n`);
                 addToast("Image embedded", 'success');
            } else if (file.name.endsWith('.md') || file.type === 'text/plain') {
                 setContent(prev => prev + `\n\n${result}\n\n`);
                 addToast("Text appended", 'success');
            } else {
                 addToast("Unsupported file type", 'error');
            }
        } catch (e) {
            addToast("Error processing file", 'error');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    if (file.name.endsWith('.md') || file.type === 'text/plain') {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (attId: string) => {
      const attachment = attachments.find(a => a.id === attId);
      
      // Remove from attachments array
      setAttachments(prev => prev.filter(a => a.id !== attId));
      
      // Also remove embedded images from content
      if (attachment && attachment.type === 'image' && attachment.data) {
        // Remove markdown image syntax that contains this image data
        const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\(${attachment.data.substring(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)`, 'g');
        setContent(prev => prev.replace(imagePattern, ''));
      }
      
      addToast("Attachment removed", 'info');
  };

  if (!note) return <div className="p-10 text-center text-gray-500">Note not found</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {overlayData && <PDFOverlay data={overlayData} onClose={() => setOverlayData(null)} />}
      
      {deepStudyMode && (
          <DeepStudyModal 
            mode={deepStudyMode}
            note={note}
            allNotes={notes}
            onClose={() => setDeepStudyMode(null)}
            onInsertContent={(text) => setContent(prev => prev + '\n\n' + text)}
            addToast={addToast}
            onSaveNewNote={(newTitle, newContent) => {
                const newNote: Note = {
                    id: crypto.randomUUID(),
                    title: newTitle,
                    content: newContent,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    tags: ['exam-generated'],
                    subject: note.subject,
                    attachments: []
                };
                addNote(newNote);
                setDeepStudyMode(null);
                navigate(`/note/${newNote.id}`);
            }}
          />
      )}

      {/* Toolbar */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4 flex-1">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 placeholder-gray-300 w-full focus:outline-none"
            placeholder="Untitled Note"
          />
        </div>
        <div className="flex items-center gap-2">
           <label className={`flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`} title="Attach PDF/Image">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                <input type="file" className="hidden" accept="image/*,.pdf,.md,.txt" onChange={handleFileUpload} disabled={isUploading} />
           </label>

          <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
            <button 
                onClick={() => setMode(ViewMode.EDIT)} 
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === ViewMode.EDIT ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Edit
            </button>
             <button 
                onClick={() => setMode(ViewMode.SPLIT)} 
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === ViewMode.SPLIT ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Split
            </button>
            <button 
                onClick={() => setMode(ViewMode.PREVIEW)} 
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === ViewMode.PREVIEW ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                View
            </button>
          </div>

          <button 
            onClick={() => setDeepStudyMode('synthesize')}
            className="px-3 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
             <BrainCircuit className="w-4 h-4" />
             <span className="text-xs font-bold hidden md:inline">Deep Study</span>
          </button>
          
          <button 
            onClick={() => setIsAIContextMenuOpen(!isAIContextMenuOpen)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${isAIContextMenuOpen ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'}`}
            title="AI Study Assistant"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => {
                if(window.confirm('Are you sure you want to delete this note?')) {
                    deleteNote(note.id);
                    navigate('/');
                    addToast("Note deleted", 'info');
                }
            }}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 overflow-hidden flex relative bg-gray-50">
        {(mode === ViewMode.EDIT || mode === ViewMode.SPLIT) && (
            <div className={`h-full flex flex-col ${mode === ViewMode.SPLIT ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
                 <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-xs text-gray-400 flex justify-between items-center">
                     <span>Markdown Editor</span>
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-300">Syncing to IndexedDB</span>
                 </div>
                 <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-800 bg-white"
                    placeholder="# Start typing...\n\n- Paste YouTube links to embed video player\n- Use Assistant to quiz yourself"
                />
            </div>
        )}
        
        {(mode === ViewMode.PREVIEW || mode === ViewMode.SPLIT) && (
            <div className={`h-full overflow-y-auto bg-slate-50/50 custom-scrollbar ${mode === ViewMode.SPLIT ? 'w-1/2' : 'w-full'}`}>
                <div className="p-8 min-h-full max-w-4xl mx-auto">
                    {/* Render Attachments area */}
                    {attachments.length > 0 && (
                        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                             <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <Paperclip className="w-3 h-3" /> Attachments
                             </h4>
                             <div className="grid grid-cols-1 gap-2">
                                {attachments.map(att => (
                                    <FileAttachmentView 
                                        key={att.id} 
                                        attachment={att} 
                                        onView={(data) => setOverlayData(data)}
                                        onDelete={() => removeAttachment(att.id)} 
                                    />
                                ))}
                             </div>
                        </div>
                    )}
                    
                    <MarkdownRenderer content={content} />
                    <div className="h-20" /> 
                </div>
            </div>
        )}
      </div>

      {isAIContextMenuOpen && (
        <AIStudyAssistant 
            noteContent={content} 
            onClose={() => setIsAIContextMenuOpen(false)}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            attachments={attachments}
        />
      )}
    </div>
  );
};