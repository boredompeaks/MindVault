import React, { useState, useRef, useEffect } from 'react';
import { generateNoteSummary, generateQuizFromNote, chatWithNote } from '../services/geminiService';
import { QuizQuestion, ChatMessage, Attachment } from '../types';
import { Sparkles, Send, Loader2, MessageCircleQuestion, GraduationCap, Brain, Info, X, Paperclip } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AIStudyAssistantProps {
  noteContent: string;
  onClose: () => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  attachments?: Attachment[];
}

export const AIStudyAssistant: React.FC<AIStudyAssistantProps> = ({ 
    noteContent, 
    onClose,
    chatHistory,
    setChatHistory,
    attachments = []
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'chat'>('chat');
  
  // Summary State
  const [summary, setSummary] = useState<string | null>(null);
  
  // Quiz State
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  
  // Chat Local State
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Loading State
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading, activeTab]);

  const handleGenerateSummary = async () => {
    setLoading(true);
    const res = await generateNoteSummary(noteContent);
    setSummary(res);
    setLoading(false);
  };

  const handleGenerateQuiz = async () => {
    setLoading(true);
    const res = await generateQuizFromNote(noteContent);
    setQuiz(res);
    setLoading(false);
    setSelectedAnswers({});
    setShowResults(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Pass attachments to the service
    const response = await chatWithNote(chatHistory, noteContent, userMsg, attachments);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  const pdfCount = attachments.filter(a => a.type === 'pdf').length;
  const imgCount = attachments.filter(a => a.type === 'image').length;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 w-[500px] shadow-2xl fixed right-0 top-0 z-50 overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
        <h2 className="font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Study Assistant
        </h2>
        <button onClick={onClose} className="text-indigo-100 hover:text-white transition-colors">
            <X className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
        <button 
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('chat')}
        >
            Teach Me
        </button>
        <button 
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('summary')}
        >
            Summary
        </button>
        <button 
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'quiz' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('quiz')}
        >
            Quiz
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar">
        
        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Info Banner */}
            <div className="mb-4 bg-indigo-50 border border-indigo-100 p-2 rounded-lg flex flex-col gap-1 text-[10px] text-indigo-700">
                <div className="flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    <span>Model: <strong>Gemini 1.5 Flash</strong> (Multimodal)</span>
                </div>
                {(pdfCount > 0 || imgCount > 0) && (
                    <div className="flex items-center gap-2 ml-5 text-indigo-600 font-medium">
                        <Paperclip className="w-3 h-3" />
                        <span>Context: {pdfCount} PDF(s), {imgCount} Image(s) loaded.</span>
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-4 mb-4">
               {chatHistory.length === 0 && (
                 <div className="text-center text-gray-400 mt-20">
                    <MessageCircleQuestion className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ask me anything about your notes!</p>
                    <p className="text-xs mt-2">"Explain the second paragraph"<br/>"What is the main formula?"</p>
                 </div>
               )}
               {chatHistory.map((msg, i) => (
                 <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                     msg.role === 'user' 
                     ? 'bg-indigo-600 text-white rounded-br-none' 
                     : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
                   }`}>
                     {msg.role === 'model' ? (
                        <MarkdownRenderer content={msg.text} isChat={true} />
                     ) : (
                         msg.text
                     )}
                   </div>
                 </div>
               ))}
               {loading && (
                 <div className="flex justify-start">
                   <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-200">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                   </div>
                 </div>
               )}
               <div ref={chatEndRef} />
            </div>

            <div className="mt-auto relative">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={attachments.length > 0 ? "Ask about the attached files..." : "Ask a doubt..."}
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || loading}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}

        {/* --- SUMMARY TAB --- */}
        {activeTab === 'summary' && (
            <div className="space-y-4">
                {!summary && !loading && (
                    <div className="text-center mt-20">
                        <Sparkles className="w-12 h-12 mx-auto mb-2 text-indigo-200" />
                        <p className="text-sm text-gray-500 mb-4">Get a quick overview of this topic.</p>
                        <button 
                            onClick={handleGenerateSummary}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
                        >
                            Generate Summary
                        </button>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}
                {summary && (
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm">
                        <h3 className="text-indigo-800 font-bold mb-3 flex items-center gap-2 border-b border-indigo-50 pb-2">
                             <Sparkles className="w-4 h-4" />
                             Summary
                        </h3>
                        <MarkdownRenderer content={summary} isChat={true} />
                    </div>
                )}
            </div>
        )}

        {/* --- QUIZ TAB --- */}
        {activeTab === 'quiz' && (
            <div className="space-y-6">
                 {!quiz && !loading && (
                    <div className="text-center mt-20">
                        <Brain className="w-12 h-12 mx-auto mb-2 text-indigo-200" />
                        <p className="text-sm text-gray-500 mb-4">Test your knowledge with AI questions.</p>
                        <button 
                            onClick={handleGenerateQuiz}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
                        >
                            Create Quiz
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                )}

                {quiz && (
                    <div className="space-y-8 pb-4">
                        {quiz.map((q, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                <h3 className="font-bold text-gray-800 text-sm leading-snug">{idx + 1}. {q.question}</h3>
                                <div className="space-y-2">
                                    {q.options.map((opt, optIdx) => {
                                        let btnClass = "w-full text-left p-2.5 rounded-lg text-sm border transition-all duration-200 ";
                                        if (showResults) {
                                            if (optIdx === q.correctAnswer) btnClass += "bg-green-100 border-green-400 text-green-800 font-medium";
                                            else if (selectedAnswers[idx] === optIdx) btnClass += "bg-red-50 border-red-300 text-red-800";
                                            else btnClass += "bg-gray-50 border-gray-100 text-gray-400 opacity-60";
                                        } else {
                                            if (selectedAnswers[idx] === optIdx) btnClass += "bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500";
                                            else btnClass += "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300";
                                        }

                                        return (
                                            <button 
                                                key={optIdx} 
                                                onClick={() => !showResults && setSelectedAnswers(prev => ({...prev, [idx]: optIdx}))}
                                                className={btnClass}
                                                disabled={showResults}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                                {showResults && (
                                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-100 italic">
                                        <span className="font-bold text-indigo-600">Explanation:</span> {q.explanation}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!showResults ? (
                            <button 
                                onClick={() => setShowResults(true)}
                                className="w-full py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-900 shadow-lg"
                                disabled={Object.keys(selectedAnswers).length < quiz.length}
                            >
                                Submit Answers
                            </button>
                        ) : (
                             <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="font-bold text-lg text-indigo-700 mb-2">
                                    Score: {Object.keys(selectedAnswers).filter(idx => selectedAnswers[Number(idx)] === quiz[Number(idx)].correctAnswer).length} / {quiz.length}
                                </p>
                                <button onClick={handleGenerateQuiz} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">Generate New Quiz</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};