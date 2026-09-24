import * as THREE from 'three';

/**
 * PlayerInteraction — raycaster-based interaction system.
 *
 * Casts a ray from the camera center each frame. If it hits an object
 * with `userData.interactable`, the HUD shows a prompt. Pressing E or F
 * triggers the interaction callback set by GameManager.
 */
export class PlayerInteraction {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene  = scene;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 8; // increased to 8 units to account for third-person camera offset

    this.currentInteractable = null;
    this.interactCallback = null;

    // Key state (prevent repeat firing while held)
    this._eDown = false;
    this._fDown = false;

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyE' && !this._eDown) { this._eDown = true; this.fire('E'); }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'KeyE') this._eDown = false;
    });

    // Support on-screen mobile interact button
    window.addEventListener('action-interact', () => {
      this.fire('E');
    });
  }

  /** Set the callback for all interactions — called with (interactable). */
  setInteractCallback(cb) { this.interactCallback = cb; }

  /** Cast ray and return the current interactable (or null). */
  update() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    this.currentInteractable = null;
    for (const hit of hits) {
      if (hit.object.userData.interactable) {
        this.currentInteractable = hit.object.userData.interactable;
        break;
      }
    }
    return this.currentInteractable;
  }

  /** Fire an interaction if an interactable is targeted. */
  fire(key) {
    if (!this.currentInteractable || !this.interactCallback) return;
    if (key === 'E') this.interactCallback(this.currentInteractable);
  }

  getCurrentPrompt() {
    return this.currentInteractable ? this.currentInteractable.prompt : null;
  }
}
