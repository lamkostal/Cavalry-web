# Cavalry Web Player

The Cavalry Web Player can be used for playing and interacting with Cavalry Scenes in web browsers. This document provides a complete integration guide and API reference.

Please note this is a work in progress and the API is not yet finalised.

Scene files (.cv) should be saved to file version of 1.0.55 or newer which is supported in Cavalry 2.5.0.

Currently unsupported features:

- Audio (this does actually work, but the API is not yet finalised)
- The Particles beta feature does not support using mesh shapes as particles

Unsupported features:

- [Image Smart Folder](https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/assets-window/image-smart-folder/)
- [Audio Smart Folder](https://docs.cavalry.scenegroup.co/user-interface/menus/window-menu/assets-window/audio-smart-folder/)
- [JavaScript Layers](https://docs.cavalry.scenegroup.co/nodes/general/javascript-layers/)

## Table of Contents

- [Getting Started](#getting-started)
  - [Quick Start](#quick-start)
  - [Integration Example](#integration-example)
  - [Server Requirements](#server-requirements)
  - [File Size Optimisation](#file-size-optimisation)
  - [Browser Compatibility](#browser-compatibility)
  - [Multiplayer Functionality](#multiplayer-functionality)
  - [Shadow Dom](#shadow-dom)
- [Global Functions](#global-functions)
  - [makeWebGLSurface](#makewebglsurface)
  - [makeWebGLSurfaceFromElement](#makewebglsurfacefromelement)
  - [makeWebGLSurfaceFromOffscreenCanvas](#makewebglsurfacefromoffscreencanvas)
  - [loadFont](#loadfont)
  - [loadFontData](#loadfontdata)
- [Class: Cavalry](#class-cavalry)
  - [Make](#make)
  - [render](#render)
  - [getSceneResolution](#getsceneresolution)
  - [replaceImageAsset](#replaceimageasset)
  - [replaceCSVAsset](#replacecsvasset)
  - [replaceImageAssetData](#replaceimageassetdata)
  - [replaceCSVAssetData](#replacecsvassetdata)
  - [getActiveComp](#getactivecomp)
  - [getInConnection](#getinconnection)
  - [disconnect](#disconnect)
  - [setCompTimeMultiplier](#setcomptimemultiplier)
  - [setActiveComp](#setactivecomp)
  - [setAttributeViaStringify](#setattributeviastringify)
  - [setAttribute](#setattribute)
  - [getAttribute](#getattribute)
  - [getAttributeViaStringify](#getattributeviastringify)
  - [getAttributeName](#getattributename)
  - [getAttributeDefinition](#getattributedefinition)
  - [getControlCentreAttributes](#getcontrolcentreattributes)
  - [getFontAxisInfo](#getfontaxisinfo)
- [Playback](#playback)
  - [play](#play)
  - [stop](#stop)
  - [toggle](#toggle)
  - [isPlaying](#isplaying)
  - [tick](#tick)
  - [setFrame](#setframe)
  - [getFrame](#getframe)
  - [getStartFrame](#getstartframe)
  - [getEndFrame](#getendframe)
  - [getFPS](#getfps)
  - [getActualFPS](#getactualfps)
  - [setPlaybackMode](#setplaybackmode)
  - [getPlaybackMode](#getplaybackmode)
  - [setLoop](#setloop)
  - [isLooping](#islooping)
  - [incrementFrame](#incrementframe)
- [Data Types](#data-types)
  - [Resolution](#resolution)
  - [ColorRGBA](#colorrgba)
  - [Double2](#double2)
  - [Double3](#double3)
  - [FontAxisInfo](#fontaxisinfo)
  - [PlaybackStatus](#playbackstatus)
  - [PlaybackMode](#playbackmode)
- [Events and Callbacks](#events-and-callbacks)
  - [cavalryAutoLoadAsset](#cavalryautoloadasset)
- [WebCodec Methods](#webcodec-methods)
  - [setupWebCodecHooks](#setupwebcodechooks)
  - [loadWebCodecVideoAsset](#loadwebcodecvideoasset)
  - [fetchAndProcess](#fetchandprocess)
  - [loadWebCodecAudioAsset](#loadwebcodecaudioasset)
  - [recordCavalryToMp4](#recordcavalrytomp4)

---

## Getting Started

The Cavalry Web Player package includes these essential files:

- **`wasm-lib/CavalryWasm.wasm`** - Cavalry compiled to WebAssembly
- **`wasm-lib/CavalryWasm.js`** - JavaScript glue code and module exports
- **`wasm-lib/CavalryWasm.data`** - Embedded assets and resources
- **`wasm-lib/version.json`** - Build metadata

### Quick Start

1. Download or obtain the Cavalry Web Player package.
2. Unzip.
3. Start the included server:
   ```bash
   # macOS
   cd /path/to/cavalry-web-player
   # Windows
   cd \path\to\cavalry-web-player
   python3 serve.py
   ```
4. Open a browser window and load [localhost:8000](http://localhost:8000)
5. Try the 'Minimal Player' example, load a `.cv` scene file and use the playback controls.

### Cloudflare Python Worker

This repo includes a Cloudflare Python Worker configuration in `wrangler.jsonc`.

Install the Python Worker tooling:

```bash
uv sync
```

Generate Worker types for editor autocomplete:

```bash
uv run pywrangler types
```

Run locally with Wrangler:

```bash
uv run pywrangler dev
```

Deploy to Cloudflare:

```bash
uv run pywrangler deploy
```

The Worker serves static files from the repository root and routes `/api/*` requests through `src/entry.py`. Example endpoints:

```bash
curl http://localhost:8787/api/hello
curl --header "Content-Type: application/json" --request POST --data '{"name":"Python"}' http://localhost:8787/api/hello
curl http://localhost:8787/api/env
```

### Integration Example

```javascript
// Import the Cavalry module
const CavalryModule = await import('/cavalry-demos/wasm-lib/CavalryWasm.js')

// Initialise the module
const Module = await CavalryModule.default({
	locateFile: (path) => `/cavalry-demos/wasm-lib/${path}`,
	canvas: document.getElementById('canvas'),
})

// Load a scene file
Module.FS.writeFile('scene.cv', sceneData)
const app = Module.Cavalry.MakeWithPath('scene.cv')

// Set up rendering surface
const canvas = document.getElementById('canvas')
let surface = Module.makeWebGLSurfaceFromElement(canvas, 800, 600)

// Render current frame
app.render(surface)

// Start playback
app.play()

// Animation loop using requestAnimationFrame
let animationFrameId = null

function runPlaybackLoop() {
	const tick = (timestamp) => {
		if (!app.isPlaying()) return

		// tick() advances the frame based on elapsed time and renders
		const status = app.tick(surface, timestamp)

		// Optionally update UI when frame changes
		if (status.frameChanged) {
			console.log(`Frame: ${status.currentFrame}`)
		}

		animationFrameId = requestAnimationFrame(tick)
	}

	animationFrameId = requestAnimationFrame(tick)
}

runPlaybackLoop()

// To stop playback:
// app.stop();
// cancelAnimationFrame(animationFrameId);
```

### Server Requirements

For production deployment, ensure your server:

1. **Sets proper MIME types:**
   - `Content-Type: application/wasm` for `.wasm` files
   - `Content-Type: application/javascript` for `.js` files
     2 **Serves over HTTPS**

### File Size Optimisation

The Cavalry Web Player files are large due to the comprehensive feature set. For production:

- **Pre-compress** the `.wasm` file with gzip
- **Set** `Content-Encoding: gzip` header
- **Use a CDN** for better distribution
- Most servers automatically compress these files

### Browser Compatibility

**Requirements:**

- WebAssembly support
- WebGL 2.0
- Modern JavaScript (ES6 modules)

---

### Multiplayer Functionality

Multiple Cavalry Web Players can be used on the same page, simply add more than one of the CavPlayer modules to your page.

### Shadow Dom

Web Player supports usage inside a Shadow DOM, where the canvas element is hidden from the public DOM. This can be configured via `shadowHost` and Shadow DOM settings in your HTML.

### A note on Video Assets

We include a video demo which shows playing back video with the Web Player.

## Global Functions

---

### makeWebGLSurface

```ts
makeWebGLSurface(canvasId: string, width: number, height: number): SkSurface
```

Initialises a WebGL2 context and Skia surface using the specified canvas element.

**Parameters**:

- `canvasId`: ID of the canvas HTML element.
- `width`: Width of the rendering surface.
- `height`: Height of the rendering surface.

**Returns**: Skia `SkSurface` bound to the WebGL context.

**Example**:

```js
const surface = Module.makeWebGLSurface('canvas', 800, 600)
```

---

### makeWebGLSurfaceFromElement

```ts
makeWebGLSurfaceFromElement(canvas: emscripten::val, width: number, height: number): SkSurface
```

Initialises a WebGL2 context and Skia surface using the specified canvas element.

**Parameters**:

- `canvas`: The canvas HTML element.
- `width`: Width of the rendering surface.
- `height`: Height of the rendering surface.

**Returns**: Skia `SkSurface` bound to the WebGL context.

**Example**:

```js
// Recreate the WebGL surface with the new canvas dimensions.
this.surface = this.Module.makeWebGLSurfaceFromElement(
	this.canvas,
	this.canvas.width,
	this.canvas.height,
)
```

---

### makeWebGLSurfaceFromOffscreenCanvas

```ts
makeWebGLSurfaceFromOffscreenCanvas(offscreenCanvas: emscripten::val, width: number, height: number): SkSurface
```

Initialises a WebGL2 context and Skia surface using an OffscreenCanvas for offscreen rendering.

**Parameters**:

- `offscreenCanvas`: The OffscreenCanvas object for rendering.
- `width`: Width of the rendering surface.
- `height`: Height of the rendering surface.

**Returns**: Skia `SkSurface` bound to the WebGL context on the OffscreenCanvas.

**Example**:

```js
// Create an OffscreenCanvas for background rendering
const offscreenCanvas = new OffscreenCanvas(800, 600)
const surface = Module.makeWebGLSurfaceFromOffscreenCanvas(
	offscreenCanvas,
	800,
	600,
)
```

**Note**: This method is particularly useful for performing rendering operations in web workers or when you need to render without displaying directly to the DOM.

---

### loadFont

```ts
loadFont(path: string): void
```

Loads a font from the virtual file system and adds it to the runtime font registry.

**Parameters**:

- `path`: Path to the font file (e.g., `.ttf`) in the virtual file system.

**Example**:

```js
FS.writeFile('Montserrat.ttf', fontBytes)
Module.loadFont('Montserrat.ttf')
```

---

### loadFontData

```ts
loadFontData(url: string): void
```

**Description**  
Loads font data from a given URL and adds it to the internal font registry.

**Parameters**

- `url` (string): The URL from which the font data is fetched.

**Usage**

```javascript
// Example: Loading a font from a URL
player.loadFontData('path/to/font.ttf')
```

---

## Class: Cavalry

Create an instance using:

```js
const app = Module.Cavalry.Make()
```

---

### Make

```ts
Cavalry.Make(scenePath?: string): Cavalry
```

Constructs and returns a new instance of the `Cavalry` class.

**Parameters**:

- `scenePath` (optional): Path to the scene file in the virtual filesystem. Defaults to `"scene.cv"` for backward compatibility.

**Example**:

```js
// Load default scene.cv
const app = Module.Cavalry.Make()

// Load a specific scene file
const app = Module.Cavalry.Make('myAnimation.cv')
```

---

### render

```ts
app.render(surface: SkSurface): void
```

Renders the current frame to the specified WebGL Skia surface.

**Example**:

```js
app.render(surface)
```

---

### getSceneResolution

```ts
app.getSceneResolution(): Resolution
```

Retrieves the resolution of the current composition.

**Returns**: An object of type `Resolution`.

**Example**:

```js
const res = app.getSceneResolution()
console.log(res.width, res.height)
```

---

### replaceImageAsset

```ts
app.replaceImageAsset(imagePath: string, assetId: string): void
```

Replaces the image asset at `assetId` with the image from the given path.

**Example**:

```js
FS.writeFile('image.png', imageBytes)
app.replaceImageAsset('image.png', 'asset#2')
app.render(surface)
```

---

### replaceCSVAsset

```ts
app.replaceCSVAsset(csvPath: string, assetId: string): void
```

Replaces the image asset at `assetId` with the CSV from the given path.

Please note, the light and fast Web CSV Parser is rudimentary compared to the large and full-featured parser that ships with Cavalry itself. Custom delimiters and quotes are unsupported at this time. Please let us know if you're having issues with a CSV file.

**Example**:

```js
FS.writeFile('test.csv', imageBytes)
app.replaceCSVAsset('text.csv', 'asset#2')
app.render(surface)
```

---

### replaceImageAssetData

```ts
app.replaceImageAssetData( assetId: string,image: string): void
```

Replaces the image asset at `assetId` with the image from the assets folder.

**Example**:

```js
app.replaceCSVAsset('asset#2', 'test.png')
app.render(surface)
```

---

### replaceCSVAssetData

```ts
app.replaceCSVAssetData( assetId: string,csvData: string): void
```

Replaces the image asset at `assetId` with the CSV Data.

Please note, the light and fast Web CSV Parser is rudimentary compared to the large and full-featured parser that ships with Cavalry itself. Custom delimiters and quotes are unsupported at this time. Please let us know if you're having issues with a CSV file.

**Example**:

```js
app.replaceCSVAssetData('asset#2', 'test.csv')
app.render(surface)
```

---

### getActiveComp

```ts
app.getActiveComp(): string
```

Returns the ID of the currently active composition.

**Example**:

```js
const compId = app.getActiveComp()
```

---

### getInConnection

```ts
app.getInConnection((layerId:string, attrId:string): string
```

Returns the input connection to an Attribute. An empty string is returned if there's no input on the Attribute in question.
**Example**:

```js
var path = this.app.getInConnection('basicShape#2', 'scale')
```

---

### disconnect

```ts
disconnect(fromLayerId:string, fromAttrId:string, toLayerId:string, toAttrId:string)
```

Remove connections between attributes. This displays an empty string as a connection is removed.

**Example**:

```js
this.app.disconnect('basicShape#2', 'position', 'basicShape#2', 'scale')
var path = this.app.getInConnection('basicShape#2', 'scale')
console.log('Connection for Scale Attribute after disconnect is', path)
```

---

### setCompTimeMultiplier

```ts
app.setCompTimeMultiplier(multiplier: number): void
```

Sets the time multiplier for a Composition. Setting this to 2.0 will mean a Composition plays back twice as quickly.

**Example**:

```js
app.setCompTimeMultiplier(0.5)
```

---

### setActiveComp

```ts
app.setActiveComp(compId: string): void
```

Sets the active composition by ID. If the composition is not found, a warning is logged.

---

### setAttributeViaStringify

```ts
app.setAttributeViaStringify(layerId: string, jsonString: string): void
```

Sets one or more attributes on a layer by passing a stringified JSON object.

**Parameters**:

- `layerId`: ID of the layer to modify.
- `jsonString`: JSON string mapping attribute names to values.

**Example**:

```js
const color = JSON.stringify({ backgroundColor: { r: 255, g: 0, b: 128 } })
app.setAttributeViaStringify(app.getActiveComp(), color)
app.render(surface)
// Set PoD like so
const pbs = JSON.stringify({ playbackStep: 2 })
app.setAttributeViaStringify(app.getActiveComp(), pbs)
```

---

### setAttribute

```ts
app.setAttribute(layerId: string, attrId: string, value: any): void
```

Sets an attribute on a layer. The value type is automatically detected and converted to the appropriate C++ type.

**Parameters**:

- `layerId`: ID of the layer to modify.
- `attrId`: Attribute to modify.
- `value`: The value to set. Supported types:
  - **Numbers**: Automatically detected as `double`, `int`, or `enum` based on attribute type
  - **Strings**: For text and richText attributes
  - **Booleans**: For boolean attributes
  - **Arrays**: `[x, y]` for 2D vectors, `[x, y, z]` for 3D vectors, `[r, g, b]` or `[r, g, b, a]` for colours
  - **Objects**: `{x, y}` or `{x, y, z}` for vectors, `{r, g, b}` or `{r, g, b, a}` for colours

**Examples**:

```js
// Numbers (auto-detected as double, int, or enum based on attribute type)
app.setAttribute('textShape#1', 'fontSize', 24.5)
app.setAttribute('duplicator#1', 'count', 10)
app.setAttribute('dropdown#1', 'alignment', 2)

// Strings
app.setAttribute('textShape#1', 'text', 'Hello World!')

// Booleans
app.setAttribute('shape#1', 'visible', true)

// 2D vectors (array or object syntax)
app.setAttribute('shape#1', 'position', [100, 200])
app.setAttribute('shape#1', 'scale', { x: 1.5, y: 2.0 })

// 3D vectors (array or object syntax)
app.setAttribute('camera#1', 'position', [10, 20, 30])
app.setAttribute('transform#1', 'rotation', { x: 0, y: 45, z: 0 })

// Colours (array or object syntax, values 0-255)
app.setAttribute('shape#1', 'fillColor', [255, 0, 0, 255])
app.setAttribute('shape#1', 'material.materialColor', {
	r: 128,
	g: 64,
	b: 255,
	a: 255,
})

// Composition background colour
app.setAttribute(app.getActiveComp(), 'backgroundColor', {
	r: 30,
	g: 30,
	b: 30,
})
```

---

### getAttribute

```ts
app.getAttribute(layerId: string, attrId: string): any
```

Gets an attribute value from a layer. The return type depends on the attribute type.

**Parameters**:

- `layerId`: ID of the layer to query.
- `attrId`: Attribute to retrieve.

**Returns**: The attribute value. Return types:

- **double/int/enum**: `number`
- **bool**: `boolean`
- **string/richText**: `string`
- **double2/int2**: `[x, y]` array
- **double3/int3**: `[x, y, z]` array
- **color**: `{r, g, b, a}` object with values 0-255

**Examples**:

```js
// Numbers
const fontSize = app.getAttribute('textShape#1', 'fontSize')
const count = app.getAttribute('duplicator#1', 'count')

// Strings
const text = app.getAttribute('textShape#1', 'text')

// Booleans
const isVisible = app.getAttribute('shape#1', 'visible')

// 2D vectors (returns array)
const position = app.getAttribute('shape#1', 'position')
console.log(`Position: ${position[0]}, ${position[1]}`)

// 3D vectors (returns array)
const rotation = app.getAttribute('transform#1', 'rotation')
console.log(`Rotation: ${rotation[0]}, ${rotation[1]}, ${rotation[2]}`)

// Colours (returns object)
const color = app.getAttribute('shape#1', 'material.materialColor')
console.log(`Color: R=${color.r}, G=${color.g}, B=${color.b}, A=${color.a}`)

// Convert colour to CSS hex
const hex =
	'#' +
	[color.r, color.g, color.b]
		.map((x) => x.toString(16).padStart(2, '0'))
		.join('')
```

---

### getAttributeViaStringify

```ts
app.getAttributeViaStringify(layerId: string, attrId: string): string
```

Gets any attribute value as a JSON string. This is a fallback method for complex attribute types that don't have specific getters.

**Parameters**:

- `layerId`: ID of the layer to query.
- `attrId`: Attribute to retrieve.

**Returns**: JSON string representation of the attribute value.

**Example**:

```js
const jsonString = app.getAttributeViaStringify('basicShape#1', 'customData')
const data = JSON.parse(jsonString)
```

---

### getAttributeName

```ts
app.getAttributeName(layerId: string, attrId: string): string
```

Gets the name of an Attribute. Attribute names can be set in Cavalry by right-clicking on an Attribute in the Attribute Editor and selecting "Rename...".

**Parameters**:

- `layerId`: ID of the layer to query.
- `attrId`: Attribute to retrieve.

**Returns**: The name of the attribute or the attribute id.

**Example**:

```js
const name = app.getAttributeName('basicShape#1', 'position')
```

---

### getAttributeDefinition

```ts
app.getAttributeDefinition(layerId: string, attrId: string): AttributeDefinition
```

Gets detailed metadata about an attribute including its type, constraints, default values, and structure. This is particularly useful for building dynamic user interfaces that need to understand attribute characteristics.

**Parameters**:

- `layerId`: ID of the layer to query.
- `attrId`: Attribute to inspect.

**Returns**: An `AttributeDefinition` object containing comprehensive attribute metadata.

**Example**:

```js
// Get definition for a numeric attribute with constraints
const sizeDef = app.getAttributeDefinition('pixelateFilter#1', 'size')
console.log(`Type: ${sizeDef.type}`)
console.log(`Default: ${sizeDef.defaultValue}`)
console.log(
	`Min: ${sizeDef.numericInfo.hardMin}, Max: ${sizeDef.numericInfo.hardMax}`,
)

// Use definition to create appropriate UI
if (
	sizeDef.type === 'int' &&
	sizeDef.numericInfo.hasHardMin &&
	sizeDef.numericInfo.hasHardMax
) {
	// Create slider with proper min/max values
	const slider = document.createElement('input')
	slider.type = 'range'
	slider.min = sizeDef.numericInfo.hardMin
	slider.max = sizeDef.numericInfo.hardMax
	slider.value = JSON.parse(sizeDef.defaultValue)
}
```

**AttributeDefinition Properties**:

```ts
interface AttributeDefinition {
	attrId: string // Attribute id
	type: string // Data type (int, double, bool, string, Color, etc.)
	prefix: string // UI prefix text (e.g X, or R)
	placeholder: string // UI placeholder text for string attributes
	defaultValue: string // JSON-serialized default value
	isArray: boolean // Whether this is an array attribute
	isCompound: boolean // Whether this has child attributes
	isDynamic: boolean // Whether this is dynamically created
	isAttrReadOnly: boolean // Whether this is read-only
	allowsConstrainProportions: boolean // Whether proportions can be constrained
	multiline: boolean // Whether text should be multiline
	numericInfo: NumericInfo // Numeric constraint information
	enumValues: number[] // Enum option values
	children: AttributeDefinition[] // Child attribute definitions
}

interface NumericInfo {
	hardMin: number // Hard minimum constraint
	hardMax: number // Hard maximum constraint
	softMin: number // Soft minimum constraint
	softMax: number // Soft maximum constraint
	step: number // Step increment
	hasHardMin: boolean // Whether hardMin is set
	hasHardMax: boolean // Whether hardMax is set
	hasSoftMin: boolean // Whether softMin is set
	hasSoftMax: boolean // Whether softMax is set
	hasStep: boolean // Whether step is set
}
```

---

### getControlCentreAttributes

```ts
app.getControlCentreAttributes(compId: string): string[]
```

Gets a list of all Control Centre Attribute paths for a given Composition.

**Parameters**:

- `compId`: ID of the composition to query (typically obtained from `getActiveComp()`).

**Returns**: Array of strings representing attribute paths in the format `"layerId.attributeId"`.

**Example**:

```js
// Get active composition and its control centre attributes
const activeComp = app.getActiveComp()
const ccAttributes = app.getControlCentreAttributes(activeComp)

console.log('Control Centre Attributes:', ccAttributes)
// Output example: ["pixelateFilter#1.size", "pixelateFilter#1.outline", "pixelateFilter#1.borderColor"]

// Generate dynamic UI for each Attribute
ccAttributes.forEach((attrPath) => {
	const [layerId, attrId] = attrPath.split('.')

	// Get attribute definition to determine UI type
	const definition = app.getAttributeDefinition(layerId, attrId)

	// Create appropriate control based on type
	switch (definition.type) {
		case 'int':
			// Create integer input or slider
			break
		case 'bool':
			// Create checkbox
			break
		case 'Color':
			// Create color picker
			break
		// ... handle other types
	}
})
```

---

### getFontAxisInfo

```ts
app.getFontAxisInfo(fontName: string, fontStyle: string): FontAxisInfo[]
```

Retrieves variable font axis information for a given font. Variable fonts contain adjustable axes (such as weight, width, slant) that allow fine-grained control over the font's appearance. This method returns metadata about each available axis including its name, tag, range, and current value.

**Parameters**:

- `fontName`: The name of the font family (e.g., "Roboto", "Inter").
- `fontStyle`: The style of the font (e.g., "Regular", "Bold").

**Returns**: An array of `FontAxisInfo` objects, one for each variable font axis. Returns an empty array if the font is not a variable font or has no axes.

**FontAxisInfo Properties**:

```ts
interface FontAxisInfo {
	axisName: string // Human-readable name (e.g., "Weight", "Width")
	axisTag: string // Four-character axis tag (e.g., "wght", "wdth")
	minValue: number // Minimum allowed value for this axis
	maxValue: number // Maximum allowed value for this axis
	defaultValue: number // Default value for this axis
	currentValue: number // Current value for this axis
}
```

**Example**:

```js
// Query available fonts and their styles
const fonts = app.queryFonts()
const styles = app.getFontStyles(fonts[0])

// Get axis information for a variable font
const axisInfo = app.getFontAxisInfo('Roboto Flex', 'Regular')

if (axisInfo.length > 0) {
	console.log(`Font has ${axisInfo.length} variable axes:`)

	axisInfo.forEach((axis) => {
		console.log(`  ${axis.axisName} (${axis.axisTag}):`)
		console.log(`    Range: ${axis.minValue} - ${axis.maxValue}`)
		console.log(`    Default: ${axis.defaultValue}`)
		console.log(`    Current: ${axis.currentValue}`)
	})

	// Example: Create sliders for each axis
	axisInfo.forEach((axis) => {
		const slider = document.createElement('input')
		slider.type = 'range'
		slider.min = axis.minValue
		slider.max = axis.maxValue
		slider.value = axis.currentValue
		slider.addEventListener('input', (e) => {
			// Update font axis value when slider changes
			console.log(`${axis.axisName} set to ${e.target.value}`)
		})
	})
} else {
	console.log('This font has no variable axes (not a variable font)')
}
```

---

## Playback

The Web Player provides a native playback manager that handles frame timing and rendering. This simplifies integration by moving timing logic from JavaScript into the WASM layer.

### Playback Modes

Two playback modes are available:

- **Accurate** (default): Wall-clock based timing that skips frames to maintain correct timing. Best for audio synchronisation and real-time playback.
- **Smooth**: Shows every frame in sequence, but may run slower than real-time on complex scenes. Best for frame-accurate preview.

### Basic Playback Pattern

```javascript
// Start playback
app.play()

// Run the playback loop
function runPlaybackLoop() {
	const tick = (timestamp) => {
		if (!app.isPlaying()) return

		const status = app.tick(surface, timestamp)

		if (status.frameChanged) {
			// Update UI if needed
		}

		requestAnimationFrame(tick)
	}
	requestAnimationFrame(tick)
}

runPlaybackLoop()

// Stop playback
app.stop()
```

---

### play

```ts
app.play(): void
```

Starts playback from the current frame position. Call this before starting your `requestAnimationFrame` loop.

**Example**:

```js
app.play()
runPlaybackLoop()
```

---

### stop

```ts
app.stop(): void
```

Stops playback. The current frame position is preserved, so calling `play()` again will resume from where playback stopped.

**Example**:

```js
app.stop()
cancelAnimationFrame(animationFrameId)
```

---

### toggle

```ts
app.toggle(): void
```

Toggles playback state. If playing, stops playback. If stopped, starts playback.

**Example**:

```js
app.toggle()
playButton.textContent = app.isPlaying() ? 'Stop' : 'Play'
```

---

### isPlaying

```ts
app.isPlaying(): boolean
```

Returns whether playback is currently active.

**Example**:

```js
if (app.isPlaying()) {
	console.log('Playback is running')
}
```

---

### tick

```ts
app.tick(surface: SkSurface, timestampMs: number): PlaybackStatus
```

Advances playback based on elapsed time and renders the current frame. This should be called from your `requestAnimationFrame` callback.

**Parameters**:

- `surface`: The Skia surface to render to.
- `timestampMs`: The timestamp from `requestAnimationFrame` (DOMHighResTimeStamp).

**Returns**: A `PlaybackStatus` object containing the current playback state.

**Example**:

```js
const tick = (timestamp) => {
	if (!app.isPlaying()) return

	const status = app.tick(surface, timestamp)

	if (status.frameChanged) {
		frameDisplay.textContent = `Frame: ${status.currentFrame}`
	}

	requestAnimationFrame(tick)
}
```

---

### setFrame

```ts
app.setFrame(frame: number): void
```

Sets the current frame. The frame number is clamped to the valid playback range (between `getStartFrame()` and `getEndFrame()`).

**Note**: If playback is running, you should stop playback before setting the frame, then optionally restart it.

**Example**:

```js
// Seek to a specific frame
const wasPlaying = app.isPlaying()
app.stop()
app.setFrame(50)
app.render(surface)
if (wasPlaying) {
	app.play()
	runPlaybackLoop()
}
```

---

### getFrame

```ts
app.getFrame(): number
```

Returns the current frame number.

**Example**:

```js
const currentFrame = app.getFrame()
console.log(`Current frame: ${currentFrame}`)
```

---

### getStartFrame

```ts
app.getStartFrame(): number
```

Returns the starting frame of the current composition's playback range.

**Example**:

```js
const startFrame = app.getStartFrame()
frameSlider.min = startFrame
```

---

### getEndFrame

```ts
app.getEndFrame(): number
```

Returns the ending frame of the current composition's playback range.

**Example**:

```js
const endFrame = app.getEndFrame()
frameSlider.max = endFrame
```

---

### getFPS

```ts
app.getFPS(): number
```

Returns the frames per second (FPS) of the current composition.

**Example**:

```js
const fps = app.getFPS()
console.log(`Scene runs at ${fps} FPS`)
```

---

### getActualFPS

```ts
app.getActualFPS(): number
```

Returns the measured playback FPS during active playback. This is calculated over a 1-second window and can be used to monitor playback performance.

**Example**:

```js
const actualFps = app.getActualFPS()
fpsDisplay.textContent = `${actualFps.toFixed(1)} FPS`
```

---

### setPlaybackMode

```ts
app.setPlaybackMode(mode: number): void
```

Sets the playback mode.

**Parameters**:

- `mode`: `0` for Accurate mode (default), `1` for Smooth mode.

**Example**:

```js
// Use Smooth mode for frame-accurate preview
app.setPlaybackMode(1)

// Use Accurate mode for real-time playback
app.setPlaybackMode(0)
```

---

### getPlaybackMode

```ts
app.getPlaybackMode(): number
```

Returns the current playback mode. `0` = Accurate, `1` = Smooth.

**Example**:

```js
const mode = app.getPlaybackMode()
console.log(mode === 0 ? 'Accurate' : 'Smooth')
```

---

### setLoop

```ts
app.setLoop(loop: boolean): void
```

Sets whether playback should loop when reaching the end frame.

**Parameters**:

- `loop`: `true` to enable looping (default), `false` to stop at the end.

**Example**:

```js
// Disable looping - playback will stop at end frame
app.setLoop(false)
```

---

### isLooping

```ts
app.isLooping(): boolean
```

Returns whether playback looping is enabled.

**Example**:

```js
if (app.isLooping()) {
	console.log('Playback will loop')
}
```

---

### incrementFrame

```ts
app.incrementFrame(): void
```

Manually advances to the next frame. This is a low-level method for manual frame control - for most use cases, use `tick()` instead which handles timing automatically.

**Example**:

```js
// Manual frame stepping (not recommended for playback)
app.incrementFrame()
app.render(surface)
```

---

## Data Types

### Resolution

```ts
interface Resolution {
	width: number
	height: number
}
```

Represents scene or canvas resolution.

---

### ColorRGBA

```ts
interface ColorRGBA {
	r: number // Red component (0-255)
	g: number // Green component (0-255)
	b: number // Blue component (0-255)
	a: number // Alpha component (0-255)
}
```

Represents an RGBA colour value with components in the 0-255 range. Returned by `getAttribute()` for colour attributes.

**Example**:

```js
const color = app.getAttribute('shape#1', 'fillColor')
// Convert to CSS hex colour
const hex =
	'#' +
	[color.r, color.g, color.b]
		.map((x) => x.toString(16).padStart(2, '0'))
		.join('')

// Set a colour using an object
app.setAttribute('shape#1', 'fillColor', { r: 255, g: 128, b: 0, a: 255 })
```

---

### Double2

```ts
interface Double2 {
	x: number // X component
	y: number // Y component
}
```

Represents a 2D vector with double precision values. Note that `getAttribute()` returns 2D vectors as arrays `[x, y]` for convenience.

**Example**:

```js
// getAttribute returns an array [x, y]
const position = app.getAttribute('shape#1', 'position')
console.log(`Position: (${position[0]}, ${position[1]})`)

// Set a new position using array syntax
app.setAttribute('shape#1', 'position', [position[0] + 10, position[1] + 20])

// Or use object syntax
app.setAttribute('shape#1', 'position', { x: 100, y: 200 })
```

---

### Double3

```ts
interface Double3 {
	x: number // X component
	y: number // Y component
	z: number // Z component
}
```

Represents a 3D vector with double precision values. Note that `getAttribute()` returns 3D vectors as arrays `[x, y, z]` for convenience.

**Example**:

```js
// getAttribute returns an array [x, y, z]
const cameraPos = app.getAttribute('camera#1', 'position')
console.log(`Camera at: (${cameraPos[0]}, ${cameraPos[1]}, ${cameraPos[2]})`)

// Set camera position using array syntax
app.setAttribute('camera#1', 'position', [
	cameraPos[0],
	cameraPos[1],
	cameraPos[2] + 100,
])

// Or use object syntax
app.setAttribute('camera#1', 'position', { x: 10, y: 20, z: 30 })
```

---

### FontAxisInfo

```ts
interface FontAxisInfo {
	axisName: string // Human-readable name (e.g., "Weight", "Width")
	axisTag: string // Four-character axis tag (e.g., "wght", "wdth")
	minValue: number // Minimum allowed value for this axis
	maxValue: number // Maximum allowed value for this axis
	defaultValue: number // Default value for this axis
	currentValue: number // Current value for this axis
}
```

Represents information about a variable font axis. Variable fonts can have multiple axes that allow fine-grained control over the font's appearance. Common axes include weight (wght), width (wdth), slant (slnt), and optical size (opsz).

**Example**:

```js
// Get variable font axis information
const axisInfo = app.getFontAxisInfo('Inter', 'Regular')

// Display information about each axis
axisInfo.forEach((axis) => {
	console.log(`${axis.axisName} (${axis.axisTag})`)
	console.log(`  Range: ${axis.minValue} to ${axis.maxValue}`)
	console.log(`  Default: ${axis.defaultValue}`)
	console.log(`  Current: ${axis.currentValue}`)
})

// Create UI controls for adjusting font axes
const controls = axisInfo.map((axis) => ({
	name: axis.axisName,
	min: axis.minValue,
	max: axis.maxValue,
	value: axis.currentValue,
}))
```

---

### PlaybackStatus

```ts
interface PlaybackStatus {
	isPlaying: boolean // Whether playback is currently active
	currentFrame: number // The current frame number
	frameChanged: boolean // Whether the frame changed since the last tick
	actualFPS: number // Measured playback FPS
}
```

Returned by `tick()` to provide information about the current playback state. Use `frameChanged` to determine when to update UI elements.

**Example**:

```js
const status = app.tick(surface, timestamp)

if (status.frameChanged) {
	frameSlider.value = status.currentFrame
	frameDisplay.textContent = `Frame: ${status.currentFrame}`
}

if (status.actualFPS > 0) {
	fpsDisplay.textContent = `${status.actualFPS.toFixed(1)} FPS`
}
```

---

### PlaybackMode

```ts
enum PlaybackMode {
	Accurate = 0, // Wall-clock based, skips frames to maintain timing
	Smooth = 1, // Shows every frame, may run slow
}
```

Defines how the playback manager advances frames:

- **Accurate (0)**: Calculates the correct frame based on elapsed wall-clock time. If rendering is slow, frames will be skipped to maintain correct timing. Best for audio synchronisation.
- **Smooth (1)**: Advances exactly one frame at a time when sufficient time has elapsed. Never skips frames, but playback may run slower than real-time on complex scenes.

**Example**:

```js
// Check current mode
const mode = app.getPlaybackMode()

// Set to Smooth mode for frame-by-frame preview
app.setPlaybackMode(1)

// Set to Accurate mode for real-time playback
app.setPlaybackMode(0)
```

---

## Events and Callbacks

The Cavalry Web Player automatically dispatches events for certain asset-related operations. These events allow you to handle automatic asset loading and other integration scenarios.

### cavalryAutoLoadAsset

**Event Type**: `CustomEvent`

Automatically dispatched when the Cavalry Web Player detects image or font assets in a scene file that need to be loaded from the web server into the virtual filesystem.

**Event Detail**:

```ts
interface CavalryAutoLoadAssetDetail {
	type: 'image' | 'font' // Asset type ('image' or 'font')
	assetId: string // Asset ID from the scene file (e.g., "asset#2")
	filename: string // Extracted filename (e.g., "3.jpg" or "font.ttf")
}
```

**Usage**:

```javascript
// Listen for automatic asset loading events
window.addEventListener('cavalryAutoLoadAsset', async (event) => {
	console.log('Auto-loading asset:', event.detail)

	if (event.detail.type === 'image') {
		const { assetId, filename } = event.detail

		// Try to fetch from root directory first
		let response = await fetch('./' + filename)

		if (!response.ok) {
			// Try Assets/ subdirectory
			response = await fetch('./Assets/' + filename)
		}

		if (response.ok) {
			const imageData = await response.arrayBuffer()

			// Write to virtual filesystem
			Module.FS.writeFile(filename, new Uint8Array(imageData))

			// Load the asset
			app.replaceImageAsset(filename, assetId)
			app.render(surface) // Re-render to show the image

			console.log(`Auto-loaded image: ${filename} for ${assetId}`)
		} else {
			console.warn(`Could not find image: ${filename}`)
		}
	} else if (event.detail.type === 'font') {
		const { assetId, filename } = event.detail

		// Try to fetch font from root directory
		let response = await fetch('./' + filename)

		if (response.ok) {
			const fontData = await response.arrayBuffer()

			// Write to virtual filesystem
			Module.FS.writeFile(filename, new Uint8Array(fontData))

			// Load the font into the font registry
			Module.loadFont(filename)
			app.render(surface) // Re-render to show font changes

			console.log(`Auto-loaded font: ${filename} for ${assetId}`)
		} else {
			console.warn(`Could not find font: ${filename}`)
		}
	}
})
```

**How it Works**:

1. When a Cavalry scene (.cv file) is loaded, the Web Player scans for asset definitions
2. File assets with `"type": "file"` and supported extensions trigger this event:
   - **Image files**: png, jpg, jpeg, exr, webp
   - **Font files**: ttf, otf, woff, woff2
3. The event provides the asset ID and extracted filename for your application to handle
4. Your event handler should fetch the file from your web server and write it to the virtual filesystem
5. Then call the appropriate API to load the asset:
   - Images: `replaceImageAsset(filename, assetId)`
   - Fonts: `Module.loadFont(filename)`

**Automatic Loading**:

- **Google Sheets assets** are handled automatically and don't require this event
- **Image and font assets** require JavaScript handling because they need to be fetched from the web server

**File Path Resolution**:
The Web Player extracts filenames from Cavalry's internal paths, e.g:

- `"@assets/image.jpg"` → `"image.jpg"`
- `"@assets/Changa_One/ChangaOne-Regular.ttf"` → `"ChangaOne-Regular.ttf"`
- `"subfolder/font.ttf"` → `"font.ttf"`

Your event handler should try common locations like root directory (`./filename`) and Assets folder (`./Assets/filename`).

**Example Implementations**:

- **Image loading**: See the Image Asset demo in `src/wasm/cavalry-web-player/image-asset/`
- **Font loading**: See the Custom Font demo in `src/wasm/cavalry-web-player/custom-font/`

---

## WebCodec Methods

### setupWebCodecHooks

```ts
setupWebCodecHooks(player: Object): void
```

Sets up necessary hooks for WebCodec to decode and prefetch video frames. This method is critical for handling video playback and synchronizing with the Web Player internals via `prefetchFrames` hook.

**Parameters**

- `player` (Object): The main player object containing WebAssembly interface and app hooks.

**Usage**

```javascript
// Example: Setting up WebCodec hooks for video decoding
setupWebCodecHooks(player)
```

---

### loadWebCodecVideoAsset

```ts
loadWebCodecVideoAsset(player: Object, assetId: string, videoUrl: string): Promise<void>
```

Loads and decodes a video asset using WebCodecs and mp4box.js, providing the decoded video frames to the application for playback.

**Parameters**

- `player` (Object): The main player object containing WebAssembly interface and app hooks.
- `assetId` (string): A unique identifier for the video asset.
- `videoUrl` (string): The URL of the video to be loaded and decoded.

**Usage**

```javascript
// Example: Loading a video asset
await loadWebCodecVideoAsset(player, 'asset#1', 'video.mp4')
```

---

### fetchAndProcess

Fetches and processes a ZIP file, extracting its contents and creating an image sequence asset in the player.

```ts
fetchAndProcess(zipUrl: string): Promise<void>
```

**Parameters**

- `zipUrl` (string): The URL of the ZIP file to fetch and process.

**Usage**

```javascript
// Example: Fetching and processing a ZIP file for image sequences
await player.fetchAndProcess('/assets/ImageSequence.zip')
```

---

### loadWebCodecAudioAsset

```ts
loadWebCodecAudioAsset(player: Object, assetId: string, audioUrl: string, startFrameIndex: number): Promise<void>
```

Loads and decodes an audio asset using WebCodecs or WebAudio API, providing decoded audio frames for playback. It can start from a specific frame.

**Parameters**

- `player` (Object): The main player object containing WebAssembly interface and app hooks.
- `assetId` (string): A unique identifier for the audio asset.
- `audioUrl` (string): The URL of the audio file to be loaded and decoded.
- `startFrameIndex` (number): The frame index where the audio playback should start.

**Usage**

```javascript
// Example: Loading an audio asset
await loadWebCodecAudioAsset(player, 'audio#1', 'audiofile.mp3', 0)
```

---

### recordCavalryToMp4

```ts
recordCavalryToMp4(player: Object, audioAssetId: string, startFrame: number, endFrame: number): Promise<void>
```

Records a portion of the scene to an MP4 file, capturing both video and audio, if available. The frames and audio are processed and combined into an MP4 file.

**Parameters**

- `player` (Object): The main player object containing WebAssembly interface and app hooks.
- `audioAssetId` (string): The identifier for the audio asset to be included in the recording.
- `startFrame` (number): The starting frame of the recording.
- `endFrame` (number): The ending frame of the recording.

**Usage**

```javascript
// Example: Recording from frame 50 to 200
await recordCavalryToMp4(player, 'audio#1', 50, 200)
```

---
