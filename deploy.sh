#!/bin/bash

# Simple MCP Server (Python Flask) 배포 스크립트
# smithery.ai 배포를 위한 자동화 스크립트

set -e

echo "🚀 Simple MCP Server (Python Flask) 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 필요한 파일들 확인
echo -e "${BLUE}📋 필요한 파일들 확인 중...${NC}"

required_files=("app.py" "requirements.txt" "smithery.yaml" "README.md" "Dockerfile")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}❌ 다음 파일들이 누락되었습니다:${NC}"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

echo -e "${GREEN}✅ 모든 필요한 파일들이 있습니다${NC}"

# 2. Git 저장소 확인
echo -e "${BLUE}🔍 Git 저장소 확인 중...${NC}"

if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git 저장소가 초기화되지 않았습니다. 초기화하겠습니다...${NC}"
    git init
    echo -e "${GREEN}✅ Git 저장소가 초기화되었습니다${NC}"
fi

# 3. Python 환경 확인
echo -e "${BLUE}🐍 Python 환경 확인 중...${NC}"
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ Python3가 설치되어 있습니다${NC}"
    python3 --version
else
    echo -e "${RED}❌ Python3가 설치되지 않았습니다${NC}"
    exit 1
fi

# 4. 의존성 설치
echo -e "${BLUE}📦 Python 의존성 설치 중...${NC}"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    echo -e "${GREEN}✅ Python 의존성 설치 완료${NC}"
else
    echo -e "${RED}❌ requirements.txt 파일이 없습니다${NC}"
    exit 1
fi

# 5. 코드 테스트 (간단한 문법 체크)
echo -e "${BLUE}🧪 Python 코드 테스트 중...${NC}"
python3 -m py_compile app.py
echo -e "${GREEN}✅ Python 코드 문법 검사 완료${NC}"

# 6. Git 커밋 준비
echo -e "${BLUE}📝 변경사항 커밋 준비 중...${NC}"

# 변경사항이 있는지 확인
if git diff --quiet && git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  커밋할 변경사항이 없습니다${NC}"
else
    git add .
    
    # 커밋 메시지 생성
    commit_message="feat: Simple MCP Server (Python Flask) v1.0.0"
    
    # 기존 커밋이 있는지 확인하고 커밋
    if git log --oneline -1 &>/dev/null; then
        git commit -m "$commit_message" || echo -e "${YELLOW}⚠️  커밋할 새로운 변경사항이 없습니다${NC}"
    else
        git commit -m "$commit_message"
    fi
    
    echo -e "${GREEN}✅ 변경사항이 커밋되었습니다${NC}"
fi

# 7. GitHub 연결 안내
echo -e "${BLUE}🔗 GitHub 연결 안내${NC}"

# GitHub 원격 저장소 확인
if git remote get-url origin &>/dev/null; then
    remote_url=$(git remote get-url origin)
    echo -e "${GREEN}✅ GitHub 원격 저장소가 연결되어 있습니다: $remote_url${NC}"
    
    # 푸시 시도
    echo -e "${BLUE}📤 GitHub에 푸시 중...${NC}"
    git push origin main || git push origin master || echo -e "${YELLOW}⚠️  푸시에 실패했습니다. 수동으로 푸시해주세요${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub 원격 저장소가 설정되지 않았습니다${NC}"
    echo -e "${BLUE}다음 단계를 따라주세요:${NC}"
    echo "1. GitHub에서 새 저장소를 만드세요"
    echo "2. 다음 명령어를 실행하세요:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo -e "${GREEN}🎉 배포 준비 완료!${NC}"
echo ""
echo -e "${BLUE}📋 다음 단계:${NC}"
echo "1. 코드가 GitHub에 올라갔는지 확인하세요"
echo "2. https://smithery.ai 에 접속하세요"
echo "3. 'Deploy Server' 버튼을 클릭하세요"
echo "4. GitHub 계정을 연결하세요"
echo "5. 저장소를 선택하고 배포하세요"
echo ""
echo -e "${GREEN}✨ 배포 후 서버 URL: https://server.smithery.ai/YOUR_USERNAME/simple-mcp-server${NC}"
echo ""
echo -e "${BLUE}💡 팁: Python Flask 기반 Custom Deploy로 안정적인 HTTP 엔드포인트를 제공합니다${NC}" 