from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.auth.jwt import get_current_user
from app.database.client import db
from app.schemas.team import (
    TeamCreate, TeamResponse, TeamUpdate, 
    TeamMemberResponse, TeamMemberUpdate,
    TeamInvitationCreate, TeamInvitationResponse,
    TeamTemplateCreate, TeamTemplateResponse, TeamTemplateUpdate
)

router = APIRouter()

# 팀 관리 엔드포인트
@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user = Depends(get_current_user)
):
    """새로운 팀을 생성합니다."""
    # 팀 생성
    new_team = await db.team.create(
        data={
            "name": team_data.name,
            "description": team_data.description,
            # 첫 멤버로 생성자를 admin 역할로 추가
            "members": {
                "create": {
                    "user_id": current_user.id,
                    "role": "admin"
                }
            }
        }
    )
    
    return new_team

@router.get("/", response_model=Dict[str, List[TeamResponse]])
async def get_teams(
    current_user = Depends(get_current_user)
):
    """현재 사용자가 속한 팀 목록을 조회합니다."""
    # 사용자의 팀 멤버십 조회
    team_memberships = await db.teammember.find_many(
        where={"user_id": current_user.id},
        include={"team": True}
    )
    
    # 응답 형식으로 변환
    teams = [membership.team for membership in team_memberships]
    
    return {"teams": teams}

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user = Depends(get_current_user)
):
    """팀 상세 정보를 조회합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={
            "members": {
                "include": {"user": True}
            },
            "shared_templates": {
                "include": {"template": True}
            }
        }
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 팀원인지 확인
    if not any(member.user_id == current_user.id for member in team.members):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 팀에 접근할 권한이 없습니다."
        )
    
    return team

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    team_data: TeamUpdate,
    current_user = Depends(get_current_user)
):
    """팀 정보를 업데이트합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 관리자인지 확인
    is_admin = any(member.user_id == current_user.id and member.role == "admin" 
                  for member in team.members)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀 정보를 수정할 권한이 없습니다."
        )
    
    # 팀 업데이트
    updated_team = await db.team.update(
        where={"id": team_id},
        data={
            "name": team_data.name,
            "description": team_data.description
        }
    )
    
    return updated_team

@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    current_user = Depends(get_current_user)
):
    """팀을 삭제합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 관리자인지 확인
    is_admin = any(member.user_id == current_user.id and member.role == "admin" 
                  for member in team.members)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀을 삭제할 권한이 없습니다."
        )
    
    # 팀 삭제
    await db.team.delete(
        where={"id": team_id}
    )
    
    return None

# 팀원 관리 엔드포인트
@router.post("/{team_id}/invitations", response_model=TeamInvitationResponse)
async def invite_team_member(
    team_id: str,
    invitation_data: TeamInvitationCreate,
    current_user = Depends(get_current_user)
):
    """새로운 팀원을 초대합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 관리자 또는 편집자인지 확인
    member = next((m for m in team.members if m.user_id == current_user.id), None)
    if not member or member.role not in ["admin", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀원을 초대할 권한이 없습니다."
        )
    
    # 초대장 생성
    import secrets
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    invitation = await db.teaminvitation.create(
        data={
            "team_id": team_id,
            "email": invitation_data.email,
            "role": invitation_data.role,
            "invited_by": current_user.id,
            "token": token,
            "expires_at": expires_at
        }
    )
    
    # 응답에 초대 링크 추가
    invitation_with_link = {
        **invitation,
        "invitation_link": f"https://app.example.com/invite?token={token}"
    }
    
    return invitation_with_link

@router.post("/invitations/accept", response_model=TeamMemberResponse)
async def accept_invitation(
    token: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    """팀 초대를 수락합니다."""
    # 초대장 조회
    invitation = await db.teaminvitation.find_unique(
        where={"token": token}
    )
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="초대장을 찾을 수 없습니다."
        )
    
    # 초대장 만료 확인
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초대장이 만료되었습니다."
        )
    
    # 이미 팀원인지 확인
    existing_member = await db.teammember.find_unique(
        where={
            "team_id_user_id": {
                "team_id": invitation.team_id,
                "user_id": current_user.id
            }
        }
    )
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 팀의 멤버입니다."
        )
    
    # 초대 수락 - 팀원 추가
    new_member = await db.teammember.create(
        data={
            "team_id": invitation.team_id,
            "user_id": current_user.id,
            "role": invitation.role
        }
    )
    
    # 초대장 삭제
    await db.teaminvitation.delete(
        where={"id": invitation.id}
    )
    
    return new_member

@router.put("/{team_id}/members/{member_id}", response_model=TeamMemberResponse)
async def update_team_member(
    team_id: str,
    member_id: str,
    member_data: TeamMemberUpdate,
    current_user = Depends(get_current_user)
):
    """팀원의 역할을 변경합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 관리자인지 확인
    is_admin = any(member.user_id == current_user.id and member.role == "admin" 
                  for member in team.members)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀원 역할을 변경할 권한이 없습니다."
        )
    
    # 멤버 조회
    member = await db.teammember.find_unique(
        where={"id": member_id}
    )
    
    if not member or member.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀원을 찾을 수 없습니다."
        )
    
    # 마지막 관리자인지 확인
    if member.role == "admin" and member_data.role != "admin":
        admin_count = sum(1 for m in team.members if m.role == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="팀에는 최소 한 명의 관리자가 필요합니다."
            )
    
    # 멤버 업데이트
    updated_member = await db.teammember.update(
        where={"id": member_id},
        data={"role": member_data.role}
    )
    
    return updated_member

@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: str,
    member_id: str,
    current_user = Depends(get_current_user)
):
    """팀원을 제거합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 멤버 조회
    member = await db.teammember.find_unique(
        where={"id": member_id},
        include={"user": True}
    )
    
    if not member or member.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀원을 찾을 수 없습니다."
        )
    
    # 권한 확인
    current_member = next((m for m in team.members if m.user_id == current_user.id), None)
    if not current_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 팀에 접근할 권한이 없습니다."
        )
    
    is_admin = current_member.role == "admin"
    is_self_removal = member.user_id == current_user.id
    
    if not (is_admin or is_self_removal):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀원을 제거할 권한이 없습니다."
        )
    
    # 마지막 관리자인지 확인
    if member.role == "admin":
        admin_count = sum(1 for m in team.members if m.role == "admin")
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="팀에는 최소 한 명의 관리자가 필요합니다."
            )
    
    # 멤버 제거
    await db.teammember.delete(
        where={"id": member_id}
    )
    
    return None

# 팀 템플릿 관리 엔드포인트
@router.post("/{team_id}/templates", response_model=TeamTemplateResponse)
async def share_template_with_team(
    team_id: str,
    template_data: TeamTemplateCreate,
    current_user = Depends(get_current_user)
):
    """템플릿을 팀과 공유합니다."""
    # 팀 조회
    team = await db.team.find_unique(
        where={"id": team_id},
        include={"members": True}
    )
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀을 찾을 수 없습니다."
        )
    
    # 사용자가 팀원인지 확인
    member = next((m for m in team.members if m.user_id == current_user.id), None)
    if not member or member.role not in ["admin", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="템플릿을 공유할 권한이 없습니다."
        )
    
    # 템플릿 조회
    template = await db.template.find_unique(
        where={"id": template_data.template_id}
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="템플릿을 찾을 수 없습니다."
        )
    
    # 템플릿 소유권 확인
    if template.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 템플릿을 공유할 권한이 없습니다."
        )
    
    # 이미 공유되어 있는지 확인
    existing_share = await db.teamtemplate.find_unique(
        where={
            "team_id_template_id": {
                "team_id": team_id,
                "template_id": template_data.template_id
            }
        }
    )
    
    if existing_share:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 템플릿은 이미 팀과 공유되어 있습니다."
        )
    
    # 팀 템플릿 생성
    team_template = await db.teamtemplate.create(
        data={
            "team_id": team_id,
            "template_id": template_data.template_id,
            "shared_by": current_user.id,
            "permissions": template_data.permissions
        }
    )
    
    return team_template

@router.get("/{team_id}/templates", response_model=List[TeamTemplateResponse])
async def get_team_templates(
    team_id: str,
    current_user = Depends(get_current_user)
):
    """팀의 템플릿 목록을 조회합니다."""
    # 팀 조회
    team_member = await db.teammember.find_first(
        where={
            "team_id": team_id,
            "user_id": current_user.id
        }
    )
    
    if not team_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 팀에 접근할 권한이 없습니다."
        )
    
    # 팀 템플릿 조회
    team_templates = await db.teamtemplate.find_many(
        where={"team_id": team_id},
        include={"template": True}
    )
    
    return team_templates

@router.put("/{team_id}/templates/{template_id}", response_model=TeamTemplateResponse)
async def update_team_template(
    team_id: str,
    template_id: str,
    template_data: TeamTemplateUpdate,
    current_user = Depends(get_current_user)
):
    """팀 템플릿의 권한을 변경합니다."""
    # 팀 멤버 확인
    team_member = await db.teammember.find_first(
        where={
            "team_id": team_id,
            "user_id": current_user.id
        }
    )
    
    if not team_member or team_member.role not in ["admin", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀 템플릿을 수정할 권한이 없습니다."
        )
    
    # 팀 템플릿 조회
    team_template = await db.teamtemplate.find_unique(
        where={
            "team_id_template_id": {
                "team_id": team_id,
                "template_id": template_id
            }
        }
    )
    
    if not team_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀 템플릿을 찾을 수 없습니다."
        )
    
    # 업데이트
    updated_template = await db.teamtemplate.update(
        where={
            "team_id_template_id": {
                "team_id": team_id,
                "template_id": template_id
            }
        },
        data={"permissions": template_data.permissions}
    )
    
    return updated_template

@router.delete("/{team_id}/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unshare_team_template(
    team_id: str,
    template_id: str,
    current_user = Depends(get_current_user)
):
    """팀 템플릿 공유를 해제합니다."""
    # 팀 멤버 확인
    team_member = await db.teammember.find_first(
        where={
            "team_id": team_id,
            "user_id": current_user.id
        }
    )
    
    if not team_member or team_member.role not in ["admin", "editor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="팀 템플릿을 제거할 권한이 없습니다."
        )
    
    # 팀 템플릿 조회
    team_template = await db.teamtemplate.find_unique(
        where={
            "team_id_template_id": {
                "team_id": team_id,
                "template_id": template_id
            }
        },
        include={"template": True}
    )
    
    if not team_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="팀 템플릿을 찾을 수 없습니다."
        )
    
    # 템플릿 소유자 또는 관리자인지 확인
    is_owner = team_template.template.user_id == current_user.id
    is_admin = team_member.role == "admin"
    
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 템플릿의 공유를 해제할 권한이 없습니다."
        )
    
    # 공유 해제
    await db.teamtemplate.delete(
        where={
            "team_id_template_id": {
                "team_id": team_id,
                "template_id": template_id
            }
        }
    )
    
    return None 