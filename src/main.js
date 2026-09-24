import { GameManager } from './game/GameManager.js';

document.addEventListener('DOMContentLoaded', () => {
  window.gameManager = new GameManager();

  function animate() {
    requestAnimationFrame(animate);
    window.gameManager.update();
  }

  animate();
});
