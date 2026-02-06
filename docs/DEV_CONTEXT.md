
# Developer Context (Save Game)

**Last Updated**: Step 59 (Final Audit & Serialization)
**Role**: Senior Agent Architect
**Manifesto**: See `docs/PROJECT_DOCUMENTATION.md` (Rule D-01)

## Status: Release Candidate 1.1 (READY FOR HANDOVER)

The system is fully functional in **Mock Mode**, architecturally validated, and documented. The UI has been upgraded to the "Retrofuturistic Videophone" standard.

---

## Handover Manifesto: How to Run & Expand

### 1. Modes of Operation

#### Mode A: Mock (Simulation) - **DEFAULT**
*   **Use Case**: Development, UI testing, Flow verification.
*   **Requires**: Nothing.
*   **Behavior**: Browser actions are simulated (`MockBrowserAdapter`), LLM answers are hardcoded (`MockLLMAdapter`), Vacancies are generated (50 items/batch).
*   **Config**: `activeLLMProviderId: 'mock'`, `browserProvider: 'mock'`.

#### Mode B: Real Cloud LLM (Gemini/OpenAI)
*   **Use Case**: Real intelligence testing with Mock Browser.
*   **Requires**: Valid API Key.
*   **Setup**: Go to **Settings** (Gear Icon) -> Select **Google Gemini** -> Enter Key -> Save.
*   **Behavior**: The Agent will really analyze the mock profiles and mock vacancies using Gemini 2.0.

#### Mode C: Local LLM (Ollama/LM Studio)
*   **Use Case**: Privacy-focused AI.
*   **Requires**: Local server running (e.g. LM Studio) at `http://localhost:1234/v1`.
*   **Setup**: Settings -> **Local LLM** -> Enter URL.

#### Mode D: Full Real Automation (Node.js Only)
*   **Use Case**: Actual job application.
*   **Requires**: 
    1. Running this React App.
    2. (Missing) A Node.js server implementing the `RemoteBrowserAdapter` protocol OR running the app in Electron/Node environment where `PlaywrightBrowserAdapter` works natively.
*   **Note**: The code for `PlaywrightBrowserAdapter` and `RemoteBrowserAdapter` (client side) exists, but the **server-side runner** is not included in this client-side bundle.

---

## Critical Files Map

### 🧠 Brain (Logic)
*   `core/usecases/agent.usecase.ts`: **The Heart**. Contains the entire state machine, batching logic, and decision loop (`runAutomationLoop`).
*   `core/domain/entities.ts`: **The DNA**. All data structures. Note `AppliedVacancyRecord` and `VacancyCardBatchV1`.

### 🔌 Adapters (Integration)
*   `adapters/ui/agent.presenter.ts`: **The Bridge**. Connects React to the UseCase. Handles the "Automation Loop" timing.
*   `adapters/browser/mock.browser.adapter.ts`: **The Matrix**. Simulates the external web. **Edit this to change the mock vacancy data**.

### 🎨 Presentation (UI)
*   `presentation/screens/ModeSelectionScreen.tsx`: **The Face**. The main Videophone interface. Contains the Orb logic and dashboard inputs.
*   `presentation/components/BrowserViewport.tsx`: **The Eyes**. Visualizes the "Scanning" process. Contains the CRT effects and auto-scroll logic.
*   `presentation/services/JokeService.ts`: **The Soul**. Contains the text generation logic for "Valera".

---

## Known Limits & Workarounds

1.  **Browser "Stuck"**: If the agent freezes in `WAITING_FOR_HUMAN`, it's because `MockBrowserAdapter` is waiting for a specific login trigger. Click "Войти" in the mock UI.
2.  **Memory**: Use the "Brain" icon (Amnesia) to clear `seen_index` in localStorage if you want to re-scan the same mock vacancies.
3.  **Performance**: The `Three.js` background is optimized but heavy. If lag occurs on low-end devices, consider disabling it in `Layout.tsx`.

## Next Steps for New Owner

1.  **Implement Server Runner**: Create a simple Express/Fastify server that exposes endpoints matching `RemoteBrowserAdapter` calls and uses `Playwright` to drive a real browser.
2.  **LinkedIn Support**: Enable the LinkedIn entry in `SiteRegistry` and update `MockBrowserAdapter` to simulate LinkedIn DOM structure.
3.  **Resume Upload**: Add a real file picker to `ApplyFormProbe` to handle CV uploads (currently mocked).
