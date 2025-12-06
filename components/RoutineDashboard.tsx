import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { getAllTasksFromDB, saveTaskToDB, deleteTaskFromDB } from '../services/db';
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export const RoutineDashboard: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'exam'>('daily');

    useEffect(() => {
        const loadTasks = async () => {
            const dbTasks = await getAllTasksFromDB();
            if (dbTasks.length > 0) {
                setTasks(dbTasks);
            } else {
                // Default tasks if completely empty (and migration found nothing)
                 const defaults: Task[] = [
                    { id: '1', text: 'Review Flashcards', completed: false, category: 'daily', priority: 'high' },
                    { id: '2', text: 'Solve 10 Physics Numericals', completed: true, category: 'daily', priority: 'medium' },
                ];
                // Only save defaults if we really want to initialize the DB with them
                // For now, let's just set them in state, but maybe not save them to avoid phantom data?
                // actually, let's leave it empty or just show these as placeholders if we want.
                // But sticking to original logic:
                if (localStorage.getItem('mindvault_routine')) {
                    // Wait for migration? or just re-read?
                    // Assuming migration happened in App.tsx, if we are here, maybe it failed or finished.
                    // Let's just use the defaults as a starting point for a new user.
                     setTasks(defaults);
                     defaults.forEach(t => saveTaskToDB(t));
                } else {
                     setTasks(defaults);
                     defaults.forEach(t => saveTaskToDB(t));
                }
            }
        };
        loadTasks();
    }, []);

    const addTask = async () => {
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: crypto.randomUUID(),
            text: newTaskText,
            completed: false,
            category: activeTab,
            priority: 'medium'
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskText('');
        await saveTaskToDB(newTask);
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const updated = { ...task, completed: !task.completed };
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
            await saveTaskToDB(updated);
        }
    };

    const deleteTask = async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        await deleteTaskFromDB(id);
    };

    const filteredTasks = tasks.filter(t => t.category === activeTab);
    const progress = filteredTasks.length > 0 
        ? Math.round((filteredTasks.filter(t => t.completed).length / filteredTasks.length) * 100) 
        : 0;

    return (
        <div className="h-full bg-gray-50 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Routine</h1>
                        <p className="text-slate-500 mt-2 text-lg">Stay disciplined and track your study goals.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-indigo-600">{progress}%</div>
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Completion</div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
                    {(['daily', 'weekly', 'exam'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                                activeTab === tab 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-3">
                        <input 
                            type="text" 
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTask()}
                            placeholder={`Add a new ${activeTab} task...`}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <button onClick={addTask} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredTasks.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 italic">No tasks for this routine yet.</div>
                        ) : (
                            filteredTasks.map(task => (
                                <div key={task.id} className={`group flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${task.completed ? 'bg-gray-50/50' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => toggleTask(task.id)} className={`transition-colors ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-indigo-500'}`}>
                                            {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                        </button>
                                        <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                            {task.text}
                                        </span>
                                    </div>
                                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-indigo-900">Pro Tip</h4>
                        <p className="text-xs text-indigo-700 mt-1">
                            Break down large chapters into small "Weekly" checklist items (e.g., "History Ch.1: Read pages 1-10"). Use "Exam" for major milestones.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};