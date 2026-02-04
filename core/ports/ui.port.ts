// Layer: PORTS
// Purpose: Define contract for UI updates (Output Port).

import { AgentState } from '../domain/entities';

export interface UIPort {
  /**
   * Updates the UI with the latest agent state.
   */
  renderState(state: AgentState): void;
}