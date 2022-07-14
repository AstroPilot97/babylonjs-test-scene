import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import { SkyMaterial } from "babylonjs-materials";
import mntnTex from "./../assets/textures/mountains/mntn-tex.jpg";
import mntnDisp from "./../assets/textures/mountains/DisplacementMap.png";
import Stats from "stats.js";

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
    this.hemiLight = new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    this.hemiLight.intensity = 0.55;

    // Stats
    this.stats = new Stats();
    const panels = [0, 1, 2]; // 0: fps, 1: ms, 2: mb
    Array.from(this.stats.dom.children).forEach((child, index) => {
      child.style.display = panels.includes(index) ? "inline-block" : "none";
    });
    document.body.appendChild(this.stats.dom);

    this.sky();

    this.mountainPlane();
  }

  doRender() {
    this.engine.runRenderLoop(() => {
      this.scene.render();

      if (this.phi && this.theta) {
        this.elevation += 0.02;
        this.phi = BABYLON.Tools.ToRadians(90 - this.elevation);
        this.theta = BABYLON.Tools.ToRadians(this.skyMaterial.azimuth * 10);
        this.sunCoords = this.setFromSphericalCoords(1, this.phi, this.theta);
        this.skyMaterial.sunPosition = this.sunCoords;
      }

      this.hemiLight.intensity =
        this.skyMaterial.sunPosition.y > 0.1 ? 0.55 : 0.1;

      this.stats.update();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  sky() {
    this.skyMaterial = new SkyMaterial("sky", this.scene);
    this.skyMaterial.backFaceCulling = false;
    this.skyMaterial.turbidity = 5.5;
    this.skyMaterial.rayleigh = 1.1;
    this.skyMaterial.mieCoefficient = 0.008;
    this.skyMaterial.mieDirectionalG = 0.975;
    this.skyMaterial.azimuth = 68;
    this.skyMaterial.luminance = 0.35;
    this.skyMaterial.useSunPosition = true;

    this.elevation = 15;
    this.phi = BABYLON.Tools.ToRadians(90 - this.elevation);
    this.theta = BABYLON.Tools.ToRadians(this.skyMaterial.azimuth * 10);
    this.sunCoords = this.setFromSphericalCoords(1, this.phi, this.theta);
    this.skyMaterial.sunPosition = this.sunCoords;

    var skybox = BABYLON.CreateBox("skybox", { size: 100000.0 }, this.scene);
    skybox.material = this.skyMaterial;
  }

  mountainPlane() {
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 8192, height: 8192, subdivisions: 24 },
      this.scene
    );

    const textures = {
      color: new BABYLON.Texture(mntnTex, this.scene, false, false),
      height: new BABYLON.Texture(mntnDisp, this.scene, false, false),
    };

    const blocks = {};
    BABYLON.NodeMaterial.ParseFromSnippetAsync("LDM1PB#5", this.scene).then(
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
        ).value = 2048;
        ground.material = nodeMaterial;
      }
    );

    ground.translate(new BABYLON.Vector3(-2500, -100, 0), 1);
  }

  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius;
    const sphericalCoords = {};

    sphericalCoords.x = sinPhiRadius * Math.sin(theta);
    sphericalCoords.y = Math.cos(phi) * radius;
    sphericalCoords.z = sinPhiRadius * Math.cos(theta);

    return sphericalCoords;
  }
}
