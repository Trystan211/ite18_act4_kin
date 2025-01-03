import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001133); // Darker blue for deeper ocean atmosphere

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 20); // Adjust to ensure a better view of the submarine
scene.add(camera);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Ocean Geometry
const geometry = new THREE.PlaneGeometry(75, 75, 300, 300);
geometry.rotateX(-Math.PI / 2); // Lay flat

// Ocean Material with Shader
const oceanMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        waveHeight: { value: 1.5 },
        waveFrequency: { value: 0.5 },
    },
    vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveFrequency;
        varying float vWave;

        void main() {
            vec3 pos = position;
            float wave = sin(pos.x * waveFrequency + time) * waveHeight;
            wave += cos(pos.z * waveFrequency + time * 1.5) * waveHeight * 0.5;
            pos.y += wave; // Apply wave height to y-position
            vWave = pos.y; // Pass wave height to fragment shader
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        varying float vWave;

        void main() {
            vec3 color = mix(vec3(0.0, 0.1, 0.4), vec3(0.0, 0.4, 0.7), vWave * 0.5 + 0.5);
            gl_FragColor = vec4(color, 1.0);
        }
    `,
});

// Ocean Mesh
const ocean = new THREE.Mesh(geometry, oceanMaterial);
scene.add(ocean);

// Submarine Loader
const loader = new GLTFLoader();
let submarine = null;
let submarineYOffset = 0; // To adjust the origin misalignment

loader.load(
    "https://trystan211.github.io/ite18_act4_kin/low_poly_type_xxi_submarine.glb",
    (gltf) => {
        submarine = gltf.scene;

        // Calculate bounding box to determine the model's vertical offset
        const boundingBox = new THREE.Box3().setFromObject(submarine);
        const size = new THREE.Vector3();
        boundingBox.getSize(size); // Get the size of the model
        const center = new THREE.Vector3();
        boundingBox.getCenter(center); // Get the center of the model

        // Adjust submarine's position so its base aligns with the water surface
        submarineYOffset = size.y / 2 - center.y;

        submarine.position.set(0, -submarineYOffset, 0); // Correct offset
        submarine.scale.set(1, 1, 1); // Adjust size
        scene.add(submarine);

        // Add white ambient light around submarine
        const light = new THREE.PointLight(0xffffff, 1, 50);
        light.position.set(0, 20, 0); // Above the submarine
        scene.add(light);

        // Add additional moonlight-like directional light
        const moonLight = new THREE.DirectionalLight(0xaaaaaa, 0.5);
        moonLight.position.set(10, 10, -10).normalize();
        scene.add(moonLight);
    },
    undefined,
    (error) => {
        console.error("Error loading the submarine model:", error);
    }
);

// Rain Particles
const rainGeometry = new THREE.BufferGeometry();
const rainCount = 10000;
const rainPositions = new Float32Array(rainCount * 3);

for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 75; // x
    rainPositions[i * 3 + 1] = Math.random() * 50; // y
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 75; // z
}

rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
const rainMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.1, transparent: true });
const rain = new THREE.Points(rainGeometry, rainMaterial);
scene.add(rain);

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Update ocean waves
    oceanMaterial.uniforms.time.value = elapsedTime;

    // Submarine Sync with Waves
    if (submarine) {
        const waveFrequency = oceanMaterial.uniforms.waveFrequency.value;
        const waveHeight = oceanMaterial.uniforms.waveHeight.value;

        // Calculate wave height at submarine's position
        const wave =
            Math.sin(submarine.position.x * waveFrequency + elapsedTime) * waveHeight +
            Math.cos(submarine.position.z * waveFrequency + elapsedTime * 1.5) * waveHeight * 0.5;

        submarine.position.y = wave - submarineYOffset; // Align the submarine with the wave
    }

    // Rain Animation
    const rainPositions = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        rainPositions[i * 3 + 1] -= 0.5; // Move downward
        if (rainPositions[i * 3 + 1] < 0) {
            rainPositions[i * 3 + 1] = 50; // Reset to top
        }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// Responsive Resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
