# Team Layer Architecture Documentation

This directory contains comprehensive documentation for the team collaboration layer architecture.

## Documents

### 1. [TEAM_LAYER_ARCHITECTURE.md](./TEAM_LAYER_ARCHITECTURE.md)
**Complete architectural specification**

- Layer responsibilities and boundaries
- Component design and interactions
- Data flow diagrams
- Protocol definitions (ACP)
- Configuration management
- Error handling patterns
- Testing strategies
- Deployment architecture
- Security considerations
- Monitoring and observability

**Read this first** for a complete understanding of the architecture.

### 2. [TEAM_LAYER_QUICK_REFERENCE.md](./TEAM_LAYER_QUICK_REFERENCE.md)
**Quick reference guide**

- Visual layer diagrams
- Key principles (DO/DON'T)
- Message flow examples
- Package dependencies
- File structure
- Common pitfalls and fixes
- Configuration examples
- Testing examples

**Use this** for quick lookups during development.

### 3. [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
**Step-by-step migration instructions**

- Current state problems
- Target architecture
- 7-phase migration plan
- Code examples for each phase
- Verification checklist
- Rollback procedures
- Timeline estimates

**Follow this** to migrate from current to correct architecture.

## Key Architectural Principles

### 1. Layer Separation
```
Application → Adapter → SDK → Core
```
Each layer has clear responsibilities and boundaries.

### 2. Use SDK, Not Core
```typescript
// ✅ Correct
import { query } from '@qwen-code/sdk';
const result = await query({ prompt: 'Hello' });

// ❌ Wrong
import { GeminiClient } from '@qwen-code/core';
const client = new GeminiClient(config);
```

### 3. Protocol Translation
```typescript
// Adapter translates between protocols
AcpMessage → ProtocolTranslator → SdkOptions
SdkResult → ProtocolTranslator → AcpResponse
```

### 4. Dependency Direction
```
team-ai-agent → @qwen-code/sdk → @qwen-code/core
(Never reverse)
```

## Current Issues

The current implementation has **4 critical defects**:

1. **Wrong package name**: `@qwen-code/shared` should be `@qwen-team/shared`
2. **Direct core manipulation**: Uses `GeminiClient` directly instead of SDK
3. **Missing protocol translation**: No clear ACP ↔ SDK conversion layer
4. **File dependencies**: Uses `file:../core` instead of published SDK version

See [TEAM_LAYER_ARCHITECTURE.md](./TEAM_LAYER_ARCHITECTURE.md) for detailed analysis.

## Quick Start

### For Developers

1. Read [TEAM_LAYER_QUICK_REFERENCE.md](./TEAM_LAYER_QUICK_REFERENCE.md)
2. Review the DO/DON'T section
3. Check common pitfalls
4. Start coding with correct patterns

### For Architects

1. Read [TEAM_LAYER_ARCHITECTURE.md](./TEAM_LAYER_ARCHITECTURE.md)
2. Understand layer responsibilities
3. Review protocol definitions
4. Plan deployment architecture

### For Migration

1. Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
2. Follow phases sequentially
3. Test after each phase
4. Verify checklist at end

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│ Application Layer (team-storage, team-ui, vscode)      │
│ - Business logic, UI, persistence                      │
└────────────────────┬────────────────────────────────────┘
                     │ ACP Protocol (WebSocket)
┌────────────────────▼────────────────────────────────────┐
│ Adapter Layer (@qwen-team/ai-agent)                  │
│ - Protocol translation (ACP ↔ SDK)                    │
│ - Session management                                   │
│ - Message routing                                      │
└────────────────────┬────────────────────────────────────┘
                     │ SDK Public API
┌────────────────────▼────────────────────────────────────┐
│ SDK Layer (@qwen-code/sdk) - Published Package         │
│ - query(), Query class                                 │
│ - High-level programmatic API                          │
└────────────────────┬────────────────────────────────────┘
                     │ Core Internal API
┌────────────────────▼────────────────────────────────────┐
│ Core Layer (@qwen-code/core) - Published Package       │
│ - GeminiClient, Config, Tools                          │
└─────────────────────────────────────────────────────────┘
```

## Package Structure

```
packages/
├── team-ai-agent/        # Adapter layer
│   ├── src/
│   │   ├── server/         # WebSocket server
│   │   ├── protocol/       # ACP ↔ SDK translation
│   │   ├── session/        # Session management
│   │   └── handlers/       # Message handlers
│   └── package.json        # Depends on @qwen-code/sdk
│
├── team-shared/            # Shared types
│   ├── src/
│   │   ├── types/          # ACP protocol types
│   │   └── interfaces/     # Service interfaces
│   └── package.json        # Name: @qwen-team/shared
│
└── sdk-typescript/         # Published SDK
    └── src/
        ├── query/          # Main API
        └── mcp/            # MCP integration
```

## Testing

### Unit Tests
```bash
cd packages/team-ai-agent
npm test
```

### Integration Tests
```bash
cd packages/team-ai-agent
npm run test:integration
```

### End-to-End Tests
```bash
# Start all services
./scripts/start-all.sh

# Run E2E tests
npm run test:e2e
```

## Deployment

### Development
```bash
cd packages/team-ai-agent
npm run dev
```

### Production
```bash
cd packages/team-ai-agent
npm run build
npm start
```

### Docker
```bash
docker build -t team-ai-agent .
docker run -p 8001:8001 team-ai-agent
```

## Contributing

When contributing to the team layer:

1. Follow the architectural principles
2. Use SDK, not core directly
3. Add protocol translation for new message types
4. Write unit tests for all new code
5. Update documentation

## Resources

- [ACP Protocol Specification](./ACP_PROTOCOL_SPEC.md) (if exists)
- [SDK Documentation](../../packages/sdk-typescript/README.md)
- [Core Documentation](../../packages/core/README.md)
- [Team Backend API](../../packages/team-storage/README.md)

## Support

For questions or issues:

1. Check the documentation in this directory
2. Review examples in `packages/sdk-typescript/examples/`
3. Open an issue with `[architecture]` tag
4. Contact the architecture team

## Version History

- **v1.0** (2025-12-25): Initial architecture documentation
  - Documented correct architecture
  - Identified current defects
  - Created migration guide
