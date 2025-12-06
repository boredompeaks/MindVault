
import React, { useState } from 'react';
import { Attachment, DeepStudyMode, Note } from '../types';
import { generateDetailedNotesFromPDF, generateICSEPaper, gradeAnswerSheet } from '../services/geminiService';
import { ICSE_EXAM_PATTERNS } from '../constants';
import { 
    X, Sparkles, BookOpen, FileText, PenTool, Loader2, 
    UploadCloud, CheckCircle2, ChevronRight, GraduationCap, Plus 
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DeepStudyModalProps {
    mode: DeepStudyMode;
    note: Note;
    allNotes: Note[]; // For "Full Subject" context
    onClose: () => void;
    onInsertContent: (text: string) => void;
    onSaveNewNote: (title: string, content: string) => void;
    addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DeepStudyModal: React.FC<DeepStudyModalProps> = ({ 
    mode: initialMode, note, allNotes, onClose, onInsertContent, onSaveNewNote, addToast
}) => {
    const [activeTab, setActiveTab] = useState<DeepStudyMode>(initialMode);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    
    // Synthesize State
    const [selectedPdfId, setSelectedPdfId] = useState<string>('');
    const pdfAttachments = note.attachments?.filter(a => a.type === 'pdf') || [];

    // Exam State
    const [examConfig, setExamConfig] = useState({
        pattern: ICSE_EXAM_PATTERNS[0].name,
        marks: 80,
        focus: '',
        useFullSubject: false
    });

    // Grading State
    const [gradingImages, setGradingImages] = useState<string[]>([]);
    const [questionPaperContext, setQuestionPaperContext] = useState('');

    const handleSynthesize = async () => {
        if (!selectedPdfId) {
            addToast("Please select a PDF first", 'error');
            return;
        }
        const pdf = pdfAttachments.find(p => p.id === selectedPdfId);
        if (!pdf) return;

        setLoading(true);
        const text = await generateDetailedNotesFromPDF(pdf.data);
        if (text.startsWith("Error") || text.startsWith("Failed")) {
             addToast(text, 'error');
        } else {
             setResult(text);
        }
        setLoading(false);
    };

    const handleGenerateExam = async () => {
        setLoading(true);
        let context = note.content;
        
        if (examConfig.useFullSubject && note.subject) {
            // Aggregate all notes for this subject
            context = allNotes
                .filter(n => n.subject === note.subject)
                .map(n => `--- Chapter: ${n.title} ---\n${n.content}`)
                .join('\n\n');
        }

        const text = await generateICSEPaper({
            subject: note.subject || 'General',
            pattern: examConfig.pattern,
            marks: examConfig.marks,
            focus: examConfig.focus
        }, context);
        
        setResult(text);
        setLoading(false);
    };

    const handleGrade = async () => {
        if (gradingImages.length === 0) {
            addToast("Upload at least one image of your answers", 'error');
            return;
        }
        setLoading(true);
        const report = await gradeAnswerSheet(gradingImages, questionPaperContext, note.content);
        if (report.startsWith("Error") || report.startsWith("Failed")) {
            addToast(report, 'error');
        } else {
            setResult(report);
        }
        setLoading(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) {
                    setGradingImages(prev => [...prev, ev.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-500 rounded-lg">
                             <Sparkles className="w-5 h-5 text-white" />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold">Deep Study</h2>
                             <p className="text-xs text-slate-400">Powered by Gemini 2.0 Flash Thinking</p>
                         </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex bg-slate-100 p-1 shrink-0 border-b border-gray-200">
                    <TabButton 
                        active={activeTab === 'synthesize'} 
                        onClick={() => { setActiveTab('synthesize'); setResult(null); }}
                        icon={BookOpen} label="Synthesize Notes" 
                    />
                    <TabButton 
                        active={activeTab === 'exam'} 
                        onClick={() => { setActiveTab('exam'); setResult(null); }}
                        icon={FileText} label="Exam Studio" 
                    />
                    <TabButton 
                        active={activeTab === 'grade'} 
                        onClick={() => { setActiveTab('grade'); setResult(null); }}
                        icon={PenTool} label="AI Grader" 
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden flex">
                    
                    {/* Left Panel: Configuration */}
                    {!result && (
                        <div className="flex-1 overflow-y-auto p-8 bg-white flex flex-col items-center justify-center">
                            
                            {/* --- Synthesize Config --- */}
                            {activeTab === 'synthesize' && (
                                <div className="w-full max-w-md space-y-6">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-slate-800">Transform PDFs into Notes</h3>
                                        <p className="text-gray-500">Select an attached PDF to generate study material.</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-700">Select Attachment</label>
                                        <select 
                                            value={selectedPdfId} 
                                            onChange={(e) => setSelectedPdfId(e.target.value)}
                                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">-- Choose a PDF --</option>
                                            {pdfAttachments.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        {pdfAttachments.length === 0 && (
                                            <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                                                No PDFs found. Attach a PDF to the note first.
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handleSynthesize}
                                        disabled={!selectedPdfId || loading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Wand2Icon />}
                                        Generate Notes
                                    </button>
                                </div>
                            )}

                            {/* --- Exam Config --- */}
                            {activeTab === 'exam' && (
                                <div className="w-full max-w-md space-y-6">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-slate-800">ICSE Paper Generator</h3>
                                        <p className="text-gray-500">Create rigorous exam papers based on board patterns.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Pattern</label>
                                            <select 
                                                value={examConfig.pattern}
                                                onChange={(e) => setExamConfig({...examConfig, pattern: e.target.value})}
                                                className="w-full p-3 rounded-xl border border-gray-300 bg-white"
                                            >
                                                {ICSE_EXAM_PATTERNS.map(p => (
                                                    <option key={p.name} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Focus Area (Optional)</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Newton's Laws, French Revolution"
                                                value={examConfig.focus}
                                                onChange={(e) => setExamConfig({...examConfig, focus: e.target.value})}
                                                className="w-full p-3 rounded-xl border border-gray-300"
                                            />
                                        </div>

                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <input 
                                                type="checkbox" 
                                                id="fullSubject"
                                                checked={examConfig.useFullSubject}
                                                onChange={(e) => setExamConfig({...examConfig, useFullSubject: e.target.checked})}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <label htmlFor="fullSubject" className="text-sm font-medium text-gray-700">
                                                Include entire "{note.subject}" subject
                                                <span className="block text-xs text-gray-500 font-normal">Combines all notes in this subject folder</span>
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGenerateExam}
                                        disabled={loading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <FileText />}
                                        Generate Paper
                                    </button>
                                </div>
                            )}

                            {/* --- Grading Config --- */}
                            {activeTab === 'grade' && (
                                <div className="w-full max-w-md space-y-6">
                                     <div className="text-center mb-4">
                                        <h3 className="text-2xl font-bold text-slate-800">AI Examiner</h3>
                                        <p className="text-gray-500">Upload multiple pages of answers.</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Question Paper / Assignment Instructions</label>
                                        <textarea 
                                            value={questionPaperContext}
                                            onChange={(e) => setQuestionPaperContext(e.target.value)}
                                            placeholder="Paste the questions here so the AI knows what to grade against..."
                                            className="w-full p-3 rounded-lg border border-gray-300 h-24 text-sm focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Answer Sheets (Images)</label>
                                        <div className="grid grid-cols-4 gap-2 mb-2">
                                            {gradingImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square bg-gray-100 rounded border overflow-hidden">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => setGradingImages(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:bg-gray-100 text-gray-400 hover:text-indigo-500">
                                                <Plus className="w-6 h-6" />
                                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-400 text-right">{gradingImages.length} pages uploaded</p>
                                    </div>

                                    <button 
                                        onClick={handleGrade}
                                        disabled={gradingImages.length === 0 || loading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <GraduationCap />}
                                        Check My Paper
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right Panel / Full Result View */}
                    {result && (
                        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white animate-fade-in">
                             <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                 <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                     <CheckCircle2 className="w-5 h-5 text-green-500" />
                                     Generated Successfully
                                 </h4>
                                 <div className="flex gap-2">
                                     {activeTab === 'exam' && (
                                         <button 
                                            onClick={() => {
                                                onSaveNewNote(`Exam: ${note.subject} - ${examConfig.pattern}`, result);
                                                addToast("Exam saved as new note!", 'success');
                                            }}
                                            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50"
                                         >
                                             Save as New Note
                                         </button>
                                     )}
                                     <button 
                                        onClick={() => {
                                            onInsertContent(result);
                                            addToast("Content inserted into note!", 'success');
                                        }}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
                                     >
                                         {activeTab === 'synthesize' ? 'Append to Note' : 'Insert into Note'}
                                     </button>
                                     <button 
                                        onClick={() => setResult(null)}
                                        className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
                                     >
                                         Back
                                     </button>
                                 </div>
                             </div>
                             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                                 <div className="max-w-3xl mx-auto prose prose-indigo">
                                     <MarkdownRenderer content={result} />
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all border-b-2 ${
            active 
            ? 'bg-white border-indigo-600 text-indigo-600' 
            : 'text-gray-500 border-transparent hover:bg-slate-50 hover:text-gray-700'
        }`}
    >
        <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-400'}`} />
        {label}
    </button>
);

const Wand2Icon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 2 2 2-2 2-2-2 2-2Z"/><path d="m5 16 6-6"/><path d="m11 8-2-2"/><path d="m15 12 3-3"/><path d="m20 11-8.5-8.5a2.12 2.12 0 0 0-3 3L17 14"/><path d="m3 21 6-6"/></svg>
)
