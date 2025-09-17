# Simple Conversation Relay

This is a reference implementation aimed at introducing the key concepts of Conversation Relay. The key here is to ensure it is a workable environment that can be used to understand the basic concepts of Conversation Relay. It is intentionally simple and only the minimum has been done to ensure the understanding is focussed on the core concepts.

## Release v4.4.3

This release introduces **Enhanced Silence Detection Configuration System** with centralized JSON configuration, eliminating hardcoded values and providing maximum flexibility for customizing silence handling behavior.

**Key Configuration Improvements:**
- **Centralized Configuration**: Complete silence detection configuration through JSON object
- **Flexible Message Arrays**: Support for any number of escalation messages without code changes
- **Eliminated Hardcoded Values**: No more environment variables or scattered constants
- **Type-Safe Configuration**: Full TypeScript support with proper interfaces

**Enhanced Silence Detection Features:**
- **Configurable Thresholds**: Easy modification of silence detection timing
- **Custom Messages**: Tailored silence reminder messages for different use cases
- **Dynamic Message Count**: Add or remove escalation messages without recompiling
- **A/B Testing Support**: Easy testing of different message strategies and timing

**✅ Backward Compatible**: Existing configurations automatically use sensible defaults.

See the [CHANGELOG.md](./CHANGELOG.md) for detailed release history.

## Prerequisites

- Node.js v18
- pnpm
- ngrok
- TypeScript

## Server

### Project Structure

```
.
├── server/                # WebSocket server for conversation relay
│   ├── .env.example      # Example environment configuration
│   ├── package.json      # Server dependencies and scripts
│   ├── tsconfig.json     # TypeScript configuration
│   ├── assets/           # Configuration assets
│   │   ├── defaultContext.md    # Default GPT conversation context
│   │   ├── defaultToolManifest.json # Default available tools configuration
│   │   ├── MyContext.md        # Specific context
│   │   └── MyToolManifest.json # Specific tools
│   ├── src/              # Source code directory
│   │   ├── server.ts     # Main server implementation
│   │   ├── interfaces/   # TypeScript interface definitions
│   │   │   ├── ResponseService.d.ts # ResponseService interface with DI handlers
│   │   │   └── ConversationRelay.d.ts # Conversation Relay interfaces with Twilio message types
│   │   ├── services/     # Core service implementations
│   │   │   ├── ConversationRelayService.ts # Implements DI pattern
│   │   │   ├── OpenAIResponseService.ts # Implements ResponseService interface with DI
│   │   │   ├── FlowiseResponseService.ts # Alternative ResponseService implementation
│   │   │   ├── SilenceHandler.ts
│   │   │   └── TwilioService.ts
│   │   ├── tools/        # Tool implementations
│   │   │   ├── end-call.ts
│   │   │   ├── live-agent-handoff.ts
│   │   │   ├── send-dtmf.ts
│   │   │   ├── send-sms.ts
│   │   │   ├── switch-language.ts
│   │   │   └── play-media.ts
│   │   └── utils/        # Utility functions
│   │       └── logger.ts
```

The server handles WebSocket connections and manages conversation relay functionality. It includes GPT service integration for natural language processing and Twilio integration for voice call handling.

### Running the Server

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

3. For development, start the development server:
```bash
# Using pnpm
pnpm dev

# Or using npm
npm run dev
```

For production, build and start the server:
```bash
# Using pnpm
pnpm build
pnpm start

# Or using npm
npm run build
npm start
```

4. Ensure the server is running on port 3001 (or configured port in `.env`).

5. Optionally, expose the server using ngrok:
```bash
ngrok http --domain server-yourdomain.ngrok.dev 3001
```

### How It Works

1. **Initialization**: Silence monitoring starts after the initial setup message, ensuring the system is ready for conversation.

2. **Message Tracking**:
   - The system tracks the time since the last meaningful message
   - Info-type messages are intentionally ignored to prevent false resets
   - Valid messages (prompt, interrupt, dtmf) reset both the timer and retry counter

3. **Response Sequence**:
   - After 5 seconds of silence: Sends a reminder message ("I'm sorry, I didn't catch that...")
   - Each reminder increments a retry counter
   - After 3 unsuccessful attempts: Ends the call with an "unresponsive" reason code

4. **Cleanup**: The system properly cleans up monitoring resources when the call ends or disconnects.

## Twilio Configuration

### Twilio Phone Number Configuration

1. Configure your Twilio phone number to point to the "connectConversationRelay" endpoint:
   - Go to your Twilio Console > Phone Numbers > Active Numbers
   - Select your phone number
   - Under "Voice & Fax" > "A Call Comes In"
   - Set it to "Webhook" and enter:
     ```
     https://server-yourdomain.ngrok.dev/connectConversationRelay
     ```
   - Method: HTTP POST

### TwiML Configuration

The server **dynamically generates TwiML** using configuration stored in Twilio Sync Maps. Instead of hardcoded values, all conversation relay parameters are loaded from your Sync configuration:

```typescript
// TwiML is generated dynamically from Sync Maps configuration
const config = await this.getConversationRelayConfig(); // Loads from Sync Maps
const languages = await this.getLanguages(); // Loads language settings

const conversationRelay = connect.conversationRelay({
    url: `wss://${serverBaseUrl}/conversation-relay`,
    transcriptionProvider: config.transcriptionProvider,  // From Sync Maps
    speechModel: config.speechModel,                      // From Sync Maps
    interruptible: config.interruptible,                  // From Sync Maps
    ttsProvider: config.ttsProvider,                      // From Sync Maps
    voice: config.voice,                                  // From Sync Maps
    dtmfDetection: config.dtmfDetection,                  // From Sync Maps
    welcomeGreeting: config.welcomeGreeting               // From Sync Maps
});
```

**Configuration Management:**
- All TwiML parameters are stored in Sync Maps under the `ConversationRelay` service
- Configuration can be updated via API without server restarts
- Changes take effect immediately for new calls
- Language-specific settings support multi-language operations

### WebSocket Connection Flow

1. When a call is received, Twilio initiates a WebSocket connection to `wss://server-yourdomain.ngrok.dev/conversation-relay`
2. The server receives a 'setup' message containing call details and custom parameters
3. The server creates service instances and begins processing incoming messages
4. Each WebSocket connection maintains its own isolated session in a wsSessionsMap

## OpenAI Context Configuration

The server uses **Twilio Sync Maps** to store and manage OpenAI conversation contexts and tool manifests:

### Context Documents

Context documents are stored as **string content** in Sync Maps with unique keys:

**Context Structure:**
- **AI Assistant Persona** - Define the AI's role and personality
- **Conversation Guidelines** - Set tone, style, and behavior rules
- **Response Formatting** - Specify how responses should be structured
- **Process Instructions** - Detail specific conversation flows and steps
- **Domain Knowledge** - Include relevant business context and rules

**Key Sections to Configure:**
1. **Objective** - Define the AI's primary role and tasks
2. **Style Guardrails** - Set conversation tone and behavior boundaries
3. **Response Guidelines** - Specify formatting and delivery requirements
4. **Instructions** - Detail specific process steps and workflows

### Tool Manifests

Tool manifests are stored as **JSON objects** in Sync Maps defining available tools:

**Available Tools:**
1. `end-call` - Gracefully terminates the current call
2. `live-agent-handoff` - Transfers the call to a human agent
3. `send-dtmf` - Sends DTMF tones during the call
4. `send-sms` - Sends SMS messages during the call
5. `switch-language` - Changes TTS and/or transcription languages
6. `play-media` - Plays audio media from URLs

### Language Switching Example

The system supports dynamic language switching during active calls using the `switch-language` tool. Users can request language changes naturally, and the system will immediately switch both text-to-speech and speech-to-text languages.

**Example Conversation Flow:**
```
User: "Can you switch to Australian English?"

System Processing:
[SwitchLanguage] Switch language function called with arguments: {
  "ttsLanguage": "en-AU",
  "transcriptionLanguage": "en-AU"
}

[Conversation Relay] Sending immediate message: {
  "type": "language",
  "ttsLanguage": "en-AU",
  "transcriptionLanguage": "en-AU"
}

AI Response: "No worries, I've switched to Australian English now.
Is there something specific you'd like to know about how the system works,
or do you want a general walk-through?"
```

**Supported Language Configurations:**
- **en-AU**: Australian English with ElevenLabs voice `IKne3meq5aSn9XLyUdCD`
- **en-US**: US English with ElevenLabs voice `tnSpp4vdxKPjI9w0GnoV`

**Technical Implementation:**
- Language switching uses Twilio's `SwitchLanguageMessage` WebSocket message type
- Changes are applied immediately without call interruption
- Both TTS (text-to-speech) and transcription languages are updated simultaneously
- System maintains conversation context across language switches

### Dynamic Context Loading

**Per-Call Configuration:**
```typescript
// WebSocket setup message with custom configuration
{
  "type": "setup",
  "customParameters": {
    "contextKey": "customerServiceContext",
    "manifestKey": "limitedToolSet"
  }
}
```

**Runtime Configuration Updates:**
```bash
# Update active call configuration
curl -X POST '/updateResponseService' \
  --data '{
    "callSid": "CA1234...",
    "contextKey": "escalationContext",
    "manifestKey": "managerTools"
  }'
```

### Quick Start Configuration Examples

**Initial Setup (Automatic):**
```bash
# 1. Start the server (automatically creates defaults)
npm run dev

# 2. Make a test call (uses defaultContext and defaultToolManifest automatically)
# No additional setup required!
```

**Adding a Custom Customer Service Configuration:**
```bash
# 1. Upload customer service context
curl -X POST 'https://your-server/api/sync/context' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "customerServiceContext": "You are a helpful customer service representative..."
  }'

# 2. Upload restricted tools for customer service
curl -X POST 'https://your-server/api/sync/toolmanifest' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "customerServiceTools": {
      "tools": [
        {"type": "function", "function": {"name": "send-sms", ...}},
        {"type": "function", "function": {"name": "live-agent-handoff", ...}}
      ]
    }
  }'

# 3. Set as system default
curl -X POST 'https://your-server/api/sync/usedconfig' \
  --data-raw '{
    "context": "customerServiceContext",
    "manifest": "customerServiceTools"
  }'
```

**Configuration Examples by Use Case:**

**Context Keys:**
- `defaultContext` - General purpose conversation (auto-created)
- `customerServiceContext` - Customer support scenarios
- `salesContext` - Sales and lead qualification
- `technicalSupportContext` - Technical troubleshooting

**Tool Manifest Keys:**
- `defaultToolManifest` - Standard tool set (auto-created)
- `limitedTools` - Restricted tools for basic scenarios
- `managerTools` - Extended tools for escalated calls
- `adminTools` - Full administrative tool access

## Environment Configuration

Create a `.env` file in the server directory with the following variables:

```bash
# Server Configuration
PORT=3001                                    # Server port number
SERVER_BASE_URL=your_server_url              # Base URL for your server (e.g., ngrok URL)

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key          # OpenAI API key for GPT integration
OPENAI_MODEL=gpt-4o                         # OpenAI model to use for conversations

# Twilio Configuration (required for Sync Maps and voice services)
ACCOUNT_SID=your_twilio_account_sid         # Twilio Account SID for Sync and voice operations
AUTH_TOKEN=your_twilio_auth_token           # Twilio Auth Token for authentication
API_KEY=your_twilio_api_key                 # Twilio API Key for enhanced authentication
API_SECRET=your_twilio_api_secret           # Twilio API Secret for enhanced authentication
FROM_NUMBER=your_twilio_phone_number        # Twilio phone number for calls/SMS
```

### Required Twilio Services

The system requires the following Twilio services to be enabled in your account:
- **Voice** - For handling phone calls and conversation relay
- **Sync** - For storing and retrieving configuration data (context documents and tool manifests)
- **SMS** (optional) - For send-sms tool functionality

## Configuration Management

Version 4.4.0 uses **Twilio Sync Maps** for cloud-based configuration storage with **key-based dynamic loading**. Context documents and tool manifests are stored in Sync Maps and retrieved by key for each conversation session.

### Automatic Default Setup

**🚀 Getting Started:** The system automatically creates default configurations to get you up and running quickly:

1. **Automatic Sync Maps Creation**: On first startup, the server automatically creates required Sync Services and Maps
2. **Default Configuration Loading**: The system loads `defaultContext` and `defaultToolManifest` from local files in `server/assets/`
3. **Immediate Operation**: You can start making calls immediately using the default configuration
4. **No Manual Setup Required**: The system handles all initial Sync Maps population automatically

**Default Files Auto-Loaded:**
- `server/assets/defaultContext.md` → Sync Maps key `defaultContext`
- `server/assets/defaultToolManifest.json` → Sync Maps key `defaultToolManifest`

### How Configuration Works

The system uses a **hybrid architecture**:

1. **Storage**: Context and tool manifests are stored in Twilio Sync Maps
2. **Retrieval**: Configuration is loaded dynamically using keys (e.g., `defaultContext`, `defaultToolManifest`)
3. **Service Creation**: Loaded configuration is passed directly to services as parameters
4. **Dynamic Switching**: Different keys can be specified per call for custom configurations
5. **Auto-Population**: Default configurations are automatically loaded from local files on startup

### Configuration Keys

**Default Keys:**
- `defaultContext` - Default conversation context document
- `defaultToolManifest` - Default tool definitions object

**Custom Keys:**
- Any custom key can be used to store and retrieve specialized configurations
- Keys are specified via `contextKey` and `manifestKey` parameters in WebSocket setup

### Dynamic Configuration Loading

**WebSocket Setup with Custom Keys:**
```json
{
  "type": "setup",
  "customParameters": {
    "contextKey": "customerServiceContext",
    "manifestKey": "customerServiceTools"
  }
}
```

**API-Based Configuration Updates:**
```bash
# Update context for active call
curl -X POST 'https://your-server/updateResponseService' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "callSid": "CA1234...",
    "contextKey": "newContext",
    "manifestKey": "newManifest"
  }'
```

### Sync Maps Structure

**Context Documents** (stored as strings):
- `defaultContext`: Default conversation context
- `customerServiceContext`: Customer service specific context
- `salesContext`: Sales conversation context

**Tool Manifests** (stored as objects):
- `defaultToolManifest`: Standard tool set
- `customerServiceTools`: Customer service specific tools
- `salesTools`: Sales specific tools

### Managing Additional Configurations

**🔧 Adding Custom Contexts and Manifests:** The system provides default configurations out-of-the-box, but you must add your own custom contexts and manifests directly to Twilio Sync to meet your specific business requirements.

#### Required Setup for Custom Configurations

**IMPORTANT**: The system includes only basic default files for demonstration. For production use, you must upload your own context documents and tool manifests to Twilio Sync Maps:

1. **Upload Your Custom Context**: Add your business-specific context documents to Sync
   ```bash
   curl -X POST 'https://your-server/api/sync/context' \
     --header 'Content-Type: application/json' \
     --data-raw '{"myBusinessContext": "Your custom context content here..."}'
   ```

2. **Upload Your Custom Manifest**: Add your custom tool configurations to Sync
   ```bash
   curl -X POST 'https://your-server/api/sync/toolmanifest' \
     --header 'Content-Type: application/json' \
     --data-raw '{"myBusinessTools": {"tools": [...]}}'
   ```

3. **Set as Active Configuration**: Configure the system to use your custom configurations
   ```bash
   curl -X POST 'https://your-server/api/sync/usedconfig' \
     --data-raw '{"context": "myBusinessContext", "manifest": "myBusinessTools"}'
   ```

4. **Verify Configuration**: Confirm your configurations are loaded
   ```bash
   curl 'https://your-server/api/sync/usedconfig'
   ```

#### Configuration Management Architecture

**📋 How Configuration Works:**
- **Default Files**: Basic `defaultContext.md` and `defaultToolManifest.json` included for initial setup only
- **Sync Maps Storage**: All configurations stored in Twilio Sync Maps for cloud access
- **In-Memory Caching**: CachedAssetsService provides high-performance access after startup
- **Direct Upload Required**: You must upload your own contexts/manifests to Sync for production use
- **Per-Call Override**: Individual calls can specify custom `contextKey`/`manifestKey` via WebSocket parameters
- **Runtime Updates**: Active calls can be updated using the `/updateResponseService` endpoint

### Benefits of Sync Maps Configuration

- **Cloud-Native**: Leverages Twilio's enterprise infrastructure
- **Real-Time Updates**: Configuration changes available immediately
- **Dynamic Loading**: Different configurations per call without restarts
- **Centralized Management**: Single source of truth across all instances
- **Key-Based Access**: Simple key lookup for configuration retrieval
- **Scalable Storage**: No local file dependencies or management overhead
- **Automatic Setup**: Default configurations loaded automatically from local files

## Asset Upload Utility

The system includes a convenient utility script for manually uploading asset files to Twilio Sync. This utility accepts any file path and provides a simple way to upload individual context documents and tool manifests without using the server's API endpoints.

### Usage

```bash
# From the server directory
node scripts/upload-assets.js <filepath>
```

### Supported File Types

- **`.md` files** → Uploaded to Context map (with content wrapper)
- **`.json` files** → Uploaded to ToolManifest map

### Examples

```bash
# Upload files using relative paths
node scripts/upload-assets.js ./assets/customerServiceContext.md
node scripts/upload-assets.js ./assets/customTools.json

# Upload files from current directory
node scripts/upload-assets.js myContext.md
node scripts/upload-assets.js myManifest.json

# Upload files using absolute paths
node scripts/upload-assets.js /path/to/specialContext.md
```

### How It Works

1. **File Path Resolution**: Accepts any file path (relative or absolute) and resolves it correctly
2. **File Validation**: Checks that the file exists at the specified path and has a supported extension
3. **JSON Parsing**: For `.json` files, validates JSON syntax before upload
4. **Automatic Naming**: Uses filename (without extension) as the Sync map key
5. **Update or Create**: Updates existing Sync map items or creates new ones
6. **Detailed Logging**: Provides clear feedback on upload success/failure

### Asset Naming Convention

The utility automatically derives the Sync map key from the filename:

- `customerServiceContext.md` → Context map key: `customerServiceContext`
- `customTools.json` → ToolManifest map key: `customTools`
- `specializedContext.md` → Context map key: `specializedContext`

### Prerequisites

- Twilio credentials must be configured in your `.env` file (`ACCOUNT_SID` and `AUTH_TOKEN`)
- Server must be built (`npm run build`) to generate compiled JavaScript files
- Asset files must exist at the specified file path

### Error Handling

The utility provides clear error messages for common issues:

- **Missing file**: `Error: File not found: /path/to/file`
- **Invalid extension**: `Error: Only .md and .json files are supported`
- **Invalid JSON**: `Error: Invalid JSON in filename.json`
- **Missing credentials**: `Error: Missing Twilio credentials`

This utility is perfect for:
- **Development workflow**: Quick asset synchronization during development
- **Configuration updates**: Push changes to existing custom assets
- **Custom deployments**: Upload your specialized contexts and manifests
- **Testing scenarios**: Easily upload different configurations for testing

**Note**: Default assets (`defaultContext.md`, `defaultToolManifest.json`) are automatically uploaded on server startup, so manual upload is only needed for custom assets.

## Silence Detection Configuration

Version 4.4.3 introduces a comprehensive silence detection configuration system that eliminates hardcoded values and provides maximum flexibility for customizing silence handling behavior.

### Configuration Structure

Silence detection is configured through the `UsedConfig.silenceDetection` object in `defaultConfig.json`:

```json
{
  "UsedConfig": {
    "configuration": "defaultConfig",
    "context": "defaultContext",
    "manifest": "defaultToolManifest",
    "silenceDetection": {
      "enabled": false,
      "secondsThreshold": 20,
      "messages": [
        "Still there?",
        "Just checking you are still there?",
        "Hello? Are you still on the line?"
      ]
    }
  }
}
```

### Configuration Properties

- **`enabled`** (boolean): Controls whether silence detection is active
  - `true`: Silence detection operates normally
  - `false`: No silence monitoring or timeout messages

- **`secondsThreshold`** (number): Seconds of silence before triggering response
  - Default: `20` seconds
  - Configurable based on conversation type and user expectations

- **`messages`** (array): Progressive reminder messages sent to user
  - Array-based progression: System iterates through messages in order
  - Flexible count: Add or remove messages without code changes
  - Call termination: When all messages are exhausted, the call ends gracefully

### How Silence Detection Works

1. **Silence Monitoring**: System tracks time since last meaningful message
2. **Message Progression**: When threshold exceeded, sends first message from array
3. **Escalation**: Subsequent silence periods trigger next messages in sequence
4. **Conversation Reset**: Valid user responses reset message index to beginning
5. **Call Termination**: After all messages exhausted, call ends with "unresponsive" reason

### Configuration Examples

**Development/Testing Configuration:**
```json
"silenceDetection": {
  "enabled": true,
  "secondsThreshold": 5,
  "messages": ["Quick test - still there?"]
}
```

**Customer Service Configuration:**
```json
"silenceDetection": {
  "enabled": true,
  "secondsThreshold": 30,
  "messages": [
    "I'm sorry, I didn't catch that. Are you still there?",
    "Hello? Can you hear me?",
    "We seem to have lost connection. I'll end this call now."
  ]
}
```

**No Timeout Configuration:**
```json
"silenceDetection": {
  "enabled": false,
  "secondsThreshold": 20,
  "messages": []
}
```

### Benefits of Enhanced Configuration

- **No Code Changes**: Modify thresholds and messages through JSON configuration
- **A/B Testing**: Easy testing of different message strategies and timing
- **Environment-Specific**: Different configurations for development, staging, production
- **User Experience**: Customizable messaging tailored to specific use cases
- **Type Safety**: Full TypeScript support with compile-time validation

## Fly.io Deployment

To deploy the server to Fly.io:

1. Navigate to the server directory:
```bash
cd server
```

2. For new deployments, use the `--no-deploy` option:
```bash
fly launch --no-deploy
```

3. Ensure your `fly.toml` file has the correct port configuration:
```toml
[http]
  internal_port = 3001
```

4. Add the volume mount configuration:
```toml
[mounts]
  source = "assets"
  destination = "/assets"
```

5. Import your environment variables as secrets:
```bash
fly secrets import < .env
```

6. Deploy your application:
```bash
fly deploy
```

## Dependencies

### Server Dependencies
- express - Web application framework
- express-ws - WebSocket support for Express
- openai - OpenAI API client for GPT integration
- dotenv - Environment configuration
- winston - Logging framework
- uuid - Unique identifier generation

### Server Tools

The server includes several built-in tools for call management:

1. `end-call` - Gracefully terminates the current call
2. `live-agent-handoff` - Transfers the call to a human agent  
3. `send-dtmf` - Sends DTMF tones during the call
4. `send-sms` - Sends SMS messages during the call
5. `switch-language` - Changes TTS and/or transcription languages
6. `play-media` - Plays audio media from URLs

## Outbound Calling

The system supports initiating outbound calls via an API endpoint:

```
POST /outboundCall
```

### Request Format

```typescript
interface RequestData {
  properties: {
    phoneNumber: string;      // [REQUIRED] Destination phone number in E.164 format
    callReference: string;    // [OPTIONAL] Unique reference to associate with the call
    firstname?: string;       // [OPTIONAL] Additional parameter data
    lastname?: string;        // [OPTIONAL] Additional parameter data
    [key: string]: any;       // Other optional parameters
  }
}
```

### Example Usage

```bash
curl -X POST \
  'https://server-yourdomain.ngrok.dev/outboundCall' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "properties": {
      "phoneNumber": "+1234567890",
      "callReference": "abc123",
      "firstname": "Bob",
      "lastname": "Jones"
    }
  }'
```

---

# Architecture

## Service Architecture

The server uses dependency inversion for multi LLM operators and a clean dependency injection architecture with handler interfaces for service communication.

### Server Services

The server is organized into modular services:

1. **ConversationRelayService** - Manages the core conversation flow and WebSocket communication
2. **OpenAIResponseService** - Implements the ResponseService interface for OpenAI integration
3. **SilenceHandler** - Manages silence detection and response with configurable thresholds
4. **TwilioService** - Manages Twilio-specific functionality and call control operations

### Handler Interfaces

**ResponseHandler** - Handles LLM service responses:
```typescript
export interface ResponseHandler {
    content(response: ContentResponse): void;
    toolResult(toolResult: ToolResultEvent): void;
    error(error: Error): void;
    callSid(callSid: string, responseMessage: any): void;
}
```

**ConversationRelayHandler** - Handles conversation relay events:
```typescript
export interface ConversationRelayHandler {
    outgoingMessage(message: OutgoingMessage): void;
    callSid(callSid: string, responseMessage: any): void;
    silence(message: OutgoingMessage): void;
}
```

### Service Setup

Services use unified handler creation methods:

```typescript
// Create service instances
const responseService = await OpenAIResponseService.create(contextFile, toolManifest);
const conversationRelay = new ConversationRelayService(responseService, sessionData);

// Set up response handler
const responseHandler = {
    content: (response) => { /* handle content */ },
    toolResult: (toolResult) => { /* handle tool results */ },
    error: (error) => { /* handle errors */ },
    callSid: (callSid, responseMessage) => { /* handle call events */ }
};
responseService.createResponseHandler(responseHandler);

// Set up conversation relay handler
const conversationRelayHandler = {
    outgoingMessage: (message) => ws.send(JSON.stringify(message)),
    callSid: (callSid, responseMessage) => { /* handle call events */ },
    silence: (silenceMessage) => ws.send(JSON.stringify(silenceMessage))
};
conversationRelay.createConversationRelayHandler(conversationRelayHandler);
```

### Handler Implementation

Services communicate through unified handler interfaces:

```typescript
// ResponseService using unified handler
this.responseHandler.content(response);
this.responseHandler.toolResult(toolResult);
this.responseHandler.error(error);
```

### Architecture Benefits

#### 🚀 Performance
- **Direct Function Calls**: Fast, direct handler invocation with minimal overhead
- **Optimized Memory Usage**: Lightweight handler objects
- **Low Latency**: Immediate function calls for responsive service communication

#### 🛡️ Type Safety & Developer Experience
- **Compile-Time Validation**: TypeScript enforces correct handler signatures
- **IntelliSense Support**: Full IDE autocompletion and documentation
- **Strong Type Contracts**: Clear, enforceable contracts between services

#### 🧪 Testing & Maintainability
- **Easy Mocking**: Simple function mocking for unit tests
- **Clear Dependencies**: Explicit handler dependencies make service relationships transparent
- **Better Debugging**: Direct call stacks make debugging straightforward

#### 🏗️ Clean Architecture
- **Single Responsibility**: Each handler focuses on one specific communication channel
- **Interface Segregation**: Services only implement handlers they actually need
- **Dependency Inversion**: Services depend on handler abstractions, not concrete implementations

### TypeScript Interface Enforcement

The system includes comprehensive TypeScript interfaces for all Twilio WebSocket message types:

#### Outgoing Message Types
- **`TextTokensMessage`**: For sending text to be converted to speech
- **`PlayMediaMessage`**: For playing audio from URLs
- **`SendDigitsMessage`**: For sending DTMF digits
- **`SwitchLanguageMessage`**: For changing TTS and transcription languages
- **`EndSessionMessage`**: For terminating conversation sessions

These are unified under the `OutgoingMessage` union type, ensuring compile-time validation:

```typescript
const textMessage: TextTokensMessage = {
    type: 'text',
    token: 'Hello, how can I help you?',
    last: true,
    interruptible: true
};

await conversationRelaySession.outgoingMessage(textMessage);
```

### Tool Type-Driven Architecture

The system implements a pure tool type-driven architecture using OutgoingMessage types for routing:

#### Tool Categories

1. **Generic LLM Tools** - Standard tools processed by OpenAI (e.g., `send-sms`)
2. **CRelay Tools with Immediate Delivery** - WebSocket tools sent immediately (e.g., `send-dtmf`)  
3. **CRelay Tools with Delayed Delivery** - Terminal tools sent after OpenAI response (e.g., `end-call`, `live-agent-handoff`)

#### Tool Response Patterns

**Generic LLM Tool (send-sms.ts):**
```typescript
export default async function (functionArguments: SendSMSFunctionArguments): Promise<SendSMSResponse> {
    // Tool logic here
    const result = await twilioService.sendSMS(args.to, args.message);
    
    // Return simple response for OpenAI to process
    return {
        success: true,
        message: `SMS sent successfully`,
        recipient: args.to
    };
}
```

**CRelay Tool with Immediate Delivery (send-dtmf.ts):**
```typescript
import { SendDigitsMessage } from '../interfaces/ConversationRelay.js';

export default function (functionArguments: SendDTMFFunctionArguments): SendDTMFResponse {
    return {
        success: true,
        message: `DTMF digits sent successfully`,
        digits: functionArguments.dtmfDigit,
        outgoingMessage: {
            type: "sendDigits",
            digits: functionArguments.dtmfDigit
        } as SendDigitsMessage
    };
}
```

**CRelay Tool with Delayed Delivery (end-call.ts):**
```typescript
import { EndSessionMessage } from '../interfaces/ConversationRelay.js';

export default function (functionArguments: EndCallFunctionArguments): EndCallResponse {
    return {
        success: true,
        message: `Call ended successfully`,
        summary: functionArguments.summary,
        outgoingMessage: {
            type: "end",
            handoffData: JSON.stringify({
                reasonCode: "end-call",
                reason: "Ending the call",
                conversationSummary: functionArguments.summary
            })
        } as EndSessionMessage
    };
}
```

#### Type-Driven Routing

ConversationRelayService routes based on `outgoingMessage.type`:
- **`sendDigits`, `play`, `language`** - Immediate WebSocket delivery
- **`end`** - Stored and sent after OpenAI response completion
- **`text`** or no outgoingMessage - Standard OpenAI processing

### Interrupt Handling

The ResponseService supports interrupting ongoing AI responses using a boolean flag approach for simplicity:

```typescript
interrupt(): void {
    this.isInterrupted = true;
}

private async processStream(stream: any): Promise<void> {
    for await (const event of stream) {
        if (this.isInterrupted) {
            break;  // Exit when interrupted
        }
        // Process events...
    }
}
```

