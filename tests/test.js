import getTHREE from "../index.js"

const lib = process.argv[2] || "skia-canvas"

console.log(`Testing with: ${lib}`)

const { Canvas, Image, ImageData } = await import(lib)
const { THREE, render } = await getTHREE({ Canvas, Image, ImageData })

console.log(`THREE.REVISION: ${THREE.REVISION}`)

// Create scene
const scene = new THREE.Scene()

// Create camera
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
camera.position.set(0, 0, 5)

// Add lighting
const ambient = new THREE.AmbientLight(0x404040)
scene.add(ambient)
const directional = new THREE.DirectionalLight(0xffffff, 1)
directional.position.set(-1, 2, 3)
scene.add(directional)

// Add three cubes in a triangle
const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6)
const rotation = [Math.PI / 6, Math.PI / 4, 0]

const red = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xff4444 }))
red.position.set(0, 0.435, 0)
red.rotation.set(...rotation)
scene.add(red)

const green = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x44ff44 }))
green.position.set(-0.455, -0.36, 0)
green.rotation.set(...rotation)
scene.add(green)

const blue = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x4444ff }))
blue.position.set(0.455, -0.36, 0)
blue.rotation.set(...rotation)
scene.add(blue)

// Render and save
const outDir = new URL(".", import.meta.url).pathname.slice(1)
const outFile = `${outDir}test-${lib.replace("/", "-")}.png`
await render({ scene, camera, width: 512, height: 512, path: outFile })
console.log(`Saved ${outFile}`)
