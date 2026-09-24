/**
 * Utility functions and debug overlay for THE FIVE CLUES.
 */

/** Clamp a value between min and max. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation between a and b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Random float between min (inclusive) and max (exclusive). */
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/** Random integer between min and max (inclusive). */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 3D Euclidean distance between two Vector3-like objects. */
export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** 2D distance (XZ plane) between two Vector3-like objects. */
export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Shuffle an array in-place (Fisher-Yates). */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Debug overlay — toggled with backtick (`) key.
 * Displays FPS, player position, game state, and enemy info.
 */
export class DebugOverlay {
  constructor() {
    this.element = document.getElementById('debug-overlay');
    this.fpsEl = document.getElementById('debug-fps');
    this.posEl = document.getElementById('debug-position');
    this.stateEl = document.getElementById('debug-state');
    this.zombiesEl = document.getElementById('debug-zombies');
    this.ghostEl = document.getElementById('debug-ghost');
    this.cluesEl = document.getElementById('debug-clues');

    this.enabled = false;
    this.frameCount = 0;
    this.lastFpsTime = 0;
    this.fps = 0;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.element) {
      this.element.classList.toggle('hidden', !this.enabled);
    }
  }

  update(data) {
    if (!this.enabled) return;

    // FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    if (this.fpsEl) this.fpsEl.textContent = `FPS: ${this.fps}`;
    if (data.position && this.posEl) {
      this.posEl.textContent = `Pos: ${data.position.x.toFixed(1)}, ${data.position.y.toFixed(1)}, ${data.position.z.toFixed(1)}`;
    }
    if (data.state && this.stateEl) this.stateEl.textContent = `State: ${data.state}`;
    if (data.zombieCount !== undefined && this.zombiesEl) this.zombiesEl.textContent = `Zombies: ${data.zombieCount}`;
    if (data.ghostState && this.ghostEl) this.ghostEl.textContent = `Ghost: ${data.ghostState}`;
    if (data.clueLocations && this.cluesEl) this.cluesEl.textContent = `Clues: ${data.clueLocations}`;
  }
}
