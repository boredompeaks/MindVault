
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL, SUBJECTS } from "../constants";
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
    // Generate 10 questions with randomization
    const seed = Math.floor(Math.random() * 1000);
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
      contents: `Generate 10 multiple-choice quiz questions based on these notes. Focus on different aspects (seed: ${seed}). \n\n${content.substring(0, 15000)}`,
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
    // Strict prompt to ensure it matches one of the valid subjects
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `You are a strict classifier. Analyze the following note content and identify the single most relevant academic Subject from this list: [${validSubjects}]. 
      
      Rules:
      1. Return ONLY the exact string from the list.
      2. If it is about physics math problems, return "Physics: Numericals".
      3. If it is unclear, return "General".
      4. Do not explain.

      Content: ${content.substring(0, 1000)}`,
      config: {
        responseMimeType: "text/plain",
      }
    });
    let result = response.text?.trim() || "General";
    // Remove quotes and periods if model adds them
    result = result.replace(/['".]/g, '');
    
    // Fuzzy fallback validation: check if result matches any subject loosely
    const lowerResult = result.toLowerCase();
    const exactMatch = SUBJECTS.find(s => s.toLowerCase() === lowerResult);
    
    if (exactMatch) return exactMatch;
    
    // Fallback: Check if any subject is contained in the string
    const partialMatch = SUBJECTS.find(s => lowerResult.includes(s.toLowerCase()));
    if (partialMatch) return partialMatch;

    return "General";
  } catch (e) {
    return "General";
  }
};

export const generateTitle = async (content: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_FLASH_MODEL,
      contents: `Read the following study note and generate a short, descriptive Chapter Name or Title (e.g., "Newton's Laws of Motion", "The French Revolution"). Max 6 words. Do not use quotes. Content: ${content.substring(0, 1000)}`,
      config: {
        responseMimeType: "text/plain",
      }
    });
    return response.text?.trim().replace(/['"]/g, '') || "New Chapter";
  } catch (e) {
    return "New Chapter";
  }
};

export const chatWithNote = async (history: ChatMessage[], currentNoteContent: string, userMessage: string): Promise<string> => {
  try {
    const context = `You are an expert tutor. The user is studying the following notes:\n---\n${currentNoteContent}\n---\n
    Answer the user's questions based on these notes. If the answer isn't in the notes, use your general knowledge. Use Markdown for formatting.`;

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

// --- Deep Study Features (Gemini 3 Pro) ---

export const generateDetailedNotesFromPDF = async (pdfBase64: string): Promise<string> => {
    try {
        const cleanBase64 = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
        
        const response = await ai.models.generateContent({
            model: GEMINI_PRO_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: cleanBase64 } },
                    { text: "Generate comprehensive, structured study notes from this document. \n\nFormat requirements:\n1. Use Markdown.\n2. Include a Table of Contents.\n3. Break down into Key Concepts with bullet points.\n4. Highlight keywords in **bold**.\n5. Include a 'Frequently Asked Questions' section with back-answers (5 points for long answers, 3 for short).\n6. Ensure 100% coverage of the material." }
                ]
            }
        });
        return response.text || "Failed to generate notes.";
    } catch (e) {
        console.error("Deep Note Gen Error", e);
        return "Error analyzing PDF. Ensure it is not too large.";
    }
};

export const generateICSEPaper = async (config: { subject: string, pattern: string, marks: number, focus?: string }, content: string): Promise<string> => {
    try {
        const prompt = `Create a strictly formatted ICSE Board Exam Question Paper.\n
        Subject: ${config.subject}
        Pattern/Type: ${config.pattern}
        Total Marks: ${config.marks}
        Focus Area: ${config.focus || "Entire Syllabus provided in context"}
        
        Context (Study Material):
        ${content.substring(0, 30000)} 
        
        Requirements:
        1. Follow standard ICSE paper layout (Sections A, B etc.).
        2. Indicate marks for each question [2], [4] etc.
        3. Provide an Answer Key at the very end, separated by a horizontal rule.
        4. Use Markdown.
        `;

        const response = await ai.models.generateContent({
            model: GEMINI_FLASH_MODEL, 
            contents: prompt
        });
        return response.text || "Failed to generate paper.";
    } catch (e) {
        console.error("Paper Gen Error", e);
        return "Error generating exam paper.";
    }
};

export const gradeAnswerSheet = async (
    images: string[], 
    questionPaper: string, 
    referenceNotes: string
): Promise<string> => {
    try {
        const parts: any[] = [];
        
        // Add Images
        for (const img of images) {
             const cleanBase64 = img.includes('base64,') ? img.split('base64,')[1] : img;
             parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        }

        // Add Context
        const prompt = `You are a strict ICSE Examiner. 
        
        I have provided:
        1. The Answer Sheets (Images above).
        2. The Question Paper / Assignment Context (Text below).
        3. The Reference Study Material (Text below).

        YOUR TASK:
        Grade the handwritten answers strictly based on the provided Question Paper and Reference Material.
        
        Question Paper / Context:
        ${questionPaper || "Standard ICSE Assessment"}

        Reference Material:
        ${referenceNotes.substring(0, 5000)}

        OUTPUT FORMAT (Markdown):
        1. **Summary Table**: Question No | Marks Obtained | Max Marks
        2. **Total Score**: X / Y
        3. **Detailed Corrections**: For each wrong answer, explain WHY it is wrong and what is the correct key point missing.
        4. **Areas for Improvement**: Bullet points.
        `;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: GEMINI_PRO_MODEL,
            contents: { parts }
        });
        return response.text || "Failed to grade.";
    } catch (e) {
        console.error("Grading Error", e);
        return "Error analyzing answer sheet. Ensure images are clear.";
    }
}
