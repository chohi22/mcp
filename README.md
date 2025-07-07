# Simple MCP Server

간단한 테스트용 MCP (Model Context Protocol) 서버입니다.

## 기능

이 서버는 다음과 같은 기본 도구들을 제공합니다:

- **hello_world**: 간단한 인사 메시지 반환
- **calculate**: 기본 산술 연산 (덧셈, 뺄셈, 곱셈, 나눗셈)
- **get_time**: 현재 시간 반환

## 설치

```bash
npm install
```

## 실행

```bash
npm start
```

## 배포

smithery.ai에 배포하려면:

```bash
./deploy.sh
```

## 개발

TypeScript로 작성되었으며, 다음과 같은 구조를 가집니다:

- `src/index.ts` - 메인 서버 코드
- `index.js` - 로컬 실행용 JavaScript 코드
- `smithery.yaml` - smithery.ai 배포 설정 (TypeScript 런타임)
- `package.json` - 프로젝트 설정 (module 필드에 TypeScript 진입점 설정)

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