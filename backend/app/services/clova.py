import httpx
import json
from typing import Dict, List, Optional, Any
from config import CLOVA_STUDIO_API_KEY, CLOVA_STUDIO_API_ENDPOINT

class ClovaAPIException(Exception):
    """CLOVA API 호출 중 발생한 예외"""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"CLOVA API Error: {status_code} - {detail}")

class ClovaService:
    """CLOVA Studio HCX-005 API 클라이언트 서비스"""
    
    def __init__(self, api_key: str = CLOVA_STUDIO_API_KEY, api_endpoint: str = CLOVA_STUDIO_API_ENDPOINT):
        self.api_key = api_key
        self.api_endpoint = api_endpoint
        self.headers = {
            "Content-Type": "application/json",
            "X-NCP-CLOVASTUDIO-API-KEY": api_key
        }
    
    async def predict_text(
        self,
        prompt: str,
        max_tokens: int = 128,
        temperature: float = 0.5,
        top_p: float = 0.8,
        stop_strings: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """문맥 기반 텍스트 예측 요청"""
        # API 키가 없는 경우
        if not self.api_key:
            raise ClovaAPIException(status_code=500, detail="CLOVA API 키가 설정되지 않았습니다.")
        
        # 요청 데이터 구성
        payload = {
            "message": {
                "text": prompt
            },
            "maxTokens": max_tokens,
            "temperature": temperature,
            "topP": top_p,
            "includeAiFilters": True,
        }
        
        if stop_strings:
            payload["stopStrings"] = stop_strings
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_endpoint,
                    headers=self.headers,
                    content=json.dumps(payload),
                    timeout=30.0
                )
                
                # 에러 응답 처리
                if response.status_code != 200:
                    raise ClovaAPIException(
                        status_code=response.status_code,
                        detail=response.text
                    )
                
                result = response.json()
                return result
                
        except httpx.TimeoutException:
            raise ClovaAPIException(
                status_code=408, 
                detail="CLOVA API 요청 시간이 초과되었습니다."
            )
        except httpx.RequestError as e:
            raise ClovaAPIException(
                status_code=500, 
                detail=f"CLOVA API 요청 중 오류가 발생했습니다: {str(e)}"
            )
    
    async def format_prompt(self, context: str, keyword: Optional[str] = None) -> str:
        """AI 문장 예측을 위한 프롬프트 포맷팅"""
        base_prompt = "다음은 비즈니스 이메일이나 메시지의 일부입니다. 문맥에 맞게 자연스럽게 이어지는 다음 문장이나 단락을 생성해주세요.\n\n"
        
        if keyword:
            base_prompt += f"키워드: {keyword}\n\n"
        
        base_prompt += f"문맥: {context}\n\n"
        base_prompt += "다음 내용: "
        
        return base_prompt
    
    async def generate_text_completion(
        self, 
        context: str, 
        keyword: Optional[str] = None,
        max_tokens: int = 100
    ) -> Dict[str, Any]:
        """주어진 컨텍스트에 기반하여 다음 텍스트를 예측합니다."""
        # 프롬프트 구성
        prompt = await self.format_prompt(context, keyword)
        
        # API 호출
        response = await self.predict_text(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=0.7,
            top_p=0.9,
            stop_strings=["\n\n", "---"]
        )
        
        # 결과 파싱 및 반환
        if "result" in response and "text" in response["result"]:
            generated_text = response["result"]["text"].strip()
            
            return {
                "generated_text": generated_text,
                "context": context,
                "keyword": keyword,
                "prompt": prompt,
                "full_response": response
            }
        
        raise ClovaAPIException(
            status_code=500,
            detail="CLOVA API 응답에서 결과를 찾을 수 없습니다."
        )

# 서비스 인스턴스 생성
clova_service = ClovaService() 