/**
 * CMS Types for Static Content Management
 */

export interface GlobalNoteMetadata {
  id: string;
  title: string;
  subject: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  fileName: string; // e.g., "chemistry-basics.md"
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime?: number; // in minutes
  featured?: boolean;
}

export interface NotesIndex {
  version: string;
  lastUpdated: string;
  notes: GlobalNoteMetadata[];
  subjects: string[];
  tags: string[];
}

export interface GlobalNote extends GlobalNoteMetadata {
  content: string; // Markdown content
  frontmatter?: Record<string, any>; // Parsed YAML frontmatter
}

export interface CMSConfig {
  contentBasePath: string; // e.g., "/content/notes"
  indexPath: string; // e.g., "/content/metadata/notes-index.json"
  enableCaching: boolean;
  cacheDuration: number; // in milliseconds
}
