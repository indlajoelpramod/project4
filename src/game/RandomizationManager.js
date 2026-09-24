/**
 * RandomizationManager — generates random clue locations for each new game.
 *
 * Every building has a set of searchable locations (table, drawer, shelf, etc.).
 * This manager picks one random location per building to hide the clue.
 * A new configuration is generated on every New Game or Restart.
 */
export class RandomizationManager {
  constructor() {
    this.config = null;
  }

  /**
   * Generate a new random clue configuration.
   * @param {Array} buildingConfigs — array of building config objects,
   *   each with a `searchableLocations` array.
   * @returns {{ buildings: Array<{ buildingIndex: number, clueLocation: string }> }}
   */
  generate(buildingConfigs) {
    this.config = {
      buildings: buildingConfigs.map((bc, index) => {
        const locations = bc.searchableLocations.map(l => l.name);
        const randomIndex = Math.floor(Math.random() * locations.length);
        return {
          buildingIndex: index,
          clueLocation: locations[randomIndex]
        };
      })
    };

    console.log(
      '[RandomizationManager] New clue config:',
      this.config.buildings.map(b => `B${b.buildingIndex + 1}:${b.clueLocation}`).join(', ')
    );

    return this.config;
  }

  /** Get the clue location name for a specific building. */
  getClueLocationForBuilding(buildingIndex) {
    if (!this.config) return null;
    const entry = this.config.buildings.find(b => b.buildingIndex === buildingIndex);
    return entry ? entry.clueLocation : null;
  }
}
