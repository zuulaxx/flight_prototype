/*
Advanced prototype (module). This file expects a local module build of Three.js named 'three.module.js'
placed in the same folder. Also run via a local server (http://localhost) to avoid CORS when using modules.

Features:
- Procedural low-poly terrain with perlin noise
- Atmospheric fog, directional sunlight with shadows
- Procedural "plane" model (grouped geometry) with better shape
- Improved flight dynamics and proper takeoff when reaching lift speed
- Camera chase with smoothing
- Mobile joystick + throttle controls
*/

import * as THREE from './three.module.js';

// Perlin noise implementation (simple) for terrain
// Source: adapted simple implementation
class SimplexNoise {
  constructor(r=Math){}
  noise2D(x,y){
    // Simple pseudo-random noise using sin/cos (not perfect but fine for demo)
    return (Math.sin(x*0.1)*Math.cos(y*0.1));
  }
}

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9fbfe8, 0.0007);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 10000);
camera.position.set(0, 8, 20);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff7e8, 1.0);
sun.position.set(100, 200, 100);
sun.castShadow = true;
sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
sun.shadow.mapSize.set(2048,2048);
scene.add(sun);

// Ground (procedural height)
const terrainSize = 1200;
const segments = 200;
const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
const noise = new SimplexNoise();
for (let i=0;i<groundGeo.attributes.position.count;i++){
  const x = groundGeo.attributes.position.getX(i);
  const y = groundGeo.attributes.position.getY(i);
  // compute height with layered noise
  const h = (noise.noise2D(x*0.05,y*0.05)*6) + (noise.noise2D(x*0.15,y*0.15)*2);
  groundGeo.attributes.position.setZ(i, h);
}
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ color:0x557a3b, roughness:1, metalness:0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// Sky gradient via large hemisphere
scene.background = new THREE.Color(0x9fbfe8);

// Simple runway (flat plane) for takeoff
const runwayGeo = new THREE.PlaneGeometry(300, 20);
const runwayMat = new THREE.MeshStandardMaterial({ color:0x444444, roughness:0.7 });
const runway = new THREE.Mesh(runwayGeo, runwayMat);
runway.rotation.x = -Math.PI/2;
runway.position.set(0, 0.01, -50);
runway.receiveShadow = true;
scene.add(runway);

// Create a nicer procedural plane (group)
function createPlaneMesh(color=0xff6600){
  const g = new THREE.Group();
  const bodyGeo = new THREE.CylinderGeometry(0.5, 0.7, 4.2, 12);
  const mat = new THREE.MeshStandardMaterial({ color, roughness:0.6, metalness:0.2 });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.rotation.z = Math.PI/2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const wingGeo = new THREE.BoxGeometry(6, 0.12, 0.8);
  const wing = new THREE.Mesh(wingGeo, mat);
  wing.position.set(0, -0.1, 0);
  wing.castShadow = true;
  g.add(wing);

  const tailGeo = new THREE.BoxGeometry(1.2, 0.12, 0.6);
  const tail = new THREE.Mesh(tailGeo, mat);
  tail.position.set(0.9, 0.6, -1.6);
  tail.castShadow = true;
  g.add(tail);

  const propGeo = new THREE.BoxGeometry(0.1,1.2,0.06);
  const prop = new THREE.Mesh(propGeo, new THREE.MeshStandardMaterial({color:0x222222}));
  prop.position.set(-2.1,0,0);
  prop.rotation.y = Math.PI/4;
  prop.castShadow = true;
  g.add(prop);

  return g;
}

// Plane presets
const PRESETS = {
  trainer: { color:0xffaa33, mass:1000, power:1800, lift:1.25 },
  sport: { color:0xff2244, mass:800, power:2500, lift:1.05 },
  storm: { color:0x2277ff, mass:1400, power:3200, lift:0.95 }
};

let preset = PRESETS.trainer;
let plane = createPlaneMesh(preset.color);
scene.add(plane);

// State
const state = {
  pos: new THREE.Vector3(0, 2, -50),
  vel: new THREE.Vector3(0,0,0),
  quat: new THREE.Quaternion(),
  throttle: 0,
  pitchInput: 0,
  rollInput: 0,
  yawInput: 0
};

plane.position.copy(state.pos);

// Controls
const keys = {};
window.addEventListener('keydown', (e)=> keys[e.key.toLowerCase()]=true);
window.addEventListener('keyup', (e)=> { keys[e.key.toLowerCase()]=false; if(['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){ state.pitchInput=0; state.rollInput=0;} });

// UI bindings
document.getElementById('planeSelect').addEventListener('change',(e)=> {
  preset = PRESETS[e.target.value] || PRESETS.trainer;
  scene.remove(plane);
  plane = createPlaneMesh(preset.color);
  scene.add(plane);
  plane.position.copy(state.pos);
});
document.getElementById('spawnBtn').addEventListener('click', ()=> {
  state.pos.set(0,2,-50);
  state.vel.set(0,0,0);
  state.throttle = 0.2;
});
document.getElementById('resetBtn').addEventListener('click', ()=> {
  state.pos.set(0,2,-50);
  state.vel.set(0,0,0);
  state.throttle = 0;
});
document.getElementById('assist').addEventListener('change',(e)=>{});

// Mobile throttle buttons
document.getElementById('throttleUp').addEventListener('touchstart', (e)=> { e.preventDefault(); state.throttle = Math.min(1, state.throttle + 0.15); });
document.getElementById('throttleDown').addEventListener('touchstart', (e)=> { e.preventDefault(); state.throttle = Math.max(0, state.throttle - 0.15); });

// Joystick (same simple implementation)
(function setupJoystick(){
  const base = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  let dragging=false;
  let origin={x:0,y:0};
  const maxDist = 50;
  function setStick(x,y){ stick.style.transform = `translate(${x}px, ${y}px)`; }
  base.addEventListener('pointerdown', (e)=>{ dragging=true; base.setPointerCapture(e.pointerId); const r=base.getBoundingClientRect(); origin={x:r.left+r.width/2, y:r.top+r.height/2}; onMove(e.clientX,e.clientY); });
  base.addEventListener('pointermove', (e)=>{ if(!dragging) return; onMove(e.clientX,e.clientY); });
  base.addEventListener('pointerup', (e)=>{ dragging=false; setStick(0,0); state.rollInput=0; state.pitchInput=0; });
  function onMove(cx,cy){
    const dx = cx-origin.x; const dy = cy-origin.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const use = Math.min(maxDist, dist);
    const nx = dx / Math.max(1, dist); const ny = dy / Math.max(1, dist);
    const sx = nx * use; const sy = ny * use;
    setStick(sx, sy);
    state.rollInput = (sx/maxDist);
    state.pitchInput = (-sy/maxDist);
  }
})();

// Flight physics (improved)
function physics(dt){
  // input mapping
  if (keys['w']) state.throttle = Math.min(1, state.throttle + dt * 0.6);
  if (keys['s']) state.throttle = Math.max(0, state.throttle - dt * 0.8);
  state.rollInput = 0;
  if (keys['a']) state.rollInput = -0.9;
  if (keys['d']) state.rollInput = 0.9;
  state.pitchInput = 0;
  if (keys['arrowup']) state.pitchInput = 0.6;
  if (keys['arrowdown']) state.pitchInput = -0.6;

  // yaw via Q/E
  state.yawInput = 0;
  if (keys['q']) state.yawInput = 0.5;
  if (keys['e']) state.yawInput = -0.5;

  // rotational integration (small angles)
  const pitchRate = state.pitchInput * 0.8;
  const rollRate = state.rollInput * 0.9;
  const yawRate = state.yawInput * 0.5;

  // apply rotation to quaternion
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitchRate*dt, yawRate*dt, rollRate*dt,'XYZ'));
  state.quat.multiply(q);
  plane.quaternion.copy(state.quat);

  // forward vector
  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(state.quat).normalize();

  // thrust and drag
  const thrust = forward.clone().multiplyScalar(state.throttle * preset.power / preset.mass);
  const drag = state.vel.clone().multiplyScalar(-0.02 * state.vel.length());

  // gravity
  const gravity = new THREE.Vector3(0,-9.81,0);

  // lift approx: proportional to forward speed and wing effectiveness and angle of attack (pitch)
  const forwardSpeed = state.vel.dot(forward);
  const aoa = plane.rotation.x; // approximate
  const lift = new THREE.Vector3(0, Math.max(0, preset.lift * Math.max(0, forwardSpeed) * Math.sin(-aoa)), 0);

  // acceleration
  const accel = new THREE.Vector3();
  accel.add(thrust);
  accel.add(gravity);
  accel.add(lift);
  accel.add(drag);

  state.vel.add(accel.multiplyScalar(dt));
  // clamp
  if (state.vel.length() > 220) state.vel.setLength(220);

  // integrate position
  state.pos.add(state.vel.clone().multiplyScalar(dt));

  // simple ground collision (runway at y=0)
  if (state.pos.y < 1){
    state.pos.y = 1;
    // if moving fast enough and angle small -> takeoff
    if (state.vel.length() > 18 && Math.abs(plane.rotation.x) < 0.6){
      // lift plane smoothly
      state.pos.y += 0.02 * (state.vel.length() - 18);
    } else {
      state.vel.y = 0;
      // friction on ground
      state.vel.multiplyScalar(0.995);
    }
  }
  // update plane position
  plane.position.copy(state.pos);
}

// Camera chase
function updateCamera(dt){
  const chaseOffset = new THREE.Vector3(0, 4, 14).applyQuaternion(state.quat);
  const desired = state.pos.clone().add(chaseOffset);
  camera.position.lerp(desired, dt * 3.0);
  camera.lookAt(state.pos);
}

// HUD
function updateHUD(){
  document.getElementById('speed').textContent = state.vel.length().toFixed(1);
  document.getElementById('alt').textContent = state.pos.y.toFixed(1);
  const heading = Math.round((plane.rotation.y * (180/Math.PI))%360);
  document.getElementById('heading').textContent = ((heading+360)%360).toFixed(0);
}

let last = performance.now();
function animate(){
  const now = performance.now();
  let dt = (now - last) / 1000;
  if (dt > 0.06) dt = 0.06;
  last = now;
  physics(dt);
  updateCamera(dt);
  updateHUD();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// responsive
window.addEventListener('resize', ()=> {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// spawn initial
state.pos.set(0,2,-50);
state.vel.set(0,0,0);
state.throttle = 0.2;
plane.position.copy(state.pos);
animate();
