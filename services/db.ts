import { Note, Task } from '../types';

const DB_NAME = 'MindVaultDB';
const DB_VERSION = 2; // Incremented for 'tasks' store
const STORE_NOTES = 'notes';
const STORE_TASKS = 'tasks';

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
      if (!db.objectStoreNames.contains(STORE_TASKS)) {
        db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
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

// --- Task Functions ---

export const saveTaskToDB = async (task: Task): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TASKS, 'readwrite');
      const store = tx.objectStore(STORE_TASKS);
      store.put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};
  
export const deleteTaskFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TASKS, 'readwrite');
      const store = tx.objectStore(STORE_TASKS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

export const getAllTasksFromDB = async (): Promise<Task[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TASKS, 'readonly');
      const store = tx.objectStore(STORE_TASKS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
};

// Migrate from LocalStorage if needed
export const migrateFromLocalStorage = async (): Promise<void> => {
    // 1. Migrate Notes
    const dbNotes = await getAllNotesFromDB();
    if (dbNotes.length === 0) {
        const localData = localStorage.getItem('mindvault_notes_v2');
        if (localData) {
            try {
                const notes: Note[] = JSON.parse(localData);
                for (const note of notes) {
                    await saveNoteToDB(note);
                }
            } catch (e) {
                console.error("Note Migration failed", e);
            }
        }
    }

    // 2. Migrate Tasks
    const dbTasks = await getAllTasksFromDB();
    if (dbTasks.length === 0) {
        const localRoutine = localStorage.getItem('mindvault_routine');
        if (localRoutine) {
            try {
                const tasks: Task[] = JSON.parse(localRoutine);
                for (const task of tasks) {
                    await saveTaskToDB(task);
                }
                // Clean up old localStorage after successful migration
                localStorage.removeItem('mindvault_routine');
                console.log('🧹 Cleaned up legacy routine localStorage data');
            } catch (e) {
                console.error("Task Migration failed", e);
            }
        }
    }
    
    // 3. Clean up legacy notes from localStorage
    const legacyNotes = localStorage.getItem('mindvault_notes_v2');
    if (legacyNotes && dbNotes.length > 0) {
        localStorage.removeItem('mindvault_notes_v2');
        console.log('🧹 Cleaned up legacy notes localStorage data');
    }
}