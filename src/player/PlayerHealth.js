import { clamp } from '../utils/Helpers.js';

/**
 * PlayerHealth — manages HP and stamina.
 *
 * HP: starts at 500, reduced by zombie/ghost attacks.
 * Stamina: drains while sprinting, regenerates after a delay.
 */
export class PlayerHealth {
  constructor() {
    this.maxHealth = 1000;
    this.health = this.maxHealth;

    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.staminaDrainRate = 30;   // per second while sprinting
    this.staminaRegenRate = 15;   // per second while idle
    this.staminaRegenDelay = 1.0; // seconds before regen starts
    this.staminaRegenTimer = 0;

    this.damageCooldown = 0;
    this.damageCooldownTime = 0.5; // min time between hits

    this.isDead = false;

    // Callbacks — set by GameManager
    this.onDeath = null;
    this.onDamage = null;
    this.onHealthChange = null;
  }

  reset() {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.staminaRegenTimer = 0;
    this.damageCooldown = 0;
    this.isDead = false;
  }

  takeDamage(amount) {
    if (this.isDead || this.damageCooldown > 0) return;

    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.damageCooldown = this.damageCooldownTime;

    if (this.onDamage) this.onDamage(amount);
    if (this.onHealthChange) this.onHealthChange(this.health);

    if (this.health <= 0) {
      this.isDead = true;
      if (this.onDeath) this.onDeath();
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.health = clamp(this.health + amount, 0, this.maxHealth);
    if (this.onHealthChange) this.onHealthChange(this.health);
  }

  /**
   * Update stamina + cooldowns each frame.
   * @param {number} dt — delta time in seconds
   * @param {boolean} isSprinting
   */
  updateStamina(dt, isSprinting) {
    if (this.damageCooldown > 0) {
      this.damageCooldown -= dt;
    }

    // Bleed effect (stop at 1 HP)
    if (this.health > 1 && !this.isDead) {
      this.health = Math.max(1, this.health - (1.0 * dt)); // lose 1 HP per second
      if (this.onHealthChange) this.onHealthChange(this.health);
    }

    if (isSprinting && this.stamina > 0) {
      this.stamina = clamp(this.stamina - this.staminaDrainRate * dt, 0, this.maxStamina);
      this.staminaRegenTimer = this.staminaRegenDelay;
    } else {
      this.staminaRegenTimer -= dt;
      if (this.staminaRegenTimer <= 0) {
        this.stamina = clamp(this.stamina + this.staminaRegenRate * dt, 0, this.maxStamina);
      }
    }
  }

  getHealthPercent() { return this.health / this.maxHealth; }
  getStaminaPercent() { return this.stamina / this.maxStamina; }
  canSprint() { return this.stamina > 0; }
}
