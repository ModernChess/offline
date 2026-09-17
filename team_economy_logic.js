// =========================================================================
// TEAM CORE, ECONOMY, BASES, & WIN CONDITIONS CONTROLLER (Part 2/2: Logic)
// =========================================================================

function updateGameHUD() {
    let blueCoinsElem = document.getElementById('blue-coins-num');
    if (blueCoinsElem) blueCoinsElem.innerText = blueCoins;

    let redCoinsElem = document.getElementById('red-coins-num');
    if (redCoinsElem) redCoinsElem.innerText = redCoins;

    let turnDisplayElem = document.getElementById('turn-display');
    if (turnDisplayElem) {
        turnDisplayElem.innerText = `Turn: ${currentTurn.toUpperCase()}`;
    }

    if (typeof window.updateHUDTheme === 'function') {
        window.updateHUDTheme();
    }
}

function changeTurn() {
    if (gameOver) return;
    
    // Switch active team turn
    currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
    TeamLog.info(`Turn changed to: ${currentTurn.toUpperCase()}`);

    // Process optional turn income/captures on transition
    processTurnIncomeAndCaptures();
    updateGameHUD();
}

function getTeamFromUnit(unit) {
    if (!unit) return null;
    if (unit.team) return unit.team.toLowerCase();
    if (unit._assignedTeam) return unit._assignedTeam;
    
    let nameStr = (unit.name || '').toLowerCase();
    if (nameStr.includes('red') || nameStr.includes('black')) return 'red';
    if (nameStr.includes('blue') || nameStr.includes('white')) return 'blue';
    
    if (unit.img && unit.img.src) {
        let src = unit.img.src.toLowerCase();
        if (src.includes('red')) return 'red';
        if (src.includes('blue')) return 'blue';
    }

    let team = unit.gridY < 16 ? 'blue' : 'red';
    unit._assignedTeam = team;
    return team;
}

function getUnitPower(unit) {
    if (!unit) return 0;
    let name = (unit.name || '').toLowerCase();
    if (name.includes('ship')) return Infinity;
    if (name.includes('mines')) return 7;
    if (name.includes('artillery') || name.includes('boat') || name.includes('engineer')) return 0;
    if (name.includes('tank')) return 2;
    if (name.includes('infantry') || name.includes('soldier')) return 1;
    return 1;
}

function isSpecialUnit(unit) {
    if (!unit) return false;
    let name = (unit.name || '').toLowerCase();
    return name.includes('artillery') || name.includes('boat') || getUnitPower(unit) === 0;
}

function areUnitsAdjacent(u1, u2) {
    let dx = Math.abs(u1.gridX - u2.gridX);
    let dy = Math.abs(u1.gridY - u2.gridY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

function checkWinConditions(allUnits) {
    if (gameOver) return;

    let redLandUnits = allUnits.filter(u => getTeamFromUnit(u) === 'red' && !isSpecialUnit(u) && getUnitPower(u) !== Infinity);
    let blueLandUnits = allUnits.filter(u => getTeamFromUnit(u) === 'blue' && !isSpecialUnit(u) && getUnitPower(u) !== Infinity);
    let redTotal = allUnits.filter(u => getTeamFromUnit(u) === 'red');
    let blueTotal = allUnits.filter(u => getTeamFromUnit(u) === 'blue');

    if (redLandUnits.length === 0 || redTotal.length === 0) {
        gameOver = true;
        winnerMessage = 'BLUE TEAM WINS BY ANNIHILATION!';
        TeamLog.success(winnerMessage);
        return;
    }
    if (blueLandUnits.length === 0 || blueTotal.length === 0) {
        gameOver = true;
        winnerMessage = 'RED TEAM WINS BY ANNIHILATION!';
        TeamLog.success(winnerMessage);
        return;
    }

    goldCores.forEach(core => {
        if (core.isBase && core.owner && core.teamBase) {
            if (core.owner !== core.teamBase) {
                gameOver = true;
                winnerMessage = `${core.owner.toUpperCase()} TEAM WINS BY CAPTURING ENEMY BASE!`;
                TeamLog.success(winnerMessage);
            }
        }
    });
}

function commitUnitDestruction(unitsArray, unitsToDestroy) {
    unitsToDestroy.forEach(u => {
        let index = unitsArray.indexOf(u);
        if (index !== -1) {
            unitsArray.splice(index, 1);
        }
        if (!destroyedUnitsQueue.some(item => item.unit === u)) {
            destroyedUnitsQueue.push({
                unit: u,
                startTime: performance.now(),
                duration: 1800
            });
        }
    });
}

function toggleShop() {
    let modal = document.getElementById('shop-modal');
    let shopBtn = document.getElementById('shop-btn');
    if (!modal) return;

    let isOpen = modal.style.display === 'block';
    if (isOpen) {
        modal.style.display = 'none';
        if (shopBtn) shopBtn.style.display = 'inline-block';
    } else {
        modal.style.display = 'block';
        if (shopBtn) shopBtn.style.display = 'none';
    }
}

function isCoreOwnedBy(coreId, team) {
    let core = goldCores.find(gc => gc.id === coreId);
    if (!core) return false;
    if (core.isBase && core.teamBase === team) {
        if (!core.owner || core.owner === team) return true;
    }
    return core.owner === team;
}

function getLegalGroupsForUnit(activeTeam, unitType) {
    let groups = [];
    let occupied = (c, r) => typeof units !== 'undefined' && units.some(u => u.gridX === c && u.gridY === r);
    
    let isValidTileForUnit = (c, r) => {
        if (occupied(c, r)) return false;
        if (typeof isWaterTile === 'function' && unitType !== 'ship' && unitType !== 'mines' && unitType !== 'plane' && isWaterTile(c, r)) {
            return false;
        }
        if (typeof isWaterTile === 'function' && (unitType === 'ship' || unitType === 'mines') && !isWaterTile(c, r)) {
            return false;
        }
        return true;
    };

    let checkConfigArray = (configArray) => {
        configArray.forEach(sq => {
            if (isCoreOwnedBy(sq.anchorCore, activeTeam) && isValidTileForUnit(sq.c, sq.r)) {
                let coreObj = goldCores.find(gc => gc.id === sq.anchorCore);
                let coreName = coreObj ? getCustomCoreName(coreObj.id, coreObj.isBase, coreObj.teamBase) : `${activeTeam.toUpperCase()} Base`;
                groups.push({ name: coreName, tiles: [{ c: sq.c, r: sq.r }] });
            }
        });
    };

    if (unitType === 'tank') {
        checkConfigArray(spawnConfig.tanks);
    } else if (unitType === 'artillery') {
        checkConfigArray(spawnConfig.artillery);
    } else if (unitType === 'ship') {
        checkConfigArray(spawnConfig.naval);
    } else if (unitType === 'engineer') {
        checkConfigArray(spawnConfig.engineer);
    } else if (unitType === 'plane') {
        checkConfigArray(spawnConfig.plane);
    } else if (unitType === 'antiair') {
        checkConfigArray(spawnConfig.antiair);
    } else if (unitType === 'mines') {
        checkConfigArray(spawnConfig.mines);
    } else if (unitType === 'infantry') {
        let baseCoreId = activeTeam === 'blue' ? 'bbc' : 'rbc';
        let baseCoreObj = goldCores.find(gc => gc.id === baseCoreId);
        if (isCoreOwnedBy(baseCoreId, activeTeam)) {
            let baseSquares = getBaseSquares(activeTeam).filter(sq => isValidTileForUnit(sq.c, sq.r));
            if (baseSquares.length > 0) {
                let baseDisplayName = baseCoreObj ? getCustomCoreName(baseCoreObj.id, baseCoreObj.isBase, baseCoreObj.teamBase) : `${activeTeam.toUpperCase()} Base`;
                groups.push({ name: baseDisplayName, tiles: baseSquares });
            }
        }

        goldCores.forEach(core => {
            if (!core.isBase && core.owner === activeTeam) {
                let coreTiles = [];
                if (isValidTileForUnit(core.c, core.r)) coreTiles.push({ c: core.c, r: core.r });
                if (core.captureZones) {
                    core.captureZones.forEach(zone => {
                        if (isValidTileForUnit(zone.c, zone.r)) coreTiles.push({ c: zone.c, r: zone.r });
                    });
                }
                if (coreTiles.length > 0) {
                    groups.push({ name: getCustomCoreName(core.id, core.isBase, core.teamBase), tiles: coreTiles });
                }
            }
        });
    }

    return groups;
}

function buyUnit(unitType, team = currentTurn) {
    let cost = 1;
    if (unitType === 'artillery' || unitType === 'ship' || unitType === 'engineer' || unitType === 'antiair') cost = 2;
    if (unitType === 'plane' || unitType === 'mines') cost = 3;

    if (team === 'blue' && blueCoins < cost) {
        alert("Not enough Blue coins!");
        return;
    }
    if (team === 'red' && redCoins < cost) {
        alert("Not enough Red coins!");
        return;
    }

    let groups = getLegalGroupsForUnit(team, unitType);
    if (groups.length === 0) {
        alert("No available deployment slots or core territories for this unit type!");
        return;
    }

    toggleShop();
    openDeploymentModal(unitType, cost, groups, team);
}

function openDeploymentModal(unitType, cost, groups, team) {
    let existingModal = document.getElementById('deployment-modal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'deployment-modal';
    modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(20, 20, 20, 0.95); border: 2px solid #3498db; padding: 24px;
        border-radius: 10px; width: 380px; max-height: 80vh; overflow-y: auto; z-index: 100;
        box-shadow: 0 10px 25px rgba(0,0,0,0.8); color: white; font-family: sans-serif;
    `;

    let html = `<h3 style="margin-top:0; color:#3498db; text-align:center;">Deploy ${unitType.toUpperCase()} (${team.toUpperCase()})</h3>`;
    html += `<p style="text-align:center; color:#aaa; font-size:14px;">Cost: ${cost} Gold | Select a Territory:</p>`;
    
    html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">`;
    groups.forEach((g, idx) => {
        html += `<button class="deploy-group-btn" data-index="${idx}" style="
            background: #262626; color: white; border: 1px solid #444; padding: 12px;
            border-radius: 6px; cursor: pointer; font-weight: bold; text-align: left;
            display: flex; justify-content: space-between; align-items: center;
        ">
            <span>📍 ${g.name}</span>
            <span style="font-size:12px; color:#2ecc71;">(${g.tiles.length} slots)</span>
        </button>`;
    });
    html += `</div>`;
    html += `<button id="cancel-deploy" style="width:100%; background:#c0392b; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">Cancel</button>`;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.querySelectorAll('.deploy-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let idx = parseInt(e.currentTarget.getAttribute('data-index'));
            let selectedGroup = groups[idx];
            modal.remove();
            executeUnitDeployment(unitType, cost, selectedGroup, team);
        });
    });

    document.getElementById('cancel-deploy').addEventListener('click', () => {
        modal.remove();
        clearDeploymentHighlights();
    });
}

function executeUnitDeployment(unitType, cost, group, team) {
    if (group.tiles.length === 0) {
        alert("No valid tiles in this group.");
        return;
    }

    if (team === 'blue') blueCoins -= cost;
    else redCoins -= cost;
    updateGameHUD();

    let targetTile = group.tiles[0];
    if (group.tiles.length > 1) {
        highlightedTiles = group.tiles;
        activeDeployment = { unitType: unitType, team: team };
        alert(`Click one of the highlighted green tiles on the map to place your ${unitType}.`);
        return;
    }

    spawnUnitOnTile(unitType, targetTile.c, targetTile.r, team);
}

function spawnUnitOnTile(unitType, c, r, team = 'blue') {
    let imgObj = new Image();
    let teamFolder = team === 'blue' ? 'blue' : 'red';
    
    let fileNameMap = {
        'infantry': 'infantry.png',
        'tank': 'tank.png',
        'artillery': 'artillery.png',
        'ship': 'ship.png',
        'engineer': 'engineer.png',
        'plane': 'plane.png',
        'antiair': 'antiair.png',
        'mines': 'mines.png'
    };

    imgObj.src = `images/${teamFolder}/${fileNameMap[unitType] || 'infantry.png'}`;

    let newUnit = {
        name: `${team.charAt(0).toUpperCase() + team.slice(1)} ${unitType.charAt(0).toUpperCase() + unitType.slice(1)}`,
        type: (unitType === 'ship' || unitType === 'mines') ? 'water' : 'land',
        gridX: c,
        gridY: r,
        x: c * cellSize,
        y: r * cellSize,
        renderX: c * cellSize,
        renderY: r * cellSize,
        range: unitType === 'tank' ? 3 : (unitType === 'infantry' ? 2 : (unitType === 'plane' ? 5 : 1)),
        team: team,
        img: imgObj
    };

    if (typeof units !== 'undefined') {
        units.push(newUnit);
    }
    clearDeploymentHighlights();
    TeamLog.success(`Successfully deployed ${unitType} for ${team} at (${c}, ${r})`);
}

function clearDeploymentHighlights() {
    highlightedTiles = [];
    activeDeployment = null;
}

function processTurnIncomeAndCaptures() {
    goldCores.forEach(core => {
        if (core.captureZones) {
            let occupyingUnit = null;
            if (typeof units !== 'undefined') {
                occupyingUnit = units.find(u => core.captureZones.some(z => z.c === u.gridX && z.r === u.gridY));
            }
            if (occupyingUnit) {
                let unitTeam = getTeamFromUnit(occupyingUnit);
                if (core.owner !== unitTeam) {
                    core.owner = unitTeam;
                    flagAnimations[core.id] = { startTime: performance.now(), duration: 1000 };
                    TeamLog.info(`Core ${core.id} captured by ${unitTeam}!`);

                    // Award 1 coin strictly upon successful capture or recapture
                    if (unitTeam === 'blue') {
                        blueCoins += 1;
                    } else if (unitTeam === 'red') {
                        redCoins += 1;
                    }
                }
            }
        }
    });

    updateGameHUD();
}
