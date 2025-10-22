import * as THREE from './three.module.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0,10,30);

// Lights
const ambient = new THREE.AmbientLight(0xffffff,0.5);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff,0.8);
dir.position.set(50,100,50);
scene.add(dir);

// Terrain avec texture satellite
const loader = new THREE.TextureLoader();
const terrainTex = loader.load('./assets/terrain.jpg');
const terrainGeo = new THREE.PlaneGeometry(2000,2000,100,100);
const terrainMat = new THREE.MeshStandardMaterial({map:terrainTex});
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.rotation.x = -Math.PI/2;
scene.add(terrain);

// Avion mesh
function createPlaneMesh(){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,4,12), new THREE.MeshStandardMaterial({color:0xff6600}));
    body.rotation.z = Math.PI/2;
    g.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(6,0.1,1), new THREE.MeshStandardMaterial({color:0xff3300}));
    wing.position.set(0,0,-0.2);
    g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1,0.1,0.5), new THREE.MeshStandardMaterial({color:0xff3300}));
    tail.position.set(-2.0,0.3,-0.8);
    g.add(tail);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.1,1,0.1), new THREE.MeshStandardMaterial({color:0x222222}));
    prop.position.set(2.2,0,0);
    g.add(prop);
    return g;
}

let plane = createPlaneMesh();
plane.position.set(0,2,-50);
scene.add(plane);

// Physics
const state = { pos:new THREE.Vector3(0,2,-50), vel:new THREE.Vector3(0,0,0), quat:new THREE.Quaternion(), throttle:0 };

// Input ZQSD
const keys = {};
window.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
window.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);

// Physics function
function physics(dt){
    const gravity = new THREE.Vector3(0,-9.81,0);
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(state.quat);
    if(keys['z']) state.throttle = Math.min(1,state.throttle+dt*0.5);
    if(keys['s']) state.throttle = Math.max(0,state.throttle-dt*0.5);
    let yaw = 0;
    if(keys['q']) yaw = 0.5;
    if(keys['d']) yaw = -0.5;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw*dt,0,'XYZ'));
    state.quat.multiply(q);
    plane.quaternion.copy(state.quat);
    const thrust = forward.clone().multiplyScalar(state.throttle*50);
    const lift = new THREE.Vector3(0,0.02*state.vel.length(),0);
    const drag = state.vel.clone().multiplyScalar(-0.02);
    const accel = new THREE.Vector3();
    accel.add(gravity).add(thrust).add(lift).add(drag);
    state.vel.add(accel.multiplyScalar(dt));
    state.pos.add(state.vel.clone().multiplyScalar(dt));
    if(state.pos.y<1){state.pos.y=1;state.vel.y=0;}
    plane.position.copy(state.pos);
}

// Camera chase
function updateCamera(dt){
    const offset = new THREE.Vector3(0,5,15).applyQuaternion(state.quat);
    camera.position.lerp(state.pos.clone().add(offset), dt*3);
    camera.lookAt(state.pos);
}

// HUD update
function updateHUD(){
    document.getElementById('speed').textContent = state.vel.length().toFixed(1);
    document.getElementById('alt').textContent = state.pos.y.toFixed(1);
}

// Animate
let last = performance.now();
function animate(){
    const now = performance.now();
    let dt = (now-last)/1000; if(dt>0.06) dt=0.06; last=now;
    physics(dt); updateCamera(dt); updateHUD();
    renderer.render(scene,camera); requestAnimationFrame(animate);
}
animate();

// Spawn/reset
document.getElementById('spawn').addEventListener('click', ()=>{state.pos.set(0,2,-50);state.vel.set(0,0,0);state.throttle=0.2;});
document.getElementById('reset').addEventListener('click', ()=>{state.pos.set(0,2,-50);state.vel.set(0,0,0);state.throttle=0;});
