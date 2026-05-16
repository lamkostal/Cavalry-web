const wasm = await import('../wasm-lib/CavalryWasm.js')
const Module = await wasm.default({
	locateFile: (path) => `../wasm-lib/${path}`,
	print: (text) => console.log(text),
	printErr: (text) => console.error(text),
})

const response = await fetch('scene.cv')
const sceneData = await response.arrayBuffer()
Module.FS.writeFile('scene.cv', new Uint8Array(sceneData))

const player = Module.Cavalry.MakeWithPath('scene.cv')
const scene = player.getSceneResolution()
const canvas = document.getElementById('canvas')
canvas.width = scene.width
canvas.height = scene.height
const surface = Module.makeWebGLSurfaceFromElement(
	canvas,
	scene.width,
	scene.height,
)
player.render(surface)

let animationFrameId = 0
const runPlaybackLoop = () => {
	const tick = (timestamp) => {
		player.tick(surface, timestamp)
		animationFrameId = requestAnimationFrame(tick)
	}
	animationFrameId = requestAnimationFrame(tick)
}

runPlaybackLoop()
player.play()
