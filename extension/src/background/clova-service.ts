/**
 * CLOVA API 서비스 - 백그라운드 스크립트에서 백엔드 API를 호출하는 기능 담당
 */

// Chrome API 타입 선언
declare const chrome: {
  storage: {
    local: {
      get: (keys: string[], callback: (items: Record<string, any>) => void) => void;
      set: (items: Record<string, any>) => void;
    }
  }
};

// API 응답 타입
interface ApiResponse<T> {
  status: {
    code: string;
    message: string;
  };
  result?: T;
}

// 예측 요청 파라미터
interface PredictRequestParams {
  context: string;
  keyword?: string;
  domain?: string;
  max_tokens?: number;
}

// 예측 응답 타입
interface PredictResponseData {
  generated_text: string;
  context: string;
  keyword?: string;
  template_id?: string;
  is_template: boolean;
}

// 템플릿 매칭 요청 파라미터
interface TemplateMatchRequestParams {
  keyword: string;
  limit?: number;
}

// 템플릿 매칭 응답 데이터
interface TemplateMatchResponseData {
  templates: Array<{
    id: string;
    title: string;
    content: string;
    keyword: string;
    usage_count: number;
    is_owned: boolean;
  }>;
  keyword: string;
}

/**
 * CLOVA API 서비스 클래스
 * 백그라운드 스크립트에서 백엔드 API를 직접 호출
 */
export class ClovaService {
  private baseUrl: string;
  private apiKey: string | null = null;
  private userToken: string | null = null;
  
  /**
   * CLOVA 서비스 생성자
   * @param baseUrl API 기본 URL (기본값: 백엔드 API URL)
   */
  constructor(baseUrl: string = 'https://api.assistant.example.com') {
    this.baseUrl = baseUrl;
    
    // 저장된 설정 로드
    this.loadSettings();
  }
  
  /**
   * 저장된 설정 로드
   */
  private loadSettings(): void {
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
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    chrome.storage.local.set({ apiKey });
  }
  
  /**
   * 사용자 토큰 설정
   * @param token 사용자 인증 토큰
   */
  setUserToken(token: string): void {
    this.userToken = token;
    chrome.storage.local.set({ userToken: token });
  }
  
  /**
   * API 기본 URL 설정
   * @param url API 기본 URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
    chrome.storage.local.set({ apiBaseUrl: url });
  }
  
  /**
   * API 요청 헤더 생성
   * @returns 요청 헤더 객체
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
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
  private async fetchApi<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const options: RequestInit = {
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
      
      const apiResponse = await response.json() as ApiResponse<T>;
      
      // 에러 응답 처리
      if (!response.ok || apiResponse.status.code !== '20000') {
        throw new Error(apiResponse.status.message || '알 수 없는 오류');
      }
      
      return apiResponse.result as T;
    } catch (error) {
      console.error('API 요청 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 텍스트 예측 API 호출
   * @param params 예측 요청 파라미터
   * @returns 예측 결과 Promise
   */
  async predictText(params: PredictRequestParams): Promise<PredictResponseData> {
    try {
      return await this.fetchApi<PredictResponseData>('/predict', 'POST', params);
    } catch (error) {
      console.error('텍스트 예측 요청 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 템플릿 매칭 API 호출
   * @param params 템플릿 매칭 요청 파라미터
   * @returns 템플릿 매칭 결과 Promise
   */
  async matchTemplates(params: TemplateMatchRequestParams): Promise<TemplateMatchResponseData> {
    try {
      return await this.fetchApi<TemplateMatchResponseData>('/match-templates', 'POST', params);
    } catch (error) {
      console.error('템플릿 매칭 요청 중 오류 발생:', error);
      throw error;
    }
  }
  
  /**
   * 템플릿 선택 API 호출
   * @param templateId 선택한 템플릿 ID
   * @returns 선택 결과 Promise
   */
  async selectTemplate(templateId: string): Promise<PredictResponseData> {
    try {
      return await this.fetchApi<PredictResponseData>(`/select-template/${templateId}`, 'POST');
    } catch (error) {
      console.error('템플릿 선택 요청 중 오류 발생:', error);
      throw error;
    }
  }
}

// 서비스 인스턴스 생성 및 내보내기
export const clovaService = new ClovaService(); 