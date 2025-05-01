/// <reference types="chrome"/>

import { TemplateMatcher } from '../utils/template-matcher';
import { Template } from '../types';

/**
 * 템플릿 인터페이스
 */
export interface Template {
  id: string;
  name: string;  // 필수 필드
  title?: string;  // 선택적 필드
  content: string;
  shortcut?: string;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
  isCustom?: boolean; // 클라이언트 측 구분용
  // options.html에서 사용하는 속성들
  keyword?: string;
}

/**
 * 템플릿 서비스 - 템플릿 관리 및 검색 기능
 */
export class TemplateService {
  private baseUrl: string;
  private offlineMode: boolean = false;
  private cachedTemplates: Template[] = [];
  private lastFetch: number = 0;
  private templates: Template[] = [];
  private matcher: TemplateMatcher;
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시
  
  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.matcher = new TemplateMatcher();
    this.loadCachedTemplates();
  }
  
  /**
   * 인증 토큰 가져오기
   */
  private async getToken(): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
      chrome.storage.local.get('authToken', (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result.authToken || null);
      });
    });
  }
  
  /**
   * 로컬 스토리지에서 캐시된 템플릿 로드
   */
  private async loadCachedTemplates(): Promise<void> {
    try {
      const result = await new Promise<{templates?: Template[]} | undefined>((resolve, reject) => {
        chrome.storage.local.get('cachedTemplates', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(result);
        });
      });
      
      if (result && result.templates) {
        this.cachedTemplates = result.templates;
        console.log('캐시된 템플릿 로드됨:', this.cachedTemplates.length);
      }
    } catch (error) {
      console.error('캐시된 템플릿 로드 오류:', error);
    }
  }
  
  /**
   * 템플릿 캐시 저장
   */
  private async saveTemplateCache(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ 
        cachedTemplates: this.cachedTemplates,
        templateCacheTime: Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
  
  /**
   * 서버에서 템플릿 가져오기
   */
  async fetchTemplates(forceRefresh: boolean = false): Promise<Template[]> {
    // 오프라인 모드이거나 마지막 새로고침 후 10분이 지나지 않았고 강제 새로고침이 아니면 캐시 사용
    const now = Date.now();
    if ((this.offlineMode || (now - this.lastFetch < 10 * 60 * 1000)) && !forceRefresh && this.cachedTemplates.length > 0) {
      console.log('캐시된 템플릿 사용:', this.cachedTemplates.length);
      return this.cachedTemplates;
    }
    
    try {
      const token = await this.getToken();
      if (!token) {
        console.warn('인증 토큰이 없습니다. 캐시된 템플릿을 사용합니다.');
        this.offlineMode = true;
        return this.cachedTemplates.length > 0 ? this.cachedTemplates : [];
      }
      
      console.log(`템플릿 요청: ${this.baseUrl}/api/templates/`);
      const response = await fetch(`${this.baseUrl}/api/templates/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error(`템플릿 가져오기 실패: ${response.status} ${response.statusText}`);
        if (response.status === 401) {
          console.error('인증 오류: 토큰이 유효하지 않거나 만료되었습니다.');
          throw new Error('인증 오류: 로그인이 필요합니다.');
        }
        throw new Error(`템플릿 가져오기 실패: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('서버 응답:', data);
      let templates: Template[] = [];
      
      // 응답 형식 처리: { templates: [...] } 또는 직접 배열
      if (data.templates && Array.isArray(data.templates)) {
        templates = data.templates;
      } else if (Array.isArray(data)) {
        templates = data;
      } else {
        console.error('잘못된 응답 형식:', data);
        throw new Error('잘못된 응답 형식');
      }
      
      this.cachedTemplates = templates;
      this.lastFetch = now;
      
      // 템플릿 캐시 저장
      await this.saveTemplateCache();
      
      return templates;
    } catch (error) {
      console.error('템플릿 가져오기 오류:', error);
      // 오류 발생 시 오프라인 모드로 전환
      this.offlineMode = true;
      
      if (this.cachedTemplates.length > 0) {
        console.log('오류 발생, 캐시된 템플릿 사용');
        return this.cachedTemplates;
      }
      return [];
    }
  }
  
  /**
   * 키워드로 템플릿 검색
   */
  async searchTemplates(keyword: string): Promise<Template[]> {
    try {
      // 오프라인 모드이거나 캐시가 있으면 로컬 검색 수행
      if (this.offlineMode && this.cachedTemplates.length > 0) {
        console.log('오프라인 모드: 로컬 템플릿에서 검색:', keyword);
        const lowercaseKeyword = keyword.toLowerCase();
        return this.cachedTemplates.filter(template => 
          template.name?.toLowerCase().includes(lowercaseKeyword) || 
          template.content?.toLowerCase().includes(lowercaseKeyword) ||
          (template.shortcut && template.shortcut.toLowerCase().includes(lowercaseKeyword))
        );
      }
      
      // 온라인 모드: API 검색 수행
      const token = await this.getToken();
      if (!token) {
        console.warn('인증 토큰이 없습니다. 오프라인 모드로 전환합니다.');
        this.offlineMode = true;
        return this.searchTemplates(keyword); // 재귀 호출로 오프라인 모드 검색 실행
      }
      
      // /api/templates/search 엔드포인트 사용 (키워드 이스케이프 추가)
      const encodedKeyword = encodeURIComponent(keyword); // URL 안전하게 인코딩
      const url = `${this.baseUrl}/api/templates/search?keyword=${encodedKeyword}`;
      console.log('템플릿 검색 요청:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error(`템플릿 검색 실패: ${response.status} ${response.statusText}`);
        if (response.status === 401) {
          console.error('인증 오류: 토큰이 유효하지 않거나 만료되었습니다.');
          throw new Error('Not authenticated');
        }
        throw new Error(`템플릿 검색 실패: ${response.status}`);
      }
      
      // 응답 처리
      const data = await response.json();
      console.log('템플릿 검색 응답:', data);
      
      // 응답 형식 처리: { templates: [...] } 또는 직접 배열
      let templates: Template[] = [];
      if (data.templates && Array.isArray(data.templates)) {
        templates = data.templates;
      } else if (Array.isArray(data)) {
        templates = data;
      } else {
        console.error('잘못된 응답 형식:', data);
        throw new Error('잘못된 응답 형식');
      }
      
      // 캐시 업데이트
      if (templates.length > 0) {
        this.cachedTemplates = templates;
        this.lastFetch = Date.now();
        await this.saveTemplateCache();
      }
      
      return templates;
    } catch (error) {
      console.error('템플릿 검색 오류:', error);
      
      // 오류 발생 시 오프라인 모드로 전환
      this.offlineMode = true;
      
      // 오류 발생 시 캐시된 템플릿에서 검색 시도
      if (this.cachedTemplates.length > 0) {
        console.log('API 오류, 캐시된 템플릿에서 검색');
        const lowercaseKeyword = keyword.toLowerCase();
        return this.cachedTemplates.filter(template => 
          template.name?.toLowerCase().includes(lowercaseKeyword) || 
          template.content?.toLowerCase().includes(lowercaseKeyword) ||
          (template.shortcut && template.shortcut.toLowerCase().includes(lowercaseKeyword))
        );
      }
      return [];
    }
  }
  
  /**
   * 오프라인 모드 설정
   */
  setOfflineMode(isOffline: boolean): void {
    this.offlineMode = isOffline;
    console.log(`템플릿 서비스 오프라인 모드 ${isOffline ? '활성화' : '비활성화'}`);
  }
  
  /**
   * 현재 오프라인 모드 상태 반환
   */
  isOfflineMode(): boolean {
    return this.offlineMode;
  }
  
  /**
   * 기본 템플릿 가져오기 (백엔드 연결 실패 시 사용)
   */
  getDefaultTemplates(): Template[] {
    console.log('기본 템플릿 불러오기');
    return [
      {
        id: 'default-1',
        name: 'SSL 인증서 갱신 안내',
        content: '안녕하세요,\n\n귀사의 SSL 인증서 갱신 기간이 30일 이내로 다가왔습니다. 서비스 중단을 방지하기 위해 가능한 빠른 시일 내에 인증서 갱신을 진행해주시기 바랍니다.\n\n감사합니다.',
        shortcut: 'ssl',
        isCustom: false,
        created_at: '2023-09-15T00:00:00.000Z',
        updated_at: '2023-09-15T00:00:00.000Z'
      },
      {
        id: 'default-2',
        name: '회의 일정 안내',
        content: '안녕하세요,\n\n다음 회의 일정을 안내드립니다.\n일시: [날짜] [시간]\n장소: [장소]\n안건: [안건]\n\n참석 여부를 답장으로 알려주시기 바랍니다.\n\n감사합니다.',
        shortcut: 'meeting',
        isCustom: false,
        created_at: '2023-09-15T00:00:00.000Z',
        updated_at: '2023-09-15T00:00:00.000Z'
      },
      {
        id: 'default-3',
        name: '감사 인사',
        content: '안녕하세요,\n\n도움 주셔서 진심으로 감사드립니다. 덕분에 원활하게 업무를 진행할 수 있었습니다.\n\n앞으로도 좋은 협력 관계 유지되길 바랍니다.\n\n감사합니다.',
        shortcut: 'thanks',
        isCustom: false,
        created_at: '2023-09-15T00:00:00.000Z',
        updated_at: '2023-09-15T00:00:00.000Z'
      }
    ];
  }
  
  /**
   * 모든 템플릿 가져오기 (options.html에서 호출)
   */
  async getAllTemplates(forceRefresh: boolean = false): Promise<Template[]> {
    console.log('getAllTemplates 호출됨');
    try {
      const templates = await this.fetchTemplates(forceRefresh);
      console.log('백엔드에서 템플릿 로드 성공:', templates);
      if (templates && templates.length > 0) {
        return templates;
      } else {
        console.log('백엔드에서 템플릿을 가져오지 못했습니다. 기본 템플릿 사용');
        return this.getDefaultTemplates();
      }
    } catch (error) {
      console.error('getAllTemplates 오류:', error);
      console.log('오류 발생, 기본 템플릿 사용');
      return this.getDefaultTemplates();
    }
  }
  
  /**
   * 템플릿 생성 (options.html에서 호출)
   */
  async createTemplate(template: Template): Promise<Template> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      
      // 필드명 조정 - 백엔드 스키마와 일치시킴
      const templateData = {
        name: template.title || template.name,
        content: template.content,
        shortcut: template.keyword || template.shortcut
      };
      
      console.log('템플릿 생성 요청 데이터:', templateData);
      
      // API 호출
      const response = await fetch(`${this.baseUrl}/api/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`템플릿 생성 실패: ${response.status}, 상세: ${errorText}`);
        throw new Error(`템플릿 생성 실패: ${response.status}`);
      }
      
      const createdTemplate = await response.json();
      console.log('생성된 템플릿 응답:', createdTemplate);
      
      // 백엔드 응답 구조를 프론트엔드 구조로 변환
      const convertedTemplate: Template = {
        id: createdTemplate.id,
        name: createdTemplate.name,
        title: createdTemplate.name,
        content: createdTemplate.content,
        shortcut: createdTemplate.shortcut,
        keyword: createdTemplate.shortcut,
        created_at: createdTemplate.created_at,
        updated_at: createdTemplate.updated_at,
        categories: createdTemplate.categories || []
      };
      
      // 캐시 업데이트
      if (this.cachedTemplates.length > 0) {
        this.cachedTemplates.push(convertedTemplate);
        await this.saveTemplateCache();
      }
      
      return convertedTemplate;
    } catch (error) {
      console.error('템플릿 생성 오류:', error);
      
      // 오프라인 모드일 경우 로컬에서만 생성
      if (this.offlineMode) {
        const newTemplate = {
          ...template,
          id: `local-${Date.now()}`, // 임시 ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isCustom: true
        };
        
        this.cachedTemplates.push(newTemplate);
        await this.saveTemplateCache();
        
        return newTemplate;
      }
      
      throw error;
    }
  }
  
  /**
   * 템플릿 업데이트 (options.html에서 호출)
   */
  async updateTemplate(template: Template): Promise<Template> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      
      // 필드명 조정 - 백엔드 스키마와 일치시킴
      const templateData = {
        name: template.title || template.name,
        content: template.content,
        shortcut: template.keyword || template.shortcut
      };
      
      console.log('템플릿 업데이트 요청 데이터:', templateData);
      
      // API 호출
      const response = await fetch(`${this.baseUrl}/api/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`템플릿 업데이트 실패: ${response.status}, 상세: ${errorText}`);
        throw new Error(`템플릿 업데이트 실패: ${response.status}`);
      }
      
      const updatedTemplate = await response.json();
      console.log('업데이트된 템플릿 응답:', updatedTemplate);
      
      // 백엔드 응답 구조를 프론트엔드 구조로 변환
      const convertedTemplate: Template = {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        title: updatedTemplate.name,
        content: updatedTemplate.content,
        shortcut: updatedTemplate.shortcut,
        keyword: updatedTemplate.shortcut,
        created_at: updatedTemplate.created_at,
        updated_at: updatedTemplate.updated_at,
        categories: updatedTemplate.categories || []
      };
      
      // 캐시 업데이트
      if (this.cachedTemplates.length > 0) {
        this.cachedTemplates = this.cachedTemplates.map(t => 
          t.id === template.id ? convertedTemplate : t
        );
        await this.saveTemplateCache();
      }
      
      return convertedTemplate;
    } catch (error) {
      console.error('템플릿 업데이트 오류:', error);
      
      // 오프라인 모드일 경우 로컬에서만 업데이트
      if (this.offlineMode) {
        const updatedTemplate = {
          ...template,
          updated_at: new Date().toISOString()
        };
        
        this.cachedTemplates = this.cachedTemplates.map(t => 
          t.id === template.id ? updatedTemplate : t
        );
        await this.saveTemplateCache();
        
        return updatedTemplate;
      }
      
      throw error;
    }
  }
  
  /**
   * 템플릿 삭제 (options.html에서 호출)
   */
  async deleteTemplate(id: number | string): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      
      // API 호출
      const response = await fetch(`${this.baseUrl}/api/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`템플릿 삭제 실패: ${response.status}`);
      }
      
      // 캐시 업데이트
      if (this.cachedTemplates.length > 0) {
        this.cachedTemplates = this.cachedTemplates.filter(t => t.id !== id);
        await this.saveTemplateCache();
      }
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      
      // 오프라인 모드일 경우 로컬에서만 삭제
      if (this.offlineMode) {
        this.cachedTemplates = this.cachedTemplates.filter(t => t.id !== id);
        await this.saveTemplateCache();
        return;
      }
      
      throw error;
    }
  }

  async loadTemplates(force: boolean = false): Promise<Template[]> {
    // 캐시가 유효하면 캐시된 템플릿 반환
    const now = Date.now();
    if (!force && this.templates.length > 0 && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      return this.templates;
    }

    try {
      const response = await fetch('http://localhost:8000/api/templates');
      if (!response.ok) {
        throw new Error(`템플릿 로드 실패: ${response.status} ${response.statusText}`);
      }

      const templates = await response.json();
      this.templates = templates;
      this.matcher.setTemplates(templates);
      this.lastLoadTime = now;
      
      return templates;
    } catch (error) {
      console.error('템플릿 로드 중 오류:', error);
      // 캐시된 데이터가 있으면 그것이라도 반환
      if (this.templates.length > 0) {
        return this.templates;
      }
      throw error;
    }
  }

  async searchTemplates(query: string): Promise<Template[]> {
    // 템플릿이 없으면 로드
    if (this.templates.length === 0) {
      await this.loadTemplates();
    }
    
    // 캐시가 오래되었으면 백그라운드에서 리프레시
    const now = Date.now();
    if ((now - this.lastLoadTime) >= this.CACHE_DURATION) {
      this.loadTemplates(true).catch(console.error);
    }

    return this.matcher.findMatches(query);
  }

  async addTemplate(template: Partial<Template>): Promise<Template> {
    try {
      const response = await fetch('http://localhost:8000/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error(`템플릿 추가 실패: ${response.status} ${response.statusText}`);
      }

      const newTemplate = await response.json();
      
      // 캐시 업데이트
      this.templates.push(newTemplate);
      this.matcher.setTemplates(this.templates);
      
      return newTemplate;
    } catch (error) {
      console.error('템플릿 추가 중 오류:', error);
      throw error;
    }
  }

  async updateTemplate(id: string, template: Partial<Template>): Promise<Template> {
    try {
      const response = await fetch(`http://localhost:8000/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error(`템플릿 업데이트 실패: ${response.status} ${response.statusText}`);
      }

      const updatedTemplate = await response.json();
      
      // 캐시 업데이트
      const index = this.templates.findIndex(t => t.id === id);
      if (index !== -1) {
        this.templates[index] = updatedTemplate;
        this.matcher.setTemplates(this.templates);
      }
      
      return updatedTemplate;
    } catch (error) {
      console.error('템플릿 업데이트 중 오류:', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:8000/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`템플릿 삭제 실패: ${response.status} ${response.statusText}`);
      }

      // 캐시 업데이트
      this.templates = this.templates.filter(t => t.id !== id);
      this.matcher.setTemplates(this.templates);
    } catch (error) {
      console.error('템플릿 삭제 중 오류:', error);
      throw error;
    }
  }
}

// 기본 인스턴스 내보내기
export const templateService = new TemplateService(); 
