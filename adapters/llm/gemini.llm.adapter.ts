

// Layer: ADAPTERS
// Purpose: Real Implementation of LLM Port using Google Gemini API.

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, SearchUIAnalysisInputV1, LLMScreeningInputV1, LLMScreeningOutputV1, EvaluateExtractsInputV1, EvaluateExtractsOutputV1, QuestionnaireAnswerInputV1, QuestionnaireAnswerOutputV1 } from '../../core/domain/llm_contracts';
import { SearchUISpecV1 } from '../../core/domain/entities';

export class GeminiLLMAdapter implements LLMProviderPort {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callGemini(prompt: string, systemInstruction?: string): Promise<{ text: string, usage: { input: number, output: number } }> {
    if (!this.apiKey) throw new Error("Gemini API Key is missing");

    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    
    const body: any = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new Error("Empty response from Gemini");

      const usage = {
        input: data.usageMetadata?.promptTokenCount || 0,
        output: data.usageMetadata?.candidatesTokenCount || 0
      };

      return { text, usage };
    } catch (e: any) {
      console.error("Gemini Call Failed:", e);
      throw e;
    }
  }

  async analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1> {
    const system = `You are an expert HR Data Scientist. Analyze the user profile and extract a JSON Targeting Specification.
    Strictly follow the output schema.
    Output JSON only.`;
    
    const prompt = `
    PROFILE TEXT:
    ${profile.profileTextNormalized}

    USER CONSTRAINTS:
    ${JSON.stringify(profile.userConstraints)}

    TASK:
    Generate a TargetingSpecV1 JSON.
    1. targetRoles: extract job titles in Russian and English.
    2. seniorityLevels: INTERN, JUNIOR, MIDDLE, SENIOR, LEAD, C_LEVEL.
    3. roleCategories: ENGINEERING, PRODUCT, DESIGN, ANALYTICS, MANAGEMENT, OTHER.
    4. titleMatchWeights: suggest weights for exact/contains/fuzzy/negative.
    5. salaryRules: define strategy.
    6. workModeRules: strictMode based on user preference.
    7. assumptions: list assumed details.
    
    Ensure strict JSON syntax.
    `;

    const result = await this.callGemini(prompt, system);
    const spec = JSON.parse(result.text) as TargetingSpecV1;
    spec.userConstraints = profile.userConstraints;
    // Phase G2: Telemetry
    spec.tokenUsage = result.usage;
    return spec;
  }

  async analyzeSearchDOM(input: SearchUIAnalysisInputV1): Promise<SearchUISpecV1> {
    const system = `You are a Frontend QA Engineer specializing in Semantic DOM Analysis.
    Map raw DOM fields to semantic search filters (KEYWORD, SALARY, LOCATION, WORK_MODE, SUBMIT).
    Output JSON only.`;

    // Simplify DOM for token efficiency
    const simplifiedFields = input.domSnapshot.fields.map(f => ({
      id: f.id, tag: f.tag, label: f.label, attr: f.attributes
    }));

    const prompt = `
    TARGETING CONTEXT:
    ${JSON.stringify(input.targetingContext)}

    RAW DOM FIELDS:
    ${JSON.stringify(simplifiedFields)}

    TASK:
    Return a SearchUISpecV1 JSON.
    For each meaningful field:
    - assign semanticType
    - suggest defaultBehavior (INCLUDE/EXCLUDE/RANGE/CLICK)
    - assign confidence (0.0-1.0)
    
    Unknown fields should go to 'unsupportedFields' if not useful.
    `;

    const result = await this.callGemini(prompt, system);
    const spec = JSON.parse(result.text);
    spec.siteId = input.siteId; // Ensure consistency
    spec.derivedAt = Date.now();
    // Phase G2: Telemetry
    spec.tokenUsage = result.usage;
    return spec as SearchUISpecV1;
  }

  async screenVacancyCardsBatch(input: LLMScreeningInputV1): Promise<LLMScreeningOutputV1> {
    const system = `You are a Technical Recruiter. Screen these vacancies based on the Targeting Spec.
    Decisions: READ (good match), DEFER (unsure), IGNORE (bad match).
    Output JSON only.`;

    const prompt = `
    TARGETING SPEC:
    ${JSON.stringify(input.targetingSpec)}

    VACANCIES:
    ${JSON.stringify(input.cards)}

    TASK:
    Return LLMScreeningOutputV1 JSON.
    results: array of { cardId, decision, confidence, reasons }.
    `;

    const result = await this.callGemini(prompt, system);
    const parsed = JSON.parse(result.text);
    
    return {
      results: parsed.results,
      tokenUsage: result.usage
    };
  }

  async evaluateVacancyExtractsBatch(input: EvaluateExtractsInputV1): Promise<EvaluateExtractsOutputV1> {
    const system = `You are a Senior Career Coach. Evaluate detailed vacancy requirements against the user profile.
    Decisions: APPLY (strong match), SKIP (mismatch), NEEDS_HUMAN (risks/unknowns).
    Output JSON only.`;

    const prompt = `
    PROFILE SUMMARY:
    ${input.profileSummary}

    TARGETING RULES:
    ${JSON.stringify(input.targetingRules)}

    CANDIDATES:
    ${JSON.stringify(input.candidates)}

    TASK:
    Return EvaluateExtractsOutputV1 JSON.
    results: array of { id, decision, confidence, reasons, risks, factsUsed }.
    `;

    const result = await this.callGemini(prompt, system);
    const parsed = JSON.parse(result.text);

    return {
      results: parsed.results,
      tokenUsage: result.usage
    };
  }

  async generateQuestionnaireAnswers(input: QuestionnaireAnswerInputV1): Promise<QuestionnaireAnswerOutputV1> {
    const system = `You are the User. Fill out the job application questionnaire based on your profile.
    Do not hallucinate. If info is missing, use "Unknown" and add to risks.
    Output JSON only.`;

    const prompt = `
    PROFILE:
    ${input.profileSummary}

    CONSTRAINTS:
    ${JSON.stringify(input.userConstraints)}

    FIELDS TO FILL:
    ${JSON.stringify(input.fields)}

    TASK:
    Return QuestionnaireAnswerOutputV1 JSON.
    answers: array of { fieldId, value, confidence, factsUsed, risks }.
    globalRisks: string[].
    `;

    const result = await this.callGemini(prompt, system);
    const parsed = JSON.parse(result.text);
    // Phase G2: Telemetry
    parsed.tokenUsage = result.usage;

    return parsed as QuestionnaireAnswerOutputV1;
  }
}