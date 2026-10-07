# UniNest

UniNest is a college community web app built with **React 18, Vite, React Router, Tailwind CSS, and Supabase**.

It includes a floating **Little Help** AI assistant powered by **NVIDIA Nemotron 3.5 Lightning through OpenRouter**.

---

##  Features

- College community dashboard
- Student directory
- Events
- Authentication/demo accounts
- Social/community features
- Supabase integration
- **Little Help AI chatbot** in the bottom-right corner
- Responsive chatbot UI

---

##  Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Tailwind CSS

### Backend

- Node.js
- Express-style API server
- OpenRouter API

### AI

- NVIDIA Nemotron 3.5 Lightning
- OpenRouter

### Database

- Supabase

---

#  Installation

## 1. Clone or extract the project

Open the UniNest project folder in VS Code.

## 2. Install dependencies

Open the terminal in the project root and run:

```bash
npm install
```

---

#  Little Help AI Setup

Little Help uses OpenRouter to communicate with NVIDIA Nemotron 3.5 Lightning.

The architecture is:

```text
React Frontend
      ↓
Little Help Chatbot
      ↓
/api/chat
      ↓
Node.js Backend
      ↓
OpenRouter API
      ↓
NVIDIA Nemotron 3.5 Lightning
```

The OpenRouter API key is kept on the server and is **not exposed to the browser**.

---

## 3. Create an OpenRouter API key

Create an API key from OpenRouter:

https://openrouter.ai/keys

Use the model:

```text
nvidia/nemotron-3.5-lightning:free
```

**Never commit your API key to GitHub or put it inside React/Vite frontend code.**

---

## 4. Create the `.env` file

In the root of the project, create:

```text
.env
```

Add:

```env
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
CHAT_PORT=3001
APP_URL=http://localhost:5173
```

Replace `YOUR_OPENROUTER_API_KEY` with your actual key.

The `.env` file is ignored by Git.

---

#  Running UniNest

You need to run both the frontend and AI backend.

## Option A — Run separately

### Terminal 1: AI backend

```bash
npm run server
```

Expected output:

```text
Little Help API running at http://localhost:3001
```

### Terminal 2: React frontend

```bash
npm run dev
```

Open the URL shown by Vite, normally:

```text
http://localhost:5173
```

---

## Option B — Run both together

You can also run:

```bash
npm run dev:all
```

This starts the backend and frontend together.

If your operating system has issues with the combined command, use Option A.

---

#  Using Little Help

After the website loads, look at the **bottom-right corner**.

Click the chat button to open Little Help.

Example questions:

```text
What is UniNest?
```

```text
How can I find a project partner?
```

```text
What can I do on UniNest?
```

```text
How does the student directory work?
```

The chatbot sends the question to your local backend at:

```text
POST /api/chat
```

The Vite development server proxies `/api` requests to:

```text
http://localhost:3001
```

---

#  Important Files

```text
UniNest-main/
│
├── server/
│   └── server.js              # OpenRouter backend
│
├── src/
│   ├── components/
│   │   ├── LittleHelp.jsx     # Chatbot component
│   │   └── LittleHelp.css     # Chatbot styling
│   │
│   ├── App.jsx                # Main application
│   ├── auth.jsx               # Authentication/demo auth
│   ├── data.js                # Application data
│   ├── index.css              # Global styles
│   ├── main.jsx               # React entry point
│   └── social.jsx              # Social/community logic
│
├── .env                       # Local secrets - do not commit
├── .env.example               # Environment variable template
├── package.json               # Scripts and dependencies
├── vite.config.js             # Vite configuration and API proxy
└── tailwind.config.js         # Tailwind configuration
```

---

#  Security

**Never put the OpenRouter key in:**

```text
src/App.jsx
src/components/LittleHelp.jsx
index.html
VITE_OPENROUTER_API_KEY
```

The correct location is:

```text
.env
```

and it should be read only by the backend.

If you accidentally publish your API key to GitHub, revoke it immediately and create a new one.

---

#  Troubleshooting

## Chatbot says it cannot connect

Make sure the backend is running:

```bash
npm run server
```

You should see:

```text
Little Help API running at http://localhost:3001
```

Then refresh the website.

---

## OpenRouter authentication error

Check `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
```

Make sure:

- The key is valid.
- There are no quotation marks around the key unless required.
- There are no extra spaces.
- You restarted the backend after changing `.env`.

---

## `OPENROUTER_API_KEY` is undefined

Stop the backend and restart it:

```bash
Ctrl + C
npm run server
```

The `.env` file must be in the **project root**, next to `package.json`.

---

## Port 3001 is already in use

Change the port in `.env`:

```env
CHAT_PORT=3002
```

Then update the Vite proxy target in `vite.config.js` to match.

---

## Chatbot does not appear

Check that `LittleHelp` is imported and rendered in `src/App.jsx`.

It should contain:

```jsx
import LittleHelp from './components/LittleHelp';
```

and:

```jsx
<LittleHelp />
```

---

#  How Little Help Works

Little Help currently acts as a UniNest-focused AI assistant.

It receives a user message, sends it to the backend, and the backend sends it to OpenRouter.

```text
User
 ↓
Little Help UI
 ↓
/api/chat
 ↓
server/server.js
 ↓
OpenRouter
 ↓
Nemotron 3.5 Lightning
 ↓
AI response
 ↓
Little Help UI
```

The current version does **not** automatically expose private Supabase/student data to the AI model.

For future development, Supabase can be connected through controlled backend tools so that Little Help can search approved UniNest data.

---

#  Production Deployment

Before deploying:

1. Add `OPENROUTER_API_KEY` as a server-side environment variable on your hosting provider.
2. Do not expose the key as a `VITE_*` variable.
3. Update the frontend API URL/proxy for your production backend.
4. Enable HTTPS.
5. Restrict CORS to your production UniNest domain.
6. Add rate limiting to `/api/chat`.
7. Do not send confidential student information to the free OpenRouter model.

---

#  Available Scripts

```bash
npm run dev
```

Starts the Vite frontend.

```bash
npm run server
```

Starts the Little Help backend.

```bash
npm run dev:all
```

Starts both frontend and backend.

```bash
npm run build
```

Creates the production frontend build.

```bash
npm run preview
```

Previews the production frontend build locally.

---

#  Development

When modifying Little Help:

### Chat UI

Edit:

```text
src/components/LittleHelp.jsx
src/components/LittleHelp.css
```

### AI behavior

Edit the system prompt in:

```text
server/server.js
```

### API configuration

Edit:

```text
.env
vite.config.js
```

---

#  Future Improvements

Planned improvements for Little Help:

- Supabase-powered student search
- Search study notes
- Project partner recommendations
- Lost & Found search
- Context-aware UniNest navigation
- Suggested questions
- Conversation history
- Authentication-aware responses
- Rate limiting
- Better error handling
- Streaming AI responses

---

## License

This project is intended for the UniNest project/demo.
