import React, { useState, useEffect } from 'react';
import { Template as ServiceTemplate } from './TemplateService';

// TemplateService에서 정의한 인터페이스를 확장한 폼 전용 인터페이스
interface FormTemplate extends Partial<ServiceTemplate> {
  title: string;
  content: string;
  keyword: string;
  isPublic: boolean;
  categories: string[];
}

interface TemplateFormProps {
  template?: FormTemplate;
  onSave: (template: FormTemplate) => Promise<void>;
  onCancel: () => void;
}

/**
 * 템플릿 생성 및 편집 폼 컴포넌트
 */
const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSave,
  onCancel
}) => {
  // 기본 템플릿 상태
  const [formData, setFormData] = useState<FormTemplate>({
    title: '',
    content: '',
    keyword: '',
    isPublic: false,
    categories: []
  });
  
  // 폼 제출 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  // 템플릿이 제공되면 폼 데이터 초기화
  useEffect(() => {
    if (template) {
      // 안전하게 categories 초기화 - undefined일 경우 빈 배열 사용
      const safeTemplate = {
        ...template,
        categories: template.categories || []
      };
      setFormData(safeTemplate);
    }
  }, [template]);
  
  // 입력 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // 카테고리 추가 핸들러
  const addCategory = () => {
    if (newCategory && !formData.categories.includes(newCategory)) {
      setFormData(prev => ({
        ...prev,
        categories: [...(prev.categories || []), newCategory]
      }));
      setNewCategory('');
    }
  };
  
  // 카테고리 제거 핸들러
  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: (prev.categories || []).filter(c => c !== category)
    }));
  };
  
  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.title.trim()) {
      setError('템플릿 제목은 필수입니다.');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('템플릿 내용은 필수입니다.');
      return;
    }
    
    if (!formData.keyword.trim()) {
      setError('트리거 키워드는 필수입니다.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // 부모 컴포넌트의 저장 함수 호출
      await onSave({
        ...formData,
        categories: formData.categories || [] // 안전하게 categories 전달
      });
    } catch (err) {
      setError('템플릿 저장 중 오류가 발생했습니다.');
      console.error('템플릿 저장 오류:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="template-form">
      <h3>{template?.id ? '템플릿 편집' : '새 템플릿 생성'}</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="keyword">트리거 키워드</label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={formData.keyword}
            onChange={handleChange}
            required
            placeholder="/greeting, /thanks 등"
          />
          <span className="form-hint">사용자가 입력하면 이 템플릿이 제안됩니다</span>
        </div>
        
        <div className="form-group">
          <label htmlFor="content">템플릿 내용</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={6}
            required
          />
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
          />
          <label htmlFor="isPublic">
            팀 공유
            <span className="form-hint">팀원들과 이 템플릿을 공유합니다</span>
          </label>
        </div>
        
        <div className="form-group">
          <label>카테고리</label>
          <div className="category-input">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="새 카테고리"
            />
            <button 
              type="button" 
              onClick={addCategory}
              disabled={!newCategory.trim()}
            >
              추가
            </button>
          </div>
          
          <div className="category-list">
            {(!formData.categories || formData.categories.length === 0) ? (
              <div className="empty-state">카테고리 없음</div>
            ) : (
              <ul>
                {formData.categories.map(category => (
                  <li key={category} className="category-tag">
                    {category}
                    <button 
                      type="button" 
                      onClick={() => removeCategory(category)}
                      className="remove-category"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            취소
          </button>
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : (template?.id ? '업데이트' : '생성')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateForm; 