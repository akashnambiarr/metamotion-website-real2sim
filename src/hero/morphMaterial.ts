import * as THREE from 'three'

/**
 * The whole morph is one uniform: uProgress mixes each point from its noisy
 * scan position to its exact surface target, staggered per point by aSeed.
 * GSAP animates a single float; no attribute uploads ever happen per frame.
 */
export function createMorphMaterial(
  near: THREE.Color,
  far: THREE.Color,
  pointScale: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uPointScale: { value: pointScale },
      uNear: { value: near },
      uFar: { value: far },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aTarget;
      attribute float aSeed;
      uniform float uProgress;
      uniform float uTime;
      uniform float uPointScale;
      varying float vFade;
      varying float vSeed;

      void main() {
        float p = smoothstep(aSeed * 0.35, aSeed * 0.35 + 0.65, uProgress);
        vec3 pos = mix(position, aTarget, p);

        // faint shimmer while the cloud is still a raw scan
        float wobble = (1.0 - p) * 0.0035;
        pos += vec3(
          sin(uTime * 2.1 + aSeed * 43.0),
          cos(uTime * 1.7 + aSeed * 29.0),
          sin(uTime * 2.5 + aSeed * 17.0)
        ) * wobble;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uPointScale * (0.7 + 0.6 * aSeed) / max(0.5, -mv.z);
        gl_Position = projectionMatrix * mv;

        vFade = 1.0 - smoothstep(0.72, 1.0, uProgress);
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uNear;
      uniform vec3 uFar;
      varying float vFade;
      varying float vSeed;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        if (dot(uv, uv) > 0.25) discard;
        float alpha = vFade * 0.92;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(mix(uNear, uFar, vSeed), alpha);
      }
    `,
  })
}
