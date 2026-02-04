// Layer: ADAPTERS
// Purpose: Mock implementation of LLM Port for development.

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, WorkMode, SeniorityLevel, RoleCategory, SearchUIAnalysisInputV1 } from '../../core/domain/llm_contracts';
import { SearchUISpecV1 } from '../../core/domain/entities';

export class MockLLMAdapter implements LLMProviderPort {
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
        strictMode: profile.userConstraints.preferredWorkMode !== WorkMode.ANY
      },
      confidenceThresholds: {
        autoRead: 0.85,
        autoIgnore: 0.4
      },
      assumptions: ['Assuming focus on Web Development based on "React" keyword.']
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
        assumptions: ['Assuming "Уровень дохода" implies monthly salary in local currency.']
    };
  }
}