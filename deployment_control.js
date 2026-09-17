function buyUnit(unitType) {
    if (gameOver) return;

    let activeTeam = currentTurn;
    let cost = 0;
    let unitName = '';
    let unitRange = 2;
    let unitCategory = 'land';
    let imgRef = null;
    let loadRef = () => true;

    let fallbackImg = activeTeam === 'blue' ? (typeof blueTankImg !== 'undefined' ? blueTankImg : null) : (typeof redTankImg !== 'undefined' ? redTankImg : null);

    if (activeTeam === 'blue') {
        if (unitType === 'infantry') { cost = 1; unitName = 'Infantry'; unitRange = 2; imgRef = typeof blueInfantryImg !== 'undefined' ? blueInfantryImg : fallbackImg; loadRef = () => typeof blueInfantryLoaded !== 'undefined' ? blueInfantryLoaded : true; }
        else if (unitType === 'tank') { cost = 1; unitName = 'Tank'; unitRange = 3; imgRef = typeof blueTankImg !== 'undefined' ? blueTankImg : fallbackImg; loadRef = () => typeof blueTankLoaded !== 'undefined' ? blueTankLoaded : true; }
        else if (unitType === 'artillery') { cost = 2; unitName = 'Artillery'; unitRange = 2; imgRef = typeof blueArtilleryImg !== 'undefined' ? blueArtilleryImg : fallbackImg; loadRef = () => typeof blueArtilleryLoaded !== 'undefined' ? blueArtilleryLoaded : true; }
        else if (unitType === 'ship') { cost = 2; unitName = 'Ship'; unitRange = 2; unitCategory = 'water'; imgRef = typeof blueShipImg !== 'undefined' ? blueShipImg : fallbackImg; loadRef = () => typeof blueShipLoaded !== 'undefined' ? blueShipLoaded : true; }
        else if (unitType === 'engineer') { cost = 2; unitName = 'Engineer'; unitRange = 2; imgRef = typeof blueEngineerImg !== 'undefined' ? blueEngineerImg : fallbackImg; loadRef = () => typeof blueEngineerLoaded !== 'undefined' ? blueEngineerLoaded : true; }
        else if (unitType === 'plane') { cost = 3; unitName = 'Plane'; unitRange = 4; unitCategory = 'air'; imgRef = typeof bluePlaneImg !== 'undefined' ? bluePlaneImg : fallbackImg; loadRef = () => typeof bluePlaneLoaded !== 'undefined' ? bluePlaneLoaded : true; }
        else if (unitType === 'antiair') { cost = 2; unitName = 'Anti-Air'; unitRange = 3; imgRef = typeof blueAntiAirImg !== 'undefined' ? blueAntiAirImg : fallbackImg; loadRef = () => typeof blueAntiAirLoaded !== 'undefined' ? blueAntiAirLoaded : true; }
        else if (unitType === 'mines') { cost = 3; unitName = 'Mines'; unitRange = 0; unitCategory = 'water'; imgRef = typeof blueMinesImg !== 'undefined' ? blueMinesImg : fallbackImg; loadRef = () => typeof blueMinesLoaded !== 'undefined' ? blueMinesLoaded : true; }
    } else {
        if (unitType === 'infantry') { cost = 1; unitName = 'Infantry'; unitRange = 2; imgRef = typeof redInfantryImg !== 'undefined' ? redInfantryImg : fallbackImg; loadRef = () => typeof redInfantryLoaded !== 'undefined' ? redInfantryLoaded : true; }
        else if (unitType === 'tank') { cost = 1; unitName = 'Tank'; unitRange = 3; imgRef = typeof redTankImg !== 'undefined' ? redTankImg : fallbackImg; loadRef = () => typeof redTankLoaded !== 'undefined' ? redTankLoaded : true; }
        else if (unitType === 'artillery') { cost = 2; unitName = 'Artillery'; unitRange = 2; imgRef = typeof redArtilleryImg !== 'undefined' ? redArtilleryImg : fallbackImg; loadRef = () => typeof redArtilleryLoaded !== 'undefined' ? redArtilleryLoaded : true; }
        else if (unitType === 'ship') { cost = 2; unitName = 'Ship'; unitRange = 2; unitCategory = 'water'; imgRef = typeof redShipImg !== 'undefined' ? redShipImg : fallbackImg; loadRef = () => typeof redShipLoaded !== 'undefined' ? redShipLoaded : true; }
        else if (unitType === 'engineer') { cost = 2; unitName = 'Engineer'; unitRange = 2; imgRef = typeof redEngineerImg !== 'undefined' ? redEngineerImg : fallbackImg; loadRef = () => typeof redEngineerLoaded !== 'undefined' ? redEngineerLoaded : true; }
        else if (unitType === 'plane') { cost = 3; unitName = 'Plane'; unitRange = 4; unitCategory = 'air'; imgRef = typeof redPlaneImg !== 'undefined' ? redPlaneImg : fallbackImg; loadRef = () => typeof redPlaneLoaded !== 'undefined' ? redPlaneLoaded : true; }
        else if (unitType === 'antiair') { cost = 2; unitName = 'Anti-Air'; unitRange = 3; imgRef = typeof redAntiAirImg !== 'undefined' ? redAntiAirImg : fallbackImg; loadRef = () => typeof redAntiAirLoaded !== 'undefined' ? redAntiAirLoaded : true; }
        else if (unitType === 'mines') { cost = 3; unitName = 'Mines'; unitRange = 0; unitCategory = 'water'; imgRef = typeof redMinesImg !== 'undefined' ? redMinesImg : fallbackImg; loadRef = () => typeof redMinesLoaded !== 'undefined' ? redMinesLoaded : true; }
    }

    let currentCoins = activeTeam === 'blue' ? blueCoins : redCoins;
    if (currentCoins < cost) {
        TeamLog.warn(`Not enough gold to buy ${unitType}! Required: ${cost}, Available: ${currentCoins}`);
        alert(`Not enough gold! You need ${cost} gold coins.`);
        return;
    }

    let legalGroups = getLegalGroupsForUnit(activeTeam, unitType);
    if (legalGroups.length === 0) {
        TeamLog.warn(`Cannot deploy unit: No available legal deployment squares found for ${unitType}!`);
        alert(`Cannot deploy unit: No available legal deployment squares!`);
        return;
    }

    if (activeTeam === 'blue') blueCoins -= cost;
    else redCoins -= cost;
    updateGameHUD();

    activeDeployment = {
        unitType: unitType, cost: cost, unitName: unitName, unitRange: unitRange,
        unitCategory: unitCategory, imgRef: imgRef, loadRef: loadRef,
        count: unitType === 'infantry' ? 2 : 1, legalGroups: legalGroups, team: activeTeam
    };

    highlightedTiles = [];
    activeShowButton = null;
    
    let modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = 'none';

    showDeploymentPopupInfo();
}

function showDeploymentPopupInfo() {
    let existing = document.getElementById('deployment-popup');
    if (existing) existing.remove();

    let popup = document.createElement('div');
    popup.id = 'deployment-popup';
    popup.style.cssText = 'position:fixed; top:40px; left:50%; transform:translateX(-50%); background:#1a1a1a; border:2px solid #f1c40f; padding:15px 20px; z-index:10000; color:#fff; font-family:sans-serif; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.5); max-height:80vh; overflow-y:auto; cursor:move;';

    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;

    popup.onmousedown = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('#deployment-squares-list') || e.target.id === 'popup-minimize-btn') return;
        isDragging = true;
        dragStartX = e.clientX - popup.offsetLeft;
        dragStartY = e.clientY - popup.offsetTop;
        popup.style.transform = 'none';
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        popup.style.left = (e.clientX - dragStartX) + 'px';
        popup.style.top = (e.clientY - dragStartY) + 'px';
    };

    window.onmouseup = () => { isDragging = false; };

    let title = document.createElement('div');
    title.id = 'deployment-popup-title';
    title.innerHTML = `<b>Deploy ${activeDeployment.unitName}</b> (${activeDeployment.count} remaining) <br><small style="font-size:10px; color:#aaa;">(Click & drag header to move)</small>`;
    title.style.cssText = 'margin-bottom:10px; font-size:14px; position:relative;';

    let minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'popup-minimize-btn';
    minimizeBtn.innerText = '[-]';
    minimizeBtn.style.cssText = 'position:absolute; top:0; right:0; background:#333; color:#fff; border:1px solid #777; cursor:pointer; font-size:14px; padding:6px 12px; border-radius:4px;';

    let isMinimized = false;
    minimizeBtn.onclick = () => {
        isMinimized = !isMinimized;
        minimizeBtn.innerText = isMinimized ? '[+]' : '[-]';
        listContainer.style.display = isMinimized ? 'none' : 'block';
        cancelBtn.parentElement.style.display = isMinimized ? 'none' : 'flex';
    };

    title.appendChild(minimizeBtn);
    popup.appendChild(title);

    let listContainer = document.createElement('div');
    listContainer.id = 'deployment-squares-list';
    listContainer.style.cssText = 'margin-bottom:12px; max-height:220px; overflow-y:auto; text-align:left; border:1px solid #444; padding:5px;';
    popup.appendChild(listContainer);

    renderDeploymentListItems(listContainer);

    let actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex; justify-content:center; margin-top:10px;';

    let cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'Cancel Deployment';
    cancelBtn.style.cssText = 'background:#e74c3c; color:#fff; border:none; padding:8px 18px; cursor:pointer; font-weight:bold; border-radius:4px; width:100%; font-size:14px;';
    cancelBtn.onclick = () => {
        if (activeDeployment) {
            if (activeDeployment.team === 'blue') blueCoins += activeDeployment.cost;
            else redCoins += activeDeployment.cost;
            updateGameHUD();
        }
        activeDeployment = null;
        highlightedTiles = [];
        activeShowButton = null;
        popup.remove();
        
        let shopBtn = document.getElementById('shop-btn');
        if (shopBtn) shopBtn.style.display = 'inline-block';
    };

    actionRow.appendChild(cancelBtn);
    popup.appendChild(actionRow);
    document.body.appendChild(popup);
}

function renderDeploymentListItems(container) {
    container.innerHTML = '';
    if (!activeDeployment || !activeDeployment.legalGroups) return;

    activeDeployment.legalGroups.forEach(group => {
        let row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 10px; margin:5px 0; background:#2a2a2a; border-radius:4px;';

        let label = document.createElement('span');
        label.innerHTML = `<b>${group.name}</b> (${group.tiles.length} tiles)`;
        label.style.cssText = 'font-size:13px; color:#ddd;';
        row.appendChild(label);

        let buttonGroup = document.createElement('div');
        buttonGroup.style.cssText = 'display:flex; gap:8px;';

        let showBtn = document.createElement('button');
        showBtn.innerText = 'Show';
        showBtn.style.cssText = 'background:#3498db; color:#fff; border:none; padding:6px 12px; cursor:pointer; font-size:13px; font-weight:bold; border-radius:4px; outline:none;';
        
        showBtn.onclick = () => {
            if (activeShowButton && activeShowButton !== showBtn) {
                activeShowButton.style.border = 'none';
                activeShowButton.style.boxShadow = 'none';
            }
            showBtn.style.border = '2px solid #00ffff';
            showBtn.style.boxShadow = '0 0 8px #00ffff';
            activeShowButton = showBtn;

            highlightedTiles = group.tiles; 
        };

        let deployOptBtn = document.createElement('button');
        deployOptBtn.innerText = 'Deploy Here';
        deployOptBtn.style.cssText = 'background:#27ae60; color:#fff; border:none; padding:6px 12px; cursor:pointer; font-size:13px; font-weight:bold; border-radius:4px;';
        deployOptBtn.onclick = () => { 
            activeShowButton = null;
            highlightedTiles = [];
            confirmDeploymentExecution(group.tiles); 
        };

        buttonGroup.appendChild(showBtn);
        buttonGroup.appendChild(deployOptBtn);
        row.appendChild(buttonGroup);
        container.appendChild(row);
    });
}

function updateDeploymentPopupState() {
    let titleElem = document.getElementById('deployment-popup-title');
    if (titleElem && activeDeployment) {
        let minimizeBtnHtml = titleElem.querySelector('button') ? titleElem.querySelector('button').outerHTML : '';
        titleElem.innerHTML = `<b>Deploy ${activeDeployment.unitName}</b> (${activeDeployment.count} remaining) <br><small style="font-size:10px; color:#aaa;">(Click & drag header to move)</small>` + minimizeBtnHtml;
        
        let minBtn = titleElem.querySelector('button');
        if (minBtn) {
            minBtn.onclick = () => {
                let listContainer = document.getElementById('deployment-squares-list');
                let cancelBtnRow = listContainer.nextElementSibling;
                let isMinimized = listContainer.style.display === 'none';
                listContainer.style.display = isMinimized ? 'block' : 'none';
                if (cancelBtnRow) cancelBtnRow.style.display = isMinimized ? 'flex' : 'none';
                minBtn.innerText = isMinimized ? '[-]' : '[+]';
            };
        }
    }
    let listContainer = document.getElementById('deployment-squares-list');
    if (listContainer) { renderDeploymentListItems(listContainer); }
}

function confirmDeploymentExecution(groupTiles) {
    if (!activeDeployment || groupTiles.length === 0) return;

    let availableTiles = groupTiles.filter(tile => !units.some(u => u.gridX === tile.c && u.gridY === tile.r));
    if (availableTiles.length === 0) {
        alert("All tiles in this group are currently occupied!");
        return;
    }

    let chosenTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];

    units.push({
        name: activeDeployment.unitName, type: activeDeployment.unitCategory,
        range: activeDeployment.unitRange, gridX: chosenTile.c, gridY: chosenTile.r,
        x: chosenTile.c * cellSize, y: chosenTile.r * cellSize,
        img: activeDeployment.imgRef, loaded: activeDeployment.loadRef, team: activeDeployment.team
    });

    TeamLog.success(`${activeDeployment.team.toUpperCase()} deployed 1x ${activeDeployment.unitName} at (${chosenTile.c}, ${chosenTile.r})`);
    activeDeployment.count--;
    updateGameHUD();

    if (activeDeployment.count <= 0) {
        let popup = document.getElementById('deployment-popup');
        if (popup) popup.remove();
        activeDeployment = null;
        highlightedTiles = [];
        activeShowButton = null;

        let shopBtn = document.getElementById('shop-btn');
        if (shopBtn) shopBtn.style.display = 'inline-block';
    } else {
        activeDeployment.legalGroups = getLegalGroupsForUnit(activeDeployment.team, activeDeployment.unitType);
        highlightedTiles = [];
        activeShowButton = null;
        updateDeploymentPopupState();
    }
}