/**
 * AI 자동완성 핸들러 - 텍스트 입력 필드에 AI 자동완성 기능 제공
 */

import { clovaApiClient } from '../utils/clova-api-client';
import { contextExtractor, ExtractedContext } from './context-extractor';
import { KeywordDetector } from '../utils/keyword-detector';
import { TemplateMatcher } from '../utils/template-matcher';
import { promptBuilder, FormalLevel } from '../utils/prompt-builder';

// 자동완성 상태 인터페이스
interface CompletionState {
  isActive: boolean;              // 자동완성 활성화 여부
  isLoading: boolean;             // 로딩 중 여부
  currentElement: HTMLElement | null; // 현재 활성화된
  currentRequest: {               // 현재 요청 정보
    context: string;
    timestamp: number;
  } | null;
  lastCompletion: {               // 마지막 자동완성 정보
    text: string;
    timestamp: number;
    isTemplate: boolean;
    templateId?: string;
  } | null;
}

/**
 * AI 자동완성 핸들러 클래스
 */
export class AICompletionHandler {
  private state: CompletionState;
  private completionThrottleMs: number;
  private suggestUIManager: any; // 실제 구현 시 SuggestionUIManager 타입으로 변경
  private keywordDetector: KeywordDetector; // 키워드 감지 인스턴스
  private templateMatcher: TemplateMatcher; // 템플릿 매칭 인스턴스
  
  /**
   * AI 자동완성 핸들러 생성자
   * @param suggestUIManager 제안 UI 관리자
   * @param options 핸들러 옵션
   */
  constructor(
    suggestUIManager: any, 
    options?: {
      completionThrottleMs?: number;
    }
  ) {
    // 상태 초기화
    this.state = {
      isActive: true,
      isLoading: false,
      currentElement: null,
      currentRequest: null,
      lastCompletion: null
    };
    
    // 옵션 설정
    this.completionThrottleMs = options?.completionThrottleMs || 500; // 기본 0.5초 지연
    this.suggestUIManager = suggestUIManager;
    
    // 키워드 감지 및 템플릿 매칭 초기화
    this.keywordDetector = new KeywordDetector();
    this.templateMatcher = new TemplateMatcher();
    
    // 이벤트 리스너 등록
    this.initEventListeners();
  }
  
  /**
   * 이벤트 리스너 초기화
   */
  private initEventListeners(): void {
    // 요소 포커스 이벤트 리스너
    document.addEventListener('focusin', (event) => {
      const element = event.target as HTMLElement;
      this.handleFocusEvent(element);
    });
    
    // 키 입력 이벤트 리스너
    document.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });
    
    // 입력 이벤트 리스너 (텍스트 변경)
    document.addEventListener('input', (event) => {
      const element = event.target as HTMLElement;
      this.handleInputEvent(element);
    });
  }
  
  /**
   * 포커스 이벤트 처리
   * @param element 포커스된 요소
   */
  private handleFocusEvent(element: HTMLElement): void {
    // 입력 필드인지 확인
    if (!contextExtractor.isInputField(element)) {
      return;
    }
    
    // 현재 요소 업데이트
    this.state.currentElement = element;
  }
  
  /**
   * 키 입력 이벤트 처리
   * @param event 키보드 이벤트
   */
  private handleKeydown(event: KeyboardEvent): void {
    const element = event.target as HTMLElement;
    
    // 현재 요소가 아니면 무시
    if (element !== this.state.currentElement) {
      return;
    }
    
    // 자동완성 활성화 상태가 아니면 무시
    if (!this.state.isActive) {
      return;
    }
    
    // 탭 키 이벤트 처리 (자동완성 수락)
    if (event.key === 'Tab' && this.suggestUIManager.isVisible()) {
      event.preventDefault();
      this.acceptCompletion();
      return;
    }
    
    // Escape 키 이벤트 처리 (자동완성 취소)
    if (event.key === 'Escape' && this.suggestUIManager.isVisible()) {
      event.preventDefault();
      this.cancelCompletion();
      return;
    }
  }
  
  /**
   * 입력 이벤트 처리
   * @param element 입력 요소
   */
  private handleInputEvent(element: HTMLElement): void {
    // 현재 요소가 아니면 무시
    if (element !== this.state.currentElement) {
      return;
    }
    
    // 자동완성 활성화 상태가 아니면 무시
    if (!this.state.isActive) {
      return;
    }
    
    // 키워드 감지 시도 - this.keywordDetector 사용
    const text = element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea'
      ? (element as HTMLInputElement).value
      : element.textContent || '';
    
    const cursorPosition = this.getCursorPosition(element);
    if (cursorPosition === null) return;
    
    const detectedKeyword = this.keywordDetector.detectKeyword(text, cursorPosition);
    if (detectedKeyword) {
      // 키워드가 감지되면 템플릿 매칭 시도
      this.handleKeywordDetected(detectedKeyword.keyword, element);
      return;
    }
    
    // 일반 텍스트 입력 처리 (쓰로틀링 적용)
    this.throttleCompletion(() => {
      this.requestCompletion(element);
    });
  }
  
  // 커서 위치 가져오는 유틸리티 함수 추가
  private getCursorPosition(element: HTMLElement): number | null {
    if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
      return (element as HTMLInputElement).selectionStart || 0;
    } else if (element.hasAttribute('contenteditable')) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return null;
  }
  
  /**
   * 키워드 감지 처리
   * @param keyword 감지된 키워드
   * @param element 입력 요소
   */
  private async handleKeywordDetected(keyword: string, element: HTMLElement): Promise<void> {
    try {
      // this.templateMatcher 사용
      const matchKeyword = { keyword, prefix: '/', fullText: '/' + keyword, position: { start: 0, end: 0 }, context: '' };
      const matchedTemplates = this.templateMatcher.findMatchingTemplates(matchKeyword);
      
      // 매칭된 템플릿이 있으면 UI에 표시
      if (matchedTemplates && matchedTemplates.length > 0) {
        this.suggestUIManager.showTemplates(matchedTemplates, element);
      } else {
        // 매칭된 템플릿이 없으면 일반 자동완성 요청
        this.requestCompletion(element, keyword);
      }
    } catch (error) {
      console.error('템플릿 매칭 중 오류 발생:', error);
    }
  }
  
  /**
   * 자동완성 요청을 쓰로틀링하여 처리
   * @param callback 실행할 콜백 함수
   */
  private throttleCompletion(callback: () => void): void {
    const now = Date.now();
    
    // 마지막 요청 이후 충분한 시간이 지났는지 확인
    if (
      this.state.currentRequest && 
      now - this.state.currentRequest.timestamp < this.completionThrottleMs
    ) {
      return;
    }
    
    // 콜백 실행
    callback();
  }
  
  /**
   * 자동완성 요청 처리
   * @param element 입력 요소
   * @param keyword 키워드 (있는 경우)
   */
  private async requestCompletion(element: HTMLElement, keyword?: string): Promise<void> {
    // 이미 로딩 중이면 무시
    if (this.state.isLoading) {
      return;
    }
    
    try {
      // 요소에서 컨텍스트 추출
      const context = contextExtractor.extractFromActiveElement(element);
      if (!context) {
        return;
      }
      
      // 컨텍스트가 너무 짧으면 무시 (너무 짧은 입력에는 제안하지 않음)
      if (context.text.trim().length < 10) {
        return;
      }
      
      // 현재 요청 정보 업데이트
      this.state.currentRequest = {
        context: context.text,
        timestamp: Date.now()
      };
      
      // 로딩 상태 설정
      this.state.isLoading = true;
      
      // API 요청 프롬프트 생성
      const prompt = this.buildPromptFromContext(context, keyword);
      
      // API 호출
      const completion = await clovaApiClient.generateCompletion(prompt, keyword);
      
      // 결과 처리
      this.handleCompletionResult(completion.generated_text, element, completion.is_template, completion.template_id);
    } catch (error) {
      // 오류 처리
      console.error('자동완성 요청 중 오류 발생:', error);
      this.state.isLoading = false;
    }
  }
  
  /**
   * 컨텍스트에서 프롬프트 생성
   * @param context 추출된 컨텍스트
   * @param keyword 키워드 (있는 경우)
   * @returns 생성된 프롬프트
   */
  private buildPromptFromContext(context: ExtractedContext, keyword?: string): string {
    // 도메인 컨텍스트 자동 감지 또는 기존 값 사용
    const domainContext = context.domain || promptBuilder.detectDomainFromText(context.text) || 'document';
    
    // 사용자 의도 추정
    const userIntent = this.detectUserIntent(context);
    
    // 격식 수준 선택 (도메인 기반)
    const formalLevel = this.selectFormalLevel(domainContext);
    
    // 텍스트 길이 최적화 (너무 긴 컨텍스트 처리)
    const optimizedText = promptBuilder.optimizeTextLength(context.text, 800);
    
    // 어조 수정자 결정 (의도 기반)
    const toneModifiers = this.getToneModifiersForIntent(userIntent);
    
    // 도메인 전문 분야 설정 (키워드 기반)
    const domain = keyword ? this.detectDomainFromKeyword(keyword) : undefined;
    
    // 적절한 템플릿 선택 (도메인 및 의도 기반)
    const templateName = this.selectTemplateForDomain(domainContext);
    
    // A/B 테스트 그룹 할당 (실험용)
    const testGroup = Math.random() < 0.5 ? 'control' : 'variant-a';
    
    // 프롬프트 빌더를 사용하여 프롬프트 생성
    return promptBuilder.buildPrompt(
      optimizedText,
      templateName,
      {
        domainContext,
        userIntent,
        formalLevel,
        maxTokens: 150,
        toneModifiers,
        domain,
        testGroup
      }
    );
  }
  
  /**
   * 의도에 따른 어조 수정자 가져오기
   * @param intent 사용자 의도
   * @returns 어조 수정자 배열
   */
  private getToneModifiersForIntent(intent: string): string[] {
    switch (intent) {
      case 'greeting':
        return ['친근한', '환영하는'];
      case 'requesting':
        return ['정중한', '명확한'];
      case 'scheduling':
        return ['간결한', '명확한'];
      case 'inquiring':
        return ['정중한', '호기심 있는'];
      case 'thanking':
        return ['진심어린', '감사하는'];
      case 'writing':
        return ['전문적인', '유익한'];
      default:
        return ['적절한'];
    }
  }
  
  /**
   * 키워드에서 전문 분야 감지
   * @param keyword 키워드
   * @returns 감지된 전문 분야
   */
  private detectDomainFromKeyword(keyword: string): string | undefined {
    const lowerKeyword = keyword.toLowerCase();
    
    if (lowerKeyword.includes('법') || lowerKeyword.includes('계약')) {
      return 'legal';
    } else if (lowerKeyword.includes('기술') || lowerKeyword.includes('개발')) {
      return 'tech';
    } else if (lowerKeyword.includes('의학') || lowerKeyword.includes('건강')) {
      return 'medical';
    } else if (lowerKeyword.includes('금융') || lowerKeyword.includes('투자')) {
      return 'finance';
    }
    
    return undefined;
  }
  
  /**
   * 컨텍스트 기반 사용자 의도 추정
   * @param context 추출된 컨텍스트
   * @returns 추정된 사용자 의도
   */
  private detectUserIntent(context: ExtractedContext): string {
    // 컨텍스트 내용 분석하여 의도 추정
    const text = context.text.toLowerCase();
    
    if (text.includes('안녕') || text.includes('인사') || text.includes('hello')) {
      return 'greeting';
    } else if (text.includes('요청') || text.includes('부탁') || text.includes('request')) {
      return 'requesting';
    } else if (text.includes('회의') || text.includes('미팅') || text.includes('meeting')) {
      return 'scheduling';
    } else if (text.includes('질문') || text.includes('문의') || text.includes('question')) {
      return 'inquiring';
    } else if (text.includes('감사') || text.includes('thank')) {
      return 'thanking';
    }
    
    // 기본값
    return 'writing';
  }
  
  /**
   * 도메인 기반 격식 수준 선택
   * @param domain 도메인 컨텍스트
   * @returns 격식 수준
   */
  private selectFormalLevel(domain: string): FormalLevel {
    switch (domain) {
      case 'email':
        return FormalLevel.BUSINESS;
      case 'crm':
        return FormalLevel.FORMAL;
      case 'social':
        return FormalLevel.CASUAL;
      case 'document':
        return FormalLevel.NEUTRAL;
      default:
        return FormalLevel.NEUTRAL;
    }
  }
  
  /**
   * 도메인 기반 템플릿 선택
   * @param domain 도메인 컨텍스트
   * @returns 템플릿 이름
   */
  private selectTemplateForDomain(domain: string): string {
    switch (domain) {
      case 'email':
        return 'email';
      case 'crm':
        return 'business';
      case 'social':
        return 'chat';
      case 'document':
        return 'completion';
      default:
        return 'default';
    }
  }
  
  /**
   * 자동완성 결과 처리
   * @param completionText 생성된 텍스트
   * @param element 입력 요소
   * @param isTemplate 템플릿 여부
   * @param templateId 템플릿 ID (있는 경우)
   */
  private handleCompletionResult(
    completionText: string, 
    element: HTMLElement,
    isTemplate: boolean = false,
    templateId?: string
  ): void {
    // 로딩 상태 해제
    this.state.isLoading = false;
    
    // 생성된 텍스트가 없으면 무시
    if (!completionText || completionText.trim() === '') {
      return;
    }
    
    // 마지막 자동완성 정보 업데이트
    this.state.lastCompletion = {
      text: completionText,
      timestamp: Date.now(),
      isTemplate,
      templateId
    };
    
    // UI에 자동완성 제안 표시
    this.suggestUIManager.showCompletion(completionText, element, isTemplate);
  }
  
  /**
   * 자동완성 수락 처리
   */
  public acceptCompletion(): void {
    // UI가 표시되지 않았거나 현재 요소가 없으면 무시
    if (!this.suggestUIManager.isVisible() || !this.state.currentElement) {
      return;
    }
    
    // 현재 선택된 제안 텍스트 가져오기
    const suggestionText = this.suggestUIManager.getSelectedText();
    if (!suggestionText) {
      return;
    }
    
    // 텍스트 삽입 처리
    this.insertTextAtCursor(this.state.currentElement, suggestionText);
    
    // UI 숨기기
    this.suggestUIManager.hide();
  }
  
  /**
   * 커서 위치에 텍스트 삽입
   * @param element 입력 요소
   * @param text 삽입할 텍스트
   */
  private insertTextAtCursor(element: HTMLElement, text: string): void {
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
      // input 또는 textarea 요소
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
      const selectionStart = inputElement.selectionStart || 0;
      const selectionEnd = inputElement.selectionEnd || 0;
      
      // 현재 값과 선택 범위 가져오기
      const currentValue = inputElement.value || '';
      
      // 새 값 계산 (선택 영역 대체)
      const newValue = 
        currentValue.substring(0, selectionStart) + 
        text + 
        currentValue.substring(selectionEnd);
      
      // 값 업데이트
      inputElement.value = newValue;
      
      // 커서 위치 설정 (삽입된 텍스트 다음)
      const newPosition = selectionStart + text.length;
      inputElement.setSelectionRange(newPosition, newPosition);
    } else if (element.hasAttribute('contenteditable')) {
      // contentEditable 요소
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // 선택 범위 가져오기
        const range = selection.getRangeAt(0);
        
        // 선택 영역 지우기
        range.deleteContents();
        
        // 텍스트 노드 생성 및 삽입
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // 커서 위치 설정 (삽입된 텍스트 다음)
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // 입력 이벤트 발생 (변경 알림)
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  /**
   * 자동완성 취소 처리
   */
  public cancelCompletion(): void {
    this.suggestUIManager.hide();
  }
  
  /**
   * 자동완성 활성화 설정
   * @param isActive 활성화 여부
   */
  public setActive(isActive: boolean): void {
    this.state.isActive = isActive;
    
    // 비활성화 시 UI 숨기기
    if (!isActive) {
      this.suggestUIManager.hide();
    }
  }
}

// 기본 인스턴스는 외부에서 SuggestionUIManager와 함께 생성 