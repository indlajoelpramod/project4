import * as THREE from 'three';
import { distance2D, randomBetween } from '../utils/Helpers.js';

/**
 * Zombie state machine.
 */
export const ZombieState = {
  IDLE:    'IDLE',
  PATROL:  'PATROL',
  DETECT:  'DETECT',
  CHASE:   'CHASE',
  ATTACK:  'ATTACK',
  SEARCH:  'SEARCH',
  RETURN:  'RETURN',
};

/**
 * Zombie — procedural enemy that roams the village.
 *
 * AI: IDLE → PATROL → DETECT → CHASE → ATTACK → SEARCH → RETURN
 * Detection is distance-based. AI is throttled to ~5 Hz for performance.
 */
export class Zombie {
  constructor(config) {
    this.position     = config.position.clone();
    this.spawnPosition = config.position.clone();
    this.patrolPoints = config.patrolPoints || [];
    this.currentPatrolIndex = 0;

    this.speed         = config.speed || 3;
    this.chaseSpeed    = config.chaseSpeed || 5.5;
    this.detectionRange = config.detectionRange || 15;
    this.attackRange    = 2.5;
    this.attackDamage   = 20;
    this.attackCooldown = 0;
    this.attackCooldownTime = 1.5;

    this.state = ZombieState.PATROL;
    this.lastKnownPlayerPos = null;
    this.searchTimer = 0;
    this.searchTime  = 5;
    this.stateTimer  = 0;

    // Throttle AI
    this.aiInterval = 0.2;
    this.aiTimer    = Math.random() * this.aiInterval;

    // 3D model
    this.group = new THREE.Group();
    this.buildMesh();
    this.group.position.copy(this.position);
  }

  /* ── Visual ── */

  buildMesh() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x4a5a8a, roughness: 0.9 }); // blue shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 }); // dark pants

    this.body = new THREE.Group();
    
    // Torso (Shirt)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8), shirtMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    this.body.add(torso);

    // Legs (Pants)
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 8), pantsMat);
    legs.position.y = 0.7;
    legs.castShadow = true;
    this.body.add(legs);

    this.group.add(this.body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      skinMat
    );
    head.position.y = 1.9;
    head.castShadow = true;
    this.group.add(head);

    // Glowing eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff3300, emissive: 0xff3300, emissiveIntensity: 0.8,
    });
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    [[-0.1, 1.95, 0.2], [0.1, 1.95, 0.2]].forEach(pos => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(...pos);
      this.group.add(eye);
    });

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.6, 3, 6);
    this.leftArm  = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.45, 1.2, 0.1);
    this.leftArm.rotation.x = -0.5;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.45, 1.2, 0.1);
    this.rightArm.rotation.x = -0.5;
    this.group.add(this.rightArm);
  }

  /* ── Update loop ── */

  update(dt, playerPos, colliders) {
    this.aiTimer += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer = 0;
      this.runAI(this.aiInterval, playerPos);
    }

    this.move(dt, colliders);
    this.animate(dt);
  }

  /* ── AI ── */

  runAI(dt, playerPos) {
    const dist = distance2D(this.position, playerPos);

    switch (this.state) {
      case ZombieState.IDLE:
        this.stateTimer += dt;
        if (this.stateTimer > 2) { this.state = ZombieState.PATROL; this.stateTimer = 0; }
        if (dist < this.detectionRange) { this.state = ZombieState.DETECT; this.lastKnownPlayerPos = playerPos.clone(); }
        break;

      case ZombieState.PATROL:
        if (dist < this.detectionRange) { this.state = ZombieState.DETECT; this.lastKnownPlayerPos = playerPos.clone(); }
        break;

      case ZombieState.DETECT:
        this.state = ZombieState.CHASE;
        break;

      case ZombieState.CHASE:
        this.lastKnownPlayerPos = playerPos.clone();
        if (dist <= this.attackRange)         this.state = ZombieState.ATTACK;
        else if (dist > this.detectionRange * 2) { this.state = ZombieState.SEARCH; this.searchTimer = this.searchTime; }
        break;

      case ZombieState.ATTACK:
        this.lastKnownPlayerPos = playerPos.clone();
        if (dist > this.attackRange) this.state = ZombieState.CHASE;
        break;

      case ZombieState.SEARCH:
        this.searchTimer -= dt;
        if (dist < this.detectionRange)  { this.state = ZombieState.CHASE; this.lastKnownPlayerPos = playerPos.clone(); }
        else if (this.searchTimer <= 0)  this.state = ZombieState.RETURN;
        break;

      case ZombieState.RETURN:
        if (distance2D(this.position, this.spawnPosition) < 2) { this.state = ZombieState.PATROL; this.currentPatrolIndex = 0; }
        if (dist < this.detectionRange) { this.state = ZombieState.CHASE; this.lastKnownPlayerPos = playerPos.clone(); }
        break;
    }
  }

  /* ── Movement ── */

  move(dt, colliders) {
    let target = null;
    let speed  = this.speed;

    switch (this.state) {
      case ZombieState.PATROL:
        if (this.patrolPoints.length) {
          target = this.patrolPoints[this.currentPatrolIndex];
          if (distance2D(this.position, target) < 1)
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        break;
      case ZombieState.CHASE:   target = this.lastKnownPlayerPos; speed = this.chaseSpeed; break;
      case ZombieState.SEARCH:  target = this.lastKnownPlayerPos; speed *= 0.5; break;
      case ZombieState.RETURN:  target = this.spawnPosition; break;
    }

    if (target) {
      const dx = target.x - this.position.x;
      const dz = target.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        let vx = (dx / dist) * speed * dt;
        let vz = (dz / dist) * speed * dt;
        
        const oldX = this.position.x;
        const oldZ = this.position.z;
        
        this.position.x += vx;
        if (this.checkCollision(colliders)) this.position.x = oldX;
        
        this.position.z += vz;
        if (this.checkCollision(colliders)) this.position.z = oldZ;
        
        this.group.rotation.y = Math.atan2(dx, dz);
      }
    }

    this.group.position.set(this.position.x, 0, this.position.z);
  }

  checkCollision(colliders) {
    if (!colliders) return false;
    const half = 0.4;
    const box = new THREE.Box3(
      new THREE.Vector3(this.position.x - half, 0, this.position.z - half),
      new THREE.Vector3(this.position.x + half, 2.0, this.position.z + half)
    );
    for (let i = 0; i < colliders.length; i++) {
      if (box.intersectsBox(colliders[i])) return true;
    }
    return false;
  }

  /* ── Animation ── */

  animate(_dt) {
    const t = Date.now() * 0.003;
    const moving = this.state === ZombieState.PATROL || this.state === ZombieState.CHASE ||
                   this.state === ZombieState.SEARCH || this.state === ZombieState.RETURN;
    if (moving) {
      this.body.position.y = Math.sin(t * 4) * 0.05;
      this.leftArm.rotation.x  = -0.5 + Math.sin(t * 4) * 0.3;
      this.rightArm.rotation.x = -0.5 - Math.sin(t * 4) * 0.3;
    }
  }

  /* ── Combat ── */

  tryAttack(playerPos) {
    if (this.state !== ZombieState.ATTACK || this.attackCooldown > 0) return 0;
    if (distance2D(this.position, playerPos) <= this.attackRange) {
      this.attackCooldown = this.attackCooldownTime;
      return this.attackDamage;
    }
    return 0;
  }

  getState() { return this.state; }
}
