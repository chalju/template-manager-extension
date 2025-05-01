# 데이터베이스 스키마 및 ERD

## 엔티티 관계도 (ERD)

```
User(1) ──┬──(N) Template
          │
          ├──(1) UserSettings
          │
          └──(N) UsageHistory
             
Template(1) ────(N) UsageHistory
```

## 데이터베이스 모델

### User
- id: UUID (PK)
- email: String (unique)
- password_hash: String
- name: String
- created_at: DateTime
- updated_at: DateTime
- role_id: UUID (FK -> Role.id, nullable)

### Role
- id: UUID (PK)
- name: String
- description: String
- created_at: DateTime

### Permission
- id: UUID (PK)
- name: String
- description: String
- created_at: DateTime

### RefreshToken
- id: UUID (PK)
- token: String
- user_id: UUID (FK -> User.id)
- expires_at: DateTime
- created_at: DateTime
- revoked: Boolean

### Template
- id: UUID (PK)
- user_id: UUID (FK -> User.id)
- title: String
- content: String
- keyword: String
- usage_count: Integer
- is_shared: Boolean
- tags: String[]
- category: String
- version: Integer
- created_at: DateTime
- updated_at: DateTime

### TemplateVersion
- id: UUID (PK)
- template_id: UUID (FK -> Template.id)
- version_number: Integer
- content: String
- version_note: String
- created_at: DateTime

### UserSettings
- id: UUID (PK)
- user_id: UUID (FK -> User.id, unique)
- enable_suggestions: Boolean
- suggestion_frequency: String
- enable_history: Boolean
- domains: String[]
- created_at: DateTime
- updated_at: DateTime

### UsageHistory
- id: UUID (PK)
- user_id: UUID (FK -> User.id)
- template_id: UUID (FK -> Template.id, nullable)
- context: String
- generated_text: String
- selected: Boolean
- timestamp: DateTime
- domain: String

## 관계
- User 1:N Template (사용자는 여러 템플릿을 가질 수 있음)
- User 1:1 UserSettings (사용자는 하나의 설정을 가짐)
- User 1:N UsageHistory (사용자는 여러 사용 이력을 가짐)
- Template 1:N UsageHistory (템플릿은 여러 사용 이력과 연결될 수 있음)

## 향후 확장 (MVP 이후)
- Team 모델: 사용자가 팀을 구성하여 템플릿을 공유할 수 있음
- 권한 관리: 팀 내에서 템플릿에 대한 접근 권한 관리
- 버전 관리: 템플릿의 변경 이력 추적 및 관리 