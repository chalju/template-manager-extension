/**
 * 템플릿 캐시 유틸리티 - 템플릿 로컬 저장 및 관리
 */

import { Template } from './template-matcher';

// Chrome API 타입 선언 (타입스크립트 컴파일러에게 chrome 객체가 존재함을 알림)
// @ts-ignore
declare const chrome: any;

/**
 * 캐시 상태 인터페이스
 */
interface CacheStatus {
  lastUpdated: number;   // 마지막 업데이트 타임스탬프
  userId: string | null; // 사용자 ID
  count: number;         // 캐시된 템플릿 수
}

/**
 * 템플릿 캐시 클래스
 * 템플릿을 로컬에 저장하고 관리하는 기능 제공
 */
export class TemplateCache {
  private static readonly CACHE_KEY = 'template_cache_data';
  private static readonly CACHE_STATUS_KEY = 'template_cache_status';
  private static readonly MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24시간
  
  /**
   * 템플릿 배열을 캐시에 저장
   * @param templates 저장할 템플릿 배열
   * @param userId 사용자 ID (선택사항)
   * @returns 성공 여부
   */
  static async saveTemplates(templates: Template[], userId: string | null = null): Promise<boolean> {
    try {
      // 크롬 스토리지에 템플릿 데이터 저장
      await chrome.storage.local.set({ [this.CACHE_KEY]: templates });
      
      // 캐시 상태 정보 업데이트
      const cacheStatus: CacheStatus = {
        lastUpdated: Date.now(),
        userId,
        count: templates.length
      };
      
      await chrome.storage.local.set({ [this.CACHE_STATUS_KEY]: cacheStatus });
      return true;
    } catch (error) {
      console.error('템플릿 캐시 저장 오류:', error);
      return false;
    }
  }
  
  /**
   * 캐시에서 템플릿 배열 가져오기
   * @returns 템플릿 배열 또는 null (캐시가 없거나 만료된 경우)
   */
  static async getTemplates(): Promise<Template[] | null> {
    try {
      // 캐시 상태 확인
      const result = await chrome.storage.local.get([this.CACHE_KEY, this.CACHE_STATUS_KEY]);
      const cacheStatus = result[this.CACHE_STATUS_KEY] as CacheStatus | undefined;
      const templates = result[this.CACHE_KEY] as Template[] | undefined;
      
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
    } catch (error) {
      console.error('템플릿 캐시 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 캐시 상태 정보 조회
   * @returns 캐시 상태 정보 또는 null
   */
  static async getCacheStatus(): Promise<CacheStatus | null> {
    try {
      const result = await chrome.storage.local.get(this.CACHE_STATUS_KEY);
      return result[this.CACHE_STATUS_KEY] as CacheStatus || null;
    } catch (error) {
      console.error('캐시 상태 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 캐시 만료 여부 확인
   * @returns 만료 여부 (true: 만료됨, false: 유효함)
   */
  static async isCacheExpired(): Promise<boolean> {
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
  static async isCacheEmpty(): Promise<boolean> {
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
  static async incrementTemplateUsage(templateId: string): Promise<boolean> {
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
    } catch (error) {
      console.error('템플릿 사용 횟수 업데이트 오류:', error);
      return false;
    }
  }
  
  /**
   * 캐시 삭제
   * @returns 성공 여부
   */
  static async clearCache(): Promise<boolean> {
    try {
      await chrome.storage.local.remove([this.CACHE_KEY, this.CACHE_STATUS_KEY]);
      return true;
    } catch (error) {
      console.error('캐시 삭제 오류:', error);
      return false;
    }
  }
} 