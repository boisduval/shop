import { createScopedThreejs } from 'threejs-miniprogram'

let THREE;

// Configuration constants
const WALL_HEIGHT = 2.5; // meters
const WALL_THICKNESS = 0.15; // meters
const DOOR_HEIGHT = 2.0; // meters
const CABINET_HEIGHT = 2.0; // meters
const SCALE_FACTOR = 10.0; // 10 pixels = 1 meter, matching web version exactly

// Active references for cleanup
let activeCamera = null;
let activeRenderer = null;
let activeScene = null;
let animationFrameId = null;
let appBaseUrl = '';

// Helper to resolve H5 asset paths relative to origin, and Mini Program paths relative to current route depth
function resolveAssetUrl(path) {
	if (appBaseUrl) {
		return appBaseUrl + path;
	}
	
	// Mini Program Platform: dynamically calculate route depth to construct relative prefix (real devices fallback)
	const getPages = (typeof getCurrentPages === 'function') ? getCurrentPages : (typeof wx !== 'undefined' ? wx.getCurrentPages : null);
	if (getPages) {
		try {
			const pages = getPages();
			if (pages && pages.length > 0) {
				const route = pages[pages.length - 1].route || '';
				const slashCount = (route.match(/\//g) || []).length;
				let prefix = '';
				
				// Detect if we are in WeChat Developer Tools simulator
				let isDevTools = false;
				const globalObj = typeof uni !== 'undefined' ? uni : (typeof wx !== 'undefined' ? wx : null);
				if (globalObj && globalObj.getSystemInfoSync) {
					try {
						const sysInfo = globalObj.getSystemInfoSync();
						isDevTools = sysInfo.platform === 'devtools';
					} catch (e) {}
				}
				
				// WeChat simulator wraps pages in __pageframe__ path segment, requiring an extra parent level (+1) to reach root
				const levels = isDevTools ? (slashCount + 1) : slashCount;
				for (let i = 0; i < levels; i++) {
					prefix += '../';
				}
				// Remove the leading slash of the path to concatenate correctly
				const cleanPath = path.startsWith('/') ? path.slice(1) : path;
				return prefix + cleanPath;
			}
		} catch (e) {
			console.warn('Failed to resolve relative path via route:', e);
		}
	}
	
	// Fallback
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return '../../' + cleanPath;
}




// WeChat FileSystemManager Base64 texture loader to bypass network and dev server relative path bugs
function loadTextureWithFallback(loader, path, onSuccess, onError) {
	const resolvedUrl = resolveAssetUrl(path);
	const globalObj = typeof uni !== 'undefined' ? uni : (typeof wx !== 'undefined' ? wx : null);
	
	if (globalObj && globalObj.getImageInfo) {
		globalObj.getImageInfo({
			src: resolvedUrl, // Pass the resolved relative path to ensure cross-platform compatibility
			success: (res) => {
				let finalPath = res.path;
				// If Android returns a relative path (e.g. static/...), convert it to route-relative path (../../static/...)
				if (finalPath && !finalPath.includes('://') && !finalPath.startsWith('data:')) {
					const normalized = finalPath.startsWith('/') ? finalPath : '/' + finalPath;
					finalPath = resolveAssetUrl(normalized);
				}
				loader.load(finalPath, onSuccess, undefined, onError);
			},
			fail: (err) => {
				loader.load(resolvedUrl, onSuccess, undefined, onError);
			}
		});
		return;
	}
	
	loader.load(resolvedUrl, onSuccess, undefined, onError);
}


let theta = Math.PI / 4; 
let phi = Math.PI / 4;   
let radius = 35; // Adjusted to match web version's camera distance (sqrt(20^2 + 20^2 + 20^2) ≈ 35)
let lookAtTarget = null;

let lastTouchX = 0;
let lastTouchY = 0;
let isDragging = false;
let lastTouchDist = 0;

function updateCameraPosition(camera) {
	phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi)); // Stay above ground
	camera.position.x = lookAtTarget.x + radius * Math.sin(phi) * Math.cos(theta);
	camera.position.y = lookAtTarget.y + radius * Math.cos(phi);
	camera.position.z = lookAtTarget.z + radius * Math.sin(phi) * Math.sin(theta);
	camera.lookAt(lookAtTarget);
}

// Floor Texture Fallback: Checkered tile grid
function createGridTexture(canvasNode) {
	try {
		let canvas;
		if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
			canvas = wx.createOffscreenCanvas({ type: '2d', width: 128, height: 128 });
		} else if (typeof document !== 'undefined') {
			canvas = document.createElement('canvas');
			canvas.width = 128;
			canvas.height = 128;
		} else {
			return null;
		}

		const ctx = canvas.getContext('2d');
		// Slate floor tile style
		ctx.fillStyle = '#f8fafc';
		ctx.fillRect(0, 0, 128, 128);

		ctx.strokeStyle = '#e2e8f0';
		ctx.lineWidth = 4;
		ctx.strokeRect(0, 0, 128, 128);

		const texture = new THREE.CanvasTexture(canvas);
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(1, 1);
		return texture;
	} catch (e) {
		console.warn('Fallback grid texture creation failed:', e);
		return null;
	}
}

// Draw room floor
function buildFloor(scene, vertices, centerX, centerY, scale, canvasNode) {
	if (vertices.length < 3) return;

	const shape = new THREE.Shape();
	vertices.forEach((p, idx) => {
		const x = (p.x - centerX) / scale;
		const z = -(p.y - centerY) / scale; // Negate to match wall Z coordinate alignment after mesh rotation
		if (idx === 0) {
			shape.moveTo(x, z);
		} else {
			shape.lineTo(x, z);
		}
	});

	const geometry = new THREE.ShapeGeometry(shape);
	
	const floorMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		roughness: 0.5,
		metalness: 0.1,
		side: THREE.DoubleSide
	});

	const textureLoader = new THREE.TextureLoader();
	loadTextureWithFallback(
		textureLoader,
		'/static/granite_tile_04_rough_1k.jpg',
		(tex) => {
			tex.wrapS = THREE.RepeatWrapping;
			tex.wrapT = THREE.RepeatWrapping;
			tex.repeat.set(1.5, 1.5);
			floorMat.map = tex;
			floorMat.needsUpdate = true;
		},
		(err) => {
			console.warn('Failed to load floor texture, falling back to grid texture:', err);
			const gridTex = createGridTexture(canvasNode);
			if (gridTex) {
				floorMat.map = gridTex;
				floorMat.needsUpdate = true;
			}
		}
	);

	const floorMesh = new THREE.Mesh(geometry, floorMat);
	floorMesh.rotation.x = -Math.PI / 2; // Flat on ground
	floorMesh.position.y = 0.005; // Slightly above ground to prevent z-fighting
	floorMesh.receiveShadow = true;
	scene.add(floorMesh);
}

// Build a box wall segment
function createWallSegment(scene, wallMat, x1, z1, x2, z2, height, thickness, yOffset) {
	const dx = x2 - x1;
	const dz = z2 - z1;
	const length = Math.sqrt(dx * dx + dz * dz);
	const angle = Math.atan2(dz, dx);

	const geometry = new THREE.BoxGeometry(length, height, thickness);
	const mesh = new THREE.Mesh(geometry, wallMat);

	const midX = x1 + dx / 2;
	const midZ = z1 + dz / 2;

	mesh.position.set(midX, yOffset + height / 2, midZ);
	mesh.rotation.y = -angle;
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	scene.add(mesh);
}

// Wall extrusion & opening algorithm
function buildWalls(scene, wallMat, vertices, door, centerX, centerY, scale) {
	const n = vertices.length;
	if (n < 3) return;

	for (let i = 0; i < n; i++) {
		const p1 = vertices[i];
		const p2 = vertices[(i + 1) % n];

		const x1 = (p1.x - centerX) / scale;
		const z1 = (p1.y - centerY) / scale;
		const x2 = (p2.x - centerX) / scale;
		const z2 = (p2.y - centerY) / scale;

		const dx = x2 - x1;
		const dz = z2 - z1;
		const length = Math.sqrt(dx * dx + dz * dz);
		if (length === 0) continue;

		let hasDoor = false;
		let doorProjT = 0;

		if (door && door.x !== undefined && door.y !== undefined) {
			const dx_door = (door.x - centerX) / scale;
			const dz_door = (door.y - centerY) / scale;

			const wX = dx_door - x1;
			const wZ = dz_door - z1;
			const uX = dx / length;
			const uZ = dz / length;

			const projT = (wX * uX + wZ * uZ);
			const projPointX = x1 + projT * uX;
			const projPointZ = z1 + projT * uZ;

			const distToWall = Math.sqrt((dx_door - projPointX) ** 2 + (dz_door - projPointZ) ** 2);

			if (distToWall < 0.6 && projT >= -0.2 && projT <= length + 0.2) {
				hasDoor = true;
				doorProjT = Math.max(0, Math.min(length, projT));
			}
		}

		if (!hasDoor) {
			createWallSegment(scene, wallMat, x1, z1, x2, z2, WALL_HEIGHT, WALL_THICKNESS, 0);
		} else {
			const doorWidthM = (door.width || 40.0) / scale;
			const uX = dx / length;
			const uZ = dz / length;

			const leftCut = Math.max(0, doorProjT - doorWidthM / 2);
			const rightCut = Math.min(length, doorProjT + doorWidthM / 2);

			// 1. Left Wall
			if (leftCut > 0.05) {
				const xl2 = x1 + leftCut * uX;
				const zl2 = z1 + leftCut * uZ;
				createWallSegment(scene, wallMat, x1, z1, xl2, zl2, WALL_HEIGHT, WALL_THICKNESS, 0);
			}

			// 2. Right Wall
			if (length - rightCut > 0.05) {
				const xr1 = x1 + rightCut * uX;
				const zr1 = z1 + rightCut * uZ;
				createWallSegment(scene, wallMat, xr1, zr1, x2, z2, WALL_HEIGHT, WALL_THICKNESS, 0);
			}

			// 3. Lintel Wall
			if (rightCut > leftCut) {
				const xl2 = x1 + leftCut * uX;
				const zl2 = z1 + leftCut * uZ;
				const xr1 = x1 + rightCut * uX;
				const zr1 = z1 + rightCut * uZ;
				const lintelHeight = WALL_HEIGHT - DOOR_HEIGHT;
				createWallSegment(scene, wallMat, xl2, zl2, xr1, zr1, lintelHeight, WALL_THICKNESS, DOOR_HEIGHT);
			}

			// Build Door representation inside opening
			placeDoor(scene, door, centerX, centerY, scale);
		}
	}
}

// Helper: Create a golden metal handle procedurally
function createGoldenHandle(isOuter) {
	const group = new THREE.Group();
	const goldMat = new THREE.MeshStandardMaterial({
		color: 0xDAA520, // Gold
		metalness: 1.0,
		roughness: 0.15
	});

	// Handle base
	const base = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.01, 16), goldMat);
	base.rotation.z = Math.PI / 2;
	group.add(base);

	// Handle stem
	const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 12), goldMat);
	stem.rotation.z = Math.PI / 2;
	stem.position.x = isOuter ? -0.02 : 0.02;
	group.add(stem);

	// Handle bar
	const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.18, 12), goldMat);
	bar.rotation.x = Math.PI / 2;
	bar.position.set(isOuter ? -0.04 : 0.04, 0, -0.07);
	group.add(bar);

	group.traverse((c) => {
		if (c.isMesh) c.castShadow = false;
	});
	return group;
}

// Place Door Mesh (High fidelity procedural door matching web layout)
function placeDoor(scene, door, centerX, centerY, scale) {
	const doorXM = (door.x - centerX) / scale;
	const doorZM = (door.y - centerY) / scale;
	const doorWM = (door.width || 40.0) / scale;

	const group = new THREE.Group();
	group.position.set(doorXM, 0, doorZM);
	group.rotation.y = -door.angle;

	// Wooden door frame & leaf panel with texture loading
	const woodMat = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		roughness: 0.7,
		metalness: 0.1
	});

	const textureLoader = new THREE.TextureLoader();
	loadTextureWithFallback(
		textureLoader,
		'/static/wooden_garage_door_diff_1k.jpg',
		(tex) => {
			woodMat.map = tex;
			woodMat.needsUpdate = true;
		},
		(err) => {
			console.warn('Failed to load door texture, using fallback color:', err);
			woodMat.color.setHex(0x8b5a2b); // Brown wood fallback
			woodMat.needsUpdate = true;
		}
	);
	
	const leafGeo = new THREE.BoxGeometry(doorWM, DOOR_HEIGHT, 0.08);
	const leaf = new THREE.Mesh(leafGeo, woodMat);
	leaf.position.y = DOOR_HEIGHT / 2;
	leaf.castShadow = true;
	leaf.receiveShadow = true;
	group.add(leaf);

	// Glass pane inside door for modern look
	const glassGeo = new THREE.BoxGeometry(doorWM - 0.2, DOOR_HEIGHT - 0.4, 0.02);
	const glassMat = new THREE.MeshStandardMaterial({
		color: 0xe2f1ff,
		transparent: true,
		opacity: 0.4,
		roughness: 0.1
	});
	const glass = new THREE.Mesh(glassGeo, glassMat);
	glass.position.set(0, DOOR_HEIGHT / 2, 0);
	group.add(glass);

	// Procedural golden handles
	const outerHandle = createGoldenHandle(true);
	outerHandle.position.set(doorWM / 2 - 0.08, DOOR_HEIGHT / 2, 0.05);
	group.add(outerHandle);

	const innerHandle = createGoldenHandle(false);
	innerHandle.position.set(doorWM / 2 - 0.08, DOOR_HEIGHT / 2, -0.05);
	group.add(innerHandle);

	scene.add(group);
}

// Place Cabinet (High-fidelity procedural shelves)
function placeCabinet(scene, cabinet, centerX, centerY, scale) {
	if (!cabinet || cabinet.x === undefined || cabinet.y === undefined) return;

	const cabXM = (cabinet.x - centerX) / scale;
	const cabZM = (cabinet.y - centerY) / scale;
	const cabAngle = cabinet.angle || 0.0;

	const baseW = 1.0; 
	const baseD = 0.6; 
	const cabScaleVal = cabinet.scale || 1.0;

	const finalW = baseW * cabScaleVal;
	const finalD = baseD * cabScaleVal;

	const cabinetGroup = new THREE.Group();
	cabinetGroup.position.set(cabXM, 0, cabZM);
	cabinetGroup.rotation.y = -cabAngle;

	// Cabinet Outer Frame (Dark charcoal gray)
	const frameMat = new THREE.MeshStandardMaterial({
		color: 0x334155,
		roughness: 0.4,
		metalness: 0.2
	});
	
	const backPanel = new THREE.Mesh(new THREE.BoxGeometry(finalW, CABINET_HEIGHT, 0.02), frameMat);
	backPanel.position.set(0, CABINET_HEIGHT / 2, -finalD / 2 + 0.01);
	cabinetGroup.add(backPanel);

	const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02, CABINET_HEIGHT, finalD), frameMat);
	leftPanel.position.set(-finalW / 2 + 0.01, CABINET_HEIGHT / 2, 0);
	cabinetGroup.add(leftPanel);

	const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02, CABINET_HEIGHT, finalD), frameMat);
	rightPanel.position.set(finalW / 2 - 0.01, CABINET_HEIGHT / 2, 0);
	cabinetGroup.add(rightPanel);

	const topPanel = new THREE.Mesh(new THREE.BoxGeometry(finalW, 0.02, finalD), frameMat);
	topPanel.position.set(0, CABINET_HEIGHT - 0.01, 0);
	cabinetGroup.add(topPanel);

	// Wood shelves partition (Warm wooden tones)
	const woodMat = new THREE.MeshStandardMaterial({
		color: 0xd97706, // Warm wood amber
		roughness: 0.6,
		metalness: 0.1
	});

	const shelfCount = 4;
	const shelfThickness = 0.015;
	for (let i = 1; i < shelfCount; i++) {
		const shelfY = (CABINET_HEIGHT / shelfCount) * i;
		const shelf = new THREE.Mesh(new THREE.BoxGeometry(finalW - 0.04, shelfThickness, finalD - 0.02), woodMat);
		shelf.position.set(0, shelfY, 0);
		cabinetGroup.add(shelf);
	}

	cabinetGroup.traverse((c) => {
		if (c.isMesh) {
			c.castShadow = true;
			c.receiveShadow = true;
		}
	});

	scene.add(cabinetGroup);
}

// Main Setup Export
export function createThreeScene(canvas, data, baseUrl) {
	console.log('createThreeScene - received baseUrl:', baseUrl);
	appBaseUrl = baseUrl || '';
	// Initialize scoped THREE instance using mini program package
	THREE = createScopedThreejs(canvas);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color('#d1e9ff'); // Matching web version blue background
	activeScene = scene;

	// 1. Camera Config
	const width = canvas.width || 300;
	const height = canvas.height || 300;
	const aspect = width / height;
	const d = 12; // Matching web version's camera viewport bounds exactly
	const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
	activeCamera = camera;

	lookAtTarget = new THREE.Vector3(0, 0, 0);

	// Initialize camera controller angles
	theta = Math.PI / 4;
	phi = Math.PI / 4;
	updateCameraPosition(camera);

	// 2. Renderer Config
	const renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		antialias: true
	});
	renderer.setSize(width, height);
	renderer.setPixelRatio(2);
	
	// Support older Three.js versions (like r108 used in WeChat Mini Program)
	renderer.gammaOutput = true;
	renderer.gammaFactor = 2.2;
	
	// Enable gamma correction for rich colors & lighting matching web (high version compatibility)
	if (THREE.sRGBEncoding !== undefined) {
		renderer.outputEncoding = THREE.sRGBEncoding;
	} else if (THREE.SRGBColorSpace !== undefined) {
		renderer.outputColorSpace = THREE.SRGBColorSpace;
	}
	
	activeRenderer = renderer;

	// 3. Lighting Config (Aligned to reference design: Ambient 0.85, Directional 0.4)
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
	scene.add(ambientLight);

	const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
	dirLight.position.set(5, 15, 5);
	scene.add(dirLight);

	// 4. Build Layout
	const vertices = data.vertices || [];
	if (vertices.length >= 3) {
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		vertices.forEach(p => {
			if (p.x < minX) minX = p.x;
			if (p.x > maxX) maxX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.y > maxY) maxY = p.y;
		});
		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;

		// Build floor
		buildFloor(scene, vertices, centerX, centerY, SCALE_FACTOR, canvas);

		// Build walls & door
		const doorData = data.doorX !== undefined ? {
			x: data.doorX,
			y: data.doorY,
			angle: data.doorAngle,
			width: data.doorWidth
		} : null;
		const wallMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.8,
			metalness: 0.1
		});
		buildWalls(scene, wallMat, vertices, doorData, centerX, centerY, SCALE_FACTOR);

		// Build cabinet
		const cabinetData = data.cabinetX !== undefined ? {
			x: data.cabinetX,
			y: data.cabinetY,
			angle: data.cabinetAngle,
			scale: data.cabinetScale
		} : null;
		placeCabinet(scene, cabinetData, centerX, centerY, SCALE_FACTOR);
	}

	// Start anim loop
	const animate = () => {
		animationFrameId = canvas.requestAnimationFrame(animate);
		renderer.render(scene, camera);
	}
	animate();

	return {
		scene,
		camera,
		renderer
	};
}

// Memory clean up and context dispose
export function destroyThreeScene() {
	// 1. Stop animation loop
	if (animationFrameId) {
		if (typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(animationFrameId);
		} else if (activeRenderer && activeRenderer.domElement && activeRenderer.domElement.cancelAnimationFrame) {
			activeRenderer.domElement.cancelAnimationFrame(animationFrameId);
		}
	}
	
	// 2. Dispose geometry & materials recursively
	if (activeScene) {
		activeScene.traverse((object) => {
			if (object.isMesh) {
				if (object.geometry) object.geometry.dispose();
				if (object.material) {
					if (Array.isArray(object.material)) {
						object.material.forEach(mat => mat.dispose());
					} else {
						object.material.dispose();
					}
				}
			}
		});
	}

	// 3. Dispose renderer
	if (activeRenderer) {
		activeRenderer.dispose();
	}

	// 4. Release references
	activeCamera = null;
	activeRenderer = null;
	activeScene = null;
	animationFrameId = null;
}

// Touch event dispatchers
export function onTouchStart(e) {
	const touches = e.touches || e.detail.touches;
	if (!touches || touches.length === 0) return;

	if (touches.length === 1) {
		lastTouchX = touches[0].clientX;
		lastTouchY = touches[0].clientY;
		isDragging = true;
	} else if (touches.length === 2) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		lastTouchDist = Math.sqrt(dx * dx + dy * dy);
	}
}

export function onTouchMove(e, camera, renderer, scene) {
	const touches = e.touches || e.detail.touches;
	if (!touches || touches.length === 0) return;

	if (touches.length === 1 && isDragging) {
		const touchX = touches[0].clientX;
		const touchY = touches[0].clientY;
		const dx = touchX - lastTouchX;
		const dy = touchY - lastTouchY;

		theta -= dx * 0.007;
		phi -= dy * 0.007;

		lastTouchX = touchX;
		lastTouchY = touchY;

		updateCameraPosition(camera);
	} else if (touches.length === 2) {
		const dx = touches[0].clientX - touches[1].clientX;
		const dy = touches[0].clientY - touches[1].clientY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (lastTouchDist > 0) {
			const factor = lastTouchDist / dist;
			camera.zoom = Math.max(0.3, Math.min(4.0, camera.zoom / factor));
			camera.updateProjectionMatrix();
		}
		lastTouchDist = dist;
	}
}

export function onTouchEnd() {
	isDragging = false;
	lastTouchDist = 0;
}
