import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Generic OpenAI-compatible provider.
// Set AI_GATEWAY_BASE_URL and AI_GATEWAY_API_KEY in your environment.
// Works with OpenRouter, Google AI, Together AI, or any OpenAI-compatible endpoint.
export const createAiGatewayProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "ai-gateway",
    baseURL: process.env.AI_GATEWAY_BASE_URL || "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
