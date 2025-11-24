import { LLMClient, LLMResponse, Message } from './types';

export class HttpLLMClient implements LLMClient {
    private endpoint: string;

    constructor(endpoint: string = '/api/chat') {
        this.endpoint = endpoint;
    }

    async sendMessage(messages: Message[]): Promise<LLMResponse> {
        try {
            // Filter out tool messages that contain non-serializable content if any (though our types enforce serializable results now)
            // We also need to ensure we're sending a clean payload to the backend
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `LLM request failed with status ${response.status}`);
            }

            const data = await response.json();

            // Validate response structure (basic check)
            if (!data.message || data.message.role !== 'assistant') {
                throw new Error('Invalid response format from LLM backend');
            }

            return data as LLMResponse;
        } catch (error) {
            console.error('Error sending message to LLM:', error);
            throw error;
        }
    }
}
