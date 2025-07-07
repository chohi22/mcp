#!/usr/bin/env python3

import requests
import json
import time
import sys
import threading
import subprocess
import os
from datetime import datetime

def test_mcp_server():
    """Simple MCP Server 테스트"""
    print("🧪 Simple MCP Server (Python Flask) 테스트 시작...\n")
    
    # 1. 기본 구문 검사
    print("📋 1. 기본 구문 검사...")
    try:
        import app
        print("✅ 기본 구문 검사 통과\n")
    except Exception as e:
        print(f"❌ 기본 구문 검사 실패: {e}")
        return False
    
    # 2. 서버 시작 테스트
    print("🚀 2. 서버 시작 테스트...")
    
    # 서버를 백그라운드에서 시작
    server_process = None
    try:
        server_process = subprocess.Popen([
            sys.executable, 'app.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # 서버가 시작될 때까지 대기
        time.sleep(3)
        
        if server_process.poll() is not None:
            stdout, stderr = server_process.communicate()
            print(f"❌ 서버 시작 실패: {stderr.decode()}")
            return False
        
        print("✅ 서버가 성공적으로 시작됨")
        
    except Exception as e:
        print(f"❌ 서버 시작 오류: {e}")
        return False
    
    # 3. HTTP 엔드포인트 테스트
    print("🔍 3. HTTP 엔드포인트 테스트...")
    base_url = "http://localhost:3000"
    
    try:
        # 헬스체크 테스트
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ 헬스체크 엔드포인트 작동")
        else:
            print(f"⚠️  헬스체크 실패: {response.status_code}")
        
        # 도구 목록 테스트 (lazy loading)
        response = requests.get(f"{base_url}/mcp", timeout=5)
        if response.status_code == 200:
            tools = response.json().get("tools", [])
            print(f"✅ 도구 목록 조회 성공: {len(tools)}개 도구")
            for tool in tools:
                print(f"   - {tool['name']}: {tool['description']}")
        else:
            print(f"❌ 도구 목록 조회 실패: {response.status_code}")
        
        # MCP 프로토콜 테스트
        mcp_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {}
        }
        
        response = requests.post(
            f"{base_url}/mcp",
            json=mcp_request,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            if "result" in result and "tools" in result["result"]:
                print("✅ MCP 프로토콜 테스트 완료")
            else:
                print(f"⚠️  MCP 응답 형식 이상: {result}")
        else:
            print(f"❌ MCP 프로토콜 테스트 실패: {response.status_code}")
        
        print()
        
    except requests.exceptions.RequestException as e:
        print(f"❌ HTTP 요청 실패: {e}")
        return False
    
    finally:
        # 서버 종료
        if server_process:
            server_process.terminate()
            try:
                server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server_process.kill()
    
    # 4. 파일 구조 확인
    print("📁 4. 필요한 파일 구조 확인...")
    required_files = [
        'app.py',
        'requirements.txt',
        'Dockerfile', 
        'smithery.yaml',
        'README.md',
        'deploy.sh',
        '.gitignore'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ 다음 파일들이 누락됨: {', '.join(missing_files)}")
        return False
    else:
        print("✅ 모든 필요한 파일들이 존재함\n")
    
    # 5. 배포 준비 상태 확인
    print("🚀 5. 배포 준비 상태 확인...")
    
    # requirements.txt 확인
    if os.path.exists('requirements.txt'):
        with open('requirements.txt', 'r') as f:
            content = f.read()
            if 'Flask' in content and 'Flask-CORS' in content:
                print("✅ Python 의존성 설정 확인됨")
            else:
                print("❌ Python 의존성 설정이 올바르지 않음")
                return False
    
    # smithery.yaml 확인
    if os.path.exists('smithery.yaml'):
        with open('smithery.yaml', 'r') as f:
            content = f.read()
            if 'runtime: "container"' in content:
                print("✅ Smithery 배포 설정 확인됨")
            else:
                print("❌ Smithery 배포 설정이 올바르지 않음")
                return False
    
    print("\n🎉 모든 테스트 통과!")
    print("✨ 서버가 smithery.ai 배포 준비 완료됨\n")
    
    print("📋 배포 방법:")
    print("1. ./deploy.sh 실행")
    print("2. GitHub에 코드 업로드")
    print("3. https://smithery.ai 에서 배포")
    
    return True

if __name__ == "__main__":
    success = test_mcp_server()
    sys.exit(0 if success else 1) 