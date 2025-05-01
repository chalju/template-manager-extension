from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.usage_history import UsageHistoryCreate, UsageHistoryUpdate, UsageHistoryResponse
from app.auth.jwt import get_current_user
from app.database.client import db
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/", response_model=UsageHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_usage_history(
    history_data: UsageHistoryCreate,
    current_user = Depends(get_current_user)
):
    """새로운 사용 이력을 기록합니다."""
    # 사용자 ID 확인 (권한 검증)
    if history_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="다른 사용자의 사용 이력은 생성할 수 없습니다."
        )
    
    # 템플릿 ID가 있는 경우 접근 권한 확인
    if history_data.template_id:
        template = await db.template.find_unique(
            where={"id": history_data.template_id}
        )
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="지정된 템플릿을 찾을 수 없습니다."
            )
        
        if template.user_id != current_user.id and not template.is_shared:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="이 템플릿에 접근할 권한이 없습니다."
            )
    
    # 사용 이력 생성
    new_history = await db.usagehistory.create(
        data={
            "user_id": current_user.id,
            "template_id": history_data.template_id,
            "context": history_data.context,
            "generated_text": history_data.generated_text,
            "selected": history_data.selected,
            "domain": history_data.domain
        }
    )
    
    return new_history

@router.get("/", response_model=List[UsageHistoryResponse])
async def get_usage_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    domain: Optional[str] = None,
    template_id: Optional[str] = None,
    selected: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """사용자의 사용 이력을 조회합니다."""
    # 쿼리 조건 구성
    where_condition = {"user_id": current_user.id}
    
    if start_date and end_date:
        where_condition["timestamp"] = {"gte": start_date, "lte": end_date}
    elif start_date:
        where_condition["timestamp"] = {"gte": start_date}
    elif end_date:
        where_condition["timestamp"] = {"lte": end_date}
    
    if domain:
        where_condition["domain"] = domain
    
    if template_id:
        where_condition["template_id"] = template_id
    
    if selected is not None:
        where_condition["selected"] = selected
    
    # 사용 이력 조회
    history_items = await db.usagehistory.find_many(
        where=where_condition,
        skip=skip,
        take=limit,
        order={"timestamp": "desc"}
    )
    
    return history_items

@router.get("/{history_id}", response_model=UsageHistoryResponse)
async def get_usage_history_item(
    history_id: str,
    current_user = Depends(get_current_user)
):
    """특정 사용 이력 항목을 조회합니다."""
    # 사용 이력 조회
    history_item = await db.usagehistory.find_unique(
        where={"id": history_id}
    )
    
    if not history_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용 이력을 찾을 수 없습니다."
        )
    
    # 권한 확인 (본인의 이력만 조회 가능)
    if history_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 사용 이력에 접근할 권한이 없습니다."
        )
    
    return history_item

@router.put("/{history_id}", response_model=UsageHistoryResponse)
async def update_usage_history(
    history_id: str,
    history_data: UsageHistoryUpdate,
    current_user = Depends(get_current_user)
):
    """사용 이력 항목을 업데이트합니다."""
    # 사용 이력 조회
    history_item = await db.usagehistory.find_unique(
        where={"id": history_id}
    )
    
    if not history_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용 이력을 찾을 수 없습니다."
        )
    
    # 권한 확인 (본인의 이력만 수정 가능)
    if history_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 사용 이력을 수정할 권한이 없습니다."
        )
    
    # 업데이트할 데이터 필터링 (None 값은 제외)
    update_data = {k: v for k, v in history_data.model_dump(exclude_unset=True).items() if v is not None}
    
    # 사용 이력 업데이트
    updated_history = await db.usagehistory.update(
        where={"id": history_id},
        data=update_data
    )
    
    return updated_history

@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_usage_history(
    before_date: Optional[datetime] = None,
    current_user = Depends(get_current_user)
):
    """사용자의 모든 사용 이력을 삭제합니다."""
    # 삭제 조건 구성
    where_condition = {"user_id": current_user.id}
    
    # 특정 날짜 이전의 이력만 삭제하는 경우
    if before_date:
        where_condition["timestamp"] = {"lt": before_date}
    
    # 사용 이력 삭제
    await db.usagehistory.delete_many(
        where=where_condition
    )
    
    return None

@router.get("/stats/summary", response_model=dict)
async def get_usage_statistics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user = Depends(get_current_user)
):
    """사용자의 사용 이력 통계를 조회합니다."""
    # 기본 날짜 범위 (최근 30일)
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # 전체 이력 수
    total_count = await db.usagehistory.count(
        where={
            "user_id": current_user.id,
            "timestamp": {"gte": start_date, "lte": end_date}
        }
    )
    
    # 선택된 이력 수
    selected_count = await db.usagehistory.count(
        where={
            "user_id": current_user.id,
            "selected": True,
            "timestamp": {"gte": start_date, "lte": end_date}
        }
    )
    
    # 도메인별 통계 (추후 구현 예정)
    # 템플릿별 통계 (추후 구현 예정)
    
    return {
        "total_count": total_count,
        "selected_count": selected_count,
        "selected_percentage": (selected_count / total_count * 100) if total_count > 0 else 0,
        "date_range": {
            "start": start_date,
            "end": end_date
        }
    }

@router.get("/stats/domain", response_model=List[Dict[str, Any]])
async def get_domain_statistics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user = Depends(get_current_user)
):
    """도메인별 사용 이력 통계를 조회합니다."""
    # 기본 날짜 범위 (최근 30일)
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # 사용자의 사용 이력 조회
    history_items = await db.usagehistory.find_many(
        where={
            "user_id": current_user.id,
            "timestamp": {"gte": start_date, "lte": end_date}
        }
    )
    
    # 도메인별 그룹화 및 통계 계산
    domain_stats = {}
    for item in history_items:
        domain = item.domain or "기타"
        if domain not in domain_stats:
            domain_stats[domain] = {
                "count": 0,
                "selected_count": 0,
                "template_usage": set()
            }
        
        domain_stats[domain]["count"] += 1
        if item.selected:
            domain_stats[domain]["selected_count"] += 1
        if item.template_id:
            domain_stats[domain]["template_usage"].add(item.template_id)
    
    # 결과 포맷팅
    result = []
    for domain, stats in domain_stats.items():
        result.append({
            "domain": domain,
            "usage_count": stats["count"],
            "selected_count": stats["selected_count"],
            "template_count": len(stats["template_usage"]),
            "selected_percentage": (stats["selected_count"] / stats["count"] * 100) if stats["count"] > 0 else 0
        })
    
    # 사용 횟수 기준으로 내림차순 정렬
    result.sort(key=lambda x: x["usage_count"], reverse=True)
    
    return result

@router.get("/stats/time", response_model=List[Dict[str, Any]])
async def get_time_based_statistics(
    period: str = Query("day", regex="^(hour|day|week|month)$"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user = Depends(get_current_user)
):
    """시간대별 사용 이력 통계를 조회합니다."""
    # 기본 날짜 범위 설정
    if not end_date:
        end_date = datetime.utcnow()
        
    # 기간에 따른 시작일 설정
    if not start_date:
        if period == "hour":
            start_date = end_date - timedelta(days=1)  # 1일 데이터를 시간별로
        elif period == "day":
            start_date = end_date - timedelta(days=30)  # 30일 데이터를 일별로
        elif period == "week":
            start_date = end_date - timedelta(weeks=12)  # 12주 데이터를 주별로
        else:  # month
            start_date = end_date - timedelta(days=365)  # 1년 데이터를 월별로
    
    # 사용자의 사용 이력 조회
    history_items = await db.usagehistory.find_many(
        where={
            "user_id": current_user.id,
            "timestamp": {"gte": start_date, "lte": end_date}
        },
        order={"timestamp": "asc"}
    )
    
    # 시간 기간별 그룹화
    time_stats = {}
    for item in history_items:
        # 기간에 따른 키 생성
        if period == "hour":
            key = item.timestamp.strftime("%Y-%m-%d %H:00")
        elif period == "day":
            key = item.timestamp.strftime("%Y-%m-%d")
        elif period == "week":
            # ISO 주차 사용
            year, week, _ = item.timestamp.isocalendar()
            key = f"{year}-W{week:02d}"
        else:  # month
            key = item.timestamp.strftime("%Y-%m")
        
        # 통계 계산
        if key not in time_stats:
            time_stats[key] = {
                "count": 0,
                "selected_count": 0
            }
        
        time_stats[key]["count"] += 1
        if item.selected:
            time_stats[key]["selected_count"] += 1
    
    # 결과 포맷팅 (시간순 정렬)
    result = []
    for key in sorted(time_stats.keys()):
        stats = time_stats[key]
        result.append({
            "period": key,
            "usage_count": stats["count"],
            "selected_count": stats["selected_count"],
            "selected_percentage": (stats["selected_count"] / stats["count"] * 100) if stats["count"] > 0 else 0
        })
    
    return result

@router.get("/stats/templates", response_model=List[Dict[str, Any]])
async def get_template_usage_statistics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(10, ge=1, le=50),
    current_user = Depends(get_current_user)
):
    """템플릿별 사용 통계를 조회합니다."""
    # 기본 날짜 범위 (최근 30일)
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # 템플릿 ID가 있는 사용 이력만 조회
    history_items = await db.usagehistory.find_many(
        where={
            "user_id": current_user.id,
            "timestamp": {"gte": start_date, "lte": end_date},
            "template_id": {"not": None}
        }
    )
    
    # 템플릿별 통계 계산
    template_stats = {}
    for item in history_items:
        template_id = item.template_id
        if template_id not in template_stats:
            template_stats[template_id] = {
                "count": 0,
                "selected_count": 0
            }
        
        template_stats[template_id]["count"] += 1
        if item.selected:
            template_stats[template_id]["selected_count"] += 1
    
    # 템플릿 정보 조회
    template_info = {}
    for template_id in template_stats.keys():
        template = await db.template.find_unique(
            where={"id": template_id},
            select={"title": True, "keyword": True, "category": True}
        )
        if template:
            template_info[template_id] = template
    
    # 결과 포맷팅
    result = []
    for template_id, stats in template_stats.items():
        template_data = {
            "template_id": template_id,
            "usage_count": stats["count"],
            "selected_count": stats["selected_count"],
            "selected_percentage": (stats["selected_count"] / stats["count"] * 100) if stats["count"] > 0 else 0
        }
        
        # 템플릿 정보 추가
        if template_id in template_info:
            template_data["title"] = template_info[template_id].title
            template_data["keyword"] = template_info[template_id].keyword
            template_data["category"] = template_info[template_id].category
        
        result.append(template_data)
    
    # 사용 횟수 기준으로 내림차순 정렬 후 상위 N개만 반환
    result.sort(key=lambda x: x["usage_count"], reverse=True)
    return result[:limit]

@router.get("/personalized-suggestions", response_model=List[Dict[str, Any]])
async def get_personalized_suggestions(
    context: Optional[str] = None,
    limit: int = Query(5, ge=1, le=20),
    current_user = Depends(get_current_user)
):
    """사용자의 이용 패턴에 기반한 개인화된 추천을 제공합니다."""
    # 사용자 설정 조회
    user_settings = await db.usersettings.find_unique(
        where={"user_id": current_user.id}
    )
    
    # 사용자의 최근 사용 이력 조회
    recent_history = await db.usagehistory.find_many(
        where={
            "user_id": current_user.id,
            "selected": True  # 사용자가 선택한 항목만
        },
        take=50,
        order={"timestamp": "desc"}
    )
    
    # 가장 자주 사용한 템플릿 ID 추출
    template_usage_count = {}
    for item in recent_history:
        if item.template_id:
            template_usage_count[item.template_id] = template_usage_count.get(item.template_id, 0) + 1
    
    # 자주 사용한 템플릿 ID 목록 (사용 빈도 내림차순)
    frequent_template_ids = sorted(
        template_usage_count.keys(),
        key=lambda x: template_usage_count[x],
        reverse=True
    )
    
    # 추천 결과
    result = []
    
    # 컨텍스트 기반 추천 (간단한 구현)
    if context:
        # 컨텍스트에서 키워드를 추출하는 로직은 더 복잡할 수 있음
        # 여기서는 간단히 컨텍스트에 포함된 단어를 검색
        words = context.lower().split()
        if words:
            # 도메인 필터링 (사용자 설정에 기반)
            domain_filter = {}
            if user_settings and user_settings.domains:
                domain_filter = {"domain": {"in": user_settings.domains}}
            
            # 컨텍스트와 유사한 최근 사용 이력 찾기
            similar_history = await db.usagehistory.find_many(
                where={
                    "user_id": current_user.id,
                    "selected": True,
                    "context": {"contains": " ".join(words[:5])}  # 첫 5개 단어 포함 여부
                },
                take=10,
                order={"timestamp": "desc"}
            )
            
            # 유사한 이력에서 템플릿 ID 추출
            context_template_ids = []
            for item in similar_history:
                if item.template_id and item.template_id not in context_template_ids:
                    context_template_ids.append(item.template_id)
            
            # 컨텍스트 기반 템플릿 조회
            if context_template_ids:
                templates = await db.template.find_many(
                    where={"id": {"in": context_template_ids[:5]}},
                    take=limit
                )
                
                for template in templates:
                    result.append({
                        "id": template.id,
                        "title": template.title,
                        "content": template.content,
                        "keyword": template.keyword,
                        "usage_count": template.usage_count,
                        "recommendation_type": "context_based"
                    })
    
    # 결과가 충분하지 않으면 자주 사용한 템플릿 추가
    if len(result) < limit and frequent_template_ids:
        remaining_slots = limit - len(result)
        templates = await db.template.find_many(
            where={"id": {"in": frequent_template_ids[:remaining_slots]}}
        )
        
        for template in templates:
            # 이미 추가된 템플릿 제외
            if not any(item["id"] == template.id for item in result):
                result.append({
                    "id": template.id,
                    "title": template.title,
                    "content": template.content,
                    "keyword": template.keyword,
                    "usage_count": template.usage_count,
                    "recommendation_type": "frequently_used"
                })
    
    # 여전히 결과가 충분하지 않으면 인기 템플릿 추가
    if len(result) < limit:
        remaining_slots = limit - len(result)
        
        # 이미 추가된 템플릿 ID 목록
        existing_ids = [item["id"] for item in result]
        
        # 인기 템플릿 조회 (사용자 본인의 것 + 공유된 것)
        popular_templates = await db.template.find_many(
            where={
                "OR": [
                    {"user_id": current_user.id},
                    {"is_shared": True}
                ],
                "id": {"not": {"in": existing_ids}}
            },
            take=remaining_slots,
            order={"usage_count": "desc"}
        )
        
        for template in popular_templates:
            result.append({
                "id": template.id,
                "title": template.title,
                "content": template.content,
                "keyword": template.keyword,
                "usage_count": template.usage_count,
                "recommendation_type": "popular"
            })
    
    return result 