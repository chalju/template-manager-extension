/**
 * 컨텍스트 추출 유틸리티 - 입력 필드에서 관련 컨텍스트를 추출하여 AI 모델에 제공
 */

/**
 * 추출된 컨텍스트 인터페이스
 */
export interface ExtractedContext {
  text: string;          // 추출된 텍스트
  cursorPosition: number; // 커서 위치
  selection: {           // 선택된 텍스트
    text: string;
    start: number;
    end: number;
  };
  precedingText: string; // 커서 앞의 텍스트
  followingText: string; // 커서 뒤의 텍스트
  domain?: string;       // 현재 도메인 (선택사항)
}

/**
 * 컨텍스트 추출기 클래스
 */
export class ContextExtractor {
  private maxContextLength: number;
  private domainPatterns: Record<string, RegExp[]>;

  /**
   * 컨텍스트 추출기 생성자
   * @param options 컨텍스트 추출 옵션
   */
  constructor(options?: {
    maxContextLength?: number;
    domainPatterns?: Record<string, RegExp[]>;
  }) {
    // 최대 컨텍스트 길이 (기본값: 500자)
    this.maxContextLength = options?.maxContextLength || 500;

    // 도메인 패턴 (URL 기반 도메인 감지)
    this.domainPatterns = options?.domainPatterns || {
      'email': [/mail\..*\.com/i, /gmail\.com/i, /outlook\.com/i],
      'crm': [/salesforce\.com/i, /zendesk\.com/i, /hubspot\.com/i],
      'document': [/docs\.google\.com/i, /notion\.so/i, /quip\.com/i],
      'social': [/twitter\.com/i, /facebook\.com/i, /linkedin\.com/i]
    };
  }
  
  /**
   * 현재 활성화된 입력 필드에서 컨텍스트 추출
   * @param activeElement 활성화된 DOM 요소
   * @returns 추출된 컨텍스트 또는 null (입력 필드가 아닌 경우)
   */
  extractFromActiveElement(activeElement: Element | null): ExtractedContext | null {
    if (!activeElement) {
      return null;
    }

    // 입력 필드인지 확인
    if (!this.isInputField(activeElement)) {
      return null;
    }

    // HTML 입력 필드에서 컨텍스트 추출
    const htmlElement = activeElement as HTMLElement;
    return this.extractFromInputField(htmlElement);
  }

  /**
   * 요소가 텍스트 입력 필드인지 확인
   * @param element 확인할 DOM 요소
   * @returns 텍스트 입력 필드 여부
   */
  isInputField(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // 일반 입력 필드 (input, textarea)
    if (tagName === 'input' || tagName === 'textarea') {
      if (tagName === 'input') {
        const inputType = (element as HTMLInputElement).type.toLowerCase();
        return inputType === 'text' || inputType === 'search' || inputType === 'email';
      }
      return true;
    }
    
    // contentEditable 요소
    if (element.hasAttribute('contenteditable') && 
        element.getAttribute('contenteditable') !== 'false') {
      return true;
    }
    
    // 커스텀 입력 필드 (예: CKEditor, TinyMCE 등)
    // 클래스 이름이나 속성으로 커스텀 에디터를 식별
    const className = element.className.toLowerCase();
    if (className.includes('editor') || className.includes('wysiwyg')) {
      return true;
    }
    
    return false;
  }

  /**
   * 입력 필드에서 컨텍스트 추출
   * @param element HTML 입력 요소
   * @returns 추출된 컨텍스트
   */
  extractFromInputField(element: HTMLElement): ExtractedContext {
    let text = '';
    let cursorPosition = 0;
    let selectionText = '';
    let selectionStart = 0;
    let selectionEnd = 0;

    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
      // input 또는 textarea 요소
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
      text = inputElement.value || '';
      cursorPosition = inputElement.selectionStart || 0;
      selectionStart = inputElement.selectionStart || 0;
      selectionEnd = inputElement.selectionEnd || 0;
      selectionText = text.substring(selectionStart, selectionEnd);
    } else if (element.hasAttribute('contenteditable')) {
      // contentEditable 요소
      text = element.textContent || '';
      
      // 현재 선택 정보 가져오기
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 커서 위치 계산
        const precedingRange = range.cloneRange();
        precedingRange.selectNodeContents(element);
        precedingRange.setEnd(range.startContainer, range.startOffset);
        cursorPosition = precedingRange.toString().length;
        
        // 선택 영역 계산
        selectionText = selection.toString();
        selectionStart = cursorPosition;
        selectionEnd = cursorPosition + selectionText.length;
      }
    }

    // 컨텍스트 길이 제한
    const limitedText = this.limitContextLength(text, cursorPosition);
    
    // 커서 기준 텍스트 분할
    const precedingText = limitedText.substring(0, cursorPosition);
    const followingText = limitedText.substring(cursorPosition);
    
    // 현재 도메인 감지
    const domain = this.detectDomain(window.location.href);
    
    return {
      text: limitedText,
      cursorPosition,
      selection: {
        text: selectionText,
        start: selectionStart,
        end: selectionEnd
      },
      precedingText,
      followingText,
      domain
    };
  }

  /**
   * 컨텍스트 길이 제한
   * @param text 전체 텍스트
   * @param cursorPosition 커서 위치
   * @returns 제한된 텍스트
   */
  private limitContextLength(text: string, cursorPosition: number): string {
    // 최대 길이보다 짧으면 그대로 반환
    if (text.length <= this.maxContextLength) {
      return text;
    }
    
    // 컨텍스트 중심으로 텍스트 범위 계산
    const halfLength = Math.floor(this.maxContextLength / 2);
    let start = cursorPosition - halfLength;
    let end = cursorPosition + halfLength;
    
    // 범위가 텍스트 범위를 벗어나는 경우 조정
    if (start < 0) {
      end = Math.min(end - start, text.length);
      start = 0;
    } else if (end > text.length) {
      start = Math.max(0, start - (end - text.length));
      end = text.length;
    }
    
    return text.substring(start, end);
  }

  /**
   * URL에서 도메인 유형 감지
   * @param url 현재 URL
   * @returns 감지된 도메인 또는 undefined
   */
  private detectDomain(url: string): string | undefined {
    for (const [domain, patterns] of Object.entries(this.domainPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return domain;
        }
      }
    }
    return undefined;
  }

  /**
   * 컨텍스트에서 이전 문장들 추출
   * @param context 추출된 컨텍스트
   * @param sentenceCount 추출할 문장 수 (기본값: 3)
   * @returns 이전 문장들
   */
  extractPrecedingSentences(context: ExtractedContext, sentenceCount: number = 3): string {
    // 문장 구분 정규식 (마침표, 물음표, 느낌표 등)
    const sentenceDelimiters = /[.!?]\s+/g;
    
    // 커서 앞의 텍스트에서 문장 분리
    const sentences = context.precedingText.split(sentenceDelimiters);
    
    // 마지막 몇 개 문장 추출
    const relevantSentences = sentences.slice(-sentenceCount);
    
    return relevantSentences.join('. ').trim();
  }

  /**
   * 컨텍스트에서 현재 작성 중인 단락 추출
   * @param context 추출된 컨텍스트
   * @returns 현재 단락
   */
  extractCurrentParagraph(context: ExtractedContext): string {
    // 단락 구분 정규식 (두 번 이상의 개행)
    const paragraphDelimiter = /\n\s*\n/;
    
    // 커서 앞의 텍스트에서 마지막 단락 시작 위치 찾기
    const precedingParagraphs = context.precedingText.split(paragraphDelimiter);
    const currentPrecedingParagraph = precedingParagraphs[precedingParagraphs.length - 1];
    
    // 커서 뒤의 텍스트에서 현재 단락 끝 위치 찾기
    const followingParagraphs = context.followingText.split(paragraphDelimiter);
    const currentFollowingParagraph = followingParagraphs[0];
    
    // 현재 단락 조합
    return (currentPrecedingParagraph + currentFollowingParagraph).trim();
  }
  
  /**
   * 컨텍스트 정보 기반의 프롬프트 생성
   * @param context 추출된 컨텍스트
   * @returns AI 모델에 제공할 프롬프트
   */
  generatePromptFromContext(context: ExtractedContext): string {
    // 현재 작성 중인 단락 추출
    const currentParagraph = this.extractCurrentParagraph(context);
    
    // 이전 문장들 추출
    const precedingSentences = this.extractPrecedingSentences(context);
    
    // 도메인 정보 추가
    const domainContext = context.domain ? `작성 환경: ${context.domain}` : '';
    
    // 프롬프트 구성
    return `${domainContext}\n\n이전 내용: ${precedingSentences}\n\n현재 작성 중: ${currentParagraph}`;
  }
}

// 기본 인스턴스 생성 및 내보내기
export const contextExtractor = new ContextExtractor(); 