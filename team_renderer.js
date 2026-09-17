// Independent Audio & Visual Effects Configuration Tables
const coinAudioConfig = {
    startTime: 3,          
    endTime: 4,            
    maxVolume: 0,          
    fadeInDuration: 0.5,     
    fadeOutDuration: 0.5     
};

const fireAudioConfig = {
    startTime: 0,          
    endTime: 5.0,            
    maxVolume: 0.2,          
    fadeInDuration: 0,     
    fadeOutDuration: 0.5     
};

function processAudioEffect(audioElement, fireElapsed, config) {
    let audioElapsed = fireElapsed / 1000;
    
    if (audioElapsed >= config.startTime && audioElapsed <= config.endTime) {
        let currentVol = config.maxVolume;
        let fadeInEnd = config.startTime + config.fadeInDuration;
        let fadeOutStart = config.endTime - config.fadeOutDuration;

        if (audioElapsed < fadeInEnd) {
            let progress = (audioElapsed - config.startTime) / config.fadeInDuration;
            currentVol = progress * config.maxVolume;
        } else if (audioElapsed > fadeOutStart) {
            let progress = (config.endTime - audioElapsed) / config.fadeOutDuration;
            currentVol = progress * config.maxVolume;
        }

        audioElement.volume = Math.max(0, Math.min(config.maxVolume, currentVol));
    } else if (audioElapsed > config.endTime) {
        audioElement.pause();
    }
}

function drawTeamUIAndFlags() {
    let now = performance.now();

    if (activeDeployment && activeDeployment.legalGroups) {
        activeDeployment.legalGroups.forEach(group => {
            group.tiles.forEach(sq => {
                ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
                ctx.fillRect(sq.c * cellSize, sq.r * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(sq.c * cellSize, sq.r * cellSize, cellSize, cellSize);
            });
        });
    }

    if (highlightedTiles && highlightedTiles.length > 0) {
        highlightedTiles.forEach(sq => {
            ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
            ctx.fillRect(sq.c * cellSize, sq.r * cellSize, cellSize, cellSize);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(sq.c * cellSize, sq.r * cellSize, cellSize, cellSize);
        });
    }

    updateGameHUD();

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(winnerMessage, canvas.width / 2, canvas.height / 2);
        return;
    }

    goldCores.forEach(core => {
        let cx = core.c * cellSize + cellSize / 2;
        let cy = core.r * cellSize + cellSize / 2;

        if (core.owner) {
            ctx.fillStyle = core.owner === 'blue' ? '#3498db' : '#e74c3c';
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }

        if (flagAnimations[core.id]) {
            let elapsed = now - flagAnimations[core.id];
            let duration = 500;
            if (elapsed < duration) {
                let progress = elapsed / duration;
                let dropOffset = (1 - Math.cos(progress * Math.PI * 0.5)) * (cellSize * 1.5);
                let renderY = cy - (cellSize * 1.5) + dropOffset;

                ctx.fillStyle = core.owner === 'blue' ? '#2980b9' : '#c0392b';
                ctx.fillRect(cx - 4, renderY, 8, cellSize * 0.8);
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.moveTo(cx + 4, renderY);
                ctx.lineTo(cx + 16, renderY + 6);
                ctx.lineTo(cx + 4, renderY + 12);
                ctx.fill();
            } else {
                delete flagAnimations[core.id];
                coreFires[core.id] = now;
                
                coinAudio.currentTime = coinAudioConfig.startTime;
                fireAudio.currentTime = fireAudioConfig.startTime;
                coinAudio.volume = 0;
                fireAudio.volume = 0;
                coinAudio.play();
                fireAudio.play();
            }
        }

      if (coreFires[core.id]) {
            let fireElapsed = now - coreFires[core.id];
            let fireDuration = 5000;
            
            processAudioEffect(coinAudio, fireElapsed, coinAudioConfig);
            processAudioEffect(fireAudio, fireElapsed, fireAudioConfig);

            if (fireElapsed < fireDuration) {
                let fireProgress = fireElapsed / fireDuration;
                
                let fireAlpha = 0.85;
                if (fireElapsed < 600) {
                    fireAlpha = (fireElapsed / 600) * 0.85;
                } else if (fireDuration - fireElapsed < 1000) {
                    fireAlpha = ((fireDuration - fireElapsed) / 1000) * 0.85;
                }

                ctx.save();
                ctx.globalAlpha = fireAlpha;

                let pulse = Math.sin(now * 0.015) * 3;

                ctx.fillStyle = '#d35400';
                ctx.beginPath();
                ctx.moveTo(cx - cellSize * 0.35, cy + cellSize * 0.3);
                ctx.quadraticCurveTo(cx - cellSize * 0.45, cy - cellSize * 0.1, cx - cellSize * 0.15 + pulse * 0.1, cy - cellSize * 0.5);
                ctx.quadraticCurveTo(cx, cy - cellSize * 0.75 + pulse * 0.2, cx + cellSize * 0.15 - pulse * 0.1, cy - cellSize * 0.5);
                ctx.quadraticCurveTo(cx + cellSize * 0.45, cy - cellSize * 0.1, cx + cellSize * 0.35, cy + cellSize * 0.3);
                ctx.closePath();
                ctx.fill();

                let grad = ctx.createLinearGradient(cx, cy - cellSize * 0.85, cx, cy + cellSize * 0.2);
                grad.addColorStop(0.0, '#fff200'); 
                grad.addColorStop(0.4, '#f1c40f'); 
                grad.addColorStop(0.8, '#e67e22'); 
                grad.addColorStop(1.0, '#d35400'); 

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx - cellSize * 0.2, cy + cellSize * 0.2);
                ctx.quadraticCurveTo(cx - cellSize * 0.25, cy - cellSize * 0.2, cx - cellSize * 0.05, cy - cellSize * 0.85 + pulse);
                ctx.quadraticCurveTo(cx, cy - cellSize * 0.95 + pulse, cx + cellSize * 0.05, cy - cellSize * 0.85 + pulse);
                ctx.quadraticCurveTo(cx + cellSize * 0.25, cy - cellSize * 0.2, cx + cellSize * 0.2, cy + cellSize * 0.2);
                ctx.closePath();
                ctx.fill();

                ctx.restore();

                let smokeParticlesCount = 5;
                for (let i = 0; i < smokeParticlesCount; i++) {
                    let particleCycle = (fireElapsed + i * 1000) % fireDuration;
                    let pProgress = particleCycle / fireDuration;
                    
                    let smokeX = cx + Math.sin(pProgress * Math.PI * 3 + i) * 14;
                    let smokeY = cy - (pProgress * cellSize * 5.2); 
                    let baseAlpha = Math.max(0, 1 - pProgress);
                    
                    let overallFade = fireDuration - fireElapsed < 1000 ? (fireDuration - fireElapsed) / 1000 : (fireElapsed < 600 ? fireElapsed / 600 : 1.0);
                    let smokeAlpha = baseAlpha * 0.45 * overallFade;
                    
                    let smokeRadius = cellSize * (0.18 + pProgress * 0.3); 

                    ctx.fillStyle = `rgba(110, 110, 110, ${smokeAlpha})`;
                    ctx.beginPath();
                    ctx.arc(smokeX, smokeY, smokeRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                delete coreFires[core.id];
                coinAudio.pause();
                fireAudio.pause();
            }
        }
    });

    let mapCenterX = canvas.width / 2;
    let mapCenterY = canvas.height / 2;

    ['blue', 'red'].forEach(teamName => {
        if (typeof getSuperunitsForTeam === 'function') {
            let suList = getSuperunitsForTeam(teamName, units);
            suList.forEach(su => {
                if (su.units.length <= 1 && su.power !== Infinity && !su.isSpecialSuperunit) return;

                let avgX = su.units.reduce((sum, u) => sum + (u.renderX !== undefined ? u.renderX : u.gridX * cellSize), 0) / su.units.length;
                let avgY = su.units.reduce((sum, u) => sum + (u.renderY !== undefined ? u.renderY : u.gridY * cellSize), 0) / su.units.length;

                if (su.isSpecialSuperunit && su.core) {
                    avgX = (avgX + su.core.c * cellSize) / 2;
                    avgY = (avgY + su.core.r * cellSize) / 2;
                }

                let unitCenterX = avgX + cellSize / 2;
                let unitCenterY = avgY + cellSize / 2;

                let dirX = mapCenterX - unitCenterX;
                let dirY = mapCenterY - unitCenterY;
                let length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
                
                let significantDistance = cellSize * 1.8;
                let offsetX = (dirX / length) * significantDistance;
                let offsetY = (dirY / length) * significantDistance;

                let badgeX = unitCenterX + offsetX - 22;
                let badgeY = unitCenterY + offsetY - 12;

                ctx.fillStyle = 'rgba(204, 0, 0, 0.6)';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                let powerDisplay = su.power === Infinity ? '∞' : su.power;
                
                ctx.beginPath();
                ctx.fillRect(badgeX, badgeY, 44, 24);
                ctx.strokeRect(badgeX, badgeY, 44, 24);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                let lockedText = (typeof isUnitLockedInStalemate === 'function' && su.units.some(u => isUnitLockedInStalemate(u, units))) ? ' 🔒' : '';
                ctx.fillText(`${powerDisplay}${lockedText}`, badgeX + 22, badgeY + 12);
            });
        }
    });

    destroyedUnitsQueue = destroyedUnitsQueue.filter(item => {
        let elapsed = now - item.startTime;
        let progress = elapsed / item.duration;
        if (progress >= 1.0) return false;

        let u = item.unit;
        let rx = u.gridX * cellSize;
        let ry = u.gridY * cellSize;

        ctx.fillStyle = `rgba(255, 50, 50, ${1 - progress})`;
        ctx.fillRect(rx + 2, ry + 2, cellSize - 4, cellSize - 4);
        return true;
    });
}
