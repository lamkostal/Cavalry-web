import { CavalryPlayer } from '../CavalryPlayer.js'

async function initialise() {
	const container = document.getElementById('player')
	try {
		if (!container) {
			throw new Error('Missing div element with id "player"')
		}
		const player = new CavalryPlayer(container, { sceneInput: false })
		const response = await fetch('./Over and Over.cv')
		if (!response.ok) {
			throw new Error(`Failed to load scene "${response.statusText}"`)
		}
		const scene = await response.arrayBuffer()
		await player.loadScene(new Uint8Array(scene), 'Over and Over.cv')

		const options = document.querySelectorAll('.bg-option')
		const viewport = document.querySelector('.player-container')
		viewport?.classList.add('gradient1')
		options.forEach((option) => {
			option.addEventListener('click', ({ target }) => {
				if (!viewport || !target) {
					return
				}
				options.forEach((opt) => opt.classList.remove('active'))
				target.classList.add('active')
				const className = target.dataset.bg
				viewport.className = `player-container ${className}`
			})
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
