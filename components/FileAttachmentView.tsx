import React from 'react';
import { Attachment } from '../types';
import { Trash2, FileText, Image as ImageIcon } from 'lucide-react';

interface FileAttachmentViewProps {
  attachment: Attachment;
  onView: (data: string, type: string) => void;
  onDelete: () => void;
}

export const FileAttachmentView: React.FC<FileAttachmentViewProps> = ({ attachment, onView, onDelete }) => {
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
