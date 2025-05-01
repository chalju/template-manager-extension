/**
 * 포커스 트래커 - 현재 활성화된 입력 필드를 추적
 */

import { AdapterRegistry } from './adapters/adapter-registry';

interface FocusTrackerOptions {
  onFocusChange?: (element: HTMLElement | null) => void;
}

/**
 * 현재 포커스된 입력 필드를 추적하는 클래스
 */
export class FocusTracker {
  private activeElement: HTMLElement | null = null;
  private adapterRegistry: AdapterRegistry;
  private options: FocusTrackerOptions;
  
  constructor(adapterRegistry: AdapterRegistry, options: FocusTrackerOptions = {}) {
    this.adapterRegistry = adapterRegistry;
    this.options = options;
    this.initialize();
  }
  
  /**
   * 포커스 추적 초기화
   */
  private initialize(): void {
    // 포커스 이벤트 리스너 설정
    document.addEventListener('focusin', this.handleFocusIn.bind(this), true);
    document.addEventListener('focusout', this.handleFocusOut.bind(this), true);
    
    // 마우스 이벤트로 contentEditable 요소 추적
    document.addEventListener('mousedown', this.handleMouseDown.bind(this), true);
    
    // 초기 포커스 상태 확인
    this.checkInitialFocus();
  }
  
  /**
   * 초기 포커스 상태 확인 (페이지 로드 시 이미 포커스된 요소가 있을 수 있음)
   */
  private checkInitialFocus(): void {
    if (document.activeElement instanceof HTMLElement) {
      const activeEl = document.activeElement;
      
      // 현재 활성 요소가 텍스트 입력 필드인지 확인
      const textFields = this.adapterRegistry.getTextFields();
      if (textFields.includes(activeEl)) {
        this.setActiveElement(activeEl);
      }
    }
  }
  
  /**
   * focusin 이벤트 핸들러
   */
  private handleFocusIn(event: FocusEvent): void {
    if (event.target instanceof HTMLElement) {
      const target = event.target;
      
      // 텍스트 입력 필드인지 확인
      const textFields = this.adapterRegistry.getTextFields();
      if (textFields.some(field => field === target || field.contains(target))) {
        this.setActiveElement(target);
      }
    }
  }
  
  /**
   * focusout 이벤트 핸들러
   */
  private handleFocusOut(event: FocusEvent): void {
    // relatedTarget이 null이거나 문서 외부로 포커스가 이동한 경우
    if (!event.relatedTarget || 
        !(event.relatedTarget instanceof Node) || 
        !document.contains(event.relatedTarget as Node)) {
      this.setActiveElement(null);
    }
  }
  
  /**
   * mousedown 이벤트 핸들러 (contentEditable 요소 처리용)
   */
  private handleMouseDown(event: MouseEvent): void {
    if (event.target instanceof HTMLElement) {
      const target = event.target;
      
      // 요소 또는 부모 요소가 contentEditable인지 확인
      let current: HTMLElement | null = target;
      while (current) {
        if (current.isContentEditable) {
          // 약간의 지연을 두고 포커스 변경 처리 (클릭 이벤트 완료 후)
          setTimeout(() => this.setActiveElement(current), 0);
          break;
        }
        current = current.parentElement;
      }
    }
  }
  
  /**
   * 활성 요소 변경
   */
  private setActiveElement(element: HTMLElement | null): void {
    if (this.activeElement === element) return;
    
    this.activeElement = element;
    
    // 포커스 변경 콜백 호출
    if (this.options.onFocusChange) {
      this.options.onFocusChange(element);
    }
  }
  
  /**
   * 현재 활성화된 요소 반환
   */
  getActiveElement(): HTMLElement | null {
    return this.activeElement;
  }
  
  /**
   * 특정 요소가 현재 활성화되어 있는지 확인
   */
  isActive(element: HTMLElement): boolean {
    return this.activeElement === element;
  }
  
  /**
   * 현재 활성화된 요소에서 텍스트 가져오기
   */
  getActiveText(): string {
    if (!this.activeElement) return '';
    
    return this.adapterRegistry.getText(this.activeElement);
  }
  
  /**
   * 현재 활성화된 요소에 텍스트 삽입
   */
  insertTextToActive(text: string): boolean {
    if (!this.activeElement) return false;
    
    this.adapterRegistry.insertText(this.activeElement, text);
    return true;
  }
  
  /**
   * 현재 활성화된 요소의 커서 위치 정보 가져오기
   */
  getActiveCursorPosition(): { top: number; left: number; } | null {
    if (!this.activeElement) return null;
    
    return this.adapterRegistry.getCursorPosition(this.activeElement);
  }
} 