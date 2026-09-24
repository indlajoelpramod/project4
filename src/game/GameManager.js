import * as THREE from 'three';
import { GameState } from './GameState.js';
import { RandomizationManager } from './RandomizationManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerHealth } from '../player/PlayerHealth.js';
import { PlayerInteraction } from '../player/PlayerInteraction.js';
import { Village } from '../world/Village.js';
import { BuildingManager } from '../buildings/BuildingManager.js';
import { ZombieManager } from '../enemies/ZombieManager.js';
import { GhostManager } from '../enemies/GhostManager.js';
import { ClueManager } from '../clues/ClueManager.js';
import { Inventory } from '../clues/Inventory.js';
import { Car } from '../vehicles/Car.js';
import { Bike } from '../vehicles/Bike.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { EndingScreen } from '../ui/EndingScreen.js';
import { DebugOverlay } from '../utils/Helpers.js';

/**
 * GameManager — central orchestrator.
 *
 * Owns the renderer, scene, camera, and all subsystems.
 * Manages the game state machine: MAIN_MENU → PLAYING → PAUSED → DEAD → ENDING.
 */
export class GameManager {
  constructor() {
    this.state = GameState.MAIN_MENU;
    this.clock = new THREE.Clock();

    // Subsystems (created per-game)
    this.scene = null;
    this.camera = null;
    this.randomizer = null;
    this.village = null;
    this.buildingManager = null;
    this.playerController = null;
    this.playerHealth = null;
    this.playerInteraction = null;
    this.inventory = null;
    this.clueManager = null;
    this.zombieManager = null;
    this.ghostManager = null;
    this.car = null;
    this.bike = null;

    this.initRenderer();
    this.initUI();
    this.initAudio();
    this.setupEventListeners();

    console.log('[GameManager] Initialized — state:', this.state);
  }

  /* ═══════════ INIT ═══════════ */

  initRenderer() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
  }

  initUI() {
    this.hud          = new HUD();
    this.mainMenu     = new MainMenu();
    this.inventoryUI  = new InventoryUI(null); // will set inventory later
    this.pauseMenu    = new PauseMenu();
    this.endingScreen = new EndingScreen();
    this.debugOverlay = new DebugOverlay();

    // Wire callbacks
    this.mainMenu.onNewGame          = () => this.startNewGame();
    this.pauseMenu.onResume          = () => this.resumeGame();
    this.pauseMenu.onRestart         = () => this.restartGame();
    this.pauseMenu.onMainMenu        = () => this.goToMainMenu();
    this.endingScreen.onDeathRestart  = () => this.restartGame();
    this.endingScreen.onDeathMenu     = () => this.goToMainMenu();
    this.endingScreen.onPlayAgain     = () => this.startNewGame();
    this.endingScreen.onEndingMenu    = () => this.goToMainMenu();

    this.mainMenu.show();
  }

  initAudio() {
    this.audioManager = new AudioManager();
  }

  setupEventListeners() {
    // Resize
    window.addEventListener('resize', () => {
      if (this.camera) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
      }
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ESC → pause/resume
    document.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (this.state === GameState.PLAYING && !this.inventoryUI.isOpen) this.pauseGame();
        else if (this.state === GameState.PAUSED) this.resumeGame();
      }
      // Backtick → debug overlay
      if (e.code === 'Backquote') this.debugOverlay.toggle();
      // E -> Exit vehicle
      if (e.code === 'KeyE' && this.state === GameState.DRIVING) {
        this.exitVehicle();
        return;
      }
      // Tab → inventory
      if (e.code === 'Tab' && this.state === GameState.PLAYING) {
        e.preventDefault();
        const isOpen = this.inventoryUI.toggle();
        if (isOpen) {
          document.exitPointerLock();
          document.getElementById('click-to-start').classList.add('hidden');
        } else {
          this.canvas.requestPointerLock();
          document.getElementById('click-to-start').classList.remove('hidden');
        }
      }
    });

    // Settings changes
    window.addEventListener('settingsChanged', e => {
      const s = e.detail;
      this.audioManager.setMasterVolume(s.masterVolume);
      this.audioManager.setMusicVolume(s.musicVolume);
      this.audioManager.setSfxVolume(s.sfxVolume);
      if (this.playerController && s.mouseSensitivity !== undefined) {
        this.playerController.sensitivity = (s.mouseSensitivity / 50) * 0.002;
      }
    });
  }

  /* ═══════════ GAME LIFECYCLE ═══════════ */

  startNewGame() {
    console.log('[GameManager] Starting new game…');
    this.cleanup();

    // Scene + camera
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    this.scene.add(this.camera); // needed for flashlight child lights

    // Randomize clues
    this.randomizer     = new RandomizationManager();
    this.buildingManager = new BuildingManager(this.scene);
    const randomConfig  = this.randomizer.generate(this.buildingManager.getBuildingConfigs());

    // World
    this.village = new Village(this.scene);
    this.village.create();
    this.buildingManager.createBuildings(randomConfig);

    // Player
    this.playerHealth      = new PlayerHealth();
    this.playerController  = new PlayerController(this.camera, this.scene, this.canvas);
    this.playerInteraction = new PlayerInteraction(this.camera, this.scene);
    this.playerController.position.set(0, 1.7, 80); // start at south edge

    // Load mouse sensitivity
    try {
      const s = JSON.parse(localStorage.getItem('fiveCluesSettings') || '{}');
      if (s.mouseSensitivity) this.playerController.sensitivity = (s.mouseSensitivity / 50) * 0.002;
    } catch { /* ignore */ }

    // Colliders
    this.allColliders = [
      ...this.village.getColliders(),
      ...this.buildingManager.getColliders(),
    ];

    // Inventory + clues
    this.inventory    = new Inventory();
    this.inventoryUI.inventory = this.inventory;
    this.clueManager  = new ClueManager(this.scene, this.inventory);
    this.clueManager.createClues(this.buildingManager.buildings, randomConfig);

    // Enemies
    this.zombieManager = new ZombieManager(this.scene);
    this.zombieManager.spawnZombies(this.playerController.position, this.buildingManager);
    this.ghostManager  = new GhostManager(this.scene);
    this.ghostManager.spawnGhosts(this.buildingManager.buildings);

    // Vehicles (static props in Phase 1)
    this.car  = new Car(new THREE.Vector3(-30, 0, -15));
    this.bike = new Bike(new THREE.Vector3(30, 0, 15));
    this.scene.add(this.car.group);
    this.scene.add(this.bike.group);
    this.allColliders.push(this.car.getCollider());
    this.allColliders.push(this.bike.getCollider());

    this.playerController.setColliders(this.allColliders);

    // Interaction callback
    this.playerInteraction.setInteractCallback(ia => this.handleInteraction(ia));

    // Health callbacks
    this.playerHealth.onDamage = () => {
      this.hud.showDamageFlash();
      this.audioManager.playDamage();
    };
    this.playerHealth.onDeath = () => this.handleDeath();

    // Custom Player Events
    const footstepHandler = () => this.audioManager.playFootstep();
    const flashlightHandler = () => this.audioManager.playDoorSound(); // use click-like sound
    
    window.addEventListener('playerFootstep', footstepHandler);
    window.addEventListener('flashlightToggle', flashlightHandler);
    
    // Cleanup on next game
    this._customEventListeners = [
      { name: 'playerFootstep', handler: footstepHandler },
      { name: 'flashlightToggle', handler: flashlightHandler },
    ];

    // UI
    this.mainMenu.hide();
    this.endingScreen.hideAll();
    this.hud.show();
    this.hud.reset();
    document.getElementById('click-to-start').classList.remove('hidden');

    // Go!
    this.state = GameState.PLAYING;
    this.audioManager.playAmbient();
    this.audioManager.playGameMusic();
    console.log('[GameManager] Game started');
  }

  /* ═══════════ INTERACTION ═══════════ */

  handleInteraction(ia) {
    switch (ia.type) {
      case 'searchable':
        if (ia.searched) {
          this.hud.showNotification('Already searched — nothing here.');
          return;
        }
        ia.searched = true;
        if (ia.hasClue) {
          const clue = this.clueManager.clues.find(c => c.buildingIndex === ia.buildingIndex && !c.collected);
          if (clue) {
            this.clueManager.collectClue(clue);
            this.audioManager.playCluePickup();
            this.hud.updateClues(this.inventory.getClueCount());
            this.hud.showNotification(`Clue Found: ${clue.data.name}`);
            if (this.inventory.hasAllClues()) {
              this.inventory.combineClues();
              setTimeout(() => this.hud.showNotification('✨ THE FIVE CLUES HAVE FORMED THE KEY.', 5000), 2000);
            }
          }
        } else {
          this.hud.showNotification('Nothing useful here…');
        }
        break;

      case 'clue':
        if (!ia.clue.collected) {
          this.clueManager.collectClue(ia.clue);
          this.audioManager.playCluePickup();
          this.hud.updateClues(this.inventory.getClueCount());
          this.hud.showNotification(`Clue Found: ${ia.clue.data.name}`);
          if (this.inventory.hasAllClues()) {
            this.inventory.combineClues();
            setTimeout(() => this.hud.showNotification('✨ THE FIVE CLUES HAVE FORMED THE KEY.', 5000), 2000);
          }
        }
        break;

      case 'building_door':
        ia.building.toggleDoor();
        this.audioManager.playDoorSound();
        break;

      case 'final_door':
        if (this.inventory.hasFinalKey()) {
          if (!this.village.isDoorUnlocked) {
            this.village.unlockFinalDoor();
            this.audioManager.playDoorSound(); // Using door sound for unlock/open
            this.hud.showNotification('THE FINAL DOOR IS OPEN. ESCAPE!', 4000);
          }
        } else if (this.inventory.hasAllClues()) {
          this.inventory.combineClues();
          this.hud.showNotification('✨ THE FIVE CLUES HAVE FORMED THE KEY. Try the door again!', 4000);
        } else {
          this.hud.showNotification(`Something is missing… (${this.inventory.getClueCount()}/5 clues)`);
        }
        break;

      case 'vehicle':
        this.enterVehicle(ia.vehicle);
        break;
    }
  }

  /* ═══════════ VEHICLES ═══════════ */

  enterVehicle(vehicle) {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.DRIVING;
    this.activeVehicle = vehicle;
    this.activeVehicle.isOccupied = true;
    this.activeVehicle.speed = 0; // reset
    this.activeVehicle.toggleHeadlights();
    
    // Parent camera to vehicle for easy offset, or just position it in update loop.
    // We'll position it manually in the update loop to allow mouse-look to remain independent.
    
    this.hud.showPrompt('[E] EXIT VEHICLE');
    this.audioManager.playDoorSound(); // Placeholder door sound
    this.audioManager.playEngineStart();
  }

  exitVehicle() {
    if (this.state !== GameState.DRIVING) return;
    
    // Find safe exit position (to the left/right of vehicle)
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.activeVehicle.rotation);
    const exitPos = this.activeVehicle.position.clone().add(right.multiplyScalar(3));
    
    // Check if exitPos is inside a building
    let safe = true;
    for (const box of this.buildingManager.getColliders()) {
      if (box.containsPoint(exitPos)) { safe = false; break; }
    }
    
    // If not safe right, try left
    if (!safe) {
      const left = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), this.activeVehicle.rotation);
      const exitPosL = this.activeVehicle.position.clone().add(left.multiplyScalar(3));
      exitPos.copy(exitPosL);
    }

    this.playerController.position.copy(exitPos);
    this.playerController.velocity.set(0,0,0);
    this.camera.position.copy(exitPos);

    this.activeVehicle.isOccupied = false;
    this.activeVehicle.toggleHeadlights();
    this.activeVehicle.setInputs({}); // clear inputs
    this.activeVehicle = null;
    this.state = GameState.PLAYING;
    this.hud.showPrompt(null);
    if (this.hud.hideVehicleHUD) this.hud.hideVehicleHUD();
    this.audioManager.playDoorSound();
    this.audioManager.stopEngine();
  }

  /* ═══════════ STATE TRANSITIONS ═══════════ */

  handleDeath() {
    this.state = GameState.DEAD;
    this.audioManager.playDeath();
    this.audioManager.stopAll();
    this.hud.hide();
    document.exitPointerLock();
    document.getElementById('click-to-start').classList.add('hidden');
    this.endingScreen.showDeath();
  }

  handleEscape() {
    this.state = GameState.ESCAPING;
    this.audioManager.playEscape();
    this.hud.hide();
    document.exitPointerLock();
    document.getElementById('click-to-start').classList.add('hidden');

    // Fade to black
    const vig = document.getElementById('vignette-overlay');
    vig.style.transition = 'opacity 3s, background 3s';
    vig.style.opacity = '1';
    vig.style.background = 'black';

    setTimeout(() => {
      this.state = GameState.ENDING;
      this.endingScreen.showEnding();
      vig.style.transition = '';
      vig.style.opacity = '';
      vig.style.background = '';
    }, 3500);
  }

  pauseGame() {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    document.exitPointerLock();
    this.pauseMenu.show();
    document.getElementById('click-to-start').classList.add('hidden');
  }

  resumeGame() {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.pauseMenu.hide();
    document.getElementById('click-to-start').classList.remove('hidden');
  }

  restartGame() {
    this.pauseMenu.hide();
    this.endingScreen.hideAll();
    this.startNewGame();
  }

  goToMainMenu() {
    this.cleanup();
    this.state = GameState.MAIN_MENU;
    this.pauseMenu.hide();
    this.inventoryUI.hide();
    this.endingScreen.hideAll();
    this.hud.hide();
    document.getElementById('click-to-start').classList.add('hidden');
    document.exitPointerLock();
    this.mainMenu.show();
    this.audioManager.stopAll();
    this.renderer.clear();
  }

  /* ═══════════ CLEANUP ═══════════ */

  cleanup() {
    if (this._customEventListeners) {
      this._customEventListeners.forEach(e => window.removeEventListener(e.name, e.handler));
      this._customEventListeners = [];
    }

    if (this.audioManager) this.audioManager.stopAll();

    if (this.zombieManager) this.zombieManager.clear();
    if (this.ghostManager)  this.ghostManager.clear();
    if (this.clueManager)   this.clueManager.clear();

    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        }
      });
      this.scene.clear();
    }

    this.scene = null;
    this.camera = null;
    this.village = null;
    this.buildingManager = null;
    this.playerController = null;
    this.playerHealth = null;
    this.playerInteraction = null;
    this.inventory = null;
    this.clueManager = null;
    this.zombieManager = null;
    this.ghostManager = null;
    this.car = null;
    this.bike = null;
    this.allColliders = null;
  }

  /* ═══════════ GAME LOOP ═══════════ */

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    if ((this.state === GameState.PLAYING || this.state === GameState.DRIVING) && this.scene && this.camera) {
      
      let playerPos = this.playerController.position;

      if (this.state === GameState.PLAYING) {
        // Player walking
        const ps = this.playerController.update(dt, this.playerHealth.stamina);
        this.playerHealth.updateStamina(dt, ps.isSprinting);

        // Interaction
        const ia = this.playerInteraction.update();
        this.hud.showPrompt(ia ? ia.prompt : null);
      } else if (this.state === GameState.DRIVING) {
        // Vehicle driving
        this.activeVehicle.setInputs(this.playerController.keys);
        this.activeVehicle.update(dt, this.allColliders);
        playerPos = this.activeVehicle.position;

        // Camera follow
        const offset = this.activeVehicle.name === 'Motorcycle' ? new THREE.Vector3(0, 2, 4) : new THREE.Vector3(0, 3, 6);
        offset.applyAxisAngle(new THREE.Vector3(0,1,0), this.activeVehicle.rotation);
        
        // Smoothly interpolate camera position
        const targetPos = this.activeVehicle.position.clone().add(offset);
        this.camera.position.lerp(targetPos, 0.2);
        
        // Align camera rotation to vehicle
        this.playerController.euler.y = this.activeVehicle.rotation + Math.PI;
        this.playerController.euler.x = -0.15;
        this.camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(this.playerController.euler), 0.1);

        // Update vehicle HUD
        const kmh = Math.abs(Math.round(this.activeVehicle.speed * 3.6));
        if (this.hud.showVehicleHUD) this.hud.showVehicleHUD(kmh, this.activeVehicle.name, this.activeVehicle.health);
        
        // Engine sound
        this.audioManager.playEngineLoop(this.activeVehicle.speed / this.activeVehicle.maxSpeed);
      }

      // Enemies
      this.zombieManager.update(dt, playerPos, this.playerHealth, this.allColliders);
      this.ghostManager.update(dt, playerPos, this.playerHealth);

      // Zombie-Vehicle Collision
      if (this.state === GameState.DRIVING && Math.abs(this.activeVehicle.speed) > 3) {
        const vBox = this.activeVehicle.getCollider();
        for (let i = this.zombieManager.zombies.length - 1; i >= 0; i--) {
          const z = this.zombieManager.zombies[i];
          const zBox = new THREE.Box3().setFromObject(z.group);
          if (vBox.intersectsBox(zBox)) {
            // Kill zombie
            this.scene.remove(z.group);
            this.zombieManager.zombies.splice(i, 1);
            this.audioManager.playDamage(); // Splat sound placeholder
            this.activeVehicle.takeDamage(10);
          }
        }
      }

      // Vehicles (update idle vehicles too for friction)
      if (this.state !== GameState.DRIVING || this.activeVehicle !== this.car) this.car.update(dt, this.allColliders);
      if (this.state !== GameState.DRIVING || this.activeVehicle !== this.bike) this.bike.update(dt, this.allColliders);

      // Clue animations
      this.clueManager.update(dt);

      // Environment (flickering lights)
      this.village.update(dt);

      // Escape Trigger Zone Check
      if (this.village.isDoorUnlocked && this.state === GameState.PLAYING) {
        // Trigger box behind the door
        const escapeZone = new THREE.Box3(
          new THREE.Vector3(-3, 0, -96),
          new THREE.Vector3(3, 4, -91) // right behind the -90 door
        );
        if (escapeZone.containsPoint(this.playerController.position)) {
          this.handleEscape();
        }
      }

      // Buildings (door animations)
      this.buildingManager.update(dt);

      // HUD
      this.hud.updateHealth(this.playerHealth.health);
      this.hud.updateStamina(this.playerHealth.getStaminaPercent());
      this.hud.updateFlashlight(this.playerController.flashlightOn);
      this.hud.updateGhostEffect(this.ghostManager.getNearGhostIntensity());

      if (this.ghostManager.isGhostChasing()) {
        this.hud.showWarning('⚠ SOMETHING IS CHASING YOU');
      }

      // Pointer lock prompt
      const cts = document.getElementById('click-to-start');
      cts.classList.toggle('hidden', this.playerController.isLocked || this.inventoryUI.isOpen);

      // Debug
      this.debugOverlay.update({
        position: playerPos,
        state: this.state,
        zombieCount: this.zombieManager.getCount(),
        ghostState: this.ghostManager.getGhostStates().join(', '),
        clueLocations: this.randomizer ?
          this.randomizer.config.buildings.map(b => `B${b.buildingIndex + 1}:${b.clueLocation}`).join(', ') : '-',
      });

      // Render
      this.renderer.render(this.scene, this.camera);
    }
  }
}
