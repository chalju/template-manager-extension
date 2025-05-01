/**
 * 사용자 설정 인터페이스
 */
export interface UserSettings {
  enableSuggestions: boolean;
  suggestionFrequency: string;
  enableHistory: boolean;
  domains: string[];
  templateIds?: number[];
  autoTriggerDelay?: number;
}

/**
 * 설정 서비스 - 백엔드 API와 통신하여 사용자 설정 관리
 */
class SettingsService {
  private apiUrl: string;
  private offlineMode: boolean = false;
  
  constructor(baseUrl: string = 'http://localhost:8000') {
    this.apiUrl = `${baseUrl}/api/settings`;
  }
  
  /**
   * 인증 토큰 가져오기
   * @returns 저장된 인증 토큰 또는 null
   */
  private async getToken(): Promise<string | null> {
    try {
      console.log('토큰 가져오기 시도...');
      return new Promise<string | null>((resolve, reject) => {
        chrome.storage.local.get('authToken', (result) => {
          if (chrome.runtime.lastError) {
            console.error('토큰 가져오기 오류:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }

          console.log('스토리지에서 가져온 토큰 데이터:', result);
          
          if (!result || !result.authToken) {
            console.warn('인증 토큰이 없습니다. 스토리지 결과:', result);
            resolve(null);
            return;
          }

          // 토큰 형식 검증
          const token = result.authToken;
          if (typeof token !== 'string' || token.trim() === '') {
            console.error('유효하지 않은 토큰 형식:', token);
            resolve(null);
            return;
          }

          console.log('유효한 토큰을 찾았습니다.');
          resolve(token);
        });
      });
    } catch (error) {
      console.error('토큰 가져오기 예외:', error);
      return null;
    }
  }
  
  /**
   * 요청 헤더 생성
   * @param token 인증 토큰
   * @returns 요청 헤더 객체
   */
  private getHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * 서버에 PING 요청을 보내 연결 상태 확인
   * @returns true: 연결 가능, false: 연결 불가능
   */
  private async checkServerConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/api/settings', '')}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // 3초 타임아웃
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      console.warn('서버 연결 확인 오류:', error);
      this.offlineMode = true;
      return false;
    }
  }
  
  /**
   * 백엔드에서 설정 가져오기
   * @param token 인증 토큰
   * @returns 사용자 설정 객체
   */
  async getSettings(token?: string): Promise<UserSettings> {
    // 오프라인 모드인 경우
    if (this.offlineMode) {
      console.log('오프라인 모드: 로컬 설정 사용');
      const localSettings = await this.loadFromLocalStorage();
      if (localSettings) {
        return localSettings;
      }
      return {
        enableSuggestions: true,
        suggestionFrequency: 'medium',
        enableHistory: true,
        domains: []
      };
    }

    try {
      // 토큰이 제공되지 않은 경우 직접 가져오기
      if (!token) {
        const storedToken = await this.getToken();
        if (storedToken) {
          token = storedToken;
        }
      }

      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 경로 수정: '/settings'를 제거하고 올바른 엔드포인트 사용
      const response = await fetch(`${this.apiUrl}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`설정 가져오기 실패: ${response.status}`);
      }

      const data = await response.json();
      return data as UserSettings;
    } catch (error) {
      console.error('설정 가져오기 오류:', error);
      throw error;
    }
  }
  
  /**
   * 사용자 설정 업데이트
   * @param settings 업데이트할 설정 객체
   * @returns 업데이트된 설정 객체
   */
  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    // 로컬 저장 먼저 실행
    await this.saveToLocalStorage(settings);
    
    // 오프라인 모드인 경우 로컬 설정만 업데이트
    if (this.offlineMode || !(await this.checkServerConnection())) {
      console.info('오프라인 모드로 설정을 저장합니다.');
      return settings;
    }

    try {
      const token = await this.getToken();
      
      // 토큰이 없으면 로컬 저장만 하고 성공 처리
      if (!token) {
        console.info('인증 없이 로컬에만 설정을 저장합니다.');
        return settings;
      }
      
      // 프론트엔드 형식을 API 요청 형식으로 변환
      const requestData = {
        enable_suggestions: settings.enableSuggestions,
        suggestion_frequency: settings.suggestionFrequency,
        enable_history: settings.enableHistory,
        domains: settings.domains,
        template_ids: settings.templateIds,
        auto_trigger_delay: settings.autoTriggerDelay
      };
      
      const response = await fetch(this.apiUrl, {
        method: 'PUT',
        headers: this.getHeaders(token),
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 응답을 프론트엔드 형식으로 변환
      return {
        enableSuggestions: data.enable_suggestions,
        suggestionFrequency: data.suggestion_frequency,
        enableHistory: data.enable_history,
        domains: data.domains || [],
        templateIds: data.template_ids,
        autoTriggerDelay: data.auto_trigger_delay
      };
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
      
      // 오프라인 모드로 전환
      this.offlineMode = true;
      
      // 로컬에 저장한 설정 반환
      return settings;
    }
  }
  
  /**
   * 로컬 스토리지에서 설정 불러오기
   * @returns 저장된 설정 객체
   */
  async loadFromLocalStorage(): Promise<UserSettings | null> {
    try {
      return new Promise<UserSettings | null>((resolve, reject) => {
        chrome.storage.local.get('userSettings', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          if (!result || !result.userSettings) {
            resolve(null);
            return;
          }

          resolve(result.userSettings as UserSettings);
        });
      });
    } catch (error) {
      console.error('로컬 스토리지에서 설정 로드 오류:', error);
      return null;
    }
  }
  
  /**
   * 로컬 스토리지에 설정 저장
   * @param settings 저장할 설정 객체
   */
  async saveToLocalStorage(settings: UserSettings): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ userSettings: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        console.log('로컬 스토리지에 설정 저장 완료');
        resolve();
      });
    });
  }
  
  /**
   * 기본 설정 가져오기
   * @returns 기본 설정 객체
   */
  getDefaultSettings(): UserSettings {
    return {
      enableSuggestions: true,
      suggestionFrequency: 'medium',
      enableHistory: true,
      domains: [],
      autoTriggerDelay: 500
    };
  }
  
  /**
   * 설정 동기화 - 서버와 로컬 저장소 모두 업데이트
   * @returns 동기화된 설정 객체
   */
  async syncSettings(): Promise<UserSettings> {
    try {
      // 토큰 가져오기
      const token = await this.getToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 서버에서 설정 조회
      const settings = await this.getSettings();
      console.log('서버에서 설정 로드 성공', settings);

      // 로컬 스토리지에도 저장
      await this.saveToLocalStorage(settings);

      return settings;
    } catch (error) {
      console.error('설정 동기화 오류:', error);
      
      // 로컬 스토리지에서 시도
      const localSettings = await this.loadFromLocalStorage();
      if (localSettings) {
        console.log('서버 연결 실패, 로컬 설정 사용', localSettings);
        return localSettings;
      }
      
      // 모두 실패하면 기본 설정 반환
      console.log('설정 로드 실패, 기본 설정 사용');
      return {
        enableSuggestions: true,
        suggestionFrequency: 'medium',
        enableHistory: true,
        domains: []
      };
    }
  }

  /**
   * 오프라인 모드 설정
   * @param isOffline 오프라인 모드 활성화 여부
   */
  setOfflineMode(isOffline: boolean): void {
    this.offlineMode = isOffline;
    console.info(`오프라인 모드가 ${isOffline ? '활성화' : '비활성화'}되었습니다.`);
  }

  /**
   * 토큰 유효성 검증
   * @param token 검증할 토큰
   * @returns 토큰이 유효한지 여부
   */
  private async validateToken(token: string): Promise<boolean> {
    if (!token) return false;
    
    try {
      const response = await fetch(`${this.apiUrl.replace('/api/settings', '')}/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('토큰 검증 오류:', error);
      return false;
    }
  }
}

// 기본 인스턴스 내보내기
export const settingsService = new SettingsService(); 