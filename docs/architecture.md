# Architecture Guide

This document provides a detailed overview of the IVR Replacement system architecture, design decisions, and implementation details.

## System Overview

The IVR Replacement system extends Conversation Relay v4.0 with automated IVR exploration capabilities. It uses AI-driven navigation to systematically explore phone tree systems, document all paths, and generate comprehensive context for conversation handling.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  (HTTP Requests to /mapIvr endpoints)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     API Layer (server.ts)                       │
│  • POST /mapIvr - Initiate mapping                             │
│  • GET /mapIvr/:jobId - Check status                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│              IvrMappingService (Orchestrator)                   │
│  • Job management and state tracking                            │
│  • 8-step workflow execution                                    │
│  • Call lifecycle management                                    │
└────┬──────────────────┬──────────────────┬──────────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────┐    ┌──────────────┐    ┌────────────────┐
│ Twilio  │    │   OpenAI     │    │  File Storage  │
│ Service │    │   Service    │    │  (IVR Legs)    │
└─────────┘    └──────────────┘    └────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────┐    ┌──────────────┐    ┌────────────────┐
│  Voice  │    │  GPT-4 API   │    │  read_legs/    │
│  Calls  │    │  (Function   │    │  write_legs    │
│         │    │   Calling)   │    │    Tools       │
└─────────┘    └──────────────┘    └────────────────┘
```

## Core Components

### 1. IvrMappingService

**Location**: `server/src/services/IvrMappingService.ts`

**Responsibilities**:
- Orchestrates the complete IVR exploration workflow
- Manages call state and step transitions
- Handles job tracking and status reporting
- Coordinates between Twilio, OpenAI, and storage layers

**8-Step Workflow**:

```
Step 1: INITIALIZE
├─ Create job with unique ID
├─ Initialize state tracking
└─ Return job ID to caller

Step 2: MAKE_CALL
├─ Initiate outbound call to target IVR
├─ Configure Conversation Relay with IVR-specific context
└─ Wait for call to connect

Step 3: WAIT_FOR_GREETING
├─ Listen for initial IVR greeting
├─ Transcribe and analyze greeting message
└─ Identify menu structure

Step 4: NAVIGATE_MENU
├─ AI analyzes menu options
├─ Selects appropriate path to explore
├─ Sends DTMF tones for navigation
└─ Documents current leg

Step 5: DOCUMENT_LEG
├─ Writes current menu path to storage
├─ Records options and context
└─ Updates exploration state

Step 6: CHECK_TERMINAL
├─ Determine if at terminal node
├─ Check for agent handoff conditions
└─ Decide next action (explore more or complete)

Step 7: EXPLORE_NEXT
├─ If more paths exist, navigate to next
├─ Reset to menu root if needed
└─ Continue exploration

Step 8: COMPLETE
├─ End call gracefully
├─ Finalize job status
└─ Return complete IVR map
```

**State Management**:

```typescript
interface JobState {
  jobId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  phoneNumber: string;
  callSid?: string;
  currentStep: number;
  exploredPaths: string[];
  totalPaths: number;
  startTime: Date;
  endTime?: Date;
  result?: IvrMapResult;
  error?: string;
}
```

### 2. IVR Tools

#### read_legs Tool

**Location**: `server/src/tools/read_legs.ts`

**Purpose**: Reads previously documented IVR paths from storage

**Function Signature**:
```typescript
interface ReadLegsArguments {
  phoneNumber: string;
}

interface ReadLegsResponse {
  success: boolean;
  phoneNumber: string;
  legs?: IvrLeg[];
  message: string;
}
```

**Usage Flow**:
1. Accept phone number as input
2. Resolve file path: `data/ivr/legs/{phoneNumber}.json`
3. Read and parse JSON file
4. Return leg data or error message

#### write_legs Tool

**Location**: `server/src/tools/write_legs.ts`

**Purpose**: Documents IVR menu steps and navigation paths

**Function Signature**:
```typescript
interface WriteLegsArguments {
  phoneNumber: string;
  legNumber: number;
  description: string;
  options: string[];
  selectedOption?: string;
}

interface WriteLegsResponse {
  success: boolean;
  message: string;
}
```

**Storage Format**:
```json
{
  "phoneNumber": "+1234567890",
  "legs": [
    {
      "legNumber": 1,
      "timestamp": "2026-02-10T10:30:00Z",
      "description": "Main menu - Business hours support",
      "options": [
        "Press 1 for Sales",
        "Press 2 for Support",
        "Press 3 for Billing"
      ],
      "selectedOption": "2"
    }
  ]
}
```

### 3. Specialized Contexts

#### ivrWalkContext.md

**Location**: `server/assets/ivrWalkContext.md`

**Purpose**: Provides AI with instructions for IVR navigation

**Key Sections**:
- **Objective**: Define the AI's role in IVR exploration
- **Navigation Rules**: How to interpret and navigate menus
- **Documentation Standards**: What information to capture
- **Terminal Conditions**: How to identify completion
- **Error Handling**: What to do when encountering issues

**Example Instructions**:
```markdown
## Navigation Behavior

1. Listen carefully to menu options
2. Document ALL options before selecting
3. Choose systematic path (depth-first exploration)
4. Use DTMF tool to send selections
5. Document each leg before moving forward
6. Detect terminal conditions (agent transfer, dead end)
```

#### ivrWalkToolManifest.json

**Location**: `server/assets/ivrWalkToolManifest.json`

**Purpose**: Defines tools available during IVR exploration

**Tools Included**:
- `read_legs`: Read existing IVR documentation
- `write_legs`: Document current menu leg
- `send-dtmf`: Send DTMF tones for navigation
- `end-call`: Gracefully terminate exploration

## Data Flow

### Initiating IVR Mapping

```
┌────────┐
│ Client │
└───┬────┘
    │ POST /mapIvr
    │ { phoneNumber: "+1234567890" }
    ▼
┌─────────────────┐
│   server.ts     │
│   (API Layer)   │
└───┬─────────────┘
    │ 1. Validate request
    │ 2. Generate jobId
    ▼
┌──────────────────────┐
│  IvrMappingService   │
│  createJob()         │
└───┬──────────────────┘
    │ 3. Initialize job state
    │ 4. Start async workflow
    ▼
┌──────────────────────┐
│   Job State Store    │
│   (In-Memory Map)    │
└──────────────────────┘
    │
    │ 5. Return jobId
    ▼
┌────────┐
│ Client │ Receives: { jobId: "uuid-1234" }
└────────┘
```

### Processing IVR Exploration

```
┌──────────────────────┐
│  IvrMappingService   │
│  (Async Workflow)    │
└───┬──────────────────┘
    │
    │ Step 2: Make Call
    ▼
┌─────────────────┐
│ Twilio Service  │ ─────► Outbound call initiated
└─────────────────┘
    │
    │ Step 3: Wait for Greeting
    ▼
┌─────────────────────┐
│ Conversation Relay  │
│ (WebSocket)         │
└──┬──────────────────┘
   │ Transcription received
   ▼
┌─────────────────┐
│ OpenAI Service  │ ─────► Analyze menu structure
└──┬──────────────┘
   │ Navigation decision
   ▼
┌─────────────────┐
│  send-dtmf      │ ─────► Send menu selection
│     Tool        │
└─────────────────┘
   │
   │ Step 5: Document
   ▼
┌─────────────────┐
│  write_legs     │ ─────► Save to data/ivr/legs/
│     Tool        │
└─────────────────┘
   │
   │ Repeat Steps 4-7
   ▼
┌──────────────────────┐
│  Step 8: Complete    │
└──────────────────────┘
```

## Integration Points

### Twilio Integration

**Services Used**:
- **Programmable Voice**: Outbound calling
- **Conversation Relay**: WebSocket communication
- **DTMF Detection**: Menu navigation

**Configuration**:
```typescript
conversationRelay({
  url: `wss://${serverUrl}/conversation-relay`,
  dtmfDetection: true,
  interruptible: false,  // Don't interrupt during IVR
  // ... other config
});
```

### OpenAI Integration

**Model**: GPT-4 (or configured model)

**Function Calling**:
- Tools registered via `ivrWalkToolManifest.json`
- Real-time decision making during exploration
- Context provided via `ivrWalkContext.md`

**Example Function Call**:
```json
{
  "name": "write_legs",
  "arguments": {
    "phoneNumber": "+1234567890",
    "legNumber": 1,
    "description": "Main menu",
    "options": ["Press 1 for Sales", "Press 2 for Support"],
    "selectedOption": "2"
  }
}
```

## Storage Architecture

### File Storage

**Directory Structure**:
```
server/
└── data/
    └── ivr/
        └── legs/
            ├── +1234567890.json
            ├── +0987654321.json
            └── ...
```

**File Naming**: `{phoneNumber}.json` (E.164 format)

**Data Structure**:
```typescript
interface IvrLegData {
  phoneNumber: string;
  lastUpdated: string;
  legs: IvrLeg[];
}

interface IvrLeg {
  legNumber: number;
  timestamp: string;
  description: string;
  options: string[];
  selectedOption?: string;
  metadata?: {
    duration?: number;
    audioUrl?: string;
  };
}
```

## Async Job Processing

### Job Management

**In-Memory Store**:
```typescript
const jobStore = new Map<string, JobState>();
```

**Benefits**:
- Fast job status lookups
- No database dependency
- Simple implementation

**Limitations**:
- Jobs lost on server restart
- Not suitable for long-running jobs across deployments

**Future Enhancement**: Persistent storage (Redis, Database)

### Job Lifecycle

```
PENDING ───────► IN_PROGRESS ───────► COMPLETED
   │                  │                    │
   │                  │                    │
   └──────────────────┴────────────────► FAILED
```

## Error Handling

### Service-Level Errors

```typescript
try {
  await ivrMappingService.executeWorkflow(jobId);
} catch (error) {
  jobStore.get(jobId).status = 'failed';
  jobStore.get(jobId).error = error.message;
  logger.error('IVR mapping failed', { jobId, error });
}
```

### Tool-Level Errors

```typescript
export default async function write_legs(args) {
  try {
    // Tool logic
    return { success: true, message: "Leg documented" };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to write leg: ${error.message}` 
    };
  }
}
```

### Call-Level Errors

- **No Answer**: Timeout after 30 seconds
- **Busy**: Immediate failure
- **Failed**: Retry logic (configurable)

## Performance Considerations

### Concurrency

- Multiple IVR mapping jobs can run simultaneously
- Each job maintains independent state
- WebSocket connections are isolated per call

### Resource Usage

- **Memory**: Job state stored in-memory
- **Network**: One call per job
- **Storage**: Minimal (JSON files)

### Optimization Opportunities

1. **Caching**: Cache frequently accessed IVR maps
2. **Parallel Exploration**: Explore multiple paths concurrently
3. **Incremental Updates**: Update existing maps rather than full re-exploration

## Security Considerations

### API Security

- Rate limiting on `/mapIvr` endpoint
- Authentication/authorization (to be implemented)
- Input validation for phone numbers

### Data Privacy

- IVR leg data contains business logic
- Store securely with appropriate access controls
- Consider encryption at rest

### Call Security

- Use secure WebSocket connections (WSS)
- Validate Twilio signatures
- Limit call duration and cost

## Extensibility

### Adding New Tools

1. Create tool file in `server/src/tools/`
2. Add tool definition to `ivrWalkToolManifest.json`
3. Update `ivrWalkContext.md` with usage instructions

### Custom Workflows

Extend `IvrMappingService` for custom exploration strategies:

```typescript
class CustomIvrMappingService extends IvrMappingService {
  protected async navigateMenu() {
    // Custom navigation logic
  }
}
```

### Integration with Other Services

- Export IVR maps to external systems
- Trigger webhooks on completion
- Integrate with analytics platforms

## Testing Strategy

### Unit Tests

- Test individual tools (read_legs, write_legs)
- Mock Twilio and OpenAI services
- Validate state transitions

### Integration Tests

- End-to-end IVR mapping flow
- Use test phone numbers
- Verify data persistence

### Manual Testing

- Test with real IVR systems
- Verify navigation accuracy
- Check documentation completeness

## Deployment Considerations

### Environment Variables

Required:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `OPENAI_API_KEY`
- `SERVER_BASE_URL`

### Scaling

- Horizontal scaling: Multiple server instances
- Load balancing: Distribute jobs across instances
- Persistent storage: Required for multi-instance deployments

## Future Enhancements

1. **Visual IVR Maps**: Generate flowchart diagrams
2. **Intelligent Retry**: Retry failed paths automatically
3. **Cost Optimization**: Minimize call duration
4. **Real-Time Monitoring**: Dashboard for active jobs
5. **Historical Analysis**: Track IVR changes over time

## Summary

The IVR Replacement system provides a comprehensive solution for automated IVR exploration. Its modular architecture, clean separation of concerns, and extensible design make it well-suited for both standalone use and integration into larger systems.
