import * as THREE from 'three';
import { Building } from './Building.js';

/**
 * BuildingManager — defines and creates all 5 village buildings.
 *
 * Each building has a unique name, size, accent color, and set of
 * searchable furniture locations. The RandomizationManager picks
 * one location per building to hide the clue.
 */

const CONFIGS = [
  {
    name: 'Abandoned House',
    width: 22, depth: 20, height: 5,
    position: new THREE.Vector3(-50, 0, -50),
    accentColor: 0xff4444, // Bright Red
    searchableLocations: [
      { name: 'table',   x:  2,   z:  0   },
      { name: 'drawer',  x: -4,   z: -3   },
      { name: 'shelf',   x:  4,   z: -3   },
      { name: 'cabinet', x: -4,   z:  2   },
      { name: 'bedroom', x:  3,   z:  3   },
      { name: 'storage', x: -2,   z: -3.5 },
    ],
  },
  {
    name: 'Old Medical Center',
    width: 24, depth: 20, height: 5,
    position: new THREE.Vector3(50, 0, -40),
    accentColor: 0x4488ff, // Bright Blue
    searchableLocations: [
      { name: 'table',    x:  0,   z: -2 },
      { name: 'drawer',   x: -5,   z:  0 },
      { name: 'shelf',    x:  5,   z: -3 },
      { name: 'cabinet',  x: -5,   z: -3 },
      { name: 'bathroom', x:  4,   z:  2 },
      { name: 'storage',  x: -3,   z:  3 },
    ],
  },
  {
    name: 'Abandoned Grocery Store',
    width: 26, depth: 20, height: 5,
    position: new THREE.Vector3(-10, 0, 20),
    accentColor: 0x44cc44, // Bright Green
    searchableLocations: [
      { name: 'table',    x: -4,   z:  0   },
      { name: 'shelf',    x:  6,   z: -3   },
      { name: 'cabinet',  x:  4,   z:  2   },
      { name: 'drawer',   x: -6,   z: -3   },
      { name: 'storage',  x:  5,   z:  3   },
      { name: 'basement', x:  0,   z:  3   },
    ],
  },
  {
    name: 'Old Warehouse',
    width: 28, depth: 22, height: 5,
    position: new THREE.Vector3(55, 0, 45),
    accentColor: 0xaaaaaa, // Light Grey
    searchableLocations: [
      { name: 'table',    x:  0,   z:  0   },
      { name: 'shelf',    x: -7,   z: -4   },
      { name: 'cabinet',  x:  7,   z: -4   },
      { name: 'storage',  x: -5,   z:  3   },
      { name: 'drawer',   x:  5,   z:  3   },
      { name: 'basement', x:  0,   z: -4   },
    ],
  },
  {
    name: 'Abandoned Farmhouse',
    width: 24, depth: 20, height: 5,
    position: new THREE.Vector3(-45, 0, 60),
    accentColor: 0xffaa44, // Bright Orange
    searchableLocations: [
      { name: 'table',    x:  0,   z: -1  },
      { name: 'drawer',   x: -5,   z: -3  },
      { name: 'bedroom',  x:  4,   z:  2  },
      { name: 'cabinet',  x: -4,   z:  2  },
      { name: 'shelf',    x:  5,   z: -3  },
      { name: 'bathroom', x: -5,   z:  3  },
    ],
  },
];

export class BuildingManager {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
  }

  /** Return raw config data (used by RandomizationManager). */
  getBuildingConfigs() {
    return CONFIGS;
  }

  /**
   * Create all 5 buildings with clue locations from the random config.
   * @param {{ buildings: Array<{ buildingIndex: number, clueLocation: string }> }} randomConfig
   */
  createBuildings(randomConfig) {
    this.buildings = [];

    CONFIGS.forEach((cfg, i) => {
      const clueEntry = randomConfig.buildings.find(b => b.buildingIndex === i);
      const building = new Building({
        ...cfg,
        buildingIndex: i,
        clueLocation: clueEntry ? clueEntry.clueLocation : null,
      });

      this.buildings.push(building);
      this.scene.add(building.group);
    });

    console.log(`[BuildingManager] Created ${this.buildings.length} buildings`);
  }

  /** Aggregate all building colliders. */
  getColliders() {
    return this.buildings.flatMap(b => b.getColliders());
  }

  /** Aggregate all interactable furniture meshes. */
  getInteractables() {
    return this.buildings.flatMap(b => b.getInteractables());
  }

  update(dt) {
    this.buildings.forEach(b => b.update(dt));
  }
}
