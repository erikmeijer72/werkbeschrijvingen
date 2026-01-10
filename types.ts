export interface SOPResult {
  markdown: string;
  timestamp: Date;
}

export enum FileStatus {
  IDLE = 'IDLE',
  READING = 'READING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface FileData {
  file: File;
  base64: string;
  mimeType: string;
}