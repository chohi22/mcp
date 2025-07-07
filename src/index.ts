#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'simple-mcp-server',
    version: '1.0.0',
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'hello_world':
      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${(args as any).name}! Welcome to the Simple MCP Server.`,
          },
        ],
      };

    case 'calculate':
      const { operation, a, b } = args as any;
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
});

server.onerror = (error) => {
  console.error('[MCP Error]', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Simple MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
}); 