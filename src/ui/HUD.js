/**
 * HUD — manages the in-game heads-up display.
 *
 * Updates health, stamina bar, clue counter, interaction prompts,
 * warning text, flashlight indicator, damage flash, and ghost overlay.
 */
export class HUD {
  constructor() {
    this.container        = document.getElementById('hud');
    this.healthValue      = document.getElementById('health-value');
    this.staminaFill      = document.getElementById('stamina-fill');
    this.clueCount        = document.getElementById('clue-count');
    this.interactionPrompt = document.getElementById('interaction-prompt');
    this.warningText      = document.getElementById('warning-text');
    this.flashlightInd    = document.getElementById('flashlight-indicator');
    this.crosshair        = document.getElementById('crosshair');
    this.notification     = document.getElementById('notification');
    this.notificationText = document.getElementById('notification-text');
    this.vignetteOverlay  = document.getElementById('vignette-overlay');
    this.damageOverlay    = document.getElementById('damage-overlay');
    this.ghostOverlay     = document.getElementById('ghost-overlay');
    this.vehicleHud       = document.getElementById('vehicle-hud');
    this.vehicleSpeed     = document.getElementById('vehicle-speed');
    this.vehicleType      = document.getElementById('vehicle-type');
    this.vehicleHealth    = document.getElementById('vehicle-health');

    this._notifTimer = null;
    this._warnTimer  = null;
  }

  show() {
    this.container.classList.remove('hidden');
    this.crosshair.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
    this.crosshair.classList.add('hidden');
  }

  /* ── Data updates ── */

  updateHealth(hp) {
    this.healthValue.textContent = Math.ceil(hp);
    const pct = hp / 1000;
    this.healthValue.style.color =
      pct < 0.25 ? '#ff3333' :
      pct < 0.5  ? '#ff9933' : '#ff6666';
  }

  updateStamina(pct) {
    this.staminaFill.style.width = `${pct * 100}%`;
    this.staminaFill.style.backgroundColor =
      pct < 0.2 ? '#ff3333' :
      pct < 0.5 ? '#ff9933' : '#33ccff';
  }

  updateClues(count) {
    this.clueCount.textContent = count;
  }

  updateFlashlight(on) {
    this.flashlightInd.classList.toggle('hidden', !on);
  }

  /* ── Prompts & notifications ── */

  showPrompt(text) {
    if (text) {
      this.interactionPrompt.textContent = text;
      this.interactionPrompt.classList.remove('hidden');
    } else {
      this.interactionPrompt.classList.add('hidden');
    }
  }

  showWarning(text) {
    this.warningText.textContent = text;
    this.warningText.classList.remove('hidden');
    clearTimeout(this._warnTimer);
    this._warnTimer = setTimeout(() => this.warningText.classList.add('hidden'), 3000);
  }

  showNotification(text, duration = 3000) {
    this.notificationText.textContent = text;
    this.notification.classList.remove('hidden');
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => this.notification.classList.add('hidden'), duration);
  }

  /* ── Screen effects ── */

  showDamageFlash() {
    this.damageOverlay.classList.add('active');
    setTimeout(() => this.damageOverlay.classList.remove('active'), 300);
  }

  updateGhostEffect(intensity) {
    this.ghostOverlay.style.opacity  = intensity > 0 ? intensity * 0.3 : 0;
    this.vignetteOverlay.style.opacity = 0.5 + (intensity > 0 ? intensity * 0.5 : 0);
  }

  /* ── Vehicles ── */

  showVehicleHUD(speed, type, health) {
    this.vehicleHud.classList.remove('hidden');
    this.vehicleSpeed.textContent = `${speed} km/h`;
    this.vehicleType.textContent = type.toUpperCase();
    this.vehicleHealth.textContent = `Condition: ${health}%`;
    this.vehicleHealth.style.color = health <= 0 ? '#ff0000' : (health < 50 ? '#ffaa00' : '#aaa');
  }

  hideVehicleHUD() {
    this.vehicleHud.classList.add('hidden');
  }

  /* ── Reset ── */

  reset() {
    this.updateHealth(1000);
    this.updateStamina(1);
    this.updateClues(0);
    this.showPrompt(null);
    this.damageOverlay.classList.remove('active');
    this.ghostOverlay.style.opacity = 0;
    this.vignetteOverlay.style.opacity = 0.5;
  }
}
