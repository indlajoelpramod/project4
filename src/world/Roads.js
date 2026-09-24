import * as THREE from 'three';

/**
 * Roads — creates the road network connecting the buildings.
 * Dark asphalt with sidewalk edges and dashed center lines.
 */
export class Roads {
  constructor(scene) {
    this.scene = scene;
  }

  create() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85 });

    // Main north-south road (runs through the center of the village)
    this.roadNS(0, -92, 88, 6, roadMat);

    // Side roads connecting to buildings
    this.roadEW(-50, 0,  -50, 5, roadMat);  // → Building 1 (Abandoned House)
    this.roadEW(0,  50,  -40, 5, roadMat);  // → Building 2 (Medical Center)
    this.roadEW(-18, 0,   20, 5, roadMat);  // → Building 3 (Grocery Store)
    this.roadEW(0,  55,   45, 5, roadMat);  // → Building 4 (Warehouse)
    this.roadEW(-45, 0,   60, 5, roadMat);  // → Building 5 (Farmhouse)

    // Center-line markings on main road
    this.centerLine(0, -90, 180);
  }

  /** North-south road segment. */
  roadNS(x, startZ, endZ, width, mat) {
    const len = Math.abs(endZ - startZ);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, len),
      mat
    );
    road.position.set(x, 0.02, (startZ + endZ) / 2);
    road.receiveShadow = true;
    this.scene.add(road);

    // Sidewalk kerbs
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, len), edgeMat);
      edge.position.set(x + side * width / 2, 0.05, (startZ + endZ) / 2);
      this.scene.add(edge);
    }
  }

  /** East-west road segment. */
  roadEW(startX, endX, z, width, mat) {
    const len = Math.abs(endX - startX);
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.05, width),
      mat
    );
    road.position.set((startX + endX) / 2, 0.02, z);
    road.receiveShadow = true;
    this.scene.add(road);
  }

  /** Dashed center line. */
  centerLine(x, startZ, totalLength) {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x666633, roughness: 0.7 });
    const dash = 2, gap = 2;
    for (let z = startZ; z < startZ + totalLength; z += dash + gap) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, dash), lineMat);
      d.position.set(x, 0.04, z + dash / 2);
      this.scene.add(d);
    }
  }
}
