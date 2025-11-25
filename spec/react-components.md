# React Components Specification

This document describes all React components in the D&D AI Game Master application, their purpose, and responsibilities.

## Component Hierarchy

```
App
├── CharacterCreation (pre-game)
│   ├── ProgressIndicator
│   ├── CharacterSelectionStep
│   ├── CharacterDetailsStep
│   └── WorldGenerationStep
└── Game (during gameplay)
    ├── CharacterSheet
    │   └── Tooltip (used for item descriptions and backstory)
    └── ChatInterface
        ├── ChatMessage
        └── ChatInput
```

---

## Main Components

### CharacterCreation
**Location**: `src/components/CharacterCreation.tsx`

**Purpose**: Main container component for the 3-step character creation flow.

**Responsibilities**:
- Manages the entire character creation state (current step, selections, generated data)
- Coordinates API calls to generate character details and world
- Handles navigation between creation steps
- Assembles the final character object and initiates the game

**State**:
- Current step (1-3)
- Selected gender, race, and class
- Generated character details (name, stats, backstory)
- Generated world (setting and starting inventory)
- Loading and error states for API calls

### CharacterSheet
**Location**: `src/components/CharacterSheet.tsx`

**Purpose**: Displays the character's current stats, HP, and inventory during gameplay.

**Responsibilities**:
- Shows character name, level, race, and class
- Displays HP (current/max) with visual styling
- Shows all ability scores (STR, DEX, CON, INT, WIS, CHA) with modifiers
- Lists inventory items with tooltips for descriptions
- Updates reactively when character state changes

**Uses**: `Tooltip` for displaying item descriptions and backstory

### ChatInterface
**Location**: `src/components/ChatInterface.tsx`

**Purpose**: Main chat interface for player-GM interaction.

**Responsibilities**:
- Manages chat history display and scrolling
- Handles LLM client communication
- Converts LLM messages to application format
- Sends initial adventure prompt on game start
- Processes user input and sends messages
- Handles loading states and errors

**Uses**: `ChatMessage`, `ChatInput`

### Tooltip
**Location**: `src/components/Tooltip.tsx`

**Purpose**: Reusable tooltip component for displaying additional information on hover.

**Responsibilities**:
- Shows content in a positioned overlay on hover
- Uses React Portal to render above other UI elements
- Calculates position dynamically based on trigger element
- Supports multiple positions (top, bottom, left, right)
- Includes visual arrow pointing to trigger element

**Props**:
- `content`: String to display in the tooltip
- `children`: The trigger element to wrap
- `position`: Tooltip placement ('top' | 'bottom' | 'left' | 'right')

---

## Character Creation Sub-Components

### ProgressIndicator
**Location**: `src/components/character-creation/ProgressIndicator.tsx`

**Purpose**: Visual progress indicator for the character creation flow.

**Responsibilities**:
- Shows which step the user is on (1, 2, or 3)
- Displays step labels
- Provides visual feedback on progress

**Props**:
- `currentStep`: Current step number
- `totalSteps`: Total number of steps
- `labels`: Array of step labels

### CharacterSelectionStep
**Location**: `src/components/character-creation/CharacterSelectionStep.tsx`

**Purpose**: First step where player selects character attributes.

**Responsibilities**:
- Allows selection of gender (Male/Female)
- Allows selection of race (9 D&D races)
- Allows selection of class (Fighter, Wizard, Rogue, Cleric)
- Shows starting stats preview based on class
- Triggers navigation to next step

**Props**:
- `selectedGender`, `setSelectedGender`
- `selectedRace`, `setSelectedRace`
- `selectedClass`, `setSelectedClass`
- `onNext`: Callback to proceed to next step

### CharacterDetailsStep
**Location**: `src/components/character-creation/CharacterDetailsStep.tsx`

**Purpose**: Second step displaying AI-generated character details.

**Responsibilities**:
- Shows selection summary from Step 1
- Displays generated character name, stats, and backstory
- Shows loading state during generation
- Handles error display
- Allows regeneration of details
- Provides navigation (back/continue)

**Props**:
- `selectedGender`, `selectedRace`, `selectedClass`: Selection summary
- `generatedDetails`: Generated character data
- `isGenerating`: Loading state
- `error`: Error message if generation fails
- `onGenerate`: Callback to regenerate details
- `onBack`, `onNext`: Navigation callbacks

### WorldGenerationStep
**Location**: `src/components/character-creation/WorldGenerationStep.tsx`

**Purpose**: Third step displaying AI-generated world and inventory.

**Responsibilities**:
- Shows character summary
- Displays generated starting inventory with descriptions
- Displays generated world/setting description
- Shows loading state during generation
- Handles error display
- Allows regeneration of world
- Provides "Start Adventure" button to begin game

**Props**:
- `generatedDetails`: Character details from step 2
- `selectedRace`, `selectedClass`: For display
- `generatedWorld`: Generated world and inventory
- `isGenerating`: Loading state
- `error`: Error message if generation fails
- `onGenerate`: Callback to regenerate world
- `onBack`: Navigation back
- `onStartAdventure`: Callback to begin the game

---

## Chat Sub-Components

### ChatMessage
**Location**: `src/components/chat/ChatMessage.tsx`

**Purpose**: Renders individual chat messages with rich formatting.

**Responsibilities**:
- Displays user, assistant, and system messages with different styles
- Renders tool calls with visual indicators (🛠️, 🎲, 📦, ✨)
- Shows tool execution state (executing/complete)
- Renders markdown content with custom styling for GM messages
- Applies syntax highlighting for different markdown elements

**Props**:
- `message`: The message object to render

**Features**:
- Markdown support with `react-markdown`
- Custom styling for headings, lists, blockquotes, code, tables
- Tool call visualization with icons and status
- Responsive layout (80% max width)

### ChatInput
**Location**: `src/components/chat/ChatInput.tsx`

**Purpose**: Input field for player actions and messages.

**Responsibilities**:
- Provides text input for user messages
- Handles Enter key for sending
- Disables input during loading
- Shows send button with visual feedback
- Prevents sending empty messages

**Props**:
- `input`: Current input value
- `setInput`: Callback to update input
- `onSend`: Callback to send message
- `isLoading`: Whether system is processing

---

## Component Communication

### Data Flow
- **Global State**: `useGameStore` (Zustand) provides character, chat history, and game state
- **Props**: Parent components pass data and callbacks to children
- **Events**: User interactions trigger callbacks that update state

### Key Patterns
- **Presentation/Container**: Main components (CharacterCreation, ChatInterface) manage state, sub-components handle presentation
- **Composition**: Small, focused components are composed into larger features
- **Controlled Components**: Form inputs are controlled via props
- **React Portals**: Tooltip uses portals for proper z-index layering

---

## Styling
All components use **Tailwind CSS** with a consistent dark theme:
- Background: `slate-950`, `slate-900`, `slate-800`
- Text: `slate-200`, `slate-300`, `slate-400`
- Accents: `amber-500` (primary), `indigo-900` (user messages), `red-900` (HP/errors)
- Borders: `slate-700`, `slate-800`
- Typography: `font-serif` for narrative content, default for UI elements
