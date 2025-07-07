FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# requirements.txt 복사
COPY requirements.txt .

# Python 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 포트 설정 (환경 변수로 설정)
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Gunicorn으로 Flask 앱 시작
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "1", "--timeout", "1200", "app:app"] 