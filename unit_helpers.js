// =========================================================================
// UNIT HELPERS, AUDIO SYSTEM, AND UTILITIES
// =========================================================================


const unitAudioConfigs = {
    infantrySelect: {
        src: repoBaseUrl + 'sound4-armycharge.mp3',
        start: 2.0,
        end: 3.9,
        fadeDuration: 1.8,
        baseVolume: 0.25,
        maxFadeVol: 0.5
    },
    tankSelect: {
        src: repoBaseUrl + 'sound7tankstart.mp3',
        start: 1.5,
        end: 5.0,
        fadeDuration: 1.5,
        baseVolume: 0.2,
        isFadeIn: true
    },
    infantryMove: {
        src: repoBaseUrl + 'sound 3.mp3',
        start: 3.0,
        end: 6.0,
        fadeDuration: 1.5,
        baseVolume: 1,
        maxFadeVol: 0.5
    },
    tankMove: {
        src: repoBaseUrl + 'sound5tankmove.mp3',
        start: 1,
        end: 3.5,
        fadeDuration: 1.5,
        baseVolume: 0.2,
        maxFadeVol: 0.2
    },
    shipSound: {
        src: repoBaseUrl + 'sound6battleshiphorn.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.5,
        baseVolume: 0.5,
        isFadeIn: false
    },
    planeSelect: {
        src: repoBaseUrl + 'sound12planestarting.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.8
    },
    planeMove: {
        src: repoBaseUrl + 'sound13planeflying.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.8
    },
    mineSelect: {
        src: repoBaseUrl + 'sound14mines.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.5
    },
    antiAirMove: {
        src: repoBaseUrl + 'sound15antiairmoving.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.7
    },
    engineerSound: {
        src: repoBaseUrl + 'sound16engineerall.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.7
    },
    antiAirSelect: {
        src: repoBaseUrl + 'sound17antiairselected.mp3',
        start: 0,
        end: 3.5,
        fadeDuration: 1.0,
        baseVolume: 0.5
    }
};

function createUnitAudioPlayer(config) {
    const audio = document.createElement('audio');
    audio.src = config.src;
    audio.preload = 'auto';

    audio.addEventListener('timeupdate', () => {
        let currentTime = audio.currentTime;
        let baseVol = config.baseVolume;

        if (config.isFadeIn) {
            let fadeInBufferTime = config.start + config.fadeDuration;
            if (currentTime >= config.start && currentTime <= fadeInBufferTime) {
                let progress = (currentTime - config.start) / config.fadeDuration;
                audio.volume = Math.max(0, Math.min(baseVol, baseVol * progress));
            } else {
                let fadeOutStartTime = config.end - config.fadeDuration;
                if (currentTime >= fadeOutStartTime && currentTime < config.end) {
                    let fadeProgress = (config.end - currentTime) / config.fadeDuration;
                    audio.volume = Math.max(0, Math.min(baseVol, baseVol * fadeProgress));
                }
            }
        } else {
            let fadeStartTime = config.end - config.fadeDuration;
            if (currentTime >= fadeStartTime && currentTime < config.end) {
                let fadeProgress = (config.end - currentTime) / config.fadeDuration;
                let cap = config.maxFadeVol !== undefined ? config.maxFadeVol : baseVol;
                audio.volume = Math.max(0, Math.min(baseVol, cap * fadeProgress));
            }
        }

        if (currentTime >= config.end) {
            audio.pause();
            audio.currentTime = config.start;
        }
    });

    return function() {
        audio.pause();
        audio.currentTime = config.start;
        audio.volume = config.isFadeIn ? 0 : config.baseVolume;
        audio.play().catch(err => {
            SystemLog.warn(`Audio playback prevented or failed for ${config.src}:`, err);
        });
    };
}

const playInfantrySound = createUnitAudioPlayer(unitAudioConfigs.infantrySelect);
const playTankSound = createUnitAudioPlayer(unitAudioConfigs.tankSelect);
const playInfantryMoveSound = createUnitAudioPlayer(unitAudioConfigs.infantryMove);
const playTankMoveSound = createUnitAudioPlayer(unitAudioConfigs.tankMove);
const playShipSound = createUnitAudioPlayer(unitAudioConfigs.shipSound);
const playPlaneSelectSound = createUnitAudioPlayer(unitAudioConfigs.planeSelect);
const playPlaneMoveSound = createUnitAudioPlayer(unitAudioConfigs.planeMove);
const playMineSelectSound = createUnitAudioPlayer(unitAudioConfigs.mineSelect);
const playAntiAirSelectSound = createUnitAudioPlayer(unitAudioConfigs.antiAirSelect);
const playAntiAirMoveSound = createUnitAudioPlayer(unitAudioConfigs.antiAirMove);
const playEngineerSound = createUnitAudioPlayer(unitAudioConfigs.engineerSound);

if (typeof mapLoaded === 'undefined') var mapLoaded = false;
if (typeof mapImg === 'undefined') var mapImg = null;

const SystemLog = {
    info: (msg, data = null) => console.log(`[INFO][unit_helpers]: ${msg}`, data ?? ''),
    warn: (msg, data = null) => console.warn(`[WARN][unit_helpers]: ${msg}`, data ?? ''),
    error: (msg, data = null) => console.error(`[ERROR][unit_helpers]: ${msg}`, data ?? ''),
    success: (msg, data = null) => console.log(`[SUCCESS][unit_helpers]: ${msg}`, data ?? '')
};

function validateCoordinates(c, r, maxCols = cols, maxRows = rows) {
    if (typeof c !== 'number' || typeof r !== 'number' || isNaN(c) || isNaN(r)) return false;
    if (c < 0 || c >= maxCols || r < 0 || r >= maxRows) return false;
    return true;
}

function getLargerCoord(c, r) {
    if (!validateCoordinates(c, r)) return { col: 'Al', row: '1l', colIdx: 0, rowIdx: 0 };

    const cols_12x17 = ['Al', 'Bl', 'Cl', 'Dl', 'El', 'Fl', 'Gl', 'Hl', 'Il', 'Jl', 'Kl', 'Ll'];
    const rows_12x17 = ['1l', '2l', '3l', '4l', '5l', '6l', '7l', '8l', '9l', '10l', '11l', '12l', '13l', '14l', '15l', '16l', '17l'];
    
    let lc = Math.floor(c / 2);
    let lr = Math.floor(r / 2);
    if (lc >= 12) lc = 11;
    if (lr >= 17) lr = 16;

    return { col: cols_12x17[lc], row: rows_12x17[lr], colIdx: lc, rowIdx: lr };
}

function getUnitCombatRange(unit) {
    if (!unit) return [];

    let name = unit.name || '';
    let maxDist = (name.includes('Ship') || name.includes('Engineer') || name.includes('Anti-Air') || name.includes('Mines')) ? 1 : (name.includes('Artillery') ? 3 : 0);
    if (maxDist === 0) return [];

    let currentLg = getLargerCoord(unit.gridX, unit.gridY);
    let results = [];
    let directions = [
        {dx: 0, dy: -1}, {dx: 0, dy: 1},  
        {dx: -1, dy: 0}, {dx: 1, dy: 0},  
        {dx: -1, dy: -1}, {dx: 1, dy: -1}, 
        {dx: -1, dy: 1}, {dx: 1, dy: 1}   
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxDist; step++) {
            let nc = currentLg.colIdx + (dir.dx * step);
            let nr = currentLg.rowIdx + (dir.dy * step);
            if (nc >= 0 && nc < 12 && nr >= 0 && nr < 17) {
                let startC = nc * 2;
                let startR = nr * 2;
                let endC = nc * 2 + 1;
                let endR = nr * 2 + 1;

                results.push({
                    startC: startC, startR: startR,
                    endC: endC, endR: endR
                });
            }
        }
    });

    return results;
}

function isTileWater(c, r) {
    let terrain = typeof getTerrain === 'function' ? getTerrain(c, r) : 'light_navy';
    let isWater = (terrain === 'light_native' || terrain === 'light_navy');
    if (!terrain) isWater = true;
    return isWater;
}

function isTileCyanWaterDetected(c, r, unitTeam) {
    let isDetectedWater = false;
    units.forEach(otherU => {
        let oName = otherU.name || '';
        if (otherU.showRange && oName.includes('Engineer') && getTeamFromUnit(otherU) === unitTeam) {
            let combatRanges = getUnitCombatRange(otherU);
            combatRanges.forEach(sq => {
                if (c >= sq.startC && c <= sq.endC && r >= sq.startR && r <= sq.endR) {
                    if (isTileWater(c, r)) {
                        isDetectedWater = true;
                    }
                }
            });
        }
    });
    return isDetectedWater;
}

function getAntiAirConnectedUnits() {
    let connectedUnits = new Set();
    let antiAirUnits = units.filter(u => (u.name || '').includes('Anti-Air'));

    antiAirUnits.forEach(aa => {
        connectedUnits.add(aa);
    });

    let added = true;
    while (added) {
        added = false;
        units.forEach(u => {
            if (!connectedUnits.has(u)) {
                let uTeam = getTeamFromUnit(u);
                for (let connectedU of connectedUnits) {
                    if (getTeamFromUnit(connectedU) === uTeam) {
                        let dist = Math.max(Math.abs(u.gridX - connectedU.gridX), Math.abs(u.gridY - connectedU.gridY));
                        if (dist <= 1) {
                            connectedUnits.add(u);
                            added = true;
                            break;
                        }
                    }
                }
            }
        });
    }

    return connectedUnits;
}

// Helper function to safely evaluate a unit's team if not globally defined
function getTeamFromUnit(unit) {
    if (!unit) return null;
    if (typeof unit.team !== 'undefined') return unit.team;
    return 'red'; // Default fallback safety
}
