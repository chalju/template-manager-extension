import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './options.css';
import TemplateForm from '../components/TemplateForm';
import { templateService, Template } from '../components/TemplateService';
import { settingsService, UserSettings } from '../components/SettingsService';

// 도메인 입력 컴포넌트
const DomainInput: React.FC<{
  domains: string[];
  onChange: (domains: string[]) => void;
}> = ({ domains, onChange }) => {
  const [newDomain, setNewDomain] = useState('');

  const addDomain = () => {
    if (newDomain && !domains.includes(newDomain)) {
      const updatedDomains = [...domains, newDomain];
      onChange(updatedDomains);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    const updatedDomains = domains.filter(d => d !== domain);
    onChange(updatedDomains);
  };

  return (
    <div className="domain-input">
      <div className="domain-add-form">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="예: example.com"
        />
        <button type="button" onClick={addDomain} disabled={!newDomain}>추가</button>
      </div>
      <div className="domain-list">
        {domains.length === 0 ? (
          <div className="empty-state">추가된 도메인이 없습니다. (기본적으로 모든 웹사이트에서 작동합니다)</div>
        ) : (
          <ul>
            {domains.map(domain => (
              <li key={domain}>
                <span>{domain}</span>
                <button type="button" onClick={() => removeDomain(domain)}>삭제</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// 템플릿 관리 컴포넌트
const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any>(undefined);

  // 템플릿 로드
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');

      const loadedTemplates = await templateService.getAllTemplates();
      console.log('불러온 템플릿:', loadedTemplates);
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('템플릿 로드 오류:', error);
      setError('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 로드
  useEffect(() => {
    loadTemplates();
  }, []);

  // 템플릿 편집 시작
  const handleEdit = (template: Template) => {
    // 템플릿 데이터를 폼에 맞게 가공
    const formTemplate = {
      ...template,
      title: template.title || template.name || '',
      keyword: template.keyword || template.shortcut || '',
      categories: template.categories || [],
      isPublic: false // 기본값 사용
    };
    setCurrentTemplate(formTemplate);
    setShowForm(true);
  };

  // 새 템플릿 생성 시작
  const handleCreate = () => {
    setCurrentTemplate(undefined);
    setShowForm(true);
  };

  // 템플릿 삭제
  const handleDelete = async (id: number | string) => {
    if (!window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setIsLoading(true);
      await templateService.deleteTemplate(id);
      setTemplates(prev => prev.filter(template => template.id !== id));
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      alert('템플릿 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 템플릿 저장
  const handleSave = async (formTemplate: any) => {
    try {
      console.log('폼에서 받은 템플릿 데이터:', formTemplate);
      
      // FormTemplate을 Template 형식으로 변환
      const template: Template = {
        id: formTemplate.id,
        name: formTemplate.title, // 백엔드 API 요청용 필드
        title: formTemplate.title, // 프론트엔드 표시용 필드
        content: formTemplate.content,
        shortcut: formTemplate.keyword, // 백엔드 API 요청용 필드
        keyword: formTemplate.keyword, // 프론트엔드 표시용 필드
        categories: formTemplate.categories || [] // 안전하게 categories 설정
      };
      
      console.log('변환된 템플릿 데이터:', template);
      
      let savedTemplate: Template;
      if (template.id) {
        // 기존 템플릿 업데이트
        savedTemplate = await templateService.updateTemplate(template);
        setTemplates(prev => 
          prev.map(t => t.id === template.id ? savedTemplate : t)
        );
      } else {
        // 새 템플릿 생성
        savedTemplate = await templateService.createTemplate(template);
        setTemplates(prev => [...prev, savedTemplate]);
      }
      
      console.log('저장된 템플릿:', savedTemplate);
      setShowForm(false);
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      alert(`템플릿 저장 중 오류가 발생했습니다: ${(error as Error).message}`);
      throw error;
    }
  };

  return (
    <div className="template-manager">
      <h3>템플릿 관리</h3>
      
      {showForm ? (
        <TemplateForm 
          template={currentTemplate} 
          onSave={handleSave} 
          onCancel={() => setShowForm(false)} 
        />
      ) : (
        <>
          {isLoading ? (
            <div className="loading">템플릿을 불러오는 중...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="template-list">
              {templates.length === 0 ? (
                <div className="empty-state">저장된 템플릿이 없습니다.</div>
              ) : (
                <ul>
                  {templates.map(template => (
                    <li key={template.id} className="template-item">
                      <div className="template-header">
                        <h4>{template.title || template.name}</h4>
                        <div className="template-actions">
                          <button type="button" onClick={() => handleEdit(template)}>편집</button>
                          <button type="button" onClick={() => handleDelete(template.id!)}>삭제</button>
                        </div>
                      </div>
                      <div className="template-keyword">키워드: <strong>{template.keyword || template.shortcut}</strong></div>
                      <div className="template-content">{template.content}</div>
                      {template.categories && template.categories.length > 0 && (
                        <div className="template-categories">
                          {template.categories.map(category => (
                            <span key={category} className="category-tag">{category}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="template-actions-footer">
                <button type="button" className="primary" onClick={handleCreate}>새 템플릿 추가</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 옵션 페이지 메인 컴포넌트
const Options: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    enableSuggestions: true,
    suggestionFrequency: 'medium',
    enableHistory: true,
    domains: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // 오프라인 모드 상태 확인
        const offlineMode = await new Promise<boolean>((resolve) => {
          chrome.storage.local.get('offlineMode', (result) => {
            resolve(result.offlineMode || false);
          });
        });
        
        // 오프라인 모드 설정
        settingsService.setOfflineMode(offlineMode);
        templateService.setOfflineMode(offlineMode);
        
        // 설정 로드
        const settings = await settingsService.syncSettings();
        setSettings(settings);
        
        // 템플릿 로드
        try {
          const allTemplates = await templateService.getAllTemplates();
          console.log('템플릿 로드 완료:', allTemplates);
          setTemplates(allTemplates);
        } catch (templateError) {
          console.error('템플릿 로드 오류:', templateError);
        }
      } catch (error) {
        console.error('설정 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // 설정 저장
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setMessage('');
      
      await settingsService.updateSettings(settings);
      await settingsService.saveToLocalStorage(settings);
      
      // 배경 스크립트에 알림
      chrome.runtime.sendMessage({ 
        type: 'SETTINGS_UPDATED', 
        settings 
      });
      
      setMessage('설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 오류:', error);
      setMessage('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDomainsChange = (domains: string[]) => {
    setSettings(prev => ({
      ...prev,
      domains
    }));
  };

  return (
    <div className="options-container">
      <header>
        <h1>AI 문장 자동완성 어시스턴트 설정</h1>
      </header>

      <main>
        <section className="settings-section">
          <h2>기본 설정</h2>
          {isLoading ? (
            <div className="loading">설정을 불러오는 중...</div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); saveSettings(); }}>
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="enableSuggestions"
                  name="enableSuggestions"
                  checked={settings.enableSuggestions}
                  onChange={handleChange}
                />
                <label htmlFor="enableSuggestions">
                  자동 완성 활성화
                  <span className="form-description">텍스트 입력 필드에서 문장 자동 완성 기능 사용</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="suggestionFrequency">
                  추천 빈도
                  <span className="form-description">자동 완성 제안이 표시되는 빈도</span>
                </label>
                <select
                  id="suggestionFrequency"
                  name="suggestionFrequency"
                  value={settings.suggestionFrequency}
                  onChange={handleChange}
                  disabled={!settings.enableSuggestions}
                >
                  <option value="low">낮음 - 가끔씩만 제안</option>
                  <option value="medium">중간 - 균형있는 제안</option>
                  <option value="high">높음 - 자주 제안</option>
                </select>
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="enableHistory"
                  name="enableHistory"
                  checked={settings.enableHistory}
                  onChange={handleChange}
                />
                <label htmlFor="enableHistory">
                  사용 이력 기록
                  <span className="form-description">더 나은 추천을 위해 사용 패턴 기록</span>
                </label>
              </div>

              <div className="form-group">
                <label>
                  허용된 도메인
                  <span className="form-description">자동 완성 기능이 작동할 웹사이트 도메인 (비어있으면 모든 사이트에서 작동)</span>
                </label>
                <DomainInput 
                  domains={settings.domains} 
                  onChange={handleDomainsChange} 
                />
              </div>

              {message && <div className={message.includes('오류') ? 'error-message' : 'success-message'}>{message}</div>}

              <div className="form-actions">
                <button type="submit" className="primary" disabled={isSaving}>
                  {isSaving ? '저장 중...' : '설정 저장'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="settings-section">
          <TemplateManager />
        </section>
      </main>

      <footer>
        <p>AI 문장 자동완성 어시스턴트 v0.1.0</p>
      </footer>
    </div>
  );
};

// 앱 렌더링
const rootElement = document.getElementById('options-root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<Options />);
} 