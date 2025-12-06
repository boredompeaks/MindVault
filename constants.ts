
// For regular operations - use faster, efficient models
export const GEMINI_FLASH_MODEL = 'gemini-2.0-flash-exp';
export const GEMINI_PRO_MODEL = 'gemini-1.5-pro';

// For Deep Study features - use most powerful model
export const GEMINI_DEEP_STUDY_MODEL = 'gemini-2.0-flash-thinking-exp-1219';
export const APP_STORAGE_KEY = 'mindvault_notes_v3'; 
export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

export const SUBJECTS = [
  "History",
  "Civics",
  "Physics",
  "Physics: Numericals",
  "Biology",
  "Chemistry",
  "Maths",
  "Computer Applications",
  "Hindi",
  "English Literature",
  "Geography",
  "General"
];

export const ICSE_EXAM_PATTERNS = [
    { name: 'ICSE Class 10 - Science (80 Marks)', marks: 80, duration: '2 hours' },
    { name: 'ICSE Class 10 - Maths (80 Marks)', marks: 80, duration: '2.5 hours' },
    { name: 'ICSE Class 10 - HCG (80 Marks)', marks: 80, duration: '2 hours' },
    { name: 'Short Test (20 Marks)', marks: 20, duration: '30 mins' },
    { name: 'Chapter Test (40 Marks)', marks: 40, duration: '1 hour' },
];

export const DEFAULT_NOTE_CONTENT = `# Welcome to MindVault

This is your new static notes hub.

## Features
- **Markdown Support**: Write in standard markdown.
- **Deep Study**: Use Gemini 3 Pro to generate detailed notes from PDFs or create ICSE exam papers.
- **AI Powered**: Use the "Study Assistant" to summarize, quiz, or ask "Teach Me".
- **Smart Organize**: Automatically categorizes your notes into subjects.

## Shortcuts
- Use the sidebar to navigate.
- Click "Deep Study" in the header for advanced AI tools.
`;
