#!/bin/bash
 
# pytest를 사용하여 모든 테스트 실행
cd "$(dirname "$0")/.."
python -m pytest tests/ -v 