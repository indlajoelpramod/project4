/**
 * EndingScreen — handles both death and escape screens.
 */
export class EndingScreen {
  constructor() {
    this.deathScreen  = document.getElementById('death-screen');
    this.endingScreen = document.getElementById('ending-screen');

    this.onDeathRestart = null;
    this.onDeathMenu    = null;
    this.onPlayAgain    = null;
    this.onEndingMenu   = null;

    this.setupButtons();
  }

  setupButtons() {
    document.getElementById('btn-death-restart').addEventListener('click', () => {
      if (this.onDeathRestart) this.onDeathRestart();
    });

    document.getElementById('btn-death-menu').addEventListener('click', () => {
      if (this.onDeathMenu) this.onDeathMenu();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      if (this.onPlayAgain) this.onPlayAgain();
    });

    document.getElementById('btn-ending-menu').addEventListener('click', () => {
      if (this.onEndingMenu) this.onEndingMenu();
    });
  }

  showDeath()  { this.deathScreen.classList.remove('hidden'); }
  hideDeath()  { this.deathScreen.classList.add('hidden'); }
  showEnding() { this.endingScreen.classList.remove('hidden'); }
  hideEnding() { this.endingScreen.classList.add('hidden'); }

  hideAll() {
    this.deathScreen.classList.add('hidden');
    this.endingScreen.classList.add('hidden');
  }
}
