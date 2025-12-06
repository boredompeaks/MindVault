/**
 * CMS Service - Manages static global notes
 * Loads markdown files from /public/content/notes/
 */

import { GlobalNote, GlobalNoteMetadata, NotesIndex, CMSConfig } from '../types/cms';

const DEFAULT_CONFIG: CMSConfig = {
  contentBasePath: '/content/notes',
  indexPath: '/content/metadata/notes-index.json',
  enableCaching: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

class CMSService {
  private config: CMSConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private indexCache: NotesIndex | null = null;
  private indexCacheTime: number = 0;

  constructor(config: Partial<CMSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Fetch the notes index (manifest of all available notes)
   */
  async fetchNotesIndex(): Promise<NotesIndex> {
    const now = Date.now();
    
    // Return cached index if valid
    if (
      this.config.enableCaching &&
      this.indexCache &&
      now - this.indexCacheTime < this.config.cacheDuration
    ) {
      return this.indexCache;
    }

    try {
      const response = await fetch(this.config.indexPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch notes index: ${response.statusText}`);
      }
      
      const index: NotesIndex = await response.json();
      
      // Validate index structure
      if (!index.notes || !Array.isArray(index.notes)) {
        throw new Error('Invalid notes index structure');
      }

      // Cache the result
      this.indexCache = index;
      this.indexCacheTime = now;

      return index;
    } catch (error) {
      console.error('Error fetching notes index:', error);
      
      // Return empty index on error
      return {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        notes: [],
        subjects: [],
        tags: [],
      };
    }
  }

  /**
   * Fetch a single note by its file name
   */
  async fetchNote(fileName: string): Promise<GlobalNote | null> {
    const cacheKey = `note:${fileName}`;
    const now = Date.now();

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < this.config.cacheDuration) {
        return cached.data;
      }
    }

    try {
      const url = `${this.config.contentBasePath}/${fileName}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch note: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Parse frontmatter and content
      const { frontmatter, markdown } = this.parseFrontmatter(content);
      
      // Get metadata from index
      const index = await this.fetchNotesIndex();
      const metadata = index.notes.find(n => n.fileName === fileName);

      if (!metadata) {
        console.warn(`Note ${fileName} not found in index`);
        return null;
      }

      const note: GlobalNote = {
        ...metadata,
        content: markdown,
        frontmatter,
      };

      // Cache the result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, { data: note, timestamp: now });
      }

      return note;
    } catch (error) {
      console.error(`Error fetching note ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Parse YAML frontmatter from markdown
   */
  private parseFrontmatter(content: string): { frontmatter: Record<string, any>; markdown: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, markdown: content };
    }

    const frontmatterText = match[1];
    const markdown = match[2];

    // Simple YAML parser (for basic key-value pairs)
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value: any = line.slice(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }

      frontmatter[key] = value;
    }

    return { frontmatter, markdown };
  }

  /**
   * Search notes by query
   */
  async searchNotes(query: string): Promise<GlobalNoteMetadata[]> {
    const index = await this.fetchNotesIndex();
    const lowerQuery = query.toLowerCase();

    return index.notes.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) ||
      note.subject.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      note.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get notes by subject
   */
  async getNotesBySubject(subject: string): Promise<GlobalNoteMetadata[]> {
    const index = await this.fetchNotesIndex();
    return index.notes.filter(note => note.subject === subject);
  }

  /**
   * Get notes by tag
   */
  async getNotesByTag(tag: string): Promise<GlobalNoteMetadata[]> {
    const index = await this.fetchNotesIndex();
    return index.notes.filter(note => note.tags.includes(tag));
  }

  /**
   * Get featured notes
   */
  async getFeaturedNotes(): Promise<GlobalNoteMetadata[]> {
    const index = await this.fetchNotesIndex();
    return index.notes.filter(note => note.featured);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.indexCache = null;
    this.indexCacheTime = 0;
  }
}

// Export singleton instance
export const cmsService = new CMSService();
