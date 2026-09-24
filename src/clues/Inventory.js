/**
 * Inventory — stores collected clues and manages the final key.
 */
export class Inventory {
  constructor() {
    this.clues = [];
    this.hasKey = false;
  }

  reset() {
    this.clues = [];
    this.hasKey = false;
  }

  /**
   * Add a clue to the inventory.
   * @param {{ id: string, buildingIndex: number, locationName: string }} clueData
   * @returns {boolean} true if successfully added
   */
  addClue(clueData) {
    if (this.clues.length >= 5) return false;
    if (this.clues.find(c => c.id === clueData.id)) return false;

    this.clues.push(clueData);
    console.log(`[Inventory] Clue collected: ${clueData.id} (${this.clues.length}/5)`);
    return true;
  }

  getClueCount() {
    return this.clues.length;
  }

  getClues() {
    return this.clues;
  }

  hasAllClues() {
    return this.clues.length >= 5;
  }

  /** Combine all 5 clues into the final key. */
  combineClues() {
    if (!this.hasAllClues()) return false;
    this.hasKey = true;
    console.log('[Inventory] All clues combined — Final Key created!');
    return true;
  }

  hasFinalKey() {
    return this.hasKey;
  }
}
