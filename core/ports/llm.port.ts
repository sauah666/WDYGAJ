// Layer: PORTS
// Purpose: Define contracts for AI/LLM interaction.

import { SearchUISpecV1 } from '../domain/entities';
import { ProfileSummaryV1, SearchUIAnalysisInputV1, TargetingSpecV1, LLMScreeningInputV1, LLMScreeningOutputV1 } from '../domain/llm_contracts';

export interface LLMProviderPort {
  /**
   * Stage 4: Analyzes the normalized profile text and user constraints
   * to generate a targeting specification for job search.
   * 
   * @param profile - The collected profile data and constraints
   * @returns Targeting strategy including keywords, weights, and rules
   */
  analyzeProfile(profile: ProfileSummaryV1): Promise<TargetingSpecV1>;

  /**
   * Stage 5.3: Analyzes the raw DOM structure of the search page
   * to semantically map UI controls to job search criteria.
   * 
   * @param input - The raw DOM snapshot and targeting context
   * @returns Semantic UI Specification
   */
  analyzeSearchDOM(input: SearchUIAnalysisInputV1): Promise<SearchUISpecV1>;

  /**
   * Phase C2: Batch screens vacancy cards based on limited listing data.
   * 
   * @param input - Batch of 10-15 cards + Targeting Context
   * @returns Decisions (READ/DEFER/IGNORE) for each card
   */
  screenVacancyCardsBatch(input: LLMScreeningInputV1): Promise<LLMScreeningOutputV1>;
}