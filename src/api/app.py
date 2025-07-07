from flask import Flask, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime
import requests
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 샘플 데이터
sample_data = {
    'projects': [
        {
            'id': 1,
            'name': '공공데이터 포털 고도화',
            'client': '행정안전부',
            'budget': 50000,
            'status': '진행중',
            'created_at': '2024-01-15'
        },
        {
            'id': 2,
            'name': '스마트시티 통합플랫폼',
            'client': '국토교통부',
            'budget': 80000,
            'status': '계획중',
            'created_at': '2024-01-20'
        },
        {
            'id': 3,
            'name': '디지털 헬스케어 시스템',
            'client': '보건복지부',
            'budget': 35000,
            'status': '완료',
            'created_at': '2024-01-10'
        }
    ]
}

@app.route('/')
def home():
    """메인 페이지"""
    return jsonify({
        'message': '🚀 Procurement MCP Server에 오신 것을 환영합니다!',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'endpoints': {
            'projects': '/api/projects',
            'projects_by_id': '/api/projects/<id>',
            'stats': '/api/stats',
            'data_analysis': '/api/analysis',
            'mcp_tools': '/mcp/tools',
            'procurement_data': '/mcp/procurement-data',
            'supabase_update': '/mcp/supabase-update',
            'webhook_trigger': '/mcp/webhook-trigger',
            'health': '/health'
        }
    })

# 기존 API 엔드포인트들 (그대로 유지)
@app.route('/api/projects', methods=['GET'])
def get_projects():
    """프로젝트 목록 조회"""
    return jsonify({
        'success': True,
        'data': sample_data['projects'],
        'total': len(sample_data['projects'])
    })

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """특정 프로젝트 조회"""
    project = next((p for p in sample_data['projects'] if p['id'] == project_id), None)
    
    if project:
        return jsonify({
            'success': True,
            'data': project
        })
    else:
        return jsonify({
            'success': False,
            'message': '프로젝트를 찾을 수 없습니다.'
        }), 404

@app.route('/api/projects', methods=['POST'])
def create_project():
    """새 프로젝트 생성"""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({
            'success': False,
            'message': '프로젝트 이름은 필수입니다.'
        }), 400
    
    new_project = {
        'id': len(sample_data['projects']) + 1,
        'name': data['name'],
        'client': data.get('client', ''),
        'budget': data.get('budget', 0),
        'status': data.get('status', '계획중'),
        'created_at': datetime.now().strftime('%Y-%m-%d')
    }
    
    sample_data['projects'].append(new_project)
    
    return jsonify({
        'success': True,
        'data': new_project,
        'message': '프로젝트가 성공적으로 생성되었습니다.'
    }), 201

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """프로젝트 통계"""
    df = pd.DataFrame(sample_data['projects'])
    
    stats = {
        'total_projects': len(df),
        'total_budget': df['budget'].sum(),
        'average_budget': df['budget'].mean(),
        'status_distribution': df['status'].value_counts().to_dict(),
        'client_distribution': df['client'].value_counts().to_dict()
    }
    
    return jsonify({
        'success': True,
        'data': stats
    })

@app.route('/api/analysis', methods=['GET'])
def data_analysis():
    """데이터 분석 결과"""
    df = pd.DataFrame(sample_data['projects'])
    
    analysis = {
        'budget_stats': {
            'min': df['budget'].min(),
            'max': df['budget'].max(),
            'mean': df['budget'].mean(),
            'median': df['budget'].median(),
            'std': df['budget'].std()
        },
        'status_analysis': {
            'completed_ratio': (df['status'] == '완료').sum() / len(df) * 100,
            'in_progress_ratio': (df['status'] == '진행중').sum() / len(df) * 100,
            'planned_ratio': (df['status'] == '계획중').sum() / len(df) * 100
        },
        'recommendations': [
            '예산 규모별 프로젝트 관리 전략 수립 필요',
            '진행 중인 프로젝트의 리스크 관리 강화',
            '완료된 프로젝트의 성과 분석 필요'
        ]
    }
    
    return jsonify({
        'success': True,
        'data': analysis
    })

# MCP 서버 기능 추가
@app.route('/mcp/tools', methods=['GET'])
def list_mcp_tools():
    """MCP 도구 목록"""
    tools = [
        {
            "name": "get_procurement_data",
            "description": "Fetch procurement data from Korean government API",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                    "end_date": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                    "agency": {"type": "string", "description": "Government agency filter"}
                }
            }
        },
        {
            "name": "update_supabase",
            "description": "Update Supabase database with procurement data",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "data": {"type": "array", "description": "Procurement data array"},
                    "table": {"type": "string", "description": "Target table name", "default": "procurement_data"}
                },
                "required": ["data"]
            }
        },
        {
            "name": "trigger_webhook",
            "description": "Trigger Make.com webhook",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "webhook_url": {"type": "string", "description": "Webhook URL"},
                    "data": {"type": "object", "description": "Data to send"}
                },
                "required": ["webhook_url", "data"]
            }
        }
    ]
    
    return jsonify({
        'success': True,
        'tools': tools
    })

@app.route('/mcp/procurement-data', methods=['POST'])
def get_procurement_data():
    """조달 데이터 조회"""
    data = request.get_json() or {}
    
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    agency = data.get('agency')
    
    api_key = os.getenv('KOREA_API_KEY', 'test_key')
    api_url = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/getPublicPrcureThngInfoServcPPSSrch'
    
    params = {
        'serviceKey': api_key,
        'pageNo': '1',
        'numOfRows': '50',
        'resultType': 'json'
    }
    
    if start_date:
        params['startDate'] = start_date
    if end_date:
        params['endDate'] = end_date
    if agency:
        params['agency'] = agency
    
    try:
        response = requests.get(api_url, params=params, timeout=30)
        response.raise_for_status()
        
        result = {
            'success': True,
            'data': response.json(),
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Successfully fetched procurement data")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to fetch procurement data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/mcp/supabase-update', methods=['POST'])
def update_supabase():
    """Supabase 데이터베이스 업데이트"""
    data = request.get_json()
    
    if not data or 'data' not in data:
        return jsonify({
            'success': False,
            'error': 'Data is required'
        }), 400
    
    records = data['data']
    table = data.get('table', 'procurement_data')
    
    supabase_url = os.getenv('SUPABASE_URL', 'https://kxainopapqkhxlftstuf.supabase.co')
    supabase_key = os.getenv('SUPABASE_KEY', 'test_key')
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            f'{supabase_url}/rest/v1/{table}',
            json=records,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        
        result = {
            'success': True,
            'message': f'Updated {len(records)} records in {table}',
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Successfully updated Supabase: {len(records)} records")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to update Supabase: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/mcp/webhook-trigger', methods=['POST'])
def trigger_webhook():
    """Make.com 웹훅 트리거"""
    data = request.get_json()
    
    if not data or 'webhook_url' not in data or 'data' not in data:
        return jsonify({
            'success': False,
            'error': 'webhook_url and data are required'
        }), 400
    
    webhook_url = data['webhook_url']
    payload = {
        **data['data'],
        'timestamp': datetime.now().isoformat(),
        'source': 'procurement-mcp-server'
    }
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=30)
        response.raise_for_status()
        
        result = {
            'success': True,
            'status': response.status_code,
            'timestamp': datetime.now().isoformat()
        }
        
        logger.info(f"Successfully triggered webhook: {webhook_url}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to trigger webhook: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# 헬스 체크 엔드포인트
@app.route('/health', methods=['GET'])
def health_check():
    """헬스 체크"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.errorhandler(404)
def not_found(error):
    """404 에러 처리"""
    return jsonify({
        'success': False,
        'message': '요청하신 리소스를 찾을 수 없습니다.'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """500 에러 처리"""
    return jsonify({
        'success': False,
        'message': '서버 내부 오류가 발생했습니다.'
    }), 500

if __name__ == '__main__':
    print("🚀 Procurement MCP Server를 시작합니다...")
    print("📊 API 엔드포인트:")
    print("   - GET  /                     : 메인 페이지")
    print("   - GET  /api/projects         : 프로젝트 목록")
    print("   - GET  /api/projects/<id>    : 특정 프로젝트")
    print("   - POST /api/projects         : 새 프로젝트 생성")
    print("   - GET  /api/stats            : 프로젝트 통계")
    print("   - GET  /api/analysis         : 데이터 분석")
    print("   - GET  /mcp/tools            : MCP 도구 목록")
    print("   - POST /mcp/procurement-data : 조달 데이터 조회")
    print("   - POST /mcp/supabase-update  : Supabase 업데이트")
    print("   - POST /mcp/webhook-trigger  : 웹훅 트리거")
    print("   - GET  /health               : 헬스 체크")
    print("🌐 서버 주소: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)