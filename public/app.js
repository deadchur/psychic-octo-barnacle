
let userLocation = null;
let isReady = false;
let experienceStarted = false;
let currentScene = 0;
let sceneEntities = [];

const GLOBAL_SCALE = '1 1 1';

function applyOffset(lat, lng) {
    const offsetLat = 0.000293002735 / 2; // ~16.25m north
    const offsetLng = -0.00042281789233 / 2; // ~19m west
    return {
        lat: lat + offsetLat,
        lng: lng + offsetLng
    };
}

const sceneConfig = [
    // LOCATION 1
    {
        sceneNumber: 1,
        name: "Scene 1 - Duck Billed Platypus",
        useOffset: false,
        modelPath: 'model/2 platypus.glb',
        audioPath: 'audio/S1_DBP.mp3',
        animations: ['swim']
    },
    {
        sceneNumber: 2,
        name: "Scene 2 - Biladurang",
        useOffset: false,
        modelPath: 'model/2 platypus.glb',
        audioPath: 'audio/S2_Biladurang.mp3',
        animations: ['idle']
    },
    {
        sceneNumber: 3,
        name: "Scene 3 - Shy",
        useOffset: true,
        modelPath: 'model/2 platypus.glb',
        audioPath: 'audio/S3_Shy2.mp3',
        animations: ['idle']
    },
    {
        sceneNumber: 4,
        name: "Scene 4 - Breathe",
        useOffset: false,
        modelPath: 'model/2 platypus.glb',
        audioPath: 'audio/S4_Breathe2.mp3',
        animations: ['swim']
    },
    {
        sceneNumber: 5,
        name: "Scene 5 - Streamlined",
        useOffset: false,
        modelPath: 'model/2 platypus.glb',
        audioPath: 'audio/S5_Streamlined.mp3',
        animations: ['swim']
    }
];

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('Location:', userLocation);
                resolve(userLocation);
            }, (error) => {
                reject('Geolocation error: ' + error.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

function createSceneEntity(config, lat, lng) {
    const scene = document.querySelector('a-scene');

    if (!scene) {
        console.error('A-Scene not found');
        return null;
    }

    const container = document.createElement('a-entity');
    container.setAttribute('gps-entity-place', `latitude: ${lat}; longitude: ${lng};`);
    container.setAttribute('visible', 'false');

    const model = document.createElement('a-entity');
    model.setAttribute('gltf-model', config.modelPath);
    model.setAttribute('scale', GLOBAL_SCALE);
    model.setAttribute('rotation', '0 0 0');
    model.setAttribute('animation-mixer', `clip: ${config.animation}`);

    container.appendChild(model);
    scene.appendChild(container);

    const audio = new Audio(config.audioPath);
    audio.addEventListener('ended', () => {
        console.log(`Scene ${config.sceneNumber} audio ended`);
        moveToNextScene();
    });

    return {
        container: container,
        model: model,
        audio: audio,
        config: config
    };
}

async function initScenes() {
    try {
        updateStatus('Getting user location...');
        await getUserLocation();

        sceneConfig.forEach((config, index) => {
            let lat = userLocation.lat;
            let lng = userLocation.lng;

            if (config.useOffset) {
                const offset = applyOffset(userLocation.lat, userLocation.lng);
                lat = offset.lat;
                lng = offset.lng;
            }

            console.log(`Creating scene ${config.sceneNumber} at (${lat}, ${lng})`);
            const entity = createSceneEntity(config, lat, lng);

            if (entity) {
                sceneEntities.push(entity);
            }
        });

        updateStatus('Loading content...');

        setTimeout(() => {
            isReady = true;
            updateStatus('');
            updateInstructions('Look around to find the platypus');
            experienceStarted = true;
            startScene(0);
        }, 3000);
    } catch (error) {
        console.error('Initialization error:', error);
        updateStatus('Error: ' + error.message);
    }
}

function startScene(index) {
    if (index >= sceneEntities.length) {
        updateStatus('Experience complete! Thank you for participating.');
        updateInstructions('');
        return;
    }

    currentScene = index;
    const sceneData = sceneEntities[index];
    const config = sceneData.config;

    console.log(`Starting scene ${config.sceneNumber}: ${config.name}`);
    updateStatus(`Scene ${config.sceneNumber}: ${config.name}`);
    updateInstructions('');

    sceneData.container.setAttribute('visible', 'true');
    sceneData.audio.play().catch(err => console.warn('Audio play error:', err));
}

function moveToNextScene() {
    const currentSceneData = sceneEntities[currentScene];

    if (currentSceneData) {
        currentSceneData.container.setAttribute('visible', 'false');
        currentSceneData.audio.pause();
        currentSceneData.audio.currentTime = 0;
    }

    setTimeout(() => {
        startScene(currentScene + 1);
    }, 1000);
}

function updateStatus(message) {
    const status = document.getElementById('status-overlay');
    if (!status) return;

    if (message) {
        status.textContent = message;
        status.style.display = 'block';
    } else {
        status.style.display = 'none';
    }
}

function updateInstructions(message) {
    const instructions = document.getElementById('instruction');
    if (!instructions) return;

    if (message) {
        instructions.textContent = message;
        instructions.style.display = 'block';
    } else {
        instructions.style.display = 'none';
    }
}

window.addEventListener('load', () => {
    console.log('Page loaded, checking for AFRAME...');

    if (typeof AFRAME === 'undefined') {
        console.error('AFRAME not found');
        updateStatus('Error: AFRAME not found');
        return;
    }

    const scene = document.querySelector('a-scene');

    if (!scene) {
        console.error('A-Scene not found in DOM');
        updateStatus('Error: Scene not found');
        return;
    }

    scene.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
    });

    AFRAME.registerComponent('rotation-reader', {
        tick: function () {
            // AR.js handles rotation internally
        }
    });

initScenes();
});