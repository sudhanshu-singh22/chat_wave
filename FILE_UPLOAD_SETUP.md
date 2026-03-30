# 📁 File Upload Feature - Setup Guide

## ✅ What's Implemented

Your chat app now supports **file sending**! Users can:
- ✓ Upload images, documents, videos, audio files
- ✓ Send text + file together
- ✓ Download files from messages
- ✓ Preview images inline

## 🚀 Setup Steps

### Step 1: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Storage** (left sidebar)
3. Click **Create new bucket**
4. Name it: `chat-files`
5. Make it **PUBLIC**
6. Click Create

### Step 2: Update Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query** 
3. Run this migration to update messages table:

```sql
-- Add file columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Update content column to be nullable
ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

-- Add constraint: must have content OR file
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS message_content_or_file,
  ADD CONSTRAINT message_content_or_file
  CHECK ((content IS NOT NULL AND CHAR_LENGTH(TRIM(content)) > 0) OR file_url IS NOT NULL);
```

### Step 3: Install Dependencies

Backend already has multer installed. If you need to reinstall:
```bash
cd backend
npm install multer
```

### Step 4: Restart Backend & Test

```bash
cd backend
npm start
```

## 🎯 How to Use

### Frontend User Flow:
1. Open a chat
2. Click the **+** icon (paperclip/attachment button)
3. Select a file
4. File uploads automatically
5. Optionally add text message
6. Click send

### File Display:
- **Images**: Show preview in chat
- **Other files**: Show download link with file size
- **File info**: Icon + name + size (KB/MB)

## 📊 Features

| Feature | Support |
|---------|---------|
| Max file size | 50MB |
| Image preview | ✓ Images |
| Video files | ✓ (download link) |
| Audio files | ✓ (download link) |
| Documents (PDF, Word) | ✓ (download link) |
| Blocked files | .exe, .bat, .cmd, .sh, .app, .dmg |

## 🔧 API Endpoints

### File Upload
- **POST** `/api/upload`
- Required: `file` (FormData), `userId`
- Returns: `{ file_url, file_name, file_type, file_size }`

### Send Message with File
- **Socket Event**: `send_message`
- Payload:
```json
{
  "sender_id": "uuid",
  "receiver_id": "uuid",
  "content": "optional text",
  "file_url": "https://...",
  "file_name": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000
}
```

## 📁 File Structure

```
backend/
  controllers/
    fileController.js (NEW) - Upload handler
  routes/
    fileRoutes.js (NEW) - POST /api/upload

frontend/
  src/
    components/
      FileUploader.jsx (NEW) - File selection UI
      ChatWindow.jsx (UPDATED) - Added file button
      MessageBubble.jsx (UPDATED) - Show files
    hooks/
      useChat.js (UPDATED) - sendFile()
    services/
      api.js (UPDATED) - uploadFile()
```

## ❓ Troubleshooting

**Issue: "Failed to upload file"**
- Check Supabase Storage bucket exists and is PUBLIC
- Verify `VITE_BACKEND_URL` in .env

**Issue: File uploads but doesn't appear**
- Ensure WebSocket connection is active
- Check browser console for errors

**Issue: Large files fail**
- Max is 50MB
- Check network timeout settings

## 🎉 Done!

Your file upload feature is ready. Users can now share files in real-time!
