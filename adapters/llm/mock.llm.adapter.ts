// Layer: ADAPTERS
// Purpose: Mock implementation of LLM Port for development.

import { LLMProviderPort } from '../../core/ports/llm.port';
import { ProfileSummaryV1, TargetingSpecV1, WorkMode, SeniorityLevel, RoleCategory } from '../../core/domain/llm_contracts';

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
}