# API Reference

Complete API documentation for the Conversation Relay IVR Replacement system.

## Base URL

```
http://localhost:3001
```

For production, replace with your deployed server URL.

## Authentication

Currently, the API does not require authentication. For production deployments, implement appropriate authentication mechanisms (API keys, OAuth, etc.).

---

## IVR Mapping Endpoints

### POST /mapIvr

Initiates an IVR mapping job to explore and document a phone tree system.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "phoneNumber": "+1234567890",
  "openAiKey": "sk-..." // Optional: Override default OpenAI key
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phoneNumber` | string | Yes | Phone number to map in E.164 format (+1234567890) |
| `openAiKey` | string | No | Custom OpenAI API key for this job |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "IVR mapping job started",
  "phoneNumber": "+1234567890"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Phone number is required"
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to initiate IVR mapping: <error details>"
}
```

#### Example

```bash
curl -X POST http://localhost:3001/mapIvr \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

---

### GET /mapIvr/:jobId

Retrieves the status and results of an IVR mapping job.

#### Request

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | string | Yes | Job ID returned from POST /mapIvr |

#### Response

**Success - In Progress (200 OK):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in-progress",
  "phoneNumber": "+1234567890",
  "currentStep": 4,
  "totalSteps": 8,
  "progress": "50%",
  "startTime": "2026-02-10T10:30:00Z"
}
```

**Success - Completed (200 OK):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "phoneNumber": "+1234567890",
  "startTime": "2026-02-10T10:30:00Z",
  "endTime": "2026-02-10T10:35:00Z",
  "duration": "5 minutes",
  "result": {
    "totalLegs": 12,
    "exploredPaths": 8,
    "terminalNodes": 4,
    "legs": [
      {
        "legNumber": 1,
        "description": "Main menu",
        "options": ["Press 1 for Sales", "Press 2 for Support"],
        "selectedOption": "2"
      }
    ],
    "dataFile": "/data/ivr/legs/+1234567890.json"
  }
}
```

**Success - Failed (200 OK):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "phoneNumber": "+1234567890",
  "startTime": "2026-02-10T10:30:00Z",
  "endTime": "2026-02-10T10:32:00Z",
  "error": "Call failed: No answer"
}
```

**Error - Job Not Found (404 Not Found):**
```json
{
  "success": false,
  "error": "Job not found"
}
```

#### Example

```bash
curl http://localhost:3001/mapIvr/550e8400-e29b-41d4-a716-446655440000
```

---

## IVR Tools API

These tools are used internally by the LLM during IVR exploration via OpenAI function calling.

### read_legs

Reads previously documented IVR paths from storage.

#### Function Signature

```json
{
  "name": "read_legs",
  "description": "Reads documented IVR leg data for a phone number",
  "parameters": {
    "type": "object",
    "properties": {
      "phoneNumber": {
        "type": "string",
        "description": "Phone number in E.164 format"
      }
    },
    "required": ["phoneNumber"]
  }
}
```

#### Response

```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "legs": [
    {
      "legNumber": 1,
      "timestamp": "2026-02-10T10:30:00Z",
      "description": "Main menu",
      "options": ["Press 1 for Sales", "Press 2 for Support"],
      "selectedOption": "2"
    }
  ],
  "message": "Found 12 legs for phone number +1234567890"
}
```

### write_legs

Documents IVR menu steps and navigation paths.

#### Function Signature

```json
{
  "name": "write_legs",
  "description": "Documents an IVR leg (menu step)",
  "parameters": {
    "type": "object",
    "properties": {
      "phoneNumber": {
        "type": "string",
        "description": "Phone number in E.164 format"
      },
      "legNumber": {
        "type": "number",
        "description": "Sequential leg number"
      },
      "description": {
        "type": "string",
        "description": "Description of this menu/leg"
      },
      "options": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Available menu options"
      },
      "selectedOption": {
        "type": "string",
        "description": "The option selected for navigation"
      }
    },
    "required": ["phoneNumber", "legNumber", "description", "options"]
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Leg 1 documented successfully for +1234567890"
}
```

---

## Conversation Relay Endpoints

These endpoints are inherited from the base Conversation Relay v4.0 platform.

### POST /connectConversationRelay

TwiML endpoint for incoming calls (configured in Twilio console).

### WebSocket /conversation-relay

WebSocket endpoint for Conversation Relay communication.

### POST /outboundCall

Initiates an outbound call using Conversation Relay.

See [upstream documentation](https://github.com/deshartman/simple-conversation-relay) for details on base platform endpoints.

---

## Data Models

### JobState

```typescript
interface JobState {
  jobId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  phoneNumber: string;
  callSid?: string;
  currentStep: number;
  totalSteps: number;
  exploredPaths: string[];
  startTime: Date;
  endTime?: Date;
  result?: IvrMapResult;
  error?: string;
}
```

### IvrMapResult

```typescript
interface IvrMapResult {
  totalLegs: number;
  exploredPaths: number;
  terminalNodes: number;
  legs: IvrLeg[];
  dataFile: string;
}
```

### IvrLeg

```typescript
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

### IvrLegData (Storage Format)

```typescript
interface IvrLegData {
  phoneNumber: string;
  lastUpdated: string;
  legs: IvrLeg[];
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found (e.g., job ID) |
| 500 | Internal Server Error | Server error during processing |

---

## Rate Limiting

Currently, no rate limiting is implemented. For production:

- Implement rate limiting per IP/API key
- Recommended: 10 requests per minute for `/mapIvr`
- Recommended: 60 requests per minute for `/mapIvr/:jobId`

---

## Webhooks (Future Enhancement)

Future versions may support webhooks for job completion notifications:

```json
POST <your-webhook-url>
{
  "event": "job.completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": { /* IvrMapResult */ }
}
```

---

## Pagination (Future Enhancement)

For large IVR maps, pagination may be added:

```
GET /mapIvr/:jobId/legs?page=1&limit=10
```

---

## SDK Examples

### Node.js

```javascript
const axios = require('axios');

// Start IVR mapping
async function mapIvr(phoneNumber) {
  const response = await axios.post('http://localhost:3001/mapIvr', {
    phoneNumber: phoneNumber
  });
  return response.data.jobId;
}

// Check job status
async function getJobStatus(jobId) {
  const response = await axios.get(`http://localhost:3001/mapIvr/${jobId}`);
  return response.data;
}

// Usage
(async () => {
  const jobId = await mapIvr('+1234567890');
  console.log('Job started:', jobId);
  
  // Poll for completion
  let status = 'in-progress';
  while (status === 'in-progress') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    const result = await getJobStatus(jobId);
    status = result.status;
    console.log('Status:', status);
  }
  
  console.log('Final result:', await getJobStatus(jobId));
})();
```

### Python

```python
import requests
import time

def map_ivr(phone_number):
    response = requests.post('http://localhost:3001/mapIvr', json={
        'phoneNumber': phone_number
    })
    return response.json()['jobId']

def get_job_status(job_id):
    response = requests.get(f'http://localhost:3001/mapIvr/{job_id}')
    return response.json()

# Usage
job_id = map_ivr('+1234567890')
print(f'Job started: {job_id}')

# Poll for completion
status = 'in-progress'
while status == 'in-progress':
    time.sleep(5)
    result = get_job_status(job_id)
    status = result['status']
    print(f'Status: {status}')

print(f'Final result: {get_job_status(job_id)}')
```

---

## Testing

### Postman Collection

Import this collection for testing:

```json
{
  "info": {
    "name": "IVR Replacement API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Start IVR Mapping",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/mapIvr",
        "body": {
          "mode": "raw",
          "raw": "{\"phoneNumber\": \"+1234567890\"}"
        }
      }
    },
    {
      "name": "Get Job Status",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/mapIvr/{{jobId}}"
      }
    }
  ]
}
```

---

## Support

For API-related questions or issues:
- Open an issue: https://github.com/deshartman/crelay-ivr-replacement/issues
- Check documentation: https://github.com/deshartman/crelay-ivr-replacement/docs
