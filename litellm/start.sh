#!/bin/bash

# Script to run LiteLLM proxy for the D&D AI app
# This proxies requests to various LLM providers

# Set default model if not specified
MODEL="${LITELLM_MODEL:-groq/llama-3.3-70b-versatile}"

# Set host and port
HOST="127.0.0.1"
PORT="4000"

echo "Starting LiteLLM proxy..."
echo "Model: $MODEL"
echo "Listening on: http://$HOST:$PORT"
echo ""

# Run LiteLLM
litellm \
  --host "$HOST" \
  --port "$PORT" \
  --model "$MODEL"
