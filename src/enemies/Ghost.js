import * as THREE from 'three';
import { distance2D } from '../utils/Helpers.js';

/**
 * Ghost state machine.
 */
export const GhostState = {
  IDLE:        'IDLE',
  PATROL:      'PATROL',
  INVESTIGATE: 'INVESTIGATE',
  DETECT:      'DETECT',
  CHASE:       'CHASE',
  ATTACK:      'ATTACK',
  SEARCH:      'SEARCH',
  RETURN:      'RETURN',
  FLEE:        'FLEE',
};

/**
 * Ghost — translucent enemy that patrols inside a building.
 *
 * Stronger attacks (35 HP) but shorter detection range than zombies.
 * Proximity triggers visual horror effects (vignette, ghost overlay).
 */
export class Ghost {
  constructor(config) {
    this.buildingIndex = config.buildingIndex;
    this.position      = config.position.clone();
    this.homePosition  = config.position.clone();
    this.patrolPoints  = config.patrolPoints || [];
    this.currentPatrolIndex = 0;

    this.speed         = config.speed || 2.5;
    this.chaseSpeed    = config.chaseSpeed || 6;
    this.detectionRange = config.detectionRange || 10;
    this.attackRange    = 2;
    this.attackDamage   = 35;
    this.attackCooldown = 0;
    this.attackCooldownTime = 2;

    this.state = GhostState.IDLE;
    this.lastKnownPlayerPos = null;
    this.searchTimer = 0;
    this.searchTime  = 4;
    this.stateTimer  = 0;
    this.idleTime    = 3;

    // Throttle AI
    this.aiInterval = 0.25;
    this.aiTimer    = Math.random() * this.aiInterval;

    // Visual
    this.floatOffset = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.buildMesh();
    this.group.position.copy(this.position);
  }

  /* ── Visual ── */

  buildMesh() {
    // Translucent body
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x8888ff, emissive: 0x4444aa, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.5, roughness: 0.2,
      })
    );
    this.body.position.y = 1.2;
    this.group.add(this.body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xaaaaff, emissive: 0x6666cc, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.6,
      })
    );
    head.position.y = 2.1;
    this.group.add(head);

    // Glowing red eyes
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0,
    });
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    [[-0.12, 2.15, 0.25], [0.12, 2.15, 0.25]].forEach(pos => {
      this.group.add(new THREE.Mesh(eyeGeo, eyeMat).translateX(pos[0]).translateY(pos[1]).translateZ(pos[2]));
    });

    // Eerie glow light
    this.glowLight = new THREE.PointLight(0x6666ff, 0.5, 8);
    this.glowLight.position.y = 1.5;
    this.group.add(this.glowLight);

    // Trailing "skirt" (inverted cone)
    const skirt = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.0, 8),
      new THREE.MeshStandardMaterial({
        color: 0x7777cc, emissive: 0x3333aa, emissiveIntensity: 0.2,
        transparent: true, opacity: 0.3,
      })
    );
    skirt.position.y = 0.3;
    skirt.rotation.x = Math.PI;
    this.group.add(skirt);
  }

  /* ── Update ── */

  update(dt, playerPos) {
    this.aiTimer += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.aiTimer >= this.aiInterval) {
      this.aiTimer = 0;
      this.runAI(this.aiInterval, playerPos);
    }

    this.move(dt);
    this.animate();
  }

  /* ── AI ── */

  runAI(dt, playerPos) {
    const dist = distance2D(this.position, playerPos);

    switch (this.state) {
      case GhostState.IDLE:
        this.stateTimer += dt;
        if (this.stateTimer > this.idleTime) { this.state = GhostState.PATROL; this.stateTimer = 0; }
        if (dist < this.detectionRange) { this.state = GhostState.DETECT; this.lastKnownPlayerPos = playerPos.clone(); }
        break;

      case GhostState.PATROL:
        if (dist < this.detectionRange) { this.state = GhostState.DETECT; this.lastKnownPlayerPos = playerPos.clone(); }
        break;

      case GhostState.DETECT:
        this.state = GhostState.CHASE;
        break;

      case GhostState.CHASE:
        this.lastKnownPlayerPos = playerPos.clone();
        if (dist <= this.attackRange)           this.state = GhostState.ATTACK;
        else if (dist > this.detectionRange * 2.5) { this.state = GhostState.SEARCH; this.searchTimer = this.searchTime; }
        break;

      case GhostState.ATTACK:
        this.lastKnownPlayerPos = playerPos.clone();
        if (dist > this.attackRange * 1.5) this.state = GhostState.CHASE;
        break;

      case GhostState.SEARCH:
        this.searchTimer -= dt;
        if (dist < this.detectionRange) { this.state = GhostState.CHASE; this.lastKnownPlayerPos = playerPos.clone(); }
        else if (this.searchTimer <= 0) this.state = GhostState.RETURN;
        break;

      case GhostState.RETURN:
        if (distance2D(this.position, this.homePosition) < 2) { this.state = GhostState.IDLE; this.stateTimer = 0; }
        if (dist < this.detectionRange) { this.state = GhostState.CHASE; this.lastKnownPlayerPos = playerPos.clone(); }
        break;

      case GhostState.FLEE:
        this.fleeTimer -= dt;
        if (this.fleeTimer <= 0) {
          this.state = GhostState.RETURN;
        }
        break;
    }
  }

  triggerFlee(outsidePos) {
    if (this.state === GhostState.FLEE) return;
    this.state = GhostState.FLEE;
    this.fleeTimer = 10; // flee for 10 seconds
    // Flee to a point well outside the door
    this.fleeTarget = outsidePos.clone().add(new THREE.Vector3(0, 0, 15));
  }

  /* ── Movement ── */

  move(dt) {
    let target = null, speed = this.speed;

    switch (this.state) {
      case GhostState.PATROL:
        if (this.patrolPoints.length) {
          target = this.patrolPoints[this.currentPatrolIndex];
          if (distance2D(this.position, target) < 1)
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        break;
      case GhostState.CHASE:  target = this.lastKnownPlayerPos; speed = this.chaseSpeed; break;
      case GhostState.SEARCH: target = this.lastKnownPlayerPos; speed *= 0.7; break;
      case GhostState.RETURN: target = this.homePosition; break;
      case GhostState.FLEE:   target = this.fleeTarget; speed = this.chaseSpeed * 1.5; break;
    }

    if (target) {
      const dx = target.x - this.position.x;
      const dz = target.z - this.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.5) {
        this.position.x += (dx / dist) * speed * dt;
        this.position.z += (dz / dist) * speed * dt;
        this.group.rotation.y = Math.atan2(dx, dz);
      }
    }

    this.group.position.set(this.position.x, 0, this.position.z);
  }

  /* ── Animation ── */

  animate() {
    const t = Date.now() * 0.002;
    // Float
    this.group.position.y = Math.sin(t + this.floatOffset) * 0.3 + 0.2;
    // Wobble
    this.body.rotation.z = Math.sin(t * 1.5) * 0.1;
    // Glow pulse
    const chasing = this.state === GhostState.CHASE || this.state === GhostState.ATTACK;
    const fleeing = this.state === GhostState.FLEE;
    
    if (chasing) {
      this.glowLight.intensity = 0.8 + Math.sin(t * 4) * 0.3;
      this.glowLight.color.setHex(0xff4444);
    } else if (fleeing) {
      this.glowLight.intensity = 0.3;
      this.glowLight.color.setHex(0x00ff00); // turn green when fleeing
    } else {
      this.glowLight.intensity = 0.5 + Math.sin(t * 2) * 0.2;
      this.glowLight.color.setHex(0x6666ff);
    }
  }

  /* ── Combat ── */

  tryAttack(playerPos) {
    if (this.state !== GhostState.ATTACK || this.attackCooldown > 0) return 0;
    if (distance2D(this.position, playerPos) <= this.attackRange) {
      this.attackCooldown = this.attackCooldownTime;
      return this.attackDamage;
    }
    return 0;
  }

  getDistanceToPlayer(playerPos) { return distance2D(this.position, playerPos); }
  getState() { return this.state; }
}
