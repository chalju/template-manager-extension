/**
 * 템플릿 매니저 - 키워드 감지, 템플릿 매칭, 캐싱 관리 통합
 */

import { KeywordDetector, KeywordMatch } from '../utils/keyword-detector';
import { TemplateMatcher, Template, TemplateMatch } from '../utils/template-matcher';
import { TemplateCache } from '../utils/template-cache';

// Chrome API 타입 선언 (타입스크립트 컴파일러에게 chrome 객체가 존재함을 알림)
// @ts-ignore
declare const chrome: any;

// 템플릿 요청 결과 인터페이스
interface TemplateSearchResult {
  isLoading: boolean;
  templates: TemplateMatch[];
  error?: string;
}

/**
 * 템플릿 매니저 클래스
 * 키워드 감지, 템플릿 검색, 캐싱을 통합 관리
 */
export class TemplateManager {
  private keywordDetector: KeywordDetector;
  private templateMatcher: TemplateMatcher;
  private cachedTemplates: Template[] = [];
  private isInitialized: boolean = false;

  /**
   * 템플릿 매니저 생성자
   * @param options 초기화 옵션
   */
  constructor(options?: {
    keywordPrefixes?: string[];
    maxKeywordLength?: number;
    contextWindowSize?: number;
  }) {
    // 키워드 감지기 초기화
    this.keywordDetector = new KeywordDetector({
      prefixes: options?.keywordPrefixes,
      maxKeywordLength: options?.maxKeywordLength,
      contextWindowSize: options?.contextWindowSize
    });
    
    // 템플릿 매처 초기화
    this.templateMatcher = new TemplateMatcher();
  }

  /**
   * 템플릿 매니저 초기화 - 캐시 로드 및 매처 설정
   * @returns 초기화 성공 여부
   */
  async initialize(): Promise<boolean> {
    try {
      // 캐시에서 템플릿 로드 시도
      const cachedTemplates = await TemplateCache.getTemplates();
      
      if (cachedTemplates) {
        this.cachedTemplates = cachedTemplates;
        this.templateMatcher.setTemplates(this.cachedTemplates);
        this.isInitialized = true;
        return true;
      }
      
      // 캐시가 없거나 만료되었으면 새로 로드
      await this.refreshTemplates();
      return this.isInitialized;
    } catch (error) {
      console.error('템플릿 매니저 초기화 오류:', error);
      return false;
    }
  }

  /**
   * 템플릿 캐시 새로고침
   * @returns 성공 여부
   */
  async refreshTemplates(): Promise<boolean> {
    try {
      // 백그라운드 스크립트에 템플릿 목록 요청
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'GET_ALL_TEMPLATES' },
          async (response: { templates?: Template[], error?: string }) => {
            if (response && response.templates) {
              this.cachedTemplates = response.templates;
              
              // 매처에 템플릿 설정
              this.templateMatcher.setTemplates(this.cachedTemplates);
              
              // 캐시에 저장
              await TemplateCache.saveTemplates(this.cachedTemplates);
              
              this.isInitialized = true;
              resolve(true);
            } else {
              console.error('템플릿 로드 오류:', response?.error || '알 수 없는 오류');
              resolve(false);
            }
          }
        );
      });
    } catch (error) {
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
  detectKeyword(text: string, cursorPosition: number): KeywordMatch | null {
    return this.keywordDetector.detectKeyword(text, cursorPosition);
  }

  /**
   * 키워드 매치에 기반한 템플릿 검색
   * @param keywordMatch 키워드 매치 객체
   * @param limit 최대 결과 수
   * @returns 검색 결과 객체 (Promise)
   */
  async searchTemplates(keywordMatch: KeywordMatch, limit: number = 5): Promise<TemplateSearchResult> {
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
    const isCacheExpired = await TemplateCache.isCacheExpired();
    const isCacheEmpty = await TemplateCache.isCacheEmpty();
    
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
      chrome.runtime.sendMessage(
        { 
          type: 'SEARCH_TEMPLATES', 
          keyword: keywordMatch.keyword 
        },
        (response: { templates?: Template[], error?: string }) => {
          if (response && response.templates) {
            // 검색된 템플릿들을 TemplateMatch 형태로 변환
            const matches: TemplateMatch[] = response.templates.map(template => ({
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
          } else {
            resolve({
              isLoading: false,
              templates: [],
              error: response?.error || '템플릿을 찾을 수 없습니다.'
            });
          }
        }
      );
      
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
  private async updateLocalCache(newTemplates: Template[]): Promise<void> {
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
    await TemplateCache.saveTemplates(this.cachedTemplates);
  }

  /**
   * 템플릿 사용 횟수 증가
   * @param templateId 템플릿 ID
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    // 로컬 캐시에서 사용 횟수 증가
    await TemplateCache.incrementTemplateUsage(templateId);
    
    // 백엔드에도 사용 횟수 증가 요청
    chrome.runtime.sendMessage({
      type: 'INCREMENT_TEMPLATE_USAGE',
      templateId
    });
  }
} 