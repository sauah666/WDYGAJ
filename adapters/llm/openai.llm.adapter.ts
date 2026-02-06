

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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      
      if (!text) throw new Error("Empty response from LLM");

      const usage = {
        input: data.usage?.prompt_tokens || 0,
        output: data.usage?.completion_tokens || 0
      };

      return { text, usage };
    } catch (e: any) {
      console.error("LLM Call Failed:", e);
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