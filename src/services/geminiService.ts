import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { UserProfile, AIMode, AITool } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const CHAT_MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL = "gemini-2.5-flash-image";

export interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function generateChatResponse(
  messages: Message[],
  userProfile?: UserProfile | null,
  options?: {
    thinkingLevel?: ThinkingLevel;
    model?: "flash" | "pro";
    mode?: AIMode;
    selectedTools?: AITool[];
  },
) {
  const toneInstruction =
    userProfile?.responseTone === "formal"
      ? "Use a formal and professional tone."
      : userProfile?.responseTone === "concise"
        ? "Be extremely concise and direct."
        : "Be friendly and encouraging.";

  const styleInstruction =
    userProfile?.learningStyle === "visual"
      ? "Include descriptive visual metaphors or ASCII art where helpful."
      : "";

  const modeInstructions: Record<AIMode, string> = {
    general: "You are a helpful general-purpose assistant.",
    academic:
      "You are an academic expert. Provide detailed, well-cited, and rigorous explanations.",
    creative:
      "You are a creative writer. Use expressive language, storytelling, and imaginative metaphors.",
    coding:
      "You are a senior software engineer. Provide clean, efficient code with clear explanations and best practices.",
  };

  const systemInstruction = `You are Sava AI. ${modeInstructions[options?.mode || "general"]} ${toneInstruction} ${styleInstruction} You excel at explaining complex topics simply, solving math problems step-by-step, helping with programming, and creative writing.`;

  const config: any = {
    systemInstruction,
  };

  if (options?.thinkingLevel) {
    config.thinkingConfig = { thinkingLevel: options.thinkingLevel };
  }

  const tools: any[] = [];
  if (options?.selectedTools?.includes("googleSearch")) {
    tools.push({ googleSearch: {} });
  }
  if (options?.selectedTools?.includes("googleMaps")) {
    tools.push({ googleMaps: {} });
  }

  if (tools.length > 0) {
    config.tools = tools;
  }

  const response = await ai.models.generateContent({
    model: options?.model === "pro" ? "gemini-3.1-pro-preview" : CHAT_MODEL,
    contents: messages.map((m) => ({ role: m.role, parts: m.parts })),
    config,
  });
  return response.text;
}

export async function solveMathProblem(problem: string) {
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Solve this math problem step-by-step with clear explanations for each step: ${problem}`,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "You are a math tutor. Provide clear, step-by-step solutions with explanations for each step. Use markdown for formulas.",
    },
  });
  return response.text;
}

export async function generateDailyDigest() {
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Generate a daily digest for today. Include: 1. A fascinating fact. 2. 3 top news headlines with brief summaries. 3. A daily challenge (math, logic, or trivia) with the question and the hidden answer.",
          },
        ],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fact: { type: Type.STRING },
          news: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
              },
            },
          },
          challenge: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              type: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
          },
        },
      },
    },
  });
  return JSON.parse(response.text);
}

export async function generateChatTitle(firstMessage: string) {
  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate a very short, concise title (maximum 4 words) for a chat that starts with this message: "${firstMessage}". Return only the title text.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "You are a helpful assistant that generates concise chat titles. Do not use quotes or punctuation in the title.",
    },
  });
  return response.text?.trim() || "New Chat";
}

export async function generateImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [{ text: prompt }],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}
