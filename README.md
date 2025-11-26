# D&D AI Game Master

An interactive Dungeons & Dragons game powered by AI, where the LLM serves as your Game Master. Create characters, embark on adventures, and experience dynamic storytelling with real-time dice rolls and character progression.

## Features

- **AI-Powered Game Master**: LLM-driven narrative and decision-making
- **3-Step Character Creation**: 
  - Select gender, race, and class
  - AI generates character name, stats, and backstory
  - AI creates a personalized starting world and inventory
- **Interactive Gameplay**:
  - Natural language interaction with the GM
  - Automatic dice rolling with D&D 5e rules
  - Real-time character and inventory management
  - Rich markdown formatting for narrative
- **Tool-Based Actions**: 
  - Dice rolls (`roll_dice`)
  - Inventory management (`add_inventory`, `update_inventory`)
  - Character updates (`update_character`, `get_character_stats`)

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand with persistence
- **LLM Integration**: OpenAI API with function calling
- **Testing**: Jest with ts-jest
- **Markdown Rendering**: react-markdown with remark-gfm

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- LiteLLM proxy running locally (or OpenAI API key)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dnd-ai-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the LLM model:
```
# The model name configured in your LiteLLM setup
NEXT_PUBLIC_LLM_MODEL=gemini-1.5-flash-002
```

**Note**: The app uses a Next.js rewrite to proxy LLM requests from `/api/llm/*` to `http://127.0.0.1:4000/*` (LiteLLM default endpoint). No API key is needed since LiteLLM runs locally. The rewrite is configured in `next.config.ts`.

4. Start LiteLLM proxy (if not already running):
```bash
litellm --model gemini-1.5-flash-002
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js app directory
│   └── page.tsx              # Main application page
├── components/               # React components
│   ├── character-creation/   # Character creation steps
│   ├── chat/                 # Chat interface components
│   ├── CharacterCreation.tsx
│   ├── CharacterSheet.tsx
│   ├── ChatInterface.tsx
│   └── Tooltip.tsx
├── lib/                      # Business logic
│   ├── llm/                  # LLM client and utilities
│   │   ├── client.ts         # LLM client implementation
│   │   ├── llm-schemas.ts    # JSON schemas for structured outputs
│   │   ├── llm-service.ts    # LLM service layer (generation functions)
│   │   └── types.ts          # Type definitions
│   ├── character-creation.ts # Character creation logic
│   ├── chat-logic.ts         # Chat message handling
│   ├── dnd-rules.ts          # D&D 5e rules
│   ├── game-logic.ts         # Tool processing
│   ├── gm-prompts.ts         # System prompts
│   └── store.ts              # Zustand state management
├── types/                    # TypeScript types
│   └── dnd.ts
└── __tests__/                # Unit tests
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run unit tests (excludes slow eval tests)
- `npm run test:eval` - Run evaluation tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint

## Architecture

### Game Logic
Game logic is separated from React components for better testability:
- **Character Creation Logic** (`lib/character-creation.ts`): HP calculation, inventory normalization, character assembly
- **Chat Logic** (`lib/chat-logic.ts`): Message conversion, tool result updates
- **Game Logic** (`lib/game-logic.ts`): Tool call processing

### LLM Integration
The app uses OpenAI SDK on the frontend with LiteLLM proxy via Next.js rewrite:
- **Schemas** (`lib/llm/llm-schemas.ts`): JSON schemas for structured outputs
- **Service** (`lib/llm/llm-service.ts`): Helper functions for character/world generation  
- **Client** (`lib/llm/client.ts`): Main LLM client for chat interactions
- **Proxy** (`next.config.ts`): Next.js rewrite proxies `/api/llm/*` to LiteLLM at `http://127.0.0.1:4000/*`

All LLM calls are made directly from the frontend, eliminating the need for backend API routes.

### State Management
Zustand store with local storage persistence:
- Character data (stats, inventory, HP)
- Chat history
- Game settings

## Testing

The project uses Jest for unit testing with the following structure:

- **Unit Tests**: Fast tests for business logic (`src/lib/__tests__/`)
- **Integration Tests**: Frontend state management (`src/__tests__/`)
- **Evaluation Tests**: LLM behavior tests (slow, run separately)

Run specific test suites:
```bash
npm test                    # Fast unit tests only
npm run test:eval          # LLM evaluation tests
npm run test:watch         # Watch mode for development
```

## Documentation

Detailed documentation is available in the `spec/` directory:

- **[Game Logic](spec/game-logic.md)**: Core game logic components
- **[React Components](spec/react-components.md)**: Component hierarchy and design
- **[GM Protocol](spec/gm-protocol.md)**: LLM tool definitions and protocols (if exists)

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run `npm test` to ensure all tests pass
5. Run `npm run lint` to check code style
6. Submit a pull request

## License

This project is licensed under the MIT License.
