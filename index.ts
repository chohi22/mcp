#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

class ProcurementMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'procurement-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_procurement_data',
            description: 'Fetch procurement data from Korean government API',
            inputSchema: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Start date (YYYY-MM-DD)',
                },
                endDate: {
                  type: 'string',
                  description: 'End date (YYYY-MM-DD)',
                },
                agency: {
                  type: 'string',
                  description: 'Government agency filter',
                },
              },
            },
          },
          {
            name: 'update_database',
            description: 'Update database with procurement data',
            inputSchema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  description: 'Procurement data array',
                },
              },
              required: ['data'],
            },
          },
          {
            name: 'trigger_webhook',
            description: 'Trigger Make.com webhook',
            inputSchema: {
              type: 'object',
              properties: {
                webhookUrl: {
                  type: 'string',
                  description: 'Webhook URL',
                },
                data: {
                  type: 'object',
                  description: 'Data to send',
                },
              },
              required: ['webhookUrl', 'data'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_procurement_data':
            return await this.getProcurementData(args);
          case 'update_database':
            return await this.updateDatabase(args);
          case 'trigger_webhook':
            return await this.triggerWebhook(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async getProcurementData(args) {
    const { startDate, endDate, agency } = args || {};

    const API_KEY = process.env.KOREA_API_KEY || 'test_key';
    const API_URL = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/getPublicPrcureThngInfoServcPPSSrch';

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: '1',
      numOfRows: '50',
      resultType: 'json',
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (agency) params.append('agency', agency);

    try {
      const response = await axios.get(`${API_URL}?${params.toString()}`, {
        timeout: 10000,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: response.data,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  async updateDatabase(args) {
    const { data } = args;

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxainopapqkhxlftstuf.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_KEY || 'test_key';

    try {
      const response = await axios.post(
        `${SUPABASE_URL}/rest/v1/procurement_data`,
        data,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Updated ${data.length} records`,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  async triggerWebhook(args) {
    const { webhookUrl, data } = args;

    try {
      const response = await axios.post(webhookUrl, {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'procurement-mcp-server',
      }, {
        timeout: 10000,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              status: response.status,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Procurement MCP Server running...');
  }
}

// Start the server
const server = new ProcurementMCPServer();
server.run().catch(console.error);