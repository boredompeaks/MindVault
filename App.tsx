import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Note, Toast } from './types';
import { DEFAULT_NOTE_CONTENT } from './constants';
import { identifySubject, generateTitle } from './services/geminiService';
import { saveNoteToDB, deleteNoteFromDB, getAllNotesFromDB, migrateFromLocalStorage } from './services/db';
import { Dashboard } from './components/Dashboard';
import { RoutineDashboard } from './components/RoutineDashboard';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Helper Functions ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        try {
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
        } catch (error) {
            console.error('Error initializing app:', error);
            addToast('Failed to load notes. Please refresh the page.', 'error');
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
    <ErrorBoundary>
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
            <ErrorBoundary>
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
            </ErrorBoundary>
          </div>

        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;