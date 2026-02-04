// Layer: USE CASES
// Purpose: Application specific business rules. Orchestrates flow between Domain and Ports.

import { BrowserPort } from '../ports/browser.port';
import { StoragePort } from '../ports/storage.port';
import { UIPort } from '../ports/ui.port';
import { LLMProviderPort } from '../ports/llm.port';
import { AgentStatus } from '../../types';
import { AgentState, createInitialAgentState, ProfileSnapshot, SiteDefinition } from '../domain/entities';
import { ProfileSummaryV1, TargetingSpecV1, WorkMode } from '../domain/llm_contracts';

export class AgentUseCase {
  constructor(
    private browser: BrowserPort,
    private storage: StoragePort,
    private ui: UIPort,
    private llm: LLMProviderPort
  ) {}

  private async updateState(state: AgentState): Promise<AgentState> {
    await this.storage.saveAgentState(state);
    this.ui.renderState(state);
    return state;
  }

  // --- Helpers for Profile Logic ---
  private normalizeText(text: string): string {
    // Collapse whitespace and lowercase
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private async computeHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Minimal Site Registry for Stage 5.2 (Hardcoded for now)
  private getSiteDefinition(siteId: string): SiteDefinition {
    // In a real app, this would come from a repository
    if (siteId.includes('hh.ru')) {
      return {
        id: 'hh.ru',
        name: 'HeadHunter',
        searchStrategy: {
          knownUrls: ['https://hh.ru/search/vacancy/advanced'],
          keywords: ['расширенный поиск', 'advanced search', 'поиск вакансий'],
          maxSteps: 3
        }
      };
    }
    // Default fallback
    return {
      id: siteId,
      name: siteId,
      searchStrategy: {
        knownUrls: [],
        keywords: ['search', 'jobs'],
        maxSteps: 3
      }
    };
  }
  // --------------------------------

  async startLoginFlow(state: AgentState, url: string): Promise<AgentState> {
    let currentState = { ...state, status: AgentStatus.STARTING, logs: [...state.logs, 'Initializing login flow...'] };
    await this.updateState(currentState);
    
    await this.browser.launch();
    
    currentState = { ...currentState, status: AgentStatus.NAVIGATING, currentUrl: url, logs: [...currentState.logs, `Navigating to ${url}`] };
    await this.updateState(currentState);
    
    await this.browser.navigateTo(url);

    currentState = { 
      ...currentState, 
      status: AgentStatus.WAITING_FOR_HUMAN, 
      logs: [...currentState.logs, 'Waiting for manual login confirmation...'] 
    };
    return this.updateState(currentState);
  }

  async confirmLogin(state: AgentState): Promise<AgentState> {
    if (state.status !== AgentStatus.WAITING_FOR_HUMAN) {
      throw new Error(`Cannot confirm login from status ${state.status}`);
    }

    const newState = { 
      ...state, 
      status: AgentStatus.LOGGED_IN_CONFIRMED, 
      logs: [...state.logs, 'Human login confirmed. Session authenticated.'] 
    };
    return this.updateState(newState);
  }

  async captureContext(state: AgentState): Promise<AgentState> {
    const newState = { ...state, status: AgentStatus.EXTRACTING, logs: [...state.logs, 'Capturing DOM snapshot...'] };
    await this.updateState(newState);
    const snapshot = await this.browser.getDomSnapshot();
    
    const finalState = { 
        ...newState, 
        lastSnapshotTimestamp: Date.now(), 
        logs: [...newState.logs, `Snapshot captured (${snapshot.length} chars)`] 
    };
    return this.updateState(finalState);
  }

  /**
   * Stage 3.1: Skeleton for "One-time Profile Capture".
   */
  async checkAndCaptureProfile(state: AgentState, siteId: string): Promise<AgentState> {
    const logs = [...state.logs, `Checking existing profile for ${siteId}...`];
    let currentState = await this.updateState({ ...state, logs });

    // 1. Check if profile exists
    const existing = await this.storage.getProfile(siteId);
    if (existing) {
      // Stage 4.3: Ensure we reload the spec if we have the profile
      const spec = await this.storage.getTargetingSpec(siteId);
      
      if (spec) {
          // Optimized Path: Spec exists, skip generation
          currentState = { 
            ...currentState, 
            status: AgentStatus.TARGETING_READY,
            activeTargetingSpec: spec, 
            logs: [...currentState.logs, `Profile found. Existing Targeting Spec loaded. Skipping generation.`] 
          };
      } else {
          // Standard Path: Profile exists, Spec missing -> trigger generation
          currentState = { 
            ...currentState, 
            status: AgentStatus.PROFILE_CAPTURED,
            activeTargetingSpec: null, 
            logs: [...currentState.logs, `Profile found! Hash: ${existing.contentHash.substring(0, 8)}...`] 
          };
      }
      return this.updateState(currentState);
    }

    // 2. If unknown, we need user navigation
    currentState = { 
      ...currentState, 
      status: AgentStatus.WAITING_FOR_PROFILE_PAGE,
      logs: [...currentState.logs, `Profile unknown. Waiting for user to navigate to profile page...`]
    };
    return this.updateState(currentState);
  }

  /**
   * Stage 3.3: Capture, Normalize, Hash, and Compare.
   */
  async executeProfileCapture(state: AgentState, siteId: string): Promise<AgentState> {
      let newState = { ...state, status: AgentStatus.EXTRACTING, logs: [...state.logs, 'Extracting profile data...'] };
      await this.updateState(newState);

      // 1. Extract
      const url = await this.browser.getCurrentUrl();
      const rawContent = await this.browser.getPageTextMinimal();
      
      // 2. Normalize
      const normalizedContent = this.normalizeText(rawContent);
      
      // 3. Hash
      const hash = await this.computeHash(normalizedContent);

      // 4. Compare with existing (if any)
      const existing = await this.storage.getProfile(siteId);
      let logMsg = '';
      
      if (existing && existing.contentHash === hash) {
          logMsg = `Profile content identical (Hash: ${hash.substring(0,8)}). Timestamp updated.`;
      } else if (existing) {
          logMsg = `Profile changed! (Old: ${existing.contentHash.substring(0,8)} -> New: ${hash.substring(0,8)}). Updated.`;
      } else {
          logMsg = `Profile captured for first time. Hash: ${hash.substring(0,8)}.`;
      }

      const profile: ProfileSnapshot = {
          siteId,
          capturedAt: Date.now(),
          sourceUrl: url,
          rawContent: normalizedContent,
          contentHash: hash
      };

      await this.storage.saveProfile(profile);

      newState = { 
          ...newState, 
          status: AgentStatus.PROFILE_CAPTURED, 
          logs: [...newState.logs, logMsg] 
      };
      return this.updateState(newState);
  }

  /**
   * Stage 4.2: Derive Targeting Spec from Profile (LLM)
   */
  async generateTargetingSpec(state: AgentState, siteId: string): Promise<AgentState> {
    // 1. Verify Profile
    const profile = await this.storage.getProfile(siteId);
    if (!profile) {
      return this.failSession(state, "Cannot generate targeting: Profile not found.");
    }

    // 2. Update Status
    let currentState = await this.updateState({ 
      ...state, 
      status: AgentStatus.TARGETING_PENDING,
      logs: [...state.logs, 'Initializing AI Analysis of profile...']
    });

    // 3. Prepare Input
    const config = await this.storage.getConfig();
    const input: ProfileSummaryV1 = {
      siteId,
      profileHash: profile.contentHash,
      profileTextNormalized: profile.rawContent,
      userConstraints: {
        preferredWorkMode: config?.workMode || WorkMode.ANY,
        minSalary: config?.minSalary || null,
        currency: config?.currency || 'RUB',
        city: config?.city || null,
        targetLanguages: config?.targetLanguages || ['ru']
      }
    };

    try {
      // 4. Call LLM (Single Shot)
      currentState = await this.updateState({ 
        ...currentState, 
        logs: [...currentState.logs, 'Sending profile to LLM for targeting generation...']
      });
      
      const spec = await this.llm.analyzeProfile(input);

      // 5. Validate Output (Strict)
      this.validateTargetingSpec(spec);

      // 6. Save Result
      await this.storage.saveTargetingSpec(siteId, spec);

      // 7. Complete
      const finalState = {
        ...currentState,
        status: AgentStatus.TARGETING_READY,
        activeTargetingSpec: spec, // Stage 4.3: Store spec in state for UI
        logs: [...currentState.logs, 'Targeting specification generated and saved.']
      };
      return this.updateState(finalState);

    } catch (e: any) {
      console.error(e);
      const errorState = {
        ...currentState,
        status: AgentStatus.TARGETING_ERROR,
        logs: [...currentState.logs, `LLM Analysis Failed: ${e.message}`]
      };
      return this.updateState(errorState);
    }
  }

  private validateTargetingSpec(spec: TargetingSpecV1): void {
    if (!spec.targetRoles.ruTitles.length && !spec.targetRoles.enTitles.length) {
      throw new Error("LLM returned empty target roles.");
    }
    if (spec.titleMatchWeights.exact < 0 || spec.titleMatchWeights.exact > 1) {
       throw new Error("Invalid weight range.");
    }
  }

  // --- Stage 5.2: Auto-Navigation to Search ---
  async navigateToSearchPage(state: AgentState, siteId: string): Promise<AgentState> {
    let currentState = await this.updateState({ 
      ...state, 
      status: AgentStatus.NAVIGATING_TO_SEARCH,
      logs: [...state.logs, `Initiating auto-navigation to search page for ${siteId}...`]
    });

    const siteDef = this.getSiteDefinition(siteId);
    const strategy = siteDef.searchStrategy;

    try {
      // Strategy 1: Known Direct URLs
      if (strategy.knownUrls.length > 0) {
        const target = strategy.knownUrls[0];
        currentState = await this.updateState({ 
            ...currentState, 
            logs: [...currentState.logs, `Using known direct URL: ${target}`] 
        });
        await this.browser.navigateTo(target);
        // Assume success for now, or check URL
        return this.updateState({
          ...currentState,
          status: AgentStatus.SEARCH_PAGE_READY,
          logs: [...currentState.logs, `Navigation completed (Direct URL).`]
        });
      }

      // Strategy 2: Heuristic Search (Find Links)
      let steps = 0;
      currentState = await this.updateState({ 
          ...currentState, 
          logs: [...currentState.logs, `No direct URL. Scanning page for keywords: [${strategy.keywords.join(', ')}]...`] 
      });

      while (steps < strategy.maxSteps) {
         const links = await this.browser.findLinksByTextKeywords(strategy.keywords);
         
         if (links.length > 0) {
             const bestLink = links[0]; // Take first match
             currentState = await this.updateState({ 
                ...currentState, 
                logs: [...currentState.logs, `Found link: "${bestLink.text}" (${bestLink.href}). Clicking...`] 
             });
             await this.browser.clickLink(bestLink.href);
             
             // Simple heuristic: If we clicked, we assume we are transitioning
             return this.updateState({
                ...currentState,
                status: AgentStatus.SEARCH_PAGE_READY,
                logs: [...currentState.logs, `Navigation completed (Link Click).`]
             });
         }
         
         steps++;
         if (steps < strategy.maxSteps) {
            // Wait/Retry or check if page changed (omitted for brevity in skeleton)
             await new Promise(r => setTimeout(r, 1000));
         }
      }

      // Fallback: Failed to find
      return this.updateState({
        ...currentState,
        status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE,
        logs: [...currentState.logs, `Auto-navigation failed. Could not find search page links. Please navigate manually.`]
      });

    } catch (e: any) {
       console.error(e);
       return this.updateState({
        ...currentState,
        status: AgentStatus.WAITING_FOR_HUMAN_ASSISTANCE,
        logs: [...currentState.logs, `Navigation Error: ${e.message}. Please navigate manually.`]
      });
    }
  }

  async resetProfileData(state: AgentState, siteId: string): Promise<AgentState> {
      await this.storage.resetProfile(siteId);
      await this.storage.deleteTargetingSpec(siteId); // Stage 4.3: Cascade delete
      
      const logs = [...state.logs, `Profile data and targeting rules for ${siteId} cleared.`];
      return this.updateState({ 
        ...state, 
        activeTargetingSpec: null, // Clear from state
        logs 
      });
  }

  async completeSession(state: AgentState): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.COMPLETED, logs: [...state.logs, 'Sequence completed successfully.'] };
      return this.updateState(newState);
  }

  async failSession(state: AgentState, error: string): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.FAILED, logs: [...state.logs, `Sequence failed: ${error}`] };
      return this.updateState(newState);
  }
  
  async abortSession(state: AgentState): Promise<AgentState> {
      const newState = { ...state, status: AgentStatus.IDLE, logs: [...state.logs, 'Aborted by user.'] };
      return this.updateState(newState);
  }

  async resetSession(state: AgentState): Promise<AgentState> {
      const newState = createInitialAgentState();
      newState.logs = ['Session reset by user.'];
      await this.browser.close();
      return this.updateState(newState);
  }
}