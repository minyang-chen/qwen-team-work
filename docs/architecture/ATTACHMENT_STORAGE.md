# NFS-Based Attachment Storage Implementation

## Overview

Implemented persistent file attachment storage using **NFS + MongoDB references** (Option 3) for conversation attachments in the team-web chat interface.

## Architecture

```
User uploads file → team-web → team-storage API → NFS storage
                                      ↓
                              MongoDB reference saved
                                      ↓
                              URL returned to client
                                      ↓
                              Displayed in chat + sent to AI
```

## Implementation Details

### 1. Storage API (team-storage)

**File**: `packages/team-storage/src/routes/attachments.ts`

**Endpoints**:
- `POST /api/attachments/upload` - Upload files to NFS
- `GET /api/attachments/:userId/:sessionId/:filename` - Retrieve files
- `DELETE /api/attachments/:userId/:sessionId/:filename` - Delete files
- `GET /api/attachments/:userId/:sessionId` - List all attachments

**NFS Structure**:
```
/nfs-data/individual/{userId}/attachments/{sessionId}/
├── {fileId1}.jpg
├── {fileId2}.json
└── {fileId3}.pdf
```

**Features**:
- 50MB file size limit
- Supports up to 10 files per upload
- Automatic directory creation
- Content-type detection
- 1-year cache headers for performance

### 2. MongoDB Schema Update

**File**: `packages/team-storage/src/models/UnifiedModels.ts`

**Attachment Schema**:
```typescript
attachments: [{
  id: String,          // Unique file ID
  name: String,        // Original filename
  filename: String,    // Stored filename
  type: String,        // 'image' | 'video' | 'audio' | 'document'
  mimeType: String,    // MIME type
  size: Number,        // File size in bytes
  path: String,        // NFS file path
  url: String          // API URL to retrieve file
}]
```

### 3. Frontend Integration (team-web)

**File**: `packages/team-web/src/pages/team/TaskAgent.tsx`

**Upload Flow**:
1. User selects files via file input
2. Files displayed in preview area
3. On send, files uploaded to storage API first
4. API returns attachment references with URLs
5. Message sent with attachment URLs
6. Attachments displayed in chat bubble

**Text File Handling**:
- JSON, TXT, MD, JS, TS, TSX, JSX files have content extracted
- Content appended to AI message for analysis
- AI can read and analyze file contents

**Image Display**:
- Default size: small (320px)
- Click to toggle between small and full size
- Hover effect indicates clickability

## Benefits

### ✅ Persistence
- Files survive page refresh
- Available when loading old conversations
- Stored permanently in user's NFS workspace

### ✅ Scalability
- No MongoDB document size limits
- Can handle large files (up to 50MB)
- Efficient file serving with caching

### ✅ Organization
- Files organized per conversation
- Easy to locate and manage
- Automatic cleanup when conversation deleted

### ✅ Performance
- Files served directly from NFS
- 1-year cache headers reduce bandwidth
- Streaming support for large files

## Usage Example

### Upload and Send
```typescript
// User uploads image.jpg and types "Describe this image"
// 1. File uploaded to NFS
POST /api/attachments/upload
Body: FormData with files, userId, sessionId

// 2. Response with URL
{
  attachments: [{
    id: "abc123",
    name: "image.jpg",
    url: "/api/attachments/user-456/session-789/abc123.jpg",
    type: "image",
    size: 245678
  }]
}

// 3. Message sent with attachment reference
socket.emit('ai_chat', {
  message: "Describe this image",
  userId: "user-456",
  sessionId: "session-789"
});

// 4. Message stored in MongoDB with attachment
{
  role: "user",
  content: "Describe this image",
  attachments: [{
    url: "http://localhost:8000/api/attachments/user-456/session-789/abc123.jpg",
    name: "image.jpg",
    type: "image"
  }]
}
```

### Retrieve Later
```typescript
// Load conversation from MongoDB
GET /api/conversations/session-789

// Response includes attachment URLs
{
  messages: [{
    role: "user",
    content: "Describe this image",
    attachments: [{
      url: "http://localhost:8000/api/attachments/user-456/session-789/abc123.jpg"
    }]
  }]
}

// Browser fetches image
GET /api/attachments/user-456/session-789/abc123.jpg
// Returns image with proper content-type and caching
```

## File Type Support

### Images
- JPG, JPEG, PNG, GIF, WebP, SVG
- Displayed inline in chat
- Click to toggle size

### Documents
- PDF, TXT, MD, JSON
- Text files: content extracted and sent to AI
- PDF: link to download

### Code Files
- JS, TS, TSX, JSX, HTML, CSS
- Content extracted and sent to AI for analysis
- Syntax highlighting in chat

### Media
- MP4, WebM (video)
- MP3, WAV (audio)
- Inline player in chat

## Security Considerations

### ✅ Implemented
- User isolation: files stored per userId
- Session isolation: files organized per sessionId
- Authentication required for all endpoints
- File size limits (50MB)
- File count limits (10 per upload)

### 🔒 Future Enhancements
- Virus scanning for uploaded files
- Content-type validation
- Rate limiting per user
- Automatic cleanup of old attachments
- Encryption at rest

## Configuration

### Environment Variables
```bash
# NFS base path
NFS_BASE_PATH=../../infrastructure/nfs-data

# File size limit (bytes)
MAX_FILE_SIZE=52428800  # 50MB

# Max files per upload
MAX_FILES_PER_UPLOAD=10
```

## Testing

### Manual Test Steps
1. Start team-storage: `cd packages/team-storage && npm start`
2. Start team-web: `cd packages/team-web && npm run dev`
3. Login to team workspace
4. Upload a JSON file with prompt "Summarize this file"
5. Verify:
   - File appears in chat bubble
   - AI reads and summarizes content
   - Refresh page and load conversation
   - File still displays correctly

### Expected Results
- ✅ File uploads successfully
- ✅ File displays in chat
- ✅ AI can read text file contents
- ✅ File persists after page refresh
- ✅ File accessible from conversation history

## Files Modified

1. `packages/team-storage/src/routes/attachments.ts` - New file
2. `packages/team-storage/src/routes/index.ts` - Added attachment routes
3. `packages/team-storage/src/models/UnifiedModels.ts` - Updated attachment schema
4. `packages/team-web/src/pages/team/TaskAgent.tsx` - Upload integration

## Related Documentation

- [User Session Management](./USER_SESSION_MANAGEMENT.md)
- [Communication Protocols](./COMMUNICATION_PROTOCOLS.md)
- [Execution Flow Examples](./EXECUTION_FLOW_EXAMPLES.md)
