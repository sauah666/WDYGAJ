
// Layer: ADAPTERS
// Purpose: Real Implementation of LLM Port using Google Gemini API.

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, SearchUIAnalysisInputV1, LLMScreeningInputV1, LLMScreeningOutputV1, EvaluateExtractsInputV1, EvaluateExtractsOutputV1, QuestionnaireAnswerInputV1, QuestionnaireAnswerOutputV1, SeniorityLevel, RoleCategory, WorkMode } from '../../core/domain/llm_contracts';
import { SearchUISpecV1 } from '../../core/domain/entities';

export class GeminiLLMAdapter implements LLMProviderPort {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async checkConnection(): Promise<boolean> {
    try {
        const result = await this.callGemini("respond 'test ok' if you received this message", "System check. Be brief.");
        return result.text.toLowerCase().includes('ok');
    } catch (e) {
        console.error("Gemini Connection Check Failed", e);
        return false;
    }
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
      if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
          throw new Error(`Network Error: Cannot reach Google Gemini. Check your internet connection.`);
      }
      throw e;
    }
  }

  async analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1> {
    const system = `You are an expert HR Data Scientist. Analyze the user profile and extract a JSON Targeting Specification.
    
    CRITICAL: You must output a valid JSON object matching the schema below exactly.
    Ensure 'targetRoles.ruTitles' and 'targetRoles.enTitles' are always arrays of strings, even if empty.

    Expected Schema:
    {
      "targetRoles": {
        "ruTitles": ["..."],
        "enTitles": ["..."]
      },
      "seniorityLevels": ["JUNIOR", "MIDDLE"...],
      "roleCategories": ["ENGINEERING"...],
      "titleMatchWeights": { "exact": 1.0, "contains": 0.8, "fuzzy": 0.6, "negativeKeywords": [] },
      "salaryRules": { "ignoreIfMissing": true, "minThresholdStrategy": "STRICT" },
      "workModeRules": { "strictMode": false, "allowedModes": ["REMOTE"] },
      "confidenceThresholds": { "autoRead": 0.85, "autoIgnore": 0.4 },
      "assumptions": ["..."]
    }
    `;
    
    const prompt = `
    PROFILE TEXT:
    ${profile.profileTextNormalized}

    USER CONSTRAINTS:
    ${JSON.stringify(profile.userConstraints)}

    TASK:
    Generate the TargetingSpecV1 JSON.
    `;

    const result = await this.callGemini(prompt, system);
    let spec: any;
    try {
        spec = JSON.parse(result.text);
    } catch (e) {
        throw new Error("Failed to parse Gemini JSON response for profile analysis.");
    }

    // Runtime Validation / Patching
    if (!spec.targetRoles) spec.targetRoles = { ruTitles: [], enTitles: [] };
    if (!Array.isArray(spec.targetRoles.ruTitles)) spec.targetRoles.ruTitles = [];
    if (!Array.isArray(spec.targetRoles.enTitles)) spec.targetRoles.enTitles = [];
    
    // Default fallback if extracting failed completely
    if (spec.targetRoles.ruTitles.length === 0 && spec.targetRoles.enTitles.length === 0) {
        spec.targetRoles.enTitles = ["Specialist"];
    }

    spec.userConstraints = profile.userConstraints;
    // Phase G2: Telemetry
    spec.tokenUsage = result.usage;
    return spec as TargetingSpecV1;
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
