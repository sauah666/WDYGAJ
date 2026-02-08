
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
*   **Inputs**: Form fields are styled as inset "slots" within the chassis.

### 2. The Orb ("Valera")
*   **Role**: The personification of the Agent.
*   **Behavior**:
    *   **Idle**: Pulses gently in the upper dock of the Tablet.
    *   **Wake Up**: When the "Call" button is pressed, the Orb activates.
    *   **Transition (The "Code Rain")**: A video overlay of falling code floods the bottom of the screen during the transition from the Tablet to the Agent Runner, symbolizing the connection to the digital matrix.
    *   **Runner Mode**: Relocates to the corner to oversee the browser work.

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

## User Flows

### Flow A: Quick Start (The Device)
1.  **Launch**: User opens the app. The "Steampunk Tablet" is presented.
2.  **Parameters**: User adjusts the form slots:
    *   **Quick Start**: Shows target site (`hh.ru`).
    *   **Salary**: Numeric input.
    *   **Location**: Dropdown.
    *   **Mode**: 3-button toggle (Remote/Hybrid/Office).
    *   **Letter**: Steampunk Switch (Manual/Auto).
3.  **Validation**:
    *   The **Start Button** (Power Icon) sits between the vacuum tubes. It remains gray until valid inputs are provided.
4.  **Call (Wake Up)**:
    *   User presses the floating **Call Button** (Convex Glass style).
    *   *Result*: The Orb pulses, "Code Rain" video plays at the bottom, then the entire UI transitions to the Agent Runner.

### Flow B: Advanced Setup
1.  **Access**: User clicks the **Gear Icon** in the Tablet header.
2.  **Settings**: Full configuration for LLM providers and Runtime.

### Flow C: The Autonomous Loop
1.  **Login** -> **Profiling** -> **Search** -> **Scanning** -> **Apply**.
2.  **Visuals**: The scanning list auto-scrolls, visually indicating "Processing".

### Flow D: Post-Run & Amnesia
1.  **Stop**: User interrupts the session via the "Stop" button.
2.  **Amnesia**: User clicks **Brain Icon** to wipe session memory. The Orb expands to fill the screen during this confirmation.
