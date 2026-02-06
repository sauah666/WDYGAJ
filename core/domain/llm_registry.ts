
// Layer: DOMAIN
// Purpose: Registry of supported LLM Providers for G1.

export type LLMProviderId = string;

export interface LLMProviderDefinition {
  id: LLMProviderId;
  label: string;
  kind: 'cloud' | 'local';
  enabled: boolean;
  envKeys: string[]; // required config keys (e.g. 'apiKey')
  defaultBaseUrl?: string;
  modelId?: string;
}

export const LLMProviderRegistry: Record<LLMProviderId, LLMProviderDefinition> = {
  'mock': {
    id: 'mock',
    label: 'Mock Adapter (Virtual)',
    kind: 'local',
    enabled: true,
    envKeys: []
  },
  'gemini_cloud': {
    id: 'gemini_cloud',
    label: 'Google Gemini 2.0 (Cloud)',
    kind: 'cloud',
    enabled: true,
    envKeys: ['apiKey']
  },
  'openai_cloud': {
    id: 'openai_cloud',
    label: 'OpenAI GPT-4 (Cloud)',
    kind: 'cloud',
    enabled: true,
    envKeys: ['apiKey']
  },
  'deepseek_cloud': {
    id: 'deepseek_cloud',
    label: 'DeepSeek Chat',
    kind: 'cloud',
    enabled: true,
    envKeys: ['apiKey'],
    defaultBaseUrl: 'https://api.deepseek.com',
    modelId: 'deepseek-chat'
  },
  'local_llm': {
    id: 'local_llm',
    label: 'Local LLM (LM Studio / Ollama)',
    kind: 'local',
    enabled: true,
    // API Key is optional for local LLMs, so we remove it from required envKeys
    // Gateway URL is the primary requirement, handled in validation logic
    envKeys: [], 
    defaultBaseUrl: 'http://localhost:1234/v1' // Standard LM Studio port
  }
};

export const DEFAULT_LLM_PROVIDER = 'mock';

export function listProviders(): LLMProviderDefinition[] {
  return Object.values(LLMProviderRegistry);
}

export function getProvider(id: string): LLMProviderDefinition | null {
  return LLMProviderRegistry[id] || null;
}
