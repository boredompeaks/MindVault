import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';

interface PDFOverlayProps {
  data: string;
  onClose: () => void;
}

export const PDFOverlay: React.FC<PDFOverlayProps> = ({ data, onClose }) => {
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
