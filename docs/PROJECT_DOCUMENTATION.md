
## Phase G3.0.1: Fix Pack (Smoke & Batching)
- **Smoke Tests**: Updated to rely on functional state (status codes, button presence) rather than visual CSS classes.
- **Batch Enforcement**: 
  - Strict 10-15 item window.
  - Exception: Batches < 10 are permitted **only** if `endOfResults` signal is present from the source.
  - Otherwise, execution is deferred (blocked) to accumulate more items.
- **Compaction**: Uses deterministic policy constants (`DEFAULT_COMPACTION_POLICY`) instead of magic numbers.
