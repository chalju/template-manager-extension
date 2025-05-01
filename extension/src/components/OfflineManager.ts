/// <reference types="chrome"/>

import { settingsService } from './SettingsService';
import { templateService } from './TemplateService';
import { authService } from './AuthService';

/**
 * 오프라인 관리자 - 오프라인 모드 상태 동기화
 */
class OfflineManager {
  private static instance: OfflineManager;
  private isOfflineMode: boolean = false;
  private listeners: ((isOffline: boolean) => void)[] = [];
  
  private constructor() {
    this.initializeOfflineMode();
    this.setupNetworkListeners();
  }
  
  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }
  
  /**
   * 초기 오프라인 모드 상태 로드
   */
  private async initializeOfflineMode(): Promise<void> {
    try {
      // 저장된 오프라인 모드 상태 로드
      const result = await new Promise<{offlineMode?: boolean}>((resolve, reject) => {
        chrome.storage.local.get('offlineMode', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(result);
        });
      });
      
      this.setOfflineMode(result.offlineMode || false, false);
      
      // 네트워크 상태 확인
      this.checkNetworkStatus();
    } catch (error) {
      console.error('오프라인 모드 초기화 오류:', error);
    }
  }
  
  /**
   * 네트워크 상태 변경 리스너 설정
   */
  private setupNetworkListeners(): void {
    // 온라인/오프라인 이벤트
    window.addEventListener('online', () => this.checkNetworkStatus());
    window.addEventListener('offline', () => this.setOfflineMode(true, true));
    
    // 스토리지 변경 감지
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.offlineMode) {
        const newValue = changes.offlineMode.newValue;
        if (this.isOfflineMode !== newValue) {
          this.setOfflineMode(newValue, false);
        }
      }
    });
  }
  
  /**
   * 네트워크 상태 확인
   */
  private async checkNetworkStatus(): Promise<void> {
    // 기기가 온라인 상태인지 확인
    if (!navigator.onLine) {
      this.setOfflineMode(true, true);
      return;
    }
    
    try {
      // 백엔드 서버 연결 확인
      const response = await fetch('http://localhost:8000/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (!response.ok) {
        this.setOfflineMode(true, true);
      } else {
        // 수동으로 설정된 오프라인 모드가 아니면 자동으로 온라인으로 전환
        const result = await new Promise<{offlineMode?: boolean}>((resolve) => {
          chrome.storage.local.get('manualOfflineMode', (result) => {
            resolve(result);
          });
        });
        
        if (!result.offlineMode) {
          this.setOfflineMode(false, true);
        }
      }
    } catch (error) {
      console.warn('백엔드 서버 연결 실패:', error);
      this.setOfflineMode(true, true);
    }
  }
  
  /**
   * 오프라인 모드 설정
   * @param isOffline 오프라인 모드 활성화 여부
   * @param updateStorage 스토리지 업데이트 여부
   */
  setOfflineMode(isOffline: boolean, updateStorage: boolean = true): void {
    if (this.isOfflineMode === isOffline) return;
    
    console.log(`오프라인 모드 ${isOffline ? '활성화' : '비활성화'}`);
    this.isOfflineMode = isOffline;
    
    // 관련 서비스에 상태 전파
    settingsService.setOfflineMode(isOffline);
    templateService.setOfflineMode(isOffline);
    
    // 스토리지 업데이트
    if (updateStorage) {
      chrome.storage.local.set({ 
        offlineMode: isOffline,
        manualOfflineMode: isOffline && updateStorage // 수동으로 설정한 경우 표시
      });
    }
    
    // 리스너 알림
    this.notifyListeners();
  }
  
  /**
   * 현재 오프라인 모드 상태 반환
   */
  isOffline(): boolean {
    return this.isOfflineMode;
  }
  
  /**
   * 오프라인 모드 리스너 등록
   * @param listener 콜백 함수
   * @returns 리스너 제거 함수
   */
  addOfflineModeListener(listener: (isOffline: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // 현재 상태로 즉시 호출
    listener(this.isOfflineMode);
    
    // 구독 해제 함수 반환
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 수동으로 네트워크 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    await this.checkNetworkStatus();
    return !this.isOfflineMode;
  }
  
  /**
   * 모든 리스너에게 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOfflineMode);
      } catch (error) {
        console.error('오프라인 모드 리스너 실행 오류:', error);
      }
    });
  }
}

// 기본 인스턴스 내보내기
export const offlineManager = OfflineManager.getInstance(); 