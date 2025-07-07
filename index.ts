#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';

// Tool schemas
const GetProcurementDataSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agency: z.string().optional(),
  keyword: z.string().optional(),
});

const UpdateSupabaseSchema = z.object({
  data: z.array(z.record(z.any())),
  table: z.string().default('procurement_data'),
});

const TriggerMakeWebhookSchema = z.object({
  webhookUrl: z.string().url(),
  data: z.record(z.any()),
});

class ProcurementMCPServer {
  private server: Server;

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

  private setupHandlers() {
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
                  description: 'Start date for data retrieval (YYYY-MM-DD)',
                },
                endDate: {
                  type: 'string',
                  description: 'End date for data retrieval (YYYY-MM-DD)',
                },
                agency: {
                  type: 'string',
                  description: 'Government agency name filter',
                },
                keyword: {
                  type: 'string',
                  description: 'Keyword to search in procurement data',
                },
              },
              required: [],
            },
          },
          {
            name: 'update_supabase',
            description: 'Update Supabase database with procurement data',
            inputSchema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  description: 'Array of procurement data objects',
                  items: {
                    type: 'object',
                  },
                },
                table: {
                  type: 'string',
                  description: 'Target table name',
                  default: 'procurement_data',
                },
              },
              required: ['data'],
            },
          },
          {
            name: 'trigger_make_webhook',
            description: 'Trigger Make.com webhook with data',
            inputSchema: {
              type: 'object',
              properties: {
                webhookUrl: {
                  type: 'string',
                  description: 'Make.com webhook URL',
                },
                data: {
                  type: 'object',
                  description: 'Data to send to webhook',
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
          case 'update_supabase':
            return await this.updateSupabase(args);
          case 'trigger_make_webhook':
            return await this.triggerMakeWebhook(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async getProcurementData(args: any) {
    const { startDate, endDate, agency, keyword } = GetProcurementDataSchema.parse(args);

    const API_KEY = process.env.KOREA_API_KEY;
    const API_URL = 'https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/getPublicPrcureThngInfoServcPPSSrch';

    if (!API_KEY) {
      throw new Error('KOREA_API_KEY environment variable is not set');
    }

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: '1',
      numOfRows: '100',
      resultType: 'json',
    });

    if (startDate) params.append('prcureInsttNm', startDate);
    if (endDate) params.append('prcureInsttNm', endDate);
    if (agency) params.append('prcureInsttNm', agency);
    if (keyword) params.append('prcureInsttNm', keyword);

    try {
      const response = await axios.get(`${API_URL}?${params.toString()}`);
      const data = response.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              data: data,
              totalCount: data.response?.body?.totalCount || 0,
              retrievedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to fetch procurement data: ${error}`);
    }
  }

  private async updateSupabase(args: any) {
    const { data, table } = UpdateSupabaseSchema.parse(args);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    }

    try {
      const response = await axios.post(
        `${SUPABASE_URL}/rest/v1/${table}`,
        data,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully updated ${data.length} records in ${table}`,
              data: response.data,
              updatedAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to update Supabase: ${error}`);
    }
  }

  private async triggerMakeWebhook(args: any) {
    const { webhookUrl, data } = TriggerMakeWebhookSchema.parse(args);

    try {
      const response = await axios.post(webhookUrl, {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'procurement-mcp-server',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Webhook triggered successfully',
              status: response.status,
              responseData: response.data,
              triggeredAt: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to trigger Make.com webhook: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Procurement MCP Server running on stdio');
  }
}

// Run the server
const server = new ProcurementMCPServer();
server.run().catch(console.error);