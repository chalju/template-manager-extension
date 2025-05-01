/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/content/adapters/adapter-registry.ts":
/*!**************************************************!*\
  !*** ./src/content/adapters/adapter-registry.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AdapterRegistry: () => (/* binding */ AdapterRegistry)
/* harmony export */ });
/* harmony import */ var _input_adapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./input-adapter */ "./src/content/adapters/input-adapter.ts");
/* harmony import */ var _crm_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./crm-adapter */ "./src/content/adapters/crm-adapter.ts");
/**
 * 어댑터 레지스트리 - 현재 웹 페이지에 적합한 어댑터 선택 및 관리
 */


/**
 * 사용 가능한 모든 어댑터를 등록하고 현재 웹사이트에 적합한 어댑터를 선택하는 레지스트리
 */
class AdapterRegistry {
    constructor() {
        this.adapters = [];
        this.currentAdapter = null;
        // 모든 어댑터 등록
        // 순서가 중요: 더 특화된 어댑터가 먼저 검사되어야 합니다.
        this.adapters = [
            new _crm_adapter__WEBPACK_IMPORTED_MODULE_1__.SalesForceLikeAdapter(),
            new _crm_adapter__WEBPACK_IMPORTED_MODULE_1__.ZendeskLikeAdapter(),
            new _input_adapter__WEBPACK_IMPORTED_MODULE_0__.DefaultInputAdapter() // 항상 마지막에 기본 어댑터
        ];
    }
    /**
     * 현재 웹 페이지에 가장 적합한 어댑터를 선택하고 초기화
     */
    initialize() {
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
            this.currentAdapter = new _input_adapter__WEBPACK_IMPORTED_MODULE_0__.DefaultInputAdapter();
            console.log('AI 문장 자동완성: 기본 어댑터가 선택되었습니다.');
        }
    }
    /**
     * 현재 활성화된 어댑터 반환
     */
    getAdapter() {
        if (!this.currentAdapter) {
            this.initialize();
        }
        return this.currentAdapter;
    }
    /**
     * 페이지 내의 모든 텍스트 입력 필드 가져오기
     */
    getTextFields() {
        return this.getAdapter().getTextFields();
    }
    /**
     * 특정 요소에서 텍스트 가져오기
     */
    getText(element) {
        return this.getAdapter().getText(element);
    }
    /**
     * 특정 요소에 텍스트 삽입
     */
    insertText(element, text) {
        this.getAdapter().insertText(element, text);
    }
    /**
     * 커서 위치 가져오기
     */
    getCursorPosition(element) {
        return this.getAdapter().getCursorPosition(element);
    }
}


/***/ }),

/***/ "./src/content/adapters/crm-adapter.ts":
/*!*********************************************!*\
  !*** ./src/content/adapters/crm-adapter.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SalesForceLikeAdapter: () => (/* binding */ SalesForceLikeAdapter),
/* harmony export */   ZendeskLikeAdapter: () => (/* binding */ ZendeskLikeAdapter)
/* harmony export */ });
/**
 * CRM 시스템 어댑터 구현
 */
/**
 * SalesForce와 유사한 CRM을 위한 어댑터
 */
class SalesForceLikeAdapter {
    isApplicable() {
        // URL 또는 DOM 요소를 검사하여 SalesForce CRM인지 확인
        return window.location.href.includes('salesforce.com') ||
            document.querySelector('.slds-global-header') !== null;
    }
    getTextFields() {
        // SalesForce 특화 텍스트 필드 선택자
        const selectors = [
            '.slds-input',
            '.slds-textarea',
            '.cke_editable', // SalesForce 리치 텍스트 에디터
            '[data-aura-class="uiInput"]',
            '[data-aura-class="uiInputTextArea"]'
        ].join(', ');
        const elements = Array.from(document.querySelectorAll(selectors));
        // 제외할 입력 필드
        const excludeSelectors = [
            'input[type="password"]',
            'input[type="email"]',
            'input[type="search"]',
            '[data-field-type="password"]'
        ].join(', ');
        return elements.filter(element => !element.matches(excludeSelectors));
    }
    getText(element) {
        // SalesForce 특화 텍스트 추출 로직
        if (element.classList.contains('cke_editable')) {
            // 리치 텍스트 에디터 처리
            return element.textContent || '';
        }
        // 기본 추출 로직은 DefaultAdapter와 동일
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return element.value;
        }
        else if (element.isContentEditable) {
            return element.textContent || '';
        }
        return '';
    }
    insertText(element, text) {
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
        }
        else if (element.isContentEditable) {
            document.execCommand('insertText', false, text);
            this.triggerLightningChangeEvent(element);
        }
    }
    getCursorPosition(element) {
        // 기본 로직은 DefaultAdapter와 동일
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return {
                top: rect.top + rect.height + scrollTop,
                left: rect.left + scrollLeft
            };
        }
        else if (element.isContentEditable) {
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
    triggerLightningChangeEvent(element) {
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
class ZendeskLikeAdapter {
    isApplicable() {
        // URL 또는 DOM 요소를 검사하여 Zendesk CRM인지 확인
        return window.location.href.includes('zendesk.com') ||
            document.querySelector('.zendesk-header') !== null ||
            document.querySelector('[data-garden-id]') !== null;
    }
    getTextFields() {
        // Zendesk 특화 텍스트 필드 선택자
        const selectors = [
            '.zendesk-editor',
            '.ember-text-area',
            '.zendesk-ticket-field',
            '[data-garden-id="forms.text_input"]',
            '[data-garden-id="forms.textarea"]'
        ].join(', ');
        const elements = Array.from(document.querySelectorAll(selectors));
        // 기본 입력 필드도 포함
        const defaultSelectors = [
            'input[type="text"]',
            'textarea',
            '[contenteditable="true"]'
        ].join(', ');
        const defaultElements = Array.from(document.querySelectorAll(defaultSelectors));
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
    getText(element) {
        // Zendesk 특화 텍스트 추출 로직
        if (element.classList.contains('zendesk-editor')) {
            // 특별한 처리가 필요한 경우
            return element.textContent || '';
        }
        // 기본 추출 로직
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return element.value;
        }
        else if (element.isContentEditable) {
            return element.textContent || '';
        }
        return '';
    }
    insertText(element, text) {
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
        }
        else if (element.isContentEditable) {
            document.execCommand('insertText', false, text);
            this.triggerZendeskChangeEvent(element);
        }
    }
    getCursorPosition(element) {
        // 기본 로직과 동일
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return {
                top: rect.top + rect.height + scrollTop,
                left: rect.left + scrollLeft
            };
        }
        else if (element.isContentEditable) {
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
    triggerZendeskChangeEvent(element) {
        // 기본 이벤트
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        // Zendesk Ember 관련 이벤트
        element.dispatchEvent(new CustomEvent('ember-changed', { bubbles: true }));
    }
}


/***/ }),

/***/ "./src/content/adapters/input-adapter.ts":
/*!***********************************************!*\
  !*** ./src/content/adapters/input-adapter.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DefaultInputAdapter: () => (/* binding */ DefaultInputAdapter)
/* harmony export */ });
/**
 * 입력 필드 어댑터 모듈 - 다양한 CRM 시스템에 대한 인터페이스 표준화
 */
/**
 * 기본 어댑터 - 일반적인 웹 페이지에서 작동
 */
class DefaultInputAdapter {
    isApplicable() {
        // 기본 어댑터는 항상 사용 가능
        return true;
    }
    getTextFields() {
        const selectors = [
            'input[type="text"]',
            'input:not([type])',
            'textarea',
            '[contenteditable="true"]',
            '[role="textbox"]'
        ].join(', ');
        const elements = Array.from(document.querySelectorAll(selectors));
        // 제외할 입력 필드
        const excludeSelectors = [
            'input[type="password"]',
            'input[type="email"]',
            'input[type="number"]',
            'input[type="tel"]',
            'input[type="date"]',
            'input[type="time"]',
            'input[type="url"]',
            'input[type="color"]'
        ].join(', ');
        return elements.filter(element => !element.matches(excludeSelectors));
    }
    getText(element) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return element.value;
        }
        else if (element.isContentEditable) {
            return element.textContent || '';
        }
        return '';
    }
    insertText(element, text) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            const start = element.selectionStart || 0;
            const end = element.selectionEnd || 0;
            const beforeText = element.value.substring(0, start);
            const afterText = element.value.substring(end);
            element.value = beforeText + text + afterText;
            element.selectionStart = element.selectionEnd = start + text.length;
            element.focus();
            // 변경 이벤트 발생시키기
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        else if (element.isContentEditable) {
            // contentEditable 요소 처리
            document.execCommand('insertText', false, text);
        }
    }
    getCursorPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            // 입력 필드의 경우 높이에 따라 조정
            return {
                top: rect.top + rect.height + scrollTop,
                left: rect.left + scrollLeft
            };
        }
        else if (element.isContentEditable) {
            // 커서 위치를 좀 더 정확하게 계산
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
}


/***/ }),

/***/ "./src/content/ai-completion-handler.ts":
/*!**********************************************!*\
  !*** ./src/content/ai-completion-handler.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AICompletionHandler: () => (/* binding */ AICompletionHandler)
/* harmony export */ });
/* harmony import */ var _utils_clova_api_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/clova-api-client */ "./src/utils/clova-api-client.ts");
/* harmony import */ var _context_extractor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./context-extractor */ "./src/content/context-extractor.ts");
/* harmony import */ var _utils_keyword_detector__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/keyword-detector */ "./src/utils/keyword-detector.ts");
/* harmony import */ var _utils_template_matcher__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/template-matcher */ "./src/utils/template-matcher.ts");
/* harmony import */ var _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/prompt-builder */ "./src/utils/prompt-builder.ts");
/**
 * AI 자동완성 핸들러 - 텍스트 입력 필드에 AI 자동완성 기능 제공
 */





/**
 * AI 자동완성 핸들러 클래스
 */
class AICompletionHandler {
    /**
     * AI 자동완성 핸들러 생성자
     * @param suggestUIManager 제안 UI 관리자
     * @param options 핸들러 옵션
     */
    constructor(suggestUIManager, options) {
        // 상태 초기화
        this.state = {
            isActive: true,
            isLoading: false,
            currentElement: null,
            currentRequest: null,
            lastCompletion: null
        };
        // 옵션 설정
        this.completionThrottleMs = options?.completionThrottleMs || 500; // 기본 0.5초 지연
        this.suggestUIManager = suggestUIManager;
        // 키워드 감지 및 템플릿 매칭 초기화
        this.keywordDetector = new _utils_keyword_detector__WEBPACK_IMPORTED_MODULE_2__.KeywordDetector();
        this.templateMatcher = new _utils_template_matcher__WEBPACK_IMPORTED_MODULE_3__.TemplateMatcher();
        // 이벤트 리스너 등록
        this.initEventListeners();
    }
    /**
     * 이벤트 리스너 초기화
     */
    initEventListeners() {
        // 요소 포커스 이벤트 리스너
        document.addEventListener('focusin', (event) => {
            const element = event.target;
            this.handleFocusEvent(element);
        });
        // 키 입력 이벤트 리스너
        document.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
        // 입력 이벤트 리스너 (텍스트 변경)
        document.addEventListener('input', (event) => {
            const element = event.target;
            this.handleInputEvent(element);
        });
    }
    /**
     * 포커스 이벤트 처리
     * @param element 포커스된 요소
     */
    handleFocusEvent(element) {
        // 입력 필드인지 확인
        if (!_context_extractor__WEBPACK_IMPORTED_MODULE_1__.contextExtractor.isInputField(element)) {
            return;
        }
        // 현재 요소 업데이트
        this.state.currentElement = element;
    }
    /**
     * 키 입력 이벤트 처리
     * @param event 키보드 이벤트
     */
    handleKeydown(event) {
        const element = event.target;
        // 현재 요소가 아니면 무시
        if (element !== this.state.currentElement) {
            return;
        }
        // 자동완성 활성화 상태가 아니면 무시
        if (!this.state.isActive) {
            return;
        }
        // 탭 키 이벤트 처리 (자동완성 수락)
        if (event.key === 'Tab' && this.suggestUIManager.isVisible()) {
            event.preventDefault();
            this.acceptCompletion();
            return;
        }
        // Escape 키 이벤트 처리 (자동완성 취소)
        if (event.key === 'Escape' && this.suggestUIManager.isVisible()) {
            event.preventDefault();
            this.cancelCompletion();
            return;
        }
    }
    /**
     * 입력 이벤트 처리
     * @param element 입력 요소
     */
    handleInputEvent(element) {
        // 현재 요소가 아니면 무시
        if (element !== this.state.currentElement) {
            return;
        }
        // 자동완성 활성화 상태가 아니면 무시
        if (!this.state.isActive) {
            return;
        }
        // 키워드 감지 시도 - this.keywordDetector 사용
        const text = element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea'
            ? element.value
            : element.textContent || '';
        const cursorPosition = this.getCursorPosition(element);
        if (cursorPosition === null)
            return;
        const detectedKeyword = this.keywordDetector.detectKeyword(text, cursorPosition);
        if (detectedKeyword) {
            // 키워드가 감지되면 템플릿 매칭 시도
            this.handleKeywordDetected(detectedKeyword.keyword, element);
            return;
        }
        // 일반 텍스트 입력 처리 (쓰로틀링 적용)
        this.throttleCompletion(() => {
            this.requestCompletion(element);
        });
    }
    // 커서 위치 가져오는 유틸리티 함수 추가
    getCursorPosition(element) {
        if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
            return element.selectionStart || 0;
        }
        else if (element.hasAttribute('contenteditable')) {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0)
                return null;
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        }
        return null;
    }
    /**
     * 키워드 감지 처리
     * @param keyword 감지된 키워드
     * @param element 입력 요소
     */
    async handleKeywordDetected(keyword, element) {
        try {
            // this.templateMatcher 사용
            const matchKeyword = { keyword, prefix: '/', fullText: '/' + keyword, position: { start: 0, end: 0 }, context: '' };
            const matchedTemplates = this.templateMatcher.findMatchingTemplates(matchKeyword);
            // 매칭된 템플릿이 있으면 UI에 표시
            if (matchedTemplates && matchedTemplates.length > 0) {
                this.suggestUIManager.showTemplates(matchedTemplates, element);
            }
            else {
                // 매칭된 템플릿이 없으면 일반 자동완성 요청
                this.requestCompletion(element, keyword);
            }
        }
        catch (error) {
            console.error('템플릿 매칭 중 오류 발생:', error);
        }
    }
    /**
     * 자동완성 요청을 쓰로틀링하여 처리
     * @param callback 실행할 콜백 함수
     */
    throttleCompletion(callback) {
        const now = Date.now();
        // 마지막 요청 이후 충분한 시간이 지났는지 확인
        if (this.state.currentRequest &&
            now - this.state.currentRequest.timestamp < this.completionThrottleMs) {
            return;
        }
        // 콜백 실행
        callback();
    }
    /**
     * 자동완성 요청 처리
     * @param element 입력 요소
     * @param keyword 키워드 (있는 경우)
     */
    async requestCompletion(element, keyword) {
        // 이미 로딩 중이면 무시
        if (this.state.isLoading) {
            return;
        }
        try {
            // 요소에서 컨텍스트 추출
            const context = _context_extractor__WEBPACK_IMPORTED_MODULE_1__.contextExtractor.extractFromActiveElement(element);
            if (!context) {
                return;
            }
            // 컨텍스트가 너무 짧으면 무시 (너무 짧은 입력에는 제안하지 않음)
            if (context.text.trim().length < 10) {
                return;
            }
            // 현재 요청 정보 업데이트
            this.state.currentRequest = {
                context: context.text,
                timestamp: Date.now()
            };
            // 로딩 상태 설정
            this.state.isLoading = true;
            // API 요청 프롬프트 생성
            const prompt = this.buildPromptFromContext(context, keyword);
            // API 호출
            const completion = await _utils_clova_api_client__WEBPACK_IMPORTED_MODULE_0__.clovaApiClient.generateCompletion(prompt, keyword);
            // 결과 처리
            this.handleCompletionResult(completion.generated_text, element, completion.is_template, completion.template_id);
        }
        catch (error) {
            // 오류 처리
            console.error('자동완성 요청 중 오류 발생:', error);
            this.state.isLoading = false;
        }
    }
    /**
     * 컨텍스트에서 프롬프트 생성
     * @param context 추출된 컨텍스트
     * @param keyword 키워드 (있는 경우)
     * @returns 생성된 프롬프트
     */
    buildPromptFromContext(context, keyword) {
        // 도메인 컨텍스트 자동 감지 또는 기존 값 사용
        const domainContext = context.domain || _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.promptBuilder.detectDomainFromText(context.text) || 'document';
        // 사용자 의도 추정
        const userIntent = this.detectUserIntent(context);
        // 격식 수준 선택 (도메인 기반)
        const formalLevel = this.selectFormalLevel(domainContext);
        // 텍스트 길이 최적화 (너무 긴 컨텍스트 처리)
        const optimizedText = _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.promptBuilder.optimizeTextLength(context.text, 800);
        // 어조 수정자 결정 (의도 기반)
        const toneModifiers = this.getToneModifiersForIntent(userIntent);
        // 도메인 전문 분야 설정 (키워드 기반)
        const domain = keyword ? this.detectDomainFromKeyword(keyword) : undefined;
        // 적절한 템플릿 선택 (도메인 및 의도 기반)
        const templateName = this.selectTemplateForDomain(domainContext);
        // A/B 테스트 그룹 할당 (실험용)
        const testGroup = Math.random() < 0.5 ? 'control' : 'variant-a';
        // 프롬프트 빌더를 사용하여 프롬프트 생성
        return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.promptBuilder.buildPrompt(optimizedText, templateName, {
            domainContext,
            userIntent,
            formalLevel,
            maxTokens: 150,
            toneModifiers,
            domain,
            testGroup
        });
    }
    /**
     * 의도에 따른 어조 수정자 가져오기
     * @param intent 사용자 의도
     * @returns 어조 수정자 배열
     */
    getToneModifiersForIntent(intent) {
        switch (intent) {
            case 'greeting':
                return ['친근한', '환영하는'];
            case 'requesting':
                return ['정중한', '명확한'];
            case 'scheduling':
                return ['간결한', '명확한'];
            case 'inquiring':
                return ['정중한', '호기심 있는'];
            case 'thanking':
                return ['진심어린', '감사하는'];
            case 'writing':
                return ['전문적인', '유익한'];
            default:
                return ['적절한'];
        }
    }
    /**
     * 키워드에서 전문 분야 감지
     * @param keyword 키워드
     * @returns 감지된 전문 분야
     */
    detectDomainFromKeyword(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerKeyword.includes('법') || lowerKeyword.includes('계약')) {
            return 'legal';
        }
        else if (lowerKeyword.includes('기술') || lowerKeyword.includes('개발')) {
            return 'tech';
        }
        else if (lowerKeyword.includes('의학') || lowerKeyword.includes('건강')) {
            return 'medical';
        }
        else if (lowerKeyword.includes('금융') || lowerKeyword.includes('투자')) {
            return 'finance';
        }
        return undefined;
    }
    /**
     * 컨텍스트 기반 사용자 의도 추정
     * @param context 추출된 컨텍스트
     * @returns 추정된 사용자 의도
     */
    detectUserIntent(context) {
        // 컨텍스트 내용 분석하여 의도 추정
        const text = context.text.toLowerCase();
        if (text.includes('안녕') || text.includes('인사') || text.includes('hello')) {
            return 'greeting';
        }
        else if (text.includes('요청') || text.includes('부탁') || text.includes('request')) {
            return 'requesting';
        }
        else if (text.includes('회의') || text.includes('미팅') || text.includes('meeting')) {
            return 'scheduling';
        }
        else if (text.includes('질문') || text.includes('문의') || text.includes('question')) {
            return 'inquiring';
        }
        else if (text.includes('감사') || text.includes('thank')) {
            return 'thanking';
        }
        // 기본값
        return 'writing';
    }
    /**
     * 도메인 기반 격식 수준 선택
     * @param domain 도메인 컨텍스트
     * @returns 격식 수준
     */
    selectFormalLevel(domain) {
        switch (domain) {
            case 'email':
                return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.FormalLevel.BUSINESS;
            case 'crm':
                return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.FormalLevel.FORMAL;
            case 'social':
                return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.FormalLevel.CASUAL;
            case 'document':
                return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.FormalLevel.NEUTRAL;
            default:
                return _utils_prompt_builder__WEBPACK_IMPORTED_MODULE_4__.FormalLevel.NEUTRAL;
        }
    }
    /**
     * 도메인 기반 템플릿 선택
     * @param domain 도메인 컨텍스트
     * @returns 템플릿 이름
     */
    selectTemplateForDomain(domain) {
        switch (domain) {
            case 'email':
                return 'email';
            case 'crm':
                return 'business';
            case 'social':
                return 'chat';
            case 'document':
                return 'completion';
            default:
                return 'default';
        }
    }
    /**
     * 자동완성 결과 처리
     * @param completionText 생성된 텍스트
     * @param element 입력 요소
     * @param isTemplate 템플릿 여부
     * @param templateId 템플릿 ID (있는 경우)
     */
    handleCompletionResult(completionText, element, isTemplate = false, templateId) {
        // 로딩 상태 해제
        this.state.isLoading = false;
        // 생성된 텍스트가 없으면 무시
        if (!completionText || completionText.trim() === '') {
            return;
        }
        // 마지막 자동완성 정보 업데이트
        this.state.lastCompletion = {
            text: completionText,
            timestamp: Date.now(),
            isTemplate,
            templateId
        };
        // UI에 자동완성 제안 표시
        this.suggestUIManager.showCompletion(completionText, element, isTemplate);
    }
    /**
     * 자동완성 수락 처리
     */
    acceptCompletion() {
        // UI가 표시되지 않았거나 현재 요소가 없으면 무시
        if (!this.suggestUIManager.isVisible() || !this.state.currentElement) {
            return;
        }
        // 현재 선택된 제안 텍스트 가져오기
        const suggestionText = this.suggestUIManager.getSelectedText();
        if (!suggestionText) {
            return;
        }
        // 텍스트 삽입 처리
        this.insertTextAtCursor(this.state.currentElement, suggestionText);
        // UI 숨기기
        this.suggestUIManager.hide();
    }
    /**
     * 커서 위치에 텍스트 삽입
     * @param element 입력 요소
     * @param text 삽입할 텍스트
     */
    insertTextAtCursor(element, text) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            // input 또는 textarea 요소
            const inputElement = element;
            const selectionStart = inputElement.selectionStart || 0;
            const selectionEnd = inputElement.selectionEnd || 0;
            // 현재 값과 선택 범위 가져오기
            const currentValue = inputElement.value || '';
            // 새 값 계산 (선택 영역 대체)
            const newValue = currentValue.substring(0, selectionStart) +
                text +
                currentValue.substring(selectionEnd);
            // 값 업데이트
            inputElement.value = newValue;
            // 커서 위치 설정 (삽입된 텍스트 다음)
            const newPosition = selectionStart + text.length;
            inputElement.setSelectionRange(newPosition, newPosition);
        }
        else if (element.hasAttribute('contenteditable')) {
            // contentEditable 요소
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                // 선택 범위 가져오기
                const range = selection.getRangeAt(0);
                // 선택 영역 지우기
                range.deleteContents();
                // 텍스트 노드 생성 및 삽입
                const textNode = document.createTextNode(text);
                range.insertNode(textNode);
                // 커서 위치 설정 (삽입된 텍스트 다음)
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        // 입력 이벤트 발생 (변경 알림)
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    /**
     * 자동완성 취소 처리
     */
    cancelCompletion() {
        this.suggestUIManager.hide();
    }
    /**
     * 자동완성 활성화 설정
     * @param isActive 활성화 여부
     */
    setActive(isActive) {
        this.state.isActive = isActive;
        // 비활성화 시 UI 숨기기
        if (!isActive) {
            this.suggestUIManager.hide();
        }
    }
}
// 기본 인스턴스는 외부에서 SuggestionUIManager와 함께 생성 


/***/ }),

/***/ "./src/content/context-extractor.ts":
/*!******************************************!*\
  !*** ./src/content/context-extractor.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ContextExtractor: () => (/* binding */ ContextExtractor),
/* harmony export */   contextExtractor: () => (/* binding */ contextExtractor)
/* harmony export */ });
/**
 * 컨텍스트 추출 유틸리티 - 입력 필드에서 관련 컨텍스트를 추출하여 AI 모델에 제공
 */
/**
 * 컨텍스트 추출기 클래스
 */
class ContextExtractor {
    /**
     * 컨텍스트 추출기 생성자
     * @param options 컨텍스트 추출 옵션
     */
    constructor(options) {
        // 최대 컨텍스트 길이 (기본값: 500자)
        this.maxContextLength = options?.maxContextLength || 500;
        // 도메인 패턴 (URL 기반 도메인 감지)
        this.domainPatterns = options?.domainPatterns || {
            'email': [/mail\..*\.com/i, /gmail\.com/i, /outlook\.com/i],
            'crm': [/salesforce\.com/i, /zendesk\.com/i, /hubspot\.com/i],
            'document': [/docs\.google\.com/i, /notion\.so/i, /quip\.com/i],
            'social': [/twitter\.com/i, /facebook\.com/i, /linkedin\.com/i]
        };
    }
    /**
     * 현재 활성화된 입력 필드에서 컨텍스트 추출
     * @param activeElement 활성화된 DOM 요소
     * @returns 추출된 컨텍스트 또는 null (입력 필드가 아닌 경우)
     */
    extractFromActiveElement(activeElement) {
        if (!activeElement) {
            return null;
        }
        // 입력 필드인지 확인
        if (!this.isInputField(activeElement)) {
            return null;
        }
        // HTML 입력 필드에서 컨텍스트 추출
        const htmlElement = activeElement;
        return this.extractFromInputField(htmlElement);
    }
    /**
     * 요소가 텍스트 입력 필드인지 확인
     * @param element 확인할 DOM 요소
     * @returns 텍스트 입력 필드 여부
     */
    isInputField(element) {
        const tagName = element.tagName.toLowerCase();
        // 일반 입력 필드 (input, textarea)
        if (tagName === 'input' || tagName === 'textarea') {
            if (tagName === 'input') {
                const inputType = element.type.toLowerCase();
                return inputType === 'text' || inputType === 'search' || inputType === 'email';
            }
            return true;
        }
        // contentEditable 요소
        if (element.hasAttribute('contenteditable') &&
            element.getAttribute('contenteditable') !== 'false') {
            return true;
        }
        // 커스텀 입력 필드 (예: CKEditor, TinyMCE 등)
        // 클래스 이름이나 속성으로 커스텀 에디터를 식별
        const className = element.className.toLowerCase();
        if (className.includes('editor') || className.includes('wysiwyg')) {
            return true;
        }
        return false;
    }
    /**
     * 입력 필드에서 컨텍스트 추출
     * @param element HTML 입력 요소
     * @returns 추출된 컨텍스트
     */
    extractFromInputField(element) {
        let text = '';
        let cursorPosition = 0;
        let selectionText = '';
        let selectionStart = 0;
        let selectionEnd = 0;
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            // input 또는 textarea 요소
            const inputElement = element;
            text = inputElement.value || '';
            cursorPosition = inputElement.selectionStart || 0;
            selectionStart = inputElement.selectionStart || 0;
            selectionEnd = inputElement.selectionEnd || 0;
            selectionText = text.substring(selectionStart, selectionEnd);
        }
        else if (element.hasAttribute('contenteditable')) {
            // contentEditable 요소
            text = element.textContent || '';
            // 현재 선택 정보 가져오기
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                // 커서 위치 계산
                const precedingRange = range.cloneRange();
                precedingRange.selectNodeContents(element);
                precedingRange.setEnd(range.startContainer, range.startOffset);
                cursorPosition = precedingRange.toString().length;
                // 선택 영역 계산
                selectionText = selection.toString();
                selectionStart = cursorPosition;
                selectionEnd = cursorPosition + selectionText.length;
            }
        }
        // 컨텍스트 길이 제한
        const limitedText = this.limitContextLength(text, cursorPosition);
        // 커서 기준 텍스트 분할
        const precedingText = limitedText.substring(0, cursorPosition);
        const followingText = limitedText.substring(cursorPosition);
        // 현재 도메인 감지
        const domain = this.detectDomain(window.location.href);
        return {
            text: limitedText,
            cursorPosition,
            selection: {
                text: selectionText,
                start: selectionStart,
                end: selectionEnd
            },
            precedingText,
            followingText,
            domain
        };
    }
    /**
     * 컨텍스트 길이 제한
     * @param text 전체 텍스트
     * @param cursorPosition 커서 위치
     * @returns 제한된 텍스트
     */
    limitContextLength(text, cursorPosition) {
        // 최대 길이보다 짧으면 그대로 반환
        if (text.length <= this.maxContextLength) {
            return text;
        }
        // 컨텍스트 중심으로 텍스트 범위 계산
        const halfLength = Math.floor(this.maxContextLength / 2);
        let start = cursorPosition - halfLength;
        let end = cursorPosition + halfLength;
        // 범위가 텍스트 범위를 벗어나는 경우 조정
        if (start < 0) {
            end = Math.min(end - start, text.length);
            start = 0;
        }
        else if (end > text.length) {
            start = Math.max(0, start - (end - text.length));
            end = text.length;
        }
        return text.substring(start, end);
    }
    /**
     * URL에서 도메인 유형 감지
     * @param url 현재 URL
     * @returns 감지된 도메인 또는 undefined
     */
    detectDomain(url) {
        for (const [domain, patterns] of Object.entries(this.domainPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(url)) {
                    return domain;
                }
            }
        }
        return undefined;
    }
    /**
     * 컨텍스트에서 이전 문장들 추출
     * @param context 추출된 컨텍스트
     * @param sentenceCount 추출할 문장 수 (기본값: 3)
     * @returns 이전 문장들
     */
    extractPrecedingSentences(context, sentenceCount = 3) {
        // 문장 구분 정규식 (마침표, 물음표, 느낌표 등)
        const sentenceDelimiters = /[.!?]\s+/g;
        // 커서 앞의 텍스트에서 문장 분리
        const sentences = context.precedingText.split(sentenceDelimiters);
        // 마지막 몇 개 문장 추출
        const relevantSentences = sentences.slice(-sentenceCount);
        return relevantSentences.join('. ').trim();
    }
    /**
     * 컨텍스트에서 현재 작성 중인 단락 추출
     * @param context 추출된 컨텍스트
     * @returns 현재 단락
     */
    extractCurrentParagraph(context) {
        // 단락 구분 정규식 (두 번 이상의 개행)
        const paragraphDelimiter = /\n\s*\n/;
        // 커서 앞의 텍스트에서 마지막 단락 시작 위치 찾기
        const precedingParagraphs = context.precedingText.split(paragraphDelimiter);
        const currentPrecedingParagraph = precedingParagraphs[precedingParagraphs.length - 1];
        // 커서 뒤의 텍스트에서 현재 단락 끝 위치 찾기
        const followingParagraphs = context.followingText.split(paragraphDelimiter);
        const currentFollowingParagraph = followingParagraphs[0];
        // 현재 단락 조합
        return (currentPrecedingParagraph + currentFollowingParagraph).trim();
    }
    /**
     * 컨텍스트 정보 기반의 프롬프트 생성
     * @param context 추출된 컨텍스트
     * @returns AI 모델에 제공할 프롬프트
     */
    generatePromptFromContext(context) {
        // 현재 작성 중인 단락 추출
        const currentParagraph = this.extractCurrentParagraph(context);
        // 이전 문장들 추출
        const precedingSentences = this.extractPrecedingSentences(context);
        // 도메인 정보 추가
        const domainContext = context.domain ? `작성 환경: ${context.domain}` : '';
        // 프롬프트 구성
        return `${domainContext}\n\n이전 내용: ${precedingSentences}\n\n현재 작성 중: ${currentParagraph}`;
    }
}
// 기본 인스턴스 생성 및 내보내기
const contextExtractor = new ContextExtractor();


/***/ }),

/***/ "./src/content/focus-tracker.ts":
/*!**************************************!*\
  !*** ./src/content/focus-tracker.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FocusTracker: () => (/* binding */ FocusTracker)
/* harmony export */ });
/**
 * 포커스 트래커 - 현재 활성화된 입력 필드를 추적
 */
/**
 * 현재 포커스된 입력 필드를 추적하는 클래스
 */
class FocusTracker {
    constructor(adapterRegistry, options = {}) {
        this.activeElement = null;
        this.adapterRegistry = adapterRegistry;
        this.options = options;
        this.initialize();
    }
    /**
     * 포커스 추적 초기화
     */
    initialize() {
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
    checkInitialFocus() {
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
    handleFocusIn(event) {
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
    handleFocusOut(event) {
        // relatedTarget이 null이거나 문서 외부로 포커스가 이동한 경우
        if (!event.relatedTarget ||
            !(event.relatedTarget instanceof Node) ||
            !document.contains(event.relatedTarget)) {
            this.setActiveElement(null);
        }
    }
    /**
     * mousedown 이벤트 핸들러 (contentEditable 요소 처리용)
     */
    handleMouseDown(event) {
        if (event.target instanceof HTMLElement) {
            const target = event.target;
            // 요소 또는 부모 요소가 contentEditable인지 확인
            let current = target;
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
    setActiveElement(element) {
        if (this.activeElement === element)
            return;
        this.activeElement = element;
        // 포커스 변경 콜백 호출
        if (this.options.onFocusChange) {
            this.options.onFocusChange(element);
        }
    }
    /**
     * 현재 활성화된 요소 반환
     */
    getActiveElement() {
        return this.activeElement;
    }
    /**
     * 특정 요소가 현재 활성화되어 있는지 확인
     */
    isActive(element) {
        return this.activeElement === element;
    }
    /**
     * 현재 활성화된 요소에서 텍스트 가져오기
     */
    getActiveText() {
        if (!this.activeElement)
            return '';
        return this.adapterRegistry.getText(this.activeElement);
    }
    /**
     * 현재 활성화된 요소에 텍스트 삽입
     */
    insertTextToActive(text) {
        if (!this.activeElement)
            return false;
        this.adapterRegistry.insertText(this.activeElement, text);
        return true;
    }
    /**
     * 현재 활성화된 요소의 커서 위치 정보 가져오기
     */
    getActiveCursorPosition() {
        if (!this.activeElement)
            return null;
        return this.adapterRegistry.getCursorPosition(this.activeElement);
    }
}


/***/ }),

/***/ "./src/content/suggestion-ui.ts":
/*!**************************************!*\
  !*** ./src/content/suggestion-ui.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setupSuggestionUI: () => (/* binding */ setupSuggestionUI)
/* harmony export */ });
/**
 * 추천 UI 렌더링 모듈 - 커서 근처에 추천 텍스트 표시
 */
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
function setupSuggestionUI(options) {
    // UI 컨테이너 요소 생성
    let container = null;
    let targetElement = null;
    let activeItemIndex = 0;
    const adapterRegistry = options.adapterRegistry;
    // UI 요소 생성
    function createUIElements() {
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
    function positionUIElement(element) {
        if (!container || !element)
            return;
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
        }
        else if (element.isContentEditable) {
            // 커서 위치를 좀 더 정확하게 계산해야 함 (간단한 구현)
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const tempRect = range.getBoundingClientRect();
                cursorTop = tempRect.bottom + scrollTop + 5;
                cursorLeft = tempRect.left + scrollLeft;
            }
            else {
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
    function adjustElementPosition() {
        if (!container)
            return;
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
    function showLoading() {
        if (!container)
            return;
        container.innerHTML = `
      <div class="assist-suggestion-header">AI 문장 자동완성</div>
      <div class="assist-loading">
        <div class="assist-loading-spinner"></div>
        <div class="assist-loading-text">추천 생성 중...</div>
      </div>
    `;
        positionUIElement(targetElement);
        show();
    }
    // 빈 상태 UI 표시
    function showEmptyState(message = '추천 항목을 찾을 수 없습니다.') {
        if (!container)
            return;
        container.innerHTML = `
      <div class="assist-suggestion-header">AI 문장 자동완성</div>
      <div class="assist-empty-state">${message}</div>
    `;
        show();
    }
    // 텍스트 예측 UI 렌더링
    function renderTextPrediction(prediction) {
        if (!container)
            return;
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
    function highlightPrediction(prediction) {
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
    function renderTemplateSuggestions(templates) {
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
    function setActiveItem(index) {
        if (!container)
            return;
        const items = container.querySelectorAll('.assist-suggestion-item');
        if (items.length === 0)
            return;
        // 유효한 인덱스 범위 확인
        if (index < 0)
            index = items.length - 1;
        if (index >= items.length)
            index = 0;
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
    function setupKeyboardNavigation() {
        function handleKeyDown(e) {
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
                        }
                        else {
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
    function show() {
        if (!container)
            return;
        container.classList.add('visible');
    }
    // UI 숨기기
    function hide() {
        if (!container)
            return;
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
        showPrediction(prediction, element) {
            targetElement = element;
            renderTextPrediction(prediction);
            positionUIElement(element);
            show();
        },
        /**
         * 템플릿 목록 표시
         */
        showTemplates(element, templates) {
            targetElement = element;
            renderTemplateSuggestions(templates);
            positionUIElement(element);
            show();
        },
        /**
         * 로딩 상태 표시
         */
        showLoading(element) {
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


/***/ }),

/***/ "./src/content/template-manager.ts":
/*!*****************************************!*\
  !*** ./src/content/template-manager.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TemplateManager: () => (/* binding */ TemplateManager)
/* harmony export */ });
/* harmony import */ var _utils_keyword_detector__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/keyword-detector */ "./src/utils/keyword-detector.ts");
/* harmony import */ var _utils_template_matcher__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/template-matcher */ "./src/utils/template-matcher.ts");
/* harmony import */ var _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/template-cache */ "./src/utils/template-cache.ts");
/**
 * 템플릿 매니저 - 키워드 감지, 템플릿 매칭, 캐싱 관리 통합
 */



/**
 * 템플릿 매니저 클래스
 * 키워드 감지, 템플릿 검색, 캐싱을 통합 관리
 */
class TemplateManager {
    /**
     * 템플릿 매니저 생성자
     * @param options 초기화 옵션
     */
    constructor(options) {
        this.cachedTemplates = [];
        this.isInitialized = false;
        // 키워드 감지기 초기화
        this.keywordDetector = new _utils_keyword_detector__WEBPACK_IMPORTED_MODULE_0__.KeywordDetector({
            prefixes: options?.keywordPrefixes,
            maxKeywordLength: options?.maxKeywordLength,
            contextWindowSize: options?.contextWindowSize
        });
        // 템플릿 매처 초기화
        this.templateMatcher = new _utils_template_matcher__WEBPACK_IMPORTED_MODULE_1__.TemplateMatcher();
    }
    /**
     * 템플릿 매니저 초기화 - 캐시 로드 및 매처 설정
     * @returns 초기화 성공 여부
     */
    async initialize() {
        try {
            // 캐시에서 템플릿 로드 시도
            const cachedTemplates = await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.getTemplates();
            if (cachedTemplates) {
                this.cachedTemplates = cachedTemplates;
                this.templateMatcher.setTemplates(this.cachedTemplates);
                this.isInitialized = true;
                return true;
            }
            // 캐시가 없거나 만료되었으면 새로 로드
            await this.refreshTemplates();
            return this.isInitialized;
        }
        catch (error) {
            console.error('템플릿 매니저 초기화 오류:', error);
            return false;
        }
    }
    /**
     * 템플릿 캐시 새로고침
     * @returns 성공 여부
     */
    async refreshTemplates() {
        try {
            // 백그라운드 스크립트에 템플릿 목록 요청
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_ALL_TEMPLATES' }, async (response) => {
                    if (response && response.templates) {
                        this.cachedTemplates = response.templates;
                        // 매처에 템플릿 설정
                        this.templateMatcher.setTemplates(this.cachedTemplates);
                        // 캐시에 저장
                        await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.saveTemplates(this.cachedTemplates);
                        this.isInitialized = true;
                        resolve(true);
                    }
                    else {
                        console.error('템플릿 로드 오류:', response?.error || '알 수 없는 오류');
                        resolve(false);
                    }
                });
            });
        }
        catch (error) {
            console.error('템플릿 새로고침 오류:', error);
            return false;
        }
    }
    /**
     * 현재 텍스트에서 키워드 감지
     * @param text 현재 입력 텍스트
     * @param cursorPosition 커서 위치
     * @returns 감지된 키워드 매치 또는 null
     */
    detectKeyword(text, cursorPosition) {
        return this.keywordDetector.detectKeyword(text, cursorPosition);
    }
    /**
     * 키워드 매치에 기반한 템플릿 검색
     * @param keywordMatch 키워드 매치 객체
     * @param limit 최대 결과 수
     * @returns 검색 결과 객체 (Promise)
     */
    async searchTemplates(keywordMatch, limit = 5) {
        // 매니저가 초기화되지 않았으면 초기화
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                return {
                    isLoading: false,
                    templates: [],
                    error: '템플릿 매니저 초기화에 실패했습니다.'
                };
            }
        }
        // 캐시가 만료되었거나 비어있으면 새로고침
        const isCacheExpired = await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.isCacheExpired();
        const isCacheEmpty = await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.isCacheEmpty();
        if (isCacheExpired || isCacheEmpty) {
            await this.refreshTemplates();
        }
        // 로컬 캐시에서 검색
        const localMatches = this.templateMatcher.findMatchingTemplates(keywordMatch, limit);
        // 로컬 매칭 결과가 있으면 바로 반환
        if (localMatches.length > 0) {
            return {
                isLoading: false,
                templates: localMatches
            };
        }
        // 로컬 결과가 없으면 백엔드에 직접 검색 요청
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'SEARCH_TEMPLATES',
                keyword: keywordMatch.keyword
            }, (response) => {
                if (response && response.templates) {
                    // 검색된 템플릿들을 TemplateMatch 형태로 변환
                    const matches = response.templates.map(template => ({
                        template,
                        score: 1, // 백엔드에서 가져온 템플릿은 기본 점수 1
                        matchedOn: 'backend'
                    }));
                    // 결과 반환
                    resolve({
                        isLoading: false,
                        templates: matches.slice(0, limit)
                    });
                    // 백그라운드에서 가져온 템플릿 캐싱 (비동기)
                    this.updateLocalCache(response.templates);
                }
                else {
                    resolve({
                        isLoading: false,
                        templates: [],
                        error: response?.error || '템플릿을 찾을 수 없습니다.'
                    });
                }
            });
            // 로딩 상태 즉시 반환
            resolve({
                isLoading: true,
                templates: []
            });
        });
    }
    /**
     * 백엔드에서 가져온 템플릿을 로컬 캐시에 업데이트
     * @param newTemplates 새 템플릿 배열
     */
    async updateLocalCache(newTemplates) {
        if (!newTemplates || newTemplates.length === 0) {
            return;
        }
        // 기존 캐시와 새 템플릿을 병합
        const existingIds = new Set(this.cachedTemplates.map(t => t.id));
        const templatesToAdd = newTemplates.filter(t => !existingIds.has(t.id));
        if (templatesToAdd.length === 0) {
            return;
        }
        // 캐시 업데이트
        this.cachedTemplates = [...this.cachedTemplates, ...templatesToAdd];
        this.templateMatcher.setTemplates(this.cachedTemplates);
        // 스토리지에 저장
        await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.saveTemplates(this.cachedTemplates);
    }
    /**
     * 템플릿 사용 횟수 증가
     * @param templateId 템플릿 ID
     */
    async incrementTemplateUsage(templateId) {
        // 로컬 캐시에서 사용 횟수 증가
        await _utils_template_cache__WEBPACK_IMPORTED_MODULE_2__.TemplateCache.incrementTemplateUsage(templateId);
        // 백엔드에도 사용 횟수 증가 요청
        chrome.runtime.sendMessage({
            type: 'INCREMENT_TEMPLATE_USAGE',
            templateId
        });
    }
}


/***/ }),

/***/ "./src/utils/clova-api-client.ts":
/*!***************************************!*\
  !*** ./src/utils/clova-api-client.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ClovaApiClient: () => (/* binding */ ClovaApiClient),
/* harmony export */   clovaApiClient: () => (/* binding */ clovaApiClient)
/* harmony export */ });
/**
 * CLOVA Studio HCX-005 API 클라이언트 - CLOVA API를 호출하기 위한 클라이언트 유틸리티
 */
/**
 * CLOVA Studio HCX-005 API 클라이언트 클래스
 */
class ClovaApiClient {
    /**
     * CLOVA API 클라이언트 생성자
     * @param baseUrl 기본 API URL (기본값: 백그라운드 스크립트를 통한 프록시)
     */
    constructor(baseUrl = '') {
        this.apiKey = null;
        // 백그라운드 스크립트를 통해 API 호출 (직접 호출하지 않음)
        this.baseUrl = baseUrl || '';
        this.apiUrl = `${this.baseUrl}/predict/complete`;
    }
    /**
     * API 키 설정
     * @param apiKey CLOVA API 키
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * 현재 설정된 API 키 반환
     * @returns API 키 또는 null
     */
    getApiKey() {
        return this.apiKey;
    }
    /**
     * API 키가 설정되어 있는지 확인
     * @returns API 키 설정 여부
     */
    hasApiKey() {
        return !!this.apiKey;
    }
    /**
     * 컨텍스트 기반 텍스트 예측 요청
     * @param context 현재 입력 컨텍스트
     * @param keyword 관련 키워드 (선택사항)
     * @param maxTokens 최대 생성 토큰 수 (기본값: 100)
     * @returns 예측 텍스트가 포함된 Promise
     */
    async predictText(context, keyword, maxTokens = 100) {
        try {
            // 백그라운드 스크립트에 메시지 전송
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    type: 'PREDICT_TEXT',
                    context,
                    keyword,
                    maxTokens
                }, (response) => {
                    if (response.error) {
                        reject({
                            status: 500,
                            message: response.error
                        });
                    }
                    else if (response.prediction) {
                        resolve({
                            generated_text: response.prediction,
                            context: context,
                            keyword: keyword,
                            is_template: false
                        });
                    }
                    else {
                        reject({
                            status: 500,
                            message: '알 수 없는 응답 형식'
                        });
                    }
                });
            });
        }
        catch (error) {
            console.error('텍스트 예측 요청 중 오류 발생:', error);
            throw {
                status: 500,
                message: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }
    /**
     * 입력 텍스트의 다음 문장 예측
     * @param text 현재 입력 텍스트
     * @param contextWindowSize 컨텍스트 윈도우 크기 (기본값: 250)
     * @returns 예측 텍스트가 포함된 Promise
     */
    async predictNextSentence(text, contextWindowSize = 250) {
        // 긴 텍스트의 경우 마지막 부분만 컨텍스트로 사용
        const context = text.length > contextWindowSize
            ? text.slice(text.length - contextWindowSize)
            : text;
        try {
            const result = await this.predictText(context);
            return result.generated_text;
        }
        catch (error) {
            console.error('다음 문장 예측 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 키워드 기반 템플릿 또는 맥락 기반 문장 예측
     * @param context 현재 입력 컨텍스트
     * @param keyword 키워드 (있는 경우)
     * @returns 예측 결과가 포함된 Promise
     */
    async generateCompletion(context, keyword) {
        try {
            // 키워드가 있으면 템플릿 검색 먼저 시도
            if (keyword) {
                try {
                    // 키워드 기반 템플릿 검색 시도
                    const templateResult = await this.searchTemplates(keyword);
                    if (templateResult && templateResult.length > 0) {
                        // 가장 관련성 높은 템플릿 선택
                        const topTemplate = templateResult[0];
                        return {
                            generated_text: topTemplate.template.content,
                            context: context,
                            keyword: keyword,
                            template_id: topTemplate.template.id,
                            is_template: true
                        };
                    }
                }
                catch (e) {
                    // 템플릿 검색 실패 시 무시하고 텍스트 예측 진행
                    console.log('템플릿 검색 실패, 텍스트 예측을 시도합니다:', e);
                }
            }
            // 템플릿 없거나 실패 시 텍스트 예측
            return await this.predictText(context, keyword);
        }
        catch (error) {
            console.error('생성 요청 중 오류 발생:', error);
            throw error;
        }
    }
    /**
     * 키워드 기반 템플릿 검색
     * @param keyword 검색 키워드
     * @returns 템플릿 매칭 결과 배열을 포함한 Promise
     */
    async searchTemplates(keyword) {
        try {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    type: 'SEARCH_TEMPLATES',
                    keyword: keyword
                }, (response) => {
                    if (response.error) {
                        reject(response.error);
                    }
                    else if (response.templates) {
                        resolve(response.templates);
                    }
                    else {
                        resolve([]);
                    }
                });
            });
        }
        catch (error) {
            console.error('템플릿 검색 중 오류 발생:', error);
            throw error;
        }
    }
}
// 클라이언트 인스턴스 생성 및 내보내기
const clovaApiClient = new ClovaApiClient();


/***/ }),

/***/ "./src/utils/keyword-detector.ts":
/*!***************************************!*\
  !*** ./src/utils/keyword-detector.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KeywordDetector: () => (/* binding */ KeywordDetector)
/* harmony export */ });
/**
 * 키워드 감지 유틸리티 - 텍스트 입력에서 템플릿 키워드 감지
 */
/**
 * 키워드 감지기 클래스
 */
class KeywordDetector {
    /**
     * 키워드 감지기 생성자
     * @param options 감지기 옵션
     */
    constructor(options) {
        this.prefixes = ['/']; // 기본 접두사
        this.maxKeywordLength = 20; // 최대 키워드 길이
        this.contextWindowSize = 100; // 컨텍스트 윈도우 크기
        if (options?.prefixes) {
            this.prefixes = options.prefixes;
        }
        if (options?.maxKeywordLength) {
            this.maxKeywordLength = options.maxKeywordLength;
        }
        if (options?.contextWindowSize) {
            this.contextWindowSize = options.contextWindowSize;
        }
    }
    /**
     * 주어진 텍스트와 커서 위치에서 키워드 감지
     * @param text 검색할 텍스트
     * @param cursorPosition 현재 커서 위치
     * @returns 감지된 키워드 매치 또는 null
     */
    detectKeyword(text, cursorPosition) {
        if (!text || cursorPosition > text.length) {
            return null;
        }
        // 커서 위치 앞에 있는 텍스트 분석
        const textBeforeCursor = text.substring(0, cursorPosition);
        // 가장 가까운 접두사 찾기
        let keywordStart = -1;
        let prefix = '';
        for (const currentPrefix of this.prefixes) {
            const lastPrefixPos = textBeforeCursor.lastIndexOf(currentPrefix);
            if (lastPrefixPos !== -1 && (keywordStart === -1 || lastPrefixPos > keywordStart)) {
                keywordStart = lastPrefixPos;
                prefix = currentPrefix;
            }
        }
        // 접두사가 없으면 키워드 없음
        if (keywordStart === -1) {
            return null;
        }
        // 접두사 뒤에 있는 텍스트 가져오기
        const afterPrefix = textBeforeCursor.substring(keywordStart + prefix.length);
        // 공백으로 끝나는 경우 체크
        const spaceIndex = afterPrefix.indexOf(' ');
        // 공백이 있거나 최대 길이보다 길면 잘라내기
        const keywordText = spaceIndex !== -1
            ? afterPrefix.substring(0, spaceIndex)
            : afterPrefix;
        // 키워드가 최대 길이를 초과하거나 비어있으면 무시
        if (keywordText.length > this.maxKeywordLength || keywordText.length === 0) {
            return null;
        }
        // 키워드 주변 컨텍스트 추출
        const contextStart = Math.max(0, keywordStart - this.contextWindowSize);
        const contextEnd = Math.min(text.length, cursorPosition + this.contextWindowSize);
        const context = text.substring(contextStart, contextEnd);
        // 키워드 매치 객체 생성
        const fullKeyword = prefix + keywordText;
        return {
            keyword: keywordText,
            prefix,
            fullText: fullKeyword,
            position: {
                start: keywordStart,
                end: keywordStart + fullKeyword.length
            },
            context
        };
    }
    /**
     * 텍스트에서 모든 키워드 찾기
     * @param text 검색할 텍스트
     * @returns 감지된 모든 키워드 매치 배열
     */
    findAllKeywords(text) {
        const matches = [];
        for (const prefix of this.prefixes) {
            let position = 0;
            while (position < text.length) {
                const prefixIndex = text.indexOf(prefix, position);
                if (prefixIndex === -1)
                    break;
                const match = this.detectKeyword(text, prefixIndex + prefix.length);
                if (match) {
                    matches.push(match);
                    position = match.position.end;
                }
                else {
                    position = prefixIndex + prefix.length;
                }
            }
        }
        return matches;
    }
}


/***/ }),

/***/ "./src/utils/prompt-builder.ts":
/*!*************************************!*\
  !*** ./src/utils/prompt-builder.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FormalLevel: () => (/* binding */ FormalLevel),
/* harmony export */   PromptBuilder: () => (/* binding */ PromptBuilder),
/* harmony export */   promptBuilder: () => (/* binding */ promptBuilder)
/* harmony export */ });
/**
 * 프롬프트 빌더 - CLOVA API에 최적화된 프롬프트 생성 유틸리티
 */
// 문체 격식 수준 열거형
var FormalLevel;
(function (FormalLevel) {
    FormalLevel["CASUAL"] = "casual";
    FormalLevel["NEUTRAL"] = "neutral";
    FormalLevel["FORMAL"] = "formal";
    FormalLevel["BUSINESS"] = "business"; // 비즈니스 문체
})(FormalLevel || (FormalLevel = {}));
/**
 * 프롬프트 빌더 클래스
 */
class PromptBuilder {
    /**
     * 프롬프트 빌더 생성자
     */
    constructor() {
        // 기본 템플릿 초기화
        this.defaultTemplate = {
            name: 'default',
            template: '다음 문장을 자연스럽게 이어서 작성해주세요:\n\n{context}',
            description: '기본 문장 완성 템플릿',
            version: '1.0'
        };
        // A/B 테스트 초기화
        this.testResults = {};
        this.activeTestGroups = ['control', 'variant-a', 'variant-b'];
        // 템플릿 매핑 초기화
        this.templates = {
            'default': this.defaultTemplate,
            // 기본 완성 템플릿
            'completion': {
                name: 'completion',
                template: '다음 텍스트의 이어질 내용을 자연스럽게 생성해주세요:\n\n{context}',
                description: '일반 텍스트 완성',
                version: '1.0'
            },
            // 이메일 템플릿 - 컨트롤 그룹
            'email': {
                name: 'email',
                template: '다음은 {formalLevel} 이메일입니다. 이어질 내용을 작성해주세요:\n\n{context}',
                description: '이메일 문장 완성',
                domain: ['email'],
                formalLevel: FormalLevel.BUSINESS,
                testGroup: 'control',
                version: '1.0'
            },
            // 이메일 템플릿 - 변형 A (상세 지시 포함)
            'email-variant-a': {
                name: 'email-variant-a',
                template: '다음은 {formalLevel} 이메일입니다. 문맥을 파악하여 {intent} 목적에 맞는 다음 내용을 {tone} 어조로 작성해주세요:\n\n{context}\n\n다음 내용:',
                description: '이메일 문장 완성 (상세 지시 변형)',
                domain: ['email'],
                formalLevel: FormalLevel.BUSINESS,
                testGroup: 'variant-a',
                version: '1.0'
            },
            // 이메일 템플릿 - 변형 B (역할 플레이 포함)
            'email-variant-b': {
                name: 'email-variant-b',
                template: '당신은 {domain} 분야의 전문가입니다. 다음 {formalLevel} 이메일을 {role}의 입장에서 이어서 작성해주세요:\n\n{context}\n\n계속:',
                description: '이메일 문장 완성 (역할 기반 변형)',
                domain: ['email'],
                formalLevel: FormalLevel.BUSINESS,
                testGroup: 'variant-b',
                version: '1.0'
            },
            // 비즈니스 문서 템플릿
            'business': {
                name: 'business',
                template: '다음은 비즈니스 문서입니다. 전문적이고 정중한 어조로 이어질 내용을 작성해주세요:\n\n{context}',
                description: '비즈니스 문서 완성',
                domain: ['crm', 'document'],
                formalLevel: FormalLevel.BUSINESS,
                version: '1.0'
            },
            // 기술 문서 템플릿
            'technical': {
                name: 'technical',
                template: '다음은 기술 문서입니다. 명확하고 정확한 정보를 제공하는 내용을 이어서 작성해주세요:\n\n{context}',
                description: '기술 문서 완성',
                domain: ['document'],
                intentCompatibility: ['writing', 'explaining'],
                version: '1.0'
            },
            // 채팅 템플릿
            'chat': {
                name: 'chat',
                template: '다음은 {formalLevel} 대화입니다. 자연스러운 응답을 생성해주세요:\n\n{context}',
                description: '대화 응답 생성',
                domain: ['social', 'chat'],
                formalLevel: FormalLevel.CASUAL,
                version: '1.0'
            },
            // 답변 템플릿
            'reply': {
                name: 'reply',
                template: '다음 메시지에 대한 {formalLevel} 답변을 작성해주세요:\n\n{context}',
                description: '메시지 답변 작성',
                domain: ['email', 'social'],
                formalLevel: FormalLevel.NEUTRAL,
                version: '1.0'
            },
            // 요약 템플릿
            'summary': {
                name: 'summary',
                template: '다음 내용을 간결하게 요약해주세요:\n\n{context}',
                description: '내용 요약',
                intentCompatibility: ['summarizing'],
                version: '1.0'
            },
            // 브레인스토밍 템플릿
            'brainstorm': {
                name: 'brainstorm',
                template: '다음 주제에 대한 창의적인 아이디어를 생성해주세요:\n\n{context}',
                description: '아이디어 브레인스토밍',
                intentCompatibility: ['ideating', 'creating'],
                version: '1.0'
            }
        };
        // 각 템플릿에 대한 테스트 결과 초기화
        Object.keys(this.templates).forEach(key => {
            const template = this.templates[key];
            if (template.testGroup) {
                this.testResults[template.name] = {
                    templateName: template.name,
                    testGroup: template.testGroup,
                    impressions: 0,
                    accepts: 0,
                    rejects: 0,
                    averageResponseTime: 0,
                    lastUpdated: new Date()
                };
            }
        });
    }
    /**
     * 템플릿 추가
     * @param template 추가할 프롬프트 템플릿
     */
    addTemplate(template) {
        this.templates[template.name] = template;
        // 템플릿이 테스트 그룹에 속하면 테스트 결과 초기화
        if (template.testGroup) {
            this.testResults[template.name] = {
                templateName: template.name,
                testGroup: template.testGroup,
                impressions: 0,
                accepts: 0,
                rejects: 0,
                averageResponseTime: 0,
                lastUpdated: new Date()
            };
        }
    }
    /**
     * 템플릿 가져오기
     * @param name 템플릿 이름
     * @returns 프롬프트 템플릿 또는 기본 템플릿
     */
    getTemplate(name) {
        return this.templates[name] || this.defaultTemplate;
    }
    /**
     * 도메인 기반 최적 템플릿 찾기
     * @param domain 도메인 이름
     * @param intent 사용자 의도 (선택사항)
     * @param testGroup 테스트 그룹 (선택사항)
     * @returns 적합한 템플릿 또는 기본 템플릿
     */
    findTemplateForDomain(domain, intent, testGroup) {
        // 테스트 그룹과 도메인, 의도를 모두 만족하는 템플릿 검색
        if (testGroup) {
            for (const template of Object.values(this.templates)) {
                if (template.domain &&
                    template.domain.includes(domain) &&
                    template.testGroup === testGroup &&
                    (!intent || !template.intentCompatibility || template.intentCompatibility.includes(intent))) {
                    return template;
                }
            }
        }
        // 도메인과 의도를 만족하는 템플릿 검색
        if (intent) {
            for (const template of Object.values(this.templates)) {
                if (template.domain &&
                    template.domain.includes(domain) &&
                    template.intentCompatibility &&
                    template.intentCompatibility.includes(intent)) {
                    return template;
                }
            }
        }
        // 도메인만 만족하는 템플릿 검색
        for (const template of Object.values(this.templates)) {
            if (template.domain && template.domain.includes(domain)) {
                return template;
            }
        }
        // 적합한 템플릿이 없으면 기본 템플릿 반환
        return this.defaultTemplate;
    }
    /**
     * 테스트 그룹에 적합한 템플릿 선택
     * @param baseName 기본 템플릿 이름
     * @param testGroup 테스트 그룹 (없으면 무작위 선택)
     * @returns 선택된 템플릿
     */
    getTemplateForTestGroup(baseName, testGroup) {
        // 테스트 그룹이 지정되지 않았으면 무작위 선택
        if (!testGroup) {
            testGroup = this.activeTestGroups[Math.floor(Math.random() * this.activeTestGroups.length)];
        }
        // 기본 템플릿이 컨트롤 그룹이면 그대로 반환
        if (this.templates[baseName].testGroup === 'control' && testGroup === 'control') {
            return this.templates[baseName];
        }
        // 테스트 그룹에 맞는 변형 템플릿 찾기
        const variantName = `${baseName}-${testGroup}`;
        return this.templates[variantName] || this.templates[baseName];
    }
    /**
     * A/B 테스트 이벤트 기록
     * @param templateName 템플릿 이름
     * @param eventType 이벤트 유형 ('impression', 'accept', 'reject')
     * @param responseTime 응답 시간 (ms)
     */
    recordTestEvent(templateName, eventType, responseTime) {
        const template = this.templates[templateName];
        if (!template || !template.testGroup) {
            return;
        }
        const result = this.testResults[templateName];
        if (!result) {
            return;
        }
        // 이벤트 유형에 따라 카운트 증가
        switch (eventType) {
            case 'impression':
                result.impressions++;
                break;
            case 'accept':
                result.accepts++;
                break;
            case 'reject':
                result.rejects++;
                break;
        }
        // 응답 시간 업데이트
        if (responseTime !== undefined) {
            const oldTotal = result.averageResponseTime * (result.impressions - 1);
            result.averageResponseTime = (oldTotal + responseTime) / result.impressions;
        }
        result.lastUpdated = new Date();
        // 나중에 서버에 결과 전송 로직 추가
    }
    /**
     * 격식 수준에 따른 설명 가져오기
     * @param level 격식 수준
     * @returns 격식 수준 설명
     */
    getFormalLevelDescription(level) {
        switch (level) {
            case FormalLevel.CASUAL:
                return '친근한';
            case FormalLevel.NEUTRAL:
                return '일반적인';
            case FormalLevel.FORMAL:
                return '격식있는';
            case FormalLevel.BUSINESS:
                return '비즈니스';
            default:
                return '일반적인';
        }
    }
    /**
     * 의도에 따른 설명 가져오기
     * @param intent 사용자 의도
     * @returns 의도 설명
     */
    getIntentDescription(intent) {
        if (!intent) {
            return '작성';
        }
        switch (intent) {
            case 'writing':
                return '작성';
            case 'replying':
                return '답변';
            case 'summarizing':
                return '요약';
            case 'explaining':
                return '설명';
            case 'requesting':
                return '요청';
            case 'greeting':
                return '인사';
            case 'scheduling':
                return '일정 조율';
            case 'inquiring':
                return '문의';
            case 'thanking':
                return '감사';
            case 'ideating':
                return '아이디어 생성';
            case 'creating':
                return '창작';
            default:
                return intent;
        }
    }
    /**
     * 어조 수정자 설명 생성
     * @param toneModifiers 어조 수정자 배열
     * @returns 어조 설명
     */
    getToneDescription(toneModifiers) {
        if (!toneModifiers || toneModifiers.length === 0) {
            return '적절한';
        }
        return toneModifiers.join('하고 ');
    }
    /**
     * 역할 설명 결정
     * @param domain 도메인
     * @returns 적절한 역할 설명
     */
    getRoleDescription(domain) {
        if (!domain) {
            return '전문가';
        }
        switch (domain) {
            case 'legal':
                return '법률 전문가';
            case 'tech':
                return '기술 전문가';
            case 'medical':
                return '의료 전문가';
            case 'finance':
                return '금융 전문가';
            case 'hr':
                return '인사 담당자';
            case 'marketing':
                return '마케팅 전문가';
            case 'customer_support':
                return '고객 지원 담당자';
            case 'education':
                return '교육자';
            default:
                return `${domain} 전문가`;
        }
    }
    /**
     * 컨텍스트로부터 프롬프트 생성
     * @param context 입력 컨텍스트
     * @param templateName 템플릿 이름 (선택사항)
     * @param options 프롬프트 옵션 (선택사항)
     * @returns 생성된 프롬프트
     */
    buildPrompt(context, templateName, options) {
        // 컨텍스트 확인
        if (!context || context.trim() === '') {
            throw new Error('유효한 컨텍스트가 필요합니다');
        }
        // 옵션 기본값 설정
        const defaultOptions = {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 100,
            formalLevel: FormalLevel.NEUTRAL,
            language: 'ko'
        };
        // 옵션 병합
        const mergedOptions = { ...defaultOptions, ...options };
        // 템플릿 선택
        let template;
        if (templateName && this.templates[templateName]) {
            // A/B 테스트 그룹이 지정되었으면 해당 그룹의 템플릿 선택
            if (mergedOptions.testGroup && templateName === 'email') {
                template = this.getTemplateForTestGroup(templateName, mergedOptions.testGroup);
                // 노출 이벤트 기록
                this.recordTestEvent(template.name, 'impression');
            }
            else {
                // 지정된 템플릿 사용
                template = this.templates[templateName];
            }
        }
        else if (mergedOptions.domainContext) {
            // 도메인 및 의도 기반 템플릿 선택
            template = this.findTemplateForDomain(mergedOptions.domainContext, mergedOptions.userIntent, mergedOptions.testGroup);
        }
        else {
            // 기본 템플릿 사용
            template = this.defaultTemplate;
        }
        // 템플릿의 격식 수준이 지정되어 있으면 사용
        if (template.formalLevel && !options?.formalLevel) {
            mergedOptions.formalLevel = template.formalLevel;
        }
        // 격식 수준 설명 가져오기
        const formalLevelDescription = this.getFormalLevelDescription(mergedOptions.formalLevel);
        // 의도 설명 가져오기
        const intentDescription = this.getIntentDescription(mergedOptions.userIntent);
        // 어조 설명 가져오기
        const toneDescription = this.getToneDescription(mergedOptions.toneModifiers);
        // 역할 설명 가져오기
        const roleDescription = this.getRoleDescription(mergedOptions.domain);
        // 템플릿에 변수 주입
        let prompt = template.template
            .replace('{context}', context)
            .replace('{formalLevel}', formalLevelDescription)
            .replace('{intent}', intentDescription)
            .replace('{tone}', toneDescription)
            .replace('{role}', roleDescription)
            .replace('{domain}', mergedOptions.domain || '일반');
        // 한국어가 아닌 경우 언어 지정
        if (mergedOptions.language && mergedOptions.language !== 'ko') {
            prompt = `[${mergedOptions.language}로 응답] ${prompt}`;
        }
        return prompt;
    }
    /**
     * CLOVA API 요청 파라미터 생성
     * @param prompt 생성된 프롬프트
     * @param options 프롬프트 옵션 (선택사항)
     * @returns API 요청 파라미터
     */
    buildRequestParams(prompt, options) {
        // 기본 옵션 설정
        const defaultOptions = {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 100
        };
        // 옵션 병합
        const mergedOptions = { ...defaultOptions, ...options };
        // API 요청 파라미터 구성
        const params = {
            prompt: prompt,
            max_tokens: mergedOptions.maxTokens,
            temperature: mergedOptions.temperature,
            top_p: mergedOptions.topP
        };
        // 생성 중단 시퀀스 추가
        if (mergedOptions.stopSequences && mergedOptions.stopSequences.length > 0) {
            params.stop_sequences = mergedOptions.stopSequences;
        }
        return params;
    }
    /**
     * 테스트 결과 보고서 생성
     * @returns A/B 테스트 결과 보고서
     */
    generateTestReport() {
        const results = Object.values(this.testResults);
        if (results.length === 0) {
            return '기록된 테스트 결과가 없습니다.';
        }
        let report = '# A/B 테스트 결과 보고서\n\n';
        report += '| 템플릿 | 그룹 | 노출 수 | 수락 수 | 거부 수 | 수락률 | 평균 응답 시간 |\n';
        report += '|--------|------|--------|--------|--------|--------|-------------|\n';
        results.forEach(result => {
            const acceptRate = result.impressions > 0
                ? Math.round((result.accepts / result.impressions) * 100)
                : 0;
            report += `| ${result.templateName} | ${result.testGroup} | ${result.impressions} | ${result.accepts} | ${result.rejects} | ${acceptRate}% | ${Math.round(result.averageResponseTime)}ms |\n`;
        });
        return report;
    }
    /**
     * 테스트 결과 데이터 내보내기
     * @returns JSON 형식의 테스트 결과 데이터
     */
    exportTestResults() {
        return JSON.stringify(this.testResults, null, 2);
    }
    /**
     * 최적화된 CLOVA 모델 요청 파라미터 생성
     * @param ctx 문맥 정보 (텍스트, 도메인 등)
     * @returns 최적화된 요청 파라미터
     */
    buildOptimizedRequestParams(ctx) {
        // 기본 파라미터 설정
        const baseParams = {
            temperature: 0.6, // 기본 온도 값 - 일관성 우선
            top_p: 0.85, // 기본 top_p 값
            max_tokens: 100 // 기본 최대 토큰
        };
        // 도메인별 파라미터 최적화
        switch (ctx.domain) {
            case 'email':
                // 이메일은 더 높은 일관성 필요
                return {
                    ...baseParams,
                    temperature: 0.5,
                    top_p: 0.9,
                    max_tokens: 150
                };
            case 'crm':
                // CRM은 전문적인 내용, 짧은 응답
                return {
                    ...baseParams,
                    temperature: 0.4,
                    max_tokens: 80
                };
            case 'chat':
                // 채팅은 더 창의적인 응답 허용
                return {
                    ...baseParams,
                    temperature: 0.7,
                    top_p: 0.95,
                    max_tokens: 120
                };
            case 'document':
                // 문서는 맥락을 더 활용해야 함
                return {
                    ...baseParams,
                    temperature: 0.6,
                    max_tokens: 200
                };
            default:
                return baseParams;
        }
    }
    /**
     * 도메인 컨텍스트 자동 감지
     * @param text 입력 텍스트
     * @returns 감지된 도메인
     */
    detectDomainFromText(text) {
        const lowerText = text.toLowerCase();
        // 이메일 감지
        if (lowerText.includes('@') ||
            lowerText.includes('보낸 사람:') ||
            lowerText.includes('받는 사람:') ||
            lowerText.includes('제목:') ||
            lowerText.includes('안녕하세요')) {
            return 'email';
        }
        // CRM 감지
        if (lowerText.includes('고객') ||
            lowerText.includes('계약') ||
            lowerText.includes('매출') ||
            lowerText.includes('담당자') ||
            lowerText.includes('영업')) {
            return 'crm';
        }
        // 채팅 감지
        if (lowerText.includes('ㅋㅋ') ||
            lowerText.includes('ㅎㅎ') ||
            lowerText.includes('?!') ||
            lowerText.includes('채팅') ||
            lowerText.match(/[!?]{2,}/)) {
            return 'chat';
        }
        // 기본값
        return 'document';
    }
    /**
     * 텍스트 길이 제한 및 최적화
     * @param text 입력 텍스트
     * @param maxLength 최대 길이
     * @returns 최적화된 텍스트
     */
    optimizeTextLength(text, maxLength = 500) {
        if (text.length <= maxLength) {
            return text;
        }
        // 텍스트가 너무 길면 자르되, 문장 경계에서 자름
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        let result = '';
        for (const sentence of sentences) {
            if ((result + sentence).length <= maxLength) {
                result += sentence;
            }
            else {
                break;
            }
        }
        // 문장 경계로 자를 수 없으면 그냥 자름
        if (!result) {
            result = text.substring(0, maxLength);
        }
        return result;
    }
}
// 기본 인스턴스 생성 및 내보내기
const promptBuilder = new PromptBuilder();


/***/ }),

/***/ "./src/utils/template-cache.ts":
/*!*************************************!*\
  !*** ./src/utils/template-cache.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TemplateCache: () => (/* binding */ TemplateCache)
/* harmony export */ });
/**
 * 템플릿 캐시 유틸리티 - 템플릿 로컬 저장 및 관리
 */
/**
 * 템플릿 캐시 클래스
 * 템플릿을 로컬에 저장하고 관리하는 기능 제공
 */
class TemplateCache {
    /**
     * 템플릿 배열을 캐시에 저장
     * @param templates 저장할 템플릿 배열
     * @param userId 사용자 ID (선택사항)
     * @returns 성공 여부
     */
    static async saveTemplates(templates, userId = null) {
        try {
            // 크롬 스토리지에 템플릿 데이터 저장
            await chrome.storage.local.set({ [this.CACHE_KEY]: templates });
            // 캐시 상태 정보 업데이트
            const cacheStatus = {
                lastUpdated: Date.now(),
                userId,
                count: templates.length
            };
            await chrome.storage.local.set({ [this.CACHE_STATUS_KEY]: cacheStatus });
            return true;
        }
        catch (error) {
            console.error('템플릿 캐시 저장 오류:', error);
            return false;
        }
    }
    /**
     * 캐시에서 템플릿 배열 가져오기
     * @returns 템플릿 배열 또는 null (캐시가 없거나 만료된 경우)
     */
    static async getTemplates() {
        try {
            // 캐시 상태 확인
            const result = await chrome.storage.local.get([this.CACHE_KEY, this.CACHE_STATUS_KEY]);
            const cacheStatus = result[this.CACHE_STATUS_KEY];
            const templates = result[this.CACHE_KEY];
            // 캐시가 없거나 만료된 경우
            if (!cacheStatus || !templates || templates.length === 0) {
                return null;
            }
            // 캐시 만료 확인
            const cacheAge = Date.now() - cacheStatus.lastUpdated;
            if (cacheAge > this.MAX_CACHE_AGE_MS) {
                return null;
            }
            return templates;
        }
        catch (error) {
            console.error('템플릿 캐시 조회 오류:', error);
            return null;
        }
    }
    /**
     * 캐시 상태 정보 조회
     * @returns 캐시 상태 정보 또는 null
     */
    static async getCacheStatus() {
        try {
            const result = await chrome.storage.local.get(this.CACHE_STATUS_KEY);
            return result[this.CACHE_STATUS_KEY] || null;
        }
        catch (error) {
            console.error('캐시 상태 조회 오류:', error);
            return null;
        }
    }
    /**
     * 캐시 만료 여부 확인
     * @returns 만료 여부 (true: 만료됨, false: 유효함)
     */
    static async isCacheExpired() {
        const cacheStatus = await this.getCacheStatus();
        if (!cacheStatus) {
            return true;
        }
        const cacheAge = Date.now() - cacheStatus.lastUpdated;
        return cacheAge > this.MAX_CACHE_AGE_MS;
    }
    /**
     * 캐시가 비어있는지 확인
     * @returns 비어있는지 여부 (true: 비어있음, false: 데이터 있음)
     */
    static async isCacheEmpty() {
        const cacheStatus = await this.getCacheStatus();
        if (!cacheStatus) {
            return true;
        }
        return cacheStatus.count === 0;
    }
    /**
     * 특정 템플릿 사용 횟수 증가
     * @param templateId 증가시킬 템플릿 ID
     * @returns 성공 여부
     */
    static async incrementTemplateUsage(templateId) {
        try {
            // 캐시에서 템플릿 가져오기
            const templates = await this.getTemplates();
            if (!templates) {
                return false;
            }
            // 템플릿 찾기
            const templateIndex = templates.findIndex(t => t.id === templateId);
            if (templateIndex === -1) {
                return false;
            }
            // 사용 횟수 증가
            const template = templates[templateIndex];
            template.useCount = (template.useCount || 0) + 1;
            templates[templateIndex] = template;
            // 업데이트된 템플릿 저장
            const status = await this.getCacheStatus();
            return await this.saveTemplates(templates, status?.userId || null);
        }
        catch (error) {
            console.error('템플릿 사용 횟수 업데이트 오류:', error);
            return false;
        }
    }
    /**
     * 캐시 삭제
     * @returns 성공 여부
     */
    static async clearCache() {
        try {
            await chrome.storage.local.remove([this.CACHE_KEY, this.CACHE_STATUS_KEY]);
            return true;
        }
        catch (error) {
            console.error('캐시 삭제 오류:', error);
            return false;
        }
    }
}
TemplateCache.CACHE_KEY = 'template_cache_data';
TemplateCache.CACHE_STATUS_KEY = 'template_cache_status';
TemplateCache.MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24시간


/***/ }),

/***/ "./src/utils/template-matcher.ts":
/*!***************************************!*\
  !*** ./src/utils/template-matcher.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TemplateMatcher: () => (/* binding */ TemplateMatcher)
/* harmony export */ });
/**
 * 템플릿 매칭 유틸리티 - 키워드를 기반으로 템플릿 매칭 및 랭킹
 */
/**
 * 템플릿 매칭 클래스
 */
class TemplateMatcher {
    constructor(templates = []) {
        this.templates = [];
        this.templates = templates;
    }
    setTemplates(templates) {
        this.templates = templates;
    }
    findMatches(query) {
        if (!query || !query.startsWith('/'))
            return [];
        const searchTerm = query.slice(1).toLowerCase();
        if (!searchTerm)
            return this.templates;
        return this.templates
            .map(template => ({
            template,
            score: this.calculateMatchScore(template, searchTerm)
        }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ template }) => template);
    }
    calculateMatchScore(template, searchTerm) {
        let score = 0;
        const name = (template.title || template.name).toLowerCase();
        const content = template.content.toLowerCase();
        const shortcut = template.shortcut?.toLowerCase() || '';
        // 정확한 단축키 매칭
        if (shortcut === searchTerm) {
            score += 100;
        }
        // 단축키로 시작하는 경우
        else if (shortcut.startsWith(searchTerm)) {
            score += 80;
        }
        // 제목/이름 정확히 일치
        if (name === searchTerm) {
            score += 50;
        }
        // 제목/이름이 검색어로 시작하는 경우
        else if (name.startsWith(searchTerm)) {
            score += 40;
        }
        // 제목/이름에 검색어가 포함된 경우
        else if (name.includes(searchTerm)) {
            score += 30;
        }
        // 내용에 정확히 일치하는 경우
        if (content.includes(` ${searchTerm} `)) {
            score += 20;
        }
        // 내용에 검색어가 포함된 경우
        else if (content.includes(searchTerm)) {
            score += 10;
        }
        // 카테고리 매칭
        if (template.categories?.some(cat => cat.toLowerCase() === searchTerm ||
            cat.toLowerCase().includes(searchTerm))) {
            score += 25;
        }
        return score;
    }
    getTemplates() {
        return this.templates;
    }
}


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
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _adapters_adapter_registry__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./adapters/adapter-registry */ "./src/content/adapters/adapter-registry.ts");
/* harmony import */ var _focus_tracker__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./focus-tracker */ "./src/content/focus-tracker.ts");
/* harmony import */ var _suggestion_ui__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./suggestion-ui */ "./src/content/suggestion-ui.ts");
/* harmony import */ var _template_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./template-manager */ "./src/content/template-manager.ts");
/* harmony import */ var _context_extractor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./context-extractor */ "./src/content/context-extractor.ts");
/* harmony import */ var _ai_completion_handler__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ai-completion-handler */ "./src/content/ai-completion-handler.ts");
/**
 * 콘텐츠 스크립트 - 웹 페이지 내 텍스트 입력 필드 감지 및 상호작용
 */






// 디바운스 함수 구현
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), wait);
    };
}
// 문장 자동 완성 제안 요청
async function requestPrediction(text) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'PREDICT_TEXT', context: text }, (response) => {
            if (response && response.prediction) {
                resolve(response.prediction);
            }
            else {
                resolve('');
            }
        });
    });
}
// 어댑터 레지스트리 초기화
const adapterRegistry = new _adapters_adapter_registry__WEBPACK_IMPORTED_MODULE_0__.AdapterRegistry();
// 현재 키워드 상태 관리
let currentKeywordMatch = null;
let isShowingTemplates = false;
// 템플릿 매니저 초기화
const templateManager = new _template_manager__WEBPACK_IMPORTED_MODULE_3__.TemplateManager({
    keywordPrefixes: ['/'],
    maxKeywordLength: 30,
    contextWindowSize: 150
});
// 템플릿 삽입 처리 함수 선언
let insertTemplate;
// 제안 UI 생성
const suggestionUIInstance = (0,_suggestion_ui__WEBPACK_IMPORTED_MODULE_2__.setupSuggestionUI)({
    onSuggestionSelect: (text, element) => {
        adapterRegistry.insertText(element, text);
    },
    onTemplateSelect: (template, element) => {
        insertTemplate(template, element);
    },
    adapterRegistry: adapterRegistry
});
// 템플릿 삽입 처리 함수 정의
insertTemplate = (template, element) => {
    if (!currentKeywordMatch)
        return;
    // 템플릿 삽입 요청
    const templateId = template.id;
    // Chrome 메시지를 통해 템플릿 정보 요청
    chrome.runtime.sendMessage({ type: 'SELECT_TEMPLATE', templateId }, (response) => {
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
                        function findTextPosition(node, targetOffset, isStart) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                const textLength = node.textContent?.length || 0;
                                if (targetOffset <= textLength) {
                                    if (isStart) {
                                        startNode = node;
                                        startOffset = targetOffset;
                                    }
                                    else {
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
                        }
                        else {
                            // 대체 방법: 어댑터 이용
                            adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
                        }
                    }
                }
                else {
                    // 기본 방법: 어댑터 이용
                    adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
                }
            }
            catch (error) {
                console.error('템플릿 대체 중 오류 발생:', error);
                // 문제 발생 시 기본 방법 시도
                try {
                    adapterRegistry.insertText(element, text.substring(0, position.start) + response.prediction + text.substring(position.end));
                }
                catch (fallbackError) {
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
    });
};
// AI 자동완성 핸들러 생성
const completionHandler = new _ai_completion_handler__WEBPACK_IMPORTED_MODULE_5__.AICompletionHandler(suggestionUIInstance, {
    completionThrottleMs: 800 // 입력 후 0.8초 후 자동완성 요청
});
/**
 * 확장 프로그램 초기화
 */
function initialize() {
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
function loadSettings() {
    // 로컬 스토리지에서 설정 로드
    chrome.storage.local.get(['enabled', 'domains'], (result) => {
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
function setupMessageListeners() {
    // 백그라운드 스크립트로부터 메시지 수신
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    const element = event.target;
    // 입력 필드인지 확인 (이미 AICompletionHandler에서 처리)
    if (!element || !_context_extractor__WEBPACK_IMPORTED_MODULE_4__.contextExtractor.isInputField(element)) {
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
const handleTextChanged = debounce(async (element) => {
    const text = adapterRegistry.getText(element);
    const cursorPosition = getCurrentCursorPosition(element);
    if (!text || cursorPosition === undefined)
        return;
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
        }
        else if (!searchResult.isLoading && !searchResult.error) {
            suggestionUIInstance.hide();
            isShowingTemplates = false;
        }
    }
    else if (isShowingTemplates) {
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
function getCurrentCursorPosition(element) {
    // 어댑터에서 텍스트 가져오기
    const text = adapterRegistry.getText(element);
    // 브라우저 실행 환경에 따라 처리
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return element.selectionStart ?? undefined;
    }
    else if (element.isContentEditable) {
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
const focusTracker = new _focus_tracker__WEBPACK_IMPORTED_MODULE_1__.FocusTracker(adapterRegistry, {
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
    const target = event.target;
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
(async function () {
    console.log('AI 문장 자동완성 어시스턴트가 활성화되었습니다');
    // 초기화 함수 호출
    initialize();
    // 초기 로딩 완료 메시지
    console.log('AI 문장 자동완성 어시스턴트가 준비되었습니다.');
})();

})();

/******/ })()
;
//# sourceMappingURL=content.js.map