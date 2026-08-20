import * as THREE from 'three'

export interface TabletopScene {
  group: THREE.Group
  lidPivot: THREE.Group
  staticMeshes: THREE.Mesh[]
  lidMeshes: THREE.Mesh[]
  meshMaterials: THREE.MeshStandardMaterial[]
  edgeMaterials: THREE.LineBasicMaterial[]
}

/**
 * A procedural desk scene that mirrors what the pipeline actually handles:
 * a mug, an instance-split stack of boxes, and an articulated laptop whose
 * lid hangs off a hinge group so points and meshes swing together.
 */
export function buildTabletopScene(colors: {
  mesh: THREE.Color
  edge: THREE.Color
  ground: THREE.Color
}): TabletopScene {
  const group = new THREE.Group()

  const meshMaterials: THREE.MeshStandardMaterial[] = []
  const edgeMaterials: THREE.LineBasicMaterial[] = []
  const staticMeshes: THREE.Mesh[] = []
  const lidMeshes: THREE.Mesh[] = []

  const material = (tint = 0): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({
      color: colors.mesh.clone().offsetHSL(0, 0, tint),
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0,
    })
    meshMaterials.push(m)
    return m
  }

  const addEdges = (mesh: THREE.Mesh, parent: THREE.Object3D): void => {
    const edgeMat = new THREE.LineBasicMaterial({
      color: colors.edge,
      transparent: true,
      opacity: 0,
    })
    edgeMaterials.push(edgeMat)
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 24),
      edgeMat,
    )
    lines.position.copy(mesh.position)
    lines.rotation.copy(mesh.rotation)
    lines.visible = false
    parent.add(lines)
  }

  const addStatic = (mesh: THREE.Mesh): THREE.Mesh => {
    mesh.visible = false
    group.add(mesh)
    staticMeshes.push(mesh)
    addEdges(mesh, group)
    return mesh
  }

  // desk top
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 1.35), material(-0.02))
  desk.position.set(0, -0.03, 0)
  addStatic(desk)

  // mug with a torus handle
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.055, 0.1, 24, 1, true),
    material(0.05),
  )
  mug.position.set(-0.72, 0.05, 0.3)
  addStatic(mug)
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.038, 0.011, 8, 18, Math.PI),
    material(0.05),
  )
  handle.position.set(-0.655, 0.05, 0.3)
  handle.rotation.z = -Math.PI / 2
  addStatic(handle)

  // instance-split stack: three boxes, each its own body
  const stackSpecs: Array<[number, number, number, number, number]> = [
    [0.3, 0.085, 0.22, 0.0425, 0],
    [0.27, 0.08, 0.2, 0.125, 0.14],
    [0.24, 0.075, 0.18, 0.2025, -0.1],
  ]
  for (const [w, h, d, y, rot] of stackSpecs) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(0.03))
    box.position.set(0.55, y, -0.18)
    box.rotation.y = rot
    addStatic(box)
  }

  // articulated laptop: base on the desk, lid on a hinge pivot
  const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.022, 0.27), material(0.06))
  laptopBase.position.set(-0.12, 0.011, -0.34)
  addStatic(laptopBase)

  const lidPivot = new THREE.Group()
  lidPivot.position.set(-0.12, 0.02, -0.475) // rear edge of the base
  group.add(lidPivot)

  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.017, 0.26), material(0.08))
  lid.position.set(0, 0, -0.13)
  lid.visible = false
  lidPivot.add(lid)
  lidMeshes.push(lid)
  addEdges(lid, lidPivot)

  // resting angle for an open laptop: screen up, leaning slightly back
  lidPivot.rotation.x = THREE.MathUtils.degToRad(72)

  return { group, lidPivot, staticMeshes, lidMeshes, meshMaterials, edgeMaterials }
}

export function buildLights(sky: THREE.Color, ground: THREE.Color): THREE.Object3D[] {
  const hemi = new THREE.HemisphereLight(sky, ground, 1.15)
  const key = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 1.5)
  key.position.set(-1.6, 2.4, 1.2)
  return [hemi, key]
}
