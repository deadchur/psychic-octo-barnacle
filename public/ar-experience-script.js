
let camera, clock, renderer, scene, video;
let audioListener, audioLoader;
let arObjects = [];
let mixers = []

let pathwayAnimations = [];
let animationMixer_2 = null;
let audioSubtitles = [];
let pathways = [];

let audioPlayer = null;
let animationController = null;

let activePath = 0;
let animTimer = 0;
let elapsedTime = 0;
let currentAnimationIndex = -1;
let currentSceneName = "";
let experienceStarted = false;

let modelDistance = 8;
let modelScale = 5;

let windowSize = [window.innerWidth, window.innerHeight];

const arObjectsConfig = [
    {
        name: "swim",
        scale: { x: 5, y: 5, z: 5},
    }
];

/** Dictionary holding start button unlock flags */
const launchFlags = {
    "Model": false,
    "Audio": false,
    "Paths": false,
    "Camera": false,
    "Three": false,
}

const C_ORIGIN = 0;
const C_LINEAR = 1;
const C_QUADRATIC = 2;

/**
 * Scene configuration with named animations
 * Each animation entry specifies the time it should start and its name
 * @type {Object<string, {AudioStart: number, AudioEnd: number, Curves: Array, Subtitles: Array, Animations: Array, CurveDuration: number, SceneDuration: number}>}
 */
const sceneInformation = {
    "Scene1": {
        "AudioStart": 0,
        "AudioEnd": 17,
        "Curves": [
            [C_ORIGIN, [[20, -15, 220]]],
            [C_LINEAR, [[20, -15, 100]]],
            [C_QUADRATIC, [[-20, -15, 100], [0, -15, 30]]],
            [C_LINEAR, [[-20, -15, 220]]]
        ],
        "Subtitles": [
            [0.2, 3, "This is a duck-billed platypus."],
            [3, 8, "The local Wiradjuri people, call them Biladurang."],
            [7.5, 10.5, "They are very shy, and good at hiding"],
            [10.5, 13.5, "so it's extremely rare to see platypus in the wild,"],
            [13.5, 17, "especially as they are mainly active at night."]
        ],
        "Animations": [
            { time: 0, name: "swim_A2"}
        ],
        "CurveDuration": 17,
        "SceneDuration": 17
    },
    "Scene2": {
        "AudioStart": 18,
        "AudioEnd": 38,
        "Curves": [
            [C_ORIGIN, [[20, -15, 220]]],
            [C_QUADRATIC, [[20, -15, 155], [15, -15, 187.5]]],
            [C_QUADRATIC, [[20, -15, 100], [25, -15, 122.5]]],
            [C_QUADRATIC, [[-20, -15, 100], [0, -15, 50]]],
            [C_QUADRATIC, [[20, -15, 100], [0, -15, 150]]],
            [C_QUADRATIC, [[-20, -15, 100], [0, -15, 50]]],
            [C_QUADRATIC, [[-20, -15, 155], [-25, -15, 122.5]]],
            [C_LINEAR, [[-20, -15, 220]]]
        ],
        "Subtitles": [
            [18.2, 21.5, "Platypus breathe air through the little nostrils on their bill"],
            [21.5, 25.5, "and can stay underwater for several minutes at a time."],
            [25.5, 29.5, "Their streamlined bodies and waterproof, insulated fur"],
            [29.5, 31, "have evolved for swimming under the water."],
            [31, 35, "Their strong front feet pull them along"],
            [35, 38, "while their back feet and tail act as rudders."]
        ],
        "Animations": [
            { time: 0, name: "swim_A2"}
        ],
        "CurveDuration": 20,
        "SceneDuration": 20
    }
}

/**
 * AnimationController for name-based lookup and state management
 * 
 * @class AnimationController
 */
class AnimationController {
    /**
     * Create an AnimationController
     * @param {THREE.AnimationMixer} - THREE.js animation mixer
     * @param {Array<THREE.AnimationClip>} - Array of animation clips from GLTF
     */
    constructor(mixer, animations) {
        this.mixer = mixer;
        this.currentAnimation = null;

        this.actionMap = new Map();

        animations.forEach(clip => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat);
            this.actionMap.set(clipname, action);
        });

        console.log('AnimationController initialized with animations:',
            Array.from(this.actionMap.keys()).join(','));
    }

    /**
     * Check if animation exists by name
     * @param {string} - Name of animation
     * @returns {boolean} - If animation exists
     */
    hasAnimation(name) {
        return this.actionMap.has(name);
    }

    /**
     * Get all available animation names
     * @returns {Array<string>} - Array of animation names
     */
    getAnimationNames() {
        return Array.from(this.actionMap.keys());
    }

    /**
     * Play animation by name with option fade transition
     * @param {*} name - Name of animation to play
     * @param {*} fadeTime - Duration of fade transition in seconds
     * @returns {boolean} true if animation was found, otherwise false
     */
    playAnimationByName(name, fadeTime = 0.5) {
        const nextAction = this.actionMap.get(name);

        if (!nextAction) {
            console.warn(`[warning] Animation "${name}" not found. Available animations:`,
                this.getAnimationNames().join(','));
            return false;
        }

        if (this.currentAction === nextAction && nextAction.isRunning()) {
            return true;
        }

        if (this.currentAction && this.currentAction !== nextAction) {
            this.currentAction.fadeOut(fadeTime);
        }

        nextAction.reset().fadeIn(fadeTime).play();
        this.currentAction = nextAction;

        return true;
    }

    /**
     * Get the name of currently playing animation
     * @returns {string|null} - Name of current animation, otherwise null
     */
    getAnimationName() {
        if  (!this.currentAction) return null;

        for (const [name, action] of this.actionMap.entries()) {
            if (action === this.currentAction) {
                return name;
            }
        }
        return null;
    }

    /**
     * Stop all playing animations
     */
    stopAll() {
        this.actionMap.forEach(action => action.stop());
        this.currentAction = null;
    }

    /**
     * Update the animation mixer (every frame)
     * @param {*} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        this.mixer.update(deltaTime)
    }

}

// store visibility data in object;
//  can only draw line when both are visible.
let markerVisible = { marker0: false, marker1: false };
let markerSceneMap = { marker0: "Scene1", marker1: "Scene2"};

let markerPositions = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];

let markerInformation = {
    marker0: {
        "Visible": false,
        "Scene": "Scene1",
        "Index": 0,
        "Position": new THREE.Vector3(0, 0, 0)
    },
    marker1: {
        "Visible": false,
        "Scene": "Scene2",
        "Index": 1,
        "Position": new THREE.Vector3(0, 0, 0)
    }
}

let lastMarker = -1;

/**
 * A-Frame component that registers marker visibility events
 * Listens for markerFound and markerLost events to track AR marker state
 * Triggers changeScene() when a new marker is detected
 * 
 * May need further testing as updating lastMarker after the if statement 
 * does not update correctly
 * 
 * @component registerevents
 */
AFRAME.registerComponent('registerevents', {
    init: function () 
    {
        let marker = this.el;
        
        marker.addEventListener('markerFound', function() {
            markerInformation[marker.id]["Visible"] = true;
            //console.log(marker.id, " found");
            //console.log(markerInformation[marker.id]["Index"], " ", lastMarker);

            let sceneChange = (markerInformation[marker.id]["Index"] != lastMarker);
            lastMarker = markerInformation[marker.id]["Index"];
            if (sceneChange) {
                console.log("[info] Changed to scene ", markerInformation[marker.id]["Index"]);
                changeScene(markerInformation[marker.id]["Scene"]);
            }
        });

        marker.addEventListener('markerLost', function() {
            markerInformation[marker.id]["Visible"] = false;
            //console.log(marker.id, " lost");
        });
    }
});

/**
 * A-Frame component that runs on every frame to track marker positions
 * Updates the 3D position of detected markers and sets the active scene
 * 
 * @component run
 */
AFRAME.registerComponent('run', {
    init: function() {
        this.m0 = document.querySelector("#marker0");
        this.p0 = new THREE.Vector3();
        this.m1 = document.querySelector("#marker1");
        this.p1 = new THREE.Vector3();
    },
    
    /**
     * Called every frame to update the marker positions
     * 
     * @param {*} time - Total elapsed time since scene start
     * @param {*} deltaTime - Time since last frame in milliseconds
     * @returns - Exit condition if model is not ready
     */
    tick: function(time, deltaTime) {
        if (!launchFlags["Model"]) {
            return;
        }

        if (markerInformation[this.m0.id]["Visible"]) {
            this.m0.object3D.getWorldPosition(this.p0);
            markerPositions[0] = this.p0;
            currentSceneName = "Scene1";
            activePath = 0;
        }
        else if (markerInformation[this.m1.id]["Visible"]) {
            this.m1.object3D.getWorldPosition(this.p1);
            markerPositions[1] = this.p1;
            currentSceneName = "Scene2";
            activePath = 1;
        }
    }
})

/**
 * Function is called when a marker is found
 * Changes scene, resets audio and animation state
 * Only triggers if experience has already started
 * 
 * @param {*} sceneId - ID of the scene to switch to "Scene1" or "Scene2"
 */
function changeScene(sceneId) {
    if (experienceStarted) {
        audioPlayer.pause();
        audioPlayer.currentTime = sceneInformation[sceneId]["AudioStart"];
        audioPlayer.play();

        currentSceneName = sceneId;
        animTimer = 0;
        elapsedTime = 0;
        currentAnimationIndex = -1;

        if (animationController) {
            animationController.stopAll();
        }

        if (document.getElementById("subtitle-choice").checked) {
            document.getElementById("subtitle-div").style.visibility = "visible";
        }
    }
}

/**
 * Waits for the A-Frame AR.js scene to initialize before continuing.
 * Ensures that the THREE.ArToolkitSource instance is ready, then
 * overrides the video source resolution from 640x480 (480p) to 1920x1080 (1080p).
 * 
 * The reason for this is that AR.js defaults to a low-res video source
 * to improve performance on mobile devices, but this results in poor
 * tracking quality and a blurry AR experience on desktop devices.
 * 
 * @async
 * @returns {Promise<boolean>} true when initialization is successful, otherwise false
 */
async function waitForARSystem() {
    try {
        const arScene = document.querySelector('a-scene');

        if (!arScene.hasLoaded) {
            await new Promise((resolve) => {
                arScene.addEventListener('loaded', resolve, { once: true });
            });
        }

        launchFlags["Camera"] = true;
        return true;

    } catch (error) {
        console.error('[error] AR system failed:', error);
        return false;
    }
}

/**
 * Initializes THREE.js renderer, scene, camera, and lighting
 * Sets up WebGL canvas overlay for rendering 3D objects
 */
function initThreeJS() {

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(
        70, // 70° FOV
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 30);

    renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '1';

    document.getElementById('canvas-container').appendChild(renderer.domElement);

    audioListener = new THREE.AudioListener();
    audioLoader = new THREE.AudioLoader();

    /**
     * 
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, -5);
    scene.add(directionalLight);

    const dirLight2 = new THREE.DirectionalLight(0xfffff, 0.8);
    dirLight2.position.set(0, 0, -30);
    scene.add(dirLight2);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-2, -5, -2);
    scene.add(fillLight);

    const modelLight = new THREE.PointLight(0xffffff, 0.8, 100);
    modelLight.position.set(0, 5, 0);
    scene.add(modelLight);
     */

    console.log('[info] Three.js initialized');
    launchFlags["Three"] = true;
}

/**
 * Load 3D AR objects (platypus model) using GLTFLoader with DRACO compression
 * Extracts animations,
 */
function loadARObjects() {

    const loader = new THREE.GLTFLoader();

    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('/lib/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);

    arObjectsConfig.forEach((config, index) => {
        loader.load(
            'model/final.glb',
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 10000, 50);

                const modelScale = config.scale;
                model.scale.set(modelScale.x, modelScale.y, modelScale.z);

                model.traverse((child) => {
                    if (child.isLight) {
                        console.log("Found light in model:", child.type);
                        child.visible = true;

                        // if (child.intensity) { child.intensity *= 2; }
                    }

                    if (child.isMesh && child.material) {
                        child.material.needsUpdate = true;
                    }
                });

                scene.add(model);
                arObjects.push(model);

                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    animationMixer_2 = mixer;

                    for (let i = 0; i < gltf.animations.length; i++) {
                        const action = mixer.clipAction(gltf.animations[i]);
                        action.setLoop(THREE.LoopRepeat)
                        pathwayAnimations.push(action);
                    }
                }

                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);

                    model.animationActions = [];
                    mixers.push(mixer);
                }

                launchFlags["Model"] = true;
                console.log("[info] Finished loading: Model");
                attemptUnlock();
            },
        );
    });
}

/**
 * Load audio narration and setup subtitle tracks
 * Creates VTT cues for timed subtitles and attaches event handlers
 * Sets Audio launch flag to true when complete
 */
function loadModelAudio() {
    /**
     * Event handler to update subtitle display when a cue becomes active
     * @param {*} event - Cue enter event containing subtitle text
     */
    function subtitleChange(event) {
        document.getElementById("subtitle-container").textContent = event.target.text;
    }
    audioPlayer = new Audio("audio/NarrationAudio.mp3");

    // Load the subtitles
    const track = audioPlayer.addTextTrack("subtitles");
    for (const [curveName, curveInfo] of Object.entries(sceneInformation)) {
        console.log("[info] Loading subtitles");
        for (let i = 0; i < curveInfo["Subtitles"].length; i++) {
            const cue = new VTTCue(...curveInfo["Subtitles"][i]);
            cue.onenter = subtitleChange;
            track.addCue(cue);
        }

        audioSubtitles.push(track);
    }

    launchFlags["Audio"] = true;
    console.log("[info] Finished loading: Audio");
    attemptUnlock();
}

/**
 * Handle window resize events
 * Updates camera aspect ratio and renderer size to match new windows
 */
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    windowSize = [window.innerWidth, window.innerHeight];
}

let previousPos = new THREE.Vector3(0, 0, 0);

/**
 * Main animation loop that runs every frame
 * Updates model position along path, plays animations, manages scene state
 * Called recursively via requestAnimationFrame
 */
function animate() {
    const deltaTime = clock.getDelta();

    if (currentSceneName != "") {

        const curScene = sceneInformation[currentSceneName];

        if (arObjects.length > 0) {
            const model = arObjects[0];
            
            if (launchFlags["Paths"]) {
                let nextPos;
                if (animTimer < 1) {
                    nextPos = pathways[activePath].getPoint(animTimer);
                }
                else {
                    nextPos = new THREE.Vector3(model.position.x, model.position.y, model.position.z);
                }

                const movDir = new THREE.Vector3(
                    nextPos.x - previousPos.x,
                    nextPos.y - previousPos.y,
                    nextPos.z - previousPos.z
                );

                if (animTimer < 1) {
                    previousPos = nextPos;
                }

                movDir.normalize();
                let rotAngel = Math.atan2(movDir.x, movDir.z);
                model.rotation.y = rotAngel;

                /**
                 * fallback for model positioning relative to marker
                if (animTimer < curScene["CurveDuration"]) {
                    model.position.set(
                        previousPos.x*3+markerPositions[activePath].x*modelDistance*Math.tan(35 * (Math.PI / 180)),
                        previousPos.y*3+markerPositions[activePath].y*modelDistance*Math.tan(35 * (Math.PI / 180)),
                        previousPos.z*3-modelDistance
                    );
                }
                 */

                if (animTimer < curScene["CurveDuration"]) {
                    const markerPos = markerPositions[activePath];

                    model.position.set(
                        markerPos.x + previousPos.x * 0.4,
                        markerPos.y + previousPos.y * 0.4,
                        markerPos.z + previousPos.z * 0.4 - modelDistance
                    )
                }
                
                animTimer += deltaTime / curScene["CurveDuration"];
            }
        }

        /**
         * 
        if (animationMixer_2) {
            animationMixer_2.update(deltaTime);

            if (currentAnimation < curScene["Animations"].length - 1 && elapsedTime > curScene["Animations"][currentAnimation + 1][0]) {

                const nextAnimIndex = curScene["Animations"][currentAnimation + 1][1];

                if (currentAnimation >= 0) {
                    const curAnimIndex = curScene["Animations"][currentAnimation][0];
                    if (pathwayAnimations[curAnimIndex]) {
                        pathwayAnimations[curAnimIndex].stop();
                    }
                }

                if (pathwayAnimations[nextAnimIndex]) {
                    pathwayAnimations[nextAnimIndex].reset().play();
                    console.log("Playing animation:", nextAnimIndex);
                }

                currentAnimation += 1;
            }
        }
         */

        if (animationController) {
            animationController.update(deltaTime);

            const nextAnimationIndex = currentAnimation + 1;

            if (nextAnimationIndex > curScene["Animations"].length) {
                const nextAnimation = curScene["Animations"][nextAnimationIndex];

                if (elapsedTime >= nextAnimation.time) {
                    const success = animationController.playAnimationByName(nextAnimation.name, 0.5);

                    if (success) {
                        currentAnimationIndex = nextAnimationIndex;
                    } else {
                        currentAnimationIndex = nextAnimationIndex
                    }
                }
            }
        }

        if (elapsedTime > (curScene["AudioEnd"] - curScene["AudioStart"])) {
            audioPlayer.pause();
        }

        if (elapsedTime > curScene["SceneDuration"]) {
            currentSceneName = "";
            arObjects[0].position.y = 10000;
            document.getElementById("subtitle-div").style.visibility = "hidden";
            lastMarker = -1;
        }

        elapsedTime += deltaTime;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

/**
 * Generate a set of THREE.js Path objects from scene configuration
 * Creates smooth curvers for the model to follow during each scene
 * Supports linear and quadratic Bezier curves
 * Sets path launch flag to true when complete
 */
function generatePaths() {
    for (const [curveName, curveInfo] of Object.entries(sceneInformation)) {
        // Generate a curve
        const curPath = new THREE.Path();

        for (let i = 1; i < curveInfo["Curves"].length; i++) {
            switch(curveInfo["Curves"][i][0]) {
            // Form a straight line segment
            case C_LINEAR:
                curPath.add(new THREE.LineCurve3(
                new THREE.Vector3(...curveInfo["Curves"][i - 1][1][0]),
                new THREE.Vector3(...curveInfo["Curves"][i][1][0])
                ));
                break;
            // Form a quadratic bezier line segment
            case C_QUADRATIC:
                curPath.add(new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(...curveInfo["Curves"][i - 1][1][0]),
                new THREE.Vector3(...curveInfo["Curves"][i][1][1]),
                new THREE.Vector3(...curveInfo["Curves"][i][1][0]),
                ));
            }
        }
        pathways.push(curPath);
    }

    launchFlags["Paths"] = true;
    console.log("[info] Finished loading: Paths");
    attemptUnlock();
}

/**
 * Check if all assets are loaded and unlock the start button
 * Called by each asset loader when it completes
 * Enables the start button on index.html when all flags are true
 * @returns - Exit condition if any flag is false
 */
function attemptUnlock() {
    //console.log("Attempting launch!");
    for (const key in launchFlags) {
        if (launchFlags.hasOwnProperty(key)) {
            console.log(launchFlags[key]);
            // If a flag is false, not all assets are ready
            if (launchFlags[key] == false) {
                return;
            }
            else {
                document.getElementById("start-button").disabled = false;
                document.getElementById("start-button").innerText = "Start";
            }
        }
    }
}

/**
 * Start the AR experience
 * Called when a user presses the start button
 * Begins animation loop and prepares audio playback
 */
function startFunction() {
    animate();
    audioPlayer.play();
    audioPlayer.pause();
    document.getElementById("welcome-div").style.visibility = "hidden";

    experienceStarted = true;
}

/**
 * Main initialization function
 * Sets up all systems in order: A-Frame-AR.js camera, THREE.js, models, audio, paths
 * Registers event listeners for UI controls and window resize
 * 
 * @async
 * @returns - Exit condition if A-Frame system is not ready
 */
async function init() {
    console.log('[info] Initializing AR experience...');

    const arReady = await waitForARSystem();
    if (!arReady) {
        console.error('[error] Camera initalization failed');
        return;
    }
    initThreeJS();
    loadARObjects();
    loadModelAudio();
    generatePaths();

    const checkbox = document.getElementById("subtitle-choice");
    checkbox.addEventListener("change", () => {
        if (!checkbox.checked) {
            document.getElementById("subtitle-div").style.visibility = "hidden";
        }
        else if (currentSceneName != "") {
            document.getElementById("subtitle-div").style.visibility = "visible";
        }
    });

    window.addEventListener('resize', onWindowResize);
}

/**
 * Start initialization when DOM is ready
 */
if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}