import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

/**
 * Samples every mesh surface into a point set carrying three attributes:
 * position (the noisy "scan"), aTarget (the exact surface point), and aSeed
 * (per-point stagger). The noise is baked once; per-frame cost is zero.
 */

// Deterministic gaussian noise so every load renders the same scan.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
}

function makeGauss(rand: () => number): () => number {
  return () => {
    const u = Math.max(rand(), 1e-9)
    const v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

export function samplePoints(meshes: THREE.Mesh[], budget: number): THREE.BufferGeometry {
  const rand = lcg(1337)
  const gauss = makeGauss(rand)

  const samplers = meshes.map((mesh) => {
    const sampler = new MeshSurfaceSampler(mesh).build()
    const geom = mesh.geometry as THREE.BufferGeometry
    geom.computeBoundingBox()
    const size = new THREE.Vector3()
    geom.boundingBox?.getSize(size)
    const area = 2 * (size.x * size.y + size.y * size.z + size.x * size.z)
    return { mesh, sampler, area }
  })
  const totalArea = samplers.reduce((sum, s) => sum + s.area, 0)

  const scan = new Float32Array(budget * 3)
  const target = new Float32Array(budget * 3)
  const seed = new Float32Array(budget)

  const position = new THREE.Vector3()
  const normal = new THREE.Vector3()
  let index = 0

  for (const { mesh, sampler, area } of samplers) {
    const count =
      mesh === meshes[meshes.length - 1]
        ? budget - index
        : Math.round((area / totalArea) * budget)
    for (let i = 0; i < count && index < budget; i += 1, index += 1) {
      sampler.sample(position, normal)
      // into the parent's space (meshes carry their own position/rotation)
      position.applyEuler(mesh.rotation).add(mesh.position)
      normal.applyEuler(mesh.rotation)

      const o = index * 3
      target[o] = position.x
      target[o + 1] = position.y
      target[o + 2] = position.z

      const surfaceNoise = gauss() * 0.01
      scan[o] = position.x + normal.x * surfaceNoise + gauss() * 0.005
      scan[o + 1] = position.y + normal.y * surfaceNoise + gauss() * 0.005
      scan[o + 2] = position.z + normal.z * surfaceNoise + gauss() * 0.005

      seed[index] = rand()
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(scan, 3))
  geometry.setAttribute('aTarget', new THREE.Float32BufferAttribute(target, 3))
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1))
  // scan points spread past the meshes; skip per-frame culling checks
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.2, 0), 4)
  return geometry
}
