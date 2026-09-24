/**
 * PauseMenu — ESC overlay with RESUME, RESTART, SETTINGS, MAIN MENU.
 */
export class PauseMenu {
  constructor() {
    this.container = document.getElementById('pause-menu');

    this.onResume   = null;
    this.onRestart  = null;
    this.onMainMenu = null;

    this.setupButtons();
  }

  setupButtons() {
    document.getElementById('btn-resume').addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    document.getElementById('btn-pause-settings').addEventListener('click', () => {
      this.container.classList.add('hidden');
      const settings = document.getElementById('settings-screen');
      settings.dataset.opener = 'pause';
      settings.classList.remove('hidden');
    });

    document.getElementById('btn-main-menu-from-pause').addEventListener('click', () => {
      if (this.onMainMenu) this.onMainMenu();
    });
  }

  show() { this.container.classList.remove('hidden'); }
  hide() {
    this.container.classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
  }
}
