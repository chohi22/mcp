# Simple MCP Server (Python Flask)

간단한 테스트용 MCP (Model Context Protocol) 서버입니다. Python Flask로 구현되어 안정적인 HTTP 엔드포인트를 제공합니다.

## 기능

이 서버는 다음과 같은 기본 도구들을 제공합니다:

- **hello_world**: 간단한 인사 메시지 반환
- **calculate**: 기본 산술 연산 (덧셈, 뺄셈, 곱셈, 나눗셈)
- **get_time**: 현재 시간 반환

## 설치

```bash
pip install -r requirements.txt
```

## 실행

### 로컬 개발
```bash
python app.py
```

### 프로덕션 (Gunicorn)
```bash
gunicorn --bind 0.0.0.0:3000 --workers 1 app:app
```

## 테스트

```bash
python test.py
```

## 배포

smithery.ai에 배포하려면:

```bash
./deploy.sh
```

## 개발

Python Flask 기반으로 작성되었으며, 다음과 같은 구조를 가집니다:

- `app.py` - Flask 기반 MCP 서버 (메인 애플리케이션)
- `requirements.txt` - Python 의존성 설정
- `Dockerfile` - Docker 컨테이너 설정 (Python 기반)
- `smithery.yaml` - smithery.ai 배포 설정 (Custom Deploy)
- `test.py` - Python 테스트 스크립트
- `deploy.sh` - 배포 스크립트

### 배포 방식

- **로컬 개발**: `python app.py` (Flask 개발 서버)
- **smithery.ai 배포**: Custom Deploy (Docker 컨테이너)
  - Flask 앱이 HTTP 엔드포인트 제공
  - `/mcp` 엔드포인트에서 lazy loading 지원
  - Gunicorn으로 프로덕션 서버 실행
  - CORS 지원으로 브라우저 호환성 확보

### API 엔드포인트

- `GET /`: 헬스체크
- `GET /health`: 헬스체크 (별칭)
- `GET /mcp`: 도구 목록 반환 (lazy loading)
- `POST /mcp`: MCP 프로토콜 요청 처리
- `DELETE /mcp`: 서버 종료 요청

## 사용 예시

### hello_world 도구
```json
{
  "name": "hello_world",
  "arguments": {
    "name": "Alice"
  }
}
```

### calculate 도구
```json
{
  "name": "calculate",
  "arguments": {
    "operation": "add",
    "a": 10,
    "b": 5
  }
}
```

### get_time 도구
```json
{
  "name": "get_time",
  "arguments": {}
}
```

## 요구사항

- Node.js 18 이상
- npm 또는 yarn

## 라이센스

MIT 