/**
 * 추천 UI 렌더링 모듈 - 커서 근처에 추천 텍스트 표시
 */

import { AdapterRegistry } from './adapters/adapter-registry';

interface SuggestionUIOptions {
  onSuggestionSelect: (text: string, element: HTMLElement) => void;
  onTemplateSelect?: (template: Template, element: HTMLElement) => void;
  adapterRegistry?: AdapterRegistry;
}

interface Template {
  id: string;
  title: string;
  content: string;
}

// 기본 CSS 스타일
const SUGGESTION_UI_STYLES = `
  .assist-suggestion-container {
    position: absolute;
    z-index: 99999;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
    overflow: hidden;
    transition: opacity 0.2s, transform 0.2s;
    opacity: 0;
    transform: translateY(-8px);
  }
  
  .assist-suggestion-container.visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  .assist-suggestion-header {
    padding: 4px 12px;
    color: #666;
    font-size: 12px;
    border-bottom: 1px solid #eee;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .assist-suggestion-header-badge {
    font-size: 10px;
    background: #e9f2fe;
    color: #3E7BFA;
    padding: 2px 6px;
    border-radius: 10px;
  }
  
  .assist-suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-left: 2px solid transparent;
    transition: background-color 0.15s, border-color 0.15s;
  }
  
  .assist-suggestion-item:hover,
  .assist-suggestion-item.active {
    background-color: #f5f5f5;
  }
  
  .assist-suggestion-item.active {
    border-left: 2px solid #3E7BFA;
    padding-left: 10px;
  }
  
  .assist-prediction-text {
    color: #666;
  }
  
  .assist-prediction-highlight {
    font-weight: normal;
    color: #3E7BFA;
  }
  
  .assist-template-title {
    font-weight: bold;
    margin-bottom: 2px;
    color: #333;
  }
  
  .assist-template-preview {
    font-size: 12px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .assist-suggestion-footer {
    padding: 4px 12px;
    border-top: 1px solid #eee;
    margin-top: 4px;
    color: #888;
    font-size: 11px;
    text-align: right;
  }
  
  .assist-keyboard-shortcuts {
    display: inline-block;
    padding: 1px 5px;
    background: #f5f5f5;
    border-radius: 3px;
    margin: 0 2px;
    font-family: monospace;
    border: 1px solid #ddd;
  }
  
  .assist-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
    flex-direction: column;
  }
  
  .assist-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3E7BFA;
    border-radius: 50%;
    animation: assist-spin 1s linear infinite;
    margin-bottom: 8px;
  }
  
  .assist-loading-text {
    font-size: 12px;
    color: #666;
  }
  
  @keyframes assist-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .assist-empty-state {
    padding: 16px;
    text-align: center;
    color: #666;
    font-size: 13px;
  }
`;

/**
 * 추천 UI 컴포넌트 설정
 */
export function setupSuggestionUI(options: SuggestionUIOptions) {
  // UI 컨테이너 요소 생성
  let container: HTMLElement | null = null;
  let targetElement: HTMLElement | null = null;
  let activeItemIndex: number = 0;
  const adapterRegistry = options.adapterRegistry;
  
  // UI 요소 생성
  function createUIElements(): HTMLElement {
    // 이미 존재하는지 확인
    const existingContainer = document.getElementById('assist-suggestion-container');
    if (existingContainer) {
      return existingContainer;
    }
    
    // 스타일 삽입
    if (!document.getElementById('assist-suggestion-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'assist-suggestion-styles';
      styleEl.textContent = SUGGESTION_UI_STYLES;
      document.head.appendChild(styleEl);
    }
    
    // 컨테이너 생성
    const containerEl = document.createElement('div');
    containerEl.id = 'assist-suggestion-container';
    containerEl.className = 'assist-suggestion-container';
    document.body.appendChild(containerEl);
    
    return containerEl;
  }
  
  // UI 위치 계산 및 설정
  function positionUIElement(element: HTMLElement): void {
    if (!container || !element) return;
    
    // 어댑터를 통해 커서 위치 계산
    if (adapterRegistry) {
      const cursorPosition = adapterRegistry.getCursorPosition(element);
      
      if (cursorPosition) {
        // 어댑터에서 제공한 커서 위치 사용
        container.style.top = `${cursorPosition.top}px`;
        container.style.left = `${cursorPosition.left}px`;
        return;
      }
    }
    
    // 어댑터를 사용할 수 없는 경우 기본 위치 계산 로직 사용
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 커서 위치 계산
    let cursorTop = rect.top + scrollTop;
    let cursorLeft = rect.left + scrollLeft;
    
    // 입력 필드의 종류에 따라 위치 조정
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // 입력 필드의 경우 높이에 따라 조정
      cursorTop += rect.height + 5;
    } else if (element.isContentEditable) {
      // 커서 위치를 좀 더 정확하게 계산해야 함 (간단한 구현)
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const tempRect = range.getBoundingClientRect();
        cursorTop = tempRect.bottom + scrollTop + 5;
        cursorLeft = tempRect.left + scrollLeft;
      } else {
        cursorTop += rect.height + 5;
      }
    }
    
    // 컨테이너 위치 설정
    container.style.top = `${cursorTop}px`;
    container.style.left = `${cursorLeft}px`;
    
    // 화면 경계를 벗어나지 않도록 조정
    adjustElementPosition();
  }
  
  // 화면 경계를 벗어나지 않도록 위치 조정
  function adjustElementPosition(): void {
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 오른쪽 경계 확인
    if (rect.right > windowWidth) {
      const overflowX = rect.right - windowWidth;
      container.style.left = `${parseInt(container.style.left) - overflowX - 10}px`;
    }
    
    // 아래쪽 경계 확인
    if (rect.bottom > windowHeight) {
      const overflowY = rect.bottom - windowHeight;
      container.style.top = `${parseInt(container.style.top) - overflowY - 10}px`;
    }
  }
  
  // 로딩 UI 표시
  function showLoading(): void {
    if (!container) return;
    
    container.innerHTML = `
      <div class="assist-suggestion-header">AI 문장 자동완성</div>
      <div class="assist-loading">
        <div class="assist-loading-spinner"></div>
        <div class="assist-loading-text">추천 생성 중...</div>
      </div>
    `;
    
    positionUIElement(targetElement as HTMLElement);
    show();
  }
  
  // 빈 상태 UI 표시
  function showEmptyState(message: string = '추천 항목을 찾을 수 없습니다.'): void {
    if (!container) return;
    
    container.innerHTML = `
      <div class="assist-suggestion-header">AI 문장 자동완성</div>
      <div class="assist-empty-state">${message}</div>
    `;
    
    show();
  }
  
  // 텍스트 예측 UI 렌더링
  function renderTextPrediction(prediction: string): void {
    if (!container) return;
    
    // 원본 텍스트에서 가능한 추천 부분을 강조 표시
    const highlightedPrediction = highlightPrediction(prediction);
    
    container.innerHTML = `
      <div class="assist-suggestion-header">
        추천 완성
        <span class="assist-suggestion-header-badge">AI</span>
      </div>
      <div class="assist-suggestion-item active" data-suggestion="${encodeURIComponent(prediction)}">
        <div class="assist-prediction-text">${highlightedPrediction}</div>
      </div>
      <div class="assist-suggestion-footer">
        <span class="assist-keyboard-shortcuts">Tab</span> 또는
        <span class="assist-keyboard-shortcuts">Enter</span> 키로 적용
      </div>
    `;
    
    // 클릭 이벤트 핸들러 설정
    const suggestionItems = container.querySelectorAll('.assist-suggestion-item');
    suggestionItems.forEach(item => {
      item.addEventListener('click', () => {
        const suggestionText = decodeURIComponent(item.getAttribute('data-suggestion') || '');
        if (suggestionText && targetElement) {
          options.onSuggestionSelect(suggestionText, targetElement);
          hide();
        }
      });
    });
    
    // 키보드 핸들러 설정
    setupKeyboardNavigation();
    activeItemIndex = 0;
  }
  
  // 추천 텍스트에서 추가된 부분을 강조 표시
  function highlightPrediction(prediction: string): string {
    // TODO: 실제 구현에서는 원본 텍스트와 예측 텍스트를 비교하여
    // 추가된 부분만 강조 표시해야 합니다.
    // 현재는 간단한 예시로만 구현
    
    // 마지막 몇 글자만 강조 표시 (임시 구현)
    const length = prediction.length;
    const highlightStart = Math.max(0, length - 10);
    
    if (highlightStart === 0) {
      return `<span class="assist-prediction-highlight">${prediction}</span>`;
    }
    
    const plainText = prediction.substring(0, highlightStart);
    const highlightedText = prediction.substring(highlightStart);
    
    return `${plainText}<span class="assist-prediction-highlight">${highlightedText}</span>`;
  }
  
  /**
   * 템플릿 제안 렌더링
   */
  function renderTemplateSuggestions(templates: Template[]): void {
    if (!container) {
      // 컨테이너가 없으면 생성
      container = createUIElements();
    }
    
    // 활성 아이템 초기화
    activeItemIndex = 0;
    
    // 컨테이너 내용 초기화
    container.innerHTML = '';
    
    // 헤더 추가
    const header = document.createElement('div');
    header.className = 'assist-suggestion-header';
    header.innerHTML = `
      <span>템플릿 제안</span>
      <span class="assist-suggestion-header-badge">${templates.length}개 항목</span>
    `;
    container.appendChild(header);
    
    // 템플릿 목록 추가
    templates.forEach((template, index) => {
      const item = document.createElement('div');
      item.className = `assist-suggestion-item ${index === 0 ? 'active' : ''}`;
      item.setAttribute('data-index', index.toString());
      item.setAttribute('data-template-id', template.id);
      
      // 미리보기 텍스트 생성 (최대 50자)
      const previewText = template.content.length > 50 
        ? template.content.substring(0, 50) + '...' 
        : template.content;
      
      item.innerHTML = `
        <div style="flex: 1;">
          <div class="assist-template-title">${template.title}</div>
          <div class="assist-template-preview">${previewText}</div>
        </div>
      `;
      
      // 클릭 이벤트 처리
      item.addEventListener('click', () => {
        if (targetElement && options.onTemplateSelect) {
          options.onTemplateSelect(template, targetElement);
        }
        hide();
      });
      
      // 마우스 오버 시 활성 아이템 변경
      item.addEventListener('mouseenter', () => {
        setActiveItem(index);
      });
      
      container.appendChild(item);
    });
    
    // 푸터 추가
    const footer = document.createElement('div');
    footer.className = 'assist-suggestion-footer';
    footer.innerHTML = `
      <span class="assist-keyboard-shortcuts">↑/↓</span> 이동 
      <span class="assist-keyboard-shortcuts">Tab/Enter</span> 선택 
      <span class="assist-keyboard-shortcuts">Esc</span> 닫기
    `;
    container.appendChild(footer);
    
    // 키보드 네비게이션 설정
    setupKeyboardNavigation();
  }
  
  // 활성 항목 변경
  function setActiveItem(index: number): void {
    if (!container) return;
    
    const items = container.querySelectorAll('.assist-suggestion-item');
    if (items.length === 0) return;
    
    // 유효한 인덱스 범위 확인
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    
    // 모든 항목에서 활성 클래스 제거
    items.forEach(item => item.classList.remove('active'));
    
    // 새로운 활성 항목 설정
    items[index].classList.add('active');
    activeItemIndex = index;
    
    // 필요한 경우 스크롤 조정
    items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  
  /**
   * 키보드 네비게이션 설정
   */
  function setupKeyboardNavigation(): void {
    function handleKeyDown(e: KeyboardEvent): void {
      if (!container || !container.classList.contains('visible')) {
        return;
      }
      
      const items = container.querySelectorAll('.assist-suggestion-item');
      if (items.length === 0) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveItem((activeItemIndex + 1) % items.length);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setActiveItem((activeItemIndex - 1 + items.length) % items.length);
          break;
          
        case 'Tab':
          // Tab 키는 다음 요소로 포커스를 이동하므로, 이 동작 중지
          e.preventDefault();
          // 의도적으로 break를 넣지 않고 Enter와 같은 동작 실행
          
        case 'Enter':
          e.preventDefault();
          // 활성 아이템 가져오기
          const activeItem = container.querySelector('.assist-suggestion-item.active');
          
          if (activeItem && targetElement) {
            // 템플릿 추천인 경우
            const templateId = activeItem.getAttribute('data-template-id');
            
            if (templateId && options.onTemplateSelect) {
              // 템플릿 목록에서 해당 ID의 템플릿 찾기
              const templates = Array.from(items).map((item, index) => {
                return {
                  id: item.getAttribute('data-template-id') || '',
                  title: (item.querySelector('.assist-template-title')?.textContent || ''),
                  content: (item.querySelector('.assist-template-preview')?.getAttribute('data-full-content') || 
                            item.querySelector('.assist-template-preview')?.textContent || '')
                };
              });
              
              const selectedTemplate = templates.find(t => t.id === templateId);
              if (selectedTemplate) {
                options.onTemplateSelect(selectedTemplate, targetElement);
              }
            } else {
              // 일반 텍스트 예측 추천인 경우
              const suggestionText = activeItem.getAttribute('data-suggestion');
              if (suggestionText) {
                options.onSuggestionSelect(decodeURIComponent(suggestionText), targetElement);
              }
            }
            
            hide();
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          hide();
          break;
      }
    }
    
    // 이전에 등록된 이벤트 리스너 제거를 위해 명시적 함수 참조 유지
    document.removeEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // UI 표시
  function show(): void {
    if (!container) return;
    
    container.classList.add('visible');
  }
  
  // UI 숨기기
  function hide(): void {
    if (!container) return;
    
    container.classList.remove('visible');
    document.removeEventListener('keydown', setupKeyboardNavigation);
  }
  
  // 초기화
  container = createUIElements();
  
  // 공개 API
  return {
    /**
     * 텍스트 예측 표시
     */
    showPrediction(prediction: string, element: HTMLElement): void {
      targetElement = element;
      renderTextPrediction(prediction);
      positionUIElement(element);
      show();
    },
    
    /**
     * 템플릿 목록 표시
     */
    showTemplates(element: HTMLElement, templates: Template[]): void {
      targetElement = element;
      renderTemplateSuggestions(templates);
      positionUIElement(element);
      show();
    },
    
    /**
     * 로딩 상태 표시
     */
    showLoading(element: HTMLElement): void {
      targetElement = element;
      showLoading();
      positionUIElement(element);
      show();
    },
    
    /**
     * UI 숨기기
     */
    hide
  };
} 