import {
	loadWebCodecVideoAsset,
	setupWebCodecHooks,
} from './webcodec-helper.js'

import { CavalryPlayer } from '../CavalryPlayer.js'

class VideoPlayer extends CavalryPlayer {
	#hooksInstalled = false
	#assetId = 'asset#2'

	constructor(container, options) {
		super(container, options)
	}

	async prepareVideo() {
		if (!this.player) {
			throw new Error('Cannot prepare video before the scene is loaded.')
		}

		if (!this.#hooksInstalled) {
			setupWebCodecHooks(this)
			this.#hooksInstalled = true
		}

		this.disposeVideoAsset()

		await loadWebCodecVideoAsset(this, this.#assetId, './assets/demoVideo.mov')

		this.play()
	}

	disposeVideoAsset() {
		const assets = window._videoAssets
		if (!assets) {
			return
		}

		const asset = assets[this.#assetId]
		if (!asset) {
			return
		}

		try {
			if (asset.decoder?.state !== 'closed') {
				asset.decoder.close()
			}
		} catch (error) {
			console.warn('Failed to close previous decoder', error)
		}

		if (asset.ptr) {
			const frameBytes = asset.frameBytes || asset.width * asset.height * 4
			this.module.HEAPU8.fill(0, asset.ptr, asset.ptr + frameBytes)
			this.module._free(asset.ptr)
			asset.ptr = null
			asset.frameBytes = 0
		}

		if (asset.canvasCleanup) {
			try {
				asset.canvasCleanup()
			} catch (error) {
				console.warn('Failed to remove fallback canvas', error)
			}
		}

		asset.canvas = null
		asset.canvasCleanup = null
		asset.pendingPrefetch = null
		asset.prefillRequested = false
		asset.decodeQueue = []

		delete assets[this.#assetId]
		this.stop()
	}
}

async function initialise() {
	const container = document.getElementById('player')
	try {
		if (!container) {
			throw new Error('Missing div element with id "player"')
		}

		const player = new VideoPlayer(container, {
			sceneInput: false,
			autoplay: false,
		})
		const response = await fetch('./Video Asset.cv')
		if (!response.ok) {
			throw new Error(`Failed to load scene "${response.statusText}"`)
		}
		const scene = await response.arrayBuffer()
		await player.loadScene(new Uint8Array(scene), 'Video Asset.cv', './assets')
		await player.prepareVideo()

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
