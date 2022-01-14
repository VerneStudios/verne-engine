import * as THREE from "./three.module.js";
import { XRControllerModelFactory } from "./XRControllerModelFactory.js";

let currentSession = null;
let ren = null;
let controllers = null;
let grips = null;

const raycaster = new THREE.Raycaster();

function startSession({ renderer, callback = () => {} }) {
  if (currentSession === null) {
    ren = renderer;
    const sessionInit = {
      optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
    };
    navigator.xr.requestSession("immersive-vr", sessionInit).then((session) => {
      onSessionStarted(renderer, session);
      if (callback) {
        callback(session);
      }
    });
  }
}

function checkIfVREnabled() {
  if (navigator.hasOwnProperty("xr")) {
    return true;
  } else {
    return false;
  }
}

function onSessionStarted(renderer, session) {
  renderer.xr.setSession(session);
  session.addEventListener("end", onSessionEnded);
  currentSession = session;
}

function onSessionEnded() {
  if (currentSession) {
    currentSession.removeEventListener("end", onSessionEnded);
    currentSession = null;
    if (XRManager.onEnd) {
      XRManager.onEnd();
    }
  }
}

function endSession() {
  if (currentSession) {
    currentSession.end();
  }
}

function buildController(data) {
  switch (data.targetRayMode) {
    case "tracked-pointer":
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      var material = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Line(geometry, material);

    case "gaze":
      var geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(
        0,
        0,
        -1
      );
      var material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
  }
}

function getControllers({
  onSelectStart,
  onSelectEnd,
  connected,
  disconnected,
}) {
  const controller1 = ren.xr.getController(0);
  controller1.addEventListener("selectstart", (e) => {
    if (onSelectStart) {
      onSelectStart(e);
    }
  });
  controller1.addEventListener("selectend", (e) => {
    if (onSelectEnd) {
      onSelectEnd(e);
    }
  });
  controller1.addEventListener("connected", function (event) {
    event.scope = this;
    this.add(buildController(event.data));
    if (connected) {
      connected(event);
    }
  });
  controller1.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
    if (disconnected) {
      disconnected(this);
    }
  });

  const controller2 = ren.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controller2.addEventListener("connected", function (event) {
    event.scope = this;
    this.add(buildController(event.data));
    if (connected) {
      connected(event);
    }
  });
  controller2.addEventListener("disconnected", function () {
    this.remove(this.children[0]);
    if (disconnected) {
      disconnected(this);
    }
  });

  const CMF = new XRControllerModelFactory();

  const controllerGrip1 = ren.xr.getControllerGrip(0); //Toma la referencia del control
  controllerGrip1.add(CMF.createControllerModel(controllerGrip1));
  const controllerGrip2 = ren.xr.getControllerGrip(1); //Toma la referencia del control
  controllerGrip2.add(CMF.createControllerModel(controllerGrip2));

  controllers = [controller1, controller2];
  grips = [controllerGrip1, controllerGrip2];

  return [
    { control: controller1, grip: controllerGrip1 },
    { control: controller2, grip: controllerGrip2 },
  ];
}

function checkVRClick({ controller, objects }) {
  if (controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);

    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObjects(objects);

    return intersects;
  }

  return null;
}

const XRManager = {
  checkIfVREnabled,
  startSession,
  endSession,
  currentSession,
  getControllers,
  buildController,
  checkVRClick,
};

export default XRManager;
