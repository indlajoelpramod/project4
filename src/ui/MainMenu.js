/**
 * MainMenu — title screen with NEW GAME, HOW TO PLAY, SETTINGS.
 * Handles settings persistence via localStorage.
 */
export class MainMenu {
  constructor() {
    this.container = document.getElementById('main-menu');
    this.howToPlay = document.getElementById('how-to-play-screen');
    this.settings  = document.getElementById('settings-screen');

    this.onNewGame = null; // set by GameManager

    this.setupButtons();
    this.setupSettings();
  }

  setupButtons() {
    document.getElementById('btn-new-game').addEventListener('click', () => {
      if (this.onNewGame) this.onNewGame();
    });

    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      this.container.classList.add('hidden');
      this.howToPlay.classList.remove('hidden');
    });

    document.getElementById('btn-back-from-help').addEventListener('click', () => {
      this.howToPlay.classList.add('hidden');
      this.container.classList.remove('hidden');
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      this.container.classList.add('hidden');
      this.settings.dataset.opener = 'main';
      this.settings.classList.remove('hidden');
    });

    // Shared back button — returns to whichever screen opened settings
    document.getElementById('btn-back-from-settings').addEventListener('click', () => {
      const opener = this.settings.dataset.opener || 'main';
      this.settings.classList.add('hidden');
      if (opener === 'pause') {
        document.getElementById('pause-menu').classList.remove('hidden');
      } else {
        this.container.classList.remove('hidden');
      }
    });
  }

  setupSettings() {
    // Load saved settings
    try {
      const s = JSON.parse(localStorage.getItem('fiveCluesSettings') || '{}');
      if (s.masterVolume !== undefined) document.getElementById('setting-master-volume').value = s.masterVolume * 100;
      if (s.musicVolume  !== undefined) document.getElementById('setting-music-volume').value  = s.musicVolume * 100;
      if (s.sfxVolume    !== undefined) document.getElementById('setting-sfx-volume').value    = s.sfxVolume * 100;
      if (s.mouseSensitivity !== undefined) document.getElementById('setting-mouse-sensitivity').value = s.mouseSensitivity;
      if (s.graphicsQuality) document.getElementById('setting-graphics-quality').value = s.graphicsQuality;
    } catch { /* ignore */ }

    // Save on every change
    const save = () => {
      const settings = {
        masterVolume:    document.getElementById('setting-master-volume').value / 100,
        musicVolume:     document.getElementById('setting-music-volume').value / 100,
        sfxVolume:       document.getElementById('setting-sfx-volume').value / 100,
        mouseSensitivity: parseInt(document.getElementById('setting-mouse-sensitivity').value, 10),
        graphicsQuality: document.getElementById('setting-graphics-quality').value,
      };
      localStorage.setItem('fiveCluesSettings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: settings }));
    };

    document.querySelectorAll('#settings-screen input, #settings-screen select').forEach(el => {
      el.addEventListener('change', save);
      el.addEventListener('input', save);
    });
  }

  show() {
    this.container.classList.remove('hidden');
    this.howToPlay.classList.add('hidden');
    this.settings.classList.add('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
    this.howToPlay.classList.add('hidden');
    this.settings.classList.add('hidden');
  }
}
