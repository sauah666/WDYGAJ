
# Dev Log Notes & Handover Manifesto

**Date**: 06.02.2026
**Author**: Senior Agent Architect (Release Candidate 1.5)
**Status**: CRITICAL ARCHITECTURAL AUDIT & HANDOVER

---

## 1. Executive Summary: The "Brain in a Vat" Paradox

As of today, **AgentSeeker** (Project "Кузница Кадров") is a highly sophisticated "Brain in a Vat". 

*   **The Brain (Frontend + Core)**: It is fully functional. It can plan, reason, analyze DOM structures (via LLM), manage state, and render a high-fidelity "Industrial Cyberpunk" interface. The logic for job searching is sound.
*   **The Hands (Execution)**: They are missing or simulated. The `MockBrowserAdapter` creates a convincing illusion of work, but the `PlaywrightBrowserAdapter` cannot run in a standard browser environment due to security sandboxing.

**Verdict**: The project is **READY** for demo/simulation but **NOT READY** for real-world deployment without an Infrastructure Lift (Electron or Companion Server).

---

## 2. Full Scale Architecture Audit (Step 59 Post-Mortem)

### 2.1. Backend Logic (Core)
*   **Domain Layer**:
    *   *Strength*: Strong typing and separation of concerns. `AgentState` is comprehensive.
    *   *Risk*: **Batching Policy**. We increased batch size to 50 for visual effect ("Scanner Mode"). `VacancyCardBatchV1` stores full objects. `AgentState` might hit the browser's 5MB `localStorage` limit after 3-4 runs if logs aren't aggressively pruned.
    *   *Observation*: `AgentUseCase` is approaching "God Object" status. It handles navigation, parsing, LLM orchestration, and memory management. It should be split in v2.0.

### 2.2. Adapters (The Integration Gap)
*   **BrowserPort (Critical)**:
    *   `MockBrowserAdapter`: Excellent implementation. It simulates latency, DOM structures, and even specific CSS selectors for the "Scanner" UI.
    *   `PlaywrightBrowserAdapter`: Technically correct code, but dead weight in a web build. It requires Node.js bindings.
    *   `RemoteBrowserAdapter`: A client-side stub. It expects a server at `http://localhost:3000` which *does not exist* in this repository.
*   **LLMAdapter**:
    *   `GeminiLLMAdapter`: Functional but naive. It lacks **Rate Limiting**. Scanning 50 vacancies in parallel (or even serially without delays) will trigger HTTP 429 errors from Google immediately.

### 2.3. Frontend (UI/UX)
*   **Visuals**: The "Retrofuturistic Videophone" and "Scanner" modes are aesthetically perfect but heavy.
*   **Performance**:
    *   `Three.js` background runs outside React (good), but consumes GPU.
    *   **Render Cycle**: The `AgentPresenter` calls `forceUpdate` (via `useState`) on every log line. With high-speed logs, this causes full-tree re-renders. In a real run, the UI might freeze during heavy processing.
*   **Architecture Violation**: `JokeService` accesses `localStorage` directly. This was a pragmatic decision to decouple UI "fluff" from core "business state", but it is technically a violation of the Clean Architecture boundary.

---

## 3. Road to Real Launch (The "Body" Project)

To make this agent functional in the real world, you must choose one of two paths:

### Path A: The Electron Shell (Recommended)
Wrap this entire React application in **Electron**.
1.  **Main Process**: Runs Node.js. Import `playwright` here.
2.  **Renderer Process**: Runs this React App.
3.  **IPC Bridge**: Replace `RemoteBrowserAdapter` with an `ElectronBrowserAdapter` that sends IPC messages to the Main Process to execute Playwright commands.
*   *Pros*: Zero latency, full control, no CORS issues, no separate server.
*   *Cons*: App becomes a desktop binary, not a website.

### Path B: The Companion Server
Build a separate Node.js microservice (`agent-runner`).
1.  **API**: Expose endpoints like `POST /navigate`, `POST /scan`, `POST /click`.
2.  **Implementation**: Map these endpoints to the existing `PlaywrightBrowserAdapter`.
*   *Pros*: Keeps the UI as a web app.
*   *Cons*: Security nightmare (sending cookies/sessions over HTTP), latency, complexity of running two apps.

---

## 4. Hidden Traps for the Next Agent

1.  **The 50-Item Batch**:
    *   The UI expects 50 items to look cool (scrolling matrix effect).
    *   The LLM (Gemini 2.0 Flash) has a massive context window, so it *can* handle screening 50 items.
    *   **Trap**: The network cannot. Fetching 50 vacancy pages for "Extraction" (Phase D) will take forever or get banned by `hh.ru` anti-bot protection.
    *   *Fix*: Implement a "Sliding Window" in `AgentUseCase`. Process items in sub-batches of 5, even if the main batch is 50.

2.  **The "Pause" Race Condition**:
    *   If the user clicks "Pause" while an LLM request is in flight, the `AgentUseCase` might update the state *after* the pause, potentially overwriting the "Paused" status or triggering the next step automatically.
    *   *Fix*: The `AgentPresenter.runAutomationLoop` has a check for `latestState.isPaused`, but deep async logic in UseCase needs strict cancellation tokens.

3.  **Mock vs Real Selectors**:
    *   `MockBrowserAdapter` uses selectors like `mock://vacancy/apply-button`.
    *   Real sites use complex, dynamic selectors (e.g., `[data-qa="vacancy-response-link-top"]`).
    *   **Trap**: The `SearchUISpec` generated by LLM might suggest selectors that Playwright can't find if the DOM is Shadow DOM or iframes.

---

## 5. Final Words

This system is a Porsche engine mounted on a wooden cart. It looks fast and sounds loud, but it needs a chassis (Electron/Server) to actually hit the road. 

Focus your next sprint purely on **Infrastructure**, not Logic. The Logic is done.

---

## 6. Lessons Learned (Steps 123-126)

Following the implementation of Electron/MCP support and subsequent stabilization fixes, several critical architectural lessons were observed:

### 6.1. The "Invisible Orb" (UI/State Race Condition)
*   **Problem**: The "Orb" (Valera) would sometimes disappear or misalign when transitioning from the `ModeSelectionScreen` (Tablet) to the `AgentStatusScreen` (Runner).
*   **Cause**: The Orb's position is calculated using `getBoundingClientRect()` relative to a DOM element (`avatarRef`). However, the parent container (`Main Panel`) was animating its opacity and scale (CSS `animate-switch-on`) at the same time. The layout calculation often fired *before* the browser had finished the layout reflow of the appearing panel, resulting in `0,0` coordinates or stale positions.
*   **Fix**: Introduced `useLayoutEffect` combined with a `setTimeout` inside the component to force a recalculation *after* the paint cycle and a slight delay to allow CSS transitions to settle.
*   **Lesson**: When animating complex "Portal" elements that move between screens (like the Orb), never trust the initial render ref. Always double-check position after the transition completes.

### 6.2. The "Amnesiac Pipeline" (State Hydration)
*   **Problem**: The agent would successfully capture a profile, but if the page was refreshed or the agent restarted, the pipeline would stall at `VACANCIES_EXTRACTED` -> `EVALUATING_CANDIDATES`.
*   **Cause**: The `AgentUseCase` relies on `state.activeProfileSnapshot` to generate prompts for the LLM. While `profile` was saved to `LocalStorage`, the `AgentState` object rehydrated from storage *did not* automatically populate this field in every scenario (it was treated as a transient reference in some paths).
*   **Fix**: Updated `checkAndCaptureProfile` and `executeProfileCapture` to explicitly write the loaded/captured profile into `AgentState.activeProfileSnapshot` immediately.
*   **Lesson**: Critical context data required for LLM prompts (Profile, Targeting Spec) must be treated as **First-Class State Citizens**, not just side-loaded artifacts in Storage. If it's not in `AgentState`, the automaton cannot "see" it.

### 6.3. The Cost of Immersion (Performance)
*   **Observation**: The addition of `Three.js` (Steam Engine), `Atropos` (3D Tilt), and multiple `<video>` layers creates a significant GPU load. On lower-end devices, this can cause input lag.
*   **Trade-off**: We accepted this cost to achieve the "Industrial Cyberpunk" aesthetic (`Diegetic UI`), reasoning that the target user (Job Seeker) is likely on a desktop environment.
*   **Mitigation**: `SteamEngineBackground` is memoized and runs outside the React render cycle, but browser compositing is still heavy. Future optimization: Add a "Low Quality" toggle in Settings.

### 6.4. Resume Selection Logic
*   **Challenge**: Job sites often have multiple resumes. The agent needs to know *which* one to pick.
*   **Solution**: Added `targetResumeTitle` to `AgentConfig`. Updated `BrowserPort` with `selectOption`.
*   **Lesson**: Simple text input is often robust enough for matching. We don't need complex AI matching for the resume dropdown; a substring match ("Frontend") works perfectly for "Frontend Developer". Keep adapters simple.
