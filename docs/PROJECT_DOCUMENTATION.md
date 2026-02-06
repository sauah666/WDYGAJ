
## Phase G3.0.1: Fix Pack (Smoke & Batching)
- **Smoke Tests**: Updated to rely on functional state (status codes, button presence) rather than visual CSS classes.
- **Batch Enforcement**: 
  - Strict 10-15 item window.
  - Exception: Batches < 10 are permitted **only** if `endOfResults` signal is present from the source.
  - Otherwise, execution is deferred (blocked) to accumulate more items.
- **Compaction**: Uses deterministic policy constants (`DEFAULT_COMPACTION_POLICY`) instead of magic numbers.

## Runtime Governance (Manual Fix Pack)
- **Adapter Safety**: Browser bundles no longer crash due to Node.js-only imports (Playwright).
- **Env Detection**: `RuntimeCapabilities` logic automatically detects Browser vs Node Runner environment.
- **Fail-Safe UI**:
  - Impossible options (e.g. Playwright in pure browser) are disabled in Settings.
  - Error screens include "Back to Settings" and "Force Reset" buttons to prevent dead-ends.
  - "Job Title" and "Location" fields are clearly marked as derived/read-only to avoid user confusion.
- **Remote Runner Architecture**: Added infrastructure for `RemoteBrowserAdapter` to communicate with a separate Node process (future proofing).
