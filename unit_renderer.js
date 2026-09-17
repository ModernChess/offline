// =========================================================================
// UNIT RENDERING & ANIMATION LOOP CONTROLLER
// =========================================================================

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cameraX, cameraY);
    ctx.scale(cameraZoom, cameraZoom);

    if (typeof mapLoaded !== 'undefined' && mapLoaded && typeof mapImg !== 'undefined' && mapImg) {
        ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
    } else if (typeof drawCustomGridBoard === 'function') {
        drawCustomGridBoard();
    } else {
        ctx.fillStyle = '#1b263b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (typeof drawTeamUIAndFlags === 'function') {
        drawTeamUIAndFlags();
    }

    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        let p = smokeParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.radius += (p.maxRadius - p.radius) * 0.05;
        p.life -= p.decay;
        p.alpha = Math.max(0, p.life * 0.3);

        if (p.life <= 0) {
            smokeParticles.splice(i, 1);
        } else {
            ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 3.5;
    units.forEach(u => {
        let uName = u.name || '';
        if (u && u.showRange && (uName.includes('Engineer') || uName.includes('Artillery') || uName.includes('Ship') || uName.includes('Anti-Air') || uName.includes('Mines'))) {
            ctx.save();
            if (uName.includes('Mines')) {
                ctx.strokeStyle = '#9b59b6';
                ctx.lineWidth = 4;
            }
            let combatRanges = getUnitCombatRange(u);
            combatRanges.forEach(sq => {
                let isUnifiedRectUnit = uName.includes('Ship') || uName.includes('Artillery') || uName.includes('Engineer') || uName.includes('Anti-Air') || uName.includes('Mines');

                if (isUnifiedRectUnit) {
                    ctx.save();
                    ctx.globalAlpha = 0.6;
                    let px = sq.startC * cellSize;
                    let py = sq.startR * cellSize;
                    let pWidth = (sq.endC - sq.startC + 1) * cellSize;
                    let pHeight = (sq.endR - sq.startR + 1) * cellSize;

                    let grad = ctx.createLinearGradient(px, py, px, py + pHeight);
                    if (uName.includes('Engineer')) {
                        grad.addColorStop(0, '#555555');
                        grad.addColorStop(1, '#333333');
                    } else if (uName.includes('Anti-Air')) {
                        grad.addColorStop(0, '#ccffff');
                        grad.addColorStop(1, '#66cccc');
                    } else {
                        grad.addColorStop(0, '#ffcccc');
                        grad.addColorStop(1, '#e69999');
                    }
                    ctx.fillStyle = grad;
                    ctx.fillRect(px + 2, py + 2, pWidth - 4, pHeight - 4);
                    ctx.restore();
                } else {
                    let px = sq.startC * cellSize;
                    let py = sq.startR * cellSize;
                    let pWidth = (sq.endC - sq.startC + 1) * cellSize;
                    let pHeight = (sq.endR - sq.startR + 1) * cellSize;
                    ctx.strokeRect(px + 2, py + 2, pWidth - 4, pHeight - 4);
                }

                if (uName.includes('Engineer')) {
                    for (let subC = sq.startC; subC <= sq.endC; subC++) {
                        for (let subR = sq.startR; subR <= sq.endR; subR++) {
                            if (validateCoordinates(subC, subR)) {
                                if (isTileWater(subC, subR)) {
                                    let dotX = subC * cellSize + cellSize / 2;
                                    let dotY = subR * cellSize + cellSize / 2;
                                    let dotRadius = cellSize * 0.15;

                                    ctx.save();
                                    ctx.globalAlpha = 0.55; 
                                    ctx.fillStyle = '#00ffff'; 
                                    ctx.strokeStyle = '#000000'; 
                                    ctx.lineWidth = 1.5;

                                    ctx.beginPath();
                                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                                    ctx.fill();
                                    ctx.stroke();
                                    ctx.restore();
                                }
                            }
                        }
                    }
                }

                if (uName.includes('Mines')) {
                    let unitOnWater = isTileWater(u.gridX, u.gridY);
                    for (let subC = sq.startC; subC <= sq.endC; subC++) {
                        for (let subR = sq.startR; subR <= sq.endR; subR++) {
                            if (validateCoordinates(subC, subR)) {
                                let targetIsWater = isTileWater(subC, subR);
                                if (!unitOnWater && !targetIsWater) {
                                    let dotX = subC * cellSize + cellSize / 2;
                                    let dotY = subR * cellSize + cellSize / 2;
                                    let dotRadius = cellSize * 0.15;

                                    ctx.save();
                                    ctx.globalAlpha = 0.55; 
                                    ctx.fillStyle = '#1e8449'; 
                                    ctx.strokeStyle = '#000000'; 
                                    ctx.lineWidth = 1.5;

                                    ctx.beginPath();
                                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                                    ctx.fill();
                                    ctx.stroke();
                                    ctx.restore();
                                } else if (unitOnWater && targetIsWater) {
                                    let dotX = subC * cellSize + cellSize / 2;
                                    let dotY = subR * cellSize + cellSize / 2;
                                    let dotRadius = cellSize * 0.15;

                                    ctx.save();
                                    ctx.globalAlpha = 0.55; 
                                    ctx.fillStyle = '#00ffff'; 
                                    ctx.strokeStyle = '#000000'; 
                                    ctx.lineWidth = 1.5;

                                    ctx.beginPath();
                                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                                    ctx.fill();
                                    ctx.stroke();
                                    ctx.restore();
                                }
                            }
                        }
                    }
                }
            });
            ctx.restore();
        }
    });

    units.forEach(u => {
        let targetX = u.gridX * cellSize;
        let targetY = u.gridY * cellSize;
        
        let prevX = u.x !== undefined ? u.x : targetX;
        let prevY = u.y !== undefined ? u.y : targetY;

        u.x = typeof lerp === 'function' ? lerp(u.x, targetX, 0.05) : targetX;
        u.y = typeof lerp === 'function' ? lerp(u.y, targetY, 0.05) : targetY;

        u.renderX = u.x;
        u.renderY = u.y;

        spawnSmokeTrail(u, prevX, prevY);

        let floatOffset = 0;
        if (selectedUnit && selectedUnit === u && selectionAnimStartTime !== null) {
            let elapsed = performance.now() - selectionAnimStartTime;
            let duration = 1500; 
            
            if (elapsed < duration) {
                let progress = elapsed / duration;
                if (progress < 0.5) {
                    let p = progress / 0.5;
                    floatOffset = -Math.sin(p * (Math.PI / 2)) * 10;
                } else {
                    let p = (progress - 0.5) / 0.5;
                    floatOffset = -10 * Math.cos(p * Math.PI) * (1 - p) + 2 * Math.sin(p * Math.PI) * (1 - p);
                }
                u.renderY += floatOffset;
            }
        }

        ctx.save();
        let shadowX = u.renderX + cellSize / 2 + 3; 
        let shadowY = u.renderY + cellSize - 6;
        let heightFactor = Math.max(0.4, 1 - (Math.abs(floatOffset) / 15)); 
        let shadowRadiusX = cellSize * 0.32 * heightFactor;
        let shadowRadiusY = cellSize * 0.14 * heightFactor;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * heightFactor})`;
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    let aaConnectedSet = getAntiAirConnectedUnits();
    ctx.save();
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 5.5;
    if (ctx.setLineDash) {
        ctx.setLineDash([8, 5]);
    }
    aaConnectedSet.forEach(u => {
        ctx.strokeRect(u.renderX + 2, u.renderY + 2, cellSize - 4, cellSize - 4);
    });
    ctx.restore();

    if (selectedUnit) {
        let isEngineer = (selectedUnit.name || '').includes('Engineer');
        let isArtillery = (selectedUnit.name || '').includes('Artillery');
        let isAntiAir = (selectedUnit.name || '').includes('Anti-Air');
        let unitShowRange = selectedUnit.showRange || false;

        let activeTurn = typeof currentTurn !== 'undefined' ? currentTurn : 'red';
        let isCurrentTeamTurn = getTeamFromUnit(selectedUnit) === activeTurn;

        if (isCurrentTeamTurn && (!unitShowRange || isEngineer || isArtillery || isAntiAir)) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            
            legalMoves.forEach(m => {
                let px = m.c * cellSize + 6;
                let py = m.r * cellSize + 6;
                let pSize = cellSize - 12;

                ctx.fillStyle = '#ff8000';
                ctx.fillRect(px, py, pSize, pSize);

                let centerX = m.c * cellSize + cellSize / 2;
                let centerY = m.r * cellSize + cellSize / 2;
                let radius = cellSize * 0.18;

                ctx.fillStyle = '#e74c3c';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.restore();
        }

        if (isCurrentTeamTurn) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 4;
            ctx.strokeRect(selectedUnit.renderX + 2, selectedUnit.renderY + 2, cellSize - 4, cellSize - 4);

            if ((selectedUnit.name || '').includes('Ship') || isArtillery || isEngineer || isAntiAir || (selectedUnit.name || '').includes('Mines')) {
                let btnX = selectedUnit.renderX + cellSize + 12;
                let btnY = selectedUnit.renderY - 12;
                let btnSize = cellSize * 0.85;
                
                ctx.fillStyle = unitShowRange ? '#c0392b' : '#e74c3c';
                ctx.fillRect(btnX, btnY, btnSize, btnSize);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnSize, btnSize);

                ctx.beginPath();
                ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize * 0.25, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    if (targetTile) {
        let isEngineer = selectedUnit && (selectedUnit.name || '').includes('Engineer');
        let isArtillery = selectedUnit && (selectedUnit.name || '').includes('Artillery');
        let isAntiAir = selectedUnit && (selectedUnit.name || '').includes('Anti-Air');
        let unitShowRange = selectedUnit && selectedUnit.showRange;
        if (!unitShowRange || isEngineer || isArtillery || isAntiAir) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.strokeRect(targetTile.c * cellSize + 2, targetTile.r * cellSize + 2, cellSize - 4, cellSize - 4);
        }
    }

    units.forEach(u => {
        if (u.loaded && u.loaded()) {
            ctx.drawImage(u.img, u.renderX + 2, u.renderY + 2, cellSize - 4, cellSize - 4);
        } else {
            ctx.fillStyle = u.team === 'blue' ? '#3498db' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(u.renderX + cellSize / 2, u.renderY + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.restore();

    requestAnimationFrame(update);
}

SystemLog.info('Unit renderer loop controller initialized successfully.');
update();
