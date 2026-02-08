
# ⚠️ Manual Actions Required (Patch 1.0)

**Date**: 06.02.2026
**Priority**: CRITICAL (Infrastructure Lift)

The system architecture has been upgraded to support **Electron**, allowing the agent to control a real local browser instance (`Playwright`) instead of running in a simulation (`Mock`).

Since the AI Architect cannot execute shell commands or install system packages, **YOU (The Operator)** must perform the following steps to finalize the upgrade.

---

## 1. Install Dependencies

The `package.json` has been created with the necessary dependencies. Run the following commands in your project root:

```bash
# 1. Install Node modules
npm install

# 2. Install Playwright Browsers (Required for automation)
npx playwright install chromium
```

## 2. Launch in Electron Mode

Do not use `live-server` or simple HTTP servers anymore for full functionality. Use the npm script:

```bash
npm start
```

*Expected Result*: A native application window should open. The "Machinarium" interface will load.

## 3. Verify System Capabilities

1.  Go to **Settings** (Gear Icon).
2.  Check if **Run Mode** defaults to `Electron / Playwright` (it should happen automatically).
3.  The agent now has "Hands". It can open real browser windows.

## Troubleshooting

*   **Error**: `Electron API not found`
    *   *Cause*: You are likely still running in a standard web browser (Chrome/Edge).
    *   *Fix*: You must run via `npm start`.
*   **Error**: `Playwright not found`
    *   *Cause*: `npm install` was skipped or failed.
    *   *Fix*: Run `npm install` and `npx playwright install`.

---

**Next Steps (Automated by AI in next patches):**
- Storage Migration to IndexedDB (Patch 1.1)
- Service Decomposition (Patch 2.0)
- Onboarding Wizard (Patch 3.0)
