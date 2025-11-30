import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GEMINI_FLASH_MODEL, SUBJECTS } from "../constants";
import { QuizQuestion, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNoteSummary = async (content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Summarize the following study notes into a concise paragraph, highlighting key concepts: \n\n${content}`,
      config: {
        systemInstruction: "You are an expert academic tutor. Provide clear, concise summaries.",
      }
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "Error generating summary. Please check your API configuration.";
  }
};

export const generateQuizFromNote = async (content: string): Promise<QuizQuestion[]> => {
  try {
    const quizSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 4 possible answers."
          },
          correctAnswer: {
            type: Type.INTEGER,
            description: "The index (0-3) of the correct answer in the options array."
          },
          explanation: { type: Type.STRING }
        },
        required: ["question", "options", "correctAnswer", "explanation"]
      }
    };

    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Generate 3 multiple-choice quiz questions based on these notes to test understanding: \n\n${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as QuizQuestion[];
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    return [];
  }
};

export const identifySubject = async (content: string): Promise<string> => {
  try {
    const validSubjects = SUBJECTS.join(", ");
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Analyze the following note content and identify the single most relevant academic Subject from this strict list: [${validSubjects}]. Return ONLY the subject name as a string. If it fits multiple, pick the most specific one. If none fit, return 'General'. Content: ${content.substring(0, 1000)}`,
      config: {
        responseMimeType: "text/plain",
      }
    });
    const result = response.text?.trim() || "General";
    // Clean up response if it adds quotes or periods
    return result.replace(/['".]/g, '');
  } catch (e) {
    return "General";
  }
};

export const generateTitle = async (content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Read the following study note and generate a short, descriptive Chapter Name or Title (e.g., "Newton's Laws of Motion", "The French Revolution", "Cell Structure"). Max 6 words. Do not use quotes. Content: ${content.substring(0, 1000)}`,
      config: {
        responseMimeType: "text/plain",
      }
    });
    return response.text?.trim() || "New Chapter";
  } catch (e) {
    return "New Chapter";
  }
};

export const chatWithNote = async (history: ChatMessage[], currentNoteContent: string, userMessage: string): Promise<string> => {
  try {
    // We construct a single prompt with context for the stateless call, 
    // or use chat session. For simplicity and robustness with the context window:
    
    const context = `You are an expert tutor. The user is studying the following notes:\n---\n${currentNoteContent}\n---\n
    Answer the user's questions based on these notes. If the answer isn't in the notes, use your general knowledge but mention that it wasn't in the notes. Be encouraging and helpful.`;

    const chat = ai.chats.create({
      model: GEMINI_FLASH_MODEL,
      config: {
        systemInstruction: context,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "I couldn't generate a response.";
  } catch (e) {
    console.error("Chat Error", e);
    return "Sorry, I'm having trouble connecting to the study assistant right now.";
  }
};