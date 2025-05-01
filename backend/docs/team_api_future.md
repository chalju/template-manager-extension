# 팀 API 구현 계획 문서

## 개요

이 문서는 AI 문장 자동완성 어시스턴트의 MVP 이후 구현될 팀 기능에 대한 계획을 설명합니다. 팀 기능은 여러 사용자가 템플릿과 설정을 공유하고 협업할 수 있게 하는 중요한 기능입니다. 이 문서는 데이터 모델, API 엔드포인트, 사용자 권한 체계, 그리고 기존 기능과의 통합 방법을 다룹니다.

## 데이터 모델 구조

### Team 모델

```prisma
model Team {
  id             String        @id @default(uuid())
  name           String
  description    String?
  created_at     DateTime      @default(now())
  updated_at     DateTime      @updatedAt
  
  // 관계
  members        TeamMember[]
  shared_templates TeamTemplate[]
}
```

### TeamMember 모델

```prisma
model TeamMember {
  id            String      @id @default(uuid())
  team_id       String
  user_id       String
  role          String      // "admin", "editor", "viewer"
  joined_at     DateTime    @default(now())
  
  // 관계
  team          Team        @relation(fields: [team_id], references: [id], onDelete: Cascade)
  user          User        @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@unique([team_id, user_id])
  @@index([team_id])
  @@index([user_id])
}
```

### TeamTemplate 모델

```prisma
model TeamTemplate {
  id           String      @id @default(uuid())
  team_id      String
  template_id  String
  shared_by    String      // 공유한 사용자 ID
  permissions  String      // "read-only", "editable"
  shared_at    DateTime    @default(now())
  
  // 관계
  team         Team        @relation(fields: [team_id], references: [id], onDelete: Cascade)
  template     Template    @relation(fields: [template_id], references: [id], onDelete: Cascade)
  
  @@unique([team_id, template_id])
  @@index([team_id])
  @@index([template_id])
}
```

### TeamInvitation 모델

```prisma
model TeamInvitation {
  id           String      @id @default(uuid())
  team_id      String
  email        String
  role         String      // "admin", "editor", "viewer"
  invited_by   String      // 초대한 사용자 ID
  token        String      @unique
  expires_at   DateTime
  created_at   DateTime    @default(now())
  
  // 관계
  team         Team        @relation(fields: [team_id], references: [id], onDelete: Cascade)
  
  @@index([team_id])
  @@index([token])
}
```

## API 엔드포인트

### 팀 관리 API

#### 1. 팀 생성

```
POST /api/teams
```

요청 본문:
```json
{
  "name": "마케팅팀",
  "description": "마케팅 부서용 공동 템플릿 관리"
}
```

응답:
```json
{
  "id": "team-uuid",
  "name": "마케팅팀",
  "description": "마케팅 부서용 공동 템플릿 관리",
  "created_at": "2023-11-01T09:00:00Z",
  "updated_at": "2023-11-01T09:00:00Z"
}
```

#### 2. 팀 목록 조회

```
GET /api/teams
```

응답:
```json
{
  "teams": [
    {
      "id": "team-uuid1",
      "name": "마케팅팀",
      "description": "마케팅 부서용 공동 템플릿 관리",
      "member_count": 5,
      "template_count": 12
    },
    {
      "id": "team-uuid2",
      "name": "영업팀",
      "description": "영업 담당자용 메시지 템플릿",
      "member_count": 8,
      "template_count": 20
    }
  ]
}
```

#### 3. 팀 상세 정보 조회

```
GET /api/teams/{team_id}
```

응답:
```json
{
  "id": "team-uuid",
  "name": "마케팅팀",
  "description": "마케팅 부서용 공동 템플릿 관리",
  "created_at": "2023-11-01T09:00:00Z",
  "updated_at": "2023-11-01T09:00:00Z",
  "members": [
    {
      "id": "member-uuid1",
      "user_id": "user-uuid1",
      "name": "김철수",
      "email": "kim@example.com",
      "role": "admin",
      "joined_at": "2023-11-01T09:00:00Z"
    },
    // ...
  ],
  "templates": [
    {
      "id": "template-uuid1",
      "title": "고객 응대 템플릿",
      "shared_by": "user-uuid1",
      "permissions": "editable",
      "shared_at": "2023-11-02T10:30:00Z"
    },
    // ...
  ]
}
```

#### 4. 팀 정보 업데이트

```
PUT /api/teams/{team_id}
```

요청 본문:
```json
{
  "name": "디지털 마케팅팀",
  "description": "디지털 마케팅 담당자들을 위한 템플릿 공유"
}
```

#### 5. 팀 삭제

```
DELETE /api/teams/{team_id}
```

### 팀원 관리 API

#### 1. 팀원 초대

```
POST /api/teams/{team_id}/invitations
```

요청 본문:
```json
{
  "email": "newuser@example.com",
  "role": "editor"
}
```

응답:
```json
{
  "id": "invitation-uuid",
  "team_id": "team-uuid",
  "email": "newuser@example.com",
  "role": "editor",
  "invitation_link": "https://app.example.com/invite?token=xyz123",
  "expires_at": "2023-11-15T09:00:00Z"
}
```

#### 2. 초대 수락

```
POST /api/teams/invitations/accept
```

요청 본문:
```json
{
  "token": "xyz123"
}
```

#### 3. 팀원 역할 변경

```
PUT /api/teams/{team_id}/members/{member_id}
```

요청 본문:
```json
{
  "role": "admin"
}
```

#### 4. 팀원 제거

```
DELETE /api/teams/{team_id}/members/{member_id}
```

### 팀 템플릿 관리 API

#### 1. 템플릿을 팀과 공유

```
POST /api/teams/{team_id}/templates
```

요청 본문:
```json
{
  "template_id": "template-uuid",
  "permissions": "editable"
}
```

#### 2. 팀 템플릿 목록 조회

```
GET /api/teams/{team_id}/templates
```

#### 3. 팀 템플릿 권한 변경

```
PUT /api/teams/{team_id}/templates/{template_id}
```

요청 본문:
```json
{
  "permissions": "read-only"
}
```

#### 4. 팀 템플릿 공유 해제

```
DELETE /api/teams/{team_id}/templates/{template_id}
```

## 권한 체계

팀 기능에서는 다음과 같은 역할 기반 권한 체계를 구현할 예정입니다:

1. **관리자(admin)**
   - 팀 생성, 수정, 삭제
   - 팀원 초대, 역할 변경, 제거
   - 템플릿 공유 및 공유 해제
   - 모든 공유 템플릿 수정

2. **편집자(editor)**
   - 템플릿 공유 및 공유 해제
   - 공유 템플릿 수정 (권한이 'editable'인 경우)
   - 팀 템플릿 사용

3. **조회자(viewer)**
   - 공유 템플릿 조회 및 사용
   - 템플릿 복제 (자신의 개인 템플릿으로)

## 기존 기능과의 통합

### 템플릿 조회 API 확장

템플릿 조회 API(`GET /api/templates`)는 다음과 같이 확장됩니다:

1. `include_team_templates` 쿼리 파라미터 추가:
   ```
   GET /api/templates?include_team_templates=true
   ```

2. 응답 형식에 소유권 정보 추가:
   ```json
   {
     "id": "template-uuid",
     "title": "고객 응대 템플릿",
     "ownership": {
       "type": "team",
       "team_id": "team-uuid",
       "team_name": "마케팅팀",
       "permissions": "editable"
     }
   }
   ```

### 사용자 설정 API 확장

사용자 설정에 팀 관련 설정 추가:

```json
{
  "team_notifications": true,
  "default_template_visibility": "private",
  "team_template_sorting": "name"
}
```

## 마이그레이션 계획

### 1단계: 데이터베이스 스키마 업데이트

1. 위에 정의된 팀 관련 모델 추가
2. 기존 템플릿에 대한 인덱스 추가

### 2단계: API 엔드포인트 구현

1. 팀 관리 API 구현
2. 팀원 관리 API 구현
3. 팀 템플릿 관리 API 구현

### 3단계: 프론트엔드 업데이트

1. 팀 관리 UI 추가
2. 템플릿 목록 및 상세 화면에 팀 정보 통합
3. 템플릿 공유 기능 구현

### 4단계: 배포 및 데이터 마이그레이션

1. 새 스키마로 데이터베이스 마이그레이션
2. 새 기능 점진적 롤아웃 (베타 테스트)

## 구현 타임라인

1. **기획 및 설계**: 2주
2. **백엔드 개발**: 4주
   - 데이터베이스 스키마 업데이트: 1주
   - API 엔드포인트 구현: 2주
   - 테스트 및 문서화: 1주
3. **프론트엔드 개발**: 3주
   - UI 컴포넌트 개발: 1.5주
   - API 통합: 1주
   - 테스트 및 디버깅: 0.5주
4. **베타 테스트 및 롤아웃**: 2주

총 예상 개발 기간: 11주

## 결론

팀 기능은 AI 문장 자동완성 어시스턴트의 협업 기능을 크게 향상시킬 것입니다. 사용자들이 템플릿을 공유하고 협업함으로써 일관된 커뮤니케이션을 유지하고 시간을 절약할 수 있을 것입니다. 이 문서에 설명된 계획은 MVP 출시 이후에 구현될 예정이며, 사용자 피드백에 따라 우선순위와 세부 사항이 조정될 수 있습니다. 