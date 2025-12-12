export enum AppView {
  LANDING = 'LANDING',
  HOME = 'HOME',
  CREATE_NEW = 'CREATE_NEW',
  MATCH_STYLE = 'MATCH_STYLE',
  RESULT = 'RESULT',
}

export type ImageSize = '1K' | '2K' | '4K';

export interface LessonPlanState {
  grade?: string;
  subject?: string;
  topic: string;
  content: string;
  sourceFile?: File;
  generatedImageUrl?: string;
  groundingUrls?: Array<{ title: string; uri: string }>;
}

export interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      title?: string;
      uri?: string;
    };
  }>;
}