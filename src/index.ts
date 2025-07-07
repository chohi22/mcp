#!/usr/bin/env node

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// 도구 정의
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

// 도구 실행 함수
async function executeTool(name: string, args: any) {
  switch (name) {
    case 'hello_world':
      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${args.name}! Welcome to the Simple MCP Server.`,
          },
        ],
      };

    case 'calculate':
      const { operation, a, b } = args;
      let result: number;
      
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            throw new McpError(ErrorCode.InvalidParams, 'Division by zero');
          }
          result = a / b;
          break;
        default:
          throw new McpError(ErrorCode.InvalidParams, 'Unknown operation');
      }

      return {
        content: [
          {
            type: 'text',
            text: `${a} ${operation} ${b} = ${result}`,
          },
        ],
      };

    case 'get_time':
      const now = new Date();
      return {
        content: [
          {
            type: 'text',
            text: `Current time: ${now.toISOString()}`,
          },
        ],
      };

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}

// smithery.ai에서 기대하는 HTTP 엔드포인트 핸들러
export default async function handler(req: any) {
  try {
    const method = req.method || 'GET';
    
    // GET 요청: 도구 목록 반환 (lazy loading)
    if (method === 'GET') {
      return new Response(JSON.stringify({ tools }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // POST 요청: MCP 요청 처리
    if (method === 'POST') {
      const body = req.body ? JSON.parse(req.body) : {};
      
      if (body.method === 'tools/list') {
        return new Response(JSON.stringify({ tools }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } else if (body.method === 'tools/call') {
        const { name, arguments: args } = body.params || {};
        const result = await executeTool(name, args);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // OPTIONS 요청: CORS 처리
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    throw new Error('Unsupported method');
  } catch (error) {
    console.error('Handler error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// 로컬 테스트를 위한 출력
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.log('Simple MCP Server initialized for HTTP');
  console.log('Available tools:', tools.map(t => t.name).join(', '));
} 