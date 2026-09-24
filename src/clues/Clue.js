import * as THREE from 'three';

/**
 * Clue — a glowing collectible object placed inside a building.
 * Rotates and floats to attract the player's attention.
 */
export class Clue {
  constructor(config) {
    this.id = config.id;                     // e.g. 'clue_0'
    this.buildingIndex = config.buildingIndex;
    this.locationName = config.locationName;  // e.g. 'table'
    this.data = config.data;                 // rich clue data from ClueData.js
    this.collected = false;

    this.group = new THREE.Group();
    this.createMesh();
  }

  createMesh() {
    // Glowing octahedron
    const geo = new THREE.OctahedronGeometry(0.2, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Glow point light
    this.light = new THREE.PointLight(0xffaa00, 0.5, 3);
    this.light.position.y = 0.2;
    this.group.add(this.light);

    // Mark as interactable (used by raycaster)
    this.mesh.userData.interactable = {
      type: 'clue',
      prompt: '[E] COLLECT CLUE',
      clue: this,
    };
  }

  /** Animate: float + rotate. */
  update(dt) {
    if (this.collected) return;
    this.mesh.rotation.y += dt * 2;
    this.mesh.position.y = Math.sin(Date.now() * 0.003) * 0.1 + 0.3;
  }

  /** Collect this clue — hide it and return its data. */
  collect() {
    this.collected = true;
    this.group.visible = false;
    return this.data; // Return the rich clue data
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }
}
