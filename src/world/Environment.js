import * as THREE from 'three';
import { randomBetween } from '../utils/Helpers.js';

/**
 * Environment — fog, lighting, ground, trees, fences, street lights, rocks.
 * Creates the horror atmosphere of the abandoned village.
 */
export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.streetLights = [];
  }

  create() {
    this.createFog();
    this.createLighting();
    this.createGround();
    this.createTrees();
    this.createFences();
    this.createStreetLights();
    this.createDecorations();
    this.createParticles();
  }

  /* ── Fog ── */
  createFog() {
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.005); // Morning Sky Blue
    this.scene.background = new THREE.Color(0x87CEEB);
  }

  /* ── Global lighting ── */
  createLighting() {
    // Sunlight
    const moon = new THREE.DirectionalLight(0xfff5b6, 1.2);
    moon.position.set(50, 80, -30);
    moon.castShadow = true;
    moon.shadow.mapSize.width  = 2048;
    moon.shadow.mapSize.height = 2048;
    moon.shadow.camera.near   = 0.5;
    moon.shadow.camera.far    = 200;
    moon.shadow.camera.left   = -100;
    moon.shadow.camera.right  =  100;
    moon.shadow.camera.top    =  100;
    moon.shadow.camera.bottom = -100;
    this.scene.add(moon);

    // Dim ambient
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Hemisphere
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.5));
  }

  /* ── Ground ── */
  createGround() {
    const geo = new THREE.PlaneGeometry(250, 250);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3cb371, roughness: 0.95 }); // Medium sea green
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  /* ── Trees ── */
  createTrees() {
    const avoid = [
      { x: -50, z: -50 }, { x: 50, z: -40 }, { x: -10, z: 20 },
      { x: 55, z: 45 }, { x: -45, z: 60 }, { x: 0, z: -90 },
    ];

    for (let i = 0; i < 40; i++) {
      let x, z, valid = false, tries = 0;
      while (!valid && tries < 30) {
        x = randomBetween(-110, 110);
        z = randomBetween(-100, 100);
        valid = avoid.every(p => Math.hypot(x - p.x, z - p.z) > 16);
        if (Math.abs(x) < 5) valid = false; // keep off main road
        tries++;
      }
      if (valid) this.addTree(x, z);
    }
  }

  addTree(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);

    const tH = randomBetween(2.5, 4.5);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.25, tH, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 }) // Saddle brown
    );
    trunk.position.y = tH / 2;
    trunk.castShadow = true;
    g.add(trunk);

    const fH = randomBetween(2, 4);
    const fR = randomBetween(1.2, 2.5);
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(fR, fH, 6),
      new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 }) // Forest green
    );
    foliage.position.y = tH + fH / 2 - 0.5;
    foliage.castShadow = true;
    g.add(foliage);

    g.rotation.y = randomBetween(0, Math.PI * 2);
    this.scene.add(g);

    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.3, 0, z - 0.3),
      new THREE.Vector3(x + 0.3, tH, z + 0.3)
    ));
  }

  /* ── Fences ── */
  createFences() {
    const m = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    // North (gap at x ∈ [-1.5, 1.5] for final door)
    this.fenceLine(-100, -1.5, -95, m);
    this.fenceLine(1.5, 100, -95, m);
    // South
    this.fenceLine(-100, 100, 95, m);
    // East / West
    this.fenceLineZ(100, -95, 95, m);
    this.fenceLineZ(-100, -95, 95, m);
  }

  /** Horizontal fence (along X). */
  fenceLine(startX, endX, z, mat) {
    const len = endX - startX;
    const count = Math.max(1, Math.floor(Math.abs(len) / 3));

    for (let i = 0; i <= count; i++) {
      const px = startX + (len / count) * i;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), mat);
      post.position.set(px, 0.6, z);
      post.castShadow = true;
      this.scene.add(post);
    }

    for (const ry of [0.4, 0.9]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(len), 0.08, 0.08), mat);
      rail.position.set((startX + endX) / 2, ry, z);
      this.scene.add(rail);
    }

    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(Math.min(startX, endX), 0, z - 0.2),
      new THREE.Vector3(Math.max(startX, endX), 10.0, z + 0.2)
    ));
  }

  /** Vertical fence (along Z). */
  fenceLineZ(x, startZ, endZ, mat) {
    const len = endZ - startZ;
    const count = Math.max(1, Math.floor(Math.abs(len) / 3));

    for (let i = 0; i <= count; i++) {
      const pz = startZ + (len / count) * i;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), mat);
      post.position.set(x, 0.6, pz);
      post.castShadow = true;
      this.scene.add(post);
    }

    for (const ry of [0.4, 0.9]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, Math.abs(len)), mat);
      rail.position.set(x, ry, (startZ + endZ) / 2);
      this.scene.add(rail);
    }

    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - 0.2, 0, Math.min(startZ, endZ)),
      new THREE.Vector3(x + 0.2, 10.0, Math.max(startZ, endZ))
    ));
  }

  /* ── Street lights ── */
  createStreetLights() {
    const positions = [
      { x: -5, z: -60 }, { x: 5, z: -30 }, { x: -5, z: 0 },
      { x: 5, z: 30 }, { x: -5, z: 60 },
      { x: -30, z: -40 }, { x: 30, z: -30 },
      { x: -30, z: 30 }, { x: 30, z: 40 },
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });

    positions.forEach(pos => {
      const g = new THREE.Group();
      g.position.set(pos.x, 0, pos.z);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 6), poleMat);
      pole.position.y = 2;
      pole.castShadow = true;
      g.add(pole);

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.15, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      housing.position.y = 4;
      g.add(housing);

      const light = new THREE.PointLight(0xffcc66, 0.6, 15, 2);
      light.position.y = 3.9;
      g.add(light);

      this.streetLights.push({ light, base: 0.6 });
      this.scene.add(g);

      this.colliders.push(new THREE.Box3(
        new THREE.Vector3(pos.x - 0.15, 0, pos.z - 0.15),
        new THREE.Vector3(pos.x + 0.15, 4, pos.z + 0.15)
      ));
    });
  }

  /* ── Rocks & debris ── */
  createDecorations() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.95 });
    for (let i = 0; i < 15; i++) {
      const s = randomBetween(0.3, 0.8);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
      rock.position.set(randomBetween(-90, 90), s * 0.3, randomBetween(-85, 85));
      rock.rotation.set(randomBetween(0, Math.PI), randomBetween(0, Math.PI), 0);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }
  }

  /* ── Particles ── */
  createParticles() {
    const pCount = 600;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    const vel = [];

    for (let i = 0; i < pCount; i++) {
      pos[i*3] = randomBetween(-100, 100);
      pos[i*3+1] = randomBetween(0, 15);
      pos[i*3+2] = randomBetween(-100, 100);
      vel.push({
        x: randomBetween(-0.5, 0.5),
        y: randomBetween(-0.2, 0.2),
        z: randomBetween(-0.5, 0.5)
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8888aa,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });

    this.particles = new THREE.Points(geo, mat);
    this.particleVelocities = vel;
    this.scene.add(this.particles);
  }

  /* ── Per-frame ── */
  update(dt) {
    this.streetLights.forEach(sl => {
      if (Math.random() < 0.02) {
        sl.light.intensity = sl.base * randomBetween(0.3, 1.0);
      } else {
        sl.light.intensity += (sl.base - sl.light.intensity) * 0.1;
      }
    });
    
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleVelocities.length; i++) {
        pos[i*3]   += this.particleVelocities[i].x * dt;
        pos[i*3+1] += this.particleVelocities[i].y * dt;
        pos[i*3+2] += this.particleVelocities[i].z * dt;

        // Wrap around limits
        if (pos[i*3+1] < 0) pos[i*3+1] = 15;
        if (pos[i*3+1] > 15) pos[i*3+1] = 0;
        
        if (pos[i*3] < -100) pos[i*3] = 100;
        if (pos[i*3] > 100) pos[i*3] = -100;
        
        if (pos[i*3+2] < -100) pos[i*3+2] = 100;
        if (pos[i*3+2] > 100) pos[i*3+2] = -100;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  getColliders() {
    return this.colliders;
  }
}
