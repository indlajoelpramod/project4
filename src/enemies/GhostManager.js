import * as THREE from 'three';
import { Ghost } from './Ghost.js';
import { distance2D } from '../utils/Helpers.js';

/**
 * GhostManager — spawns one ghost per building and tracks proximity effects.
 */
export class GhostManager {
  constructor(scene) {
    this.scene = scene;
    this.ghosts = [];
    this.nearGhostEffect = false;
    this.nearGhostIntensity = 0;
  }

  /**
   * Spawn one ghost inside each building.
   * @param {Array<import('../buildings/Building.js').Building>} buildings
   */
  spawnGhosts(buildings) {
    this.buildings = buildings;
    buildings.forEach((building, index) => {
      const bp = building.group.position;
      const hw = building.width / 2 - 1.5;
      const hd = building.depth / 2 - 1.5;

      const ghost = new Ghost({
        buildingIndex: index,
        position: new THREE.Vector3(bp.x, 0, bp.z),
        patrolPoints: [
          new THREE.Vector3(bp.x - hw, 0, bp.z - hd),
          new THREE.Vector3(bp.x + hw, 0, bp.z - hd),
          new THREE.Vector3(bp.x + hw, 0, bp.z + hd),
          new THREE.Vector3(bp.x - hw, 0, bp.z + hd),
        ],
        speed: 1.0 + index * 0.2,
        chaseSpeed: 3.0 + index * 0.3,
        detectionRange: 8 + index,
      });

      this.ghosts.push(ghost);
      this.scene.add(ghost.group);
    });

    console.log(`[GhostManager] Spawned ${this.ghosts.length} ghosts`);
  }

  update(dt, playerPos, playerHealth) {
    let closest = Infinity;

    this.ghosts.forEach(g => {
      g.update(dt, playerPos);
      const dmg = g.tryAttack(playerPos);
      if (dmg > 0) playerHealth.takeDamage(dmg);

      const d = g.getDistanceToPlayer(playerPos);
      if (d < closest) closest = d;
    });

    // Proximity horror effect
    const range = 15;
    this.nearGhostEffect    = closest < range;
    this.nearGhostIntensity = closest < range ? 1 - closest / range : 0;

    // Check Safe Rooms
    if (this.buildings) {
      this.buildings.forEach((building, i) => {
        const box = building.getSafeRoomBox();
        // Slightly lower the y-check so player at y=1.7 is strictly inside the box.
        if (box && playerPos.x >= box.min.x && playerPos.x <= box.max.x &&
            playerPos.z >= box.min.z && playerPos.z <= box.max.z) {
          
          const ghost = this.ghosts.find(g => g.buildingIndex === i);
          if (ghost && ghost.getState() !== 'FLEE') {
            ghost.triggerFlee(building.getDoorPosition());
          }
        }
      });
    }
  }

  clear() {
    this.ghosts.forEach(g => this.scene.remove(g.group));
    this.ghosts = [];
    this.nearGhostEffect = false;
    this.nearGhostIntensity = 0;
  }

  isNearGhost()          { return this.nearGhostEffect; }
  getNearGhostIntensity() { return this.nearGhostIntensity; }

  getGhostStates() {
    return this.ghosts.map(g => `B${g.buildingIndex + 1}:${g.getState()}`);
  }

  isGhostChasing() {
    return this.ghosts.some(g => g.getState() === 'CHASE' || g.getState() === 'ATTACK');
  }
}
