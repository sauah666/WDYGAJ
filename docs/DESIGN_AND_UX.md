
# Design & User Experience Guide

## Design Philosophy: "Industrial Cyberpunk"

The interface of **AgentSeeker** (aka "Кузница Кадров") is designed not as a generic SaaS application, but as a specialized, tactical tool for an operator. It draws inspiration from:
*   Old Operating Systems (retro-futurism).
*   Industrial Machinery (gauges, bolts, heavy switches).
*   Noir & Cyberpunk aesthetics (Shadows, Neon on Rust, CRT effects).

### Color Palette
*   **Backgrounds**: `#0a0503` (Deep Void), `#140c08` (Dark Iron), `#2a2420` (Leather/Rust).
*   **Accents**: `#d97706` (Amber/Signal Orange), `#b45309` (Bronze).
*   **Text**: `#e7e5e4` (Old Paper), `#78716c` (Faded Ink).
*   **Status**: `#22c55e` (Terminal Green), `#ef4444` (Crisis Red).

### Typography
*   **Headings**: `Inter` (Sans-serif) - Strict, legible, functional.
*   **Data/Logs**: `JetBrains Mono` - Terminal output, raw data.
*   **Flavor**: Occasional `Serif` accents for "Legacy" feel.

---

## Key UI Components

### 1. The Orb ("Valera")
*   **Role**: The personification of the Agent.
*   **Behavior**:
    *   **Idle**: Pulses gently, plays a seamless loop video.
    *   **Working**: Moves to the top-left corner, minimizes to allow focus on the workspace.
    *   **Relocated**: Transitions smoothly between "Intro Mode" (large) and "Dashboard Mode" (small).
*   **UX Note**: Users should feel like they are issuing commands to a distinct entity, not just clicking buttons.

### 2. The Browser Viewport
*   **Visuals**: Styled like an old OS window (`Win95` meets `Fallout`).
*   **Purpose**: Shows the user exactly what the agent is "seeing" or doing.
*   **Mock Mode**: Simulates typing, loading bars, and fake websites to give feedback during development/demo.
*   **Remote Mode**: Mirrors the actual state of the headless browser.

### 3. The Log/Message Module
*   **Visuals**: Typewriter effect (`typedMessage`).
*   **Content**: Dark humor provided by `JokeService`. The agent complains about salary, location, and the futility of existence, adding personality to boring waiting times.

### 4. Navigation Control (Sidebar)
*   **Concept**: Physical levers and buttons rather than "Links".
*   **State**: Highlights the active "Mode" (Rubka, Mechanica).

---

## User Flows

### Flow A: Quick Start (Default)
1.  **Launch**: User opens the app. "Valera" greets them in the **Mode Selection** screen.
2.  **Parameters**: User sets Salary, Location, and Work Mode directly on the landing panel.
3.  **Run**: User clicks **"Начать Поиск"**.
    *   *Result*: Agent launches immediately targeting `hh.ru`.

### Flow B: Advanced Setup
1.  **Launch**: User opens app.
2.  **Switch**: User clicks the **Globe Icon** ("Сменить Платформу") in the header.
3.  **Site Selection**: User chooses a platform (e.g., `hh.ru`, `LinkedIn` [Locked]).
4.  **Job Preferences**: A dedicated screen allows finer tuning:
    *   Salary & Currency.
    *   Location (City).
    *   Work Mode (Multiple selection).
    *   **Cover Letter Template**: Edit the default text.
5.  **Confirm**: User clicks **"Подтвердить"**.
    *   *Result*: Agent launches with custom settings.

### Flow C: The Autonomous Loop
1.  **Login**: If credentials missing, Agent pauses. User enters them in the simulated browser.
2.  **Profiling**: Agent scans user profile to build `TargetingSpec`.
3.  **Search**: Agent navigates, filters, and scrapes vacancies (Batch of 15).
4.  **Screening**: De-duplication -> Prefilter -> LLM Screen -> Extraction -> Evaluation.
5.  **Apply**: Agent fills form, checks for questionnaires, submits.
6.  **Rotation**: If batch finished, switches to next Role Keyword.

### Flow D: Post-Run & Amnesia
1.  **Stop**: User interrupts the session.
2.  **Report**: Summary Overlay shows applied/skipped stats.
3.  **Amnesia**: User clicks **Brain Icon** to wipe session memory (seen vacancies + history) to start fresh.

---

## Future UX Considerations for Agents

*   **Blind Spots**: Currently, the "Retry" logic for failed applications is basic. Future agents should implement a "Draft Recovery" mode.
*   **Expansion**: The `SiteRegistry` is designed for `LinkedIn`, but UI selectors for it are disabled.
*   **Accessibility**: The high-contrast dark mode is good, but screen reader support on the custom "Browser Viewport" needs verification.
