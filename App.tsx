
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Note, ViewMode, Attachment, ChatMessage } from './types';
import { APP_STORAGE_KEY, DEFAULT_NOTE_CONTENT, SUBJECTS } from './constants';
import { identifySubject, generateTitle } from './services/geminiService';
import { saveNoteToDB, deleteNoteFromDB, getAllNotesFromDB, migrateFromLocalStorage } from './services/db';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { Dashboard } from './components/Dashboard';
import { AIStudyAssistant } from './components/AIStudyAssistant';
import { RoutineDashboard } from './components/RoutineDashboard';
import { 
  Plus, 
  Menu, 
  Save, 
  Download, 
  Upload, 
  Sparkles, 
  LayoutDashboard, 
  Search,
  BookOpen,
  Edit2,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  FolderOpen,
  Youtube,
  Image as ImageIcon,
  Paperclip,
  Wand2,
  File as FileIcon,
  X,
  Loader2,
  CheckSquare
} from 'lucide-react';

// --- Constants ---
// Increased to 20MB for IndexedDB
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; 

// --- Helper Components ---

const SidebarItem = ({ 
  active, 
  to, 
  icon: Icon, 
  label, 
  subLabel 
}: { active: boolean, to: string, icon: any, label: string, subLabel?: string }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group ${
      active 
      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
    <div className="overflow-hidden">
      <div className="truncate font-medium text-sm">{label}</div>
      {subLabel && <div className="truncate text-xs text-gray-400">{subLabel}</div>}
    </div>
  </Link>
);

const FileAttachmentView = ({ attachment, onView, onDelete }: { attachment: Attachment, onView: (d: string, t: string) => void, onDelete: () => void }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2 group">
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
           className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 font-medium"
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

    useEffect(() => {
        // Convert Base64 data to Blob URL for reliable rendering in iframe
        try {
            // Strip MIME prefix if present (e.g. "data:application/pdf;base64,")
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
        }
    }, [data]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white w-full h-full max-w-5xl rounded-lg shadow-2xl flex flex-col overflow-hidden relative">
                <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 z-10 shadow-lg">
                    <X className="w-5 h-5" />
                </button>
                {blobUrl ? (
                    <iframe 
                        src={blobUrl} 
                        className="w-full h-full border-none"
                        title="PDF Viewer"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Pages ---

const NoteEditorPage = ({ 
  notes, 
  updateNote, 
  deleteNote 
}: { 
  notes: Note[], 
  updateNote: (n: Note) => void, 
  deleteNote: (id: string) => void 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const note = notes.find(n => n.id === id);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAIContextMenuOpen, setIsAIContextMenuOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>(ViewMode.SPLIT);
  const [isUploading, setIsUploading] = useState(false);
  const [overlayData, setOverlayData] = useState<string | null>(null);

  // Chat History Persistence (Per session on this note)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Reset chat history when switching notes
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
    
    // Only update if changes exist
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

  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(handleSave, 1500); 
    return () => clearTimeout(timer);
  }, [content, title, attachments, handleSave]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
        alert("File too large! Max 20MB allowed.");
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
            } else if (file.type.startsWith('image/')) {
                 // Images can go inline or as attachment. 
                 // If large, better as attachment, but Markdown needs URL.
                 // We will append dataURI for now, but in future could use Blob URL + Service Worker (too complex for static)
                 // Or add to attachments list and provide a copyable link.
                 const newAttachment: Attachment = {
                    id: crypto.randomUUID(),
                    type: 'image',
                    name: file.name,
                    data: result
                };
                setAttachments(prev => [...prev, newAttachment]);
                 // Also insert into text if user wants
                 setContent(prev => prev + `\n\n![${file.name}](${result})\n\n`);
            } else if (file.name.endsWith('.md') || file.type === 'text/plain') {
                 // Text append
                 setContent(prev => prev + `\n\n${result}\n\n`);
            } else {
                 alert("Unsupported file type.");
            }
        } catch (e) {
            alert("Error processing file.");
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
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
  };

  if (!note) return <div className="p-10 text-center text-gray-500">Note not found</div>;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {overlayData && <PDFOverlay data={overlayData} onClose={() => setOverlayData(null)} />}
      
      {/* Toolbar */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold text-gray-800 bg-transparent border-none focus:ring-0 placeholder-gray-300 w-full focus:outline-none"
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
            onClick={() => setIsAIContextMenuOpen(!isAIContextMenuOpen)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${isAIContextMenuOpen ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'}`}
            title="AI Study Assistant"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-semibold hidden md:inline">Assistant</span>
          </button>
          
          <button 
            onClick={() => {
                if(window.confirm('Are you sure you want to delete this note?')) {
                    deleteNote(note.id);
                    navigate('/');
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
                        <div className="mb-6 p-4 bg-gray-100 rounded-xl border border-gray-200">
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

  // Load notes on mount from DB
  useEffect(() => {
    const init = async () => {
        // Try migrate
        await migrateFromLocalStorage();
        // Load
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

  const addNote = async () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      subject: 'General',
      attachments: []
    };
    await saveNoteToDB(newNote);
    setNotes(prev => [newNote, ...prev]);
    return newNote.id;
  };

  const updateNote = async (updated: Note) => {
    // Optimistic UI update
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    // Persist to DB
    await saveNoteToDB(updated);
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await deleteNoteFromDB(id);
  };

  const autoOrganizeNotes = async () => {
      if(!window.confirm("This will use AI to categorize and RENAME your notes based on content. Continue?")) return;
      
      setOrganizing(true);
      setOrganizeProgress(0);
      const total = notes.length;
      const updatedNotesList = [...notes];

      // Sequential processing to avoid Rate Limits (Promise.all triggers 429 often on free tier)
      for (let i = 0; i < total; i++) {
          const note = updatedNotesList[i];
          if (note.content.length < 20) continue; // Skip empty

          try {
             // Parallel request for one note is fine
             const [newSubject, newTitle] = await Promise.all([
                 identifySubject(note.content),
                 generateTitle(note.content)
             ]);
             
             updatedNotesList[i] = {
                 ...note,
                 subject: newSubject,
                 title: (note.title === 'New Note' || note.title === 'Untitled Note' || note.title === 'Untitled') ? newTitle : note.title
             };
             
             // Update progress
             setOrganizeProgress(Math.round(((i + 1) / total) * 100));
             
             // Save intermediate result to DB
             await saveNoteToDB(updatedNotesList[i]);

          } catch (e) {
              console.error("Error organizing note", note.id, e);
          }
      }

      setNotes(updatedNotesList);
      setOrganizing(false);
  };

  // Group notes by subject for Sidebar using the strict constants order
  const notesBySubject = notes.reduce((acc, note) => {
      const subject = note.subject || 'General';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(note);
      return acc;
  }, {} as Record<string, Note[]>);

  // Sort subjects based on predefined list, then alphabetical for others
  const sortedSubjects = Object.keys(notesBySubject).sort((a, b) => {
      const idxA = SUBJECTS.indexOf(a);
      const idxB = SUBJECTS.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
  });

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
    n.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <HashRouter>
      <div className="flex h-screen w-screen overflow-hidden text-slate-800 font-sans bg-gray-50 selection:bg-indigo-100 selection:text-indigo-800">
        
        {/* Sidebar */}
        <div className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-80' : 'w-20'} shrink-0 z-20 shadow-xl`}>
          <div className="h-16 flex items-center px-4 border-b border-gray-100 justify-between shrink-0 bg-white">
            {sidebarOpen && (
                 <div className="font-extrabold text-xl text-indigo-600 flex items-center gap-2 tracking-tight">
                    <BookOpen className="w-7 h-7" />
                    MindVault
                </div>
            )}
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-md mx-auto transition-colors">
                {sidebarOpen ? <PanelLeftClose className="w-5 h-5"/> : <PanelLeftOpen className="w-5 h-5" />}
             </button>
          </div>

          <div className="p-4 space-y-3 border-b border-gray-100 shrink-0 bg-white">
             {sidebarOpen ? (
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search notes..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all"
                    />
                </div>
             ) : (
                 <div className="flex justify-center py-2">
                     <Search className="w-5 h-5 text-gray-400" />
                 </div>
             )}
             
             <SidebarItemContainer active={false} to="/" icon={LayoutDashboard} label="Dashboard" sidebarOpen={sidebarOpen} />
             <SidebarItemContainer active={false} to="/routine" icon={CheckSquare} label="Routine" sidebarOpen={sidebarOpen} />
             
             <button 
                onClick={async () => {
                    const id = await addNote();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 ${!sidebarOpen ? 'justify-center' : ''}`}
            >
                <Plus className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium text-sm">New Note</span>}
            </button>
          </div>

          {/* Grouped Notes List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-white">
            
            {/* Auto Organize Button */}
            {sidebarOpen && (
                <button 
                    onClick={autoOrganizeNotes}
                    disabled={organizing}
                    className="w-full mb-6 flex items-center justify-between px-4 py-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100 group"
                >
                    <span className="flex items-center gap-2">
                        <Wand2 className={`w-4 h-4 ${organizing ? 'animate-spin' : ''}`} />
                        {organizing ? `Organizing (${organizeProgress}%)` : 'Auto-Organize Library'}
                    </span>
                </button>
            )}

            {filteredNotes.length === 0 && sidebarOpen && (
                <div className="text-sm text-gray-400 px-4 py-8 text-center italic">
                    No notes found.
                </div>
            )}

            {searchQuery ? (
                // Flat list on search
                filteredNotes.map(note => (
                    <SidebarNavLink key={note.id} note={note} sidebarOpen={sidebarOpen} />
                ))
            ) : (
                // Grouped by Subject
                sortedSubjects.map(subject => (
                    <div key={subject} className="mb-2">
                        {sidebarOpen && (
                            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mt-2 mb-1">
                                {subject}
                            </div>
                        )}
                        {notesBySubject[subject].map(note => (
                            <SidebarNavLink key={note.id} note={note} sidebarOpen={sidebarOpen} />
                        ))}
                    </div>
                ))
            )}
          </div>
          
          {/* Footer Actions */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2 shrink-0">
             <ExportImportButtons sidebarOpen={sidebarOpen} notes={notes} setNotes={setNotes} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 h-full overflow-hidden relative bg-white">
           <Routes>
             <Route path="/" element={<Dashboard notes={notes} />} />
             <Route path="/routine" element={<RoutineDashboard />} />
             <Route path="/note/:id" element={<NoteEditorPage notes={notes} updateNote={updateNote} deleteNote={deleteNote} />} />
           </Routes>
        </div>

      </div>
    </HashRouter>
  );
};

// --- Sub Components ---

const SidebarNavLink = ({ note, sidebarOpen }: { note: Note, sidebarOpen: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === `/note/${note.id}`;
    
    return (
        <Link 
            to={`/note/${note.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 mb-0.5 group ${
                isActive 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-slate-600 hover:bg-gray-100 hover:pl-4'
            } ${!sidebarOpen ? 'justify-center' : ''}`}
        >
             {/* Small indicator dot/icon based on content */}
             <div className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                {note.content.includes('youtube') ? <Youtube className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
             </div>

            {sidebarOpen && (
                <div className="overflow-hidden w-full">
                    <div className="truncate text-sm">
                        {note.title || "Untitled"}
                    </div>
                </div>
            )}
        </Link>
    );
}

const SidebarItemContainer = ({active, to, icon: Icon, label, sidebarOpen}: any) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
            isActive 
            ? 'bg-indigo-50 text-indigo-700 font-medium' 
            : 'text-gray-600 hover:bg-gray-100'
            } ${!sidebarOpen ? 'justify-center' : ''}`}
        >
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
            {sidebarOpen && <span className="text-sm">{label}</span>}
        </Link>
    )
}

const ExportImportButtons = ({sidebarOpen, notes, setNotes}: any) => {
    const exportData = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `mindvault_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      };
    
      const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const parsed = JSON.parse(ev.target?.result as string);
            if (Array.isArray(parsed)) {
                if(parsed.length > 0 && parsed[0].id) {
                    // Bulk save to DB
                    for(const note of parsed) {
                        await saveNoteToDB(note);
                    }
                    // Reload
                    const dbNotes = await getAllNotesFromDB();
                    setNotes(dbNotes);
                    alert("Vault imported successfully!");
                } else {
                    throw new Error("Invalid format");
                }
            }
          } catch (err) {
            alert("Failed to import JSON. Invalid format.");
          }
        };
        reader.readAsText(file);
      };

    if (sidebarOpen) {
        return (
            <div className="grid grid-cols-2 gap-2">
                <button onClick={exportData} className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded transition-colors border border-transparent hover:border-indigo-100">
                    <Download className="w-4 h-4" /> EXPORT
                </button>
                <label className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded cursor-pointer transition-colors border border-transparent hover:border-indigo-100">
                    <Upload className="w-4 h-4" /> IMPORT
                    <input type="file" className="hidden" accept=".json" onChange={importData} />
                </label>
            </div>
        )
    }
    return (
        <button onClick={exportData} className="flex justify-center w-full p-2 text-gray-400 hover:text-indigo-600">
            <Download className="w-5 h-5" />
        </button>
    )
}

export default App;
