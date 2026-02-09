# Conversation Relay IVR Replacement

Automated IVR mapping and simulation system built on [Twilio Conversation Relay v4.0](https://github.com/deshartman/simple-conversation-relay).

## Overview

The IVR Replacement system extends Conversation Relay v4.0 with automated IVR exploration capabilities. Instead of manually documenting IVR menu structures, this system uses AI to intelligently navigate phone trees, document all paths, and generate comprehensive context for conversation handling.

## Key Features

- **Automated IVR Mapping**: Systematically explores IVR systems through 8-step workflow
- **Intelligent Navigation**: AI-driven decision making for menu traversal
- **Context Generation**: Creates detailed documentation of IVR paths and options
- **Async Job Processing**: Non-blocking IVR exploration with job status tracking
- **Conversation Simulation**: Uses mapped IVR data to simulate menu interactions
- **Read/Write Tools**: Specialized tools for documenting and retrieving IVR leg information

## Architecture

### Core Components

**IvrMappingService** (`server/src/services/IvrMappingService.ts`)
- Orchestrates 8-step IVR exploration workflow
- Manages call lifecycle and step transitions
- Handles menu navigation and documentation
- Provides job status tracking and results

**IVR Tools**
- `read_legs` (`server/src/tools/read_legs.ts`): Reads documented IVR paths from JSON files
- `write_legs` (`server/src/tools/write_legs.ts`): Documents IVR menu steps and options

**Specialized Contexts**
- `ivrWalkContext.md`: Instructions for IVR navigation behavior
- `ivrWalkToolManifest.json`: Tool definitions for IVR-specific operations

### API Endpoints

**POST /mapIvr**
- Initiates IVR mapping job
- Parameters: `phoneNumber`, optional `openAiKey`
- Returns: `jobId` for status tracking

**GET /mapIvr/:jobId**
- Retrieves job status and results
- Returns: Job state, progress, and mapped IVR data

## Quick Start

### Prerequisites

- Node.js 18+
- Twilio account with phone number
- OpenAI API key
- Environment variables configured (see `.env.example`)

### Installation

```bash
# Clone repository
git clone https://github.com/deshartman/crelay-ivr-replacement.git
cd crelay-ivr-replacement

# Install dependencies
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build
npm run build

# Start development server
npm run dev
```

### Usage

1. **Map an IVR system:**
```bash
curl -X POST http://localhost:3001/mapIvr \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

2. **Check job status:**
```bash
curl http://localhost:3001/mapIvr/{jobId}
```

3. **Use mapped data:** IVR leg data is saved to `server/data/ivr/legs/{phoneNumber}.json`

## Syncing with Upstream v4.0

This repository maintains connection to the upstream Conversation Relay v4.0 for receiving core service updates.

### Fetch and merge updates:
```bash
# Fetch upstream changes
git fetch upstream v4.0

# Merge into main
git checkout main
git merge upstream/v4.0

# Resolve any conflicts (rare due to isolated IVR code)
# Test after merge
npm install
npm run build
npm run dev
```

See [docs/syncing-upstream.md](docs/syncing-upstream.md) for detailed sync procedures.

## Documentation

- [Architecture Guide](docs/architecture.md) - Detailed system design and workflow
- [API Reference](docs/api-reference.md) - Complete API documentation
- [Development Guide](docs/development-guide.md) - Local setup and contribution guidelines
- [Syncing Upstream](docs/syncing-upstream.md) - How to receive v4.0 updates

## Project Structure

```
crelay-ivr-replacement/
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   └── IvrMappingService.ts    # Core IVR mapping orchestration
│   │   ├── interfaces/
│   │   │   └── IvrMappingService.d.ts  # Type definitions
│   │   ├── tools/
│   │   │   ├── read_legs.ts            # Read IVR paths
│   │   │   └── write_legs.ts           # Document IVR steps
│   │   └── server.ts                   # Main server with IVR endpoints
│   ├── assets/
│   │   ├── ivrWalkContext.md           # IVR navigation instructions
│   │   ├── ivrWalkToolManifest.json    # IVR tool definitions
│   │   └── serverConfig.json           # Configuration
│   └── data/
│       └── ivr/
│           └── legs/                   # Saved IVR mappings
├── docs/                               # Documentation
└── README.md
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Related Projects

- [Twilio Conversation Relay](https://github.com/deshartman/simple-conversation-relay) - Base platform for AI-powered voice conversations
- [Twilio Programmable Voice](https://www.twilio.com/voice) - Underlying telephony platform

## Support

- Issues: [GitHub Issues](https://github.com/deshartman/crelay-ivr-replacement/issues)
- Upstream Project: [simple-conversation-relay](https://github.com/deshartman/simple-conversation-relay)

## Version History

**v1.0.0** - Initial Release
- Based on simple-conversation-relay v4.9.8
- Complete IVR mapping and simulation functionality
- Async job processing
- Read/write tools for IVR documentation
