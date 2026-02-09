# Changelog

All notable changes to the Conversation Relay IVR Replacement project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-10

### Added

#### Core IVR Mapping System
- **IvrMappingService** (`server/src/services/IvrMappingService.ts`) - Complete 8-step IVR exploration workflow
  - Automated phone tree navigation
  - Intelligent menu option selection
  - Context-aware path exploration
  - Job status tracking and management
  - Async processing for non-blocking operations

#### IVR-Specific Tools
- **read_legs** (`server/src/tools/read_legs.ts`) - Reads documented IVR paths from JSON storage
  - Supports phone number-based lookup
  - Returns complete leg data structure
  - Error handling for missing data

- **write_legs** (`server/src/tools/write_legs.ts`) - Documents IVR menu steps and navigation
  - Structured JSON storage format
  - Append and update operations
  - Automatic file management

#### Specialized Assets
- **ivrWalkContext.md** (`server/assets/ivrWalkContext.md`) - IVR navigation instructions
  - Step-by-step guidance for AI navigation
  - Menu detection patterns
  - Terminal condition handling

- **ivrWalkToolManifest.json** (`server/assets/ivrWalkToolManifest.json`) - IVR tool definitions
  - Tool specifications for read_legs and write_legs
  - Integration with OpenAI function calling
  - Parameter validation schemas

#### API Endpoints
- **POST /mapIvr** - Initiates IVR mapping job
  - Accepts phone number and optional OpenAI key
  - Returns job ID for tracking
  - Non-blocking async processing

- **GET /mapIvr/:jobId** - Retrieves job status and results
  - Real-time job state information
  - Progress tracking
  - Complete mapped IVR data on completion

#### Configuration Updates
- Updated `server/assets/serverConfig.json` with IVR-specific settings
- Enhanced server configuration for IVR job management

#### Server Enhancements
- Modified `server/src/server.ts` to include IVR endpoints
- Job queue management for concurrent IVR mapping operations
- In-memory job tracking with state management

### Technical Details

**Base Version**: Built on simple-conversation-relay v4.9.8

**Key Dependencies**:
- OpenAI API for intelligent navigation
- Twilio Programmable Voice for call control
- Express.js for API endpoints
- TypeScript for type-safe implementation

**Data Storage**:
- IVR leg data stored in `server/data/ivr/legs/{phoneNumber}.json`
- Structured JSON format for easy parsing and retrieval

**Architecture**:
- Service-based design with clear separation of concerns
- Tool-driven workflow for LLM integration
- Async job processing for scalability
- Type-safe interfaces throughout

### Notes

This release represents the initial public version of the IVR Replacement system. The project is extracted from the IVR_Replace branch of simple-conversation-relay and maintains upstream connectivity for receiving v4.0 core updates.

For detailed migration and sync procedures, see [docs/syncing-upstream.md](docs/syncing-upstream.md).

---

## Future Releases

Future versions will be documented here as they are released.
