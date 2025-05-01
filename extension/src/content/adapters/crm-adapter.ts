/**
 * CRM 시스템 어댑터 구현
 */

import { InputFieldAdapter, DefaultInputAdapter } from './input-adapter';

/**
 * SalesForce와 유사한 CRM을 위한 어댑터
 */
export class SalesForceLikeAdapter implements InputFieldAdapter {
  isApplicable(): boolean {
    // URL 또는 DOM 요소를 검사하여 SalesForce CRM인지 확인
    return window.location.href.includes('salesforce.com') || 
           document.querySelector('.slds-global-header') !== null;
  }
  
  getTextFields(): HTMLElement[] {
    // SalesForce 특화 텍스트 필드 선택자
    const selectors = [
      '.slds-input', 
      '.slds-textarea',
      '.cke_editable',  // SalesForce 리치 텍스트 에디터
      '[data-aura-class="uiInput"]',
      '[data-aura-class="uiInputTextArea"]'
    ].join(', ');
    
    const elements = Array.from(document.querySelectorAll(selectors)) as HTMLElement[];
    
    // 제외할 입력 필드
    const excludeSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      'input[type="search"]',
      '[data-field-type="password"]'
    ].join(', ');
    
    return elements.filter(element => !element.matches(excludeSelectors));
  }
  
  getText(element: HTMLElement): string {
    // SalesForce 특화 텍스트 추출 로직
    if (element.classList.contains('cke_editable')) {
      // 리치 텍스트 에디터 처리
      return element.textContent || '';
    }
    
    // 기본 추출 로직은 DefaultAdapter와 동일
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    }
    
    return '';
  }
  
  insertText(element: HTMLElement, text: string): void {
    // SalesForce 특화 텍스트 삽입 로직
    if (element.classList.contains('cke_editable')) {
      // 리치 텍스트 에디터 처리
      document.execCommand('insertText', false, text);
      
      // Lightning 컴포넌트 변경 이벤트 발생
      this.triggerLightningChangeEvent(element);
      return;
    }
    
    // 기본 삽입 로직
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const beforeText = element.value.substring(0, start);
      const afterText = element.value.substring(end);
      
      element.value = beforeText + text + afterText;
      element.selectionStart = element.selectionEnd = start + text.length;
      element.focus();
      
      // Lightning 컴포넌트 변경 이벤트 발생
      this.triggerLightningChangeEvent(element);
    } else if (element.isContentEditable) {
      document.execCommand('insertText', false, text);
      this.triggerLightningChangeEvent(element);
    }
  }
  
  getCursorPosition(element: HTMLElement): { top: number; left: number; } | null {
    // 기본 로직은 DefaultAdapter와 동일
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        top: rect.top + rect.height + scrollTop,
        left: rect.left + scrollLeft
      };
    } else if (element.isContentEditable) {
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
  
  // Lightning UI 컴포넌트를 위한 변경 이벤트 발생
  private triggerLightningChangeEvent(element: HTMLElement): void {
    // 기본 이벤트
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Lightning 특화 이벤트
    element.dispatchEvent(new CustomEvent('lightning__change', { bubbles: true, composed: true }));
  }
}

/**
 * Zendesk와 유사한 CRM을 위한 어댑터
 */
export class ZendeskLikeAdapter implements InputFieldAdapter {
  isApplicable(): boolean {
    // URL 또는 DOM 요소를 검사하여 Zendesk CRM인지 확인
    return window.location.href.includes('zendesk.com') || 
           document.querySelector('.zendesk-header') !== null ||
           document.querySelector('[data-garden-id]') !== null;
  }
  
  getTextFields(): HTMLElement[] {
    // Zendesk 특화 텍스트 필드 선택자
    const selectors = [
      '.zendesk-editor',
      '.ember-text-area',
      '.zendesk-ticket-field',
      '[data-garden-id="forms.text_input"]',
      '[data-garden-id="forms.textarea"]'
    ].join(', ');
    
    const elements = Array.from(document.querySelectorAll(selectors)) as HTMLElement[];
    
    // 기본 입력 필드도 포함
    const defaultSelectors = [
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]'
    ].join(', ');
    
    const defaultElements = Array.from(document.querySelectorAll(defaultSelectors)) as HTMLElement[];
    
    // 모든 요소 합치기
    const allElements = [...elements, ...defaultElements];
    
    // 제외할 입력 필드
    const excludeSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      'input[type="search"]'
    ].join(', ');
    
    return allElements.filter(element => !element.matches(excludeSelectors));
  }
  
  getText(element: HTMLElement): string {
    // Zendesk 특화 텍스트 추출 로직
    if (element.classList.contains('zendesk-editor')) {
      // 특별한 처리가 필요한 경우
      return element.textContent || '';
    }
    
    // 기본 추출 로직
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    } else if (element.isContentEditable) {
      return element.textContent || '';
    }
    
    return '';
  }
  
  insertText(element: HTMLElement, text: string): void {
    // Zendesk 특화 텍스트 삽입 로직
    if (element.classList.contains('zendesk-editor')) {
      // 특별한 처리가 필요한 경우
      document.execCommand('insertText', false, text);
      this.triggerZendeskChangeEvent(element);
      return;
    }
    
    // 기본 삽입 로직
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const beforeText = element.value.substring(0, start);
      const afterText = element.value.substring(end);
      
      element.value = beforeText + text + afterText;
      element.selectionStart = element.selectionEnd = start + text.length;
      element.focus();
      
      this.triggerZendeskChangeEvent(element);
    } else if (element.isContentEditable) {
      document.execCommand('insertText', false, text);
      this.triggerZendeskChangeEvent(element);
    }
  }
  
  getCursorPosition(element: HTMLElement): { top: number; left: number; } | null {
    // 기본 로직과 동일
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        top: rect.top + rect.height + scrollTop,
        left: rect.left + scrollLeft
      };
    } else if (element.isContentEditable) {
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
  
  // Zendesk UI 컴포넌트를 위한 변경 이벤트 발생
  private triggerZendeskChangeEvent(element: HTMLElement): void {
    // 기본 이벤트
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Zendesk Ember 관련 이벤트
    element.dispatchEvent(new CustomEvent('ember-changed', { bubbles: true }));
  }
} 