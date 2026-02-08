
# Design & User Experience Guide

## Design Philosophy: "Industrial Cyberpunk"

The interface of **AgentSeeker** (aka "Кузница Кадров") is designed not as a generic SaaS application, but as a specialized, tactical tool for an operator. It draws inspiration from:
*   Old Operating Systems (retro-futurism).
*   Industrial Machinery (gauges, bolts, heavy switches).
*   Noir & Cyberpunk aesthetics (Shadows, Neon on Rust, CRT effects).
*   **The Device**: The main entry point resembles a physical communication device (Tablet/Padd) from an alternate timeline.

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

### 1. The Steampunk Tablet (Mode Selection)
*   **Concept**: A vertical, handheld-style device chassis.
*   **Visuals**: 
    *   **Frame**: Dark bronze/leather texture with side piping.
    *   **Header**: Contains an **Analog Gauge** (left) and an **LED Counter** (right, showing application count).
    *   **Footer**: Flanked by two **Vacuum Tubes** (Orange/Green) that pulse to indicate system readiness.
*   **Inputs (The "Slots")**:
    *   **Salary**: Numeric tumbler-style input. Maps to `AgentConfig.minSalary`.
    *   **Location**: Dropdown menu ("Москва", "СПБ", "Global"). Maps to `AgentConfig.city`.
    *   **Mode Switch**: 3-state toggle (Remote/Hybrid/Office). Maps to `AgentConfig.targetWorkModes`.
    *   **Letter Generator**: A physical switch toggling between "Manual" (Typewriter) and "Auto" (AI Brain). Includes a **Refresh Button** to purge and regenerate the AI letter.
    *   **Resume Selector**: A text input allowing the user to specify the *exact title* of the resume to use on the target site (e.g., "Frontend Developer"). Maps to `AgentConfig.targetResumeTitle`.

### 2. The Orb ("Valera")
*   **Role**: The personification of the Agent.
*   **Behavior**:
    *   **Idle**: Pulses gently in the upper dock of the Tablet (Loop Video).
    *   **Wake Up**: When the "Call" button is pressed, the Orb activates (Intro Video).
    *   **Transition (The "Code Rain")**: A video overlay of falling code floods the bottom of the screen during the transition from the Tablet to the Agent Runner, symbolizing the connection to the digital matrix.
    *   **Runner Mode**: Relocates to the corner to oversee the browser work.
    *   **Amnesia Mode**: When wiping memory, the Orb expands to fill the screen, creating a dramatic "Mind Wipe" effect.

### 3. The Browser Viewport
*   **Visuals**: Styled like an old OS window (`Win95` meets `Fallout`).
*   **Modes**:
    *   **Standby**: CRT noise and "WAITING FOR SIGNAL" pulse when the agent is IDLE.
    *   **Mock/Remote**: Displays the simulated or actual web content.
    *   **Scanner/Terminal**: A special visual mode during `VACANCIES_CAPTURED` status. It renders the batch of 50 found vacancies as a scrolling list with a "laser scan" effect.

### 4. The Log/Message Module
*   **Visuals**: Typewriter effect (`typedMessage`) on a cardboard-textured panel.
*   **Content**: Dark humor provided by `JokeService`.

### 5. Atmospherics (Three.js)
*   **Component**: `SteamEngineBackground` in `Layout.tsx`.
*   **Effect**: A 3D wireframe steam engine rotates slowly in the background.

---

## Decision Log & Design Decisions

### Accepted Design Patterns
1.  **Vertical Device Layout**: Instead of a full-screen dashboard, the main control interface is constrained to a vertical "Tablet" container (`max-w-[600px]`). This creates a focused, mobile-first aesthetic even on desktop.
2.  **Video-Based Transitions**: Using `<video>` elements for the "Orb" states (Idle/Wake/Standby) instead of CSS animations allowed for higher fidelity and a "cinematic" feel.
3.  **Diegetic Controls**: Buttons look like physical objects (convex glass, metal rims). Inputs look like "slots" in a machine.
4.  **Dark Humor**: The `JokeService` acts as the "soul" of the machine, mocking the user's salary expectations. This was accepted to increase user engagement and retention.

### Rejected / Deprecated Patterns
1.  **Standard Material/Bootstrap UI**: Rejected as "Soulless SaaS".
2.  **Horizontal Stepper**: Initially considered for the setup flow, but rejected in favor of a "One-Page Dashboard" to minimize clicks.
3.  **Light Mode**: Strict prohibition on light themes. The cyberpunk aesthetic demands high contrast on dark backgrounds.
4.  **Passive Loading Spinners**: Replaced with "Active" indicators (pulsing Vacuum Tubes, rotating Gears) to maintain immersion during async operations.

### User Preference Logic (Persistence)
*   **LocalStorage**: All UI preferences (Salary, City, Mode) are persisted immediately to `AgentConfig` in `localStorage`.
*   **Reactive**: The UI listens to `AgentState` changes. If the Agent is "Wiped" (Amnesia), the UI components reset visual state but *Config* remains (unless fully purged).
*   **Validation**: The "Start" button (`PowerIcon`) remains physically disabled (grayed out, non-interactive) until critical "Slots" (Mode, Letter) are filled. This provides immediate visual feedback on readiness.
