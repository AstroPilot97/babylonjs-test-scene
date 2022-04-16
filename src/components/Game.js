import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { SkyMaterial } from "babylonjs-materials";

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
    this.camera = new BABYLON.ArcRotateCamera(
      "Camera",
      0,
      0,
      10,
      new BABYLON.Vector3(0, 0, 0),
      this.scene
    );
    this.camera.setPosition(new BABYLON.Vector3(0, 0, 20));
    this.camera.attachControl(this.canvas, true);

    // Hemispheric light
    this.light = new BABYLON.HemisphericLight(
      "light1",
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );

    this.sky();
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
    skyMaterial.azimuth = 0.3;
    skyMaterial.luminance = 0.35;

    skyMaterial.inclination = -0.45;

    // Need to find some babylon math utilities for degrees to radian computing
    // var elevation = 160;
    // this.phi = THREE.MathUtils.degToRad(90 - elevation);
    // this.theta = THREE.MathUtils.degToRad(skyMaterial.azimuth);

    var skybox = BABYLON.CreateBox("skybox", { size: 1000.0 }, this.scene);
    skybox.material = skyMaterial;
  }
}
