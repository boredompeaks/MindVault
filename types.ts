
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  subject?: string;
  summary?: string;
  attachments?: Attachment[]; // Store metadata only, data in IDB for large files if needed, or kept here for simplicity if < 1MB.
                              // For this update, we will keep structure but App.tsx handles the heavy lifting via DB.
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'file';
  name: string;
  data: string; // Base64
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: 'daily' | 'weekly' | 'exam';
  priority: 'low' | 'medium' | 'high';
}
