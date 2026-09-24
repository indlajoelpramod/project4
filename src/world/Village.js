import * as THREE from 'three';
import { Environment } from './Environment.js';
import { Roads } from './Roads.js';

/**
 * Village — master world layout.
 * Creates the environment, roads, and the final locked escape door.
 */
export class Village {
  constructor(scene) {
    this.scene = scene;
    this.environment = new Environment(scene);
    this.roads = new Roads(scene);
    this.finalDoor = null;
    this.finalDoorCollider = null;
  }

  create() {
    this.environment.create();
    this.roads.create();
    this.createFinalDoor();
  }

  /* ── Final Escape Door ── */

  createFinalDoor() {
    const g = new THREE.Group();
    g.position.set(0, 0, -95);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.8 });

    // Pillars
    const pillarGeo = new THREE.BoxGeometry(0.5, 4, 0.5);
    [[-1.5, 2, 0], [1.5, 2, 0]].forEach(pos => {
      const p = new THREE.Mesh(pillarGeo, frameMat);
      p.position.set(...pos);
      p.castShadow = true;
      g.add(p);
    });

    // Arch
    const arch = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 0.5), frameMat);
    arch.position.set(0, 4, 0);
    arch.castShadow = true;
    g.add(arch);

    // Door panels
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a00, roughness: 0.7, metalness: 0.3,
    });
    const doorGeo = new THREE.BoxGeometry(1.3, 3.5, 0.2);
    
    this.leftDoorPivot = new THREE.Group();
    this.leftDoorPivot.position.set(-1.3, 1.75, 0); // left hinge
    
    const leftDoor = new THREE.Mesh(doorGeo, doorMat);
    leftDoor.position.set(0.65, 0, 0); // offset center from hinge
    leftDoor.castShadow = true;
    leftDoor.userData.interactable = { type: 'final_door', prompt: '[E] UNLOCK DOOR' };
    this.leftDoorPivot.add(leftDoor);
    g.add(this.leftDoorPivot);
    
    this.rightDoorPivot = new THREE.Group();
    this.rightDoorPivot.position.set(1.3, 1.75, 0); // right hinge
    
    const rightDoor = new THREE.Mesh(doorGeo, doorMat);
    rightDoor.position.set(-0.65, 0, 0);
    rightDoor.castShadow = true;
    rightDoor.userData.interactable = { type: 'final_door', prompt: '[E] UNLOCK DOOR' };
    this.rightDoorPivot.add(rightDoor);
    g.add(this.rightDoorPivot);

    // Lock glow (attach to one door so it moves)
    this.lockGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.5,
      })
    );
    this.lockGlow.position.set(-0.65, 0.25, 0.15); // relative to right door hinge
    this.rightDoorPivot.add(this.lockGlow);

    this.isDoorUnlocked = false;
    this.doorOpenProgress = 0;

    // Warning light
    const warnLight = new THREE.PointLight(0xff4400, 0.4, 10);
    warnLight.position.set(0, 3, 1);
    g.add(warnLight);

    this.finalDoor = g;
    this.scene.add(g);

    this.finalDoorCollider = new THREE.Box3(
      new THREE.Vector3(-1.5, 0, -95.5),
      new THREE.Vector3(1.5, 4, -94.5)
    );
  }

  /* ── Per-frame ── */

  update(dt) {
    this.environment.update(dt);

    if (this.isDoorUnlocked && this.doorOpenProgress < 1) {
      this.doorOpenProgress += dt * 0.5; // open over 2 seconds
      const t = Math.min(1, this.doorOpenProgress);
      // Swing outwards (away from player)
      this.leftDoorPivot.rotation.y = t * -Math.PI / 2;
      this.rightDoorPivot.rotation.y = t * Math.PI / 2;
    }
  }

  unlockFinalDoor() {
    this.isDoorUnlocked = true;
    // Remove collider so player can pass
    this.finalDoorCollider = null;
    // Change lock glow to green
    this.lockGlow.material.color.setHex(0x00ff00);
    this.lockGlow.material.emissive.setHex(0x00ff00);
    // Remove interactable property
    this.leftDoorPivot.children[0].userData.interactable = null;
    this.rightDoorPivot.children[0].userData.interactable = null;
  }

  getColliders() {
    const c = [...this.environment.getColliders()];
    if (this.finalDoorCollider) c.push(this.finalDoorCollider);
    return c;
  }

  getFinalDoorPosition() {
    return new THREE.Vector3(0, 0, -93);
  }
}
