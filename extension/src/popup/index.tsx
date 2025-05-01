import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';
import { settingsService, UserSettings } from '../components/SettingsService';
import { authService } from '../components/AuthService';
import { offlineManager } from '../components/OfflineManager';
import { templateService, Template } from '../components/TemplateService';

// Chrome API 타입 정의 (완전한 정의는 아니지만, 필요한 부분만 정의)
declare namespace chrome {
  namespace runtime {
    const lastError: Error | undefined;
    function sendMessage(
      message: any,
      responseCallback?: (response: any) => void
    ): void;
  }
  
  namespace storage {
    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }
    
    interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    }
    
    const local: StorageArea;
    
    const onChanged: {
      addListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => void;
      removeListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => void;
    };
  }
  
  namespace tabs {
    function create(options: { url: string }): void;
  }
}

// 인증 상태 인터페이스
interface AuthState {
  isAuthenticated: boolean;
  email?: string;
  loading: boolean;
  mode?: 'online' | 'offline';
}

// 로그인 양식 컴포넌트
const LoginForm: React.FC<{ onLogin: (email: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('폼 제출 이벤트 발생');
    setIsLoading(true);
    setError('');

    try {
      console.log('로그인 시도 - 이메일:', email);
      await authService.login(email, password);
      console.log('로그인 성공');
      onLogin(email);
    } catch (err) {
      console.error('로그인 오류 상세:', err);
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          onClick={() => console.log('로그인 버튼 클릭됨')}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="register-link">
        계정이 없으신가요? <a href="http://localhost:8000/register" target="_blank" rel="noreferrer">회원가입</a>
      </p>
    </div>
  );
};

// 템플릿 리스트 컴포넌트
const TemplateList: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        setError('');
        console.log('템플릿 로드 시작...');
        
        // 백그라운드 스크립트에 직접 메시지 전송
        chrome.runtime.sendMessage(
          { type: 'SEARCH_TEMPLATES', keyword: '' }, 
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('템플릿 로드 오류(크롬):', chrome.runtime.lastError);
              setError(`크롬 런타임 오류: ${chrome.runtime.lastError.message || '알 수 없는 오류'}`);
              setIsLoading(false);
              return;
            }
            
            console.log('템플릿 검색 응답:', response);
            
            if (!response) {
              console.error('템플릿 로드 실패: 응답이 없습니다');
              setError('백그라운드 스크립트로부터 응답이 없습니다');
              setTemplates([]);
              setIsLoading(false);
              return;
            }
            
            if (response.success) {
              // templates 배열이 있는지 확인
              if (Array.isArray(response.templates)) {
                console.log('템플릿 로드 완료:', response.templates.length);
                setTemplates(response.templates);
              } else {
                console.error('템플릿 로드 실패: 잘못된 응답 형식', response);
                setError('템플릿 데이터 형식이 올바르지 않습니다');
                setTemplates([]);
              }
              
              // 오프라인 모드 감지 (서버 응답이지만 오프라인으로 설정됨)
              if (response.isOffline) {
                console.log('오프라인 모드 감지됨');
                setError(response.error ? `오프라인 모드: ${response.error}` : '오프라인 모드: 서버 연결 없음');
              }
            } else {
              console.error('템플릿 로드 실패:', response.error || '알 수 없는 오류');
              setError(response.error || '템플릿을 불러오는 중 오류가 발생했습니다');
              // 응답은 실패지만 템플릿이 포함되어 있을 수 있음
              if (Array.isArray(response.templates)) {
                setTemplates(response.templates);
              } else {
                setTemplates([]);
              }
            }
            
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('템플릿 로드 예외 발생:', err);
        setError(`예외 발생: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        setTemplates([]);
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  // 검색어로 템플릿 필터링 - null/undefined 체크 추가
  const filteredTemplates = templates.filter(template => {
    // 템플릿이 유효한지 확인
    if (!template) return false;
    
    const name = template.name || '';
    const content = template.content || '';
    const shortcut = template.shortcut || '';
    const term = searchTerm.toLowerCase();
    
    return name.toLowerCase().includes(term) || 
           content.toLowerCase().includes(term) || 
           shortcut.toLowerCase().includes(term);
  });

  // 클립보드에 복사
  const copyToClipboard = (content: string) => {
    if (!content) {
      alert('복사할 내용이 없습니다.');
      return;
    }
    
    navigator.clipboard.writeText(content).then(() => {
      alert('클립보드에 복사되었습니다.');
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
    });
  };

  return (
    <div className="templates-container">
      <h3>내 템플릿</h3>
      <div className="search-box">
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="loading">템플릿을 불러오는 중...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="no-templates">
          {searchTerm ? '검색 결과가 없습니다.' : '저장된 템플릿이 없습니다.'}
        </div>
      ) : (
        <ul className="template-list">
          {filteredTemplates.map(template => (
            <li 
              key={template.id || Math.random()} 
              className="template-item"
              onClick={() => copyToClipboard(template.content)}
            >
              <div className="template-header">
                <strong>{template.name || '제목 없음'}</strong>
                {template.shortcut && (
                  <span className="shortcut">//{template.shortcut}</span>
                )}
              </div>
              <div className="template-content">
                {template.content ? (
                  template.content.length > 50 
                    ? `${template.content.substring(0, 50)}...` 
                    : template.content
                ) : '내용 없음'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 메인 패널 컴포넌트
const MainPanel: React.FC<{ email: string; mode?: 'online' | 'offline'; onLogout: () => void }> = ({ email, mode, onLogout }) => {
  const [settings, setSettings] = useState<UserSettings>({
    enableSuggestions: true,
    suggestionFrequency: 'medium',
    enableHistory: true,
    domains: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await settingsService.syncSettings();
        setSettings(settings);
      } catch (error) {
        console.error('설정 로드 오류:', error);
        // 오류 발생 시 로컬 스토리지에서 설정 시도
        try {
          const localSettings = await settingsService.loadFromLocalStorage();
          if (localSettings) {
            setSettings(localSettings);
            setMessage('서버 연결 실패로 로컬 설정을 불러왔습니다');
          }
        } catch (localError) {
          console.error('로컬 설정 로드 오류:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    console.log('로그아웃 처리 중...');
    await authService.logout();
    onLogout();
  };

  // 설정 변경 처리
  const handleSettingChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 설정 저장
  const saveSettings = async () => {
    try {
      setIsLoading(true);
      setMessage('');
      
      // 오프라인 모드가 아닌 경우에만 서버에 저장 시도
      if (mode !== 'offline') {
        try {
          await settingsService.updateSettings(settings);
        } catch (error) {
          console.error('서버에 설정 저장 실패:', error);
          setMessage('서버 연결 실패, 로컬에만 설정이 저장됩니다');
        }
      } else {
        setMessage('오프라인 모드: 로컬에만 설정이 저장됩니다');
      }
      
      // 로컬 저장소에도 저장
      await settingsService.saveToLocalStorage(settings);
      
      if (!message) {
        setMessage('설정이 저장되었습니다.');
      }
      
      // 배경 스크립트에 알림
      chrome.runtime.sendMessage({ 
        type: 'SETTINGS_UPDATED', 
        settings 
      });
    } catch (error) {
      console.error('설정 저장 오류:', error);
      setMessage('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div className="header">
        <h2>AI 문장 자동완성 어시스턴트</h2>
        <div className="user-info">
          <span>{email}</span>
          {mode === 'offline' && <span className="offline-badge">오프라인 모드</span>}
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </div>

      {/* 템플릿 리스트 먼저 표시 */}
      <div className="content-container">
        <TemplateList />
        
        <div className="settings-container">
          <h3>설정</h3>
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
                  onChange={handleSettingChange}
                />
                <label htmlFor="enableSuggestions">자동 완성 활성화</label>
              </div>

              <div className="form-group">
                <label htmlFor="suggestionFrequency">추천 빈도</label>
                <select
                  id="suggestionFrequency"
                  name="suggestionFrequency"
                  value={settings.suggestionFrequency}
                  onChange={handleSettingChange}
                  disabled={!settings.enableSuggestions}
                >
                  <option value="low">낮음</option>
                  <option value="medium">중간</option>
                  <option value="high">높음</option>
                </select>
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="enableHistory"
                  name="enableHistory"
                  checked={settings.enableHistory}
                  onChange={handleSettingChange}
                />
                <label htmlFor="enableHistory">사용 이력 기록</label>
              </div>
              
              {message && (
                <div className={message.includes('오류') ? 'error-message' : 'success-message'}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={isLoading}>
                {isLoading ? '저장 중...' : '설정 저장'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="footer">
        <button onClick={() => chrome.tabs.create({ url: 'options.html' })} className="options-button">
          고급 설정
        </button>
      </div>
    </div>
  );
};

// 오프라인 모드 컨트롤 컴포넌트 수정
const ConnectivityControl: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  const toggleOfflineMode = () => {
    const newState = !isOffline;
    offlineManager.setOfflineMode(newState);
  };

  // 오프라인 모드 상태 구독
  useEffect(() => {
    const unsubscribe = offlineManager.addOfflineModeListener(setIsOffline);
    return unsubscribe;
  }, []);

  return (
    <div className="connectivity-control">
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={isOffline}
          onChange={toggleOfflineMode}
        />
        <span className="switch-slider"></span>
      </label>
      <span>오프라인 모드 {isOffline ? '켜짐' : '꺼짐'}</span>
    </div>
  );
};

// 메인 앱 컴포넌트
const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('인증 상태 확인 중...');
      setAuthState(prev => ({ ...prev, loading: true }));

      try {
        // 토큰 유효성 검증
        const token = await authService.getToken();
        if (!token) {
          console.log('토큰 없음, 비인증 상태로 설정');
          setAuthState({
            isAuthenticated: false,
            loading: false
          });
          return;
        }

        // 사용자 정보 요청
        console.log('사용자 정보 요청 중...');
        const userInfo = await authService.getUserInfo();
        console.log('사용자 정보 로드 성공:', userInfo.email, '모드:', userInfo.mode || 'online');

        setAuthState({
          isAuthenticated: true,
          email: userInfo.email,
          mode: userInfo.mode,
          loading: false
        });
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        setAuthState({
          isAuthenticated: false,
          loading: false
        });
      }
    };

    // 초기 인증 상태 확인
    checkAuthStatus();

    // 인증 상태 변경 리스너 등록
    const handleAuthChange = (isAuthenticated: boolean) => {
      console.log('인증 상태 변경 감지:', isAuthenticated);
      if (isAuthenticated) {
        checkAuthStatus(); // 전체 상태 다시 로드
      } else {
        setAuthState({
          isAuthenticated: false,
          loading: false
        });
      }
    };

    authService.addAuthStateListener(handleAuthChange);

    // 주기적으로 인증 상태 확인 (5분마다)
    const intervalId = setInterval(checkAuthStatus, 5 * 60 * 1000);

    // 컴포넌트 언마운트 시 정리
    return () => {
      authService.removeAuthStateListener(handleAuthChange);
      clearInterval(intervalId);
    };
  }, []);

  const handleLogin = async (email: string) => {
    setAuthState({
      isAuthenticated: true,
      email,
      loading: false
    });
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      loading: false
    });
  };

  if (authState.loading) {
    return <div className="loading-container">로딩 중...</div>;
  }

  return (
    <div className="app-container">
      <ConnectivityControl />
      {!authState.isAuthenticated ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <MainPanel 
          email={authState.email || ''} 
          mode={authState.mode}
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
};

// 앱 렌더링
const root = ReactDOM.createRoot(document.getElementById('popup-root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 