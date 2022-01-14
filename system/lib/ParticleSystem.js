import * as THREE from './three.module.js';

const _VS = `
uniform float pointMultiplier;

attribute float size; 
attribute float angle;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;

void main(){
    vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * pointMultiplier / gl_Position.w;

    vAngle = vec2(cos(angle), sin(angle));
    vColour = colour;
}

`;

const _FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main(){
    vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
    gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}

`;

class LinearSpline {
  constructor(lerp) {
    this._points = [];
    this._lerp = lerp;
  }

  AddPoint(t, d) {
    this._points.push([t, d]);
  }

  Get(t) {
    let p1 = 0;

    for (let i = 0; i < this._points.length; i++) {
      if (this._points[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(this._points.length - 1, p1 + 1);

    if (p1 == p2) {
      return this._points[p1][1];
    }

    return this._lerp(
      (t - this._points[p1][0]) / (this._points[p2][0] - this._points[p1][0]),
      this._points[p1][1],
      this._points[p2][1]
    );
  }
}

function getRandom(mix) {
  return 1 - Math.random() * mix;
}

function randomizeVector(vector, mix = 1, mirror = false) {
  const vectorClon = vector.clone();

  for (const dimensions in vectorClon) {
    if (Object.hasOwnProperty.call(vectorClon, dimensions)) {
      const dimension = vectorClon[dimensions];

      if (mirror) {
        vectorClon[dimensions] = (2 * Math.random() - 1) * mix * dimension;
      } else {
        vectorClon[dimensions] = (1 - Math.random() * mix) * dimension;
      }
    }
  }

  return vectorClon;
}

class ParticleSystem {
  constructor(params) {
    const uniforms = {
      diffuseTexture: {
        value: params.map
      },
      pointMultiplier: {
        value:
          window.innerHeight / (2.0 * Math.tan((0.5 * 60.0 * Math.PI) / 180.0))
      }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    if (!params.velocity) {
      params.velocity = { x: 0, y: 0, z: 0 };
    }

    if (!params.position) {
      params.position = { x: 0, y: 0, z: 0 };
    }

    this.velocity = new THREE.Vector3(
      params.velocity.x,
      params.velocity.y,
      params.velocity.z
    );
    this.position = new THREE.Vector3(
      params.position.x,
      params.position.y,
      params.position.z
    );
    this.angle = params.angle || 0;
    this.size = params.size || 1;
    this.spawn = params.spawn || 1;
    this.alpha = params.alpha || 1.0;

    //Random

    if (!params.random) {
      params.random = {};
    }

    this.random = {};

    this.random.velocity = params.random.velocity || 0.0;
    this.random.position = params.random.position || 0.0;
    this.random.angle = params.random.angle || 0.0;
    this.random.size = params.random.size || 0.0;
    this.random.color = params.random.color || 0.0;
    this.random.alpha = params.random.alpha || 0.0;

    //mirror

    if (!params.mirror) {
      params.mirror = {};
    }

    this.mirror = {};

    this.mirror.position = params.mirror.position || false;
    this.mirror.velocity = params.mirror.velocity || false;

    this.camera = params.camera;
    this.particles = [];
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([], 3)
    );
    this.geometry.setAttribute("size", new THREE.Float32BufferAttribute([], 1));
    this.geometry.setAttribute(
      "colour",
      new THREE.Float32BufferAttribute([], 4)
    );

    this.geometry.setAttribute(
      "angle",
      new THREE.Float32BufferAttribute([], 1)
    );

    this.points = new THREE.Points(this.geometry, this.material);

    this.life = 1;

    params.parent.add(this.points);

    this.addParticles();
    this.updateGeometry();
  }

  addParticles(number) {
    for (let i = 0; i < number; i++) {
      const life = this.life;

      this.particles.push({
        position: randomizeVector(
          this.position,
          this.random.position,
          this.mirror.position
        ),
        size: this.size * getRandom(this.random.size),
        colour: new THREE.Color(
          1 * getRandom(this.random.color),
          1 * getRandom(this.random.color),
          1 * getRandom(this.random.color)
        ),
        alpha: this.alpha * getRandom(this.random.alpha),
        angle: this.angle * getRandom(this.random.angle),
        life: life,
        maxLife: life,
        velocity: randomizeVector(
          this.velocity,
          this.random.velocity,
          this.mirror.velocity
        )
      });
    }
  }

  updateGeometry() {
    const positions = [];
    const sizes = [];
    const colours = [];
    const angles = [];

    for (let i = 0; i < this.particles.length; i++) {
      const { position, size, colour, alpha, angle } = this.particles[i];
      positions.push(position.x, position.y, position.z);
      sizes.push(size);
      colours.push(colour.r, colour.g, colour.b, alpha);
      angles.push(angle);
    }

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    this.geometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(sizes, 1)
    );

    this.geometry.setAttribute(
      "colour",
      new THREE.Float32BufferAttribute(colours, 4)
    );

    this.geometry.setAttribute(
      "angle",
      new THREE.Float32BufferAttribute(angles, 1)
    );

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.colour.needsUpdate = true;
    this.geometry.attributes.angle.needsUpdate = true;
  }

  updateParticles(time) {
    time = time / 1000;

    for (let p of this.particles) {
      p.life -= time;
    }

    this.particles = this.particles.filter(p => {
      return p.life > 0.0;
    });

    for (let p of this.particles) {
      const t = 1.0 - p.life / p.maxLife;

      p.angle += time * 0.5;
      //p.alpha = this._alphaSpline.Get(t);
      // p.currentSize = p.size * this._sizeSpline.Get(t);
      //p.colour.copy(this._colourSpline.Get(t));

      p.position.add(p.velocity.clone().multiplyScalar(time));

      const drag = p.velocity.clone();
      drag.multiplyScalar(time * 0.1);
      drag.x =
        Math.sign(p.velocity.x) *
        Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      drag.y =
        Math.sign(p.velocity.y) *
        Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      drag.z =
        Math.sign(p.velocity.z) *
        Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      p.velocity.sub(drag);
    }

    this.particles.sort((a, b) => {
      const d1 = this.camera.position.distanceTo(a.position);
      const d2 = this.camera.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }
      if (d1 < d2) {
        return 1;
      }
      return 0;
    });
  }

  update(time) {
    this.addParticles(this.spawn);

    this.updateParticles(time);
    this.updateGeometry();
  }
}

export default ParticleSystem;
