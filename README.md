# headless-three

Headless [Three.js](https://www.npmjs.com/package/three) rendering for Node.js, made simple.
Render 3D scenes to images on the server with no browser required.
Runs Three.js r162 (the last version with WebGL 1 support) without polluting the global scope.

[![npm version](https://badge.fury.io/js/headless-three.svg)](https://www.npmjs.com/package/headless-three)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

* Three.js r162 running in an isolated VM context
* No global scope pollution
* Works with any canvas library ([skia-canvas](https://www.npmjs.com/package/skia-canvas), [@napi-rs/canvas](https://www.npmjs.com/package/@napi-rs/canvas), [canvas](https://www.npmjs.com/package/canvas))
* Headless WebGL rendering via [gl](https://www.npmjs.com/package/gl)
* Built-in render function with multi-format output (PNG, JPEG, WebP, etc.) via [sharp](https://www.npmjs.com/package/sharp)
* Texture loading utility
* Extensible via `runInContext` for custom loaders

## Install

```bash
npm install headless-three
```

You also need a canvas library:
```bash
npm install skia-canvas
# or
npm install @napi-rs/canvas
# or
npm install canvas
```

## Quick Start

```js
import { Canvas, Image, ImageData } from "skia-canvas"
import getTHREE from "headless-three"

const { THREE, render, loadTexture } = await getTHREE({ Canvas, Image, ImageData })

// Create scene
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
camera.position.set(0, 0, 5)

// Add a lit cube
scene.add(new THREE.AmbientLight(0x404040))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(-1, 2, 3)
scene.add(light)

// Load a texture
const texture = await loadTexture("path/to/texture.png")

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ map: texture })
)
scene.add(cube)

// Render to file
await render({
  scene,
  camera,
  width: 512,
  height: 512,
  path: "output.png"
})

// Or get a PNG buffer
const buffer = await render({ scene, camera })
```

## API

### `getTHREE(options)`

Returns a promise that resolves to `{ THREE, render, loadTexture, runInContext }`.

#### Options

| Option | Description |
|---|---|
| `Canvas` | Canvas class from your canvas library |
| `Image` | Image class from your canvas library |
| `ImageData` | ImageData class from your canvas library |

#### Returns

| Property | Description |
|---|---|
| `THREE` | The Three.js library object |
| `render(options)` | Renders a scene to an image buffer or file |
| `loadTexture(input)` | Creates a `THREE.CanvasTexture` from a Canvas, Image, ImageData, string path, or Buffer |
| `runInContext(code)` | Executes JavaScript code inside the VM context |

### `render(options)`

Renders a scene to an image buffer or file. When saving to a file, the format is inferred from the extension unless `format` is specified. Buffer output defaults to PNG.

| Option | Default | Description |
|---|---|---|
| `scene` | | The Three.js scene to render |
| `camera` | | The camera to render from |
| `width` | `1024` | Output width in pixels |
| `height` | `1024` | Output height in pixels |
| `path` | | If provided, saves to this file path. Format is inferred from the extension |
| `format` | | Output format (`"png"`, `"jpeg"`, `"webp"`, `"avif"`, `"tiff"`, etc.). Overrides extension inference. See [sharp's output docs](https://sharp.pixelplumbing.com/api-output) for the full list of supported formats |
| `output` | | Options passed directly to the sharp format encoder (e.g. `{ quality: 85, mozjpeg: true }` for JPEG). See [sharp's output docs](https://sharp.pixelplumbing.com/api-output) for all available options per format |
| `colorSpace` | `THREE.SRGBColorSpace` | Renderer output color space |
| `background` | transparent | Background color. Accepts a hex number (`0xff0000`), `[r, g, b, a]` (0–1 floats), `{ r, g, b, a }` (0–1 floats), a CSS-style string (`"#rrggbb"`, `"#rrggbbaa"`, `"rgb(…)"`, `"rgba(…)"`, `"hsl(…)"`, `"hsla(…)"`, named colors like `"red"`), or a `THREE.Color`. Alpha is always optional and defaults to 1 |
| `premultiplyAlpha` | `false` | Keeps alpha premultiplied in the output image. WebGL's alpha blending produces premultiplied pixels in the framebuffer, which makes semi-transparent colors appear darker than expected when saved as PNG. The default (`false`) un-premultiplies them so they render correctly in image viewers. Set to `true` only if you need the raw premultiplied output |

```js
// Save to file (format inferred from extension)
await render({
  scene,
  camera,
  width: 512,
  height: 512,
  path: "output.png"
})

// Save as JPEG
await render({ scene, camera, path: "output.jpg" })

// Force format regardless of extension
await render({ scene, camera, path: "output.img", format: "webp" })

// Get PNG buffer (default)
const buffer = await render({ scene, camera })

// Get JPEG buffer
const buffer = await render({ scene, camera, format: "jpeg" })

// Smaller JPEG via mozjpeg encoder
await render({
  scene,
  camera,
  path: "output.jpg",
  output: { quality: 85, mozjpeg: true }
})

// Maximum PNG compression
await render({
  scene,
  camera,
  path: "output.png",
  output: { compressionLevel: 9, effort: 10 }
})
```

### `loadTexture(input)`

Creates a `THREE.CanvasTexture` from various input types:

```js
// From a file path
const texture = await loadTexture("path/to/image.png")

// From an Image
const img = new Image()
img.src = "path/to/image.png"
const texture = await loadTexture(img)

// From a Canvas
const texture = await loadTexture(canvas)
```

### `runInContext(code)`

Executes code inside the same VM context as Three.js. This is useful for loading bundled Three.js addons:

```js
import fs from "node:fs"

const { THREE, runInContext } = await getTHREE({ ... })

// Load a pre-bundled addon
runInContext(fs.readFileSync("GLTFLoader.bundle.js", "utf-8"))
```

## How It Works

headless-three uses Node.js's `vm` module to create an isolated V8 context with polyfilled browser APIs (`document`, `window`, `URL`, etc.). Three.js's CJS build runs inside this sandbox, thinking it's in a browser. The canvas library you provide handles the actual drawing surface and image operations. Rendering uses [gl](https://www.npmjs.com/package/gl) for headless WebGL and [sharp](https://www.npmjs.com/package/sharp) for image encoding.

## License

MIT © [Ewan Howell](https://ewanhowell.com/)
