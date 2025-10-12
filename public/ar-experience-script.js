
let camera, clock, renderer, scene, video;
let audioListener, audioLoader;
let arObjects = [];
let mixers = []

let pathwayAnimations = [];
let animationMixer_2 = null;
let audioSubtitles = [];
let pathways = [];

let audioPlayer = null;

let activePath = 0;
let animTimer = 0;
let elapsedTime = 0;
let currentAnimation = -1;
let currentSceneName = "";
let experienceStarted = false;

let modelDistance = 80;

let windowSize = [window.innerWidth, window.innerHeight];

const arObjectsConfig = [
    {
        name: "Platypus Swimming",
        scale: { x: 1, y: 1, z: 1},
    }
];

/** Dictionary holding start button unlock flags */
const launchFlags = {
    "Model": false,
    "Audio": false,
    "Paths": false,
    "Camera": true
}

const C_ORIGIN = 0;
const C_LINEAR = 1;
const C_QUADRATIC = 2;

const audioPath = "resources/audio/";
const audioFileName = "NarrationAudio.mp3";
const sceneInformation = {
    "Scene1": {
        "AudioStart": 0,
        "AudioEnd": 17,
        // "Curves": [
        //     [C_ORIGIN, [[0, 0, 40]]],
        //     [C_LINEAR, [[10, 0, 40]]],
        //     [C_LINEAR, [[10, 0, 30]]],
        //     [C_LINEAR, [[0, 0, 30]]],
        //     [C_LINEAR, [[0, 0, 40]]],
        //     [C_LINEAR, [[10, 0, 30]]],
        //     [C_LINEAR, [[10, 0, 40]]],
        //     [C_LINEAR, [[0, 0, 30]]]
        // ],
        "Curves": [
            [C_ORIGIN, [[20, -20, 220]]],
            [C_LINEAR, [[20, -20, 100]]],
            [C_QUADRATIC, [[-20, -20, 100], [0, -20, 30]]],
            [C_LINEAR, [[-20, -20, 220]]]
        ],
        "Subtitles": [
            [0.2, 3, "This is a duck-billed platypus."],
            [3, 8, "The local Wiradjuri people, call them Biladurang."],
            [7.5, 10.5, "They are very shy, and good at hiding"],
            [10.5, 13.5, "so it's extremely rare to see platypus in the wild,"],
            [13.5, 17, "especially as they are mainly active at night."]
        ],
        "Animations": [
            [0, 2],
            [2, 6],
            [4, 2],
            [6, 6],
            [8, 2],
            [99999999, 0]
        ],
        "CurveDuration": 17,
        "SceneDuration": 17
    },
    "Scene2": {
        "AudioStart": 18,
        "AudioEnd": 38,
        // "Curves": [
        //     [   C_ORIGIN, [ [-3.0, 0.0, 0.0] ]],
        //     [   C_LINEAR, [ [-1.0, 1.0, -1.0] ]],
        //     [   C_LINEAR, [ [-4.0, -3.0, 2.0] ]],
        //     [   C_LINEAR, [ [3.0, 0.0, -0.0] ]]
        // ],
        "Curves": [
            [C_ORIGIN, [[100, -20, 160]]],
            [C_QUADRATIC, [[50, -20, 160], [75, -20, 200]]],
            [C_QUADRATIC, [[0, -20, 160], [25, -20, 120]]],
            [C_LINEAR, [[-100, -20, 160]]]
        ],
        "Subtitles": [
            [18.2, 21.5, "Platypus breathe air through the little nostrils on their bill"],
            [21.5, 25.5, "and can stay underwater for several minutes at a time."],
            [25.5, 29, "Their streamlined bodies and waterproof, insulated fur"],
            [29, 31, "have evolved for swimming under the water."],
            [31, 35, "Their strong front feet pull them along"],
            [35, 38, "while their back feet and tail act as rudders."]
        ],
        "Animations": [
            [0, 2],
            [1, 6],
            [2, 3],
            [3, 7]
            [99999999, 0]
        ],
        "CurveDuration": 8,
        "SceneDuration": 20
    }
}

// store visibility data in object;
//  can only draw line when both are visible.
let markerVisible = { marker0: false, marker1: false };
let markerSceneMap = { marker0: "Scene1", marker1: "Scene2"};

// let lastMarkerMap = { marker0: 0, marker1: 1};
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

AFRAME.registerComponent('registerevents', {
    init: function () 
    {
        let marker = this.el;
        
        marker.addEventListener('markerFound', function() {
            markerInformation[marker.id]["Visible"] = true;
            console.log(marker.id, " found");
            console.log(markerInformation[marker.id]["Index"], " ", lastMarker);
            // Needs to be done this way for some reason
            // Updating lastMarker after the if statement meant it didn't get updated
            let sceneChange = (markerInformation[marker.id]["Index"] != lastMarker);
            lastMarker = markerInformation[marker.id]["Index"];
            if (sceneChange) {
                console.log("Scene change!");
                changeScene(markerInformation[marker.id]["Scene"]);
            }
        });

        marker.addEventListener('markerLost', function() {
            markerInformation[marker.id]["Visible"] = false;
            console.log(marker.id, " lost");
        });
    }
});

AFRAME.registerComponent('run', {
    init: function() {
        this.m0 = document.querySelector("#marker0");
        this.p0 = new THREE.Vector3();
        this.m1 = document.querySelector("#marker1");
        this.p1 = new THREE.Vector3();
    },
    
    tick: function(time, deltaTime) {
        if (!launchFlags["Model"]) {
            return;
        }

        // if (markerVisible["marker0"]) {
        if (markerInformation[this.m0.id]["Visible"]) {
            this.m0.object3D.getWorldPosition(this.p0);
            // console.log(this.p0);
            markerPositions[0] = this.p0;
            currentSceneName = "Scene1";

            activePath = 0;
        }
        else if (markerInformation[this.m1.id]["Visible"]) {
            this.m0.object3D.getWorldPosition(this.p1);
            // console.log(this.p0);
            markerPositions[1] = this.p1;
            currentSceneName = "Scene2";
            activePath = 1;
        }
    }
})

function changeScene(sceneId) {
    if (experienceStarted) {
        audioPlayer.pause();
        audioPlayer.currentTime = sceneInformation[sceneId]["AudioStart"];
        audioPlayer.play();
        currentSceneName = sceneId;
        // activePath = 0;
        animTimer = 0;
        elapsedTime = 0;
        document.getElementById("subtitle-div").style.visibility = "visible";
    }
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                // width: { ideal: 1920, min: 1280 },
                // height: { ideal: 1080, min: 720 },
                // frameRate: { ideal: 120, min: 30 }
            },
            audio: false
        });

        const video = document.getElementById('camera-feed');
        if (video) {
            video.srcObject = stream;
            video.autoplay = true;
            video.playsinline = true;
            video.muted = true;

            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play().then(resolve).catch(console.error);
                };
            });
        }

        // isCameraReady = true;
        console.log('Camera ready');
        launchFlags["Camera"] = true;
        // checkReadyToStart();
        return true;

    } catch (error) {
        console.error('Camera failed to initialize:', error);
        return false;
    }
}

function initThreeJS() {

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );

    console.log(camera);

    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 30);
    console.log('Camera position:', camera.position);

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
    // camera.add(audioListener);

    audioLoader = new THREE.AudioLoader();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, -5);
    scene.add(directionalLight);

    const dirLight2 = new THREE.DirectionalLight(0xfffff, 0.8);
    dirLight2.position.set(0, 0, -30);
    scene.add(dirLight2);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, -5, -2);
    scene.add(fillLight);

    const modelLight = new THREE.PointLight(0xffffff, 0.5, 20);
    modelLight.position.set(0, 2, 0);
    scene.add(modelLight);

    console.log('Three.js initialized');
}

function loadARObjects() {
    console.log('arObjectsConfig:', arObjectsConfig);

    const loader = new THREE.GLTFLoader();

    arObjectsConfig.forEach((config, index) => {
        loader.load(
            'resources/models/platypus.glb',
            (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 10000, 50);

                // config.scale ||
                const modelScale = { x:1, y:1, z:1 };

                model.scale.set(modelScale.x, modelScale.y, modelScale.z);

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
                    // const action = mixer.clipAction();
                }

                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);

                    model.animationActions = [];
                    mixers.push(mixer);
                }

                launchFlags["Model"] = true;
                console.log("<Finished loading: Model>");
                attemptUnlock();
            },
        );
    });
}

function loadModelAudio() {
    // Function to update the subtitle box
    function subtitleChange(event) {
        document.getElementById("subtitle-container").textContent = event.target.text;
    }
    // Load the audio file
    console.log("Loading audio:", audioFileName);
    audioPlayer = new Audio(audioPath + audioFileName);

    
    // Load the subtitles
    const track = audioPlayer.addTextTrack("subtitles");
    for (const [curveName, curveInfo] of Object.entries(sceneInformation)) {
        console.log("Loading subtitles");
        for (let i = 0; i < curveInfo["Subtitles"].length; i++) {
            const cue = new VTTCue(...curveInfo["Subtitles"][i]);
            cue.onenter = subtitleChange;
            track.addCue(cue);
        }

        audioSubtitles.push(track);
    }

    launchFlags["Audio"] = true;
    console.log("<Finished loading: Audio>");
    attemptUnlock();
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    windowSize = [window.innerWidth, window.innerHeight];
}

let previousPos = new THREE.Vector3(0, 0, 0);
function animate() {
    const deltaTime = clock.getDelta();

    if (currentSceneName != "") {

        const curScene = sceneInformation[currentSceneName];

        if (arObjects.length > 0) {
            const model = arObjects[0];
            
            if (launchFlags["Paths"]) {
                // if (activePath < 0) {
                //     activePath = 0;
                // }

                // if (activePath < curveCount) {
                if (activePath < 10000000) {
                    let nextPos;
                    if (animTimer < 1) {
                        // console.log(pathways, activePath, animTimer);
                        nextPos = pathways[activePath].getPoint(animTimer);
                        // previousPos = nextPos;
                    }
                    else {
                        nextPos = new THREE.Vector3(model.position.x, model.position.y, model.position.z);
                    }
                    // const nextPos = new THREE.Vector3(0, 0, 0);
                    const movDir = new THREE.Vector3(
                        nextPos.x - previousPos.x,
                        nextPos.y - previousPos.y,
                        nextPos.z - previousPos.z
                    );
                    if (animTimer < 1) {
                        previousPos = nextPos;
                    }
                    // const movDir = 
                    movDir.normalize();
                    let rotAngel = Math.atan2(movDir.x, movDir.z);
                    model.rotation.y = rotAngel;
                    // console.log(markerPositions[0]);
                    // console.log(model.rotation.y, movDir, rotAngel);
                    // console.log(nextPos, previousPos, animTimer)

                    if (animTimer < curScene["CurveDuration"]) {
                        model.position.set(
                            previousPos.x*3+markerPositions[0].x*modelDistance*Math.tan(35 * (Math.PI / 180)),
                            previousPos.y*3+markerPositions[0].y*modelDistance*Math.tan(35 * (Math.PI / 180)),
                            previousPos.z*3-modelDistance
                        );
                        // model.position.set(
                        //     nextPos.x, nextPos.y, nextPos.z
                        // )
                    }
                    else {

                    }

                    document.getElementById("elapsed-time").textContent = nextPos.x + " " + nextPos.y + " " + nextPos.z;
                    document.getElementById("elapsed-time").textContent = model.position.x + " " + model.position.y + " " + model.position.z;
                    
                    animTimer += deltaTime / curScene["CurveDuration"];
                }

            }
        }

        if (animationMixer_2) {
            animationMixer_2.update(deltaTime);

            if (elapsedTime > curScene["Animations"][currentAnimation + 1][0]) {
                pathwayAnimations[curScene["Animations"][currentAnimation+1][1]].play();
                if (currentAnimation > -1) {
                    pathwayAnimations[curScene["Animations"][currentAnimation][1]].stop();
                }
                currentAnimation += 1;
                
                if (currentAnimation > 0) {
                    // pathwayAnimations[animationInformation[currentAnimation][1]].crossFadeFrom(pathwayAnimations[animationInformation[currentAnimation-1][1]], 0.2, false);
                    // pathwayAnimations[sceneInformation[currentSceneName]["Animations"][currentAnimation-1][1]].fadeOut(1);
                    // pathwayAnimations[sceneInformation[currentSceneName]["Animations"][currentAnimation][1]].fadeIn(1);
                }

                document.getElementById("active-animation").textContent = curScene["Animations"][currentAnimation][1];
            }
        }

        if (elapsedTime > (curScene["AudioEnd"] - curScene["AudioStart"])) {
            audioPlayer.pause();
        }

        if (elapsedTime > curScene["SceneDuration"]) {
            currentSceneName = "";
            arObjects[0].position.y = 1000;
            document.getElementById("subtitle-div").style.visibility = "hidden";
        }

        // console.log(elapsedTime);

        elapsedTime += deltaTime;
        // document.getElementById("elapsed-time").textContent = elapsedTime;

    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

/**
 * Using pre-defined coordinates, generate a set of three.js Path objects
 * for the 3D model to follow.
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
    console.log("<Finished loading: Paths>");
    attemptUnlock();
}

/** Unlock the start button once all assets are loaded. */
function attemptUnlock() {
    console.log("Attempting launch!");
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

// Runs once everything is setup and the start button is pressed
function startFunction() {
    animate();
    audioPlayer.play();
    audioPlayer.pause();
    document.getElementById("welcome-div").style.visibility = "hidden";

    experienceStarted = true;

    // changeScene("Scene2");
}

async function init() {
    console.log('Initializing AR experience...');

    const cameraSuccess = await initCamera();
    if (!cameraSuccess) {
        console.error('Camera initalization failed');
        return;
    }
    initThreeJS();
    loadARObjects();
    loadModelAudio();
    generatePaths();

    window.addEventListener('resize', onWindowResize);
}

if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
