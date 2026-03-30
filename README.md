# 💬 ChatWave — Real-Time Chat Application

A full-stack WhatsApp-style real-time chat application built with React, Node.js, Socket.IO, and Supabase.

---

## 🗂️ Project Structure

```
chatapp/
├── backend/                    # Node.js + Express + Socket.IO
│   ├── controllers/
│   │   ├── messageController.js
│   │   └── userController.js
│   ├── routes/
│   │   ├── messageRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   └── supabaseClient.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/                   # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── WelcomeScreen.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── chatStore.js      (Zustand)
│   │   ├── hooks/
│   │   │   ├── useChat.js
│   │   │   └── useSocket.js
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── SignupPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabaseClient.js
│   │   ├── socket/
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── supabase_schema.sql         # Run this in Supabase SQL Editor
```

---

## 🚀 Step-by-Step Setup Guide

### Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project** and fill in the details
3. Wait ~2 minutes for the project to spin up
4. Go to **Settings → API** and copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon / public** key
   - **service_role / secret** key (keep this private!)

### Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor → New query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** (or press `Ctrl+Enter`)
4. You should see "Success. No rows returned."

This creates:
- `users` table with RLS policies
- `messages` table with RLS policies  
- A trigger that auto-creates a user profile on signup

### Step 3 — Configure Supabase Auth

1. Go to **Authentication → Providers → Email**
2. Make sure **Email** provider is enabled
3. (Optional) Disable "Confirm email" for easier local testing:
   - Go to **Authentication → Settings**
   - Toggle off **"Enable email confirmations"**

### Step 4 — Set Up Backend

```bash
cd chatapp/backend

# Copy and fill in environment variables
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CLIENT_URL=http://localhost:5173
```

> ⚠️ Use the **service_role** key for the backend (not the anon key). It bypasses RLS.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The backend should start on `http://localhost:5000`.

### Step 5 — Set Up Frontend

```bash
cd chatapp/frontend

# Copy and fill in environment variables
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_BACKEND_URL=http://localhost:5000
```

> ✅ Use the **anon** key for the frontend.

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend should open at `http://localhost:5173`.

---

## ✅ Quick Start Checklist

- [ ] Supabase project created
- [ ] `supabase_schema.sql` executed
- [ ] Email confirmations disabled (for local dev)
- [ ] `backend/.env` filled with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL`
- [ ] `frontend/.env` filled with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`
- [ ] `npm install` run in both `backend/` and `frontend/`
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Open two browser tabs, sign up two users, and chat!

---

## 🔥 Features

| Feature | Status |
|---|---|
| Email/password signup & login | ✅ |
| Auto-login (session persistence) | ✅ |
| Real-time messaging via Socket.IO | ✅ |
| Chat history loaded from Supabase | ✅ |
| Online/offline presence indicators | ✅ |
| Typing indicator ("User is typing...") | ✅ |
| Unread message badge counter | ✅ |
| Message timestamps | ✅ |
| Read receipts (single/double ticks) | ✅ |
| Emoji picker | ✅ |
| Dark mode toggle | ✅ |
| User search | ✅ |
| Date dividers in chat (Today, Yesterday) | ✅ |
| Scroll to latest message | ✅ |
| Responsive design | ✅ |

---

## 🔌 Socket.IO Events Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user_online` | `userId: string` | Register user as online |
| `send_message` | `{ sender_id, receiver_id, content }` | Send a message |
| `typing` | `{ sender_id, receiver_id }` | User started typing |
| `stop_typing` | `{ sender_id, receiver_id }` | User stopped typing |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `receive_message` | `Message object` | New message received |
| `online_users` | `string[]` | Updated list of online user IDs |
| `typing` | `{ sender_id }` | Someone is typing |
| `stop_typing` | `{ sender_id }` | Someone stopped typing |
| `message_error` | `{ error: string }` | Message send failed |

---

## 🗄️ REST API Reference

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users?search=&exclude=` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users/upsert` | Create or update profile |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:userId1/:userId2` | Get chat history |
| GET | `/api/messages/conversations/:userId` | Get conversation list |
| PATCH | `/api/messages/read` | Mark messages as read |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State management | Zustand |
| Routing | React Router v6 |
| Real-time | Socket.IO client |
| HTTP client | Axios |
| Backend | Node.js + Express |
| WebSockets | Socket.IO server |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Date formatting | date-fns |
| Emoji | emoji-picker-react |

---

## 🚢 Production Deployment

### Backend (Railway / Render / Fly.io)
1. Push to GitHub
2. Connect repo to Railway/Render
3. Set environment variables in the platform dashboard
4. Deploy

### Frontend (Vercel / Netlify)
1. Push to GitHub
2. Import project to Vercel
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`
4. Deploy

> Update `CLIENT_URL` in backend `.env` to your deployed frontend URL, and `VITE_BACKEND_URL` to your deployed backend URL.

---

## 🐛 Common Issues

**"Missing Supabase environment variables"**
→ Make sure both `.env` files are created and filled in.

**Messages not appearing in real-time**
→ Check that the backend is running and `VITE_BACKEND_URL` points to the correct port.

**"User not found" after signup**
→ Make sure the `on_auth_user_created` trigger was created by running `supabase_schema.sql`.

**CORS errors**
→ Make sure `CLIENT_URL` in `backend/.env` matches the frontend URL exactly (including port).

**Email confirmation error**
→ Disable "Enable email confirmations" in Supabase Auth settings for local development.
