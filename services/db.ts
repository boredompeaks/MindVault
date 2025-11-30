
import { Note, Attachment } from '../types';

const DB_NAME = 'MindVaultDB';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
    };
  });
};

export const saveNoteToDB = async (note: Note): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    store.put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteNoteFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllNotesFromDB = async (): Promise<Note[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readonly');
    const store = tx.objectStore(STORE_NOTES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Migrate from LocalStorage if needed
export const migrateFromLocalStorage = async (): Promise<Note[]> => {
    const dbNotes = await getAllNotesFromDB();
    if (dbNotes.length > 0) return dbNotes;

    const localData = localStorage.getItem('mindvault_notes_v2');
    if (localData) {
        try {
            const notes: Note[] = JSON.parse(localData);
            for (const note of notes) {
                await saveNoteToDB(note);
            }
            // Optional: localStorage.removeItem('mindvault_notes_v2');
            return notes;
        } catch (e) {
            console.error("Migration failed", e);
        }
    }
    return [];
}
