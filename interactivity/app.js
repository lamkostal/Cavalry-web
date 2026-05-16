import { CavalryPlayer } from '../CavalryPlayer.js'

class InteractivePlayer extends CavalryPlayer {
	constructor(parent, options) {
		super(parent, options)

		this.canvas.addEventListener('click', (event) => {
			this.handleMouseInteraction(event)
		})

		this.canvas.addEventListener('mousedown', (event) => {
			this.dragging = true
			this.handleMouseInteraction(event)
		})

		this.canvas.addEventListener('mousemove', (event) => {
			if (this.dragging) {
				this.handleMouseInteraction(event)
			}
		})

		this.canvas.addEventListener('mouseup', () => {
			this.dragging = false
		})

		this.canvas.addEventListener('mouseleave', () => {
			this.dragging = false
		})
	}

	getCanvasCoordinates(event) {
		const rect = this.canvas.getBoundingClientRect()
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top
		return { x: Math.round(x), y: Math.round(y) }
	}

	canvasToSceneCoordinates(canvasCoords) {
		if (!this.player) {
			return { x: 0, y: 0 }
		}
		const scene = this.player.getSceneResolution()
		const canvasWidth = this.canvas.width
		const canvasHeight = this.canvas.height
		// Convert canvas coordinates to scene coordinates
		const sceneX = (canvasCoords.x / canvasWidth) * scene.width
		const sceneY = (canvasCoords.y / canvasHeight) * scene.height
		// Convert to Cavalry's Cartesian coordinate system (center = 0,0)
		const cavalryX = sceneX - scene.width / 2
		// Flip Y axis for Cartesian
		const cavalryY = scene.height / 2 - sceneY
		return { x: cavalryX, y: cavalryY }
	}

	handleMouseInteraction(event) {
		if (!this.player) {
			return
		}
		const canvasCoords = this.getCanvasCoordinates(event)
		const cavalryCoords = this.canvasToSceneCoordinates(canvasCoords)
		this.player.setAttribute('null#4', 'position', [
			cavalryCoords.x,
			cavalryCoords.y,
		])
		this.render()

		document.getElementById('canvasCoords').textContent =
			`${canvasCoords.x}, ${canvasCoords.y}`
		document.getElementById('cavalryCoords').textContent =
			`${cavalryCoords.x.toFixed(1)}, ${cavalryCoords.y.toFixed(1)}`
		document.getElementById('falloffX').textContent = cavalryCoords.x.toFixed(1)
		document.getElementById('falloffY').textContent = cavalryCoords.y.toFixed(1)
	}
}

async function initialise() {
	const container = document.getElementById('player')
	try {
		if (!container) {
			throw new Error('Missing div element with id "player"')
		}

		const player = new InteractivePlayer(container, {
			sceneInput: false,
			autoplay: false,
		})
		const response = await fetch('./rig-control.cv')
		if (!response.ok) {
			throw new Error(`Failed to load scene "${response.statusText}"`)
		}
		const scene = await response.arrayBuffer()
		await player.loadScene(new Uint8Array(scene), 'rig-control.cv')

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
