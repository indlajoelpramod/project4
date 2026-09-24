import * as THREE from 'three';
import { Zombie } from './Zombie.js';
import { distance2D, randomBetween } from '../utils/Helpers.js';

/**
 * ZombieManager — spawns and updates all zombies in the village.
 */
export class ZombieManager {
  constructor(scene) {
    this.scene = scene;
    this.zombies = [];
    this.maxZombies = 10;
  }

  spawnZombies(playerPos, buildingManager) {
    this.clear();
    const bounds = 70;
    const minDistance = 30;

    for (let i = 0; i < this.maxZombies; i++) {
      let validPos = null;
      let attempts = 0;
      
      // Attempt to find a valid outdoor spawn position
      while (!validPos && attempts < 50) {
        attempts++;
        const x = randomBetween(-bounds, bounds);
        const z = randomBetween(-bounds, bounds);
        const pt = new THREE.Vector3(x, 0, z);

        // Check player distance
        if (distance2D(pt, playerPos) < minDistance) continue;

        // Check if inside any building
        const inBuilding = buildingManager.getColliders().some(box => 
          x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z
        );

        // Minimal check for player's immediate FOV (Assuming player starts looking at +Z)
        if (attempts < 20 && pt.z > playerPos.z && Math.abs(pt.x - playerPos.x) < 20) continue;

        if (!inBuilding) {
          validPos = pt;
        }
      }

      if (validPos) {
        // Generate a localized patrol route
        const patrolPoints = [validPos.clone()];
        for (let p = 0; p < 2; p++) {
          const px = validPos.x + randomBetween(-15, 15);
          const pz = validPos.z + randomBetween(-15, 15);
          
          // Fast check against buildings
          const inside = buildingManager.getColliders().some(box => 
            px >= box.min.x && px <= box.max.x && pz >= box.min.z && pz <= box.max.z
          );

          if (!inside) {
            patrolPoints.push(new THREE.Vector3(px, 0, pz));
          }
        }

        const z = new Zombie({
          position: validPos,
          speed: randomBetween(1.0, 1.8),
          chaseSpeed: randomBetween(2.5, 3.5),
          detectionRange: randomBetween(12, 18),
          patrolPoints: patrolPoints,
        });

        this.zombies.push(z);
        this.scene.add(z.group);
      }
    }

    console.log(`[ZombieManager] Spawned ${this.zombies.length} dynamic zombies`);
  }

  update(dt, playerPos, playerHealth, colliders) {
    this.zombies.forEach(z => {
      z.update(dt, playerPos, colliders);
      const dmg = z.tryAttack(playerPos);
      if (dmg > 0) playerHealth.takeDamage(dmg);
    });
  }

  clear() {
    this.zombies.forEach(z => this.scene.remove(z.group));
    this.zombies = [];
  }

  getCount()  { return this.zombies.length; }
  getStates() { return this.zombies.map(z => z.getState()); }
}
