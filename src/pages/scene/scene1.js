import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

let container, camera, scene, renderer;

let CANVAS_WIDTH = window.innerWidth * 0.3;
let CANVAS_HEIGHT = window.innerWidth * 0.3;

function init() {

    container = document.getElementById('tugou-first-map');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, CANVAS_WIDTH / CANVAS_HEIGHT, 1, 2000);
    camera.position.set(340, 363, 831);

    const environment = new RoomEnvironment();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xbbbbbb);
    scene.environment = pmremGenerator.fromScene(environment).texture;

    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('three/js/libs/basis/')
        .detectSupport(renderer);

    const loader = new GLTFLoader().setPath('/');
    loader.setKTX2Loader(ktx2Loader);
    loader.load('poorland_1.glb', function (gltf) {

        // coffeemat.glb was produced from the source scene using gltfpack:
        // gltfpack -i coffeemat/scene.gltf -o coffeemat.glb -cc -tc
        // The resulting model uses EXT_meshopt_compression (for geometry) and KHR_texture_basisu (for texture compression using ETC1S/BasisLZ)

        gltf.scene.position.y = 8;

        scene.add(gltf.scene);

        render();

    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render); // use if there is no animation loop
    controls.minDistance = 400;
    controls.maxDistance = 1000;
    controls.target.set(10, 90, - 16);
    controls.update();

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);

    render();
}

//

function render() {

    renderer.render(scene, camera);
}

export default function App() {
    init();
    document.getElementById('tugou-map-content').appendChild(container);
    render();
}
