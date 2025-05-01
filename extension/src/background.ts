/// <reference types="chrome"/>
import { settingsService } from './components/SettingsService';
import { templateService } from './components/TemplateService';
import { offlineManager } from './components/OfflineManager';
import { authService } from './components/AuthService';

// API 기본 URL
const API_BASE_URL = 'http://localhost:8000';

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('백그라운드에서 메시지 수신:', message);

  // 메시지 유형에 따라 처리
  switch (message.type) {
    case 'SEARCH_TEMPLATES':
      handleSearchTemplates(message.keyword, sendResponse);
      return true; // 비동기 응답을 위해 true 반환
      
    case 'SELECT_TEMPLATE':
      handleSelectTemplate(message.templateId, sendResponse);
      return true;
      
    case 'PREDICT_TEXT':
      handlePredictText(message.context, sendResponse);
      return true;
      
    case 'SETTINGS_UPDATED':
      // 이미 구현되어 있음
      return false;
      
    case 'GET_OFFLINE_STATUS':
      sendResponse({ isOffline: offlineManager.isOffline() });
      return false;
      
    case 'SET_OFFLINE_MODE':
      offlineManager.setOfflineMode(message.isOffline);
      sendResponse({ success: true });
      return false;
      
    case 'INCREMENT_TEMPLATE_USAGE':
      handleIncrementTemplateUsage(message.templateId, sendResponse);
      return true;
  }
  
  return false;
});

/**
 * 템플릿 검색 처리
 */
async function handleSearchTemplates(keyword: string, sendResponse: (response: any) => void): Promise<void> {
  try {
    console.log(`템플릿 검색 요청: "${keyword}"`);
    
    // 오프라인 모드 확인
    if (offlineManager.isOffline()) {
      console.log('오프라인 모드: 로컬 템플릿 검색');
      
      // 캐시에서 템플릿 검색 시도
      try {
        const cachedTemplates = await getCachedTemplates();
        if (cachedTemplates && cachedTemplates.length > 0) {
          const filteredTemplates = filterTemplatesByKeyword(cachedTemplates, keyword);
          console.log(`캐시에서 ${filteredTemplates.length}개 템플릿 찾음`);
          sendResponse({ success: true, templates: filteredTemplates, isOffline: true });
          return;
        }
      } catch (cacheError) {
        console.error('캐시 검색 오류:', cacheError);
      }
      
      // 캐시에 없으면 기본 템플릿 반환
      const defaultTemplates = getDefaultTemplates();
      if (keyword) {
        const filteredDefaults = filterTemplatesByKeyword(defaultTemplates, keyword);
        console.log(`기본 템플릿에서 ${filteredDefaults.length}개 찾음`);
        sendResponse({ success: true, templates: filteredDefaults, isOffline: true });
      } else {
        console.log(`모든 기본 템플릿 ${defaultTemplates.length}개 반환`);
        sendResponse({ success: true, templates: defaultTemplates, isOffline: true });
      }
      return;
    }
    
    // 온라인 모드: API 서버에서 템플릿 검색
    console.log('온라인 모드: API 서버에서 템플릿 검색 시도');
    
    try {
      // TemplateService 사용하여 API 호출
      console.log('templateService.searchTemplates 호출...');
      const templates = await templateService.searchTemplates(keyword);
      console.log(`API에서 ${templates?.length || 0}개의 템플릿 찾음:`, templates);
      
      if (templates && Array.isArray(templates)) {
        sendResponse({ success: true, templates: templates });
      } else {
        console.error('API 응답에 유효한 templates 배열이 없음:', templates);
        throw new Error('API에서 유효한 템플릿 목록을 반환하지 않음');
      }
    } catch (error) {
      console.error('API 템플릿 검색 오류:', error);
      console.log('오류 상세:', error instanceof Error ? error.message : String(error));
      
      // 오류 발생 시 오프라인 모드로 전환
      console.log('템플릿 API 오류로 오프라인 모드로 전환');
      offlineManager.setOfflineMode(true);
      
      // 먼저 캐시에서 템플릿 검색 시도
      try {
        const cachedTemplates = await getCachedTemplates();
        if (cachedTemplates && cachedTemplates.length > 0) {
          // 키워드로 필터링
          const filteredTemplates = filterTemplatesByKeyword(cachedTemplates, keyword);
          console.log(`캐시에서 ${filteredTemplates.length}개의 템플릿 찾음`);
          sendResponse({ 
            success: true, 
            templates: filteredTemplates, 
            isOffline: true,
            error: `서버 연결 오류: ${error instanceof Error ? error.message : String(error)}`
          });
          return;
        }
      } catch (cacheError) {
        console.error('캐시에서 템플릿 검색 오류:', cacheError);
      }
      
      // 캐시도 실패하면 기본 템플릿 사용
      const defaultTemplates = getDefaultTemplates();
      if (keyword) {
        const filteredDefaults = filterTemplatesByKeyword(defaultTemplates, keyword);
        console.log(`기본 템플릿에서 ${filteredDefaults.length}개 찾음`);
        sendResponse({ 
          success: true, 
          templates: filteredDefaults, 
          isOffline: true,
          error: `서버 연결 오류: ${error instanceof Error ? error.message : String(error)}`
        });
      } else {
        console.log(`모든 기본 템플릿 ${defaultTemplates.length}개 반환`);
        sendResponse({ 
          success: true, 
          templates: defaultTemplates, 
          isOffline: true,
          error: `서버 연결 오류: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  } catch (error) {
    console.error('템플릿 검색 중 예상치 못한 오류:', error);
    console.log('예상치 못한 오류 상세:', error instanceof Error ? error.message : String(error));
    
    // 기본 템플릿으로 대체하여 사용자 경험 유지
    const defaultTemplates = getDefaultTemplates();
    sendResponse({ 
      success: false, 
      error: `예상치 못한 오류: ${error instanceof Error ? error.message : String(error)}`, 
      templates: defaultTemplates,
      isOffline: true
    });
  }
}

/**
 * 키워드로 템플릿 필터링
 */
function filterTemplatesByKeyword(templates: any[], keyword: string): any[] {
  if (!keyword || keyword.trim() === '') {
    return templates;
  }
  
  const lowercaseKeyword = keyword.toLowerCase();
  return templates.filter(template => 
    (template.name && template.name.toLowerCase().includes(lowercaseKeyword)) || 
    (template.title && template.title.toLowerCase().includes(lowercaseKeyword)) ||
    (template.content && template.content.toLowerCase().includes(lowercaseKeyword)) ||
    (template.shortcut && template.shortcut.toLowerCase().includes(lowercaseKeyword)) ||
    (template.keyword && template.keyword.toLowerCase().includes(lowercaseKeyword))
  );
}

/**
 * 캐시된 템플릿 가져오기
 */
async function getCachedTemplates(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('cachedTemplates', (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(result.cachedTemplates || []);
    });
  });
}

/**
 * 기본 템플릿 목록 반환 (백엔드 연결 실패 시 사용)
 */
function getDefaultTemplates(): any[] {
  return [
    {
      id: 999001,
      name: "SSL 인증서 갱신 안내",
      content: "안녕하세요,\n\n귀사의 SSL 인증서 갱신 기간이 30일 이내로 다가왔습니다. 서비스 중단을 방지하기 위해 가능한 빠른 시일 내에 인증서 갱신을 진행해주시기 바랍니다.\n\n감사합니다.",
      shortcut: "ssl"
    },
    {
      id: 999002,
      name: "회의 일정 안내",
      content: "안녕하세요,\n\n다음 회의 일정을 안내드립니다.\n일시: [날짜] [시간]\n장소: [장소]\n안건: [안건]\n\n참석 여부를 답장으로 알려주시기 바랍니다.\n\n감사합니다.",
      shortcut: "meeting"
    },
    {
      id: 999003,
      name: "감사 인사",
      content: "안녕하세요,\n\n도움 주셔서 진심으로 감사드립니다. 덕분에 원활하게 업무를 진행할 수 있었습니다.\n\n감사합니다.",
      shortcut: "thanks"
    }
  ];
}

/**
 * 템플릿 선택 처리
 */
async function handleSelectTemplate(templateId: number, sendResponse: (response: any) => void): Promise<void> {
  try {
    console.log(`템플릿 ID ${templateId} 선택됨`);
    const templates = await templateService.fetchTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`템플릿 ID ${templateId}를 찾을 수 없습니다.`);
    }
    
    // 사용 횟수 증가 등의 로직 추가 가능
    
    sendResponse({ success: true, template });
  } catch (error) {
    console.error('템플릿 선택 오류:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : '템플릿 선택 실패' 
    });
  }
}

/**
 * 텍스트 예측 처리 (AI 자동완성)
 */
async function handlePredictText(context: string, sendResponse: (response: any) => void): Promise<void> {
  try {
    console.log('텍스트 예측 요청:', context);
    
    // 오프라인 모드 확인
    if (offlineManager.isOffline()) {
      console.log('오프라인 모드: 간단한 자동완성 제공');
      // 간단한 로컬 자동완성 예시 (실제로는 더 복잡한 로직 필요)
      const suggestions = [
        '감사합니다.',
        '안녕하세요!',
        '문의하신 내용에 대해 답변드립니다.'
      ];
      
      sendResponse({ 
        success: true, 
        isOffline: true,
        prediction: suggestions[Math.floor(Math.random() * suggestions.length)]
      });
      return;
    }
    
    // 여기에 실제 AI 서버 호출 로직 구현
    // 예시로 타임아웃 후 응답
    setTimeout(() => {
      sendResponse({ 
        success: true, 
        prediction: '이것은 AI가 예측한 텍스트입니다.' 
      });
    }, 500);
  } catch (error) {
    console.error('텍스트 예측 오류:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : '텍스트 예측 실패' 
    });
  }
}

/**
 * 템플릿 사용량 증가
 */
async function handleIncrementTemplateUsage(
  templateId: string | number, 
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log(`템플릿 사용량 증가 요청: ${templateId}`);
    
    // 오프라인 모드에서는 로컬에서만 처리
    if (offlineManager.isOffline()) {
      console.log('오프라인 모드: 템플릿 사용량 로컬 처리');
      sendResponse({ success: true, message: "오프라인 모드에서 기록됨" });
      return;
    }
    
    // 인증 상태 확인
    const token = await authService.getToken();
    if (!token) {
      console.error('템플릿 사용량 증가 실패: 인증 토큰 없음');
      sendResponse({ success: false, error: "인증 필요" });
      return;
    }
    
    // API 호출
    const response = await fetch(`${API_BASE_URL}/api/templates/${templateId}/increment-usage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`템플릿 사용량 증가 실패: ${response.status}, 상세: ${errorText}`);
      sendResponse({ success: false, error: `API 오류: ${response.status}` });
      return;
    }
    
    console.log('템플릿 사용량 증가 성공');
    sendResponse({ success: true });
  } catch (error) {
    console.error('템플릿 사용량 증가 중 오류:', error);
    sendResponse({ success: false, error: String(error) });
  }
}

// 오프라인 관리자 초기화
console.log('백그라운드 스크립트 초기화 중...');
offlineManager.addOfflineModeListener((isOffline) => {
  console.log(`오프라인 모드 상태 변경: ${isOffline ? '오프라인' : '온라인'}`);
}); 