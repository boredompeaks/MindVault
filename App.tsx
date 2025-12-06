
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Note, ViewMode, Attachment, ChatMessage, DeepStudyMode, Toast } from './types';
import { DEFAULT_NOTE_CONTENT, SUBJECTS } from './constants';
import { identifySubject, generateTitle } from './services/geminiService';
import { saveNoteToDB, deleteNoteFromDB, getAllNotesFromDB, migrateFromLocalStorage } from './services/db';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Dashboard } from './components/Dashboard';
import { AIStudyAssistant } from './components/AIStudyAssistant';
import { RoutineDashboard } from './components/RoutineDashboard';
import { Sidebar } from './components/Sidebar';
import { DeepStudyModal } from './components/DeepStudyModal';
import { ToastContainer } from './components/Toast';
import { 
  Trash2, FileText, Image as ImageIcon, Paperclip, 
  Sparkles, Loader2, X, BrainCircuit 
} from 'lucide-react';

// --- Constants ---
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; 

// --- Helper Functions ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Helper Components ---

const FileAttachmentView = ({ attachment, onView, onDelete }: { attachment: Attachment, onView: (d: string, t: string) => void, onDelete: () => void }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2 group transition-all hover:shadow-md hover:border-indigo-200">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 bg-indigo-50 rounded text-indigo-600">
           {attachment.type === 'pdf' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
        </div>
        <div className="truncate">
           <div className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{attachment.name}</div>
           <div className="text-xs text-gray-400 uppercase">{attachment.type}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
         <button 
           onClick={() => onView(attachment.data, attachment.type)}
           className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium transition-colors"
         >
           View
         </button>
         <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
            <Trash2 className="w-4 h-4" />
         </button>
      </div>
    </div>
  )
}

const PDFOverlay = ({ data, onClose }: { data: string, onClose: () => void }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const base64Content = data.includes('base64,') ? data.split('base64,')[1] : data;
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        } catch (e) {
            console.error("Error creating PDF blob", e);
            setError("Could not render PDF. File might be corrupted.");
        }
    }, [data]);

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full h-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-fade-in">
                <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2"><FileText className="w-4 h-4"/> PDF Viewer</span>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 relative bg-gray-100">
                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-500">
                            <X className="w-12 h-12 mb-4 opacity-50" />
                            <p>{error}</p>
                        </div>
                    ) : blobUrl ? (
                        <iframe 
                            src={blobUrl} 
                            className="w-full h-full border-none"
                            title="PDF Viewer"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Pages ---

const NoteEditorPage = ({ 
  notes, 
  updateNote, 
  deleteNote,
  addNote,
  addToast
}: { 
  notes: Note[], 
  updateNote: (n: Note) => void, 
  deleteNote: (id: string) => void,
  addNote: (n: Note) => void,
  addToast: (m: string, t: 'success'|'error'|'info') => void
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

  useEffect(() => {
    const timer = setTimeout(handleSave, 1500); 
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
      setAttachments(prev => prev.filter(a => a.id !== attId));
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
        />
      )}
    </div>
  );
};


// --- App Logic ---

const App = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState(0);
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToasts(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const init = async () => {
        await migrateFromLocalStorage();
        const dbNotes = await getAllNotesFromDB();
        
        if (dbNotes.length === 0) {
             const initialNote: Note = {
                id: 'welcome',
                title: 'Welcome to MindVault',
                content: DEFAULT_NOTE_CONTENT,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: ['guide', 'welcome'],
                subject: 'General',
                attachments: []
              };
              await saveNoteToDB(initialNote);
              setNotes([initialNote]);
        } else {
            setNotes(dbNotes);
        }
    };
    init();
  }, []);

  const addNote = async (partialNote?: Partial<Note>) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      subject: 'General',
      attachments: [],
      ...partialNote
    };
    await saveNoteToDB(newNote);
    setNotes(prev => [newNote, ...prev]);
    return newNote.id;
  };

  const updateNote = async (updated: Note) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    await saveNoteToDB(updated);
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await deleteNoteFromDB(id);
  };

  // Fixed Sequential Processing for Stability
  const autoOrganizeNotes = async () => {
      if(!window.confirm("This will use AI to categorize and RENAME your notes based on content. Continue?")) return;
      
      setOrganizing(true);
      setOrganizeProgress(0);
      
      try {
          // Process sequentially to avoid rate limits and crashes
          const notesToProcess = [...notes];
          let updatedCount = 0;

          for (let i = 0; i < notesToProcess.length; i++) {
              const note = notesToProcess[i];
              // Skip empty notes or notes that already have good titles (simple check)
              if (note.content.length < 20) continue; 

              try {
                // Rate Limit Protection: Wait 1.5 seconds between requests
                await sleep(1500);

                // Determine new metadata
                const newSubject = await identifySubject(note.content);
                const newTitle = (note.title === 'New Note' || note.title === 'Untitled Note' || note.title === 'Untitled') 
                    ? await generateTitle(note.content) 
                    : note.title;

                const updatedNote = {
                    ...note,
                    subject: newSubject,
                    title: newTitle
                };

                // Update DB immediately
                await saveNoteToDB(updatedNote);
                
                // Update Local State immediately for UI feedback
                setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                
                updatedCount++;
                setOrganizeProgress(Math.round(((i + 1) / notesToProcess.length) * 100));

              } catch (err) {
                  console.error(`Failed to organize note ${note.id}`, err);
              }
          }
          addToast(`Organized ${updatedCount} notes successfully`, 'success');

      } catch (e) {
          console.error("Critical Organization Failure", e);
          addToast("Organization process failed midway.", 'error');
      } finally {
          setOrganizing(false);
          setOrganizeProgress(0);
      }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mindvault_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast("Export started", 'info');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
            for(const note of parsed) {
                await saveNoteToDB(note);
            }
            const dbNotes = await getAllNotesFromDB();
            setNotes(dbNotes);
            addToast("Vault imported successfully", 'success');
        } else {
            throw new Error("Invalid format");
        }
      } catch (err) {
        addToast("Failed to import JSON. Invalid format.", 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-screen overflow-hidden text-slate-800 font-sans bg-transparent selection:bg-indigo-100 selection:text-indigo-800">
        
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        <Sidebar 
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            notes={notes}
            addNote={async () => { await addNote(); }}
            autoOrganize={autoOrganizeNotes}
            isOrganizing={organizing}
            organizeProgress={organizeProgress}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onExport={handleExport}
            onImport={handleImport}
        />

        {/* Main Content */}
        <div className="flex-1 h-full overflow-hidden relative bg-white/50 backdrop-blur-sm">
           <Routes>
             <Route path="/" element={<Dashboard notes={notes} />} />
             <Route path="/routine" element={<RoutineDashboard />} />
             <Route 
                path="/note/:id" 
                element={
                    <NoteEditorPage 
                        notes={notes} 
                        updateNote={updateNote} 
                        deleteNote={deleteNote} 
                        addNote={addNote} 
                        addToast={addToast}
                    />
                } 
             />
           </Routes>
        </div>

      </div>
    </HashRouter>
  );
};

export default App;
