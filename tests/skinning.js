import getTHREE from "../index.js"

const lib = process.argv[2] || "skia-canvas"

console.log(`Testing skinning with: ${lib}`)

const { Canvas, Image, ImageData } = await import(lib)
const { THREE, render } = await getTHREE({ Canvas, Image, ImageData })

let consoleErrors = 0
const origError = console.error
console.error = (...args) => {
  consoleErrors++
  origError(...args)
}

// Create scene
const scene = new THREE.Scene()

// Create camera
const camera = new THREE.OrthographicCamera(-2, 2, 3, -1, 0.1, 100)
camera.position.set(0, 0, 5)

// Add lighting
const ambient = new THREE.AmbientLight(0x404040)
scene.add(ambient)
const directional = new THREE.DirectionalLight(0xffffff, 1)
directional.position.set(-1, 2, 3)
scene.add(directional)

// Vertical box spanning y 0-2, top half bound to a second bone bent 90 degrees,
// so a working skinning shader renders an L shape instead of a straight bar
const geometry = new THREE.BoxGeometry(0.4, 2, 0.4, 1, 10, 1)
geometry.translate(0, 1, 0)
const position = geometry.attributes.position
const skinIndices = []
const skinWeights = []
for (let i = 0; i < position.count; i++) {
  skinIndices.push(position.getY(i) > 1 ? 1 : 0, 0, 0, 0)
  skinWeights.push(1, 0, 0, 0)
}
geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4))
geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4))

const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial({ color: 0xff4444 }))
const root = new THREE.Bone()
const tip = new THREE.Bone()
tip.position.y = 1
root.add(tip)
mesh.add(root)
mesh.bind(new THREE.Skeleton([root, tip]))
tip.rotation.z = -Math.PI / 2
scene.add(mesh)

// Render raw pixels and measure the horizontal spread of the drawn shape
const width = 256
const height = 256
const pixels = await render({ scene, camera, width, height, format: "raw" })

let minX = Infinity
let maxX = -Infinity
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (pixels[(y * width + x) * 4 + 3] > 0) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
  }
}
const spread = maxX - minX

if (consoleErrors) {
  console.log(`FAIL: ${consoleErrors} console error(s) during render`)
  process.exit(1)
}
if (spread === -Infinity) {
  console.log("FAIL: nothing was rendered")
  process.exit(1)
}
// straight bar = ~10% of frame width, bent = ~35%
if (spread < width * 0.25) {
  console.log(`FAIL: horizontal spread ${spread}px suggests the bone transform was not applied`)
  process.exit(1)
}

const outDir = new URL(".", import.meta.url).pathname.slice(1)
const outFile = `${outDir}test-skinning-${lib.replace("/", "-")}.png`
await render({ scene, camera, width: 512, height: 512, path: outFile })
console.log(`PASS: skinned mesh rendered bent (spread ${spread}px), saved ${outFile}`)
