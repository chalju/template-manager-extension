/**
 * 입력 필드 어댑터 모듈 - 다양한 CRM 시스템에 대한 인터페이스 표준화
 */

export interface InputFieldAdapter {
  /**
   * 현재 시스템이 이 어댑터를 사용해야 하는지 확인
   */
  isApplicable(): boolean;
  
  /**
   * 텍스트 입력 필드 목록을 반환
   */
  getTextFields(): HTMLElement[];
  
  /**
   * 입력 필드에서 텍스트 추출
   */
  getText(element: HTMLElement): string;
  
  /**
   * 커서 위치에 텍스트 삽입
   */
  insertText(element: HTMLElement, text: string): void;
  
  /**
   * 현재 커서 위치 정보 가져오기
   */
  getCursorPosition(element: HTMLElement): { top: number; left: number; } | null;
}

/**
 * 기본 어댑터 - 일반적인 웹 페이지에서 작동
 */
export class DefaultInputAdapter implements InputFieldAdapter {
  isApplicable(): boolean {
    // 기본 어댑터는 항상 사용 가능
    return true;
  }
  
  getTextFields(): HTMLElement[] {
    const selectors = [
      'input[type="text"]',
      'input:not([type])',
      'textarea',
      '[contenteditable="true"]',
      '[role="textbox"]'
    ].join(', ');
    
    const elements = Array.from(document.querySelectorAll(selectors)) as HTMLElement[];
    
    // 제외할 입력 필드
    const excludeSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      'input[type="number"]',
      'input[type="tel"]',
      'input[type="date"]',
      'input[type="time"]',
      'input[type="url"]',
      'input[type="color"]'
    ].join(', ');
    
    return elements.filter(element => !element.matches(excludeSelectors));
  }
  
  getText(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    }
    
    return '';
  }
  
  insertText(element: HTMLElement, text: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const beforeText = element.value.substring(0, start);
      const afterText = element.value.substring(end);
      
      element.value = beforeText + text + afterText;
      element.selectionStart = element.selectionEnd = start + text.length;
      element.focus();
      
      // 변경 이벤트 발생시키기
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.isContentEditable) {
      // contentEditable 요소 처리
      document.execCommand('insertText', false, text);
    }
  }
  
  getCursorPosition(element: HTMLElement): { top: number; left: number; } | null {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // 입력 필드의 경우 높이에 따라 조정
      return {
        top: rect.top + rect.height + scrollTop,
        left: rect.left + scrollLeft
      };
    } else if (element.isContentEditable) {
      // 커서 위치를 좀 더 정확하게 계산
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const tempRect = range.getBoundingClientRect();
        return {
          top: tempRect.bottom + scrollTop,
          left: tempRect.left + scrollLeft
        };
      }
    }
    
    return null;
  }
} 