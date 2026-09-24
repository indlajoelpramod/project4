import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';

/**
 * Car — procedural placeholder vehicle.
 * Dark metallic body with cabin, 4 wheels, headlights.
 */
export class Car extends Vehicle {
  constructor(position) {
    super({ 
      name: 'Car', 
      position,
      acceleration: 15,
      braking: 25,
      maxSpeed: 20,
      reverseSpeed: -10,
      friction: 5,
      turnSpeed: 1.2
    });
    this.createMesh();
    this.createCollider();
  }

  createMesh() {
    // Body
    const bodyGeo = new THREE.BoxGeometry(2.5, 1.2, 5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e, roughness: 0.3, metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(2.2, 0.9, 2.5);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, roughness: 0.4, metalness: 0.5,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.85, -0.3);
    cabin.castShadow = true;
    this.group.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    [[-1.2, 0.35, 1.5], [1.2, 0.35, 1.5], [-1.2, 0.35, -1.5], [1.2, 0.35, -1.5]].forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(...pos);
      w.rotation.z = Math.PI / 2;
      w.castShadow = true;
      this.group.add(w);
    });

    // Headlights
    const hlGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.5,
    });
    [[-0.8, 0.9, 2.5], [0.8, 0.9, 2.5]].forEach(pos => {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(...pos);
      this.group.add(hl);
      
      const light = new THREE.SpotLight(0xffffcc, 2.5, 40, Math.PI / 6, 0.5, 1);
      light.position.set(pos[0], pos[1], pos[2]);
      light.target.position.set(pos[0], pos[1], pos[2] + 1);
      light.castShadow = true;
      light.visible = false;
      this.group.add(light);
      this.group.add(light.target);
      this.headlights.push(light);
    });

    // Interaction target
    body.userData.interactable = {
      type: 'vehicle',
      vehicleType: 'car',
      prompt: '[E] ENTER CAR',
      vehicle: this,
    };
  }
}
