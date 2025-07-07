# Procurement MCP Server

A Model Context Protocol (MCP) server for automating procurement data collection and processing.

## Features

- Fetch procurement data from Korean government API
- Update Supabase database with new data
- Trigger Make.com webhooks for automation workflows

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your actual keys
   ```

3. Run the server:
   ```bash
   npm start
   ```

## Docker Deployment

```bash
docker build -t procurement-mcp-server .
docker run -d --env-file .env procurement-mcp-server
```

## Available Tools

- `get_procurement_data`: Fetch data from government API
- `update_database`: Update Supabase database
- `trigger_webhook`: Trigger Make.com webhook

## Environment Variables

- `KOREA_API_KEY`: Korean government API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key