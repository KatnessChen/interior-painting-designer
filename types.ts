import { GeminiTaskName } from './services/gemini/geminiTasks';

export interface BenjaminMooreColor {
  code: string;
  name: string;
  hex: string;
}

export interface ImageData {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  usage: {
    [key in GeminiTaskName]: number;
  };
  lastLoginAt: Date;
}
