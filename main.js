import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011); // Dark blue for night sky

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x87CEEB);
document.body.appendChild(renderer.domElement);

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);
scene.add(camera);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Dynamic Light
const dynamicLight = new THREE.PointLight(0xffffff, 8, 50);
dynamicLight.position.set(0, 10, 0);
scene.add(dynamicLight);

// Ocean Geometry
const geometry = new THREE.PlaneGeometry(75, 75, 300, 300);
geometry.rotateX(-Math.PI / 2);

// Ocean Shader Material
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        waveHeight: { value: 1.5 },
        waveFrequency: { value: 0.5 },
        deepColor: { value: new THREE.Color(0x8B8000) }, // Darker yellow
        shallowColor: { value: new THREE.Color(0xFFD700) }, // Mustard yellow
    },
    vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            vec3 pos = position;
            pos.y += sin(pos.x * waveFrequency + time) * waveHeight * 0.8;
            pos.y += cos(pos.z * waveFrequency + time * 1.5) * waveHeight * 0.6;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        varying vec2 vUv;

        void main() {
            vec3 color = mix(deepColor, shallowColor, vUv.y * 0.8 + 0.2);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
});

const ocean = new THREE.Mesh(geometry, oceanMaterial);
scene.add(ocean);

// Load Hotdog Model
const loader = new GLTFLoader();
let hotdog = null;

loader.load(
    'https://trystan211.github.io/ite18_joshua_act4/low_poly_hot_dog.glb', // Replace with actual hotdog model URL
    (gltf) => {
        hotdog = gltf.scene;
        hotdog.position.set(1, 1, 1);
        scene.add(hotdog);

        const box = new THREE.Box3().setFromObject(hotdog);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log('Hotdog dimensions:', size);

        hotdog.scale.set(25, 25, 25);
    },
    undefined,
    (error) => {
        console.error("Error loading the hotdog model:", error);
    }
);

// Rain Geometry
const rainCount = 10000;
const rainGeometry = new THREE.BufferGeometry();
const rainPositions = [];
const rainVelocities = [];

for (let i = 0; i < rainCount; i++) {
    const x = (Math.random() - 0.5) * 100;
    const y = Math.random() * 50;
    const z = (Math.random() - 0.5) * 100;
    rainPositions.push(x, y, z);
    rainVelocities.push(-0.2 - Math.random() * 0.5);
}

rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainPositions, 3));

const rainMaterial = new THREE.PointsMaterial({
    color: 0xff0000, // Red color
    size: 0.2,
    transparent: true,
    opacity: 0.8,
});

const rain = new THREE.Points(rainGeometry, rainMaterial);
scene.add(rain);

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();

    oceanMaterial.uniforms.time.value = elapsedTime;

    const positions = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] += rainVelocities[i];
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 50;
        }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    dynamicLight.position.set(
        10 * Math.sin(elapsedTime * 0.5),
        10,
        10 * Math.cos(elapsedTime * 0.5)
    );

    if (hotdog) {
        hotdog.position.x = Math.sin(elapsedTime * 0.5) * 5;
        hotdog.position.z = Math.cos(elapsedTime * 0.5) * 5;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
