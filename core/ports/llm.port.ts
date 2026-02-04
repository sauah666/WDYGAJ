// Layer: PORTS
// Purpose: Define contracts for AI/LLM interaction.

import { ProfileSummaryV1, TargetingSpecV1 } from '../domain/llm_contracts';

export interface LLMProviderPort {
  /**
   * Stage 4: Analyzes the normalized profile text and user constraints
   * to generate a targeting specification for job search.
   * 
   * @param profile - The collected profile data and constraints
   * @returns Targeting strategy including keywords, weights, and rules
   */
  analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1>;
}