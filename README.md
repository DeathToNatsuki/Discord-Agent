# Discord Agent

An AI-powered application for intelligently managing Discord direct message conversations.

No Electron. No complex native dependencies. Opens as a clean frameless app window using your existing Chrome or Edge browser.

---

## Quick Start

**Requirements:** Node.js 18+ and Chrome or Edge (already on every Windows 10/11 machine)

### First time setup

```
Double-click: setup.bat
```

### Launch the app

```
Double-click: Discord Agent.bat
```

Or from a terminal:
```
npm start
```

The app opens automatically in a frameless window that looks and feels native.

---

## How it works

Instead of bundling a full browser engine (Electron = ~200MB), Discord Agent starts a local Vite server and launches your existing Chrome or Edge using `--app` mode. This gives you:

- A frameless window with no browser address bar or toolbar
- Custom titlebar with working minimize / maximize / close
- Drag-to-move the window by the titlebar
- Double-click titlebar to maximize/restore
- Zero extra downloads — Chrome/Edge are already on your machine

---

## Features

- **7 AI providers** — Claude, ChatGPT, Gemini, OpenRouter, Ollama, LM Studio, Custom
- **Discord DM integration** — browse and respond to direct messages
- **Approval workflow** — review, edit, or reject every AI draft before it sends
- **Per-conversation config** — custom personas, response modes, trigger rules
- **Persistent memory** — AI notes that improve responses over time
- **Local model library** — Ollama model browser with hardware compatibility
- **Dark / light theme** — instant smooth switching

---

## AI Providers

| Provider | Requires |
|---|---|
| Claude | API key from console.anthropic.com |
| ChatGPT / OpenAI | API key from platform.openai.com |
| Gemini | API key from aistudio.google.com |
| OpenRouter | API key from openrouter.ai |
| Ollama | Ollama installed locally (ollama.com) |
| LM Studio | LM Studio running with server enabled |
| Custom | Any OpenAI-compatible endpoint |

---

## Discord Token

1. Open Discord in your browser (discord.com/app)
2. Press F12 to open DevTools
3. Go to Network tab
4. Send any message
5. Click the request named `messages`
6. Find `authorization` in the request headers
7. Copy that value into Discord Agent

Your token is stored locally only — never sent anywhere except Discord's API.

---

## Disclaimer

Using a Discord user token (self-bot) may violate Discord's Terms of Service. You are responsible for your own compliance. This software is for educational and personal use only.
