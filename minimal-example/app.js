import { CavalryPlayer } from '../CavalryPlayer.js'
async function initialise() {
	const container = document.getElementById('player')
	try {
		if (!container) {
			throw new Error('Missing div element with id "player"')
		}
		const player = new CavalryPlayer(container)
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
