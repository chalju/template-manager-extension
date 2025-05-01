/**
 * 템플릿 매칭 유틸리티 - 키워드를 기반으로 템플릿 매칭 및 랭킹
 */

import { KeywordMatch } from './keyword-detector';

// 템플릿 인터페이스
export interface Template {
  id: string;         // 템플릿 ID
  name: string;       // 템플릿 이름
  title?: string;     // 템플릿 제목 (없으면 name 사용)
  content: string;    // 템플릿 내용
  shortcut?: string;  // 단축키
  categories?: string[]; // 카테고리
  useCount?: number;  // 사용 횟수
  createdAt?: string; // 생성 날짜
  updatedAt?: string; // 수정 날짜
  userId?: string;    // 소유자 ID
  teamId?: string;    // 팀 ID (팀 공유 템플릿의 경우)
}

// 매칭된 템플릿 결과 인터페이스
export interface TemplateMatch {
  template: Template; // 매칭된 템플릿
  score: number;      // 매칭 점수 (높을수록 더 관련성 높음)
  matchedOn: string;  // 매칭된 필드 (title, content, tags)
}

/**
 * 템플릿 매칭 클래스
 */
export class TemplateMatcher {
  private templates: Template[] = [];

  constructor(templates: Template[] = []) {
    this.templates = templates;
  }

  setTemplates(templates: Template[]) {
    this.templates = templates;
  }

  findMatches(query: string): Template[] {
    if (!query || !query.startsWith('/')) return [];
    
    const searchTerm = query.slice(1).toLowerCase();
    if (!searchTerm) return this.templates;
    
    return this.templates
      .map(template => ({
        template,
        score: this.calculateMatchScore(template, searchTerm)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ template }) => template);
  }

  private calculateMatchScore(template: Template, searchTerm: string): number {
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
    if (template.categories?.some(cat => 
      cat.toLowerCase() === searchTerm || 
      cat.toLowerCase().includes(searchTerm)
    )) {
      score += 25;
    }
    
    return score;
  }

  getTemplates(): Template[] {
    return this.templates;
  }
} 