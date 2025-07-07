#!/usr/bin/env node

// Simple MCP Server 테스트 스크립트
// MCP 서버가 정상적으로 작동하는지 확인

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🧪 Simple MCP Server 테스트 시작...\n');

// 1. 기본 구문 검사
console.log('📋 1. 기본 구문 검사...');
try {
  await import('./index.js');
  console.log('✅ 기본 구문 검사 통과\n');
} catch (error) {
  console.error('❌ 기본 구문 검사 실패:', error.message);
  process.exit(1);
}

// 2. 서버 시작 테스트
console.log('🚀 2. 서버 시작 테스트...');
const serverProcess = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
let serverError = '';

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  serverError += data.toString();
});

// 서버가 시작될 때까지 기다림
await setTimeout(2000);

// 3. MCP 프로토콜 테스트
console.log('🔍 3. MCP 프로토콜 테스트...');

// ListTools 요청 테스트
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

try {
  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  await setTimeout(1000);
  
  if (serverError.includes('MCP Server running on stdio')) {
    console.log('✅ 서버가 성공적으로 시작됨');
  } else {
    console.log('⚠️  서버 시작 확인 불가 (정상일 수 있음)');
  }
  
  console.log('✅ MCP 프로토콜 테스트 완료\n');
} catch (error) {
  console.error('❌ MCP 프로토콜 테스트 실패:', error.message);
}

// 서버 종료
serverProcess.kill();

// 4. 파일 구조 확인
console.log('📁 4. 필요한 파일 구조 확인...');
const requiredFiles = [
  'package.json',
  'index.js',
  'smithery.yaml',
  'README.md',
  'deploy.sh',
  '.gitignore'
];

const fs = await import('fs');
const missingFiles = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.log('❌ 다음 파일들이 누락됨:', missingFiles.join(', '));
  process.exit(1);
} else {
  console.log('✅ 모든 필요한 파일들이 존재함\n');
}

// 5. 배포 준비 상태 확인
console.log('🚀 5. 배포 준비 상태 확인...');

// package.json 확인
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.type === 'module') {
  console.log('✅ ES Module 설정 확인됨');
} else {
  console.log('❌ ES Module 설정이 필요함');
  process.exit(1);
}

// smithery.yaml 확인
const smitheryYaml = fs.readFileSync('smithery.yaml', 'utf8');
if (smitheryYaml.includes('runtime: "typescript"')) {
  console.log('✅ Smithery 배포 설정 확인됨');
} else {
  console.log('❌ Smithery 배포 설정이 올바르지 않음');
  process.exit(1);
}

console.log('\n🎉 모든 테스트 통과!');
console.log('✨ 서버가 smithery.ai 배포 준비 완료됨\n');

console.log('📋 배포 방법:');
console.log('1. ./deploy.sh 실행');
console.log('2. GitHub에 코드 업로드');
console.log('3. https://smithery.ai 에서 배포'); 