#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// 도구 정의 (lazy loading용)
const tools = [
  {
    name: 'hello_world',
    description: 'Returns a simple hello world message',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'calculate',
    description: 'Performs basic arithmetic calculations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The operation to perform',
        },
        a: {
          type: 'number',
          description: 'First number',
        },
        b: {
          type: 'number',
          description: 'Second number',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'get_time',
    description: 'Returns the current time',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// MCP 서버 프로세스 관리
class McpServerManager {
  constructor() {
    this.mcpProcess = null;
    this.isReady = false;
    this.startMcpServer();
  }

  startMcpServer() {
    console.log('Starting MCP server process...');
    this.mcpProcess = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.mcpProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('MCP Server:', output);
      if (output.includes('Simple MCP Server running on stdio')) {
        this.isReady = true;
        console.log('MCP Server is ready!');
      }
    });

    this.mcpProcess.on('close', (code) => {
      console.log(`MCP Server process exited with code ${code}`);
      this.isReady = false;
    });

    this.mcpProcess.on('error', (err) => {
      console.error('Failed to start MCP server:', err);
      this.isReady = false;
    });
  }

  async sendMcpRequest(request) {
    if (!this.isReady || !this.mcpProcess) {
      throw new Error('MCP server not ready');
    }

    return new Promise((resolve, reject) => {
      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'));
      }, 10000);

      const dataHandler = (data) => {
        responseData += data.toString();
        try {
          const lines = responseData.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                clearTimeout(timeout);
                this.mcpProcess.stdout.off('data', dataHandler);
                resolve(response);
                return;
              }
            }
          }
        } catch (e) {
          // 아직 완전한 JSON이 아닐 수 있음
        }
      };

      this.mcpProcess.stdout.on('data', dataHandler);
      this.mcpProcess.stdin.write(requestStr);
    });
  }
}

const mcpManager = new McpServerManager();

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  try {
    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    // /mcp 엔드포인트 처리
    if (url.pathname === '/mcp') {
      
      // GET 요청: 도구 목록 반환 (lazy loading)
      if (req.method === 'GET') {
        res.statusCode = 200;
        res.end(JSON.stringify({ tools }));
        return;
      }

      // POST 요청: MCP 프로토콜 처리
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const requestData = JSON.parse(body);
            
            // MCP 서버로 요청 전달
            const response = await mcpManager.sendMcpRequest({
              jsonrpc: '2.0',
              id: requestData.id || 1,
              method: requestData.method,
              params: requestData.params || {}
            });

            res.statusCode = 200;
            res.end(JSON.stringify(response));
          } catch (error) {
            console.error('MCP request error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: error.message
              },
              id: null
            }));
          }
        });
        return;
      }

      // DELETE 요청 처리
      if (req.method === 'DELETE') {
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Server shutdown requested' }));
        return;
      }
    }

    // 기본 응답
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
});

// 서버 시작
server.listen(PORT, () => {
  console.log(`HTTP MCP Server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

// 우아한 종료 처리
process.on('SIGINT', () => {
  console.log('Shutting down HTTP server...');
  server.close(() => {
    if (mcpManager.mcpProcess) {
      mcpManager.mcpProcess.kill();
    }
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down HTTP server...');
  server.close(() => {
    if (mcpManager.mcpProcess) {
      mcpManager.mcpProcess.kill();
    }
    process.exit(0);
  });
}); 