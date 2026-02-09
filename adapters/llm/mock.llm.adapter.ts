
// Layer: ADAPTERS
// Purpose: Mock implementation of LLM Port for development.

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, WorkMode, SeniorityLevel, RoleCategory, SearchUIAnalysisInputV1, LLMScreeningInputV1, LLMScreeningOutputV1, EvaluateExtractsInputV1, EvaluateExtractsOutputV1, QuestionnaireAnswerInputV1, QuestionnaireAnswerOutputV1 } from '../../core/domain/llm_contracts';
import { SearchUISpecV1 } from '../../core/domain/entities';

export class MockLLMAdapter implements LLMProviderPort {
  
  async checkConnection(): Promise<boolean> {
      console.log("[MockLLMAdapter] Simulating connection check...");
      await new Promise(r => setTimeout(r, 800)); // Sim network latency
      return true;
  }

  async analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1> {
    console.log('[MockLLMAdapter] Analyzing profile...', profile.profileHash);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return a hardcoded valid spec
    return {
      targetRoles: {
        ruTitles: ['Frontend Разработчик', 'React Разработчик'],
        enTitles: ['Frontend Developer', 'Senior Software Engineer']
      },
      seniorityLevels: [SeniorityLevel.SENIOR, SeniorityLevel.LEAD],
      roleCategories: [RoleCategory.ENGINEERING],
      titleMatchWeights: {
        exact: 1.0,
        contains: 0.8,
        fuzzy: 0.6,
        negativeKeywords: ['Junior', 'Intern']
      },
      salaryRules: {
        ignoreIfMissing: true,
        minThresholdStrategy: 'STRICT'
      },
      workModeRules: {
        strictMode: !profile.userConstraints.preferredWorkModes.includes(WorkMode.ANY),
        allowedModes: profile.userConstraints.preferredWorkModes
      },
      confidenceThresholds: {
        autoRead: 0.85,
        autoIgnore: 0.4
      },
      assumptions: ['Assuming focus on Web Development based on "React" keyword.'],
      userConstraints: profile.userConstraints,
      // Phase G2: Telemetry
      tokenUsage: {
        input: 1000,
        output: 500
      }
    };
  }

  async analyzeSearchDOM(input: SearchUIAnalysisInputV1): Promise<SearchUISpecV1> {
    console.log(`[MockLLMAdapter] Analyzing Search DOM for ${input.siteId} with ${input.domSnapshot.fields.length} elements...`);
    
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock response mapping the MockBrowserAdapter's DOM to semantics
    return {
        siteId: input.siteId,
        derivedAt: Date.now(),
        sourceUrl: input.domSnapshot.pageUrl,
        version: 'v1',
        fields: [
            {
                key: 'keyword_input',
                label: 'Ключевые слова',
                uiControlType: 'TEXT',
                semanticType: 'KEYWORD',
                defaultBehavior: 'INCLUDE',
                domHint: 'name=text',
                confidence: 0.98
            },
            {
                key: 'salary_input',
                label: 'Уровень дохода',
                uiControlType: 'TEXT', // Input type number is effectively text for LLM
                semanticType: 'SALARY',
                defaultBehavior: 'RANGE',
                domHint: 'name=salary',
                confidence: 0.95
            },
            {
                key: 'region_select',
                label: 'Регион',
                uiControlType: 'SELECT',
                semanticType: 'LOCATION',
                defaultBehavior: 'INCLUDE',
                options: [
                    { label: 'Москва', value: '1' },
                    { label: 'Spb', value: '2' }
                ],
                domHint: 'name=area',
                confidence: 0.92
            },
            {
                key: 'remote_checkbox',
                label: 'Только удаленная работа',
                uiControlType: 'CHECKBOX',
                semanticType: 'WORK_MODE',
                defaultBehavior: 'INCLUDE',
                domHint: 'name=schedule',
                confidence: 0.99
            },
            {
                key: 'submit_button',
                label: 'Найти',
                uiControlType: 'BUTTON',
                semanticType: 'SUBMIT',
                defaultBehavior: 'CLICK',
                domHint: 'data-qa=advanced-search-submit',
                confidence: 0.99
            }
        ],
        unsupportedFields: [],
        assumptions: ['Assuming "Уровень дохода" implies monthly salary in local currency.'],
        // Phase G2: Telemetry
        tokenUsage: {
          input: 1500,
          output: 300
        }
    };
  }

  async screenVacancyCardsBatch(input: LLMScreeningInputV1): Promise<LLMScreeningOutputV1> {
    console.log(`[MockLLMAdapter] Screening batch of ${input.cards.length} vacancies against Targeting Spec...`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const results = input.cards.map(card => {
        const titleLower = card.title.toLowerCase();
        let decision: 'READ' | 'DEFER' | 'IGNORE' = 'IGNORE';
        let confidence = 0.3;
        const reasons: string[] = [];

        // Simple Mock Logic imitating LLM reasoning
        if (titleLower.includes('senior') || titleLower.includes('lead')) {
            decision = 'READ';
            confidence = 0.9;
            reasons.push('seniority_match');
        } else if (titleLower.includes('middle')) {
            decision = 'DEFER';
            confidence = 0.6;
            reasons.push('mid_level_potential');
        } else if (titleLower.includes('junior')) {
            decision = 'IGNORE';
            confidence = 0.95;
            reasons.push('too_junior');
        } else {
             // Default fallback for ambiguous
             if (card.salary && card.salary.includes('USD')) {
                 decision = 'READ';
                 confidence = 0.85;
                 reasons.push('high_salary_potential');
             } else {
                 decision = 'DEFER';
                 confidence = 0.5;
                 reasons.push('ambiguous_title');
             }
        }

        return {
            cardId: card.id,
            decision,
            confidence,
            reasons
        };
    });

    return {
        results,
        tokenUsage: {
            input: input.cards.length * 150, // approx
            output: input.cards.length * 20
        }
    };
  }

  async evaluateVacancyExtractsBatch(input: EvaluateExtractsInputV1): Promise<EvaluateExtractsOutputV1> {
      console.log(`[MockLLMAdapter] Evaluating batch of ${input.candidates.length} extractions...`);
      await new Promise(resolve => setTimeout(resolve, 2500));

      const results = input.candidates.map(candidate => {
           // Strict Deterministic Logic
           const factsUsed: string[] = [];
           const risks: string[] = [];
           const reasons: string[] = [];
           let decision: 'APPLY' | 'SKIP' | 'NEEDS_HUMAN' = 'NEEDS_HUMAN'; // Default safe state
           let confidence = 0.5;

           // 1. Trace Inputs
           if (candidate.derived.salary !== undefined) factsUsed.push('derived.salary');
           if (candidate.derived.workMode !== undefined) factsUsed.push('derived.workMode');
           if (candidate.sections.requirements.length > 0) factsUsed.push('sections.requirements');

           // 2. Salary Analysis
           const vacSalary = candidate.derived.salary;
           const userMinSalary = input.targetingRules.minSalary;

           if (!vacSalary) {
               risks.push('salary_missing');
           } else if (userMinSalary && vacSalary.max && vacSalary.max < userMinSalary) {
               decision = 'SKIP';
               reasons.push('salary_too_low');
               confidence = 0.95;
               return { id: candidate.id, decision, confidence, reasons, risks, factsUsed }; // Early Exit
           }

           // 3. Work Mode Analysis
           const vacWorkMode = candidate.derived.workMode || 'unknown';
           const isRemote = vacWorkMode === 'remote';
           const strictMode = input.targetingRules.workModeRules.strictMode;

           if (vacWorkMode === 'unknown') {
               risks.push('workmode_unknown');
           } else if (!isRemote) {
               // Assuming user preference is Remote based on strictMode usage context in this mock
               if (strictMode) {
                   decision = 'SKIP';
                   reasons.push('workmode_mismatch');
                   confidence = 0.95;
                   return { id: candidate.id, decision, confidence, reasons, risks, factsUsed }; // Early Exit
               } else {
                   risks.push('workmode_mismatch');
               }
           }

           // 4. Requirements/Stack Analysis
           const reqsText = candidate.sections.requirements.join(' ').toLowerCase();
           const hasStack = reqsText.includes('react') || reqsText.includes('frontend') || reqsText.includes('typescript');

           if (!hasStack) {
               decision = 'SKIP';
               reasons.push('stack_mismatch');
               confidence = 0.8;
           } else {
               // 5. Final Decision
               if (risks.length > 0) {
                   decision = 'NEEDS_HUMAN';
                   reasons.push('risks_detected');
                   confidence = 0.7;
               } else {
                   decision = 'APPLY';
                   reasons.push('strong_match');
                   confidence = 0.95;
               }
           }

           return {
               id: candidate.id,
               decision,
               confidence,
               reasons,
               risks,
               factsUsed
           };
      });

      return {
          results,
          tokenUsage: {
              input: input.candidates.length * 500,
              output: input.candidates.length * 50
          }
      };
  }

  async generateQuestionnaireAnswers(input: QuestionnaireAnswerInputV1): Promise<QuestionnaireAnswerOutputV1> {
      console.log(`[MockLLMAdapter] Generating answers for ${input.fields.length} questions...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const answers = input.fields.map(field => {
          let value: any = null;
          let confidence = 0.0;
          let factsUsed: string[] = [];
          let risks: string[] = [];
          
          if (field.label.includes("Years")) {
              value = "10";
              confidence = 1.0;
              factsUsed = ["10 years experience in text"];
          } else if (field.label.includes("Visa")) {
              value = "No"; // Radio
              confidence = 0.2; // Low confidence assumption
              factsUsed = ["UNKNOWN"];
              risks = ["missing_fact"];
          } else if (field.label.includes("Portfolio")) {
              value = "https://github.com/mock-user";
              confidence = 1.0;
              factsUsed = ["GitHub link found"];
          } else {
              value = "Unknown";
              confidence = 0.0;
              risks = ["missing_fact"];
          }

          return {
              fieldId: field.id,
              value,
              confidence,
              factsUsed,
              risks
          };
      });

      return {
          answers,
          globalRisks: [],
          // Phase G2: Telemetry
          tokenUsage: {
            input: 800,
            output: 200
          }
      };
  }
}
