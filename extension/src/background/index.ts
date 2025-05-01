/**
 * 배경 스크립트 - 확장 프로그램의 메인 로직을 처리합니다.
 * - API 통신 관리
 * - 상태 관리
 * - 메시지 핸들링
 */

import { clovaService } from './clova-service';

// API 엔드포인트 설정
const API_BASE_URL = 'http://localhost:8000/api';

// 오프라인 모드 상태 - 기본값으로 활성화
let isOfflineMode = true;

// 기본 템플릿 데이터 (오프라인 모드용)
const DEFAULT_TEMPLATES = [
  {
    id: 'default-1',
    title: '답변 - 머리말/꼬리말',
    content: '안녕하세요, 네이버 클라우드 플랫폼입니다.\n\n\n감사합니다.',
    keyword: '/답변',
    usage_count: 0,
    is_owned: true
  },
  {
    id: 'default-2',
    title: '감사인사',
    content: '문의해주셔서 감사합니다. 추가 질문이 있으시면 언제든지 문의해주세요.',
    keyword: '감사',
    usage_count: 0,
    is_owned: true
  },
  {
    id: 'default-3',
    title: '회의일정',
    content: '회의 일정을 [날짜] [시간]으로 잡았습니다. 회의 안건은 [안건]입니다.',
    keyword: '회의',
    usage_count: 0,
    is_owned: true
  }
];

// 오프라인 모드 확인
async function checkNetworkStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000) // 3초 타임아웃
    });
    isOfflineMode = !response.ok;
    console.log(`네트워크 상태 체크: ${isOfflineMode ? '오프라인' : '온라인'} 모드`);
    return !isOfflineMode;
  } catch (error) {
    console.warn('네트워크 연결 확인 실패, 오프라인 모드로 전환:', error);
    isOfflineMode = true;
    return false;
  }
}

// 주기적으로 네트워크 상태 체크 (60초마다)
setInterval(checkNetworkStatus, 60000);

// 초기 네트워크 상태 확인
checkNetworkStatus().then(isOnline => {
  console.log(`네트워크 상태: ${isOnline ? '온라인' : '오프라인'}`);
  
  // 오프라인 상태이면 로컬 템플릿 활성화
  if (!isOnline) {
    saveDefaultTemplates();
  }
});

// 기본 템플릿 저장
async function saveDefaultTemplates(): Promise<void> {
  try {
    // 기존 저장된 템플릿이 있는지 확인
    const result = await chrome.storage.local.get(['offlineTemplates']);
    
    // 이미 저장된 템플릿이 있으면 저장하지 않음
    if (result.offlineTemplates && result.offlineTemplates.length > 0) {
      console.log('이미 저장된 템플릿이 있습니다.');
      return;
    }
    
    await chrome.storage.local.set({ 
      offlineTemplates: DEFAULT_TEMPLATES,
      offlineTemplatesUpdatedAt: Date.now()
    });
    console.log('기본 템플릿이 저장되었습니다.', DEFAULT_TEMPLATES);
  } catch (error) {
    console.error('기본 템플릿 저장 실패:', error);
  }
}

// 로컬 저장소에서 템플릿 가져오기
async function getLocalTemplates(): Promise<any[]> {
  try {
    const result = await chrome.storage.local.get('offlineTemplates');
    
    if (result.offlineTemplates && result.offlineTemplates.length > 0) {
      console.log('로컬 저장소에서 템플릿을 가져왔습니다:', result.offlineTemplates.length);
      return result.offlineTemplates;
    } else {
      // 로컬 저장소에 템플릿이 없으면 기본 템플릿을 저장하고 반환
      console.log('로컬 저장소에 템플릿이 없습니다. 기본 템플릿을 저장합니다.');
      await saveDefaultTemplates();
      return DEFAULT_TEMPLATES;
    }
  } catch (error) {
    console.error('로컬 템플릿 가져오기 오류:', error);
    // 오류 발생 시 기본 템플릿 반환
    return DEFAULT_TEMPLATES;
  }
}

// 인증 토큰 가져오기
async function getAuthToken(): Promise<string | null> {
  // 오프라인 모드일 때는 인증 검사 무시
  if (isOfflineMode) {
    return "offline-mode-token";
  }
  
  try {
    const result = await chrome.storage.local.get('authToken');
    const token = result.authToken || null;
    
    if (!token) {
      console.warn('저장된 인증 토큰이 없습니다.');
    }
    
    return token;
  } catch (error) {
    console.error('인증 토큰 가져오기 오류:', error);
    return null;
  }
}

// API 요청을 위한 헤더 설정
async function getAuthHeaders(): Promise<HeadersInit> {
  // 오프라인 모드일 때는 가짜 인증 헤더 제공
  if (isOfflineMode) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer offline-mode-token'
    };
  }
  
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('인증 토큰 없이 API 요청 시도');
    }
    
    return headers;
  } catch (error) {
    console.error('인증 헤더 설정 오류:', error);
    return { 'Content-Type': 'application/json' };
  }
}

// API 호출 유틸리티 함수
async function fetchAPI(
  endpoint: string, 
  method: string = 'GET', 
  data: any = null
): Promise<any> {
  // 오프라인 모드 상태 확인
  if (isOfflineMode) {
    throw new Error('오프라인 모드입니다.');
  }
  
  try {
    const headers = await getAuthHeaders();
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log(`API 요청: ${method} ${url}`, 
      (headers as Record<string, string>)['Authorization'] ? '(인증됨)' : '(인증 없음)');
    
    const options: RequestInit = {
      method,
      headers,
      credentials: 'include'
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // 401 오류 처리
      if (response.status === 401) {
        console.error('인증 오류: 토큰이 유효하지 않거나 만료됨');
        throw new Error('Not authenticated');
      }
      
      let errorMessage = `API 오류: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // JSON 파싱 오류는 무시
      }
      
      console.error('API 응답 오류:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('API 요청 오류:', error);
    
    // 오프라인 모드로 전환
    if (error instanceof Error && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('Network Error') ||
         error.message.includes('Not authenticated'))) {
      console.log('네트워크 또는 인증 오류로 인해 오프라인 모드로 전환');
      isOfflineMode = true;
    }
    
    throw error;
  }
}

// CLOVA 텍스트 예측 API 호출
async function predictText(context: string): Promise<string> {
  try {
    if (isOfflineMode) {
      // 오프라인 모드일 때 간단한 예측 제공
      return generateOfflinePrediction(context);
    }
    
    const response = await fetchAPI('/predict/complete', 'POST', { context });
    return response.prediction || '';
  } catch (error) {
    console.error('텍스트 예측 오류:', error);
    // 오프라인 모드로 전환하고 오프라인 예측 제공
    isOfflineMode = true;
    return generateOfflinePrediction(context);
  }
}

// 오프라인 모드용 간단한 예측 생성
function generateOfflinePrediction(context: string): string {
  // 마지막 공백 위치 찾기
  const lastSpaceIndex = context.lastIndexOf(' ');
  
  if (lastSpaceIndex === -1 || context.length - lastSpaceIndex > 15) {
    // 공백이 없거나 마지막 단어가 너무 길면 빈 문자열 반환
    return '';
  }
  
  // 마지막 단어에 따라 간단한 예측 생성
  const lastWord = context.substring(lastSpaceIndex + 1).toLowerCase();
  
  // 자주 사용되는 패턴에 대한 간단한 예측
  if (lastWord === '안녕') return '하세요';
  if (lastWord === '감사') return '합니다';
  if (lastWord === '문의') return '해주셔서 감사합니다';
  if (lastWord === '회의') return '일정을 공유드립니다';
  if (lastWord === '내일') return '까지 완료하겠습니다';
  
  // 기본 예측
  return '';
}

// 템플릿 검색 API 호출
async function searchTemplates(keyword: string): Promise<any[]> {
  try {
    if (isOfflineMode) {
      return searchLocalTemplates(keyword);
    }
    
    const response = await fetchAPI(`/templates/search?keyword=${encodeURIComponent(keyword)}`);
    
    // 검색 결과를 로컬에 캐싱
    if (response.templates && response.templates.length > 0) {
      await cacheSearchResults(response.templates);
    }
    
    return response.templates || [];
  } catch (error) {
    console.error('템플릿 검색 오류:', error);
    // 오프라인 모드로 전환하고 로컬 검색 실행
    isOfflineMode = true;
    return searchLocalTemplates(keyword);
  }
}

// 로컬 템플릿 검색
async function searchLocalTemplates(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  const templates = await getLocalTemplates();
  keyword = keyword.toLowerCase();
  
  return templates.filter(template => {
    const title = template.title.toLowerCase();
    const content = template.content.toLowerCase();
    const templateKeyword = template.keyword?.toLowerCase() || '';
    
    return title.includes(keyword) || 
           content.includes(keyword) || 
           templateKeyword.includes(keyword);
  });
}

// 검색 결과 캐싱
async function cacheSearchResults(templates: any[]): Promise<void> {
  try {
    // 현재 캐시된 템플릿 가져오기
    const currentTemplates = await getLocalTemplates();
    
    // 중복 제거하면서 병합
    const templateIds = new Set(currentTemplates.map(t => t.id));
    const newTemplates = templates.filter(t => !templateIds.has(t.id));
    
    if (newTemplates.length > 0) {
      const mergedTemplates = [...currentTemplates, ...newTemplates];
      await chrome.storage.local.set({ 
        offlineTemplates: mergedTemplates,
        offlineTemplatesUpdatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error('템플릿 캐싱 오류:', error);
  }
}

// 전체 템플릿 목록 가져오기
async function getAllTemplates(): Promise<any[]> {
  console.log('템플릿 목록 요청 - 오프라인 모드:', isOfflineMode);
  
  try {
    // 오프라인 모드면 바로 로컬 템플릿 반환
    if (isOfflineMode) {
      const templates = await getLocalTemplates();
      console.log('오프라인 모드: 로컬 템플릿 반환', templates.length);
      return templates;
    }
    
    // 온라인 모드에서는 서버 요청 시도
    try {
      const response = await fetchAPI('/templates');
      
      // 전체 템플릿을 로컬에 캐싱
      if (response.templates && response.templates.length > 0) {
        console.log('서버에서 가져온 템플릿 캐싱:', response.templates.length);
        await chrome.storage.local.set({ 
          offlineTemplates: response.templates,
          offlineTemplatesUpdatedAt: Date.now()
        });
        return response.templates;
      } else {
        console.log('서버에서 템플릿을 찾을 수 없음, 로컬 템플릿 반환');
        return getLocalTemplates();
      }
    } catch (error) {
      console.error('서버 템플릿 요청 실패, 오프라인 모드로 전환:', error);
      // 오프라인 모드로 전환하고 로컬 템플릿 반환
      isOfflineMode = true;
      return getLocalTemplates();
    }
  } catch (error) {
    console.error('템플릿 목록 가져오기 오류:', error);
    // 최후의 방어선: 기본 템플릿 반환
    return DEFAULT_TEMPLATES;
  }
}

// 템플릿 사용 횟수 증가
async function incrementTemplateUsage(templateId: string): Promise<boolean> {
  try {
    if (isOfflineMode) {
      return incrementLocalTemplateUsage(templateId);
    }
    
    await fetchAPI(`/templates/${templateId}/increment-usage`, 'POST');
    
    // 로컬 카운터도 업데이트
    await incrementLocalTemplateUsage(templateId);
    
    return true;
  } catch (error) {
    console.error('템플릿 사용 횟수 증가 오류:', error);
    // 오프라인 모드로 전환하고 로컬 카운터만 업데이트
    isOfflineMode = true;
    return incrementLocalTemplateUsage(templateId);
  }
}

// 로컬 템플릿 사용 횟수 증가
async function incrementLocalTemplateUsage(templateId: string): Promise<boolean> {
  try {
    const templates = await getLocalTemplates();
    const templateIndex = templates.findIndex(t => t.id === templateId);
    
    if (templateIndex !== -1) {
      templates[templateIndex].usage_count = (templates[templateIndex].usage_count || 0) + 1;
      await chrome.storage.local.set({ 
        offlineTemplates: templates,
        offlineTemplatesUpdatedAt: Date.now()
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('로컬 템플릿 사용 횟수 업데이트 오류:', error);
    return false;
  }
}

// 메시지 인터페이스 정의
interface MessagePayload {
  type: MessageType;
  [key: string]: any;
}

interface PredictTextPayload extends MessagePayload {
  type: 'PREDICT_TEXT';
  context: string;
  keyword?: string;
  maxTokens?: number;
  domain?: string;
}

interface SearchTemplatesPayload extends MessagePayload {
  type: 'SEARCH_TEMPLATES';
  keyword: string;
  limit?: number;
}

interface SelectTemplatePayload extends MessagePayload {
  type: 'SELECT_TEMPLATE';
  templateId: string;
}

interface SetSettingsPayload extends MessagePayload {
  type: 'SET_SETTINGS';
  apiKey?: string;
  userToken?: string;
  apiBaseUrl?: string;
}

// 메시지 유형
type MessageType = 
  | 'PREDICT_TEXT'
  | 'SEARCH_TEMPLATES'
  | 'SELECT_TEMPLATE'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'CHECK_NETWORK_STATUS'
  | 'GET_ALL_TEMPLATES'
  | 'INCREMENT_TEMPLATE_USAGE'
  | 'LOGIN'
  | 'LOGOUT';

// 크롬 메시지 리스너 설정 - 통합된 단일 리스너
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  console.log('메시지 수신:', message.type);
  
  // 메시지 타입 확인
  if (!message || !message.type) {
    sendResponse({ error: '올바르지 않은 메시지 형식' });
    return false;
  }

  // 메시지 타입별 처리
  try {
    switch (message.type) {
      case 'PREDICT_TEXT':
        predictText(message.context)
          .then(prediction => sendResponse({ prediction }))
          .catch(error => sendResponse({ error: error.message }));
        break;
        
      case 'SEARCH_TEMPLATES':
        searchTemplates(message.keyword)
          .then(templates => sendResponse({ templates }))
          .catch(error => sendResponse({ error: error.message }));
        break;
        
      case 'GET_ALL_TEMPLATES':
        getAllTemplates()
          .then(templates => {
            console.log('템플릿 목록 반환:', templates.length);
            sendResponse({ templates });
          })
          .catch(error => sendResponse({ error: error.message }));
        break;
        
      case 'INCREMENT_TEMPLATE_USAGE':
        incrementTemplateUsage(message.templateId)
          .then(success => sendResponse({ success }))
          .catch(error => sendResponse({ error: error.message }));
        break;
        
      case 'LOGIN':
        console.log('로그인 토큰 저장 요청 수신:', message.token ? '토큰 있음' : '토큰 없음');
        chrome.storage.local.set({ authToken: message.token }, () => {
          console.log('토큰 저장 완료, 성공 응답 전송');
          sendResponse({ success: true });
        });
        break;
        
      case 'LOGOUT':
        console.log('로그아웃 요청 수신');
        chrome.storage.local.remove('authToken', () => {
          console.log('로그아웃 성공, 토큰 제거됨');
          sendResponse({ success: true });
        });
        break;
        
      case 'CHECK_NETWORK_STATUS':
        checkNetworkStatus()
          .then(isOnline => sendResponse({ online: isOnline }))
          .catch(error => sendResponse({ online: false, error: error.message }));
        break;
        
      case 'GET_SETTINGS':
        handleGetSettings(sendResponse);
        break;
        
      case 'SET_SETTINGS':
        handleSetSettings(message, sendResponse);
        break;
        
      case 'SELECT_TEMPLATE':
        handleSelectTemplate(message, sendResponse);
        break;
        
      default:
        sendResponse({ error: '알 수 없는 메시지 타입: ' + message.type });
        return false;
    }
  } catch (error) {
    console.error('메시지 처리 중 오류 발생:', error);
    sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
  }
  
  // 비동기 응답을 위해 true 반환
  return true;
});

// 초기화 함수
function initialize() {
  console.log('AI 문장 자동완성 어시스턴트가 시작되었습니다.');
  
  // 기본 템플릿 즉시 저장 (오프라인 모드 지원)
  saveDefaultTemplates().then(() => {
    console.log('오프라인 모드용 기본 템플릿 준비 완료');
  });
  
  // 확장 프로그램 설치/업데이트 이벤트 처리
  chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    if (details.reason === 'install') {
      // 첫 설치시 설정 페이지 열기
      chrome.tabs.create({ url: 'options.html' });
      
      // 기본 템플릿 저장
      saveDefaultTemplates();
    }
  });
  
  // 초기 네트워크 상태 확인
  checkNetworkStatus().then(isOnline => {
    console.log(`네트워크 상태: ${isOnline ? '온라인' : '오프라인'}`);
    
    // localStorage에 오프라인 모드 상태 저장
    chrome.storage.local.set({ isOfflineMode: !isOnline });
  });
}

// Chrome 타입 선언 업데이트
declare namespace chrome {
  namespace runtime {
    interface InstalledDetails {
      reason: string;
    }
    const onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ) => void;
    };
    const onInstalled: {
      addListener: (callback: (details: InstalledDetails) => void) => void;
    };
    function sendMessage(
      message: any,
      callback?: (response: any) => void
    ): void;
    
    // lastError 속성 추가
    const lastError: Error | undefined;
  }
  namespace storage {
    interface StorageArea {
      get(
        keys: string | string[] | Object | null,
        callback?: (items: { [key: string]: any }) => void
      ): Promise<{ [key: string]: any }>;
      set(
        items: Object,
        callback?: () => void
      ): Promise<void>;
      remove(
        keys: string | string[],
        callback?: () => void
      ): Promise<void>;
    }
    const local: StorageArea;
  }
  namespace tabs {
    function create(
      properties: { url: string },
      callback?: (tab: any) => void
    ): void;
  }
}

// 초기화 함수 호출 추가
initialize();

/**
 * 설정 정보 요청 처리
 * @param sendResponse 응답 콜백 함수
 */
async function handleGetSettings(
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    // 저장된 설정 정보 가져오기
    const settings = await chrome.storage.local.get([
      'apiKey',
      'userToken',
      'apiBaseUrl',
      'isOfflineMode'
    ]);
    
    // 현재 오프라인 모드 상태 추가
    settings.isOfflineMode = isOfflineMode;
    
    sendResponse({ settings });
  } catch (error) {
    console.error('설정 정보 가져오기 오류:', error);
    sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
  }
}

/**
 * 설정 정보 업데이트 처리
 * @param message 메시지 객체
 * @param sendResponse 응답 콜백 함수
 */
async function handleSetSettings(
  message: SetSettingsPayload,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const { apiKey, userToken, apiBaseUrl } = message;
    const updates: Record<string, any> = {};
    
    // 업데이트할 설정 확인
    if (apiKey !== undefined) {
      updates.apiKey = apiKey;
      clovaService.setApiKey(apiKey);
    }
    
    if (userToken !== undefined) {
      updates.userToken = userToken;
      clovaService.setUserToken(userToken);
    }
    
    if (apiBaseUrl !== undefined) {
      updates.apiBaseUrl = apiBaseUrl;
      clovaService.setBaseUrl(apiBaseUrl);
    }
    
    // 설정 저장
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
    
    // 설정 변경 후 네트워크 상태 재확인
    const isOnline = await checkNetworkStatus();
    
    sendResponse({ success: true, online: isOnline });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
  }
}

/**
 * 템플릿 선택 요청 처리
 * @param message 메시지 객체
 * @param sendResponse 응답 콜백 함수
 */
async function handleSelectTemplate(
  message: SelectTemplatePayload,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const { templateId } = message;
    
    if (!templateId) {
      sendResponse({ error: '템플릿 ID가 필요합니다' });
      return;
    }
    
    // 템플릿 사용 횟수 증가
    await incrementTemplateUsage(templateId);
    
    // 오프라인 모드 체크
    if (isOfflineMode) {
      const templates = await getLocalTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        sendResponse({ 
          prediction: template.content,
          templateId: template.id,
          isTemplate: true,
          replaceKeyword: template.keyword || '' // 키워드를 응답에 포함
        });
      } else {
        sendResponse({ error: '템플릿을 찾을 수 없습니다' });
      }
      return;
    }
    
    try {
      // CLOVA API 서비스를 통한 템플릿 선택 요청
      const result = await clovaService.selectTemplate(templateId);
      
      // 템플릿 키워드 정보 가져오기
      const templates = await getLocalTemplates();
      const template = templates.find(t => t.id === templateId);
      const keyword = template?.keyword || '';
      
      sendResponse({ 
        prediction: result.generated_text,
        templateId: result.template_id,
        isTemplate: true,
        replaceKeyword: keyword // 키워드를 응답에 포함
      });
    } catch (error) {
      // API 오류 시 오프라인 모드로 전환
      isOfflineMode = true;
      
      // 로컬에서 템플릿 검색
      const templates = await getLocalTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (template) {
        sendResponse({ 
          prediction: template.content,
          templateId: template.id,
          isTemplate: true,
          replaceKeyword: template.keyword || '' // 키워드를 응답에 포함
        });
      } else {
        sendResponse({ error: '템플릿을 찾을 수 없습니다' });
      }
    }
  } catch (error) {
    console.error('템플릿 선택 처리 중 오류:', error);
    sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
  }
} 