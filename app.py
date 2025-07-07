#!/usr/bin/env python3

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import logging

# Flask 앱 생성
app = Flask(__name__)
CORS(app)  # CORS 지원

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 도구 정의
TOOLS = [
    {
        "name": "hello_world",
        "description": "Returns a simple hello world message",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name to greet"
                }
            },
            "required": ["name"]
        }
    },
    {
        "name": "calculate",
        "description": "Performs basic arithmetic calculations",
        "inputSchema": {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["add", "subtract", "multiply", "divide"],
                    "description": "The operation to perform"
                },
                "a": {
                    "type": "number",
                    "description": "First number"
                },
                "b": {
                    "type": "number",
                    "description": "Second number"
                }
            },
            "required": ["operation", "a", "b"]
        }
    },
    {
        "name": "get_time",
        "description": "Returns the current time",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    }
]

def execute_tool(name, args):
    """도구 실행 함수"""
    try:
        if name == "hello_world":
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Hello, {args.get('name', 'World')}! Welcome to the Simple MCP Server (Python Flask)."
                    }
                ]
            }
        
        elif name == "calculate":
            operation = args.get("operation")
            a = args.get("a")
            b = args.get("b")
            
            if operation == "add":
                result = a + b
            elif operation == "subtract":
                result = a - b
            elif operation == "multiply":
                result = a * b
            elif operation == "divide":
                if b == 0:
                    raise ValueError("Division by zero")
                result = a / b
            else:
                raise ValueError(f"Unknown operation: {operation}")
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"{a} {operation} {b} = {result}"
                    }
                ]
            }
        
        elif name == "get_time":
            now = datetime.now()
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Current time: {now.isoformat()}"
                    }
                ]
            }
        
        else:
            raise ValueError(f"Unknown tool: {name}")
            
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        raise

@app.route('/mcp', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def mcp_endpoint():
    """MCP 프로토콜 엔드포인트"""
    
    # OPTIONS 요청 처리 (CORS preflight)
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        # GET 요청: 도구 목록 반환 (lazy loading)
        if request.method == 'GET':
            logger.info("GET /mcp - returning tools list")
            return jsonify({"tools": TOOLS})
        
        # POST 요청: MCP 프로토콜 요청 처리
        elif request.method == 'POST':
            data = request.get_json()
            logger.info(f"POST /mcp - received: {data}")
            
            if not data:
                return jsonify({
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32600,
                        "message": "Invalid Request"
                    },
                    "id": None
                }), 400
            
            method = data.get("method")
            params = data.get("params", {})
            request_id = data.get("id", 1)
            
            # tools/list 요청
            if method == "tools/list":
                return jsonify({
                    "jsonrpc": "2.0",
                    "result": {"tools": TOOLS},
                    "id": request_id
                })
            
            # tools/call 요청
            elif method == "tools/call":
                tool_name = params.get("name")
                tool_args = params.get("arguments", {})
                
                if not tool_name:
                    return jsonify({
                        "jsonrpc": "2.0",
                        "error": {
                            "code": -32602,
                            "message": "Missing tool name"
                        },
                        "id": request_id
                    }), 400
                
                try:
                    result = execute_tool(tool_name, tool_args)
                    return jsonify({
                        "jsonrpc": "2.0",
                        "result": result,
                        "id": request_id
                    })
                except Exception as e:
                    return jsonify({
                        "jsonrpc": "2.0",
                        "error": {
                            "code": -32603,
                            "message": str(e)
                        },
                        "id": request_id
                    }), 500
            
            # initialize 요청 (MCP 클라이언트 초기화)
            elif method == "initialize":
                return jsonify({
                    "jsonrpc": "2.0",
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "simple-mcp-server",
                            "version": "1.0.0"
                        }
                    },
                    "id": request_id
                })
            
            else:
                return jsonify({
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    },
                    "id": request_id
                }), 404
        
        # DELETE 요청 처리
        elif request.method == 'DELETE':
            logger.info("DELETE /mcp - shutdown requested")
            return jsonify({"message": "Server shutdown requested"})
        
    except Exception as e:
        logger.error(f"MCP endpoint error: {e}")
        return jsonify({
            "jsonrpc": "2.0",
            "error": {
                "code": -32603,
                "message": "Internal error"
            },
            "id": None
        }), 500

@app.route('/', methods=['GET'])
def health_check():
    """헬스체크 엔드포인트"""
    return jsonify({
        "status": "healthy",
        "server": "simple-mcp-server",
        "version": "1.0.0",
        "tools_count": len(TOOLS)
    })

@app.route('/health', methods=['GET'])
def health():
    """헬스체크 엔드포인트 (별칭)"""
    return health_check()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting Simple MCP Server on port {port}")
    logger.info(f"Available tools: {[tool['name'] for tool in TOOLS]}")
    logger.info(f"MCP endpoint: http://localhost:{port}/mcp")
    
    app.run(host='0.0.0.0', port=port, debug=debug) 