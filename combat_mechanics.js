// =========================================================================
// COMBAT MECHANICS, SUPERUNITS, & ARTILLERY CONTROLLER
// =========================================================================

function getSuperunitsForTeam(teamName, allUnits) {
    let teamUnits = allUnits.filter(u => getTeamFromUnit(u) === teamName);
    let combatUnits = teamUnits.filter(u => !isSpecialUnit(u) && getUnitPower(u) !== Infinity && !(u.name || '').toLowerCase().includes('plane'));
    let specialUnits = teamUnits.filter(u => isSpecialUnit(u) || getUnitPower(u) === Infinity || (u.name || '').toLowerCase().includes('plane'));
    let superunits = [];
    let visited = new Set();

    combatUnits.forEach(unit => {
        if (visited.has(unit)) return;
        let cluster = [];
        let queue = [unit];
        visited.add(unit);

        while (queue.length > 0) {
            let curr = queue.shift();
            cluster.push(curr);

            combatUnits.forEach(other => {
                if (!visited.has(other)) {
                    let touching = areUnitsAdjacent(curr, other);
                    let sharingEnemyBridge = false;
                    if (!touching) {
                        sharingEnemyBridge = allUnits.some(enemy => 
                            getTeamFromUnit(enemy) !== teamName && areUnitsAdjacent(curr, enemy) && areUnitsAdjacent(other, enemy)
                        );
                    }
                    if (touching || sharingEnemyBridge) {
                        visited.add(other);
                        queue.push(other);
                    }
                }
            });
        }

        let totalPower = cluster.reduce((sum, u) => sum + getUnitPower(u), 0);
        
        goldCores.forEach(core => {
            if (core.owner === teamName) {
                let supportingUnitInZone = cluster.some(u => core.captureZones.some(z => z.c === u.gridX && z.r === u.gridY) || (u.gridX === core.c && u.gridY === core.r));
                if (supportingUnitInZone) {
                    superunits.push({
                        units: cluster,
                        power: totalPower,
                        isSpecial: false,
                        isSpecialSuperunit: true,
                        core: core,
                        team: teamName
                    });
                    return;
                }
            }
        });

        superunits.push({
            units: cluster,
            power: totalPower,
            isSpecial: false,
            isSpecialSuperunit: false,
            team: teamName
        });
    });

    specialUnits.forEach(sp => {
        let isPlaneUnit = (sp.name || '').toLowerCase().includes('plane');
        superunits.push({
            units: [sp],
            power: isPlaneUnit ? 0 : getUnitPower(sp),
            isSpecial: true,
            isSpecialSuperunit: false,
            team: teamName
        });
    });

    return superunits;
}

function isUnitLockedInStalemate(unit, allUnits) {
    if ((unit.name || '').toLowerCase().includes('plane')) return false;
    if (isSpecialUnit(unit) || getUnitPower(unit) === Infinity) return false;
    let team = getTeamFromUnit(unit);
    let enemyTeam = team === 'blue' ? 'red' : 'blue';
    let mySuList = getSuperunitsForTeam(team, allUnits);
    let enemySuList = getSuperunitsForTeam(enemyTeam, allUnits);

    let mySu = mySuList.find(su => su.units.includes(unit));
    if (!mySu) return false;

    for (let oSu of enemySuList) {
        let inContact = mySu.units.some(u1 => oSu.units.some(u2 => areUnitsAdjacent(u1, u2)));
        if (inContact && mySu.power === oSu.power) {
            return true;
        }
    }
    return false;
}

function getProtectedAntiAirNetworks(allUnits, unitsToDestroy) {
    let protectedUnitsSet = new Set();
    let antiAirUnits = allUnits.filter(u => (u.name || '').toLowerCase().includes('anti-air'));

    antiAirUnits.forEach(aa => {
        let connectedUnits = new Set();
        connectedUnits.add(aa);

        let added = true;
        while (added) {
            added = false;
            allUnits.forEach(u => {
                if (!connectedUnits.has(u)) {
                    let uTeam = getTeamFromUnit(u);
                    let aaTeam = getTeamFromUnit(aa);
                    
                    if (uTeam === aaTeam) {
                        for (let connectedU of connectedUnits) {
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

        connectedUnits.forEach(cu => protectedUnitsSet.add(cu));

        let aaCombatRanges = getUnitCombatRange(aa);
        let aaTeam = getTeamFromUnit(aa);

        allUnits.forEach(otherUnit => {
            let oName = (otherUnit.name || '').toLowerCase();
            if (oName.includes('plane') && getTeamFromUnit(otherUnit) !== aaTeam) {
                let inRange = aaCombatRanges.some(rangeBox => 
                    otherUnit.gridX >= rangeBox.startC && otherUnit.gridX <= rangeBox.endC &&
                    otherUnit.gridY >= rangeBox.startR && otherUnit.gridY <= rangeBox.endR
                );

                let touchingConnected = false;
                connectedUnits.forEach(connU => {
                    if (connU !== otherUnit && (areUnitsAdjacent(connU, otherUnit) || (connU.gridX === otherUnit.gridX && connU.gridY === otherUnit.gridY))) {
                        touchingConnected = true;
                    }
                });

                if (inRange || touchingConnected) {
                    console.log(`[INFO][combat_mechanics]: Plane unit '${otherUnit.name}' at (${otherUnit.gridX}, ${otherUnit.gridY}) is set for destruction by Anti-Air network.`);
                    unitsToDestroy.add(otherUnit);
                }
            }
        });
    });

    return protectedUnitsSet;
}

function updateEngineerMineSweeping(allUnits, unitsToDestroy) {
    allUnits.forEach(engineer => {
        let eName = (engineer.name || '').toLowerCase();
        if (eName.includes('engineer') && engineer.showRange) {
            let engineerCombatRanges = getUnitCombatRange(engineer);
            let engineerTeam = getTeamFromUnit(engineer);

            allUnits.forEach(otherUnit => {
                let oName = (otherUnit.name || '').toLowerCase();
                if (oName.includes('mines') && getTeamFromUnit(otherUnit) !== engineerTeam) {
                    let inRange = engineerCombatRanges.some(rangeBox => 
                        otherUnit.gridX >= rangeBox.startC && otherUnit.gridX <= rangeBox.endC &&
                        otherUnit.gridY >= rangeBox.startR && otherUnit.gridY <= rangeBox.endR
                    );

                    if (inRange) {
                        unitsToDestroy.add(otherUnit);
                        console.log(`[INFO][combat_mechanics]: Engineer range at (${engineer.gridX}, ${engineer.gridY}) swept and destroyed enemy mine at (${otherUnit.gridX}, ${otherUnit.gridY}).`);
                    }
                }
            });
        }
    });
}

function updateArtillerySystem(allUnits, unitsToDestroy) {
    allUnits.forEach(artillery => {
        let aName = (artillery.name || '').toLowerCase();
        if (aName.includes('artillery')) {
            if (artillery.lastGridX !== artillery.gridX || artillery.lastGridY !== artillery.gridY) {
                artillery.hasCheckedRange = false;
                artillery.lastGridX = artillery.gridX;
                artillery.lastGridY = artillery.gridY;
            }

            if (artillery.hasCheckedRange) return;

            let combatRanges = getUnitCombatRange(artillery);
            let artilleryTeam = getTeamFromUnit(artillery);
            let evaluatedAny = false;

            allUnits.forEach(targetUnit => {
                let targetTeam = getTeamFromUnit(targetUnit);
                if (targetTeam !== artilleryTeam) {
                    let inRange = combatRanges.some(rangeBox => 
                        targetUnit.gridX >= rangeBox.startC && targetUnit.gridX <= rangeBox.endC &&
                        targetUnit.gridY >= rangeBox.startR && targetUnit.gridY <= rangeBox.endR
                    );

                    if (inRange) {
                        evaluatedAny = true;
                        let roll = Math.random();
                        let success = roll < 0.35;

                        if (success) {
                            unitsToDestroy.add(targetUnit);
                            console.log(`[INFO][combat_mechanics]: Artillery at (${artillery.gridX}, ${artillery.gridY}) SUCCESS (Roll: ${roll.toFixed(2)}): Marked unit '${targetUnit.name}' at (${targetUnit.gridX}, ${targetUnit.gridY}) for destruction.`);
                        } else {
                            console.log(`[INFO][combat_mechanics]: Artillery at (${artillery.gridX}, ${artillery.gridY}) FAILURE (Roll: ${roll.toFixed(2)}): Unit '${targetUnit.name}' at (${targetUnit.gridX}, ${targetUnit.gridY}) avoided strike.`);
                        }
                    }
                }
            });

            if (evaluatedAny) {
                artillery.hasCheckedRange = true;
            }
        }
    });
}

function updatePlaneTouchHighlights(allUnits, unitsToDestroy, protectedAntiAirSet) {
    allUnits.forEach(u => {
        u.isHighlightedByPlane = false;
    });

    allUnits.forEach(plane => {
        let pName = (plane.name || '').toLowerCase();
        if (pName.includes('plane')) {
            allUnits.forEach(otherUnit => {
                if (getTeamFromUnit(otherUnit) !== getTeamFromUnit(plane)) {
                    if (protectedAntiAirSet.has(otherUnit)) {
                        return; 
                    }

                    let oName = (otherUnit.name || '').toLowerCase();
                    if (oName.includes('ship') || oName.includes('mines')) {
                        return;
                    }

                    if (areUnitsAdjacent(plane, otherUnit) || (otherUnit.gridX === plane.gridX && otherUnit.gridY === plane.gridY)) {
                        otherUnit.isHighlightedByPlane = true;
                        unitsToDestroy.add(otherUnit);
                        console.log(`[INFO][combat_mechanics]: Unit touched by plane -> Name: ${otherUnit.name}, Coordinates: (${otherUnit.gridX}, ${otherUnit.gridY}) added to destruction queue.`);
                    }
                }
            });
        }
    });
}

function resolveUnitInteractions(allUnits) {
    let unitsToDestroy = new Set();

    let protectedAntiAirSet = getProtectedAntiAirNetworks(allUnits, unitsToDestroy);
    updateEngineerMineSweeping(allUnits, unitsToDestroy);
    updateArtillerySystem(allUnits, unitsToDestroy);

    let blueSuList = getSuperunitsForTeam('blue', allUnits);
    let redSuList = getSuperunitsForTeam('red', allUnits);

    blueSuList.forEach(bSu => {
        redSuList.forEach(rSu => {
            let touching = bSu.units.some(bu => rSu.units.some(ru => areUnitsAdjacent(bu, ru) || (bu.gridX === ru.gridX && bu.gridY === ru.gridY)));
            if (touching) {
                if (bSu.power === Infinity && rSu.power === Infinity) {
                    bSu.units.forEach(u => {
                        if (!(u.name || '').toLowerCase().includes('plane')) unitsToDestroy.add(u);
                    });
                    rSu.units.forEach(u => {
                        if (!(u.name || '').toLowerCase().includes('plane')) unitsToDestroy.add(u);
                    });
                } else if (bSu.power > rSu.power) {
                    rSu.units.forEach(u => {
                        if (!(u.name || '').toLowerCase().includes('plane')) unitsToDestroy.add(u);
                    });
                } else if (rSu.power > bSu.power) {
                    bSu.units.forEach(u => {
                        if (!(u.name || '').toLowerCase().includes('plane')) unitsToDestroy.add(u);
                    });
                }
            }
        });
    });

    allUnits.forEach(ship => {
        let shipName = (ship.name || '').toLowerCase();
        if (shipName.includes('ship')) {
            let combatRanges = getUnitCombatRange(ship);
            allUnits.coreRangeHitCheck = true;
            allUnits.forEach(targetUnit => {
                if (getTeamFromUnit(targetUnit) !== getTeamFromUnit(ship)) {
                    let targetName = (targetUnit.name || '').toLowerCase();
                    if (targetName.includes('ship') || targetName.includes('plane') || targetName.includes('mines')) return;

                    let inRange = combatRanges.some(rangeBox => 
                        targetUnit.gridX >= rangeBox.startC && targetUnit.gridX <= rangeBox.endC &&
                        targetUnit.gridY >= rangeBox.startR && targetUnit.gridY <= rangeBox.endR
                    );
                    if (inRange) {
                        unitsToDestroy.add(targetUnit);
                    }
                }
            });
        }
    });

    allUnits.forEach(mine => {
        let mineName = (mine.name || '').toLowerCase();
        if (mineName.includes('mines')) {
            let combatRanges = getUnitCombatRange(mine);
            let mineOnWater = typeof isTileWater === 'function' ? isTileWater(mine.gridX, mine.gridY) : false;
            let mineTeam = getTeamFromUnit(mine);

            allUnits.forEach(targetUnit => {
                let targetTeam = getTeamFromUnit(targetUnit);
                if (targetTeam !== mineTeam) {
                    let targetName = (targetUnit.name || '').toLowerCase();
                    
                    if (targetName.includes('plane') || targetName.includes('engineer')) {
                        return;
                    }

                    let inRange = combatRanges.some(rangeBox => 
                        targetUnit.gridX >= rangeBox.startC && targetUnit.gridX <= rangeBox.endC &&
                        targetUnit.gridY >= rangeBox.startR && targetUnit.gridY <= rangeBox.endR
                    );

                    if (inRange) {
                        let targetOnWater = typeof isTileWater === 'function' ? isTileWater(targetUnit.gridX, targetUnit.gridY) : false;

                        if (!mineOnWater && !targetOnWater) {
                            unitsToDestroy.add(targetUnit);
                            console.log(`[INFO][combat_mechanics]: Land mine at (${mine.gridX}, ${mine.gridY}) detonated on land unit '${targetUnit.name}' at (${targetUnit.gridX}, ${targetUnit.gridY}).`);
                        } else if (mineOnWater && targetOnWater) {
                            unitsToDestroy.add(targetUnit);
                            console.log(`[INFO][combat_mechanics]: Water mine at (${mine.gridX}, ${mine.gridY}) detonated on water unit '${targetUnit.name}' at (${targetUnit.gridX}, ${targetUnit.gridY}).`);
                        }
                    }
                }
            });
        }
    });

    updatePlaneTouchHighlights(allUnits, unitsToDestroy, protectedAntiAirSet);

    if (unitsToDestroy.size > 0) {
        commitUnitDestruction(allUnits, unitsToDestroy);
    }

    checkWinConditions(allUnits);
}

function tryMoveUnit(unit, newC, newR) {
    if (gameOver || !unit) return false;
    if (isUnitLockedInStalemate(unit, units)) {
        return false;
    }

    let movingTeam = getTeamFromUnit(unit);
    let movingPower = getUnitPower(unit);

    goldCores.forEach(core => {
        let inZone = core.captureZones.some(z => z.c === newC && z.r === newR) || (core.c === newC && core.r === newR);

        if (inZone) {
            let defendingTeam = core.owner;
            
            if (defendingTeam !== movingTeam) {
                if (defendingTeam && defendingTeam !== movingTeam) {
                    let defenderSu = getSuperunitsForTeam(defendingTeam, units).find(su => su.core === core || su.units.some(u => core.captureZones.some(z => z.c === u.gridX && z.r === u.gridY)));
                    let defenderPower = defenderSu ? defenderSu.power : 0;

                    if (movingPower > defenderPower) {
                        core.owner = movingTeam;
                        if (movingTeam === 'blue') blueCoins++;
                        else redCoins++;
                        flagAnimations[core.id] = performance.now();
                    } else {
                        let directlyConnectedToDefenderUnits = units.some(defU => getTeamFromUnit(defU) === defendingTeam && areUnitsAdjacent(unit, defU));
                        if (directlyConnectedToDefenderUnits) {
                            unitsToDestroy.add(unit);
                        }
                    }
                } else if (!defendingTeam) {
                    core.owner = movingTeam;
                    if (movingTeam === 'blue') blueCoins++;
                    else redCoins++;
                    flagAnimations[core.id] = performance.now();
                }
            }
        }
    });

    unit.gridX = newC;
    unit.gridY = newR;

    resolveUnitInteractions(units);
    return true;
}
