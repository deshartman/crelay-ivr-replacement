# Development Guide

This guide covers local development setup, testing procedures, and contribution workflows for the Conversation Relay IVR Replacement project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**: Latest version
- **Git**: For version control
- **ngrok** or similar: For exposing local server (optional for testing)

### Required Accounts

- **Twilio Account**: For voice services
  - Account SID
  - Auth Token
  - Phone number
- **OpenAI Account**: For AI services
  - API key with GPT-4 access

### Recommended Tools

- **VS Code** or similar IDE
- **Postman** or **curl** for API testing
- **Git GUI** (GitKraken, GitHub Desktop, etc.)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/deshartman/crelay-ivr-replacement.git
cd crelay-ivr-replacement
```

### 2. Install Dependencies

```bash
cd server
npm install
```

Or using pnpm:

```bash
pnpm install
```

### 3. Configure Environment

Create environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Server Configuration
PORT=3001
SERVER_BASE_URL=your-ngrok-url.ngrok.dev

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o

# Twilio Configuration
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=your-auth-token
API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API_SECRET=your-api-secret
FROM_NUMBER=+1234567890
```

### 4. Verify Installation

```bash
npm run build
```

If successful, you should see TypeScript compilation output without errors.

---

## Development Workflow

### Starting Development Server

```bash
npm run dev
```

This starts the server with hot-reload enabled. Changes to TypeScript files will automatically trigger recompilation.

**Expected Output:**
```
[Server] Starting server...
[Server] Server listening on port 3001
[Server] WebSocket server ready
```

### Project Structure

```
crelay-ivr-replacement/
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   ├── IvrMappingService.ts      # Core IVR service
│   │   │   ├── ConversationRelayService.ts
│   │   │   └── OpenAIResponseService.ts
│   │   ├── interfaces/
│   │   │   └── IvrMappingService.d.ts    # Type definitions
│   │   ├── tools/
│   │   │   ├── read_legs.ts              # Read IVR data
│   │   │   ├── write_legs.ts             # Write IVR data
│   │   │   ├── send-dtmf.ts              # Send DTMF tones
│   │   │   └── end-call.ts               # End call
│   │   ├── utils/
│   │   │   └── logger.ts                 # Logging utility
│   │   └── server.ts                     # Main server
│   ├── assets/
│   │   ├── ivrWalkContext.md             # IVR navigation context
│   │   ├── ivrWalkToolManifest.json      # IVR tool definitions
│   │   └── serverConfig.json             # Configuration
│   ├── data/
│   │   └── ivr/
│   │       └── legs/                     # IVR leg storage
│   ├── dist/                             # Compiled JavaScript
│   ├── package.json
│   └── tsconfig.json
├── docs/                                 # Documentation
└── README.md
```

### Making Changes

1. **Create feature branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes** to TypeScript files in `src/`

3. **Test changes** (see Testing section)

4. **Build and verify:**
```bash
npm run build
npm run dev
```

5. **Commit changes:**
```bash
git add .
git commit -m "Add feature: description"
```

---

## Testing

### Manual Testing

#### Test IVR Mapping

1. **Start server:**
```bash
npm run dev
```

2. **Initiate mapping:**
```bash
curl -X POST http://localhost:3001/mapIvr \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

3. **Check job status:**
```bash
curl http://localhost:3001/mapIvr/{jobId}
```

4. **Verify data file created:**
```bash
ls -la server/data/ivr/legs/
cat server/data/ivr/legs/+1234567890.json
```

#### Test Tools Directly

**Test read_legs:**
```bash
# First, ensure data file exists
mkdir -p server/data/ivr/legs
echo '{"phoneNumber":"+1234567890","legs":[]}' > server/data/ivr/legs/+1234567890.json

# Test via OpenAI function calling during active call
# Or import and test directly in code
```

**Test write_legs:**
```bash
# Call during IVR mapping job
# Verify file updates in server/data/ivr/legs/
```

### Unit Testing (Future)

Create test files in `server/src/__tests__/`:

```typescript
// Example: IvrMappingService.test.ts
import { IvrMappingService } from '../services/IvrMappingService';

describe('IvrMappingService', () => {
  it('should create job with unique ID', () => {
    const service = new IvrMappingService();
    const jobId = service.createJob('+1234567890');
    expect(jobId).toBeDefined();
  });
});
```

Run tests:
```bash
npm test
```

### Integration Testing

Test complete workflow:

1. Start server
2. Initiate IVR mapping
3. Monitor logs for step progression
4. Verify job completion
5. Check leg data file
6. Verify data structure

---

## Debugging

### Enable Debug Logging

Edit `server/src/utils/logger.ts` to set log level:

```typescript
const logger = winston.createLogger({
  level: 'debug', // Change from 'info' to 'debug'
  // ...
});
```

### View Logs

Logs are output to console by default. To save to file:

```typescript
// In logger.ts
logger.add(new winston.transports.File({ 
  filename: 'server.log' 
}));
```

### Debug IVR Mapping Steps

Add console logs in `IvrMappingService.ts`:

```typescript
private async executeStep(step: number) {
  console.log(`[DEBUG] Executing step ${step}`, {
    jobId: this.jobId,
    callSid: this.callSid,
    state: this.state
  });
  // ... step logic
}
```

### Debug Tool Calls

Add logging in tool files:

```typescript
export default async function write_legs(args) {
  console.log('[DEBUG] write_legs called with:', args);
  // ... tool logic
}
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server/src/server.ts",
      "preLaunchTask": "tsc: build - server/tsconfig.json",
      "outFiles": ["${workspaceFolder}/server/dist/**/*.js"],
      "envFile": "${workspaceFolder}/server/.env"
    }
  ]
}
```

Set breakpoints in VS Code and press F5 to start debugging.

---

## Common Tasks

### Adding a New Tool

1. **Create tool file:**
```bash
touch server/src/tools/my-new-tool.ts
```

2. **Implement tool:**
```typescript
export interface MyNewToolArguments {
  param1: string;
  param2: number;
}

export interface MyNewToolResponse {
  success: boolean;
  message: string;
}

export default async function myNewTool(
  args: MyNewToolArguments
): Promise<MyNewToolResponse> {
  // Tool logic here
  return {
    success: true,
    message: "Tool executed successfully"
  };
}
```

3. **Add to tool manifest:**
Edit `server/assets/ivrWalkToolManifest.json`:

```json
{
  "type": "function",
  "function": {
    "name": "my-new-tool",
    "description": "Description of what the tool does",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Description of param1"
        },
        "param2": {
          "type": "number",
          "description": "Description of param2"
        }
      },
      "required": ["param1", "param2"]
    }
  }
}
```

4. **Register in server.ts:**
```typescript
import myNewTool from './tools/my-new-tool.js';

// In tool registration section
case 'my-new-tool':
  result = await myNewTool(functionArguments);
  break;
```

### Modifying IVR Workflow

Edit `server/src/services/IvrMappingService.ts`:

```typescript
private async executeWorkflow() {
  await this.step1_initialize();
  await this.step2_makeCall();
  // Add or modify steps here
  await this.stepN_customStep();
}

private async stepN_customStep() {
  // Custom step logic
}
```

### Updating Context

Edit `server/assets/ivrWalkContext.md` to change AI behavior during IVR navigation.

### Changing Configuration

Edit `server/assets/serverConfig.json`:

```json
{
  "ConversationRelay": {
    "Configuration": {
      "dtmfDetection": true,
      "interruptible": false
    }
  },
  "AssetLoader": {
    "context": "ivrWalkContext",
    "manifest": "ivrWalkToolManifest"
  }
}
```

---

## Troubleshooting

### Server Won't Start

**Problem:** Port already in use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Build Errors

**Problem:** TypeScript compilation fails

**Solution:**
```bash
# Clean build
rm -rf server/dist
npm run build

# Check for type errors
npx tsc --noEmit
```

### IVR Mapping Fails

**Problem:** Job status shows "failed"

**Check:**
1. Verify phone number format (E.164)
2. Check Twilio credentials
3. Ensure FROM_NUMBER is valid
4. Review server logs for errors
5. Verify OpenAI API key has credits

### Tool Execution Fails

**Problem:** Tools not being called during IVR mapping

**Debug:**
1. Check tool manifest is loaded correctly
2. Verify tool function names match manifest
3. Add debug logging to tool files
4. Check OpenAI function calling logs

### WebSocket Connection Issues

**Problem:** Conversation Relay WebSocket fails

**Check:**
1. SERVER_BASE_URL is accessible
2. WebSocket endpoint is exposed
3. Firewall allows WebSocket connections
4. ngrok tunnel is active (if using ngrok)

### Data File Not Created

**Problem:** IVR leg data file not being written

**Check:**
1. Verify `data/ivr/legs` directory exists
2. Check file permissions
3. Ensure write_legs tool is being called
4. Review logs for write errors

---

## Best Practices

### Code Style

- Use TypeScript types, avoid `any`
- Follow existing naming conventions
- Add comments for complex logic
- Use async/await for asynchronous operations

### Error Handling

Always wrap tool logic in try-catch:

```typescript
export default async function myTool(args) {
  try {
    // Tool logic
    return { success: true, message: "Success" };
  } catch (error) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}
```

### Logging

Use appropriate log levels:

```typescript
logger.debug('Detailed debugging information');
logger.info('General information');
logger.warn('Warning messages');
logger.error('Error messages', { error });
```

### Testing

- Test changes locally before committing
- Verify no regressions in existing functionality
- Test with real phone numbers when possible

---

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Twilio Conversation Relay Docs](https://www.twilio.com/docs/voice/conversation-relay)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Express.js Documentation](https://expressjs.com/)

---

## Getting Help

- Check [docs/](../docs/) for additional documentation
- Review [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- Open an issue on GitHub for bugs or questions
- Reference upstream project: [simple-conversation-relay](https://github.com/deshartman/simple-conversation-relay)

Happy coding!
