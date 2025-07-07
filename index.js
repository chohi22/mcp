#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

class SimpleMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'simple-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
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
            let result;
            
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
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Error executing tool: ${error.message}`);
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple MCP Server running on stdio');
  }
}

const server = new SimpleMCPServer();
server.run().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
}); 