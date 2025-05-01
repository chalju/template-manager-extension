/// <reference types="chrome"/>

/**
 * 인증 서비스 - 로그인 상태와 토큰 관리
 */
class AuthService {
  private static instance: AuthService;
  private isAuthenticated: boolean = false;
  private authStateListeners: ((isAuthenticated: boolean) => void)[] = [];
  private baseUrl: string = 'http://localhost:8000';

  private constructor() {
    // 스토리지 변경 감지
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((
        changes: { [key: string]: chrome.storage.StorageChange },
        namespace: string
      ) => {
        if (namespace === 'local' && changes.authToken) {
          console.log('인증 토큰 변경 감지:', changes.authToken);
          this.validateAndUpdateAuthState();
        }
      });
    }

    // 초기 인증 상태 확인
    this.checkInitialAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async checkInitialAuth(): Promise<void> {
    try {
      await this.validateAndUpdateAuthState();
    } catch (error) {
      console.error('초기 인증 상태 확인 실패:', error);
      this.updateAuthState(false);
    }
  }

  private async validateAndUpdateAuthState(): Promise<void> {
    try {
      const token = await this.getToken();
      console.log('토큰 검증 시작:', token ? '토큰 존재' : '토큰 없음');
      
      if (!token) {
        console.log('토큰 없음, 비인증 상태로 설정');
        this.updateAuthState(false);
        return;
      }

      // 토큰 유효성 검증을 위해 /api/users/me 엔드포인트 사용
      const response = await fetch(`${this.baseUrl}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include' // 쿠키 포함
      });

      if (!response.ok) {
        console.warn('토큰 유효성 검증 실패:', response.status);
        // 401 오류의 경우에만 토큰 삭제
        if (response.status === 401) {
          console.log('인증 만료, 토큰 삭제');
          await this.clearToken();
          this.updateAuthState(false);
        }
        return;
      }

      const data = await response.json();
      if (!data || !data.email) {
        console.warn('유효하지 않은 사용자 데이터:', data);
        return;
      }

      // 이메일 정보 업데이트
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ userEmail: data.email }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log('토큰 검증 성공, 인증 상태 업데이트');
      this.updateAuthState(true);
    } catch (error) {
      console.error('토큰 검증 중 오류:', error);
      // 네트워크 오류의 경우 현재 상태 유지
      if (error instanceof TypeError) {
        console.log('네트워크 오류, 현재 상태 유지');
        return;
      }
      this.updateAuthState(false);
    }
  }

  private updateAuthState(newState: boolean): void {
    console.log('인증 상태 업데이트:', newState);
    const stateChanged = this.isAuthenticated !== newState;
    this.isAuthenticated = newState;
    
    if (stateChanged) {
      console.log('인증 상태 변경됨, 리스너 알림');
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(this.isAuthenticated);
      } catch (error) {
        console.error('리스너 실행 중 오류:', error);
      }
    });
  }

  async getToken(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('authToken', (result) => {
        if (chrome.runtime.lastError) {
          console.error('토큰 가져오기 오류:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (!result || !result.authToken) {
          resolve(null);
          return;
        }

        resolve(result.authToken);
      });
    });
  }

  async setToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ authToken: token }, () => {
        if (chrome.runtime.lastError) {
          console.error('토큰 저장 오류:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  async clearToken(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 토큰과 이메일 모두 제거
      chrome.storage.local.remove(['authToken', 'userEmail'], () => {
        if (chrome.runtime.lastError) {
          console.error('토큰 삭제 오류:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  async login(email: string, password: string): Promise<void> {
    console.log('로그인 시도:', email);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '로그인에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error('토큰이 응답에 포함되지 않았습니다.');
      }

      console.log('로그인 성공, 토큰 저장');
      // 토큰 저장
      await this.setToken(data.access_token);
      
      // 이메일 저장
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ 
          userEmail: email,
          loginTimestamp: Date.now() // 로그인 시간 저장
        }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      // 토큰 저장 후 유효성 검증
      await this.validateAndUpdateAuthState();
    } catch (error) {
      console.error('로그인 프로세스 실패:', error);
      await this.clearToken();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        // 서버에 로그아웃 요청
        await fetch(`${this.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }).catch(error => console.warn('로그아웃 요청 실패:', error));
      }
    } finally {
      // 로컬 토큰 삭제
      await this.clearToken();
    }
  }

  // 저장된 이메일 가져오기
  private async getSavedEmail(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('userEmail', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result.userEmail || null);
      });
    });
  }

  async getUserInfo(): Promise<any> {
    const token = await this.getToken();
    const email = await this.getSavedEmail();
    
    if (!token) {
      throw new Error('인증되지 않은 상태입니다.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn(`사용자 정보 요청 실패: ${response.status}`);
        
        // 백엔드 서버 오류(500)인 경우 로컬에 저장된 이메일 정보 활용
        if (response.status === 500 && email) {
          console.log('서버 오류로 인해 로컬 저장 정보 사용:', email);
          return { email, mode: 'offline' };
        }
        
        if (response.status === 401) {
          await this.clearToken();
          throw new Error('인증이 만료되었습니다.');
        }
        
        throw new Error('사용자 정보를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      return {
        ...data,
        email: data.email || email, // 서버 응답에 이메일이 없으면 저장된 이메일 사용
        mode: 'online'
      };
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      // 네트워크 오류 또는 서버 오류의 경우 저장된 이메일로 오프라인 모드 활성화
      if (email) {
        console.log('오류 발생, 오프라인 모드로 전환:', email);
        return { email, mode: 'offline' };
      }
      throw error;
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  onAuthStateChanged(listener: (isAuthenticated: boolean) => void): () => void {
    this.authStateListeners.push(listener);
    
    // 현재 상태로 즉시 호출
    listener(this.isAuthenticated);
    
    // 구독 해제 함수 반환
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  addAuthStateListener(listener: (isAuthenticated: boolean) => void): void {
    this.authStateListeners.push(listener);
  }

  removeAuthStateListener(listener: (isAuthenticated: boolean) => void): void {
    this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
  }
}

export const authService = AuthService.getInstance(); 