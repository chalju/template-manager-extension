/**
 * CLOVA Studio HCX-005 API 클라이언트 - CLOVA API를 호출하기 위한 클라이언트 유틸리티
 */

// Chrome API 타입 선언 (타입스크립트 컴파일러에게 chrome 객체가 존재함을 알림)
declare const chrome: any;

// API 응답 타입 정의
export interface ClovaAPIResponse {
  generated_text: string;
  context: string;
  keyword?: string;
  template_id?: string;
  is_template: boolean;
}

// API 오류 타입 정의
export interface ClovaAPIError {
  status: number;
  message: string;
}

/**
 * CLOVA Studio HCX-005 API 클라이언트 클래스
 */
export class ClovaApiClient {
  private baseUrl: string;
  private apiUrl: string;
  private apiKey: string | null = null;

  /**
   * CLOVA API 클라이언트 생성자
   * @param baseUrl 기본 API URL (기본값: 백그라운드 스크립트를 통한 프록시)
   */
  constructor(baseUrl: string = '') {
    // 백그라운드 스크립트를 통해 API 호출 (직접 호출하지 않음)
    this.baseUrl = baseUrl || '';
    this.apiUrl = `${this.baseUrl}/predict/complete`;
  }

  /**
   * API 키 설정
   * @param apiKey CLOVA API 키
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 현재 설정된 API 키 반환
   * @returns API 키 또는 null
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * API 키가 설정되어 있는지 확인
   * @returns API 키 설정 여부
   */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  /**
   * 컨텍스트 기반 텍스트 예측 요청
   * @param context 현재 입력 컨텍스트
   * @param keyword 관련 키워드 (선택사항)
   * @param maxTokens 최대 생성 토큰 수 (기본값: 100)
   * @returns 예측 텍스트가 포함된 Promise
   */
  async predictText(
    context: string,
    keyword?: string,
    maxTokens: number = 100
  ): Promise<ClovaAPIResponse> {
    try {
      // 백그라운드 스크립트에 메시지 전송
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'PREDICT_TEXT',
            context,
            keyword,
            maxTokens
          },
          (response: { prediction?: string; error?: string }) => {
            if (response.error) {
              reject({
                status: 500,
                message: response.error
              } as ClovaAPIError);
            } else if (response.prediction) {
              resolve({
                generated_text: response.prediction,
                context: context,
                keyword: keyword,
                is_template: false
              } as ClovaAPIResponse);
            } else {
              reject({
                status: 500,
                message: '알 수 없는 응답 형식'
              } as ClovaAPIError);
            }
          }
        );
      });
    } catch (error) {
      console.error('텍스트 예측 요청 중 오류 발생:', error);
      throw {
        status: 500,
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      } as ClovaAPIError;
    }
  }

  /**
   * 입력 텍스트의 다음 문장 예측
   * @param text 현재 입력 텍스트
   * @param contextWindowSize 컨텍스트 윈도우 크기 (기본값: 250)
   * @returns 예측 텍스트가 포함된 Promise
   */
  async predictNextSentence(
    text: string,
    contextWindowSize: number = 250
  ): Promise<string> {
    // 긴 텍스트의 경우 마지막 부분만 컨텍스트로 사용
    const context = text.length > contextWindowSize
      ? text.slice(text.length - contextWindowSize)
      : text;
    
    try {
      const result = await this.predictText(context);
      return result.generated_text;
    } catch (error) {
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
  async generateCompletion(
    context: string,
    keyword?: string
  ): Promise<ClovaAPIResponse> {
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
        } catch (e) {
          // 템플릿 검색 실패 시 무시하고 텍스트 예측 진행
          console.log('템플릿 검색 실패, 텍스트 예측을 시도합니다:', e);
        }
      }
      
      // 템플릿 없거나 실패 시 텍스트 예측
      return await this.predictText(context, keyword);
    } catch (error) {
      console.error('생성 요청 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 키워드 기반 템플릿 검색
   * @param keyword 검색 키워드
   * @returns 템플릿 매칭 결과 배열을 포함한 Promise
   */
  private async searchTemplates(keyword: string): Promise<any[]> {
    try {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'SEARCH_TEMPLATES',
            keyword: keyword
          },
          (response: { templates?: any[]; error?: string }) => {
            if (response.error) {
              reject(response.error);
            } else if (response.templates) {
              resolve(response.templates);
            } else {
              resolve([]);
            }
          }
        );
      });
    } catch (error) {
      console.error('템플릿 검색 중 오류 발생:', error);
      throw error;
    }
  }
}

// 클라이언트 인스턴스 생성 및 내보내기
export const clovaApiClient = new ClovaApiClient(); 