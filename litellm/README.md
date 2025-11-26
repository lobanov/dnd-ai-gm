# LiteLLM Configuration

This directory contains scripts and configuration for running the LiteLLM proxy.

## Quick Start

```bash
# Run with default model (groq/llama-3.3-70b-versatile)
./litellm/start.sh

# Or specify a different model
LITELLM_MODEL=gpt-4o ./litellm/start.sh
```

## Configuration

The LiteLLM proxy runs on:
- **Host**: 127.0.0.1 (localhost only)
- **Port**: 4000

The Next.js app is configured to proxy requests from `/api/llm/*` to `http://127.0.0.1:4000/*`.

## Environment Variables

- `LITELLM_MODEL` - The model to use (default: `groq/llama-3.3-70b-versatile`)

Make sure you have the appropriate API keys set in your environment for the model provider you're using (e.g., `GROQ_API_KEY`, `OPENAI_API_KEY`, etc.).
