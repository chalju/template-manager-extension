/**
 * 키워드 감지 유틸리티 - 텍스트 입력에서 템플릿 키워드 감지
 */

export interface KeywordMatch {
  keyword: string;      // 감지된 키워드 ('/서버', '/협조' 등)
  prefix: string;       // 키워드 접두사 ('/')
  fullText: string;     // 전체 키워드 텍스트
  position: {
    start: number;      // 키워드 시작 위치
    end: number;        // 키워드 끝 위치
  };
  context: string;      // 키워드 주변 컨텍스트
}

/**
 * 키워드 감지기 클래스
 */
export class KeywordDetector {
  private prefixes: string[] = ['/'];  // 기본 접두사
  private maxKeywordLength: number = 20;  // 최대 키워드 길이
  private contextWindowSize: number = 100;  // 컨텍스트 윈도우 크기

  /**
   * 키워드 감지기 생성자
   * @param options 감지기 옵션
   */
  constructor(options?: {
    prefixes?: string[];
    maxKeywordLength?: number;
    contextWindowSize?: number;
  }) {
    if (options?.prefixes) {
      this.prefixes = options.prefixes;
    }
    if (options?.maxKeywordLength) {
      this.maxKeywordLength = options.maxKeywordLength;
    }
    if (options?.contextWindowSize) {
      this.contextWindowSize = options.contextWindowSize;
    }
  }

  /**
   * 주어진 텍스트와 커서 위치에서 키워드 감지
   * @param text 검색할 텍스트
   * @param cursorPosition 현재 커서 위치
   * @returns 감지된 키워드 매치 또는 null
   */
  detectKeyword(text: string, cursorPosition: number): KeywordMatch | null {
    if (!text || cursorPosition > text.length) {
      return null;
    }

    // 커서 위치 앞에 있는 텍스트 분석
    const textBeforeCursor = text.substring(0, cursorPosition);
    
    // 가장 가까운 접두사 찾기
    let keywordStart = -1;
    let prefix = '';
    
    for (const currentPrefix of this.prefixes) {
      const lastPrefixPos = textBeforeCursor.lastIndexOf(currentPrefix);
      if (lastPrefixPos !== -1 && (keywordStart === -1 || lastPrefixPos > keywordStart)) {
        keywordStart = lastPrefixPos;
        prefix = currentPrefix;
      }
    }
    
    // 접두사가 없으면 키워드 없음
    if (keywordStart === -1) {
      return null;
    }
    
    // 접두사 뒤에 있는 텍스트 가져오기
    const afterPrefix = textBeforeCursor.substring(keywordStart + prefix.length);
    
    // 공백으로 끝나는 경우 체크
    const spaceIndex = afterPrefix.indexOf(' ');
    
    // 공백이 있거나 최대 길이보다 길면 잘라내기
    const keywordText = spaceIndex !== -1 
      ? afterPrefix.substring(0, spaceIndex) 
      : afterPrefix;
    
    // 키워드가 최대 길이를 초과하거나 비어있으면 무시
    if (keywordText.length > this.maxKeywordLength || keywordText.length === 0) {
      return null;
    }
    
    // 키워드 주변 컨텍스트 추출
    const contextStart = Math.max(0, keywordStart - this.contextWindowSize);
    const contextEnd = Math.min(text.length, cursorPosition + this.contextWindowSize);
    const context = text.substring(contextStart, contextEnd);
    
    // 키워드 매치 객체 생성
    const fullKeyword = prefix + keywordText;
    return {
      keyword: keywordText,
      prefix,
      fullText: fullKeyword,
      position: {
        start: keywordStart,
        end: keywordStart + fullKeyword.length
      },
      context
    };
  }

  /**
   * 텍스트에서 모든 키워드 찾기
   * @param text 검색할 텍스트
   * @returns 감지된 모든 키워드 매치 배열
   */
  findAllKeywords(text: string): KeywordMatch[] {
    const matches: KeywordMatch[] = [];
    
    for (const prefix of this.prefixes) {
      let position = 0;
      while (position < text.length) {
        const prefixIndex = text.indexOf(prefix, position);
        if (prefixIndex === -1) break;
        
        const match = this.detectKeyword(text, prefixIndex + prefix.length);
        if (match) {
          matches.push(match);
          position = match.position.end;
        } else {
          position = prefixIndex + prefix.length;
        }
      }
    }
    
    return matches;
  }
} 