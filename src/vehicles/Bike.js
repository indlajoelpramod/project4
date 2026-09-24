import * as THREE from 'three';
import { Vehicle } from './Vehicle.js';

/**
 * Bike (Motorcycle) — procedural placeholder vehicle.
 * Red frame, seat, handlebars, 2 wheels, headlight.
 */
export class Bike extends Vehicle {
  constructor(position) {
    super({ 
      name: 'Motorcycle', 
      position,
      acceleration: 22,
      braking: 35,
      maxSpeed: 30,
      reverseSpeed: -8,
      friction: 4,
      turnSpeed: 2.0
    });
    this.createMesh();
    this.createCollider();
  }

  createMesh() {
    // Frame
    const frameGeo = new THREE.BoxGeometry(0.5, 0.6, 2.2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8B0000, roughness: 0.4, metalness: 0.8,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.8;
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.group.add(frame);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.4, 0.15, 0.8);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 1.15, -0.2);
    this.group.add(seat);

    // Handlebars
    const hbGeo = new THREE.BoxGeometry(0.9, 0.08, 0.08);
    const hbMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
    const hb = new THREE.Mesh(hbGeo, hbMat);
    hb.position.set(0, 1.2, 0.8);
    this.group.add(hb);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const front = new THREE.Mesh(wheelGeo, wheelMat);
    front.position.set(0, 0.35, 1.0);
    front.rotation.z = Math.PI / 2;
    front.castShadow = true;
    this.group.add(front);

    const rear = new THREE.Mesh(wheelGeo, wheelMat);
    rear.position.set(0, 0.35, -0.8);
    rear.rotation.z = Math.PI / 2;
    rear.castShadow = true;
    this.group.add(rear);

    // Headlight
    const hlGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 0.5,
    });
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(0, 1.0, 1.15);
    this.group.add(hl);

    const light = new THREE.SpotLight(0xffffcc, 2.0, 35, Math.PI / 7, 0.5, 1);
    light.position.set(0, 1.0, 1.15);
    light.target.position.set(0, 1.0, 2.15);
    light.castShadow = true;
    light.visible = false;
    this.group.add(light);
    this.group.add(light.target);
    this.headlights.push(light);

    // Interaction target
    frame.userData.interactable = {
      type: 'vehicle',
      vehicleType: 'bike',
      prompt: '[E] ENTER MOTORCYCLE',
      vehicle: this,
    };
  }
}
