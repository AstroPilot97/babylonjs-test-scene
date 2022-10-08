import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { SkyMaterial } from "babylonjs-materials";
import Stats from "stats.js";
import Moment from "moment";
import GUI from "lil-gui";
import { saveAs } from "file-saver";

let canvas, engine, scene, camera, pipeline;
let stats, gui;
let hemiLight, sunlight;
let elevation, phi, theta, skyMaterial, sunCoords;
let ground;
let airship;
let testResults = [];
let memoryUsage = [];
let sizes = { width: 1920, height: 1080 };
let refreshRate = 0;
let readyToTest = false; // Flag to halt any testing logic before full asset load

createScene();
doRender();

function createScene() {
  canvas = document.getElementById("babylonCanvas");
  engine = new BABYLON.Engine(canvas, false, null, true);
  engine.setSize(sizes.width, sizes.height, true);

  scene = new BABYLON.Scene(engine, {
    useClonedMeshMap: true,
    useMaterialMeshMap: true,
    useGeometryUniqueIdsMap: true,
  });
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;

  camera = new BABYLON.UniversalCamera(
    "camera1",
    new BABYLON.Vector3(0, 100, -10),
    scene
  );
  camera.maxZ = 100000;

  //Rendering pipeline
  pipeline = new BABYLON.DefaultRenderingPipeline(
    "defaultPipeline", // The name of the pipeline
    true, // Do you want the pipeline to use HDR texture?
    scene, // The scene instance
    [camera] // The list of cameras to be attached to
  );

  // GUI
  gui = new GUI();

  // Hemispheric light
  hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.55;

  // Stats
  stats = new Stats();
  const panels = [0, 1, 2]; // 0: fps, 1: ms, 2: mb
  Array.from(stats.dom.children).forEach((child, index) => {
    child.style.display = panels.includes(index) ? "inline-block" : "none";
  });
  document.body.appendChild(stats.dom);

  //Loading scene elements
  sky();
  mountainPlane();
  initBalloons();
  initForests();
  initPostprocessing();

  const cloudPlacement = [
    new BABYLON.Vector3(-1156, 100, 0),
    new BABYLON.Vector3(870, 250, 1800),
    new BABYLON.Vector3(-800, 170, 1500),
    new BABYLON.Vector3(-2390, 1030, 1610),
    new BABYLON.Vector3(-6000, 450, 3000),
    new BABYLON.Vector3(980, 252, -870),
    new BABYLON.Vector3(-590, 169, -1240),
    new BABYLON.Vector3(-5000, 854, -400),
  ];

  const cloudScaling = [150, 125, 150, 100, 300, 150, 175, 50];

  for (let i = 0; i < cloudPlacement.length; i++) {
    initClouds(
      1000,
      new BABYLON.Vector3(-300, 5, -300),
      new BABYLON.Vector3(300, 5, 300),
      cloudScaling[i],
      cloudPlacement[i]
    );
  }

  // Test controls
  initBenchmarkControls();
  initTestResultControls();

  //Optimization
  scene.skipPointerMovePicking = true;
  scene.autoClear = false; // Color buffer
  scene.autoClearDepthAndStencil = false; // Depth and stencil, obviously
  scene.blockMaterialDirtyMechanism = true;
  scene.clearCachedVertexData();
}

function doRender() {
  setTimeout(function () {
    requestAnimationFrame(doRender);
  }, 1000 / refreshRate);

  scene.render();

  if (phi && theta && readyToTest) {
    elevation += 0.03;
    phi = BABYLON.Tools.ToRadians(90 - elevation);
    theta = BABYLON.Tools.ToRadians(skyMaterial.azimuth * 10);
    sunCoords = setFromSphericalCoords(1, phi, theta);
    skyMaterial.sunPosition = sunCoords;

    var sunDir = setFromSphericalCoords(-50, phi, theta);

    sunlight.direction = new BABYLON.Vector3(sunDir.x, sunDir.y, sunDir.z);
  }

  if (skyMaterial.sunPosition.y > 0.1) {
    hemiLight.intensity = 0.55;
    sunlight.setEnabled(true);
  } else {
    hemiLight.intensity = 0.1;
    sunlight.setEnabled(false);
  }

  if (readyToTest) {
    scene.meshes.forEach((mesh) => {
      if (mesh.id.includes("Object")) {
        mesh.position.x += 0.002;
      }
    });
  }

  if (airship && readyToTest) {
    airship.position.x -= 0.054;
    camera.position.x -= 0.054;
  }

  stats.update();

  window.addEventListener("resize", () => {
    engine.resize();
  });
}

function sky() {
  skyMaterial = new SkyMaterial("sky", scene);
  skyMaterial.backFaceCulling = false;
  skyMaterial.turbidity = 5.5;
  skyMaterial.rayleigh = 1.1;
  skyMaterial.mieCoefficient = 0.008;
  skyMaterial.mieDirectionalG = 0.975;
  skyMaterial.azimuth = 68;
  skyMaterial.luminance = 0.35;
  skyMaterial.useSunPosition = true;

  sunlight = new BABYLON.DirectionalLight(
    "sunLight",
    new BABYLON.Vector3(0, -1, 0),
    scene
  );
  sunlight.position = new BABYLON.Vector3(0, 300, 0);

  elevation = 15;
  phi = BABYLON.Tools.ToRadians(90 - elevation);
  theta = BABYLON.Tools.ToRadians(skyMaterial.azimuth * 10);
  sunCoords = setFromSphericalCoords(1, phi, theta);
  skyMaterial.sunPosition = sunCoords;
  var sunDir = setFromSphericalCoords(-50, phi, theta);

  sunlight.direction = new BABYLON.Vector3(sunDir.x, sunDir.y, sunDir.z);
  sunlight.intensity = 5;

  var skybox = BABYLON.CreateBox("skybox", { size: 100000.0 }, scene);
  skybox.material = skyMaterial;
}

function setFromSphericalCoords(radius, phi, theta) {
  const sinPhiRadius = Math.sin(phi) * radius;
  const sphericalCoords = {};

  sphericalCoords.x = sinPhiRadius * Math.sin(theta);
  sphericalCoords.y = Math.cos(phi) * radius;
  sphericalCoords.z = sinPhiRadius * Math.cos(theta);

  return sphericalCoords;
}

function mountainPlane() {
  ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    { width: 16384, height: 16384, subdivisions: 24 },
    scene
  );

  const textures = {
    color: new BABYLON.Texture(
      "textures/mountains/mntn-tex.jpg",
      scene,
      false,
      false
    ),
    height: new BABYLON.Texture(
      "textures/mountains/DisplacementMap.png",
      scene,
      false,
      false
    ),
  };

  const blocks = {};
  BABYLON.NodeMaterial.ParseFromSnippetAsync("LDM1PB#5", scene).then(
    (nodeMaterial) => {
      nodeMaterial.name = "nodeMat";
      blocks.color = nodeMaterial.getBlockByName("texUrl").texture =
        textures.color;
      blocks.height = nodeMaterial.getBlockByName("dispUrl").texture =
        textures.height;
      blocks.colorTiling = nodeMaterial.getBlockByName(
        "colorTiling"
      ).value = 24;
      blocks.heightTiling = nodeMaterial.getBlockByName(
        "heightTiling"
      ).value = 16;
      blocks.heightIntenisty = nodeMaterial.getBlockByName(
        "heightIntensity"
      ).value = 3198;
      nodeMaterial.freeze();
      ground.material = nodeMaterial;
    }
  );

  ground.translate(new BABYLON.Vector3(-2500, -100, 0), 1);
  sunlight.excludedMeshes.push(ground);
}

function initBalloons() {
  let balloonPlacements = [
    new BABYLON.Vector3(-0.25, 3, 21.5),
    new BABYLON.Vector3(-0.25, 3, 21.5),
    new BABYLON.Vector3(8, 10, 25),
    new BABYLON.Vector3(6, -5, 23),
    new BABYLON.Vector3(-10, 7, 19),
    new BABYLON.Vector3(0, 10, 22.5),
    new BABYLON.Vector3(-10, -5, 25),
    new BABYLON.Vector3(-5, -1, 17),
    new BABYLON.Vector3(15, 5, 23),
    new BABYLON.Vector3(4, -1, 25),
    new BABYLON.Vector3(13, 11, 20),
    new BABYLON.Vector3(-14, 0, 21.5),
    new BABYLON.Vector3(-6, 8, 25),
  ];

  airship = new BABYLON.TransformNode("airship", scene, true);
  var shadowGenerator = new BABYLON.ShadowGenerator(2048, sunlight);
  shadowGenerator.useContactHardeningShadow = true;
  for (let i = 0; i < balloonPlacements.length; i++) {
    BABYLON.SceneLoader.ImportMesh(
      "",
      "models/peachy_balloon/",
      "scene.glb",
      scene,
      function (meshes) {
        meshes.forEach((mesh) => {
          mesh.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
          mesh.position = balloonPlacements[i];
          mesh.receiveShadows = true;
          shadowGenerator.addShadowCaster(mesh, true);

          if (i == 0) {
            mesh.parent = airship;
            mesh.visibility = 0;
          }
        });
        airship.position = new BABYLON.Vector3(0, 100, 30);

        if (i == balloonPlacements.length - 1) {
          document.getElementById("loader").style.display = "none";
        }
      }
    );
  }
}

function initForests() {
  BABYLON.SceneLoader.ImportMesh(
    "",
    "models/pine_tree/",
    "scene.glb",
    scene,
    function (meshes) {
      var mesh = meshes[1];
      mesh.isPickable = false;
      let matrices = [];
      for (let index = 0; index < 60000; index++) {
        var matrix = BABYLON.Matrix.Translation(
          BABYLON.Scalar.RandomRange(-300, 700),
          BABYLON.Scalar.RandomRange(-500, 500),
          BABYLON.Scalar.RandomRange(-6, -5)
        );

        var scale = BABYLON.Scalar.RandomRange(16, 17);
        var matrix2 = BABYLON.Matrix.Scaling(scale, scale, scale);

        var q = BABYLON.Quaternion.FromEulerAngles(-0.078, 0.163, 0); // radians
        var matrix3 = new BABYLON.Matrix();

        BABYLON.Matrix.FromQuaternionToRef(q, matrix3);

        matrices.push(matrix.multiply(matrix2).multiply(matrix3));
      }

      var thinInstance = mesh.thinInstanceAdd(matrices);
      mesh.freezeWorldMatrix();
    }
  );
}

function initClouds(particleCount, minEmitBox, maxEmitBox, maxSize, position) {
  var fountain = BABYLON.MeshBuilder.CreateBox("foutain", { size: 0.1 }, scene);
  fountain.visibility = 0;
  var particleSystem;
  var fogTexture = new BABYLON.Texture("textures/smoke/smoke_15.png", scene);

  particleSystem = new BABYLON.GPUParticleSystem(
    "particles",
    { capacity: 50000 },
    scene
  );
  particleSystem.activeParticleCount = particleCount;
  particleSystem.manualEmitCount = particleSystem.activeParticleCount;
  particleSystem.minEmitBox = minEmitBox; // Starting all from
  particleSystem.maxEmitBox = maxEmitBox; // To..

  particleSystem.particleTexture = fogTexture.clone();
  particleSystem.emitter = fountain;

  particleSystem.color1 = new BABYLON.Color4(0.8, 0.8, 0.8, 0.1);
  particleSystem.color2 = new BABYLON.Color4(0.95, 0.95, 0.95, 0.15);
  particleSystem.colorDead = new BABYLON.Color4(0.9, 0.9, 0.9, 0.1);
  particleSystem.minSize = 25.0;
  particleSystem.maxSize = maxSize;
  particleSystem.minLifeTime = Number.MAX_SAFE_INTEGER;
  particleSystem.emitRate = 50000;
  particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
  particleSystem.direction1 = new BABYLON.Vector3(0, 0, 0);
  particleSystem.direction2 = new BABYLON.Vector3(0, 0, 0);
  particleSystem.minAngularSpeed = -2;
  particleSystem.maxAngularSpeed = 2;
  particleSystem.minEmitPower = 0.5;
  particleSystem.maxEmitPower = 1;
  particleSystem.updateSpeed = 0.005;

  fountain.position = position;

  particleSystem.start();
}

function startClockTimer() {
  let start = Moment();
  setInterval(function () {
    let difference = Moment().diff(start, "seconds");
    let elapsedTimeSeconds = Math.round(difference);
    let elapsedTimeMinutes = elapsedTimeSeconds / 60;
    elapsedTimeSeconds = Math.floor(elapsedTimeSeconds) % 60;
    elapsedTimeMinutes = Math.floor(elapsedTimeMinutes) % 60;
    let stringMinutes = elapsedTimeMinutes.toLocaleString();
    let stringSeconds = elapsedTimeSeconds.toLocaleString();
    if (elapsedTimeSeconds.toString().length < 2) {
      stringSeconds = "0" + stringSeconds;
    }
    document.getElementById(
      "timeElapsed"
    ).innerHTML = `Time elapsed: ${stringMinutes}:${stringSeconds}`;
    let fps = Math.round(engine.getFps());
    let memory = performance.memory;
    if (readyToTest) {
      testResults.push(fps);
      memoryUsage.push(Math.round(memory.usedJSHeapSize / 1048576));
    }
  }, 1000);
}

function initBenchmarkControls() {
  let resolutionObj = {
    resolution: "FullHD",
  };
  gui
    .add(resolutionObj, "resolution", ["FullHD", "WQHD", "4K"])
    .name("Resolution")
    .onChange((value) => {
      setResolution(value);
    });

  let refreshRateObj = {
    rate: 0,
  };

  gui
    .add(refreshRateObj, "rate", { Unlimited: 0, "60Hz": 60, "30Hz": 31 })
    .name("Refresh Rate")
    .onChange((value) => {
      refreshRate = value;
      console.log("refreshRate ", refreshRate);
    });

  let testButton = {
    BeginTest: function () {
      readyToTest = true;
      // Camera animation loop
      beginCameraLoop();
      // Clock timer
      startClockTimer();
    },
  };
  gui.add(testButton, "BeginTest");
}

function setResolution(resolution) {
  switch (resolution) {
    case "FullHD":
      sizes = {
        width: 1920,
        height: 1080,
      };
      break;
    case "WQHD":
      sizes = {
        width: 2560,
        height: 1440,
      };
      break;
    case "4K":
      sizes = {
        width: 3840,
        height: 2160,
      };
      break;
    default:
      sizes = {
        width: 1920,
        height: 1080,
      };
  }
  engine.setSize(sizes.width, sizes.height);
}

function initTestResultControls() {
  let controlObj = {
    SaveTestResults: function () {
      var testFile = new File(
        [
          `Babylon.js performance test results \n
          Testing date: ${Moment().toLocaleString()}; \n
          Screen resolution: width: ${canvas.width}, height: ${canvas.height} \n
          Frames per second (each FPS count in array was ticked every second):
          ${testResults} \n
          Memory usage (in Megabytes):
          ${memoryUsage}
          `,
        ],
        "test_results.txt",
        {
          type: "text/plain;charset=utf-8",
        }
      );
      saveAs(testFile);
    },
  };

  gui.add(controlObj, "SaveTestResults");
}

function beginCameraLoop() {
  let cameraPositions = [
    [0, 0, -40],
    [150, -200, -280],
    [0, 300, 15],
    [300, 10, -0],
    [-200, 40, 70],
  ];
  let currentPosition = 0;
  setInterval(function () {
    let indexPosition = ++currentPosition % cameraPositions.length;
    camera.position.x = airship.position.x + cameraPositions[indexPosition][0];
    camera.position.y = airship.position.y + cameraPositions[indexPosition][1];
    camera.position.z = airship.position.z + cameraPositions[indexPosition][2];
    camera.setTarget(airship.position);
  }, 20000);
}

function initPostprocessing() {
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.8;
  pipeline.bloomWeight = 0.3;
  pipeline.bloomKernel = 64;
  pipeline.bloomScale = 0.5;
}
