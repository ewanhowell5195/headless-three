import { Canvas, Image, ImageData } from "skia-canvas"
import getTHREE from "../index.js"

const { THREE, render, loadTexture } = await getTHREE({ Canvas, Image, ImageData })

// Create scene
const scene = new THREE.Scene()

// Add lighting
scene.add(new THREE.AmbientLight(0x404040))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(-1, 2, 3)
scene.add(light)

// Add a textured cube
const texture = await loadTexture("examples/texture.png")
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ map: texture })
)
cube.rotation.set(Math.PI / 6, Math.PI / 4, 0)
scene.add(cube)

// Perspective
const perspective = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
perspective.position.set(0, 0, 5)
await render({
  scene,
  camera: perspective,
  width: 512,
  height: 512,
  path: "examples/cube_perspective.png"
})
console.log("Saved examples/cube_perspective.png")

// Orthographic
const ortho = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 100)
ortho.position.set(0, 0, 5)
await render({
  scene,
  camera: ortho,
  width: 512,
  height: 512,
  path: "examples/cube_orthographic.png"
})
console.log("Saved examples/cube_orthographic.png")
