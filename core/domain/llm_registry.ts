
// Layer: DOMAIN
// Purpose: Registry of supported LLM Providers for G1.

export type LLMProviderId = string;

export interface LLMProviderDefinition {
  id: LLMProviderId;
  label: string;
  kind: 'cloud' | 'local';
  enabled: boolean;
  envKeys: string[]; // required config keys (e.g. 'apiKey')
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
    enabled: false,
    envKeys: ['apiKey']
  },
  'local_llm': {
    id: 'local_llm',
    label: 'Local LLM (Ollama/LM Studio)',
    kind: 'local',
    enabled: false,
    envKeys: []
  }
};

export const DEFAULT_LLM_PROVIDER = 'mock';

export function listProviders(): LLMProviderDefinition[] {
  return Object.values(LLMProviderRegistry);
}

export function getProvider(id: string): LLMProviderDefinition | null {
  return LLMProviderRegistry[id] || null;
}
