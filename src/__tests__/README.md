# GM Tool Evaluation Tests - README

## Quick Start

### Running Tests

```bash
# Run unit tests only (no LLM needed)
npm test

# Run evaluation tests with real LLM
npm run test:eval

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Requirements

For evaluation tests (`npm run test:eval`):
- Valid `.env.local` with `LLM_API_KEY`, `LLM_MODEL`, `LLM_ENDPOINT`
- LLM endpoint must support OpenAI-compatible function calling

## Test Suite

**20 Total Tests:**
- 15 GM tool evaluation tests (require real LLM)
- 5 helper function unit tests

### Test Categories

1. **Dice Rolling** (6 tests) - Perception, combat, social, stealth, hazards, investigation
2. **Inventory** (3 tests) - Finding items, using consumables, starting equipment
3. **Character Updates** (2 tests) - Taking damage, healing
4. **Complex Scenarios** (3 tests) - Full combat, exploration, social encounters
5. **Character Stats** (1 test) - Stats retrieval

## Configuration

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `LLM_API_KEY` | API key for LLM | Yes |
| `LLM_MODEL` | Model name (e.g., gpt-4) | Yes |
| `LLM_ENDPOINT` | API endpoint URL | Yes |
| `TEST_USE_REAL_LLM` | Enable real LLM tests | Optional |

### .env.local Example

```env
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4
LLM_ENDPOINT=https://api.openai.com/v1
```

## Test Results

```bash
✓ createTestCharacter creates valid character (1 ms)
✓ createTestCharacter accepts overrides
✓ assertToolCalled identifies correct tool
✓ helper functions correctly identify tool types
✓ getDiceRolls extracts roll results

Test Suites: 1 passed, 1 total
Tests:       14 skipped, 5 passed, 19 total
```

Evaluation tests are skipped by default. Run with `npm run test:eval` to execute them.

## Adding New Tests

1. Open `src/__tests__/gm-tools.eval.test.ts`
2. Add test in appropriate `describeOrSkip` block
3. Use `callChatAPI()` to make requests
4. Assert tool usage with helper functions

Example:
```typescript
test('GM does something', async () => {
  const character = createTestCharacter();
  const response = await callChatAPI([{
    role: 'user',
    content: 'Player action...'
  }], character);

  expect(wasDiceRolled(getToolCalls(response))).toBe(true);
}, 30000);
```

## Files

- `jest.config.js` - Jest configuration
- `src/__tests__/setup.ts` - Test setup, loads .env.local
- `src/__tests__/utils/test-helpers.ts` - Helper functions
- `src/__tests__/gm-tools.eval.test.ts` - Main test suite
