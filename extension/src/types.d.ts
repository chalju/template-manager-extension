// Chrome API 타입 정의
interface Chrome {
  runtime: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: Error;
  };
  storage: {
    local: {
      get: (keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
    };
  };
  tabs: {
    create: (createProperties: { url: string }) => void;
  };
}

// 전역 chrome 객체 선언
declare const chrome: Chrome;

export interface Template {
  id?: string;
  name: string;
  title?: string;
  content: string;
  shortcut?: string;
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateMatch {
  template: Template;
  score: number;
} 