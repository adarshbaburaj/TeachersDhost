export enum AppView {
  LANDING = 'LANDING',
  HOME = 'HOME',
  CREATE_NEW = 'CREATE_NEW',
  MATCH_STYLE = 'MATCH_STYLE',
  RESULT = 'RESULT',
  MY_LESSONS = 'MY_LESSONS',
}

export type ImageSize = '1K' | '2K' | '4K';

export interface LessonPlanState {
  id?: string; // Optional ID if it's a saved lesson being viewed
  grade?: string;
  subject?: string;
  topic: string;
  content: string;
  sourceFile?: File;
  generatedImageUrl?: string;
  groundingUrls?: Array<{ title: string; uri: string }>;
  dateCreated?: number;
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      title?: string;
      uri?: string;
    };
  }>;
}

export interface SavedLesson {
  id: string;
  topic: string;
  grade?: string;
  subject?: string;
  content: string;
  dateCreated: number;
  groundingUrls?: Array<{ title: string; uri: string }>;
  generatedImageUrl?: string;
}