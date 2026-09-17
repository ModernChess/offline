// =========================================================================
// MAP VIEWPORT, CAMERA, AND ASSET LOADER CONTROLLER (24x34 GRID SYSTEM)
// =========================================================================

const repoBaseUrl = 'https://raw.githubusercontent.com/ModernChess/assets-images/main/';

let cameraZoom = 1.0;
let cameraX = 0;
let cameraY = 0;
let activePointers = new Map();
let initialPinchDistance = null;
let initialZoom = 1.0;
let pinchCenter = { x: 0, y: 0 };
const panSensitivity = 2.0;

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error("[ERROR][map_viewport] Canvas element with ID 'gameCanvas' not found in DOM.");
}

const ctx = canvas ? canvas.getContext('2d') : null;
if (!ctx) {
    console.error("[ERROR][map_viewport] Failed to acquire 2D rendering context from canvas.");
}

const cols = 24;
const rows = 34;
const cellSize = canvas ? canvas.width / cols : 30;

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function getPinchDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getPinchCenter(p1, p2, rect) {
    return {
        x: ((p1.clientX + p2.clientX) / 2) - rect.left,
        y: ((p1.clientY + p2.clientY) / 2) - rect.top
    };
}

if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, e);
        
        if (activePointers.size === 2) {
            const pointers = Array.from(activePointers.values());
            const rect = canvas.getBoundingClientRect();
            initialPinchDistance = getPinchDistance(pointers[0], pointers[1]);
            initialZoom = cameraZoom;
            pinchCenter = getPinchCenter(pointers[0], pointers[1], rect);
        } else if (activePointers.size === 1) {
            initialPinchDistance = null;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, e);

        if (activePointers.size === 2 && initialPinchDistance !== null && initialPinchDistance > 0) {
            const pointers = Array.from(activePointers.values());
            const rect = canvas.getBoundingClientRect();
            const currentDistance = getPinchDistance(pointers[0], pointers[1]);
            const currentCenter = getPinchCenter(pointers[0], pointers[1], rect);
            
            const zoomFactor = currentDistance / initialPinchDistance;
            const newZoom = Math.min(Math.max(initialZoom * zoomFactor, 0.5), 3.0);

            cameraX = currentCenter.x - (currentCenter.x - cameraX) * (newZoom / cameraZoom);
            cameraY = currentCenter.y - (currentCenter.y - cameraY) * (newZoom / cameraZoom);
            cameraZoom = newZoom;
            
        } else if (activePointers.size === 1) {
            cameraX += e.movementX * panSensitivity;
            cameraY += e.movementY * panSensitivity;
        }
    });

    const removePointer = (e) => {
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
        
        activePointers.delete(e.pointerId);
        
        if (activePointers.size === 1) {
            const remainingPointer = Array.from(activePointers.values())[0];
            activePointers.set(remainingPointer.pointerId, remainingPointer);
            initialPinchDistance = null;
        } else if (activePointers.size < 2) {
            initialPinchDistance = null;
        }
    };

    canvas.addEventListener('pointerup', removePointer);
    canvas.addEventListener('pointercancel', removePointer);
}

const loadingOverlay = document.createElement('div');
loadingOverlay.style.position = 'fixed';
loadingOverlay.style.top = '0';
loadingOverlay.style.left = '0';
loadingOverlay.style.width = '100vw';
loadingOverlay.style.height = '100vh';
loadingOverlay.style.backgroundColor = '#111111';
loadingOverlay.style.zIndex = '9999';
loadingOverlay.style.display = 'flex';
loadingOverlay.style.flexDirection = 'column';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.color = '#ffffff';
loadingOverlay.style.fontFamily = 'sans-serif';

loadingOverlay.innerHTML = `
    <h3 style="margin-bottom: 10px; font-weight: 600; letter-spacing: 1px;">Loading Game Assets...</h3>
    <div style="width: 240px; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid #333;">
        <div id="progressBar" style="width: 0%; height: 100%; background: #2ecc71; transition: width 0.1s ease;"></div>
    </div>
    <span id="progressText" style="margin-top: 10px; font-size: 13px; color: #aaa;">0%</span>
`;
document.body.appendChild(loadingOverlay);

const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const localAssetFiles = [
    { name: repoBaseUrl + 'blue_tank.jpg', key: 'blueTank' },
    { name: repoBaseUrl + 'blue_infantry.jpg', key: 'blueInfantry' },
    { name: repoBaseUrl + 'blue_artillery.jpg', key: 'blueArtillery' },
    { name: repoBaseUrl + 'blue_ship.jpg', key: 'blueShip' },
    { name: repoBaseUrl + 'blue_engineer.jpg', key: 'blueEngineer' },
    { name: repoBaseUrl + 'blue_plane.jpg', key: 'bluePlane' },
    { name: repoBaseUrl + 'blue_antiair.jpg', key: 'blueAntiAir' },
    { name: repoBaseUrl + 'blue_mine.jpg', key: 'blueMines' },
    { name: repoBaseUrl + 'red_tank.jpg', key: 'redTank' },
    { name: repoBaseUrl + 'red_infantry.jpg', key: 'redInfantry' },
    { name: repoBaseUrl + 'red_artillery.jpg', key: 'redArtillery' },
    { name: repoBaseUrl + 'red_ship.jpg', key: 'redShip' },
    { name: repoBaseUrl + 'red_engineer.jpg', key: 'redEngineer' },
    { name: repoBaseUrl + 'red_plane.jpg', key: 'redPlane' },
    { name: repoBaseUrl + 'red_antiair.jpg', key: 'redAntiAir' },
    { name: repoBaseUrl + 'red_mine.jpg', key: 'redMines' },
    { name: repoBaseUrl + 'map_3.png', key: 'map' }
];

let loadedCount = 0;
const totalAssets = localAssetFiles.length;

if (typeof window.blueTankImg === 'undefined') {
    window.blueTankImg = new Image(); window.blueTankLoaded = false;
    window.blueInfantryImg = new Image(); window.blueInfantryLoaded = false;
    window.blueArtilleryImg = new Image(); window.blueArtilleryLoaded = false;
    window.blueShipImg = new Image(); window.blueShipLoaded = false;
    window.blueEngineerImg = new Image(); window.blueEngineerLoaded = false;
    window.bluePlaneImg = new Image(); window.bluePlaneLoaded = false;
    window.blueAntiAirImg = new Image(); window.blueAntiAirLoaded = false;
    window.blueMinesImg = new Image(); window.blueMinesLoaded = false;

    window.redTankImg = new Image(); window.redTankLoaded = false;
    window.redInfantryImg = new Image(); window.redInfantryLoaded = false;
    window.redArtilleryImg = new Image(); window.redArtilleryLoaded = false;
    window.redShipImg = new Image(); window.redShipLoaded = false;
    window.redEngineerImg = new Image(); window.redEngineerLoaded = false;
    window.redPlaneImg = new Image(); window.redPlaneLoaded = false;
    window.redAntiAirImg = new Image(); window.redAntiAirLoaded = false;
    window.redMinesImg = new Image(); window.redMinesLoaded = false;

    window.mapImg = new Image(); window.mapLoaded = false;
}

function updateLoadingProgress() {
    loadedCount++;
    let percent = Math.floor((loadedCount / totalAssets) * 100);
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.innerText = percent + '%';

    if (loadedCount >= totalAssets) {
        console.log("[SUCCESS][map_viewport] All remote assets loaded successfully.");
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.4s ease';
            setTimeout(() => loadingOverlay.remove(), 400);
        }, 300);
    }
}

function loadLocalAsset(filename, imgObj, setLoadedFlag) {
    imgObj.src = filename;
    imgObj.onload = () => {
        setLoadedFlag(true);
        updateLoadingProgress();
    };
    imgObj.onerror = (err) => {
        console.error(`[ERROR][map_viewport] Failed to load asset: ${filename}`, err);
        updateLoadingProgress();
    };
}

loadLocalAsset(repoBaseUrl + 'blue_tank.jpg', window.blueTankImg, (val) => { window.blueTankLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_infantry.jpg', window.blueInfantryImg, (val) => { window.blueInfantryLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_artillery.jpg', window.blueArtilleryImg, (val) => { window.blueArtilleryLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_ship.jpg', window.blueShipImg, (val) => { window.blueShipLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_engineer.jpg', window.blueEngineerImg, (val) => { window.blueEngineerLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_plane.jpg', window.bluePlaneImg, (val) => { window.bluePlaneLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_antiair.jpg', window.blueAntiAirImg, (val) => { window.blueAntiAirLoaded = val; });
loadLocalAsset(repoBaseUrl + 'blue_mine.jpg', window.blueMinesImg, (val) => { window.blueMinesLoaded = val; });

loadLocalAsset(repoBaseUrl + 'red_tank.jpg', window.redTankImg, (val) => { window.redTankLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_infantry.jpg', window.redInfantryImg, (val) => { window.redInfantryLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_artillery.jpg', window.redArtilleryImg, (val) => { window.redArtilleryLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_ship.jpg', window.redShipImg, (val) => { window.redShipLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_engineer.jpg', window.redEngineerImg, (val) => { window.redEngineerLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_plane.jpg', window.redPlaneImg, (val) => { window.redPlaneLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_antiair.jpg', window.redAntiAirImg, (val) => { window.redAntiAirLoaded = val; });
loadLocalAsset(repoBaseUrl + 'red_mine.jpg', window.redMinesImg, (val) => { window.redMinesLoaded = val; });

loadLocalAsset(repoBaseUrl + 'map_3.png', window.mapImg, (val) => { window.mapLoaded = val; });

function getTerrainColor(terrain) {
    switch (terrain) {
        case 'light_navy': return '#000033';
        case 'land': return '#90ee90';
        case 'naval': return '#800080';
        case 'artillery': return '#ffa500';
        case 'tank_spawn': return '#808080';
        case 'gold_core': return '#b8860b';
        case 'gold': return '#ffd700';
        case 'bbc': return '#0000ff';
        case 'rbc': return '#ff0000';
        case 'blue_base': return '#4169e1';
        case 'red_base': return '#cd5c5c';
        default: return '#90ee90';
    }
}

function drawCustomGridBoard() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cameraX, cameraY);
    ctx.scale(cameraZoom, cameraZoom);

    // 1. Render the terrain colors per cell grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let terrain = typeof getTerrain === 'function' ? getTerrain(c, r) : 'land';
            ctx.fillStyle = getTerrainColor(terrain);
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
    }

    // 2. Optionally overlay the map image semi-transparently if loaded
    if (typeof window.mapLoaded !== 'undefined' && window.mapLoaded && window.mapImg) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(window.mapImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }

    // 3. Render units on top
    if (typeof window.units !== 'undefined') {
        window.units.forEach(unit => {
            let uX = unit.gridX * cellSize;
            let uY = unit.gridY * cellSize;
            if (unit.loaded && unit.img) {
                ctx.drawImage(unit.img, uX, uY, cellSize, cellSize);
            } else {
                ctx.fillStyle = unit.team === 'blue' ? '#4169e1' : '#cd5c5c';
                ctx.fillRect(uX + 2, uY + 2, cellSize - 4, cellSize - 4);
            }
        });
    }

    ctx.restore();
}
