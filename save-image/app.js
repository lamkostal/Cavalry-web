import { CavalryPlayer } from '../CavalryPlayer.js'

class SaveImagePlayer extends CavalryPlayer {
	constructor(container, options) {
		super(container, options)
	}

	saveFullSizeImage(type) {
		if (!this.player) {
			throw new Error('Player not initialised')
		}

		const scene = this.player.getSceneResolution()
		const canvas = document.createElement('canvas')
		canvas.width = scene.width
		canvas.height = scene.height
		canvas.style.position = 'absolute'
		canvas.style.left = '-99999px'
		document.body.appendChild(canvas)
		const tempSurface = this.module.makeWebGLSurfaceFromElement(
			canvas,
			canvas.width,
			canvas.height,
		)
		this.player.render(tempSurface)

		const download = (blob) => {
			const fileName = `cavalry-export.${type}`
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = fileName
			link.click()
			link.remove()
			URL.revokeObjectURL(url)
			console.log(`Downloaded ${fileName} (${scene.width}x${scene.height})`)
		}
		const quality = type === 'jpeg' ? 0.95 : 1.0
		canvas.toBlob(download, `image/${type}`, quality)
		canvas.remove()

		this.render()
	}
}

async function initialise() {
	const container = document.getElementById('player')
	try {
		if (!container) {
			throw new Error('Missing div element with id "player"')
		}
		const player = new SaveImagePlayer(container, { autoplay: false })
		const response = await fetch('./Export Image.cv')
		if (!response.ok) {
			throw new Error(`Failed to load scene "${response.statusText}"`)
		}
		const scene = await response.arrayBuffer()
		await player.loadScene(new Uint8Array(scene), 'Export Image.cv')
		player.setEditableAttributes([
			'basicShape#5.material.materialColor',
			'random#1.seed',
		])

		const form = document.getElementById('saveImage')
		form?.addEventListener('submit', (event) => {
			event.preventDefault()
			const data = new FormData(event.target)
			player.saveFullSizeImage(data.get('type'))
		})

		document.getElementById('loading')?.remove()
	} catch (error) {
		console.error(error)
		const div = document.createElement('div')
		div.className = 'player-error'
		if (error.message) {
			div.innerText = `Error "${error.message}". See the console for details.`
		} else {
			div.innerText = `Something went wrong. See the console for details.`
		}
		document.getElementById('loading')?.remove()
		container?.appendChild(div)
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initialise)
} else {
	initialise()
}
