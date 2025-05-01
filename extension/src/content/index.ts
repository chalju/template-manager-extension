/**
 * 콘텐츠 스크립트 - 웹 페이지 내 텍스트 입력 필드 감지 및 상호작용
 */

import { AdapterRegistry } from './adapters/adapter-registry';
import { FocusTracker } from './focus-tracker';
import { setupSuggestionUI } from './suggestion-ui';
import { TemplateManager } from './template-manager';
import { KeywordMatch } from '../utils/keyword-detector';
import { contextExtractor } from './context-extractor';
import { AICompletionHandler } from './ai-completion-handler';
import { promptBuilder } from '../utils/prompt-builder';

// Chrome API 타입 선언 (타입스크립트 컴파일러에게 chrome 객체가 존재함을 알림)
// @ts-ignore
declare const chrome: any;

// 타입 정의
interface PredictionResponse {
  prediction?: string;
  error?: string;
}

interface Template {
  id: string;
  title: string;
  content: string;
}

interface TemplateResponse {
  templates?: Template[];
  error?: string;
}

// 디바운스 함수 구현
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

// 문장 자동 완성 제안 요청
async function requestPrediction(text: string): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'PREDICT_TEXT', context: text },
      (response: PredictionResponse) => {
        if (response && response.prediction) {
          resolve(response.prediction);
        } else {
          resolve('');
        }
      }
    );
  });
}

// 어댑터 레지스트리 초기화
const adapterRegistry = new AdapterRegistry();

// 현재 키워드 상태 관리
let currentKeywordMatch: KeywordMatch | null = null;
let isShowingTemplates = false;

// 템플릿 매니저 초기화
const templateManager = new TemplateManager({
  keywordPrefixes: ['/'],
  maxKeywordLength: 30,
  contextWindowSize: 150
});

// 템플릿 삽입 처리 함수 선언
let insertTemplate: (template: Template, element: HTMLElement) => void;

// 제안 UI 생성
const suggestionUIInstance = setupSuggestionUI({
  onSuggestionSelect: (text: string, element: HTMLElement) => {
    adapterRegistry.insertText(element, text);
  },
  onTemplateSelect: (template: Template, element: HTMLElement) => {
    insertTemplate(template, element);
  },
  adapterRegistry: adapterRegistry
});

// 템플릿 삽입 처리 함수 정의
insertTemplate = (template: Template, element: HTMLElement) => {
  if (!currentKeywordMatch) return;
  
  // 템플릿 삽입 요청
  const templateId = template.id;
  
  // Chrome 메시지를 통해 템플릿 정보 요청
  chrome.runtime.sendMessage(
    { type: 'SELECT_TEMPLATE', templateId },
    (response: any) => {
      if (response.error) {
        console.error('템플릿 적용 오류:', response.error);
        return;
      }
      
      // 텍스트 삽입 처리
      if (currentKeywordMatch) {
        const text = adapterRegistry.getText(element);
        const { position } = currentKeywordMatch;
        
        console.log('템플릿 대체 정보:', {
          키워드시작: position.start,
          키워드끝: position.end,
          키워드: text.substring(position.start, position.end),
          템플릿제목: template.title,
          템플릿내용: response.prediction
        });
        
        try {
          // 입력 필드인 경우
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            const start = position.start;
            const end = position.end;
            const beforeText = text.substring(0, start);
            const afterText = text.substring(end);
            
            // 직접 값을 변경하고 이벤트 발생
            element.value = beforeText + response.prediction + afterText;
            element.selectionStart = element.selectionEnd = start + response.prediction.length;
            element.focus();
            
            // 변경 이벤트 발생시키기
            element.dispatchEvent(new Event('input', { bubbles: true }));
          } 
          // contentEditable 요소인 경우
          else if (element.isContentEditable) {
            // 현재 선택 저장
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              // 새 범위 생성
              const range = document.createRange();
              
              // 텍스트 노드와 오프셋 찾기
              let startNode = null;
              let startOffset = 0;
              let endNode = null;
              let endOffset = 0;
              
              // 재귀적으로 텍스트 노드와 오프셋 위치 찾기
              function findTextPosition(node: Node, targetOffset: number, isStart: boolean): boolean {
                if (node.nodeType === Node.TEXT_NODE) {
                  const textLength = node.textContent?.length || 0;
                  if (targetOffset <= textLength) {
                    if (isStart) {
                      startNode = node;
                      startOffset = targetOffset;
                    } else {
                      endNode = node;
                      endOffset = targetOffset;
                    }
                    return true;
                  }
                  return false;
                }
                
                let offset = 0;
                for (let i = 0; i < node.childNodes.length; i++) {
                  const childNode = node.childNodes[i];
                  const childLength = childNode.textContent?.length || 0;
                  
                  if (targetOffset <= offset + childLength) {
                    return findTextPosition(childNode, targetOffset - offset, isStart);
                  }
                  
                  offset += childLength;
                }
                
                return false;
              }
              
              // 시작과 끝 위치 찾기
              findTextPosition(element, position.start, true);
              findTextPosition(element, position.end, false);
              
              if (startNode && endNode) {
                // 범위 설정
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                
                // 선택 범위 설정
                selection.removeAllRanges();
                selection.addRange(range);
                
                // 템플릿 삽입
                document.execCommand('insertText', false, response.prediction);
              } else {
                // 대체 방법: 어댑터 이용
                adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
              }
            }
          } else {
            // 기본 방법: 어댑터 이용
            adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
          }
        } catch (error) {
          console.error('템플릿 대체 중 오류 발생:', error);
          // 문제 발생 시 기본 방법 시도
          try {
            adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
          } catch (fallbackError) {
            console.error('템플릿 대체 최종 시도 실패:', fallbackError);
          }
        }
      }
      
      // 템플릿 사용 횟수 증가 (백그라운드에서 처리됨)
      chrome.runtime.sendMessage({
        type: 'INCREMENT_TEMPLATE_USAGE',
        templateId
      });
      
      // UI 숨기기
      suggestionUIInstance.hide();
      isShowingTemplates = false;
      currentKeywordMatch = null;
    }
  );
};

// AI 자동완성 핸들러 생성
const completionHandler = new AICompletionHandler(suggestionUIInstance, {
  completionThrottleMs: 800  // 입력 후 0.8초 후 자동완성 요청
});

/**
 * 확장 프로그램 초기화
 */
function initialize(): void {
  console.log('AI 자동완성 확장 프로그램이 초기화되었습니다');
  
  // 설정 로드
  loadSettings();
  
  // 메시지 리스너 등록
  setupMessageListeners();
  
  // 어댑터 초기화
  adapterRegistry.initialize();
  
  // 템플릿 매니저 초기화
  templateManager.initialize().catch(console.error);
}

/**
 * 설정 로드 함수
 */
function loadSettings(): void {
  // 로컬 스토리지에서 설정 로드
  chrome.storage.local.get(['enabled', 'domains'], (result: any) => {
    // 확장 프로그램 활성화 여부 설정
    if (result.enabled !== undefined) {
      completionHandler.setActive(result.enabled);
    }
    
    // TODO: 도메인별 설정 적용
  });
}

/**
 * 메시지 리스너 설정
 */
function setupMessageListeners(): void {
  // 백그라운드 스크립트로부터 메시지 수신
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (!message || !message.type) {
      return;
    }
    
    // 메시지 타입별 처리
    switch (message.type) {
      case 'TOGGLE_ENABLED':
        // 확장 프로그램 활성화 상태 토글
        completionHandler.setActive(message.enabled);
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_SETTINGS':
        // 설정 업데이트
        loadSettings();
        sendResponse({ success: true });
        break;
        
      default:
        // 알 수 없는 메시지 타입
        console.warn('알 수 없는 메시지 타입:', message.type);
    }
  });
}

// 포커스된 요소 변경 이벤트 처리
document.addEventListener('focusin', (event) => {
  const element = event.target as HTMLElement;
  
  // 입력 필드인지 확인 (이미 AICompletionHandler에서 처리)
  if (!element || !contextExtractor.isInputField(element)) {
    suggestionUIInstance.hide();
  }
});

// 페이지 클릭 이벤트 처리 (외부 클릭 시 자동완성 UI 숨김)
document.addEventListener('click', () => {
  // UI가 표시된 상태인 경우에만 처리
  if (isShowingTemplates) {
    suggestionUIInstance.hide();
    isShowingTemplates = false;
  }
});

// 텍스트 변경시 핸들러
const handleTextChanged = debounce(async (element: HTMLElement) => {
  const text = adapterRegistry.getText(element);
  const cursorPosition = getCurrentCursorPosition(element);
  
  if (!text || cursorPosition === undefined) return;
  
  // 키워드 감지
  const keywordMatch = templateManager.detectKeyword(text, cursorPosition);
  
  // 키워드 상태 업데이트
  if (keywordMatch) {
    currentKeywordMatch = keywordMatch;
    isShowingTemplates = true;
    
    // 템플릿 검색 결과 요청
    const searchResult = await templateManager.searchTemplates(keywordMatch);
    
    // 로딩 상태 표시
    if (searchResult.isLoading) {
      suggestionUIInstance.showLoading(element);
    }
    
    // 템플릿 결과 표시
    if (searchResult.templates.length > 0) {
      const templates = searchResult.templates.map(match => ({
        id: match.template.id,
        title: match.template.title,
        content: match.template.content
      }));
      
      // 템플릿 결과 전달
      suggestionUIInstance.showTemplates(element, templates);
    } else if (!searchResult.isLoading && !searchResult.error) {
      suggestionUIInstance.hide();
      isShowingTemplates = false;
    }
  } else if (isShowingTemplates) {
    // 키워드가 더이상 없으면 제안 UI 숨기기
    suggestionUIInstance.hide();
    isShowingTemplates = false;
    currentKeywordMatch = null;
    return;
  }
  
  // 키워드를 감지하지 못한 경우에는 문장 자동완성 처리
  if (!keywordMatch && text.length > 5) {
    // 적어도 5자 이상 입력된 경우에만 예측 요청
    const prediction = await requestPrediction(text);
    
    if (prediction && !isShowingTemplates) {
      // 예측된 텍스트가 있고 템플릿을 보여주고 있지 않은 경우에만 보여줌
      suggestionUIInstance.showPrediction(prediction, element);
    }
  }
}, 300); // 300ms 디바운스

// 현재 커서 위치 가져오기
function getCurrentCursorPosition(element: HTMLElement): number | undefined {
  // 어댑터에서 텍스트 가져오기
  const text = adapterRegistry.getText(element);
  
  // 브라우저 실행 환경에 따라 처리
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.selectionStart ?? undefined;
  } else if (element.isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
  }
  
  return text?.length; // 위치를 알 수 없으면 텍스트 끝으로 가정
}

// 포커스 트래커 초기화
const focusTracker = new FocusTracker(adapterRegistry, {
  onFocusChange: (element) => {
    if (!element) {
      suggestionUIInstance.hide();
      return;
    }
    
    // 포커스 변경 시 이전 제안 초기화
    currentKeywordMatch = null;
    isShowingTemplates = false;
  }
});

// 텍스트 입력 이벤트 리스너
document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement;
  const activeElement = focusTracker.getActiveElement();
  
  if (target && activeElement && target === activeElement) {
    handleTextChanged(target);
  }
});

// 키 이벤트 리스너
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    suggestionUIInstance.hide();
    isShowingTemplates = false;
    currentKeywordMatch = null;
  }
});

// 메인 함수
(async function() {
  console.log('AI 문장 자동완성 어시스턴트가 활성화되었습니다');
  
  // 초기화 함수 호출
  initialize();
  
  // 초기 로딩 완료 메시지
  console.log('AI 문장 자동완성 어시스턴트가 준비되었습니다.');
})(); 