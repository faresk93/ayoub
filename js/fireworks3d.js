// Pixel-square 3D fireworks using a single THREE.Points pool.
import * as THREE from "three";

const PALETTE = ["#ff5555", "#ffff55", "#55ff55", "#55ffff", "#6f8bff", "#ff55ff", "#ffaa00", "#ffffff"];

export class Fireworks3D {
  constructor(scene, max = 2400, size = 0.32) {
    this.max = max;
    this.pos = new Float32Array(max * 3).fill(-9999);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.cursor = 0;
    this.rockets = [];
    this.onBoom = null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, depthWrite: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.tmp = new THREE.Color();
  }
  spawn(x, y, z, vx, vy, vz, color, life, drag = 0.985) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.col[k] = color.r; this.col[k + 1] = color.g; this.col[k + 2] = color.b;
    this.life[i] = life; this.drag[i] = drag;
  }
  burst(p, color, n = 110, speed = 7) {
    const c = this.tmp.set(color || PALETTE[(Math.random() * PALETTE.length) | 0]).clone();
    const c2 = new THREE.Color(PALETTE[(Math.random() * PALETTE.length) | 0]);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const s = speed * (0.6 + Math.random() * 0.4);
      this.spawn(p.x, p.y, p.z, r * Math.cos(th) * s, u * s, r * Math.sin(th) * s, i % 4 ? c : c2, 1.1 + Math.random() * 0.9, 0.965);
    }
  }
  sparkle(p, color = "#fff6a8", n = 24) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) this.spawn(p.x, p.y, p.z, (Math.random() - 0.5) * 4, Math.random() * 5, (Math.random() - 0.5) * 4, c, 0.6 + Math.random() * 0.5, 0.95);
  }
  launch(x, y, z, h = 14) {
    this.rockets.push({ p: new THREE.Vector3(x, y, z), v: new THREE.Vector3((Math.random() - 0.5) * 2, h + Math.random() * 4, (Math.random() - 0.5) * 2), c: PALETTE[(Math.random() * PALETTE.length) | 0] });
  }
  update(dt) {
    const trail = this.tmp.set("#ffe8a0");
    this.rockets = this.rockets.filter((r) => {
      r.p.addScaledVector(r.v, dt); r.v.y -= 9.8 * dt;
      this.spawn(r.p.x, r.p.y, r.p.z, (Math.random() - 0.5) * 0.6, -1, (Math.random() - 0.5) * 0.6, trail, 0.35, 0.9);
      if (r.v.y < 1.5) { this.burst(r.p, r.c, 130, 8); this.onBoom && this.onBoom(); return false; }
      return true;
    });
    const { pos, vel, life, drag } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) continue;
      const k = i * 3;
      life[i] -= dt;
      if (life[i] <= 0) { pos[k + 1] = -9999; continue; }
      vel[k + 1] -= 5 * dt;
      const d = Math.pow(drag[i], dt * 60);
      vel[k] *= d; vel[k + 1] *= d; vel[k + 2] *= d;
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
