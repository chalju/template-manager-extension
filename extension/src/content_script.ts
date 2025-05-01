/// <reference types="chrome"/>

// 템플릿 인터페이스
interface Template {
  id: string;
  name: string;  // 필수 필드
  title?: string;  // 선택적 필드
  content: string;
  shortcut?: string;
  categories?: string[];
}

// 전역 변수
let isOfflineMode = false;
let cachedTemplates: Template[] = [];
let isProcessingCommand = false;

// 템플릿 서비스 가져오기
import { templateService } from './components/TemplateService';

// 오프라인 상태 확인
function checkOfflineStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_OFFLINE_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        console.warn('오프라인 상태 확인 실패. 오프라인으로 간주합니다.', chrome.runtime.lastError);
        resolve(true);
        return;
      }
      resolve(response.isOffline);
    });
  });
}

// 초기화 함수
async function initialize() {
  console.log('콘텐츠 스크립트 초기화 중...');
  
  try {
    // 입력 이벤트 리스너 등록
    document.addEventListener('focusin', handleFocusIn);
    console.log('포커스 이벤트 리스너 등록됨');
    
    // 오프라인 상태 확인
    const isOffline = await checkOfflineStatus();
    console.log(`현재 확장 프로그램 상태: ${isOffline ? '오프라인' : '온라인'}`);
    
  } catch (error) {
    console.error('초기화 오류:', error);
  }
}

// 입력 영역 포커스 처리
function handleFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement;
  
  if (isInputElement(target)) {
    // console.log('입력 요소에 포커스:', target);
    target.addEventListener('keydown', handleKeyDown);
  }
}

// 키보드 이벤트 처리
async function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  
  // 입력 영역이 아니면 무시
  if (!isInputElement(target)) return;
  
  const inputElement = target as HTMLInputElement | HTMLTextAreaElement;
  const text = inputElement.value;
  const words = text.split(' ');
  const lastWord = words[words.length - 1];

  // /로 시작하는 명령어 확인
  if (lastWord.startsWith('/')) {
    // 백스페이스로 '/'만 남았거나 삭제하는 경우 팝업 닫기
    if (event.key === 'Backspace' && (lastWord === '/' || text.endsWith(' '))) {
      const popup = document.getElementById('template-selection-popup');
      const overlay = document.querySelector('div[style*="background: rgba(0,0,0,0.3)"]');
      if (popup) document.body.removeChild(popup);
      if (overlay) document.body.removeChild(overlay);
      return;
    }

    // Enter 키를 누르면 첫 번째 템플릿 선택
    if (event.key === 'Enter') {
      event.preventDefault();
      const popup = document.getElementById('template-selection-popup');
      if (popup) {
        const firstTemplate = popup.querySelector('li');
        if (firstTemplate) {
          firstTemplate.click();
        }
      }
      return;
    }

    // Esc 키를 누르면 팝업 닫기
    if (event.key === 'Escape') {
      const popup = document.getElementById('template-selection-popup');
      const overlay = document.querySelector('div[style*="background: rgba(0,0,0,0.3)"]');
      if (popup) document.body.removeChild(popup);
      if (overlay) document.body.removeChild(overlay);
      return;
    }

    // 명령어가 입력되는 동안 실시간으로 검색
    if (!isProcessingCommand) {
      console.log('명령어 감지:', lastWord);
      isProcessingCommand = true;
      await processTemplateCommand(lastWord, inputElement);
      isProcessingCommand = false;
    }
  }
}

// 템플릿 명령어 처리
async function processTemplateCommand(command: string, inputElement: HTMLInputElement | HTMLTextAreaElement) {
  try {
    if (!command || command === '/') {
      console.log('유효하지 않은 명령어:', command);
      return;
    }
    
    // 템플릿 검색
    const keyword = command.substring(1); // '/' 제거
    console.log(`"${command}" 명령어(키워드: "${keyword}")로 템플릿 검색 중...`);
    const templates = await searchTemplates(keyword);
    
    if (!templates || templates.length === 0) {
      console.log(`"${keyword}" 키워드에 맞는 템플릿 없음`);
      return;
    }
    
    console.log(`"${keyword}" 키워드로 ${templates.length}개 템플릿 찾음:`, templates);
    
    // 여러 개의 템플릿이 있으면 팝업으로 선택 UI 표시
    if (templates.length > 1) {
      showTemplateSelectionPopup(templates, (selectedTemplate) => {
        replaceCommandWithTemplate(selectedTemplate, inputElement);
      });
    } else {
      // 단일 템플릿이면 바로 적용
      console.log('단일 템플릿 자동 적용:', templates[0]);
      replaceCommandWithTemplate(templates[0], inputElement);
    }
  } catch (error) {
    console.error('템플릿 명령어 처리 오류:', error);
  }
}

// 명령어를 템플릿으로 대체
function replaceCommandWithTemplate(template: Template, inputElement: HTMLInputElement | HTMLTextAreaElement) {
  const currentText = inputElement.value;
  const cursorPos = inputElement.selectionStart || 0;
  const lastSpaceIndex = currentText.lastIndexOf(' ', cursorPos - 1);
  const textBeforeCommand = lastSpaceIndex >= 0 ? currentText.substring(0, lastSpaceIndex + 1) : '';
  const textAfterCommand = currentText.substring(cursorPos);
  
  inputElement.value = textBeforeCommand + template.content + textAfterCommand;
  
  // 커서 위치 조정
  const newCursorPosition = textBeforeCommand.length + template.content.length;
  if (typeof inputElement.setSelectionRange === 'function') {
    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
  }
  
  // 템플릿 사용 신호
  chrome.runtime.sendMessage({ 
    type: 'INCREMENT_TEMPLATE_USAGE', 
    templateId: template.id 
  });
}

// 템플릿 선택 팝업 표시
function showTemplateSelectionPopup(templates: Template[], onSelect: (template: Template) => void) {
  // 기존 팝업 제거
  const existingPopup = document.getElementById('template-selection-popup');
  const existingOverlay = document.querySelector('div[style*="background: rgba(0,0,0,0.3)"]');
  if (existingPopup) document.body.removeChild(existingPopup);
  if (existingOverlay) document.body.removeChild(existingOverlay);
  
  // 새 팝업 생성
  const popup = document.createElement('div');
  popup.id = 'template-selection-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 9999;
    max-width: 500px;
    width: calc(100% - 40px);
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  // 제목 추가
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  `;
  
  const title = document.createElement('h3');
  title.textContent = '템플릿 선택';
  title.style.cssText = 'margin: 0; font-size: 16px; color: #333;';
  header.appendChild(title);
  
  // 닫기 버튼
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 0 5px;
    line-height: 1;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(popup);
    document.body.removeChild(overlay);
  };
  header.appendChild(closeButton);
  popup.appendChild(header);
  
  // 템플릿 목록 컨테이너
  const listContainer = document.createElement('div');
  listContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 10px 0;
  `;
  
  // 템플릿 목록
  const list = document.createElement('ul');
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';
  
  let selectedIndex = 0;
  const updateSelection = (newIndex: number) => {
    const items = list.querySelectorAll('li');
    items.forEach((item, index) => {
      if (index === newIndex) {
        item.classList.add('selected');
        item.style.background = '#f0f7ff';
      } else {
        item.classList.remove('selected');
        item.style.background = 'white';
      }
    });
  };
  
  templates.forEach((template, index) => {
    const item = document.createElement('li');
    item.style.cssText = `
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    
    const name = document.createElement('div');
    name.style.cssText = 'font-weight: 600; color: #333; font-size: 14px;';
    name.textContent = template.title || template.name;
    header.appendChild(name);
    
    if (template.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.style.cssText = `
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        color: #666;
      `;
      shortcut.textContent = `/${template.shortcut}`;
      header.appendChild(shortcut);
    }
    
    item.appendChild(header);
    
    const content = document.createElement('div');
    content.style.cssText = 'font-size: 13px; color: #666; margin-top: 5px; line-height: 1.4;';
    content.textContent = template.content.length > 100 
      ? template.content.substring(0, 100) + '...' 
      : template.content;
    item.appendChild(content);
    
    item.onmouseover = () => {
      selectedIndex = index;
      updateSelection(selectedIndex);
    };
    item.onclick = () => {
      onSelect(template);
      document.body.removeChild(popup);
      document.body.removeChild(overlay);
    };
    
    list.appendChild(item);
  });
  
  listContainer.appendChild(list);
  popup.appendChild(listContainer);
  
  // 키보드 네비게이션
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % templates.length;
        updateSelection(selectedIndex);
        const nextItem = list.children[selectedIndex] as HTMLElement;
        nextItem.scrollIntoView({ block: 'nearest' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + templates.length) % templates.length;
        updateSelection(selectedIndex);
        const prevItem = list.children[selectedIndex] as HTMLElement;
        prevItem.scrollIntoView({ block: 'nearest' });
        break;
      case 'Enter':
        e.preventDefault();
        const selectedItem = list.children[selectedIndex] as HTMLElement;
        selectedItem.click();
        break;
      case 'Escape':
        e.preventDefault();
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
        break;
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  // 배경 오버레이
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 9998;
    backdrop-filter: blur(2px);
  `;
  overlay.onclick = () => {
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
    document.removeEventListener('keydown', handleKeyDown);
  };
  
  // 페이지에 추가
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // 첫 번째 아이템 선택
  updateSelection(0);
}

// 백그라운드 스크립트에 템플릿 검색 요청
function searchTemplates(keyword: string): Promise<Template[]> {
  return new Promise((resolve, reject) => {
    if (!keyword || keyword.trim() === '') {
      console.log('빈 키워드로 검색 시도. 모든 템플릿 반환 시도');
    }
    
    console.log(`백그라운드에 템플릿 검색 요청 - 키워드: "${keyword}"`);
    
    chrome.runtime.sendMessage({ type: 'SEARCH_TEMPLATES', keyword }, (response) => {
      // 크롬 런타임 오류 처리
      if (chrome.runtime.lastError) {
        console.error('템플릿 검색 크롬 오류:', chrome.runtime.lastError);
        console.log('크롬 오류로 인해 기본 템플릿 사용 시도');
        
        // 기본 템플릿에서 키워드로 검색
        const defaultTemplates = getDefaultTemplates(keyword);
        console.log(`기본 템플릿 ${defaultTemplates.length}개 찾음`);
        resolve(defaultTemplates);
        return;
      }
      
      // 응답이 없거나 유효하지 않은 경우
      if (!response) {
        console.error('백그라운드로부터 응답 없음');
        const defaultTemplates = getDefaultTemplates(keyword);
        console.log(`응답 없음, 기본 템플릿 ${defaultTemplates.length}개 사용`);
        resolve(defaultTemplates);
        return;
      }
      
      // 성공적인 응답 처리
      if (response.success && Array.isArray(response.templates)) {
        const templates = response.templates;
        console.log(`템플릿 검색 성공: ${templates.length}개 찾음`, templates);
        
        // 템플릿 검증 - 필수 필드(id, name, content) 누락 확인
        const validTemplates = templates.filter((template: any) => 
          template && template.id !== undefined && template.name && template.content
        );
        
        if (validTemplates.length < templates.length) {
          console.warn(`일부 템플릿이 유효하지 않아 ${templates.length - validTemplates.length}개 필터링됨`);
        }
        
        resolve(validTemplates);
      } else {
        // 오류 응답 처리
        console.error('템플릿 검색 실패:', response.error || '알 수 없는 오류');
        console.log(response.isOffline ? '오프라인 모드 응답' : '오류 응답', response);
        
        // 응답에 템플릿이 있으면 사용, 없으면 기본 템플릿 사용
        if (Array.isArray(response.templates) && response.templates.length > 0) {
          console.log('오류지만 템플릿 포함됨, 반환:', response.templates.length);
          resolve(response.templates);
        } else {
          const defaultTemplates = getDefaultTemplates(keyword);
          console.log(`오류로 인해 기본 템플릿 ${defaultTemplates.length}개 사용`);
          resolve(defaultTemplates);
        }
      }
    });
  });
}

// 기본 템플릿 가져오기 함수
function getDefaultTemplates(keyword?: string): Template[] {
  // templateService의 getDefaultTemplates를 사용
  const defaultTemplates = templateService.getDefaultTemplates();
  
  // 키워드가 있으면 필터링
  if (keyword && keyword.trim() !== '') {
    const lowercaseKeyword = keyword.toLowerCase();
    return defaultTemplates.filter(template => 
      template.name.toLowerCase().includes(lowercaseKeyword) || 
      template.content.toLowerCase().includes(lowercaseKeyword) ||
      (template.shortcut && template.shortcut.toLowerCase().includes(lowercaseKeyword))
    );
  }
  
  return defaultTemplates;
}

// 요소가 입력 요소인지 확인
function isInputElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' && 
    ['text', 'email', 'search', 'url', 'tel', 'number', ''].includes((element as HTMLInputElement).type)
  ) || tagName === 'textarea' || element.isContentEditable;
}

// 초기화 실행
initialize(); 