// =========================================================================
// UNIT MOVEMENT, INTERACTION, AND LOGIC CONTROLLER
// =========================================================================

if (typeof window.smokeParticles === 'undefined') {
    window.smokeParticles = [];
}

let selectedUnit = null;     
let legalMoves = [];         
let targetTile = null;       
let pressTimer = null;       
let selectionAnimStartTime = null;

// Global moved units tracking table per turn
if (typeof window.movedUnitsTable === 'undefined') {
    window.movedUnitsTable = [];
}

// Custom top-number setting: Change this value to set the maximum allowed units in the table
if (typeof window.maxMovedUnitsLimit === 'undefined') {
    window.maxMovedUnitsLimit = 1; 
}

function spawnSmokeTrail(unit, prevX, prevY) {
    let dx = unit.x - prevX;
    let dy = unit.y - prevY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0.5) {
        let nx = dx / dist;
        let ny = dy / dist;
        
        window.smokeParticles.push({
            x: (unit.renderX + cellSize / 2) - (nx * (cellSize * 0.3)),
            y: (unit.renderY + cellSize / 2) - (ny * (cellSize * 0.3)),
            vx: -nx * 0.2 + (Math.random() - 0.5) * 0.2,
            vy: -ny * 0.2 + (Math.random() - 0.5) * 0.2,
            radius: cellSize * 0.15,
            maxRadius: cellSize * 0.6,
            alpha: 0.3,
            life: 1.0,
            decay: 0.015
        });
    }
}

function getLegalMoves(unit) {
    if (!unit) return [];

    // Block unit from moving if it already moved during the current turn
    if (window.movedUnitsTable.includes(unit)) {
        return [];
    }

    // If moved units table count exceeds the custom max limit, lock down and block all remaining unmoved units
    if (window.movedUnitsTable.length > window.maxMovedUnitsLimit) {
        return [];
    }

    let moves = [];
    let maxRange = unit.range;
    let cx = unit.gridX;
    let cy = unit.gridY;

    if (!validateCoordinates(cx, cy)) return [];

    let unitName = (unit.name || '').toLowerCase();
    let usesEngineerSupportSystem = unitName.includes('infantry') || unitName.includes('tank') || unitName.includes('anti-air') || unitName.includes('artillery');
    let unitTeam = getTeamFromUnit(unit);

    let directions = [
        {dx: 0, dy: -1}, {dx: 0, dy: 1},  
        {dx: -1, dy: 0}, {dx: 1, dy: 0},  
        {dx: -1, dy: -1}, {dx: 1, dy: -1}, 
        {dx: -1, dy: 1}, {dx: 1, dy: 1}    
    ];

    directions.forEach(dir => {
        for (let step = 1; step <= maxRange; step++) {
            let nc = cx + (dir.dx * step);
            let nr = cy + (dir.dy * step);

            if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                if (typeof isGoldCore === 'function' && isGoldCore(nc, nr)) break;

                let isWater = isTileWater(nc, nr);
                let isAmphibious = unit.name.includes('Engineer') || unit.name.includes('Plane') || unit.name.includes('Mines');

                if (usesEngineerSupportSystem) {
                    if (isWater) {
                        if (!isTileCyanWaterDetected(nc, nr, unitTeam)) {
                            break; 
                        }
                    }
                } else {
                    if (!isAmphibious && unit.type === 'land' && isWater) {
                        break; 
                    }
                }

                let validTerrain = false;
                if (isAmphibious || (usesEngineerSupportSystem && isWater && isTileCyanWaterDetected(nc, nr, unitTeam))) {
                    validTerrain = true;
                } else {
                    if (unit.type === 'land' && !isWater) validTerrain = true;
                    if (unit.type === 'water' && isWater) validTerrain = true;
                }
                let terrain = typeof getTerrain === 'function' ? getTerrain(nc, nr) : null;
                if (!terrain) validTerrain = true;

                if (!validTerrain) break;
                moves.push({c: nc, r: nr});
            } else {
                break;
            }
        }
    });

    return moves;
}

canvas.addEventListener('pointerdown', (e) => {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;

    let touchX = (e.clientX - rect.left) * scaleX;
    let touchY = (e.clientY - rect.top) * scaleY;

    let worldX = (touchX - cameraX) / cameraZoom;
    let worldY = (touchY - cameraY) / cameraZoom;

    // Check for range button click when a unit is already selected
    if (selectedUnit) {
        let uName = selectedUnit.name || '';
        let hasRangeButton = uName.includes('Ship') || uName.includes('Artillery') || 
                             uName.includes('Engineer') || uName.includes('Anti-Air') || 
                             uName.includes('Mines');

        if (hasRangeButton) {
            let btnX = selectedUnit.renderX + cellSize + 12;
            let btnY = selectedUnit.renderY - 12;
            let btnSize = cellSize * 0.85;

            if (worldX >= btnX && worldX <= btnX + btnSize && worldY >= btnY && worldY <= btnY + btnSize) {
                if (selectedUnit.showRange === undefined) {
                    selectedUnit.showRange = false;
                }
                selectedUnit.showRange = !selectedUnit.showRange;
                legalMoves = getLegalMoves(selectedUnit);
                return;
            }
        }
    }

    let c = Math.floor(worldX / cellSize);
    let r = Math.floor(worldY / cellSize);

    if (!validateCoordinates(c, r)) return;

    if (r >= 0 && r < rows && c >= 0 && c < cols) {
        let clickedUnit = units.find(u => u.gridX === c && u.gridY === r);

        if (clickedUnit) {
            let unitTeam = getTeamFromUnit(clickedUnit);
            let activeTurn = typeof currentTurn !== 'undefined' ? currentTurn : 'red';

            // Enforce turn restriction: Only units matching the current turn can be selected
            if (unitTeam !== activeTurn) {
                return;
            }
            
            if (selectedUnit && unitTeam !== getTeamFromUnit(selectedUnit)) {
                let sName = (selectedUnit.name || '').toLowerCase();
                if (sName.includes('artillery')) {
                    let combatRanges = getUnitCombatRange(selectedUnit);
                    let inRange = combatRanges.some(rangeBox => 
                        clickedUnit.gridX >= rangeBox.startC && clickedUnit.gridX <= rangeBox.endC &&
                        clickedUnit.gridY >= rangeBox.startR && clickedUnit.gridY <= rangeBox.endR
                    );
                    if (inRange && typeof triggerArtilleryDuel === 'function') {
                        triggerArtilleryDuel(selectedUnit, clickedUnit);
                        return;
                    }
                }
            }

            // Prevent selecting units that have already moved during this turn
            if (window.movedUnitsTable.includes(clickedUnit)) {
                return;
            }

            // If movedUnitsTable length exceeds the custom max limit, make all other unmoved units non-selectable and unmovable
            if (window.movedUnitsTable.length > window.maxMovedUnitsLimit) {
                return;
            }

            selectedUnit = clickedUnit;
            selectionAnimStartTime = performance.now();
            legalMoves = getLegalMoves(clickedUnit);
            targetTile = null; 

            let cNameLower = (clickedUnit.name || '').toLowerCase();
            if (cNameLower.includes('infantry')) {
                playInfantrySound();
            } else if (cNameLower.includes('tank')) {
                playTankSound();
            } else if (cNameLower.includes('ship')) {
                playShipSound();
            } else if (cNameLower.includes('plane')) {
                playPlaneSelectSound();
            } else if (cNameLower.includes('mines')) {
                playMineSelectSound();
            } else if (cNameLower.includes('engineer')) {
                playEngineerSound();
            } else if (cNameLower.includes('anti-air')) {
                playAntiAirSelectSound();
            }
        } else {
            if (selectedUnit) {
                let isEngineer = (selectedUnit.name || '').includes('Engineer');
                let isArtillery = (selectedUnit.name || '').includes('Artillery');
                let isAntiAir = (selectedUnit.name || '').includes('Anti-Air');
                let isRangeActive = selectedUnit.showRange === true;

                let allowMove = !isRangeActive || isEngineer || isArtillery || isAntiAir;

                if (allowMove) {
                    let isLegal = legalMoves.some(m => m.c === c && m.r === r);
                    if (isLegal) {
                        let activeUnit = selectedUnit;
                        if (typeof tryMoveUnit === 'function') {
                            tryMoveUnit(activeUnit, c, r);
                        }

                        // Automatically add unit to the moved units table upon execution
                        if (!window.movedUnitsTable.includes(activeUnit)) {
                            window.movedUnitsTable.push(activeUnit);
                        }
                        activeUnit.hasMovedBefore = true;

                        let moveNameLower = (activeUnit.name || '').toLowerCase();
                        if (moveNameLower.includes('infantry')) {
                            playInfantryMoveSound();
                        } else if (moveNameLower.includes('tank')) {
                            playTankMoveSound();
                        } else if (moveNameLower.includes('ship')) {
                            playShipSound();
                        } else if (moveNameLower.includes('plane')) {
                            playPlaneMoveSound();
                        } else if (moveNameLower.includes('engineer')) {
                            playEngineerSound();
                        } else if (moveNameLower.includes('anti-air')) {
                            playAntiAirMoveSound();
                        }

                        selectedUnit = null;
                        selectionAnimStartTime = null;
                        legalMoves = [];
                        targetTile = null;

                        // Automatically trigger turn change if table length exceeds the max limit
                        if (window.movedUnitsTable.length > window.maxMovedUnitsLimit) {
                            if (typeof window.changeTurn === 'function') {
                                window.changeTurn();
                            } else if (typeof window.endTurn === 'function') {
                                window.endTurn();
                            }
                        }
                    }
                }
            }
        }
    }
});

// Function to clear moved units table completely whenever a turn changes
function clearMovedUnitsTable() {
    console.log(`[TURN CHANGE] Clearing moved units table. Previously tracked units count: ${window.movedUnitsTable.length}`);
    window.movedUnitsTable = [];
    console.log('[TURN CHANGE] Moved units table is now completely empty. All units freed for the new turn.');
}

// Bulletproof event delegation to catch any click on a turn/end button regardless of ID or load order
document.addEventListener('click', (e) => {
    let target = e.target;
    if (!target) return;

    let id = (target.id || '').toLowerCase();
    let text = (target.innerText || '').toLowerCase();
    let className = (target.className || '').toLowerCase();

    // Check if the clicked element matches common patterns for a turn change button
    if (id.includes('turn') || id.includes('end') || 
        className.includes('turn') || className.includes('end') ||
        text.includes('turn') || text.includes('end turn') || text.includes('change turn')) {
        clearMovedUnitsTable();
    }
});

// Wrap global changeTurn to ensure table clearing fires on programmatic or automatic calls
if (typeof window.changeTurn === 'function' && !window.changeTurn._isWrappedForMovedUnits) {
    const originalChangeTurn = window.changeTurn;
    window.changeTurn = function(...args) {
        clearMovedUnitsTable();
        return originalChangeTurn.apply(this, args);
    };
    window.changeTurn._isWrappedForMovedUnits = true;
}

// Wrap global endTurn to ensure table clearing fires on programmatic or automatic calls
if (typeof window.endTurn === 'function' && !window.endTurn._isWrappedForMovedUnits) {
    const originalEndTurn = window.endTurn;
    window.endTurn = function(...args) {
        clearMovedUnitsTable();
        return originalEndTurn.apply(this, args);
    };
    window.endTurn._isWrappedForMovedUnits = true;
}

window.onTurnChanged = function() {
    clearMovedUnitsTable();
};

canvas.addEventListener('pointerup', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
canvas.addEventListener('pointercancel', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
