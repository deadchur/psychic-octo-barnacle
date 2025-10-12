
let userLocation = null;
let isReady = false;
let experienceStarted = false;
let currentScene = 0;
let sceneEntities = [];
let sharedModel = null;

const GLOBAL_SCALE = '3 3 3';
const MODEL_PATH = 'model/platypus_LAND.glb';

function applyOffset(lat, lng) {
    const offsetLat = 0.000293002735 / 2; // ~16.25m north
    const offsetLng = -0.00042281789233 / 2; // ~19m west
    return {
        lat: lat + offsetLat,
        lng: lng + offsetLng
    };
}

const sceneConfig = [
    {
        sceneNumber: 1,
        name: "Scene 1 - Duck Billed Platypus",
        useOffset: false,
        audioPath: 'audio/S1_DBP.mp3',
        animation: 'swim'
    },
    {
        sceneNumber: 2,
        name: "Scene 2 - Biladurang",
        useOffset: false,
        audioPath: 'audio/S2_Biladurang.mp3',
        animation: 'idle'
    },
    {
        sceneNumber: 3,
        name: "Scene 3 - Shy",
        useOffset: true,
        audioPath: 'audio/S3_Shy2.mp3',
        animation: 'idle'
    },
    {
        sceneNumber: 4,
        name: "Scene 4 - Breathe",
        useOffset: false,
        audioPath: 'audio/S4_Breathe2.mp3',
        animation: 'swim'
    },
    {
        sceneNumber: 5,
        name: "Scene 5 - Streamlined",
        useOffset: false,
        audioPath: 'audio/S5_Streamlined.mp3',
        animation: 'swim'
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
                console.error('Geolocation error:', error);
                reject('Geolocation error: ' + error.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

/**
 * 
 * @returns 
function loadSharedModel() {
    return new Promise((resolve, reject) => {
        const loader = new THREE.GLTFLoader();

        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            'model/platypus_LAND.glb',
            (gltf) => {
                console.log('Model loaded');
                sharedModel = gltf;
                dracoLoader.dispose();
                resolve(gltf);
            }, (error) => {
                console.error('Model load error:', error);
                dracoLoader.dispose();
                reject('Model load error: ' + error.message);
            }
        );
    });
}
 */

function preloadModel() {

    return new Promise.resolve();

    const assets = document.querySelector('a-assets') || document.createElement('a-assets');

    if (!document.querySelector('a-assets')) {
        document.querySelector('a-scene').appendChild(assets);
    }

    const modelAsset = document.createElement('a-asset-item');
    modelAsset.setAttribute('id', 'platypus-model');
    modelAsset.setAttribute('src', 'model/platypus_LAND.glb');
    assets.appendChild(modelAsset);

    return new Promise((resolve) => {
        modelAsset.addEventListener('loaded', () => {
            console.log('Model preloaded');
            resolve();
        });

        setTimeout(() => {
            console.warn('Model preload timeout, proceeding anyway');
            resolve();
        }, 15000);
    });
}

function createSceneEntity(config, lat, lng) {
    const scene = document.querySelector('a-scene');

    const container = document.createElement('a-entity');
    container.setAttribute('gps-entity-place', `latitude: ${lat}; longitude: ${lng};`);
    container.setAttribute('visible', 'false');

    const testSphere = document.createElement('a-sphere');
    testSphere.setAttribute('radius', '0.25');
    testSphere.setAttribute('color', '#FF0000');
    testSphere.setAttribute('position', '0 2 0');
    container.appendChild(testSphere);

    if (sharedModel) {
        //const modelClone = sharedModel.scene.clone();

        const modelEntity = document.createElement('a-entity');
        //modelEntity.object3D.add(modelClone);
        modelEntity.setAttribute('gltf-model', MODEL_PATH);
        modelEntity.setAttribute('scale', GLOBAL_SCALE);
        modelEntity.setAttribute('position', '0 2 1');
        //model.setAttribute('rotation', '0 0 0');

        modelEntity.addEventListener('model-loaded', () => {
            console.log(`Model loaded for scene ${config.sceneNumber}`);
        });

        modelEntity.addEventListener('model-error', (e) => {
            console.error(`Model load error for scene ${config.sceneNumber}:`, e);
        });

        if (config.animation) {
            modelEntity.setAttribute('animation-mixer', `clip: ${config.animation}`);
        }
    }
    
    container.appendChild(modelEntity);
    scene.appendChild(container);

    const audio = new Audio(config.audioPath);
    audio.addEventListener('ended', () => {
        console.log(`Scene ${config.sceneNumber} audio ended`);
        moveToNextScene();
    });

    audio.addEventListener('error', (e) => {
        console.error(`Audio load error for scene ${config.sceneNumber}:`, e);
    });

    return {
        container: container,
        model: modelEntity,
        audio: audio,
        config: config
    };
}

async function initScenes() {
    try {
        updateStatus('Getting user location...');
        await getUserLocation();

        updateStatus('Loading 3D model...');
        await preloadModel();

        /**
         * 
        try {
            await loadSharedModel();
            console.log('Model loaded, creating scenes...');
        } catch (modelError) {
            console.error(modelError);
            updateStatus('Error loading model: ' + modelError);
            return;
        }
         */

        sceneConfig.forEach((config) => {
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
        }, 2000);
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
    console.log('Starting...');

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

    AFRAME.registerComponent('rotation-reader', {
        tick: function () {
            // AR.js handles rotation internally
        }
    });

    setTimeout(() => {
        console.log('Initializing scene...');
        initScenes();
    }, 1000);
});