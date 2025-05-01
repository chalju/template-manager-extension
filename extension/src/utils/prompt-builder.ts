/**
 * 프롬프트 빌더 - CLOVA API에 최적화된 프롬프트 생성 유틸리티
 */

// 프롬프트 옵션 인터페이스
export interface PromptOptions {
  temperature?: number;      // 온도 (창의성 조절, 0.0~1.0)
  topP?: number;             // Top-P 샘플링 (0.0~1.0)
  maxTokens?: number;        // 최대 생성 토큰 수
  domainContext?: string;    // 도메인 컨텍스트 (예: 'email', 'crm', 'document')
  userIntent?: string;       // 사용자 의도 (예: 'writing', 'replying', 'summarizing')
  formalLevel?: FormalLevel; // 문체 격식 수준
  language?: string;         // 언어 (기본값: 'ko')
  stopSequences?: string[];  // 생성 중단 시퀀스
  toneModifiers?: string[];  // 어조 수정자 (예: '전문적', '친근한', '설득력있는')
  domain?: string;           // 전문 분야 (예: '법률', '기술', '의학', '금융')
  testGroup?: string;        // A/B 테스트 그룹
}

// 문체 격식 수준 열거형
export enum FormalLevel {
  CASUAL = 'casual',         // 친근한 문체
  NEUTRAL = 'neutral',       // 중립적 문체
  FORMAL = 'formal',         // 격식적 문체
  BUSINESS = 'business'      // 비즈니스 문체
}

// 프롬프트 템플릿 인터페이스
export interface PromptTemplate {
  name: string;              // 템플릿 이름
  template: string;          // 템플릿 문자열
  description?: string;      // 템플릿 설명
  domain?: string[];         // 적용 도메인
  formalLevel?: FormalLevel; // 기본 격식 수준
  intentCompatibility?: string[]; // 호환되는 의도 유형
  languageModels?: string[]; // 최적화된 언어 모델 목록
  version?: string;          // 템플릿 버전
  testGroup?: string;        // A/B 테스트 그룹
}

// A/B 테스트 결과 추적 인터페이스
interface TestResult {
  templateName: string;      // 템플릿 이름
  testGroup: string;         // 테스트 그룹
  impressions: number;       // 노출 수
  accepts: number;           // 수락 수
  rejects: number;           // 거부 수
  averageResponseTime: number; // 평균 응답 시간(ms)
  lastUpdated: Date;         // 마지막 업데이트 시간
}

/**
 * 프롬프트 빌더 클래스
 */
export class PromptBuilder {
  private templates: Record<string, PromptTemplate>;
  private defaultTemplate: PromptTemplate;
  private testResults: Record<string, TestResult>;
  private activeTestGroups: string[];
  
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
  addTemplate(template: PromptTemplate): void {
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
  getTemplate(name: string): PromptTemplate {
    return this.templates[name] || this.defaultTemplate;
  }
  
  /**
   * 도메인 기반 최적 템플릿 찾기
   * @param domain 도메인 이름
   * @param intent 사용자 의도 (선택사항)
   * @param testGroup 테스트 그룹 (선택사항)
   * @returns 적합한 템플릿 또는 기본 템플릿
   */
  findTemplateForDomain(domain: string, intent?: string, testGroup?: string): PromptTemplate {
    // 테스트 그룹과 도메인, 의도를 모두 만족하는 템플릿 검색
    if (testGroup) {
      for (const template of Object.values(this.templates)) {
        if (
          template.domain && 
          template.domain.includes(domain) && 
          template.testGroup === testGroup &&
          (!intent || !template.intentCompatibility || template.intentCompatibility.includes(intent))
        ) {
          return template;
        }
      }
    }
    
    // 도메인과 의도를 만족하는 템플릿 검색
    if (intent) {
      for (const template of Object.values(this.templates)) {
        if (
          template.domain && 
          template.domain.includes(domain) && 
          template.intentCompatibility && 
          template.intentCompatibility.includes(intent)
        ) {
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
  getTemplateForTestGroup(baseName: string, testGroup?: string): PromptTemplate {
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
  recordTestEvent(templateName: string, eventType: 'impression' | 'accept' | 'reject', responseTime?: number): void {
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
  private getFormalLevelDescription(level: FormalLevel): string {
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
  private getIntentDescription(intent?: string): string {
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
  private getToneDescription(toneModifiers?: string[]): string {
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
  private getRoleDescription(domain?: string): string {
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
  buildPrompt(
    context: string,
    templateName?: string,
    options?: PromptOptions
  ): string {
    // 컨텍스트 확인
    if (!context || context.trim() === '') {
      throw new Error('유효한 컨텍스트가 필요합니다');
    }
    
    // 옵션 기본값 설정
    const defaultOptions: PromptOptions = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 100,
      formalLevel: FormalLevel.NEUTRAL,
      language: 'ko'
    };
    
    // 옵션 병합
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 템플릿 선택
    let template: PromptTemplate;
    
    if (templateName && this.templates[templateName]) {
      // A/B 테스트 그룹이 지정되었으면 해당 그룹의 템플릿 선택
      if (mergedOptions.testGroup && templateName === 'email') {
        template = this.getTemplateForTestGroup(templateName, mergedOptions.testGroup);
        // 노출 이벤트 기록
        this.recordTestEvent(template.name, 'impression');
      } else {
        // 지정된 템플릿 사용
        template = this.templates[templateName];
      }
    } else if (mergedOptions.domainContext) {
      // 도메인 및 의도 기반 템플릿 선택
      template = this.findTemplateForDomain(
        mergedOptions.domainContext, 
        mergedOptions.userIntent,
        mergedOptions.testGroup
      );
    } else {
      // 기본 템플릿 사용
      template = this.defaultTemplate;
    }
    
    // 템플릿의 격식 수준이 지정되어 있으면 사용
    if (template.formalLevel && !options?.formalLevel) {
      mergedOptions.formalLevel = template.formalLevel;
    }
    
    // 격식 수준 설명 가져오기
    const formalLevelDescription = this.getFormalLevelDescription(
      mergedOptions.formalLevel as FormalLevel
    );
    
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
  buildRequestParams(
    prompt: string,
    options?: PromptOptions
  ): Record<string, any> {
    // 기본 옵션 설정
    const defaultOptions: PromptOptions = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 100
    };
    
    // 옵션 병합
    const mergedOptions = { ...defaultOptions, ...options };
    
    // API 요청 파라미터 구성
    const params: Record<string, any> = {
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
  generateTestReport(): string {
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
  exportTestResults(): string {
    return JSON.stringify(this.testResults, null, 2);
  }

  /**
   * 최적화된 CLOVA 모델 요청 파라미터 생성
   * @param ctx 문맥 정보 (텍스트, 도메인 등)
   * @returns 최적화된 요청 파라미터
   */
  buildOptimizedRequestParams(ctx: {
    context: string;
    domain?: string;
    intent?: string;
    formalLevel?: FormalLevel;
  }): Record<string, any> {
    // 기본 파라미터 설정
    const baseParams = {
      temperature: 0.6,  // 기본 온도 값 - 일관성 우선
      top_p: 0.85,       // 기본 top_p 값
      max_tokens: 100    // 기본 최대 토큰
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
  detectDomainFromText(text: string): string {
    const lowerText = text.toLowerCase();
    
    // 이메일 감지
    if (
      lowerText.includes('@') || 
      lowerText.includes('보낸 사람:') || 
      lowerText.includes('받는 사람:') ||
      lowerText.includes('제목:') ||
      lowerText.includes('안녕하세요')
    ) {
      return 'email';
    }
    
    // CRM 감지
    if (
      lowerText.includes('고객') || 
      lowerText.includes('계약') || 
      lowerText.includes('매출') ||
      lowerText.includes('담당자') ||
      lowerText.includes('영업')
    ) {
      return 'crm';
    }
    
    // 채팅 감지
    if (
      lowerText.includes('ㅋㅋ') || 
      lowerText.includes('ㅎㅎ') || 
      lowerText.includes('?!') ||
      lowerText.includes('채팅') ||
      lowerText.match(/[!?]{2,}/)
    ) {
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
  optimizeTextLength(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    // 텍스트가 너무 길면 자르되, 문장 경계에서 자름
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let result = '';
    
    for (const sentence of sentences) {
      if ((result + sentence).length <= maxLength) {
        result += sentence;
      } else {
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
export const promptBuilder = new PromptBuilder(); 