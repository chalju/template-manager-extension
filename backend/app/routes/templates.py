from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from app.schemas.template import (
    TemplateCreate, TemplateUpdate, TemplateResponse, 
    TemplateSearchParams, TemplateVersionResponse, TemplateVersion, TemplateSearchResponse
)
from app.auth.jwt import get_current_user
from app.database.client import db
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate, 
    current_user = Depends(get_current_user)
):
    """새로운 템플릿을 생성합니다."""
    try:
        print(f"템플릿 생성 요청 데이터: {template_data}")
        
        # 요청 데이터 처리 - name을 필수로, title을 선택적으로
        new_template = {
            "id": f"template-{int(datetime.now().timestamp())}",
            "name": template_data.name,  # name은 필수
            "title": template_data.title or template_data.name,  # title이 없으면 name 사용
            "content": template_data.content,
            "shortcut": template_data.shortcut,
            "user_id": current_user.id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "categories": template_data.categories or []  # categories 필드 추가
        }

        return new_template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 생성 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/", response_model=List[TemplateResponse])
async def get_templates(
    keyword: Optional[str] = None,
    is_shared: Optional[bool] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None,  # 쉼표로 구분된 태그 목록
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    sort_by: str = "usage_count",  # 정렬 필드
    sort_order: str = "desc",      # 정렬 방향
    current_user = Depends(get_current_user)
):
    """사용자의 템플릿 목록을 조회합니다."""
    try:
        # 쿼리 조건 구성
        where_condition: Dict[str, Any] = {"user_id": current_user.id}
        
        if keyword:
            where_condition["keyword"] = keyword
        
        if is_shared is not None:
            where_condition["is_shared"] = is_shared
        
        if category:
            where_condition["category"] = category
        
        if tags:
            tag_list = tags.split(",")
            where_condition["tags"] = {"hasSome": tag_list}
        
        # 정렬 방향 설정
        order_direction = "desc" if sort_order.lower() == "desc" else "asc"
        
        # 정렬 필드 설정 (사용 가능한 필드만 허용)
        allowed_sort_fields = ["usage_count", "created_at", "updated_at", "title"]
        if sort_by not in allowed_sort_fields:
            sort_by = "usage_count"  # 기본값
        
        # 템플릿 조회 (목업 데이터 사용)
        templates = [
            {
                "id": "template-1",
                "title": "SSL 인증서 갱신 안내",  # title 필드 추가
                "name": "SSL 인증서 갱신 안내",   # name 필드 유지 (선택적)
                "content": "안녕하세요,\n\n귀사의 SSL 인증서 갱신 기간이 30일 이내로 다가왔습니다. 서비스 중단을 방지하기 위해 가능한 빠른 시일 내에 인증서 갱신을 진행해주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "ssl",
                "user_id": current_user.id,
                "created_at": datetime.now() - timedelta(days=10),
                "updated_at": datetime.now() - timedelta(days=5),
                "categories": []  # categories 필드 추가
            },
            {
                "id": "template-2",
                "title": "회의 일정 안내",       # title 필드 추가
                "name": "회의 일정 안내",        # name 필드 유지 (선택적)
                "content": "안녕하세요,\n\n다음 회의 일정을 안내드립니다.\n일시: [날짜] [시간]\n장소: [장소]\n안건: [안건]\n\n참석 여부를 답장으로 알려주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "meeting",
                "user_id": current_user.id,
                "created_at": datetime.now() - timedelta(days=5),
                "updated_at": datetime.now() - timedelta(days=2),
                "categories": []  # categories 필드 추가
            }
        ]
        
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/search", response_model=TemplateSearchResponse)
async def search_templates(
    keyword: str = Query("", description="검색 키워드"),
    current_user = Depends(get_current_user)
):
    """사용자의 템플릿을 검색합니다."""
    try:
        # 실제 DB에서는 아래 코드를 사용하세요
        # templates = await db.template.find_many(
        #     where={
        #         "user_id": current_user.id,
        #         "OR": [
        #             {"name": {"contains": keyword}},
        #             {"content": {"contains": keyword}},
        #             {"shortcut": {"contains": keyword}}
        #         ]
        #     }
        # )

        # 임시 목업 데이터 - 일관된 필드명과 데이터 구조 사용
        templates = [
            {
                "id": "1",
                "name": "SSL 인증서 갱신 안내",
                "title": "SSL 인증서 갱신 안내",
                "content": "안녕하세요,\n\n귀사의 SSL 인증서 갱신 기간이 30일 이내로 다가왔습니다. 서비스 중단을 방지하기 위해 가능한 빠른 시일 내에 인증서 갱신을 진행해주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "ssl",
                "keyword": "ssl",
                "user_id": current_user.id,
                "created_at": "2023-09-15T00:00:00.000Z",
                "updated_at": "2023-09-15T00:00:00.000Z",
                "categories": []
            },
            {
                "id": "2",
                "name": "회의 일정 안내",
                "title": "회의 일정 안내",
                "content": "안녕하세요,\n\n다음 회의 일정을 안내드립니다.\n일시: [날짜] [시간]\n장소: [장소]\n안건: [안건]\n\n참석 여부를 답장으로 알려주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "meeting",
                "keyword": "meeting",
                "user_id": current_user.id,
                "created_at": "2023-09-15T00:00:00.000Z",
                "updated_at": "2023-09-15T00:00:00.000Z",
                "categories": []
            }
        ]

        # 키워드로 필터링
        if keyword:
            lowercase_keyword = keyword.lower()
            templates = [
                t for t in templates 
                if (t["name"] and lowercase_keyword in t["name"].lower()) or 
                   (t["title"] and lowercase_keyword in t["title"].lower()) or
                   (t["content"] and lowercase_keyword in t["content"].lower()) or
                   (t["shortcut"] and lowercase_keyword in t["shortcut"].lower()) or
                   (t["keyword"] and lowercase_keyword in t["keyword"].lower())
            ]

        return {"templates": templates}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 검색 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str = Path(..., description="템플릿 ID"),
    current_user = Depends(get_current_user)
):
    """특정 템플릿을 가져옵니다."""
    try:
        # 실제 DB에서는 아래 코드를 사용하세요
        # template = await db.template.find_first(
        #     where={
        #         "id": template_id,
        #         "user_id": current_user.id
        #     }
        # )
        # if not template:
        #     raise HTTPException(
        #         status_code=status.HTTP_404_NOT_FOUND,
        #         detail="템플릿을 찾을 수 없습니다."
        #     )

        # 임시 목업 데이터
        if template_id == "1":
            template = {
                "id": "1",
                "title": "SSL 인증서 갱신 안내",
                "name": "SSL 인증서 갱신 안내",
                "content": "안녕하세요,\n\n귀사의 SSL 인증서 갱신 기간이 30일 이내로 다가왔습니다. 서비스 중단을 방지하기 위해 가능한 빠른 시일 내에 인증서 갱신을 진행해주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "ssl",
                "user_id": current_user.id,
                "created_at": "2023-09-15T00:00:00.000Z",
                "updated_at": "2023-09-15T00:00:00.000Z",
                "categories": []
            }
        elif template_id == "2":
            template = {
                "id": "2",
                "title": "회의 일정 안내",
                "name": "회의 일정 안내",
                "content": "안녕하세요,\n\n다음 회의 일정을 안내드립니다.\n일시: [날짜] [시간]\n장소: [장소]\n안건: [안건]\n\n참석 여부를 답장으로 알려주시기 바랍니다.\n\n감사합니다.",
                "shortcut": "meeting",
                "user_id": current_user.id,
                "created_at": "2023-09-15T00:00:00.000Z",
                "updated_at": "2023-09-15T00:00:00.000Z",
                "categories": []
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="템플릿을 찾을 수 없습니다."
            )

        return template
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 조회 중 오류가 발생했습니다: {str(e)}"
        )

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_data: TemplateUpdate,
    template_id: str = Path(..., description="업데이트할 템플릿 ID"),
    current_user = Depends(get_current_user)
):
    """템플릿을 업데이트합니다."""
    try:
        print(f"템플릿 업데이트 요청: {template_id}, 데이터: {template_data}")
        
        # 임시 응답 데이터 (실제 DB 연동 시 수정 필요)
        updated_template = {
            "id": template_id,
            "name": template_data.name or "업데이트된 템플릿",
            "title": template_data.title or template_data.name,  # title이 없으면 name 사용
            "content": template_data.content or "템플릿 내용",
            "shortcut": template_data.shortcut or "shortcut",
            "user_id": current_user.id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        return updated_template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 업데이트 중 오류가 발생했습니다: {str(e)}"
        )

@router.delete("/{template_id}", status_code=status.HTTP_200_OK)
async def delete_template(
    template_id: str = Path(..., description="삭제할 템플릿 ID"),
    current_user = Depends(get_current_user)
):
    """템플릿을 삭제합니다."""
    try:
        print(f"템플릿 삭제 요청: {template_id}, 사용자: {current_user.id}")
        
        # 실제 구현에서는 DB에서 템플릿을 삭제합니다.
        # 지금은 임시 응답만 반환
        
        return {"status": "success", "message": "템플릿이 성공적으로 삭제되었습니다.", "id": template_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@router.get("/{template_id}/versions", response_model=TemplateVersionResponse)
async def get_template_versions(
    template_id: str,
    current_user = Depends(get_current_user)
):
    """템플릿의 모든 버전 이력을 조회합니다."""
    # 템플릿 존재 여부 확인
    template = await db.template.find_unique(
        where={"id": template_id}
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="템플릿을 찾을 수 없습니다."
        )
    
    # 권한 확인 (소유자만 버전 이력 조회 가능)
    if template.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 템플릿의 버전 이력을 조회할 권한이 없습니다."
        )
    
    # 버전 이력 조회
    versions = await db.templateversion.find_many(
        where={"template_id": template_id},
        order={"version_number": "desc"}
    )
    
    # 응답 데이터 구성
    version_responses = []
    for version in versions:
        version_responses.append(
            TemplateVersion(
                version_id=version.id,
                content=version.content,
                version_note=version.version_note,
                created_at=version.created_at
            )
        )
    
    return TemplateVersionResponse(
        template_id=template_id,
        versions=version_responses
    )

@router.post("/{template_id}/restore/{version_id}", response_model=TemplateResponse)
async def restore_template_version(
    template_id: str,
    version_id: str,
    current_user = Depends(get_current_user)
):
    """이전 버전의 템플릿으로 복원합니다."""
    # 템플릿 존재 여부 확인
    template = await db.template.find_unique(
        where={"id": template_id}
    )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="템플릿을 찾을 수 없습니다."
        )
    
    # 권한 확인 (소유자만 버전 복원 가능)
    if template.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 템플릿의 버전을 복원할 권한이 없습니다."
        )
    
    # 버전 정보 조회
    version = await db.templateversion.find_unique(
        where={"id": version_id}
    )
    
    if not version or version.template_id != template_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 버전을 찾을 수 없습니다."
        )
    
    # 새 버전 번호 생성
    new_version_number = template.version + 1
    
    # 템플릿 내용을 이전 버전으로 업데이트
    updated_template = await db.template.update(
        where={"id": template_id},
        data={
            "content": version.content,
            "version": new_version_number
        }
    )
    
    # 새 버전 기록 생성 (복원 작업)
    await db.templateversion.create(
        data={
            "template_id": template_id,
            "version_number": new_version_number,
            "content": version.content,
            "version_note": f"버전 {version.version_number}에서 복원됨"
        }
    )
    
    return updated_template

@router.post("/{template_id}/increment-usage", response_model=TemplateResponse)
async def increment_template_usage(
    template_id: str = Path(..., description="템플릿 ID"),
    current_user = Depends(get_current_user)
):
    """템플릿 사용 횟수를 증가시킵니다."""
    try:
        print(f"템플릿 사용량 증가 요청: {template_id}")
        
        # 임시 응답 데이터 (실제 DB 연동 시 수정 필요)
        # 기본 템플릿인 경우 default- 접두어를 확인
        if template_id.startswith('default-'):
            template = {
                "id": template_id,
                "name": "기본 템플릿",
                "title": "기본 템플릿",
                "content": "템플릿 내용",
                "shortcut": "shortcut",
                "user_id": current_user.id,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            return template
            
        # 실제 템플릿이면 DB에서 조회 (지금은 목업)
        template = {
            "id": template_id,
            "name": "템플릿 제목",
            "title": "템플릿 제목",
            "content": "템플릿 내용",
            "shortcut": "shortcut",
            "user_id": current_user.id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        return template
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"템플릿 사용량 증가 중 오류가 발생했습니다: {str(e)}"
        )

# 새로운 엔드포인트 추가

@router.get("/analytics/popular", response_model=List[TemplateResponse])
async def get_popular_templates(
    category: Optional[str] = None,
    time_period: Optional[str] = Query("month", regex="^(day|week|month|year|all)$"),
    limit: int = Query(10, ge=1, le=50),
    current_user = Depends(get_current_user)
):
    """가장 많이 사용된 템플릿을 조회합니다."""
    # 쿼리 조건 구성
    where_condition = {
        "OR": [
            {"user_id": current_user.id},
            {"is_shared": True}
        ]
    }
    
    if category:
        where_condition["category"] = category
    
    # 시간 기간 필터링
    if time_period != "all":
        now = datetime.utcnow()
        time_delta = {
            "day": timedelta(days=1),
            "week": timedelta(weeks=1),
            "month": timedelta(days=30),
            "year": timedelta(days=365)
        }
        where_condition["updated_at"] = {"gte": now - time_delta[time_period]}
    
    # 인기 템플릿 조회
    templates = await db.template.find_many(
        where=where_condition,
        take=limit,
        order={"usage_count": "desc"}
    )
    
    return templates

@router.get("/analytics/category-stats", response_model=List[Dict[str, Any]])
async def get_category_statistics(
    current_user = Depends(get_current_user)
):
    """카테고리별 템플릿 통계를 조회합니다."""
    # 사용자의 템플릿 조회
    templates = await db.template.find_many(
        where={"user_id": current_user.id}
    )
    
    # 카테고리별 그룹화 및 통계 계산
    category_stats = {}
    for template in templates:
        category = template.category or "미분류"
        if category not in category_stats:
            category_stats[category] = {
                "count": 0,
                "total_usage": 0,
                "shared_count": 0
            }
        
        category_stats[category]["count"] += 1
        category_stats[category]["total_usage"] += template.usage_count
        if template.is_shared:
            category_stats[category]["shared_count"] += 1
    
    # 결과 포맷팅
    result = []
    for category, stats in category_stats.items():
        result.append({
            "category": category,
            "template_count": stats["count"],
            "total_usage": stats["total_usage"],
            "shared_count": stats["shared_count"],
            "average_usage": stats["total_usage"] / stats["count"] if stats["count"] > 0 else 0
        })
    
    # 템플릿 수 기준으로 내림차순 정렬
    result.sort(key=lambda x: x["template_count"], reverse=True)
    
    return result

@router.post("/bulk-update", response_model=Dict[str, Any])
async def bulk_update_templates(
    template_ids: List[str] = Body(...),
    update_data: TemplateUpdate = Body(...),
    current_user = Depends(get_current_user)
):
    """여러 템플릿을 일괄 업데이트합니다."""
    # 업데이트할 데이터 필터링 (None 값은 제외)
    filtered_data = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if not filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="업데이트할 데이터가 제공되지 않았습니다."
        )
    
    # 내용은 일괄 변경 시 업데이트할 수 없음 (버전 관리 문제)
    if "content" in filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="일괄 업데이트에서는 템플릿 내용을 변경할 수 없습니다. 개별 템플릿을 업데이트하세요."
        )
    
    # 각 템플릿 업데이트 처리
    results = {
        "success_count": 0,
        "failed_count": 0,
        "failures": []
    }
    
    for template_id in template_ids:
        try:
            # 템플릿 존재 여부 및 권한 확인
            template = await db.template.find_unique(where={"id": template_id})
            
            if not template:
                results["failed_count"] += 1
                results["failures"].append({
                    "id": template_id,
                    "error": "템플릿을 찾을 수 없습니다."
                })
                continue
            
            if template.user_id != current_user.id:
                results["failed_count"] += 1
                results["failures"].append({
                    "id": template_id,
                    "error": "이 템플릿을 수정할 권한이 없습니다."
                })
                continue
            
            # 템플릿 업데이트
            await db.template.update(
                where={"id": template_id},
                data=filtered_data
            )
            
            results["success_count"] += 1
            
        except Exception as e:
            results["failed_count"] += 1
            results["failures"].append({
                "id": template_id,
                "error": str(e)
            })
    
    return results

@router.post("/bulk-delete", response_model=Dict[str, Any])
async def bulk_delete_templates(
    template_ids: List[str] = Body(...),
    current_user = Depends(get_current_user)
):
    """여러 템플릿을 일괄 삭제합니다."""
    # 각 템플릿 삭제 처리
    results = {
        "success_count": 0,
        "failed_count": 0,
        "failures": []
    }
    
    for template_id in template_ids:
        try:
            # 템플릿 존재 여부 및 권한 확인
            template = await db.template.find_unique(where={"id": template_id})
            
            if not template:
                results["failed_count"] += 1
                results["failures"].append({
                    "id": template_id,
                    "error": "템플릿을 찾을 수 없습니다."
                })
                continue
            
            if template.user_id != current_user.id:
                results["failed_count"] += 1
                results["failures"].append({
                    "id": template_id,
                    "error": "이 템플릿을 삭제할 권한이 없습니다."
                })
                continue
            
            # 템플릿 삭제
            await db.template.delete(where={"id": template_id})
            
            results["success_count"] += 1
            
        except Exception as e:
            results["failed_count"] += 1
            results["failures"].append({
                "id": template_id,
                "error": str(e)
            })
    
    return results

@router.get("/recommendations", response_model=List[TemplateResponse])
async def get_template_recommendations(
    context: Optional[str] = None,
    keyword: Optional[str] = None,
    limit: int = Query(5, ge=1, le=20),
    current_user = Depends(get_current_user)
):
    """컨텍스트 또는 키워드에 기반한 템플릿 추천을 제공합니다."""
    # 쿼리 조건 구성
    where_condition = {
        "OR": [
            {"user_id": current_user.id},
            {"is_shared": True}
        ]
    }
    
    # 컨텍스트 기반 필터링 (간단한 구현)
    if context:
        # 컨텍스트에서 키워드를 추출하는 로직은 더 복잡할 수 있음
        # 여기서는 간단히 컨텍스트에 포함된 단어를 검색
        words = context.lower().split()
        if words:
            # 가장 긴 단어 3개를 키워드로 사용 (간단한 예시)
            keywords = sorted(words, key=len, reverse=True)[:3]
            where_condition["OR"].append(
                {"keyword": {"in": keywords}}
            )
    
    # 키워드 기반 필터링
    if keyword:
        where_condition["keyword"] = keyword
    
    # 템플릿 조회 (사용 횟수 기준 정렬)
    templates = await db.template.find_many(
        where=where_condition,
        take=limit,
        order={"usage_count": "desc"}
    )
    
    return templates 