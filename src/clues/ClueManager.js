import * as THREE from 'three';
import { Clue } from './Clue.js';
import { CLUE_DATA } from './ClueData.js';

/**
 * ClueManager — creates and manages clue objects in the scene.
 *
 * Clues are placed at world-space positions derived from each building's
 * randomly assigned clue location.
 */
export class ClueManager {
  constructor(scene, inventory) {
    this.scene = scene;
    this.inventory = inventory;
    this.clues = [];
  }

  /**
   * Create clue objects based on the random config.
   * @param {Array} buildings — Building instances
   * @param {{ buildings: Array<{ buildingIndex: number, clueLocation: string }> }} randomConfig
   */
  createClues(buildings, randomConfig) {
    this.clear();

    randomConfig.buildings.forEach((cfg, i) => {
      const building = buildings[cfg.buildingIndex];
      const worldPos = building.getClueWorldPosition();

      if (!worldPos) {
        console.warn(`[ClueManager] No clue position for building ${cfg.buildingIndex}`);
        return;
      }

      const clue = new Clue({
        id: `clue_${i}`,
        buildingIndex: cfg.buildingIndex,
        locationName: cfg.clueLocation,
        data: CLUE_DATA.find(d => d.buildingIndex === cfg.buildingIndex),
      });

      clue.setPosition(worldPos.x, worldPos.y, worldPos.z);
      this.clues.push(clue);
      this.scene.add(clue.group);
    });

    console.log(`[ClueManager] Created ${this.clues.length} clues`);
  }

  /** Animate clues each frame. */
  update(dt) {
    this.clues.forEach(c => c.update(dt));
  }

  /** Collect a clue and add it to the inventory. */
  collectClue(clue) {
    const data = clue.collect();
    return this.inventory.addClue(data);
  }

  getClueCount() { return this.inventory.getClueCount(); }
  hasAllClues()  { return this.inventory.hasAllClues(); }

  clear() {
    this.clues.forEach(c => this.scene.remove(c.group));
    this.clues = [];
  }
}
