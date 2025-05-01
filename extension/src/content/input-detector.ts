/**
 * 텍스트 입력 필드 감지 및 모니터링 모듈
 */

interface InputListenerOptions {
  onInput: (text: string, element: HTMLElement) => void;
  onFocusOut: (element: HTMLElement) => void;
}

// 입력 필드 감지를 위한 선택자
const TEXT_INPUT_SELECTORS = [
  'input[type="text"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]',
].join(', ');

// 특정 입력 필드를 제외하기 위한 선택자 (비밀번호, 이메일 등)
const EXCLUDED_INPUT_SELECTORS = [
  'input[type="password"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="tel"]',
  'input[type="date"]',
  'input[type="time"]',
  'input[type="url"]',
  'input[type="color"]',
].join(', ');

// 텍스트 입력 필드인지 확인하는 함수
function isValidTextField(element: HTMLElement): boolean {
  // 제외 선택자에 매칭되는지 확인
  if (element.matches(EXCLUDED_INPUT_SELECTORS)) {
    return false;
  }
  
  // 텍스트 입력 필드에 매칭되는지 확인
  if (element.matches(TEXT_INPUT_SELECTORS)) {
    return true;
  }
  
  return false;
}

// 콘텐츠에디터블 요소에서 텍스트 추출
function getContentEditableText(element: HTMLElement): string {
  return element.textContent || '';
}

// 입력 필드에서 텍스트 추출
function getInputText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  } else if (element.isContentEditable) {
    return getContentEditableText(element);
  }
  
  return '';
}

// DOM 뮤테이션 옵저버 설정
function setupMutationObserver(callback: (elements: HTMLElement[]) => void): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const newElements: HTMLElement[] = [];
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            
            // 요소 자체가 입력 필드인지 확인
            if (isValidTextField(element)) {
              newElements.push(element);
            }
            
            // 하위 요소에서 입력 필드 찾기
            const inputs = element.querySelectorAll(TEXT_INPUT_SELECTORS);
            inputs.forEach(input => {
              if (isValidTextField(input as HTMLElement)) {
                newElements.push(input as HTMLElement);
              }
            });
          }
        });
      }
    });
    
    if (newElements.length > 0) {
      callback(newElements);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

// 입력 필드에 이벤트 리스너 연결
function attachEventListeners(
  element: HTMLElement, 
  options: InputListenerOptions
): void {
  // 입력 이벤트 리스너
  const handleInput = () => {
    const text = getInputText(element);
    options.onInput(text, element);
  };
  
  // 포커스 아웃 리스너
  const handleFocusOut = () => {
    options.onFocusOut(element);
  };
  
  // 이벤트 리스너 등록
  element.addEventListener('input', handleInput);
  element.addEventListener('focusout', handleFocusOut);
  
  // 이미 등록되었음을 표시하기 위해 데이터 속성 설정
  element.setAttribute('data-assistext-attached', 'true');
}

/**
 * 페이지 내 텍스트 입력 필드에 리스너 연결
 */
export function attachInputListeners(options: InputListenerOptions): void {
  // 1. 이미 존재하는 입력 필드 처리
  const existingInputs = document.querySelectorAll(TEXT_INPUT_SELECTORS);
  existingInputs.forEach(input => {
    const element = input as HTMLElement;
    if (isValidTextField(element) && !element.hasAttribute('data-assistext-attached')) {
      attachEventListeners(element, options);
    }
  });
  
  // 2. 새로 추가되는 입력 필드 감지를 위한 MutationObserver 설정
  setupMutationObserver((newElements) => {
    newElements.forEach(element => {
      if (!element.hasAttribute('data-assistext-attached')) {
        attachEventListeners(element, options);
      }
    });
  });
  
  // 3. 동적으로 추가되는 iframe 내부 콘텐츠 처리
  document.addEventListener('load', (event) => {
    const target = event.target;
    if (target instanceof HTMLIFrameElement && target.contentDocument) {
      const iframeInputs = target.contentDocument.querySelectorAll(TEXT_INPUT_SELECTORS);
      iframeInputs.forEach(input => {
        const element = input as HTMLElement;
        if (isValidTextField(element) && !element.hasAttribute('data-assistext-attached')) {
          attachEventListeners(element, options);
        }
      });
    }
  }, true);
} 