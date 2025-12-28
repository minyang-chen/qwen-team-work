# Qwen Stock Symbol MCP Service

This is an MCP (Model Context Protocol) service that provides stock symbol lookup functionality for Qwen Code. It resolves company names to stock symbols and validates stock symbols using SEC's company ticker data.

## Features

- Resolves company names to stock symbols
- Validates if stock symbols exist
- Caches SEC data for 24 hours to reduce API calls
- Implements the Model Context Protocol for integration with Qwen Code

## Installation

This service is designed to be used as part of the Qwen Code ecosystem. It can be installed as follows:

```bash
npm install @qwen-code/mcp-stock-service
```

## Configuration

To use this service with Qwen Code, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "stock-service": {
      "command": "node",
      "args": ["/path/to/mcp-stock-service/dist/server.js"]
    }
  }
}
```

## Usage

Once configured, Qwen Code will automatically discover and use the stock symbol lookup tool when it encounters stock-related queries. The service provides the following functionality:

1. **Company Name to Stock Symbol Lookup**: When a user asks about a company like "What's the stock symbol for Microsoft?", the AI can call the tool with the company name.

2. **Stock Symbol Validation**: When a user mentions a stock symbol, the AI can validate if it exists by calling the tool with the symbol.

## API

The service implements the Model Context Protocol. It exposes the following tool:

- `stock_symbol_lookup`: 
  - Parameters: `{companyName?: string, stockSymbol?: string}`
  - Either companyName or stockSymbol must be provided (but not both)

## Development

To run the service in development mode:

```bash
npm run dev
```

To build the service:

```bash
npm run build
```