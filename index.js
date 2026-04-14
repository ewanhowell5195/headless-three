import vm from "node:vm"
import fs from "node:fs"
import { createRequire } from "node:module"
import createContext from "gl"
import sharp from "sharp"

class Blob {
  constructor(bufs, { type }) {
    this.buffer = Buffer.concat(bufs.map(e => Buffer.from(e)))
    this.type = type
  }
}

export default async function({ Canvas, Image, ImageData }) {
  const require = createRequire(import.meta.url)
  const threePath = require.resolve("three")
  const document = {
    createElementNS(_, name) {
      switch (name) {
        case "canvas": {
          const c = new Canvas(1, 1)
          c.style = {}
          c.addEventListener = function() {}
          c.removeEventListener = function() {}
          return c
        }
        case "img": {
          const img = new Image
          img.addEventListener = function(eventName, cb) {
            switch (eventName) {
              case "load":
                img.onload = cb
                break
              case "error":
                img.onerror = cb
                break
            }
          }
          img.removeEventListener = function(eventName) {
            switch (eventName) {
              case "load":
                delete img.onload
                break
              case "error":
                delete img.onerror
                break
            }
          }
          return img
        }
        default: throw new Error(`Unknown tag name: '${name}'`)
      }
    }
  }
  const window = {
    document,
    URL: {
      createObjectURL: blob => `data:${blob.type};base64,${blob.buffer.toString("base64")}`,
      revokeObjectURL: () => {}
    },
    requestAnimationFrame: cb => setTimeout(cb, 0),
    cancelAnimationFrame: id => clearTimeout(id)
  }
  const threeExports = {}
  const vmCtx = vm.createContext({
    module: { exports: threeExports },
    exports: threeExports,
    document,
    window,
    self: window,
    OffscreenCanvas: Canvas,
    HTMLCanvasElement: Canvas,
    HTMLImageElement: Image,
    Image,
    ImageData,
    Blob: Blob,
    fetch: globalThis.fetch,
    Request: globalThis.Request,
    Response: globalThis.Response,
    Headers: globalThis.Headers,
    Array,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array,
    BigUint64Array,
    Map,
    Set,
    WeakMap,
    WeakSet,
    ArrayBuffer,
    SharedArrayBuffer,
    DataView,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    requestAnimationFrame: cb => setTimeout(cb, 0),
    cancelAnimationFrame: id => clearTimeout(id),
    console
  })
  vm.runInContext(fs.readFileSync(threePath, "utf-8"), vmCtx)
  const THREE = threeExports
  return {
    THREE,
    runInContext: code => vm.runInContext(code, vmCtx),

    async loadTexture(input) {
      let tex
      if (input instanceof Canvas) {
        tex = new THREE.CanvasTexture(input)
      } else {
        let canvas
        if (input instanceof ImageData) {
          canvas = new Canvas(input.width, input.height)
          const ctx = canvas.getContext("2d")
          ctx.putImageData(input, 0, 0)
        } else if (input instanceof Image) {
          canvas = new Canvas(input.width, input.height)
          const ctx = canvas.getContext("2d")
          ctx.drawImage(input, 0, 0)
        } else if (typeof input === "string" || input instanceof Buffer) {
          const img = await new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = input
          })
          canvas = new Canvas(img.width, img.height)
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0)
        }
        tex = new THREE.CanvasTexture(canvas)
      }
      return tex
    },

    async render({ scene, camera, width = 1024, height = 1024, path, format, colorSpace, clearColor, clearAlpha, premultiplyAlpha = false }) {
      const glCtx = createContext(width, height)
      const renderer = new THREE.WebGLRenderer({ context: glCtx })
      renderer.setSize(width, height)
      if (colorSpace) {
        renderer.outputColorSpace = colorSpace
      }
      if (clearColor !== undefined || clearAlpha !== undefined) {
        renderer.setClearColor(clearColor ?? 0x000000, clearAlpha ?? 0)
      }
      camera.projectionMatrix.elements[5] *= -1
      const gl = renderer.getContext()
      const currentFrontFace = gl.getParameter(gl.FRONT_FACE)
      gl.frontFace(currentFrontFace === gl.CCW ? gl.CW : gl.CCW)
      renderer.render(scene, camera)
      gl.frontFace(currentFrontFace)
      camera.projectionMatrix.elements[5] *= -1
      const pixels = new Uint8Array(width * height * 4)
      glCtx.readPixels(0, 0, width, height, glCtx.RGBA, glCtx.UNSIGNED_BYTE, pixels)
      renderer.dispose()
      glCtx.getExtension("STACKGL_destroy_context")?.destroy()
      let image = sharp(Buffer.from(pixels.buffer), { raw: { width, height, channels: 4, premultiplied: !premultiplyAlpha } })
      image = image[format ?? "png"]()
      const buffer = await image.toBuffer()
      if (path) await fs.promises.writeFile(path, buffer)
      return buffer
    }
  }
}
