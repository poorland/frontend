import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

let house;
let container, clock, camera, scene, renderer, playerCollider, playerVelocity, worldOctree, playerDirection, requestId;

const STEPS_PER_FRAME = 5;
const keyStates = {};

function init() {

    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88ccee);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.rotation.order = 'YXZ';

    const fillLight1 = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    fillLight1.position.set(2, 1, 1);
    scene.add(fillLight1);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-5, 25, -1);
    // 投影
    // directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.radius = 4;
    directionalLight.shadow.bias = -0.00006;
    scene.add(directionalLight);

    container = document.getElementById('tugou-house-map');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // const stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.top = '0px';
    // container.appendChild(stats.domElement);



    document.addEventListener('keydown', (event) => {
        keyStates[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        keyStates[event.code] = false;
    });

    container.addEventListener('mousedown', () => {
        document.body.requestPointerLock();
    });

    document.addEventListener('mouseup', () => {
    });

    document.body.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body) {
            camera.rotation.y -= event.movementX / 500;
            camera.rotation.x -= event.movementY / 500;
        }
    });

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function playerCollisions() {
    const result = worldOctree.capsuleIntersect(playerCollider);

    if (result) {
        playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
}

function updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    playerVelocity.addScaledVector(playerVelocity, damping);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);

    playerCollisions();
    camera.position.set(playerCollider.end.x, 0, playerCollider.end.z);
}

function getForwardVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;
}

function getSideVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;
}

function controls(deltaTime) {
    // gives a bit of air control
    const speedDelta = deltaTime * 25;

    if (keyStates['KeyW']) {
        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
    }

    if (keyStates['KeyS']) {
        playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
    }

    if (keyStates['KeyA']) {
        playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
    }

    if (keyStates['KeyD']) {
        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
    }
}

function loadRootScene() {

    worldOctree = new Octree();
    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerVelocity = new THREE.Vector3();
    playerDirection = new THREE.Vector3();

    // 初始位置往左偏 10, 因为 0 的位置是柱子
    // playerVelocity.x = -10;

    const loader = new GLTFLoader();
    loader.loadAsync('./assets/house/scene.gltf').then(function (gltf) {
        house.dismissLoading();
        scene.add(gltf.scene);

        worldOctree.fromGraphNode(gltf.scene);

        gltf.scene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material.map) {
                    child.material.map.anisotropy = 4;
                }
            }
        });
        animate();
    });
}

function teleportPlayerIfOob() {
    if (camera.position.y <= -25) {
        console.log('camera.position.y <= - 25');
        playerCollider.start.set(0, 0.35, 0);
        playerCollider.end.set(0, 1, 0);
        playerCollider.radius = 0.35;
        camera.position.copy(playerCollider.end);
        camera.rotation.set(0, 0, 0);
    }
}

function animate() {
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
        controls(deltaTime);

        updatePlayer(deltaTime);

        teleportPlayerIfOob();
    }
    renderer.render(scene, camera);
    // stats.update();

    requestId = undefined;
    animateStart();
}

function animateStart() {
    if (!requestId) {
        requestId = window.requestAnimationFrame(animate);
    }
}

function animateStop() {
    if (requestId) {
        window.cancelAnimationFrame(requestId);
        requestId = undefined;
    }
}

export default function App(house1) {
    house = house1;
    init();
    loadRootScene();
}
