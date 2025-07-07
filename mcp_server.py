#!/usr/bin/env python3
"""
Procurement MCP Server - Python Implementation
A simple MCP server for procurement data automation
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolResult,
    ListToolsResult,
    TextContent,
    Tool,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProcurementMCPServer:
    """MCP Server for procurement data automation"""
    
    def __init__(self):
        self.server = Server("procurement-mcp-server")
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup MCP server handlers"""
        
        @self.server.list_tools()
        async def list_tools() -> ListToolsResult:
            """List available tools"""
            return ListToolsResult(
                tools=[
                    Tool(
                        name="get_procurement_data",
                        description="Fetch procurement data from Korean government API",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "start_date": {
                                    "type": "string",
                                    "description": "Start date (YYYY-MM-DD)"
                                },
                                "end_date": {
                                    "type": "string", 
                                    "description": "End date (YYYY-MM-DD)"
                                },
                                "agency": {
                                    "type": "string",
                                    "description": "Government agency filter"
                                }
                            }
                        }
                    ),
                    Tool(
                        name="update_supabase",
                        description="Update Supabase database with procurement data",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "data": {
                                    "type": "array",
                                    "description": "Array of procurement data objects"
                                },
                                "table": {
                                    "type": "string",
                                    "description": "Target table name",
                                    "default": "procurement_data"
                                }
                            },
                            "required": ["data"]
                        }
                    ),
                    Tool(
                        name="trigger_make_webhook",
                        description="Trigger Make.com webhook with data",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "webhook_url": {
                                    "type": "string",
                                    "description": "Make.com webhook URL"
                                },
                                "data": {
                                    "type": "object",
                                    "description": "Data to send to webhook"
                                }
                            },
                            "required": ["webhook_url", "data"]
                        }
                    )
                ]
            )
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls"""
            try:
                if name == "get_procurement_data":
                    return await self.get_procurement_data(arguments)
                elif name == "update_supabase":
                    return await self.update_supabase(arguments)
                elif name == "trigger_make_webhook":
                    return await self.trigger_make_webhook(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.error(f"Error in {name}: {str(e)}")
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=f"Error: {str(e)}"
                        )
                    ],
                    isError=True
                )
    
    async def get_procurement_data(self, args: Dict[str, Any]) -> CallToolResult:
        """Fetch procurement data from Korean government API"""
        start_date = args.get("start_date")
        end_date = args.get("end_date") 
        agency = args.get("agency")
        
        api_key = os.getenv("KOREA_API_KEY", "test_key")
        api_url = "https://apis.data.go.kr/1230000/ao/HrcspSsstndrdInfoService/getPublicPrcureThngInfoServcPPSSrch"
        
        params = {
            "serviceKey": api_key,
            "pageNo": "1",
            "numOfRows": "50",
            "resultType": "json"
        }
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if agency:
            params["agency"] = agency
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(api_url, params=params)
                response.raise_for_status()
                
                result = {
                    "success": True,
                    "data": response.json(),
                    "timestamp": datetime.now().isoformat()
                }
                
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=json.dumps(result, indent=2, ensure_ascii=False)
                        )
                    ]
                )
        except Exception as e:
            logger.error(f"Failed to fetch procurement data: {str(e)}")
            result = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=json.dumps(result, indent=2, ensure_ascii=False)
                    )
                ]
            )
    
    async def update_supabase(self, args: Dict[str, Any]) -> CallToolResult:
        """Update Supabase database with procurement data"""
        data = args.get("data", [])
        table = args.get("table", "procurement_data")
        
        supabase_url = os.getenv("SUPABASE_URL", "https://kxainopapqkhxlftstuf.supabase.co")
        supabase_key = os.getenv("SUPABASE_KEY", "test_key")
        
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{supabase_url}/rest/v1/{table}",
                    json=data,
                    headers=headers
                )
                response.raise_for_status()
                
                result = {
                    "success": True,
                    "message": f"Updated {len(data)} records in {table}",
                    "timestamp": datetime.now().isoformat()
                }
                
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=json.dumps(result, indent=2, ensure_ascii=False)
                        )
                    ]
                )
        except Exception as e:
            logger.error(f"Failed to update Supabase: {str(e)}")
            result = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=json.dumps(result, indent=2, ensure_ascii=False)
                    )
                ]
            )
    
    async def trigger_make_webhook(self, args: Dict[str, Any]) -> CallToolResult:
        """Trigger Make.com webhook with data"""
        webhook_url = args.get("webhook_url")
        data = args.get("data", {})
        
        payload = {
            **data,
            "timestamp": datetime.now().isoformat(),
            "source": "procurement-mcp-server"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
                
                result = {
                    "success": True,
                    "status": response.status_code,
                    "timestamp": datetime.now().isoformat()
                }
                
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text=json.dumps(result, indent=2, ensure_ascii=False)
                        )
                    ]
                )
        except Exception as e:
            logger.error(f"Failed to trigger webhook: {str(e)}")
            result = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=json.dumps(result, indent=2, ensure_ascii=False)
                    )
                ]
            )
    
    async def run(self):
        """Run the MCP server"""
        logger.info("Starting Procurement MCP Server...")
        async with stdio_server() as streams:
            await self.server.run(streams[0], streams[1])

async def main():
    """Main entry point"""
    server = ProcurementMCPServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())