import { Canvas, Image, ImageData } from "skia-canvas"
import getTHREE from "../index.js"

const { THREE, render, loadTexture } = await getTHREE({ Canvas, Image, ImageData })

// Create scene
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
camera.position.set(0, 0, 5)

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

// Render and save
await render({
  scene,
  camera,
  width: 512,
  height: 512,
  path: "examples/cube.png"
})

console.log("Saved examples/cube.png")
