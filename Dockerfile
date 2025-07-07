FROM node:18-slim

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 설정 (환경 변수로 설정)
ENV PORT=3000

# HTTP 서버 시작
CMD ["node", "server.js"] 