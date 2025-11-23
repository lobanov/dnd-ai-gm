import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local for tests - override any existing env vars
config({ path: resolve(__dirname, '../../.env.local'), override: true });

// Verify required environment variables
const required = ['LLM_API_KEY', 'LLM_MODEL', 'LLM_ENDPOINT'];
const missing = required.filter(key => !process.env[key] || process.env[key]?.trim() === '');

if (missing.length > 0) {
    console.warn(`Warning: Missing or empty environment variables: ${missing.join(', ')}`);
    console.warn('Some tests may be skipped. Check your .env.local file.');
}

export { };
