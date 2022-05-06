import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { SkyMaterial } from "babylonjs-materials";
import mntnTex from "./../assets/textures/mountains/mntn-tex.jpg";
import mntnDisp from "./../assets/textures/mountains/DisplacementMap.png";

export default class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.engine = new BABYLON.Engine(this.canvas, true);
  }

  createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    // Arc Camera
    this.camera = new BABYLON.FreeCamera(
      "camera1",
      new BABYLON.Vector3(0, 100, -10),
      this.scene
    );
    this.camera.maxZ = 100000;
    this.camera.attachControl(this.canvas, false);

    // Hemispheric light
    this.light = new BABYLON.HemisphericLight(
      "light1",
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );

    this.sky();

    this.mountainPlane();
  }

  doRender() {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  sky() {
    var skyMaterial = new SkyMaterial("sky", this.scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.turbidity = 5.5;
    skyMaterial.rayleigh = 1.1;
    skyMaterial.mieCoefficient = 0.008;
    skyMaterial.mieDirectionalG = 0.975;
    // skyMaterial.azimuth = 0.1;
    skyMaterial.luminance = 0.35;
    skyMaterial.useSunPosition = true;

    // var elevation = -2000;
    // this.phi = BABYLON.Tools.ToRadians(90 - elevation);
    // this.theta = BABYLON.Tools.ToRadians(skyMaterial.azimuth * 10);
    // var sunCoords = this.getCoordinatesFromLatLng(this.phi, this.theta, 1);
    skyMaterial.sunPosition = new BABYLON.Vector3(-0.3, 0.2, 0.4);

    var skybox = BABYLON.CreateBox("skybox", { size: 100000.0 }, this.scene);
    skybox.material = skyMaterial;
  }

  mountainPlane() {
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 4096, height: 4096, subdivisions: 24 },
      this.scene
    );

    const textures = {
      color: new BABYLON.Texture(mntnTex, this.scene, false, false),
      height: new BABYLON.Texture(mntnDisp, this.scene, false, false),
    };

    const blocks = {};
    BABYLON.NodeMaterial.ParseFromSnippetAsync("LDM1PB#4", this.scene).then(
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
        ).value = 1024;
        ground.material = nodeMaterial;
      }
    );

    ground.translate(new BABYLON.Vector3(-1000, -0, 0), 1);
  }

  getCoordinatesFromLatLng = function (latitude, longitude, radiusEarth) {
    let latitude_rad = (latitude * Math.PI) / 180;
    let longitude_rad = (longitude * Math.PI) / 180;

    let xPos = radiusEarth * Math.cos(latitude_rad) * Math.cos(longitude_rad);
    let zPos = radiusEarth * Math.cos(latitude_rad) * Math.sin(longitude_rad);
    let yPos = radiusEarth * Math.sin(latitude_rad);

    return { x: xPos, y: yPos, z: zPos };
  };
}
