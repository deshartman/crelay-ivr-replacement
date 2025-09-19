# Changelog

## Release v4.5.1

### Silence Mode Call Handling Improvements

#### Enhanced Listen Mode Call Termination
- **Improved Terminal Messaging**: Enhanced call ending behavior in listen mode to ensure proper silence detection handling
- **Better Call Flow**: Optimized the interaction between listen mode and silence detection for smoother call termination
- **Silence Handler Integration**: Improved coordination between OpenAIResponseService listen mode and SilenceHandler for consistent behavior

#### Technical Implementation
- **OpenAIResponseService Enhancement**: Updated silence mode handling in `processStream()` method for better call ending coordination
- **State Management**: Improved listen mode state coordination with silence detection mechanisms
- **Call Termination Logic**: Enhanced terminal message processing to work seamlessly with silence detection

#### Benefits
- **Consistent Call Endings**: Reliable call termination behavior regardless of listen mode state
- **Better User Experience**: Smoother interaction between automated operations and silence detection
- **Improved Reliability**: More predictable behavior when transitioning between listen mode and normal operations

This release refines the listen mode implementation to provide better coordination with silence detection and more reliable call termination behavior.

## Release v4.5.0

### Listen Mode Implementation

#### Automated Operation Configuration System
- **Listen Mode Configuration**: Added configurable listen mode system for automated operations without text responses
  ```json
  "listenMode": {
    "enabled": true
  }
  ```
- **Silent Operation**: When enabled, OpenAI response text processing is suppressed while maintaining full tool execution capability
- **Configuration-Driven Behavior**: Listen mode state controlled through `defaultConfig.json` UsedConfig section
- **Dynamic Control**: Runtime switching capability through `set-listen-mode` tool for operational flexibility

#### OpenAI Response Service Enhancement
- **Early Break Pattern**: Implemented efficient early break logic in `processStream()` method for text suppression
- **Listen Mode Property**: Added `this.listenMode` boolean property for direct state access
- **Response Processing Control**: Text delta events bypassed when listen mode active: `if (this.listenMode) break;`
- **Tool Execution Preservation**: All tool calling and function execution remains fully operational in listen mode

#### CachedAssetsService Integration
- **Configuration Loading**: Extended CachedAssetsService to include listenMode in UsedAssets interface
- **Type Safety**: Added proper TypeScript interface support for listenMode configuration object
- **Service Integration**: Listen mode configuration passed to OpenAIResponseService during initialization
- **Asset Management**: Listen mode settings cached for high-performance access across service instances

#### Dynamic Listen Mode Control Tool
- **set-listen-mode Tool**: New tool for runtime control of listen mode state during active conversations
  - Parameters: `enabled` (boolean) - True for listen-only operation, false for normal responses
  - Response validation and error handling for boolean parameter enforcement
  - Standard tool calling pattern without service injection dependencies
- **Tool Manifest Integration**: Added set-listen-mode to ivrWalkToolManifest for automated IVR operations
- **Runtime Flexibility**: Enables switching between automated and interactive modes during conversations

#### Technical Architecture
- **Service Layer Integration**: Listen mode configuration flows from CachedAssetsService through service constructors
- **Performance Optimization**: Early break pattern prevents unnecessary text processing overhead
- **State Management**: Boolean flag approach for simple and reliable state control
- **Tool Integration**: Standard tool calling patterns maintained for consistency with existing architecture

### Benefits of Listen Mode System

#### Automated Operations
- **Silent Navigation**: Enable automated phone tree navigation without speaking responses
- **Background Processing**: Run automated tasks while preserving all tool execution capabilities
- **Data Collection**: Document system interactions without user-facing responses
- **Testing Scenarios**: Automated testing of conversation flows and tool execution

#### Developer Experience
- **Configuration Control**: Simple boolean configuration for enabling/disabling text responses
- **Runtime Flexibility**: Dynamic switching between automated and interactive modes
- **Tool Consistency**: Standard tool calling patterns without special service injection
- **Type Safety**: Full TypeScript support with proper interface definitions

#### Performance Benefits
- **Reduced Processing**: Early break pattern eliminates unnecessary text response generation
- **Lower Bandwidth**: No text transmission when operating in silent mode
- **Optimized Resources**: Skip text-to-speech processing during automated operations
- **Faster Execution**: Direct state checking without complex method calls

This release provides a comprehensive listen mode system that enables automated operations while maintaining full tool execution capabilities, perfect for IVR navigation, automated testing, and background data collection scenarios.

## Release v4.4.4

### Configuration Loading Fixes

#### Reliable Configuration Updates
- **Always Reload defaultConfig.json**: Fixed issue where UsedConfig changes in `defaultConfig.json` were only applied on first-time setup, not on server restarts
- **Consistent Configuration State**: Server now always applies local configuration file changes on every startup
- **Predictable Behavior**: Configuration changes are immediately effective after server restart

#### Selective Asset Loading
- **Controlled Context Loading**: Disabled automatic loading of all `*Context.md` files from assets directory
- **Only Default Assets**: Now only `defaultContext.md` loads automatically during server startup
- **Manual Upload Required**: Other context files (like `ivrWalkContext.md`) must be uploaded manually using the Asset Upload Utility
- **Cleaner Startup**: Prevents unintended contexts from being automatically loaded into Sync

#### Technical Implementation
- **Removed Auto-Discovery**: Commented out `loadAllContextFiles()` call in startup sequence
- **Conditional Logic Fix**: Removed `loadDefaults` condition for UsedConfig loading
- **Startup Optimization**: Faster startup with only essential default assets loaded

#### Benefits
- **Configuration Reliability**: Changes to `defaultConfig.json` are guaranteed to be applied
- **Explicit Asset Management**: Developers have full control over which contexts are loaded
- **Development Workflow**: Easier testing and configuration management during development
- **Production Stability**: Prevents accidental loading of development/test contexts

## Release v4.4.3

### Enhanced Silence Detection Configuration System

#### Centralized Configuration Architecture
- **Complete Configuration Object**: Replaced simple boolean `silenceDetection: false` with comprehensive configuration object:
  ```json
  "silenceDetection": {
    "enabled": false,
    "secondsThreshold": 20,
    "messages": [
      "Still there?",
      "Just checking you are still there?",
      "Hello? Are you still on the line?"
    ]
  }
  ```
- **Eliminated Hardcoded Values**: Removed hardcoded fallbacks (`SILENCE_SECONDS_THRESHOLD`, `SILENCE_RETRY_THRESHOLD`) from SilenceHandler in favor of centralized JSON configuration
- **Enhanced CachedAssetsService**: Extended to support new silence detection configuration structure with proper TypeScript interfaces

#### Flexible Message Array System
- **Array-Based Message Progression**: Replaced hardcoded retry threshold logic with elegant message array iteration
- **Dynamic Message Count**: Support for any number of escalation messages without code changes
- **Configurable Thresholds**: Easy modification of silence detection timing through JSON configuration
- **Message Index Management**: Proper reset of message progression when conversation resumes

#### Architecture Improvements
- **SilenceDetectionConfig Interface**: New TypeScript interface defining configuration structure with `enabled`, `secondsThreshold`, and `messages` properties
- **Constructor-Based Configuration**: SilenceHandler now accepts configuration object instead of reading environment variables
- **Conditional Service Creation**: ConversationRelayService only creates SilenceHandler when `config.enabled === true`
- **Type-Safe Configuration**: Complete TypeScript support with proper interfaces and type checking

#### Service Integration Enhancements
- **Enhanced getUsedAssets()**: CachedAssetsService now returns silence detection configuration alongside context and manifest
- **Factory Method Updates**: ConversationRelayService.create() passes full configuration object to SilenceHandler constructor
- **Clean Separation**: Clear distinction between configuration loading (CachedAssetsService) and service creation (ConversationRelayService)
- **Default Configuration**: Fallback configuration provided when not specified in JSON

### Benefits of Enhanced Silence Detection

#### Configuration Flexibility
- **No Code Changes Required**: Modify silence thresholds and messages through JSON configuration
- **A/B Testing Support**: Easy testing of different message strategies and timing
- **Dynamic Message Count**: Add or remove escalation messages without recompiling
- **Environment-Specific Settings**: Different configurations for development, staging, and production

#### Improved User Experience
- **Customizable Messaging**: Tailored silence reminder messages for different use cases
- **Configurable Timing**: Adjustable silence thresholds for different conversation types
- **Proper Message Progression**: Logical escalation through configured message sequence
- **Clean Call Termination**: Graceful ending when all reminder messages are exhausted

#### Developer Experience
- **Type Safety**: Complete TypeScript support with IntelliSense and compile-time validation
- **Centralized Configuration**: All silence detection settings in one location
- **Consistent Architecture**: Follows established configuration patterns from existing system
- **Easy Testing**: Simple configuration changes for testing different scenarios

#### Maintainability
- **Eliminated Hardcoded Values**: No more scattered constants or missing environment variables
- **Single Source of Truth**: All silence detection configuration in JSON
- **Clean Service Boundaries**: Clear responsibility separation between services
- **Future Extensibility**: Architecture supports additional silence detection features

This release provides a comprehensive silence detection configuration system that eliminates hardcoded values while providing maximum flexibility for customizing silence handling behavior through simple JSON configuration changes.

### Asset Upload Utility

#### New Developer Tool
- **Manual Asset Upload Script**: Added `scripts/upload-assets.js` utility for manually uploading asset files to Twilio Sync
- **Flexible Path Support**: Accepts any file path (relative, absolute, or current directory) using `path.resolve()` for maximum flexibility
- **File Type Support**: Handles both `.md` files (uploaded to Context map) and `.json` files (uploaded to ToolManifest map)
- **Update or Create Logic**: Automatically updates existing Sync map items or creates new ones using existing `TwilioSyncService` patterns

#### Usage Examples
```bash
# Upload files using relative paths
node scripts/upload-assets.js ./assets/customContext.md
node scripts/upload-assets.js ./assets/customTools.json

# Upload files from current directory
node scripts/upload-assets.js myContext.md

# Upload files using absolute paths
node scripts/upload-assets.js /path/to/file.json
```

#### Technical Implementation
- **Reuses Existing Infrastructure**: Leverages `TwilioSyncService` and existing Sync Maps architecture
- **Environment Variable Consistency**: Uses same credentials (`ACCOUNT_SID`, `AUTH_TOKEN`) as existing services
- **Comprehensive Error Handling**: Validates file existence, JSON syntax, and Twilio credentials
- **Asset Naming Convention**: Derives Sync map keys from filename (without extension)
- **Detailed Logging**: Provides clear feedback on upload success/failure with content statistics

#### Benefits
- **Development Workflow**: Quick asset synchronization during development
- **Configuration Management**: Easy upload of custom contexts and tool manifests
- **No API Dependencies**: Direct file-to-Sync upload without server endpoints
- **Consistent with Server Patterns**: Follows same Twilio client initialization and error handling as main application

## Release v4.4.2

### Performance Optimization Architecture

#### High-Performance Caching Implementation
- **CachedAssetsService**: Implemented in-memory caching system to eliminate runtime Sync API calls
  - Uses Map-based storage for instant context and manifest retrieval
  - Provides deep copies to ensure session independence
  - Implements `getUsedAssets()`, `getContext()`, `getManifest()`, and `getAssetsForContextSwitch()` methods
- **Startup-Only Sync Operations**: Modified TwilioSyncService to only push defaults and load cache at startup
  - Eliminates per-session Sync API overhead
  - Maintains cloud storage benefits while providing local performance
- **Service Architecture Optimization**: Reduced service creation overhead with direct cache access
  - OpenAIResponseService now receives CachedAssetsService directly
  - ConversationRelayService simplified to pass CachedAssetsService reference only

#### Self-Contained Context Switching
- **Enhanced change-context Tool**: Tool now performs context switching directly without service boundary crossing
  - Receives OpenAI and CachedAssetsService references via dependency injection
  - Performs context switching internally: `openaiService.updateContext()` and `openaiService.updateTools()`
  - Inserts handoff summary into conversation before switching contexts
- **Service Reference Injection**: Added pattern for tools requiring direct service access
  - Special handling in OpenAIResponseService for change-context tool
  - Injects `_openaiService` and `_contextCacheService` parameters for self-contained operation

#### Code Cleanup and Interface Simplification
- **Removed ContextLoader Interface**: Eliminated unused interface as part of architecture simplification
- **Updated Service Dependencies**: Simplified service creation patterns with direct cache access
- **Enhanced WebSocket Logic**: Streamlined server initialization with CachedAssetsService integration

### Performance Benefits

#### Runtime Performance
- **Eliminated Sync API Calls**: In-memory cache provides instant access to contexts and manifests
- **Reduced Service Creation Overhead**: Direct parameter passing without complex loading mechanisms
- **Faster Context Switching**: Self-contained tool execution without service boundary crossing
- **Lower Memory Usage**: Optimized architecture reduces memory footprint

#### Startup Performance
- **One-Time Sync Operations**: All Sync interactions happen only at startup
- **Batch Configuration Loading**: All contexts and manifests loaded into cache simultaneously
- **Persistent Cache**: In-memory cache persists for entire server lifetime

#### Developer Experience
- **Simplified Architecture**: Cleaner service boundaries with direct cache access
- **Self-Contained Tools**: Context switching tools handle their own execution flow
- **Better Error Handling**: Simplified error paths with direct service access
- **Maintainable Code**: Reduced complexity with fewer abstraction layers

This release provides significant performance improvements while maintaining full backward compatibility and preserving all existing functionality.

## Release v4.4.1

### Language Configuration Optimization

#### Enhanced Language Configuration Structure
- **Removed Redundant ConversationRelay Language Fields**: Eliminated duplicate language settings from ConversationRelay object as Languages array overrides these values
- **Streamlined Configuration**: Removed `language`, `ttsLanguage`, `transcriptionProvider`, `transcriptionLanguage`, `speechModel`, `ttsProvider`, `voice` from ConversationRelay level
- **Complete Language Element Support**: Updated Languages array to use only supported Twilio Language element parameters
- **Proper Parameter Structure**: Languages now include only `code`, `ttsProvider`, `voice`, `transcriptionProvider`, `speechModel` as per Twilio documentation

#### Configuration Cleanup Benefits
- **Follows Twilio Best Practices**: Language elements properly override ConversationRelay defaults without redundancy
- **Cleaner Configuration Structure**: No duplicate or conflicting language settings between levels
- **Better Maintainability**: Single source of truth for language-specific settings in Languages array
- **Documentation Compliance**: Configuration structure now matches official Twilio ConversationRelay documentation

#### Language Switching Enhancement
- **Dynamic Language Support**: Proper language switching with `switch-language` tool now works seamlessly
- **Multi-Language Configuration**: Support for multiple language variants (en-AU, en-US) with distinct TTS voices
- **Real-Time Language Changes**: Users can request language changes during calls with immediate effect

This release optimizes the language configuration structure to eliminate redundancy and ensure full compliance with Twilio's ConversationRelay Language element specifications, providing cleaner configuration management and better language switching capabilities.

## Release v4.4.0

### Direct Parameter Configuration Migration

#### Complete Migration from File-Based to Direct Parameter Configuration
- **Architectural Simplification**: Migrated from file-based configuration (`server/assets/`) to direct parameter passing for context and tool manifests
- **Streamlined Service Creation**: Services now receive context and manifest content directly as parameters instead of loading from files
- **Improved Performance**: Eliminated file I/O overhead by passing configuration data directly to services
- **Enhanced Flexibility**: Context and manifest data can now come from any source (files, databases, APIs, etc.)

#### Service Architecture Improvements
- **Direct Parameter Passing**: All services now accept context and manifest content as direct parameters
  - `OpenAIResponseService.create(context: string, manifest: object)` - Context and manifest passed directly
  - `ConversationRelayService.create(sessionData, context, manifest)` - Factory method with direct parameters
  - `FlowiseResponseService.create(context: string, manifest: object)` - Updated to match interface
- **Content-Based Interface**: ResponseService interface updated to work with content instead of file paths
  - `updateContext(context: string): Promise<void>` - Updates context from string content
  - `updateTools(manifest: object): Promise<void>` - Updates tools from manifest object
- **Eliminated File Dependencies**: Services no longer depend on file system operations for configuration
- **Type Safety Enhancement**: Context as `string`, toolManifest as `object` across all services

#### Code Cleanup and Optimization
- **Removed Unused Infrastructure**: Eliminated unused AssetsLoader infrastructure
  - Removed `AssetsLoader.ts` - Factory pattern loader no longer needed
  - Removed `SyncAssetsLoader.ts` - Sync implementation no longer needed
  - Removed `AssetsLoader.d.ts` - Interface no longer needed
  - Removed entire `/server/src/loaders/` directory - No longer needed
- **Simplified Service Creation**: Direct parameter passing eliminates complex loading mechanisms
- **Cleaner Dependencies**: Services have cleaner, more predictable dependencies

#### Service Integration Updates
- **WebSocket Handler**: Services created with context and manifest passed directly from calling code
- **Factory Pattern Enhancement**: Service creation methods now accept content parameters directly
- **Error Handling**: Simplified error handling without file system dependencies
- **Memory Efficiency**: Reduced memory overhead by eliminating unused loader infrastructure

### Migration Benefits

#### Performance Improvements
- **Faster Service Creation**: No file I/O operations during service initialization
- **Reduced Memory Footprint**: Eliminated unused loader classes and infrastructure
- **Lower Latency**: Direct parameter passing without intermediate loading steps
- **Simplified Call Stack**: Cleaner execution path without loader abstraction layers

#### Developer Experience
- **Simpler API**: Direct parameter passing is more intuitive than file-based configuration
- **Better Testability**: Easy to test with mock context and manifest data
- **Flexible Data Sources**: Context and manifest can come from any source, not just files
- **Cleaner Architecture**: Eliminated unnecessary abstraction layers and complexity

#### Maintainability
- **Reduced Codebase**: Removed unused loader infrastructure reduces maintenance burden
- **Clearer Dependencies**: Services have explicit, direct dependencies on their configuration data
- **Better Separation of Concerns**: Configuration sourcing is separated from service logic
- **Future-Proof**: Architecture supports any configuration source without service changes

#### Type Safety & Reliability
- **Compile-Time Validation**: TypeScript enforces correct parameter types for all services
- **Predictable Behavior**: Direct parameter passing eliminates file system error scenarios
- **Consistent Interface**: All services follow the same parameter-based creation pattern
- **Enhanced Debugging**: Simpler execution path makes debugging more straightforward

This release represents a fundamental simplification of the service architecture, moving from complex file-based configuration loading to straightforward direct parameter passing, providing better performance, maintainability, and flexibility while maintaining full functional compatibility.

## Release v4.3.1

### Complete CCRelay Method Support

#### Added Remaining Twilio WebSocket Message Types
- **switch-language Tool**: Implemented support for dynamic language switching during calls
  - Takes optional `ttsLanguage` and `transcriptionLanguage` parameters
  - Validates that at least one language parameter is provided  
  - Returns `SwitchLanguageMessage` type for WebSocket routing
  - Supports Twilio's language switching capabilities for both text-to-speech and speech-to-text
- **play-media Tool**: Added support for playing audio media from URLs
  - Takes required `source` URL parameter for media playback
  - Supports optional `loop`, `preemptible`, `interruptible` parameters
  - Returns `PlayMediaMessage` type for WebSocket routing
  - Enables playing audio files during conversation sessions

#### Tool Implementation Enhancements
- **Consistent Tool Patterns**: Both new tools follow established patterns from existing tools
- **Type Safety**: Proper TypeScript interfaces and validation for all parameters
- **Error Handling**: Comprehensive validation with descriptive error messages
- **Logging Integration**: Full logging support using existing logger utilities
- **OutgoingMessage Integration**: Both tools return proper OutgoingMessage types for WebSocket routing

#### Complete Twilio Coverage
- **Full API Support**: System now supports all major Twilio Conversation Relay WebSocket message types:
  - `text` - Text-to-speech synthesis (existing)
  - `sendDigits` - DTMF tone transmission (existing)  
  - `end` - Session termination (existing)
  - `language` - Language switching (new)
  - `play` - Media playback (new)
- **Documentation Updates**: Updated README.md to reflect new tools in project structure and tool listings
- **Consistent Architecture**: All tools follow the same patterns for maintainability and developer experience

### Benefits of Complete CCRelay Support

#### Enhanced Conversation Capabilities
- **Multi-Language Support**: Dynamic language switching enables serving customers in different languages during the same call
- **Rich Media Integration**: Audio playback capabilities for playing hold music, announcements, or instructional content
- **Complete Twilio Integration**: Full utilization of Twilio's Conversation Relay WebSocket API capabilities

#### Developer Experience
- **Comprehensive Toolset**: All official Twilio Conversation Relay features available as easy-to-use tools
- **Consistent Patterns**: Predictable tool structure makes it easy to understand and extend functionality
- **Type-Safe Implementation**: Full TypeScript support with proper interfaces and validation

#### Architectural Benefits
- **Future-Proof**: Complete API coverage ensures compatibility with Twilio's full feature set
- **Maintainable**: Consistent tool patterns make the codebase easier to maintain and extend
- **Well-Documented**: Updated documentation reflects complete tool coverage and usage patterns

This release completes the Twilio Conversation Relay API integration, providing developers with access to all official WebSocket message types through a consistent, type-safe tool interface.

## Release v4.3.0

### Tool Type-Driven Architecture Migration

#### Complete Event-Driven to Tool Type-Driven Transformation
- **Architectural Paradigm Shift**: Migrated from event-driven tool system to pure tool type-driven architecture using OutgoingMessage types
- **Enhanced Type Safety**: Replaced generic "crelay" routing with specific OutgoingMessage type-based routing (`sendDigits`, `end`, `text`, etc.)
- **Terminal Tool Timing Fix**: Implemented proper timing for terminal tools to ensure OpenAI response is delivered before call termination
- **Clean Separation of Concerns**: Eliminated all remaining event-driven concepts from tool execution and response handling

#### Tool Response Architecture Overhaul
- **OutgoingMessage Integration**: CRelay-specific tools now return proper `OutgoingMessage` types directly in their response
- **Generic vs. CRelay Tools**: Clear distinction between generic LLM tools (send-sms) and CRelay-specific tools (send-dtmf, end-call, live-agent-handoff)
- **Type-Driven Routing**: ConversationRelayService routes based on `outgoingMessage.type` instead of generic event types
- **Interface Imports**: CRelay tools import OutgoingMessage interfaces while generic tools remain dependency-free

#### Tool Response Pattern Updates
- **send-dtmf.ts**: Returns `SendDigitsMessage` type with immediate WebSocket delivery
- **end-call.ts**: Returns `EndSessionMessage` type with delayed delivery after OpenAI response
- **live-agent-handoff.ts**: Returns `EndSessionMessage` type with delayed delivery after OpenAI response  
- **send-sms.ts**: Remains generic tool with no OutgoingMessage dependencies

#### Service Architecture Clean-Up
- **OpenAIResponseService**: Completely agnostic about ConversationRelay concepts, passes all tool results generically
- **ConversationRelayService**: Contains all OutgoingMessage knowledge and routing logic based on message types
- **Terminal Message Timing**: Proper sequencing ensures user hears confirmation before call ends for terminal actions

#### Routing Logic Implementation
- **Immediate Delivery**: `sendDigits`, `play`, `language` types sent immediately to WebSocket
- **Delayed Delivery**: `end` type stored and sent after OpenAI response completion (`response.last === true`)
- **Standard Processing**: `text` type and tools without outgoingMessage processed normally by OpenAI
- **Type-Safe Switching**: Comprehensive switch statement handles all OutgoingMessage types appropriately

#### Code Cleanup and Documentation
- **Removed Event Remnants**: Eliminated all remaining references to event emission and "crelay" terminology
- **Updated Documentation**: Changed `@emits` to `@calls` throughout service documentation
- **Interface Cleanup**: Removed obsolete `crelayData` field from ToolResult interface
- **Comment Updates**: Updated all comments to reflect dependency injection patterns instead of event-driven patterns

### Benefits of Tool Type-Driven Architecture

#### Architectural Improvements
- **Pure Dependency Injection**: Complete elimination of event system in favor of direct function calls
- **Type-Safe Routing**: OutgoingMessage types provide compile-time safety for WebSocket message handling
- **Clear Tool Categories**: Explicit separation between generic LLM tools and conversation relay tools
- **Proper Timing Control**: Terminal tools now deliver responses before ending calls

#### Developer Experience
- **Better Type Safety**: OutgoingMessage interfaces provide full IntelliSense and compile-time checking
- **Cleaner Tool Development**: Clear patterns for different tool types with proper interface imports
- **Reduced Complexity**: Eliminated event system complexity in favor of straightforward return value routing
- **Enhanced Debugging**: Type-driven routing makes message flow easier to trace and debug

#### Performance & Reliability
- **Eliminated Event Overhead**: Direct function calls replace event emission for better performance
- **Proper Terminal Timing**: Users now hear confirmation messages before calls end for better UX
- **Reduced Memory Usage**: No event listener registration or cleanup overhead
- **Type Safety**: Compile-time validation prevents runtime routing errors

This migration represents the final step in moving from event-driven to pure dependency injection architecture, providing a clean, type-safe, and maintainable foundation for tool development and message routing.

## Release v4.2.1

### Unified Handler Architecture Refactoring

#### Consolidated Handler Interfaces
- **Unified ResponseHandler**: Replaced 4 individual setter methods (`setContentHandler`, `setToolResultHandler`, `setErrorHandler`, `setCallSidHandler`) with single `createResponseHandler(handler: ResponseHandler)` method
- **Unified ConversationRelayHandler**: Replaced 3 individual setter methods (`setOutgoingMessageHandler`, `setCallSidEventHandler`, `setSilenceEventHandler`) with single `createConversationRelayHandler(handler: ConversationRelayHandler)` method
- **Better Encapsulation**: Handler methods now use clean names like `content()`, `toolResult()`, `error()`, `callSid()` instead of event-style naming

#### Interface Architecture Improvements
- **ResponseHandler Interface**: Created unified interface with `content()`, `toolResult()`, `error()`, and `callSid()` methods
- **ConversationRelayHandler Interface**: Created unified interface with `outgoingMessage()`, `callSid()`, and `silence()` methods
- **Eliminated Circular Dependencies**: Removed circular dependency issues by using `createResponseHandler()` method instead of constructor injection

#### Service Implementation Updates
- **OpenAIResponseService**: Updated to use single `responseHandler` property and `createResponseHandler()` method
- **FlowiseResponseService**: Updated to use unified handler pattern for consistency
- **ConversationRelayService**: Updated to create unified handler objects and use `createConversationRelayHandler()` method
- **Server.ts Integration**: Updated WebSocket server to use unified handler objects instead of individual setter calls

#### Dependency Injection Enhancements
- **Cleaner Constructor Pattern**: Services now accept handlers through create methods rather than multiple setter calls
- **Better Type Safety**: Unified handlers provide stronger type contracts and better IntelliSense support
- **Simplified Service Setup**: Single handler object creation replaces multiple handler registration calls
- **Improved Maintainability**: Related handler methods are now grouped together in single interfaces

### Benefits of Unified Handler Architecture

#### Code Organization
- **Better Cohesion**: All related handler methods grouped in single interface objects
- **Cleaner APIs**: Single `createXxxHandler()` method instead of multiple setters eliminates setup complexity
- **Reduced Coupling**: Handler interfaces are self-contained and don't require multiple method calls

#### Developer Experience
- **Simplified Setup**: Single handler object creation replaces multiple setter method calls
- **Better Type Safety**: Unified interfaces provide comprehensive type checking for all handler methods
- **Enhanced IntelliSense**: IDE support improved with consolidated handler method definitions
- **Cleaner Dependencies**: Clear handler contracts make service relationships more transparent

#### Architectural Benefits
- **Eliminated Circular Dependencies**: `createResponseHandler()` pattern prevents construction-time circular dependency issues
- **Single Responsibility**: Each handler interface focuses on one specific communication domain
- **Better Separation of Concerns**: Clear distinction between different types of handler responsibilities
- **Future Extensibility**: Unified pattern makes it easier to add new handler methods without interface proliferation

This refactoring maintains full backward compatibility while providing a cleaner, more maintainable dependency injection architecture that eliminates multiple setter methods in favor of consolidated handler objects.

## Release v4.2.1 (Previous)

### Handler Type Organization Refactoring

#### Handler Type Relocation
- **Improved Organization**: Moved handler types from centralized `handlers.ts` to their respective interface files for better code organization
- **Enhanced Cohesion**: Handler types are now co-located with the interfaces they support, improving maintainability and discoverability
- **Cleaner Dependencies**: Reduced coupling between interface files by eliminating the central handler types dependency

#### File Structure Changes
- **Removed**: `server/src/types/handlers.ts` - Centralized handler types file eliminated
- **Enhanced**: `server/src/interfaces/ResponseService.d.ts` - Now includes `ContentHandler`, `ToolResultHandler`, and `ErrorHandler` types
- **Enhanced**: `server/src/interfaces/ConversationRelay.d.ts` - Now includes `OutgoingMessageHandler`, `CallSidEventHandler`, and `SilenceEventHandler` types
- **Updated**: All import statements updated to reference handler types from their respective interface files

#### Interface Method Updates
- **Type Safety Enhancement**: Updated interface method signatures to use proper type names instead of inline function types
- **Consistency Improvement**: All service implementations now use strongly-typed handler parameters consistently
- **Better IntelliSense**: Improved IDE support with proper type definitions co-located with interface documentation

#### Import Statement Updates
- **ConversationRelayService**: Updated to import handler types from `../interfaces/ConversationRelay.js`
- **OpenAIResponseService**: Updated to import handler types from `../interfaces/ResponseService.js`  
- **FlowiseResponseService**: Updated to import handler types from `../interfaces/ResponseService.js`
- **Eliminated Unused Imports**: Removed unnecessary import of `ToolResultEvent` in FlowiseResponseService

### Benefits of Handler Type Reorganization

#### Code Organization
- **Better Cohesion**: Handler types are now located next to the interfaces they support
- **Improved Discoverability**: Developers can find all related types and interfaces in a single file
- **Cleaner Architecture**: Eliminates the need for a centralized types file that creates unnecessary dependencies

#### Maintainability
- **Easier Updates**: Changes to handler signatures can be made alongside interface updates
- **Better Documentation**: Handler types benefit from proximity to interface documentation
- **Reduced Coupling**: Interface files are now self-contained with their associated types

#### Developer Experience
- **Enhanced IntelliSense**: IDE can provide better autocomplete and documentation when types and interfaces are co-located
- **Cleaner Imports**: Developers import both interfaces and their handler types from the same location
- **Better Code Navigation**: Related types and interfaces are in the same file for easier navigation

This refactoring maintains full backward compatibility while providing better code organization and improved developer experience through enhanced type locality and reduced coupling between interface files.

## Release v4.2.0

### Dependency Injection Architecture Migration

#### Complete Event-Driven to Dependency Injection Transformation
- **Architectural Paradigm Shift**: Migrated from EventEmitter-based communication to Dependency Injection pattern across all service layers
- **Enhanced Type Safety**: Replaced magic string events with strongly-typed handler functions for compile-time validation
- **Performance Optimization**: Eliminated EventEmitter overhead with direct function calls for faster service communication
- **Improved Testability**: Handler functions enable easier mocking, stubbing, and unit testing compared to event-based testing

#### ResponseService Interface DI Implementation
- **Handler Function Architecture**: Replaced EventEmitter inheritance with handler setter methods:
  - `setContentHandler(handler: ContentHandler): void` - For LLM streaming responses
  - `setToolResultHandler(handler: ToolResultHandler): void` - For tool execution results  
  - `setErrorHandler(handler: ErrorHandler): void` - For error event handling
  - `setCallSidHandler(handler: CallSidEventHandler): void` - For call-specific events
- **Service Implementations**: Updated OpenAIResponseService and FlowiseResponseService to use handler pattern
- **Type-Safe Communication**: Direct handler invocation with `this.contentHandler?.(response)` instead of `this.emit('responseService.content', response)`

#### ConversationRelayService DI Enhancement
- **Handler Integration**: Added support for ResponseService handlers through dependency injection
- **Outgoing Message Management**: Implemented `setOutgoingMessageHandler()` for WebSocket message transmission
- **Silence Event Handling**: Added `setSilenceEventHandler()` for silence detection and call termination events
- **Event Elimination**: Removed all `this.emit()` calls in favor of direct handler invocations

#### Server.ts WebSocket Integration
- **Selective DI Adoption**: Converted ConversationRelayService events to handlers while preserving WebSocket server events
- **Handler Registration**: Replaced `conversationRelaySession.on('conversationRelay.outgoingMessage', ...)` with `conversationRelaySession.setOutgoingMessageHandler(...)`
- **Call SID Event Handling**: Updated dynamic call-specific events to use static handlers with callSid parameters
- **Preserved WebSocket Architecture**: Maintained `ws.on('message')`, `ws.on('close')`, `ws.on('error')` event-driven pattern

#### Type System Enhancements
- **Handler Type Definitions**: Created comprehensive handler type system in `handlers.ts`:
  ```typescript
  export type ContentHandler = (response: ContentResponse) => void;
  export type ToolResultHandler = (toolResult: ToolResultEvent) => void;
  export type ErrorHandler = (error: Error) => void;
  export type CallSidEventHandler = (callSid: string, responseMessage: any) => void;
  export type OutgoingMessageHandler = (message: OutgoingMessage) => void;
  export type SilenceEventHandler = (message: OutgoingMessage) => void;
  ```
- **Interface Updates**: Enhanced ResponseService and ConversationRelay interfaces with handler setter methods
- **Type Safety**: Proper type conversion from `ContentResponse` to `OutgoingMessage` for cross-service communication

#### Resource Management
- **Handler Cleanup**: Implemented proper handler cleanup in service destructors to prevent memory leaks
- **Optional Chaining**: Used `?.()` operator for safe handler invocation when handlers may not be set
- **Service Lifecycle**: Enhanced cleanup methods to clear all handlers and prevent resource leaks

### Benefits of Dependency Injection Architecture

#### Performance Improvements
- **Direct Function Calls**: Eliminated EventEmitter dispatch overhead for faster service communication
- **Reduced Memory Footprint**: No event listener registration and cleanup overhead
- **Optimized Call Stack**: Direct handler invocation without event system intermediation

#### Type Safety & Developer Experience  
- **Compile-Time Validation**: TypeScript enforces correct handler signatures and prevents runtime errors
- **IntelliSense Support**: Full IDE autocompletion and documentation for handler functions
- **Elimination of Magic Strings**: No more `'responseService.content'` strings that can break silently

#### Testing & Maintainability
- **Easier Mocking**: Handler functions are simple to mock compared to complex event listener testing
- **Unit Test Isolation**: Individual handlers can be tested independently without event system complexity
- **Cleaner Dependencies**: Clear handler contracts make service dependencies explicit and manageable

#### Architectural Benefits
- **Single Responsibility**: Each handler focuses on one specific communication channel
- **Interface Segregation**: Services only implement handlers they actually need
- **Dependency Inversion**: Services depend on handler abstractions, not concrete implementations
- **Better Separation of Concerns**: Clear distinction between service logic and communication mechanisms

This migration represents a fundamental architectural improvement providing better performance, type safety, and maintainability while maintaining full functional compatibility with existing WebSocket and HTTP endpoints.

## Release v4.1.2

### Interface Method Splitting

#### ResponseService Interface Enhancement
- **Method Separation**: Split `updateContextAndManifest(contextFile: string, toolManifestFile: string)` into two separate methods:
  - `updateContext(contextFile: string): Promise<void>` - Updates only the context file
  - `updateTools(toolManifestFile: string): Promise<void>` - Updates only the tool manifest file
- **Better Separation of Concerns**: Each method now has a single, clear responsibility
- **Granular Control**: Applications can now update context or tools independently as needed

#### ConversationRelay Interface Enhancement
- **Consistent API**: Applied the same method splitting to the ConversationRelay interface
- **Interface Alignment**: Both ResponseService and ConversationRelay interfaces now have matching method signatures
- **Type Safety**: Updated interface declarations in both interface and class definitions

#### Implementation Updates
- **OpenAIResponseService**: Split the complex `updateContextAndManifest()` implementation into:
  - `updateContext()` - Handles context file loading, instruction updates, and conversation reset
  - `updateTools()` - Handles tool manifest loading and dynamic tool reloading
- **FlowiseResponseService**: Updated stub implementation with separate methods
- **ConversationRelayService**: Replaced single proxy method with two separate proxy methods
- **Server.ts**: Updated call site to use both methods sequentially

#### Factory Method Updates
- **OpenAIResponseService.create()**: Now calls both `updateContext()` and `updateTools()` separately
- **FlowiseResponseService.create()**: Updated to use the new method signatures
- **Backward Compatibility**: All existing functionality is preserved

### Benefits
- **Single Responsibility Principle**: Each method focuses on one specific update operation
- **Improved Flexibility**: Context and tools can be updated independently
- **Better Code Organization**: Clearer separation between context and tool management
- **Enhanced Maintainability**: Easier to test and modify individual components
- **Consistent API Design**: Uniform method signatures across all service interfaces

This refactoring maintains full backward compatibility while providing more granular control over service configuration updates.

## Release v4.1.1

### Service Naming Refactoring

#### OpenAI Service Renaming
- **Service Clarity**: Renamed `OpenAIService` to `OpenAIResponseService` for better clarity and consistency
- **File Renaming**: Updated `OpenAIService.ts` to `OpenAIResponseService.ts` in the services directory
- **Import Updates**: Updated all import statements throughout the codebase to reference the new service name
- **Class References**: Updated all class instantiations and references from `OpenAIService` to `OpenAIResponseService`
- **Logging Updates**: Updated all logging messages to use the new service name for consistency

#### Documentation Updates
- **README.md**: Updated service references and project structure documentation to reflect the new naming
- **CHANGELOG.md**: Added comprehensive release notes for the renaming refactoring
- **Version Bump**: Updated package.json version to 4.1.1

### Benefits
- **Improved Clarity**: The new name better reflects the service's role as a response service implementation
- **Consistent Naming**: Aligns with the service architecture patterns established in previous releases
- **Better Code Readability**: More descriptive class names improve code understanding
- **Maintainability**: Consistent naming conventions across the codebase

This refactoring maintains full backward compatibility while improving code clarity and consistency with established naming patterns.

## Release v4.1.0

### Service Architecture Refactoring

#### ConversationRelayService Enhancement
- **Enhanced Encapsulation**: Moved all OpenAI service creation and management into ConversationRelayService
- **Async Factory Pattern**: Added static `create()` factory method for proper async initialization of ConversationRelayService
- **Proxy Methods**: Added `insertMessage()` and `updateContextAndManifest()` proxy methods for clean API access
- **Event Management**: Improved event forwarding from `responseService.${callSid}` to `conversationRelay.${callSid}`

#### Server.ts Simplification
- **Removed Direct OpenAI Service Creation**: Eliminated lines 146-151 and 155-160 from server.ts 
- **Updated WSSession Interface**: Removed `sessionResponseService` dependency from WebSocket sessions
- **Cleaner Architecture**: Server.ts now focuses purely on WebSocket/HTTP handling without LLM service management
- **Method Migration**: All `sessionResponseService` calls now use `conversationRelaySession` proxy methods
- **Variable Naming Consistency**: Renamed `sessionConversationRelay` to `conversationRelaySession` throughout server.ts for consistent naming conventions

#### Interface Updates
- **Enhanced ResponseService Interface**: Added `updateContextAndManifest()` method to the interface definition
- **Type Safety**: Improved type checking with proper role parameter types for `insertMessage()`
- **Event Consistency**: Standardized event naming from `responseService.${callSid}` to `conversationRelay.${callSid}`

#### Outgoing Message Interface Enforcement
- **Added Twilio Outgoing Message Interfaces**: Implemented comprehensive TypeScript interfaces for all Twilio WebSocket outgoing message types based on official documentation
- **Enhanced Type Safety**: Added `OutgoingMessage` union type covering `TextTokensMessage`, `PlayMediaMessage`, `SendDigitsMessage`, `SwitchLanguageMessage`, and `EndSessionMessage`
- **Method Signature Updates**: Updated `outgoingMessage()` method to accept structured `OutgoingMessage` types instead of generic strings
- **Separation of Concerns**: Clear distinction between `outgoingMessage()` for Twilio commands and `insertMessage()` for conversation context
- **Removed Any Types**: Replaced `any` type annotations with proper `OutgoingMessage` types in WebSocket event handlers

#### Interface Naming Refactoring
- **Resolved Naming Conflicts**: Renamed `ConversationRelayService.d.ts` to `ConversationRelay.d.ts` to eliminate naming conflicts between interface and class
- **Interface Renaming**: Updated interface name from `ConversationRelayService` to `ConversationRelay` for better separation
- **Import Updates**: Updated all import statements to use the new file name and removed unnecessary aliasing (`as IConversationRelayService`)
- **Type Safety Improvements**: Eliminated TypeScript compilation errors caused by naming conflicts

### Benefits
- **Single Responsibility**: ConversationRelayService now manages all LLM service interactions
- **Improved Maintainability**: Clear separation between WebSocket handling and conversation management
- **Better Encapsulation**: All OpenAI service logic contained within a single service class
- **Consistent API**: Uniform access to response service functionality through proxy methods
- **Enhanced Type Safety**: Comprehensive TypeScript interfaces ensure compile-time validation of all Twilio WebSocket messages
- **Better Developer Experience**: IntelliSense support and type checking for all outgoing message structures
- **Cleaner Interface Separation**: Clear distinction between interface definitions and class implementations

This refactoring provides better code organization and maintainability while maintaining full backward compatibility.

## Release v4.0.1

### Bug Fixes

#### Fixed Duplicate Function Call Error
- **Issue**: OpenAI Response API was rejecting requests with "400 Duplicate item found" error after tool execution
- **Root Cause**: The `store: true` parameter caused conflicts between Response API's internal state management and manual `inputMessages` management
- **Solution**: Removed `store: true` and `previous_response_id` from all Response API calls, letting manual conversation state management handle everything
- **Impact**: Tool calls (like SMS) now work correctly with multiple interruptions and follow-up responses

#### Technical Details
- Response API with `store: true` maintains conversation state internally
- Manual function call management in `inputMessages` conflicted with API's stored state
- Removing conversation storage eliminated both "duplicate item" and "no tool output" errors
- System now uses traditional accumulative `inputMessages` approach without API storage conflicts

This fix ensures reliable tool execution in conversation flows with multiple user interactions and interruptions.

## Release v4.0.0

This release introduces a major architectural refactor that fundamentally changes how LLM services are implemented and managed, moving from inheritance-based to interface-based architecture while fixing critical design issues.

### 🚨 Breaking Changes

#### Interface-Based Architecture (Composition over Inheritance)
- **Removed**: `ResponseService.ts` base class - the inheritance-based approach has been completely removed
- **Added**: `ResponseService.d.ts` interface defining the contract for all LLM service implementations
- **Changed**: OpenAIService now implements the ResponseService interface instead of extending a base class
- **Benefits**: Better TypeScript support, cleaner separation of concerns, easier testing and mocking

#### Factory Pattern for Async Initialization
- **Fixed**: Invalid async constructor pattern in OpenAIService
- **Changed**: Constructor is now private and synchronous-only
- **Added**: Static `create()` factory method for proper async initialization
- **Migration**: Replace `new OpenAIService(contextFile, toolManifestFile)` with `await OpenAIService.create(contextFile, toolManifestFile)`

#### Service Removal
- **Removed**: Complete removal of DeepSeek service support
- **Simplified**: System now focuses exclusively on OpenAI integration
- **Environment**: DEEPSEEK_API_KEY and DEEPSEEK_MODEL environment variables are no longer used

#### API Standardization
- **Changed**: Method `insertMessageIntoContext()` renamed to `insertMessage()` for consistency with interface
- **Standardized**: All ResponseService implementations now follow the same method signatures
- **Improved**: Better error handling and type safety across all service methods

### Technical Improvements

#### Enhanced Type Safety
- **Interface Contracts**: All LLM services must implement the ResponseService interface
- **Type Definitions**: Comprehensive TypeScript interfaces for ContentResponse, ToolResult, and ToolResultEvent
- **Event Standardization**: Consistent event emission patterns across all services

#### Import Structure Updates
- **Interface Imports**: Updated from concrete class imports to interface definitions
- **Path Updates**: ConversationRelayService now imports from `../interfaces/ResponseService.js`
- **Cleaner Dependencies**: Better separation between interfaces and implementations

### Migration Guide

#### For OpenAIService Usage:
```typescript
// Before (v3.x)
const service = new OpenAIService(contextFile, toolManifestFile);

// After (v4.0)
const service = await OpenAIService.create(contextFile, toolManifestFile);
```

#### For Custom LLM Providers:
```typescript
// Before (v3.x)
class CustomService extends ResponseService {
  constructor() {
    super();
    // initialization
  }
}

// After (v4.0) - Note: v4.2.0 removes EventEmitter inheritance for pure DI
class CustomService extends EventEmitter implements ResponseService {
  private constructor() {
    super();
    // sync initialization only
  }
  
  static async create(): Promise<CustomService> {
    const service = new CustomService();
    await service.initialize();
    return service;
  }
  
  // Implement all ResponseService interface methods
  async generateResponse(role: 'user' | 'system', prompt: string): Promise<void> { ... }
  async insertMessage(role: 'system' | 'user' | 'assistant', message: string): Promise<void> { ... }
  interrupt(): void { ... }
  cleanup(): void { ... }
}
```

#### For Method Name Updates:
```typescript
// Before (v3.x)
await responseService.insertMessageIntoContext('system', message);

// After (v4.0)
await responseService.insertMessage('system', message);
```

### Architecture Benefits

- **Composition over Inheritance**: More flexible and maintainable design pattern
- **Interface Segregation**: Clear contracts for service implementations
- **Dependency Inversion**: Depend on interfaces, not concrete implementations
- **Better Testing**: Easier to mock and test service interactions
- **Type Safety**: Compile-time checking of service method implementations

This release represents a fundamental improvement in the codebase architecture, providing better maintainability, type safety, and extensibility while removing deprecated service providers.

## Release v3.3.1

### Development & Documentation Updates

- **Updated Development Script**: Changed from `tsc && nodemon` to `tsx watch src/server.ts` for faster development cycles
- **OpenAI Version Upgrade**: Updated OpenAI package version in package.json
- **AbortController Documentation**: Added technical comparison section in README explaining AbortController vs. boolean flag approaches for interrupt handling

## Release v3.3

This release enhances type safety and API alignment by migrating from custom streaming event interfaces to OpenAI's native typed streaming events, providing better maintainability and future-proofing.

### Migration to OpenAI Native Streaming Events

The system has been updated to use OpenAI's native `ResponseStreamEvent` types instead of custom `ResponseAPIEvent` interfaces, bringing several key benefits:

- **Enhanced Type Safety**: Full TypeScript support with OpenAI's official event types
- **Better API Alignment**: Direct use of OpenAI's streaming event specifications
- **Improved Maintainability**: Reduced custom code in favor of official SDK types
- **Future-Proof Architecture**: Automatic compatibility with OpenAI's evolving streaming API

### Key Changes

- **Native Event Types**: Replaced custom `ResponsesAPIEvent` interface with OpenAI's `ResponseStreamEvent` union type
- **Proper Event Handling**: Updated event processing to use correct OpenAI event names (e.g., `response.completed` instead of `response.done`)
- **Type-Safe Streaming**: Full TypeScript support for all streaming events including `ResponseCreatedEvent`, `ResponseTextDeltaEvent`, `ResponseCompletedEvent`, etc.
- **Enhanced Error Detection**: Better error handling through properly typed event structures

### Technical Details

The migration involved:
- Importing `ResponseStreamEvent` from `openai/resources/responses/responses.mjs`
- Removing the custom `ResponsesAPIEvent` interface
- Updating event type checking to use OpenAI's official event type names
- Ensuring proper type safety throughout the streaming pipeline

### Benefits

- **Reduced Maintenance**: No need to maintain custom event interfaces that duplicate OpenAI's functionality
- **Better Documentation**: Direct access to OpenAI's official type documentation
- **Automatic Updates**: Future OpenAI SDK updates will automatically provide new event types
- **Type Safety**: Compile-time checking ensures correct event handling

This change aligns the codebase with OpenAI's official streaming API documentation and provides better long-term maintainability while maintaining full backward compatibility.

## Release v3.2

This release introduces a significant architectural improvement with the migration from the toolType-based system to a ToolEvent-based system, providing enhanced flexibility and cleaner separation of concerns for tool execution.

### Migration to ToolEvent System

The system has been updated to use a ToolEvent-based architecture instead of the previous toolType system, bringing several key benefits:

- **Enhanced Tool Isolation**: Tools now receive a ToolEvent object that provides controlled access to emit events, logging, and error handling
- **Improved Event Management**: Clear separation between tool execution and event emission through the ToolEvent interface
- **Better Error Handling**: Tools can now emit errors and log messages through the ToolEvent system
- **Cleaner Architecture**: Removal of complex toolType switching logic in favor of event-driven communication

### Key Changes

- **ToolEvent Interface**: Tools now receive a ToolEvent object with `emit()`, `log()`, and `logError()` methods
- **Event-Driven Communication**: Tools emit events using `toolEvent.emit(eventType, data)` instead of returning toolType objects
- **Simplified Tool Logic**: Tools focus on their core functionality while delegating communication to the ToolEvent system
- **Enhanced Logging**: Built-in logging capabilities through the ToolEvent interface

### Technical Improvements

- **ResponseService Enhancement**: The `createToolEvent()` method provides tools with a controlled interface for event emission
- **Event Processing**: Tools emit events that are processed by the ResponseService and forwarded to ConversationRelayService
- **Backward Compatibility**: The system maintains compatibility while providing a more robust foundation for tool development
- **Type Safety**: Enhanced TypeScript interfaces for ToolEvent and tool responses

### Tool Implementation Changes

Tools now follow this pattern:

```typescript
export default function (functionArguments: ToolArguments, toolEvent?: ToolEvent): ToolResponse {
    // Tool logic here
    
    if (toolEvent) {
        // Emit events for WebSocket transmission
        toolEvent.emit('crelay', {
            type: "action",
            data: actionData
        });
        toolEvent.log(`Action completed: ${JSON.stringify(actionData)}`);
    }
    
    // Return simple response for conversation context
    return {
        success: true,
        message: "Action completed successfully"
    };
}
```

This migration provides a more maintainable and extensible architecture for tool development while maintaining full backward compatibility.

## Release v3.1

This release introduces a significant architectural improvement with the migration from OpenAI's ChatCompletion API to the Response API, providing enhanced flexibility and future-proofing for LLM integrations.

### Migration to Response API

The system has been updated to use OpenAI's Response API instead of the ChatCompletion API, bringing several key benefits:

- **Enhanced Robustness**: The Response API provides more reliable streaming capabilities and better error handling
- **Improved Flexibility**: Support for additional response formats and processing options  
- **Future-Proof Architecture**: Better alignment with OpenAI's evolving API ecosystem
- **Multi-Provider Support**: Foundation for easier integration of additional LLM providers beyond OpenAI

### Key Changes

- **ResponseService Architecture**: The OpenAIService has been enhanced with a new ResponseService base class that abstracts LLM interactions
- **Unified Interface**: All LLM providers now implement a consistent interface through the ResponseService pattern
- **Enhanced Error Handling**: Improved error detection and recovery mechanisms
- **Streaming Optimization**: Better handling of streaming responses with interrupt capabilities

### Technical Improvements

- Migrated from ChatCompletion API to Response API for all OpenAI interactions
- Implemented ResponseService base class for consistent LLM provider abstraction
- Enhanced streaming response handling with improved interrupt capabilities
- Improved error handling and recovery mechanisms across all LLM interactions
- Maintained full backward compatibility while providing foundation for future enhancements

This migration maintains full backward compatibility while providing a more robust foundation for future enhancements and multi-provider LLM support.

## Release v3.0

- Converted the entire project from JavaScript to TypeScript
- Added type definitions for all components
- Implemented interfaces for data structures
- Added return type declarations
- Enhanced JSDoc comments with TypeScript-specific documentation
- Added tsconfig.json for TypeScript configuration

## Release v2.4

NOTE: - Updated the Voices in the TwilioService.ts file to reflect What is available now as of March 2025. New 11Labs voices are coming soon.

This release introduces a structured tool response system to improve tool integration and response handling:

### Enhanced Tool Response Architecture
- Implemented a standardized response format with `toolType` and `toolData` properties
- Created a type-based routing system for different kinds of tool responses
- Added support for four distinct response types: "tool", "crelay", "error", and "llm"
- Improved separation between conversation flow and direct actions

This architecture enables more flexible tool integration by clearly defining how each tool's response should be processed:
- Standard tools return results to the LLM for conversational responses
- Conversation Relay tools bypass the LLM for direct WebSocket communication
- Error responses are handled gracefully within the conversation context
- Future extensibility is built in with the reserved "llm" type

The new system improves reliability, reduces complexity, and creates a clear separation of concerns between different types of tool operations.

## Release v2.3

This release adds interrupt handling capabilities to improve the conversational experience:

### Interrupt Handling
- Added support for handling user interruptions during AI responses
- Implemented interrupt detection and processing in ConversationRelayService
- Added interrupt() and resetInterrupt() methods to ResponseService for controlling response streaming
- Enhanced streaming response generation to check for interruptions and stop gracefully
- Improved user experience by allowing natural conversation flow with interruptions

When a user interrupts the AI during a response:
1. The system detects the interruption and sends an 'interrupt' message with the partial utterance
2. ConversationRelayService processes this message and calls responseService.interrupt()
3. ResponseService sets an isInterrupted flag that stops the current streaming response
4. The system can then process the user's new input immediately

The interrupt mechanism works by:
- Setting the isInterrupted flag to true in the ResponseService
- Breaking out of the streaming loop in generateResponse
- Allowing the system to process the new user input
- Automatically resetting the interrupt flag at the beginning of each new response generation

This feature enables more natural conversations by allowing users to interrupt lengthy responses, correct misunderstandings immediately, or redirect the conversation without waiting for the AI to finish speaking.

## Release v2.2

This release adds the ability to dynamically update conversation contexts and tool manifests during an active call:

### Dynamic Context & Manifest Updates
- Added new `/updateResponseService` endpoint to change conversation context and tool manifest files during active calls
- Enables real-time switching between different conversation scenarios without ending the call
- Supports seamless transitions between different AI behaviors and tool sets

#### Using the Update Endpoint

To update the context and manifest files for an active call, send a POST request to the `/updateResponseService` endpoint:

```bash
curl -X POST \
  'https://your-server-url/updateResponseService' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "callSid": "CA1234...",           # The active call's SID
    "contextFile": "MyContext.md",     # New context file to load
    "toolManifestFile": "MyToolManifest.json"  # New tool manifest to load
  }'
```

This allows you to:
- Switch conversation contexts mid-call
- Update available tools based on conversation flow
- Adapt AI behavior for different phases of the call
- Maintain call continuity while changing conversation parameters

## Release v2.1

This release brings significant enhancements to the conversation relay system:

### Dynamic Context & Manifest Loading
- Implemented a flexible context loading system that allows switching conversation contexts and tool sets at runtime
- Added support for multiple context files (e.g., defaultContext.md, MyContext.md) to handle different use cases
- Enhanced tool manifest system with dynamic loading capabilities, allowing tools to be loaded based on context
- Environment variables (LLM_CONTEXT, LLM_MANIFEST) now control which context and tools are loaded
- Improved separation of concerns by isolating different conversation scenarios with their own contexts

### Added DeepSeek Response Service
- Integrated DeepSeek as an alternative LLM provider alongside OpenAI
- Implemented DeepSeekService extending the base ResponseService for consistent behavior
- Added configuration support through DEEPSEEK_API_KEY and DEEPSEEK_MODEL environment variables
- Maintains full compatibility with existing tool execution and conversation management features
- Enables easy switching between LLM providers through service configuration

### Added Twilio Status Callback Endpoint
- New `/twilioStatusCallback` endpoint for handling Twilio event notifications
- Real-time status updates are now propagated to the conversation context
- Implemented event-based system to route callbacks to appropriate conversation sessions
- Status updates are automatically inserted into conversation context for LLM awareness
- Enhanced call monitoring and state management through Twilio's callback system
