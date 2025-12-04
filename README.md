# Solva - AI UI Generator

A prompt-to-UI application that converts natural language descriptions into beautiful, production-ready web interfaces.

![Solva](https://img.shields.io/badge/AI-Powered-blue) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

## Features

- 🎨 **Natural Language UI Generation** - Describe what you want, get code
- 💬 **Iterative Refinement** - Chat to modify and improve your designs
- 👁️ **Live Preview** - See your UI rendered in real-time
- 📝 **Code View** - View and copy the generated HTML, CSS, and JavaScript
- 📊 **Token Tracking** - Monitor API usage and costs
- 💾 **Conversation Persistence** - Your chat history is saved locally

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Describe your UI** - Type a description like "Create a modern login form with email and password fields"
2. **View the preview** - See your generated UI in the preview panel
3. **Iterate** - Ask for changes like "Make the button blue" or "Add a forgot password link"
4. **Copy the code** - Switch to Code view to see and copy the generated HTML, CSS, and JS

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **State**: React Context + localStorage

## Project Structure

```
src/
├── components/
│   ├── chat/          # Chat interface components
│   ├── preview/       # Preview panel components
│   ├── layout/        # Layout components
│   └── ui/            # Reusable UI components
├── context/           # React context for state management
├── hooks/             # Custom React hooks
├── services/          # API and utility services
│   ├── openai/        # OpenAI API client
│   └── tokenTracker/  # Token usage tracking
├── types/             # TypeScript type definitions
└── utils/             # Utility functions and constants
```

## Configuration

### Model Selection

Edit `src/utils/constants.ts` to change the AI model:

```typescript
export const MODEL_CONFIG = {
  name: 'gpt-4o-mini', // or 'gpt-4o', 'gpt-5-mini' when available
  maxTokens: 4096,
  temperature: 0.7,
};
```

### Token Costs

Token costs are defined in `src/services/tokenTracker/costs.ts` and can be updated as pricing changes.

## Security Note

⚠️ This application runs entirely in the browser, which means your API key is exposed in the client-side code. This is acceptable for:

- Local development
- Personal use

**Do not deploy this to a public server** without adding a backend proxy to protect your API key.

## License

MIT


