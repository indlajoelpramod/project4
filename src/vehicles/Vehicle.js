import * as THREE from 'three';

/**
 * Base Vehicle class — handles lightweight 2D physics, collisions, and state.
 */
export class Vehicle {
  constructor(config) {
    this.name = config.name || 'Vehicle';
    this.position = config.position.clone();
    this.rotation = config.rotation || 0; // Y-axis rotation in radians
    
    // Physics Config
    this.acceleration = config.acceleration || 15;
    this.braking = config.braking || 30;
    this.maxSpeed = config.maxSpeed || 25;
    this.reverseSpeed = config.reverseSpeed || -10;
    this.friction = config.friction || 5;
    this.turnSpeed = config.turnSpeed || 1.5;
    this.health = 100;
    
    // State
    this.speed = 0;
    this.isOccupied = false;
    this.isHeadlightsOn = false;
    this.keys = {};

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotation;
    this.collider = null;
    this.headlights = [];
  }

  createMesh() { }

  createCollider() {
    if (!this.collider) {
      this.collider = new THREE.Box3();
    }
    this.collider.setFromObject(this.group);
  }

  getCollider() {
    return this.collider;
  }

  setInputs(keys) {
    this.keys = keys;
  }
  
  toggleHeadlights() {
    this.isHeadlightsOn = !this.isHeadlightsOn;
    this.headlights.forEach(hl => { hl.visible = this.isHeadlightsOn; });
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.speed = 0; // Disabled
      // Flicker headlights if broken
      this.headlights.forEach(hl => { hl.intensity = Math.random() * 0.5; });
    }
  }

  /**
   * Physics update loop.
   * Checks collisions against the world colliders.
   */
  update(dt, colliders = []) {
    if (this.health <= 0) return; // Broken

    // 1. Handle Input & Speed
    if (this.isOccupied) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) {
        this.speed += this.acceleration * dt;
      } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
        this.speed -= this.braking * dt;
      } else {
        // Friction
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.friction * dt);
        } else if (this.speed < 0) {
          this.speed = Math.min(0, this.speed + this.friction * dt);
        }
      }

      // Handbrake
      if (this.keys['Space']) {
        if (this.speed > 0) this.speed = Math.max(0, this.speed - this.braking * 1.5 * dt);
        if (this.speed < 0) this.speed = Math.min(0, this.speed + this.braking * 1.5 * dt);
      }
    } else {
      // Idle friction
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * 2 * dt);
      if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * 2 * dt);
    }

    // Cap speed
    this.speed = Math.max(this.reverseSpeed, Math.min(this.maxSpeed, this.speed));

    // 2. Handle Steering
    if (Math.abs(this.speed) > 0.5) {
      const turnDir = this.speed > 0 ? 1 : -1; // Reverse steering direction when backing up
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
        this.rotation += this.turnSpeed * turnDir * dt;
      }
      if (this.keys['KeyD'] || this.keys['ArrowRight']) {
        this.rotation -= this.turnSpeed * turnDir * dt;
      }
    }

    // 3. Calculate New Position
    const newPos = this.position.clone();
    newPos.x += Math.sin(this.rotation) * this.speed * dt;
    newPos.z += Math.cos(this.rotation) * this.speed * dt;

    // 4. Collision Check
    // Temporarily apply to group to get AABB
    const oldX = this.group.position.x;
    const oldZ = this.group.position.z;
    const oldRot = this.group.rotation.y;

    this.group.position.copy(newPos);
    this.group.rotation.y = this.rotation;
    this.createCollider(); // update AABB

    let hit = false;
    for (const box of colliders) {
      // Don't collide with self
      if (box === this.collider) continue; 
      
      // We must avoid the player's own bounding box if they are inside.
      // Usually, we just pass building colliders, not player, while driving.
      if (this.collider.intersectsBox(box)) {
        hit = true;
        break;
      }
    }

    if (hit) {
      // Revert position, lose speed (crash)
      this.group.position.set(oldX, 0, oldZ);
      this.group.rotation.y = oldRot;
      this.position.set(oldX, 0, oldZ);
      this.rotation = oldRot;
      
      if (Math.abs(this.speed) > 10) {
        this.takeDamage(5); // crash damage
      }
      this.speed *= -0.3; // bounce back slightly
      this.createCollider();
    } else {
      // Apply new position
      this.position.copy(newPos);
    }
  }
}
