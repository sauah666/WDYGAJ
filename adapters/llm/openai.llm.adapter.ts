
// Layer: ADAPTERS
// Purpose: Generic implementation for OpenAI-compatible APIs (DeepSeek, LM Studio, Ollama, OpenAI).

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, SearchUIAnalysisInputV1, LLMScreeningInputV1, LLMScreeningOutputV1, EvaluateExtractsInputV1, EvaluateExtractsOutputV1, QuestionnaireAnswerInputV1, QuestionnaireAnswerOutputV1 } from '../../core/domain/llm_contracts';
import { SearchUISpecV1 } from '../../core/domain/entities';

export class OpenAILLMAdapter implements LLMProviderPort {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1', model: string = 'gpt-4') {
    this.apiKey = apiKey || 'dummy'; // Local LLMs might accept any key
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Strip trailing slash
    this.model = model;
  }

  async checkConnection(): Promise<boolean> {
      try {
          const result = await this.callCompletion([
              { role: 'user', content: "respond 'test ok' if you received this message" }
          ], false); // Don't force JSON for a simple ping
          return result.text.toLowerCase().includes('ok');
      } catch (e) {
          console.error("OpenAI/Local Connection Check Failed", e);
          return false;
      }
  }

  private async callCompletion(messages: any[], jsonMode: boolean = true): Promise<{ text: string, usage: { input: number, output: number } }> {
    const url = `${this.baseUrl}/chat/completions`;
    
    const body: any = {
      model: this.model,
      messages: messages,
      temperature: 0.1,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    try {
      let responseText: string;
      let ok: boolean;
      let status: number;

      // HYBRID FETCH STRATEGY
      // If we are in Electron, route the request through the Main process to bypass CORS.
      if (window.electronAPI) {
          console.log("[OpenAILLMAdapter] Using Native Electron Fetch");
          const result = await window.electronAPI.invoke('llm:request', {
              url,
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.apiKey}`
              },
              body: body // Object, Main process will stringify
          });
          
          if (result.error) throw new Error(result.error);
          ok = result.ok;
          status = result.status;
          responseText = result.text;
      } else {
          // Fallback to standard Browser Fetch (Subject to CORS)
          const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
          });
          ok = response.ok;
          status = response.status;
          responseText = await response.text();
      }

      if (!ok) {
        throw new Error(`LLM API Error ${status}: ${responseText}`);
      }

      if (!responseText) throw new Error("Empty response from LLM");

      const data = JSON.parse(responseText);
      const text = data.choices?.[0]?.message?.content;
      
      if (!text) throw new Error("Empty content in LLM response");

      const usage = {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0
      };

      return { text, usage };
    } catch (e: any) {
      console.error("LLM Call Failed:", e);
      
      // Enhanced Error Reporting for Local LLMs
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
          const helpMsg = window.electronAPI 
            ? `Connection Failed to ${this.baseUrl}. The Electron proxy could not reach the server.`
            : `Connection Failed to ${this.baseUrl}. CORS Error detected. 1) Is the server running? 2) Are CORS headers allowed? (Use 'lm-studio-server start' or check Ollama host)`;
          throw new Error(helpMsg);
      }
      
      throw e;
    }
  }

  async analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1> {
    const system = `You are an expert HR Data Scientist. Analyze the user profile and extract a JSON Targeting Specification. Output JSON only.`;
    const prompt = `
    PROFILE TEXT:
    ${profile.profileTextNormalized}

    USER CONSTRAINTS:
    ${JSON.stringify(profile.userConstraints)}

    TASK:
    Generate a TargetingSpecV1 JSON structure with targetRoles, seniorityLevels, roleCategories, titleMatchWeights, salaryRules, workModeRules, assumptions.
    `;

    const result = await this.callCompletion([
        { role: 'system', content: system },
        { role: 'user', content: prompt }
    ]);
    
    const spec = JSON.parse(result.text) as TargetingSpecV1;
    spec.userConstraints = profile.userConstraints;
    spec.tokenUsage = result.usage;
    return spec;
  }

  async analyzeSearchDOM(input: SearchUIAnalysisInputV1): Promise<SearchUISpecV1> {
    const system = `You are a Frontend QA Engineer. Map raw DOM fields to semantic search filters. Output JSON only.`;
    const simplifiedFields = input.domSnapshot.fields.map(f => ({ id: f.id, tag: f.tag, label: f.label, attr: f.attributes }));
    const prompt = `
    CONTEXT: ${JSON.stringify(input.targetingContext)}
    DOM: ${JSON.stringify(simplifiedFields)}
    TASK: Return SearchUISpecV1 JSON with fields mapped to semanticType (KEYWORD, SALARY, etc).
    `;

    const result = await this.callCompletion([
        { role: 'system', content: system },
        { role: 'user', content: prompt }
    ]);

    const spec = JSON.parse(result.text);
    spec.siteId = input.siteId;
    spec.derivedAt = Date.now();
    spec.tokenUsage = result.usage;
    return spec as SearchUISpecV1;
  }

  async screenVacancyCardsBatch(input: LLMScreeningInputV1): Promise<LLMScreeningOutputV1> {
    const system = `You are a Technical Recruiter. Screen vacancies. Decisions: READ, DEFER, IGNORE. Output JSON only.`;
    const prompt = `
    TARGETING: ${JSON.stringify(input.targetingSpec)}
    VACANCIES: ${JSON.stringify(input.cards)}
    TASK: Return LLMScreeningOutputV1 JSON with results array.
    `;

    const result = await this.callCompletion([
        { role: 'system', content: system },
        { role: 'user', content: prompt }
    ]);

    const parsed = JSON.parse(result.text);
    return { results: parsed.results, tokenUsage: result.usage };
  }

  async evaluateVacancyExtractsBatch(input: EvaluateExtractsInputV1): Promise<EvaluateExtractsOutputV1> {
    const system = `You are a Career Coach. Evaluate vacancies. Decisions: APPLY, SKIP, NEEDS_HUMAN. Output JSON only.`;
    const prompt = `
    PROFILE: ${input.profileSummary}
    RULES: ${JSON.stringify(input.targetingRules)}
    CANDIDATES: ${JSON.stringify(input.candidates)}
    TASK: Return EvaluateExtractsOutputV1 JSON.
    `;

    const result = await this.callCompletion([
        { role: 'system', content: system },
        { role: 'user', content: prompt }
    ]);

    const parsed = JSON.parse(result.text);
    return { results: parsed.results, tokenUsage: result.usage };
  }

  async generateQuestionnaireAnswers(input: QuestionnaireAnswerInputV1): Promise<QuestionnaireAnswerOutputV1> {
    const system = `You are the User. Fill job application. Use "Unknown" if missing info. Output JSON only.`;
    const prompt = `
    PROFILE: ${input.profileSummary}
    FIELDS: ${JSON.stringify(input.fields)}
    TASK: Return QuestionnaireAnswerOutputV1 JSON.
    `;

    const result = await this.callCompletion([
        { role: 'system', content: system },
        { role: 'user', content: prompt }
    ]);

    const parsed = JSON.parse(result.text);
    parsed.tokenUsage = result.usage;
    return parsed as QuestionnaireAnswerOutputV1;
  }
}
