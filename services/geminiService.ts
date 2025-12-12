import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageSize, GroundingMetadata } from "../types";

// Helper to get base64 from file
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateNewLessonPlan = async (
  grade: string,
  subject: string,
  topic: string
): Promise<{ text: string; groundingUrls: Array<{ title: string; uri: string }> }> => {
  // Always create a new instance to ensure we capture the latest API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Act as a friendly, expert teacher's colleague. 
    Draft a clear, text-based lesson plan for a ${grade} class on the subject of ${subject}.
    The topic is: "${topic}".
    
    The lesson plan MUST include the following clearly labeled sections:
    1. Learning Objectives
    2. Introduction (Hook)
    3. Main Activity
    4. Wrap-up
    
    Keep the tone encouraging, professional, yet simple and jargon-free.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const text = response.text || "I couldn't generate a plan right now. Please try again.";
    
    // Extract grounding URLs
    const groundingUrls: Array<{ title: string; uri: string }> = [];
    const candidates = (response as any).candidates;
    if (candidates && candidates.length > 0) {
        const metadata = candidates[0].groundingMetadata as GroundingMetadata;
        if (metadata?.groundingChunks) {
            metadata.groundingChunks.forEach(chunk => {
                if (chunk.web && chunk.web.uri) {
                    groundingUrls.push({
                        title: chunk.web.title || "Source",
                        uri: chunk.web.uri
                    });
                }
            });
        }
    }

    return { text, groundingUrls };
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw error;
  }
};

export const generateStyleMatchedPlan = async (
  file: File,
  newTopic: string
): Promise<{ text: string; groundingUrls: Array<{ title: string; uri: string }> }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const filePart = await fileToGenerativePart(file);
  const prompt = `
    I have attached an example lesson plan. 
    Analyze its structure, tone, and formatting style carefully.
    
    Create a BRAND NEW lesson plan for the topic: "${newTopic}".
    
    You MUST strictly mimic the structure and style of the uploaded document. 
    If the uploaded document has specific headers, use them. 
    If it uses bullet points, use them.
    The goal is to make this new lesson plan look like it belongs in the same curriculum binder.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [filePart, { text: prompt }]
      },
      config: {
        // We can use search here too if the new topic needs research
        tools: [{ googleSearch: {} }], 
      }
    });

     const text = response.text || "I couldn't generate a plan right now. Please try again.";
    
    // Extract grounding URLs
    const groundingUrls: Array<{ title: string; uri: string }> = [];
    const candidates = (response as any).candidates;
    if (candidates && candidates.length > 0) {
        const metadata = candidates[0].groundingMetadata as GroundingMetadata;
        if (metadata?.groundingChunks) {
            metadata.groundingChunks.forEach(chunk => {
                if (chunk.web && chunk.web.uri) {
                    groundingUrls.push({
                        title: chunk.web.title || "Source",
                        uri: chunk.web.uri
                    });
                }
            });
        }
    }

    return { text, groundingUrls };
  } catch (error) {
    console.error("Error matching style:", error);
    throw error;
  }
};

export const generateVisualAid = async (
  lessonPlanText: string,
  size: ImageSize
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Summarize the plan first to get key steps for the image prompt to be efficient
  // We can do this in one go, but let's just use the plan directly in the prompt.
  const prompt = `
    Create a clean, professional, infographic-style flowchart image that visually summarizes the key steps of the following lesson plan.
    
    The image should be suitable for projection on a classroom screen.
    Style: Vector art, flat design, white or light background, clear arrows, educational, high contrast text.
    
    Lesson Plan Context:
    ${lessonPlanText.substring(0, 1000)}... (truncated for relevance)
    
    Visual Flow:
    1. Start/Hook
    2. Activity
    3. Goal/Wrap-up
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            imageSize: size,
            aspectRatio: "16:9" // Good for classroom projectors
        }
      }
    });

    let imageUrl = '';
    const candidates = (response as any).candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    
    if (!imageUrl) {
        throw new Error("No image data received");
    }

    return imageUrl;
  } catch (error) {
    console.error("Error generating visual aid:", error);
    throw error;
  }
};