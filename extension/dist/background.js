/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background/clova-service.ts":
/*!*****************************************!*\
  !*** ./src/background/clova-service.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ClovaService: () => (/* binding */ ClovaService),
/* harmony export */   clovaService: () => (/* binding */ clovaService)
/* harmony export */ });
/**
 * CLOVA API 서비스 - 백그라운드 스크립트에서 백엔드 API를 호출하는 기능 담당
 */
/**
 * CLOVA API 서비스 클래스
 * 백그라운드 스크립트에서 백엔드 API를 직접 호출
 */
class ClovaService {
    /**
     * CLOVA 서비스 생성자
     * @param baseUrl API 기본 URL (기본값: 백엔드 API URL)
     */
    constructor(baseUrl = 'https://api.assistant.example.com') {
        this.apiKey = null;
        this.userToken = null;
        this.baseUrl = baseUrl;
        // 저장된 설정 로드
        this.loadSettings();
    }
    /**
     * 저장된 설정 로드
     */
    loadSettings() {
        chrome.storage.local.get(['apiKey', 'userToken', 'apiBaseUrl'], (result) => {
            if (result.apiKey) {
                this.apiKey = result.apiKey;
            }
            if (result.userToken) {
                this.userToken = result.userToken;
            }
            if (result.apiBaseUrl) {
                this.baseUrl = result.apiBaseUrl;
            }
        });
    }
    /**
     * API 키 설정
     * @param apiKey CLOVA API 키
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        chrome.storage.local.set({ apiKey });
    }
    /**
     * 사용자 토큰 설정
     * @param token 사용자 인증 토큰
     */
    setUserToken(token) {
        this.userToken = token;
        chrome.storage.local.set({ userToken: token });
    }
    /**
     * API 기본 URL 설정
     * @param url API 기본 URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
        chrome.storage.local.set({ apiBaseUrl: url });
    }
    /**
     * API 요청 헤더 생성
     * @returns 요청 헤더 객체
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        // API 키가 있으면 추가
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        // 사용자 토큰이 있으면 추가
        if (this.userToken) {
            headers['Authorization'] = `Bearer ${this.userToken}`;
        }
        return headers;
    }
    /**
     * API 요청 보내기
     * @param endpoint API 엔드포인트
     * @param method HTTP 메서드
     * @param data 요청 데이터
     * @returns API 응답 Promise
     */
    async fetchApi(endpoint, method = 'GET', data) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const options = {
                method,
                headers: this.getHeaders(),
                credentials: 'include'
            };
            // POST, PUT 요청에 데이터 추가
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(url, options);
            // 응답이 JSON이 아닌 경우 처리
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('응답이 JSON 형식이 아닙니다');
            }
            const apiResponse = await response.json();
            // 에러 응답 처리
            if (!response.ok || apiResponse.status.code !== '20000') {
                throw new Error(apiResponse.status.message || '알 수 없는 오류');
            }
            return apiResponse.result;
        }
        catch (error) {
            console.error('API 요청 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 텍스트 예측 API 호출
     * @param params 예측 요청 파라미터
     * @returns 예측 결과 Promise
     */
    async predictText(params) {
        try {
            return await this.fetchApi('/predict', 'POST', params);
        }
        catch (error) {
            console.error('텍스트 예측 요청 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 템플릿 매칭 API 호출
     * @param params 템플릿 매칭 요청 파라미터
     * @returns 템플릿 매칭 결과 Promise
     */
    async matchTemplates(params) {
        try {
            return await this.fetchApi('/match-templates', 'POST', params);
        }
        catch (error) {
            console.error('템플릿 매칭 요청 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 템플릿 선택 API 호출
     * @param templateId 선택한 템플릿 ID
     * @returns 선택 결과 Promise
     */
    async selectTemplate(templateId) {
        try {
            return await this.fetchApi(`/select-template/${templateId}`, 'POST');
        }
        catch (error) {
            console.error('템플릿 선택 요청 중 오류 발생:', error);
            throw error;
        }
    }
}
// 서비스 인스턴스 생성 및 내보내기
const clovaService = new ClovaService();


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _clova_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./clova-service */ "./src/background/clova-service.ts");
/**
 * 배경 스크립트 - 확장 프로그램의 메인 로직을 처리합니다.
 * - API 통신 관리
 * - 상태 관리
 * - 메시지 핸들링
 */

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
async function checkNetworkStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000) // 3초 타임아웃
        });
        isOfflineMode = !response.ok;
        console.log(`네트워크 상태 체크: ${isOfflineMode ? '오프라인' : '온라인'} 모드`);
        return !isOfflineMode;
    }
    catch (error) {
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
async function saveDefaultTemplates() {
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
    }
    catch (error) {
        console.error('기본 템플릿 저장 실패:', error);
    }
}
// 로컬 저장소에서 템플릿 가져오기
async function getLocalTemplates() {
    try {
        const result = await chrome.storage.local.get('offlineTemplates');
        if (result.offlineTemplates && result.offlineTemplates.length > 0) {
            console.log('로컬 저장소에서 템플릿을 가져왔습니다:', result.offlineTemplates.length);
            return result.offlineTemplates;
        }
        else {
            // 로컬 저장소에 템플릿이 없으면 기본 템플릿을 저장하고 반환
            console.log('로컬 저장소에 템플릿이 없습니다. 기본 템플릿을 저장합니다.');
            await saveDefaultTemplates();
            return DEFAULT_TEMPLATES;
        }
    }
    catch (error) {
        console.error('로컬 템플릿 가져오기 오류:', error);
        // 오류 발생 시 기본 템플릿 반환
        return DEFAULT_TEMPLATES;
    }
}
// 인증 토큰 가져오기
async function getAuthToken() {
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
    }
    catch (error) {
        console.error('인증 토큰 가져오기 오류:', error);
        return null;
    }
}
// API 요청을 위한 헤더 설정
async function getAuthHeaders() {
    // 오프라인 모드일 때는 가짜 인증 헤더 제공
    if (isOfflineMode) {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer offline-mode-token'
        };
    }
    try {
        const token = await getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        else {
            console.warn('인증 토큰 없이 API 요청 시도');
        }
        return headers;
    }
    catch (error) {
        console.error('인증 헤더 설정 오류:', error);
        return { 'Content-Type': 'application/json' };
    }
}
// API 호출 유틸리티 함수
async function fetchAPI(endpoint, method = 'GET', data = null) {
    // 오프라인 모드 상태 확인
    if (isOfflineMode) {
        throw new Error('오프라인 모드입니다.');
    }
    try {
        const headers = await getAuthHeaders();
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`API 요청: ${method} ${url}`, headers['Authorization'] ? '(인증됨)' : '(인증 없음)');
        const options = {
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
            }
            catch (e) {
                // JSON 파싱 오류는 무시
            }
            console.error('API 응답 오류:', errorMessage);
            throw new Error(errorMessage);
        }
        const responseData = await response.json();
        return responseData;
    }
    catch (error) {
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
async function predictText(context) {
    try {
        if (isOfflineMode) {
            // 오프라인 모드일 때 간단한 예측 제공
            return generateOfflinePrediction(context);
        }
        const response = await fetchAPI('/predict/complete', 'POST', { context });
        return response.prediction || '';
    }
    catch (error) {
        console.error('텍스트 예측 오류:', error);
        // 오프라인 모드로 전환하고 오프라인 예측 제공
        isOfflineMode = true;
        return generateOfflinePrediction(context);
    }
}
// 오프라인 모드용 간단한 예측 생성
function generateOfflinePrediction(context) {
    // 마지막 공백 위치 찾기
    const lastSpaceIndex = context.lastIndexOf(' ');
    if (lastSpaceIndex === -1 || context.length - lastSpaceIndex > 15) {
        // 공백이 없거나 마지막 단어가 너무 길면 빈 문자열 반환
        return '';
    }
    // 마지막 단어에 따라 간단한 예측 생성
    const lastWord = context.substring(lastSpaceIndex + 1).toLowerCase();
    // 자주 사용되는 패턴에 대한 간단한 예측
    if (lastWord === '안녕')
        return '하세요';
    if (lastWord === '감사')
        return '합니다';
    if (lastWord === '문의')
        return '해주셔서 감사합니다';
    if (lastWord === '회의')
        return '일정을 공유드립니다';
    if (lastWord === '내일')
        return '까지 완료하겠습니다';
    // 기본 예측
    return '';
}
// 템플릿 검색 API 호출
async function searchTemplates(keyword) {
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
    }
    catch (error) {
        console.error('템플릿 검색 오류:', error);
        // 오프라인 모드로 전환하고 로컬 검색 실행
        isOfflineMode = true;
        return searchLocalTemplates(keyword);
    }
}
// 로컬 템플릿 검색
async function searchLocalTemplates(keyword) {
    if (!keyword)
        return [];
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
async function cacheSearchResults(templates) {
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
    }
    catch (error) {
        console.error('템플릿 캐싱 오류:', error);
    }
}
// 전체 템플릿 목록 가져오기
async function getAllTemplates() {
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
            }
            else {
                console.log('서버에서 템플릿을 찾을 수 없음, 로컬 템플릿 반환');
                return getLocalTemplates();
            }
        }
        catch (error) {
            console.error('서버 템플릿 요청 실패, 오프라인 모드로 전환:', error);
            // 오프라인 모드로 전환하고 로컬 템플릿 반환
            isOfflineMode = true;
            return getLocalTemplates();
        }
    }
    catch (error) {
        console.error('템플릿 목록 가져오기 오류:', error);
        // 최후의 방어선: 기본 템플릿 반환
        return DEFAULT_TEMPLATES;
    }
}
// 템플릿 사용 횟수 증가
async function incrementTemplateUsage(templateId) {
    try {
        if (isOfflineMode) {
            return incrementLocalTemplateUsage(templateId);
        }
        await fetchAPI(`/templates/${templateId}/increment-usage`, 'POST');
        // 로컬 카운터도 업데이트
        await incrementLocalTemplateUsage(templateId);
        return true;
    }
    catch (error) {
        console.error('템플릿 사용 횟수 증가 오류:', error);
        // 오프라인 모드로 전환하고 로컬 카운터만 업데이트
        isOfflineMode = true;
        return incrementLocalTemplateUsage(templateId);
    }
}
// 로컬 템플릿 사용 횟수 증가
async function incrementLocalTemplateUsage(templateId) {
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
    }
    catch (error) {
        console.error('로컬 템플릿 사용 횟수 업데이트 오류:', error);
        return false;
    }
}
// 크롬 메시지 리스너 설정 - 통합된 단일 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    }
    catch (error) {
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
    chrome.runtime.onInstalled.addListener((details) => {
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
// 초기화 함수 호출 추가
initialize();
/**
 * 설정 정보 요청 처리
 * @param sendResponse 응답 콜백 함수
 */
async function handleGetSettings(sendResponse) {
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
    }
    catch (error) {
        console.error('설정 정보 가져오기 오류:', error);
        sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
    }
}
/**
 * 설정 정보 업데이트 처리
 * @param message 메시지 객체
 * @param sendResponse 응답 콜백 함수
 */
async function handleSetSettings(message, sendResponse) {
    try {
        const { apiKey, userToken, apiBaseUrl } = message;
        const updates = {};
        // 업데이트할 설정 확인
        if (apiKey !== undefined) {
            updates.apiKey = apiKey;
            _clova_service__WEBPACK_IMPORTED_MODULE_0__.clovaService.setApiKey(apiKey);
        }
        if (userToken !== undefined) {
            updates.userToken = userToken;
            _clova_service__WEBPACK_IMPORTED_MODULE_0__.clovaService.setUserToken(userToken);
        }
        if (apiBaseUrl !== undefined) {
            updates.apiBaseUrl = apiBaseUrl;
            _clova_service__WEBPACK_IMPORTED_MODULE_0__.clovaService.setBaseUrl(apiBaseUrl);
        }
        // 설정 저장
        if (Object.keys(updates).length > 0) {
            await chrome.storage.local.set(updates);
        }
        // 설정 변경 후 네트워크 상태 재확인
        const isOnline = await checkNetworkStatus();
        sendResponse({ success: true, online: isOnline });
    }
    catch (error) {
        console.error('설정 업데이트 오류:', error);
        sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
    }
}
/**
 * 템플릿 선택 요청 처리
 * @param message 메시지 객체
 * @param sendResponse 응답 콜백 함수
 */
async function handleSelectTemplate(message, sendResponse) {
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
            }
            else {
                sendResponse({ error: '템플릿을 찾을 수 없습니다' });
            }
            return;
        }
        try {
            // CLOVA API 서비스를 통한 템플릿 선택 요청
            const result = await _clova_service__WEBPACK_IMPORTED_MODULE_0__.clovaService.selectTemplate(templateId);
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
        }
        catch (error) {
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
            }
            else {
                sendResponse({ error: '템플릿을 찾을 수 없습니다' });
            }
        }
    }
    catch (error) {
        console.error('템플릿 선택 처리 중 오류:', error);
        sendResponse({ error: error instanceof Error ? error.message : '알 수 없는 오류' });
    }
}

})();

/******/ })()
;
//# sourceMappingURL=background.js.map