export interface Chat {
  id: string;
  title: string;
  createdAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  type: 'text' | 'image';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  learningStyle: 'visual' | 'auditory' | 'text-based';
  responseTone: 'formal' | 'friendly' | 'concise';
  avatar?: string;
  googleId?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  type: 'chat' | 'topic';
  targetId: string;
  title: string;
}

export interface DailyDigest {
  fact: string;
  news: { title: string; url: string }[];
  challenge: { question: string; type: string; answer: string };
}

export type AIMode = 'general' | 'academic' | 'creative' | 'coding';
export type AITool = 'googleSearch' | 'googleMaps';

export interface AppState {
  chats: Chat[];
  currentChatId: string | null;
  messages: Record<string, Message[]>;
  theme: 'light' | 'dark';
  view: 'chat' | 'image-gen' | 'study' | 'profile' | 'digest';
  user: UserProfile | null;
  favorites: Favorite[];
  mode: AIMode;
  selectedTools: AITool[];
}
