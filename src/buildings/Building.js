import * as THREE from 'three';

/**
 * Building — procedural building with walls, door opening, interior furniture.
 *
 * Each building has a unique accent color and houses one ghost + one clue.
 * Interior furniture items serve as searchable locations for clues.
 */

const WALL_THICKNESS = 0.3;

// Furniture geometry by location type
const FURNITURE = {
  table:    { w: 1.5, h: 0.8, d: 1.0, color: 0x5D4037, label: 'Table' },
  drawer:   { w: 0.8, h: 0.85, d: 0.5, color: 0x4E342E, label: 'Drawer' },
  shelf:    { w: 1.5, h: 1.8, d: 0.35, color: 0x3E2723, label: 'Shelf' },
  cabinet:  { w: 0.7, h: 1.4, d: 0.5, color: 0x33291A, label: 'Cabinet' },
  bedroom:  { w: 1.4, h: 0.5, d: 2.0, color: 0x4A3728, label: 'Bed' },
  basement: { w: 1.0, h: 0.1, d: 1.0, color: 0x2C2C2C, label: 'Trapdoor' },
  bathroom: { w: 0.7, h: 0.45, d: 1.3, color: 0xBBBBBB, label: 'Bathtub' },
  storage:  { w: 0.8, h: 0.8, d: 0.8, color: 0x6D4C2E, label: 'Storage Crate' },
};

export class Building {
  /**
   * @param {Object} config
   * @param {string}          config.name
   * @param {number}          config.width
   * @param {number}          config.depth
   * @param {number}          [config.height=4]
   * @param {THREE.Vector3}   config.position
   * @param {number}          config.accentColor
   * @param {number}          config.buildingIndex
   * @param {string|null}     config.clueLocation — set by RandomizationManager
   * @param {Array}           config.searchableLocations — [{ name, x, z }]
   */
  constructor(config) {
    this.name = config.name;
    this.width = config.width;
    this.depth = config.depth;
    this.height = config.height || 4;
    this.accentColor = config.accentColor;
    this.buildingIndex = config.buildingIndex;
    this.clueLocation = config.clueLocation || null;
    this.searchableLocations = config.searchableLocations || [];

    this.group = new THREE.Group();
    this.group.position.copy(config.position);

    this.colliders = [];
    this.interactables = [];

    this.buildExterior();
    this.buildInterior();
    this.buildSign();
  }

  /* ═══════════ EXTERIOR ═══════════ */

  buildExterior() {
    const W = this.width, D = this.depth, H = this.height;
    
    // Mix the accent color with white to make pastel/brighter walls
    const wallColor = new THREE.Color(this.accentColor).lerp(new THREE.Color(0xffffff), 0.5);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });

    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.15, D),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 })
    );
    floor.position.y = 0.075;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.15, D),
      new THREE.MeshStandardMaterial({ color: 0x252020, roughness: 0.95 })
    );
    ceil.position.y = H;
    this.group.add(ceil);

    // Back wall
    this.addWall(0, H / 2, -D / 2, W, H, WALL_THICKNESS, wallMat);

    // Left wall
    this.addWall(-W / 2, H / 2, 0, WALL_THICKNESS, H, D, wallMat);

    // Right wall
    this.addWall(W / 2, H / 2, 0, WALL_THICKNESS, H, D, wallMat);

    // Front wall (with 2-unit-wide, 3-unit-tall door opening)
    const doorW = 2, doorH = 3;
    const sideW = (W - doorW) / 2;

    // Left section
    this.addWall(-(doorW / 2 + sideW / 2), H / 2, D / 2, sideW, H, WALL_THICKNESS, wallMat);
    // Right section
    this.addWall( (doorW / 2 + sideW / 2), H / 2, D / 2, sideW, H, WALL_THICKNESS, wallMat);
    // Above door
    const aboveH = H - doorH;
    if (aboveH > 0) {
      this.addWall(0, doorH + aboveH / 2, D / 2, doorW, aboveH, WALL_THICKNESS, wallMat);
    }

    // Accent stripe
    const accentMat = new THREE.MeshStandardMaterial({
      color: this.accentColor, emissive: this.accentColor, emissiveIntensity: 0.15,
    });
    const accent = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.2, 0.05), accentMat);
    accent.position.set(0, H - 0.1, D / 2 + 0.2);
    this.group.add(accent);

    // Decorative windows
    this.addWindows();

    // Interactive Door
    this.addDoor(doorW, doorH, D / 2);
  }

  addDoor(w, h, z) {
    // Hinge group on the left side of the doorway
    this.doorHinge = new THREE.Group();
    this.doorHinge.position.set(-w / 2, h / 2, z);
    this.group.add(this.doorHinge);

    // Door mesh
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x2E1E12, roughness: 0.8 });
    this.doorMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), doorMat);
    this.doorMesh.position.set(w / 2, 0, 0); // Offset from hinge
    this.doorMesh.castShadow = true;
    this.doorHinge.add(this.doorMesh);

    // State
    this.isDoorOpen = false;

    // Interaction data
    this.doorMesh.userData.interactable = {
      type: 'building_door',
      prompt: '[E] OPEN DOOR',
      building: this,
    };
    this.interactables.push(this.doorMesh);

    // Dynamic door collider
    this.doorCollider = new THREE.Box3();
    this.updateDoorCollider();
    this.colliders.push(this.doorCollider);
  }

  updateDoorCollider() {
    if (!this.doorCollider) return;
    this.doorCollider.setFromObject(this.doorMesh);
  }

  toggleDoor() {
    this.isDoorOpen = !this.isDoorOpen;
    this.doorMesh.userData.interactable.prompt = this.isDoorOpen ? '[E] CLOSE DOOR' : '[E] OPEN DOOR';
  }

  update(dt) {
    if (this.doorHinge) {
      const targetRotation = this.isDoorOpen ? -Math.PI / 2 + 0.2 : 0;
      this.doorHinge.rotation.y += (targetRotation - this.doorHinge.rotation.y) * 8 * dt;
      this.updateDoorCollider();
    }
  }

  /** Helper: add a wall mesh and its world-space collider. */
  addWall(x, y, z, w, h, d, mat) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.group.add(wall);

    // World-space AABB
    const wp = new THREE.Vector3(x, y, z).add(this.group.position);
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(wp.x - w / 2, wp.y - h / 2, wp.z - d / 2),
      new THREE.Vector3(wp.x + w / 2, wp.y + h / 2, wp.z + d / 2)
    ));
  }

  addWindows() {
    const wMat = new THREE.MeshStandardMaterial({ color: 0x0a0a15, roughness: 0.3 });
    const geo = new THREE.PlaneGeometry(1, 1);

    // Left wall window
    const w1 = new THREE.Mesh(geo, wMat);
    w1.position.set(-this.width / 2 - 0.01, 2, -this.depth / 4);
    w1.rotation.y = -Math.PI / 2;
    this.group.add(w1);

    // Right wall window
    const w2 = new THREE.Mesh(geo, wMat);
    w2.position.set(this.width / 2 + 0.01, 2, -this.depth / 4);
    w2.rotation.y = Math.PI / 2;
    this.group.add(w2);

    // Back wall window
    const w3 = new THREE.Mesh(geo, wMat);
    w3.position.set(0, 2, -this.depth / 2 - 0.01);
    w3.rotation.y = Math.PI;
    this.group.add(w3);
  }

  /* ═══════════ INTERIOR ═══════════ */

  buildInterior() {
    // Dim interior light
    const light = new THREE.PointLight(0x443322, 0.3, 15);
    light.position.set(0, this.height - 0.5, 0);
    this.group.add(light);

    // Create furniture for each searchable location
    this.searchableLocations.forEach(loc => this.addFurniture(loc));

    // Build the Safe Room in the back right corner
    this.buildSafeRoom();
  }

  buildSafeRoom() {
    const W = this.width;
    const D = this.depth;
    const H = this.height;
    const roomW = 8;
    const roomD = 8;
    
    // Ensure building is large enough
    if (W < 12 || D < 12) return;

    const wallColor = new THREE.Color(this.accentColor).lerp(new THREE.Color(0xffffff), 0.5);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 });

    // Front wall of safe room (parallel to X, at z = -D/2 + roomD)
    const frontWallW = roomW;
    const frontWallX = (W / 2) - (roomW / 2);
    const frontWallZ = -D / 2 + roomD;
    this.addWall(frontWallX, H / 2, frontWallZ, frontWallW, H, WALL_THICKNESS, wallMat);

    // Side wall of safe room (parallel to Z, at x = W / 2 - roomW) with a doorway
    const sideWallD = roomD;
    const sideWallX = W / 2 - roomW;
    const sideWallZ = -D / 2 + (roomD / 2);
    
    const doorSize = 3;
    const pieceD = (sideWallD - doorSize) / 2;
    // Back piece
    this.addWall(sideWallX, H / 2, -D / 2 + pieceD / 2, WALL_THICKNESS, H, pieceD, wallMat);
    // Front piece
    this.addWall(sideWallX, H / 2, frontWallZ - pieceD / 2, WALL_THICKNESS, H, pieceD, wallMat);
    // Above door
    const aboveH = H - 3;
    if (aboveH > 0) {
      this.addWall(sideWallX, 3 + aboveH / 2, sideWallZ, WALL_THICKNESS, aboveH, doorSize, wallMat);
    }

    // Add green safe room light
    const safeLight = new THREE.PointLight(0x00ff00, 0.8, 12);
    safeLight.position.set(W / 2 - roomW / 2, H - 0.5, -D / 2 + roomD / 2);
    this.group.add(safeLight);

    // Save world-space box for trigger logic
    const wp = this.group.position.clone();
    this.safeRoomBox = new THREE.Box3(
      new THREE.Vector3(wp.x + W / 2 - roomW, wp.y, wp.z - D / 2),
      new THREE.Vector3(wp.x + W / 2, wp.y + H, wp.z - D / 2 + roomD)
    );
  }

  getSafeRoomBox() {
    return this.safeRoomBox;
  }

  addFurniture(loc) {
    const cfg = FURNITURE[loc.name];
    if (!cfg) {
      console.warn(`[Building] Unknown furniture type: ${loc.name}`);
      return;
    }

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d),
      new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.85 })
    );
    mesh.position.set(loc.x, cfg.h / 2 + 0.15, loc.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Mark as searchable
    mesh.userData.interactable = {
      type: 'searchable',
      prompt: `[E] SEARCH ${cfg.label.toUpperCase()}`,
      locationName: loc.name,
      buildingIndex: this.buildingIndex,
      hasClue: this.clueLocation === loc.name,
      searched: false,
    };

    this.group.add(mesh);
    this.interactables.push(mesh);

    // Furniture collider
    const wp = new THREE.Vector3(
      this.group.position.x + loc.x,
      cfg.h / 2 + 0.15,
      this.group.position.z + loc.z
    );
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(wp.x - cfg.w / 2, 0, wp.z - cfg.d / 2),
      new THREE.Vector3(wp.x + cfg.w / 2, cfg.h + 0.15, wp.z + cfg.d / 2)
    ));
  }

  /* ═══════════ SIGN ═══════════ */

  buildSign() {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, emissive: this.accentColor, emissiveIntensity: 0.1,
      })
    );
    sign.position.set(0, this.height + 0.4, this.depth / 2 + 0.15);
    this.group.add(sign);
  }

  /* ═══════════ ACCESSORS ═══════════ */

  getColliders()     { return this.colliders; }
  getInteractables() { return this.interactables; }

  /** World-space position where the clue should be placed. */
  getClueWorldPosition() {
    if (!this.clueLocation) return null;
    const loc = this.searchableLocations.find(l => l.name === this.clueLocation);
    if (!loc) return null;
    return new THREE.Vector3(
      this.group.position.x + loc.x,
      0.5,
      this.group.position.z + loc.z
    );
  }

  /** World-space position just outside the door. */
  getDoorPosition() {
    return new THREE.Vector3(
      this.group.position.x,
      0,
      this.group.position.z + this.depth / 2 + 1
    );
  }
}
