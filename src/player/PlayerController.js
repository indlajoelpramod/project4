import * as THREE from 'three';

/**
 * PlayerController — first-person camera with pointer lock, WASD,
 * sprint, jump, flashlight, and AABB collision response.
 */
export class PlayerController {
  constructor(camera, scene, domElement) {
    this.camera    = camera;
    this.scene     = scene;
    this.domElement = domElement;

    // Position & physics
    this.position = new THREE.Vector3(0, 1.7, 0);
    this.velocity = new THREE.Vector3();
    this.euler    = new THREE.Euler(0, 0, 0, 'YXZ');

    // Tuning
    this.walkSpeed   = 8;
    this.sprintSpeed = 14;
    this.jumpForce   = 8;
    this.gravity     = -20;
    this.sensitivity = 0.002;

    // State
    this.isOnGround = true;
    this.isSprinting = false;
    this.isLocked = false;

    // Input map
    this.keys = {};

    // Collision
    this.colliders = [];

    // Flashlight (SpotLight attached to camera)
    this.flashlight = new THREE.SpotLight(0xffffcc, 1.5, 30, Math.PI / 6, 0.5, 1);
    this.flashlight.position.set(0, -0.1, 0);
    this.flashlight.target.position.set(0, -0.1, -1);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.visible = false;
    this.flashlightOn = false;
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);

    this.bodyGroup = new THREE.Group();
    this.scene.add(this.bodyGroup);

    // Toggle debounce
    this._flashToggled = false;
    
    // Bobbing state
    this.bobTimer = 0;
    this.bobFrequency = 0;
    this.bobAmplitude = 0;

    this.setupPointerLock();
    this.setupKeyboard();
    this.setupTouch();
    this.buildBody();
  }

  /* ── Body ── */
  buildBody() {
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.9 }); // Red shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x111144, roughness: 0.9 }); // Dark blue jeans

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8), shirtMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Legs
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 8), pantsMat);
    legs.position.y = 0.7;
    legs.castShadow = true;
    this.bodyGroup.add(legs);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.5, 3, 6);
    this.leftArm = new THREE.Mesh(armGeo, shirtMat);
    this.leftArm.position.set(-0.4, 1.25, 0.1);
    this.leftArm.rotation.x = -0.1;
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, shirtMat);
    this.rightArm.position.set(0.4, 1.25, 0.1);
    this.rightArm.rotation.x = -0.1;
    this.bodyGroup.add(this.rightArm);
  }

  /* ── Pointer Lock ── */

  setupPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked) this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', e => {
      if (!this.isLocked) return;
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * this.sensitivity;
      this.euler.x -= e.movementY * this.sensitivity;
      // Clamp pitch to ±85°
      this.euler.x = Math.max(-1.48, Math.min(1.48, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  /* ── Keyboard ── */

  setupKeyboard() {
    document.addEventListener('keydown', e => { this.keys[e.code] = true; });
    document.addEventListener('keyup',   e => { this.keys[e.code] = false; });
  }

  /* ── Touch / On-Screen Controls ── */
  setupTouch() {
    // On mobile, bypass strict pointer lock requirement
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isLocked = true; 
    }

    const bindBtn = (id, code) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      // Touch events
      btn.addEventListener('touchstart', e => { 
        e.preventDefault(); 
        this.keys[code] = true; 
        if (code === 'KeyE') window.dispatchEvent(new CustomEvent('action-interact'));
      });
      btn.addEventListener('touchend', e => { e.preventDefault(); this.keys[code] = false; });
      // Mouse events for laptop testing
      btn.addEventListener('mousedown', e => { 
        e.preventDefault(); 
        this.keys[code] = true; 
        if (code === 'KeyE') window.dispatchEvent(new CustomEvent('action-interact'));
      });
      btn.addEventListener('mouseup', e => { e.preventDefault(); this.keys[code] = false; });
      btn.addEventListener('mouseleave', e => { e.preventDefault(); this.keys[code] = false; });
    };

    bindBtn('btn-up', 'KeyW');
    bindBtn('btn-down', 'KeyS');
    bindBtn('btn-left', 'KeyA');
    bindBtn('btn-right', 'KeyD');
    bindBtn('btn-jump', 'Space');
    bindBtn('btn-interact', 'KeyE');

    // Touch look
    let lastTouchX = null;
    let lastTouchY = null;
    document.addEventListener('touchstart', e => {
      if (e.target.closest('#mobile-controls') || e.target.closest('.menu-btn')) return;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', e => {
      if (lastTouchX === null || lastTouchY === null) return;
      if (e.target.closest('#mobile-controls')) return;

      const deltaX = e.touches[0].clientX - lastTouchX;
      const deltaY = e.touches[0].clientY - lastTouchY;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= deltaX * this.sensitivity * 2.5;
      this.euler.x -= deltaY * this.sensitivity * 2.5;
      this.euler.x = Math.max(-1.48, Math.min(1.48, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);

      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', () => {
      lastTouchX = null;
      lastTouchY = null;
    });
  }

  /* ── Frame update ── */

  /**
   * @param {number} dt — seconds
   * @param {number} stamina — current stamina value
   * @returns {{ isSprinting: boolean }}
   */
  update(dt, stamina) {
    // We do NOT return early on !this.isLocked, so on-screen buttons work on desktop without pointer lock.
    
    // --- Input direction ---
    const dir = new THREE.Vector3();
    if (this.keys['KeyW']) dir.z -= 1;
    if (this.keys['KeyS']) dir.z += 1;
    if (this.keys['KeyA']) dir.x -= 1;
    if (this.keys['KeyD']) dir.x += 1;
    dir.normalize();

    this.isSprinting = this.keys['ShiftLeft'] && stamina > 0 && dir.length() > 0;
    const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // --- Camera-relative movement ---
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveX = (right.x * dir.x + forward.x * dir.z) * speed;
    const moveZ = (right.z * dir.x + forward.z * dir.z) * speed;

    // --- Jump ---
    if (this.keys['Space'] && this.isOnGround) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
    }

    // --- Gravity ---
    this.velocity.y += this.gravity * dt;

    // --- Bobbing & Footsteps ---
    let bobOffset = 0;
    if (this.isOnGround && (moveX !== 0 || moveZ !== 0)) {
      this.bobFrequency = this.isSprinting ? 12 : 8;
      this.bobAmplitude = this.isSprinting ? 0.08 : 0.04;
      this.bobTimer += dt * this.bobFrequency;
      bobOffset = Math.sin(this.bobTimer) * this.bobAmplitude;
      
      // Trigger footstep sound loosely tied to bob cycle
      if (Math.sin(this.bobTimer) < -0.9 && !this._stepTriggered) {
        // Dispatch custom event for footsteps
        window.dispatchEvent(new CustomEvent('playerFootstep'));
        this._stepTriggered = true;
      } else if (Math.sin(this.bobTimer) > -0.5) {
        this._stepTriggered = false;
      }
    } else {
      this.bobTimer = 0; // reset when idle
    }

    // --- Proposed new position ---
    const newPos = this.position.clone();
    newPos.x += moveX * dt;
    newPos.z += moveZ * dt;
    newPos.y += this.velocity.y * dt;

    // --- Ground ---
    if (newPos.y <= 1.7) {
      newPos.y = 1.7;
      this.velocity.y = 0;
      this.isOnGround = true;
    }

    // --- Collision response (slide) ---
    if (!this.checkCollision(newPos)) {
      this.position.copy(newPos);
    } else {
      // Try X-only
      const xOnly = this.position.clone();
      xOnly.x += moveX * dt;
      xOnly.y = newPos.y;
      if (!this.checkCollision(xOnly)) {
        this.position.x = xOnly.x;
      }
      // Try Z-only
      const zOnly = this.position.clone();
      zOnly.z += moveZ * dt;
      zOnly.y = newPos.y;
      if (!this.checkCollision(zOnly)) {
        this.position.z = zOnly.z;
      }
      // Always apply Y
      this.position.y = newPos.y;
    }

    // --- Apply to camera (Third Person View) ---
    this.camera.position.copy(this.position);
    
    // Pull camera behind the player
    const camBack = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
    camBack.normalize();
    this.camera.position.add(camBack.multiplyScalar(3.5)); // 3.5 units behind
    
    // Move camera slightly up over the shoulder
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this.camera.position.add(camUp.multiplyScalar(0.5));
    
    this.camera.position.y += bobOffset;

    // --- Update Body ---
    // Keep body exactly at player position (feet at y - 1.7)
    this.bodyGroup.position.set(this.position.x, this.position.y - 1.7, this.position.z);
    
    // Body faces the same way as camera (which looks down -Z)
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.bodyGroup.rotation.y = this.euler.y + Math.PI; 

    // Animate arms
    if (this.isOnGround && (moveX !== 0 || moveZ !== 0)) {
      const armSwing = Math.sin(this.bobTimer) * (this.isSprinting ? 0.6 : 0.3);
      this.leftArm.rotation.x = -0.1 + armSwing;
      this.rightArm.rotation.x = -0.1 - armSwing;
    } else {
      this.leftArm.rotation.x += (-0.1 - this.leftArm.rotation.x) * 10 * dt;
      this.rightArm.rotation.x += (-0.1 - this.rightArm.rotation.x) * 10 * dt;
    }

    // --- Flashlight toggle (L) ---
    if (this.keys['KeyL'] && !this._flashToggled) {
      this.flashlightOn = !this.flashlightOn;
      this.flashlight.visible = this.flashlightOn;
      this._flashToggled = true;
      window.dispatchEvent(new CustomEvent('flashlightToggle'));
      
      // Subtle flicker effect on turn on
      if (this.flashlightOn) {
        const o = this.flashlight.intensity;
        this.flashlight.intensity = 0.1;
        setTimeout(() => { if (this.flashlight) this.flashlight.intensity = o * 0.5; }, 50);
        setTimeout(() => { if (this.flashlight) this.flashlight.intensity = 0.2; }, 100);
        setTimeout(() => { if (this.flashlight) this.flashlight.intensity = o; }, 150);
      }
    }
    if (!this.keys['KeyL']) this._flashToggled = false;

    return { isSprinting: this.isSprinting };
  }

  /* ── Collision ── */

  /** Returns true if the player AABB at `pos` overlaps any collider. */
  checkCollision(pos) {
    const half = 0.3;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(pos.x - half, pos.y - 1.7, pos.z - half),
      new THREE.Vector3(pos.x + half, pos.y + 0.1, pos.z + half)
    );

    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) return true;
    }
    return false;
  }

  /** Set the list of world AABB colliders. */
  setColliders(colliders) {
    this.colliders = colliders;
  }
}
