/**
 * 어댑터 레지스트리 - 현재 웹 페이지에 적합한 어댑터 선택 및 관리
 */

import { InputFieldAdapter, DefaultInputAdapter } from './input-adapter';
import { SalesForceLikeAdapter, ZendeskLikeAdapter } from './crm-adapter';

/**
 * 사용 가능한 모든 어댑터를 등록하고 현재 웹사이트에 적합한 어댑터를 선택하는 레지스트리
 */
export class AdapterRegistry {
  private adapters: InputFieldAdapter[] = [];
  private currentAdapter: InputFieldAdapter | null = null;
  
  constructor() {
    // 모든 어댑터 등록
    // 순서가 중요: 더 특화된 어댑터가 먼저 검사되어야 합니다.
    this.adapters = [
      new SalesForceLikeAdapter(),
      new ZendeskLikeAdapter(),
      new DefaultInputAdapter() // 항상 마지막에 기본 어댑터
    ];
  }
  
  /**
   * 현재 웹 페이지에 가장 적합한 어댑터를 선택하고 초기화
   */
  initialize(): void {
    // 어댑터 선택
    for (const adapter of this.adapters) {
      if (adapter.isApplicable()) {
        this.currentAdapter = adapter;
        console.log(`AI 문장 자동완성: ${adapter.constructor.name} 어댑터가 선택되었습니다.`);
        break;
      }
    }
    
    // 어댑터를 찾지 못한 경우 기본 어댑터 사용
    if (!this.currentAdapter) {
      this.currentAdapter = new DefaultInputAdapter();
      console.log('AI 문장 자동완성: 기본 어댑터가 선택되었습니다.');
    }
  }
  
  /**
   * 현재 활성화된 어댑터 반환
   */
  getAdapter(): InputFieldAdapter {
    if (!this.currentAdapter) {
      this.initialize();
    }
    
    return this.currentAdapter as InputFieldAdapter;
  }
  
  /**
   * 페이지 내의 모든 텍스트 입력 필드 가져오기
   */
  getTextFields(): HTMLElement[] {
    return this.getAdapter().getTextFields();
  }
  
  /**
   * 특정 요소에서 텍스트 가져오기
   */
  getText(element: HTMLElement): string {
    return this.getAdapter().getText(element);
  }
  
  /**
   * 특정 요소에 텍스트 삽입
   */
  insertText(element: HTMLElement, text: string): void {
    this.getAdapter().insertText(element, text);
  }
  
  /**
   * 커서 위치 가져오기
   */
  getCursorPosition(element: HTMLElement): { top: number; left: number; } | null {
    return this.getAdapter().getCursorPosition(element);
  }
} 