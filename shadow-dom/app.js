import { CavalryPlayer } from '../CavalryPlayer.js'

class CavalryShadowPlayer extends HTMLElement {
	constructor() {
		super()
	}

	async connectedCallback() {
		const shadow = this.attachShadow({ mode: 'open' })
		const style = document.createElement('style')
		style.textContent = `
			:host {
				display: block;
				min-height: 500px;

				--brand-purple: #6437ff;
				--brand-green: #4ffd7a;
				--bg-base: #09090b;
				--bg-card: rgba(24, 24, 27, 0.8);
				--bg-elevated: rgba(39, 39, 42, 0.5);
				--border: rgba(63, 63, 70, 0.5);
				--border-hover: rgba(82, 82, 91, 0.8);
				--text-primary: #fafafa;
				--text-secondary: #a1a1aa;
				--text-muted: #71717a;
				--radius: 6px;
				--radius-sm: 4px;
			}

			#loading {
				position: absolute;
				inset: 0;
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				color: var(--text-secondary);
				font-size: 14px;
				font-weight: 500;
				gap: 16px;
				height: 500px;
				background: var(--bg-base);
				z-index: 10;
			}

			.loading-spinner {
				width: 32px;
				height: 32px;
				border: 2px solid var(--border);
				border-top-color: var(--brand-primary);
				border-radius: 50%;
				animation: spin 0.8s linear infinite;
			}
		`
		shadow.appendChild(style)

		const playerStyles = document.createElement('link')
		playerStyles.setAttribute('rel', 'stylesheet')
		playerStyles.setAttribute('href', '../cavalry-player.css')
		shadow.appendChild(playerStyles)

		const sharedStyles = document.createElement('link')
		sharedStyles.setAttribute('rel', 'stylesheet')
		sharedStyles.setAttribute('href', '../shared.css')
		shadow.appendChild(sharedStyles)

		const loader = document.createElement('div')
		loader.innerText = 'Loading Cavalry Player…'
		loader.id = 'loading'
		const spinner = document.createElement('div')
		spinner.className = 'loading-spinner'
		loader.prepend(spinner)
		shadow.appendChild(loader)

		const container = document.createElement('div')
		shadow.appendChild(container)

		const player = new CavalryPlayer(container, { autoplay: false })
		const response = await fetch('./Shadow DOM.cv')
		if (!response.ok) {
			throw new Error(`Failed to load scene "${response.statusText}"`)
		}
		const scene = await response.arrayBuffer()
		await player.loadScene(new Uint8Array(scene), 'Shadow DOM.cv')

		loader.remove()
	}
}

customElements.define('cavalry-shadow-player', CavalryShadowPlayer)
