// =========================================================================
// TEAM CORE, ECONOMY, BASES, & WIN CONDITIONS CONTROLLER (Part 1/2: Data)
// =========================================================================

let blueCoins = 0;
let redCoins = 0;
let currentTurn = 'blue'; // Track current active turn ('blue' or 'red')
let destroyedUnitsQueue = [];
let flagAnimations = {};
let coreFires = {}; // Tracks active fires and smoke trails for 5 seconds
let gameOver = false;
let winnerMessage = '';

// Global Audio Declarations
let coinAudio = new Audio('sounds/sound10coins.mp3');
let fireAudio = new Audio('sounds/sound11burningcity.mp3');

// Deployment State Tracking
let activeDeployment = null; 
let highlightedTiles = []; // Track currently highlighted group of tiles via "Show" button
let activeShowButton = null; // Track currently highlighted Show button element

// Custom City Name Mapping Helper for Cores and Bases
function getCustomCoreName(coreId, isBase, teamBase) {
    if (isBase) {
        if (teamBase === 'red') return 'Ankara';
        if (teamBase === 'blue') return 'Athens';
    }
    const nameMap = {
        'gc1': 'Sparta',
        'gc2': 'Ioannina',
        'gc3': 'Koziani',
        'gc4': 'Sofia',
        'gc5': 'Salonika',
        'gc6': 'Plovdiv',
        'gc7': 'Bursa',
        'gc8': 'Izmir',
        'gc9': 'Istanbul',
        'gc10': 'Eskisehir',
        'gc11': 'Konya',
        'gc12': 'Adana'
    };
    return nameMap[coreId] || `Gold Core ${coreId.toUpperCase()}`;
}

// ALL gold cores (combined base cores rbc and bbc integrated directly)
let goldCores = [
    { id: 'gc1', c: 3, r: 3, owner: null, isBase: false, captureZones: [{c:3, r:2}, {c:3, r:4}, {c:2, r:3}, {c:4, r:3}, {c:2, r:2}, {c:2, r:4}, {c:4, r:2}, {c:4, r:4}] },
    { id: 'gc2', c: 11, r: 1, owner: null, isBase: false, captureZones: [{c:11, r:0}, {c:11, r:2}, {c:10, r:1}, {c:12, r:1}, {c:10, r:0}, {c:10, r:2}, {c:12, r:0}, {c:12, r:2}] }, 
    { id: 'gc3', c: 16, r: 3, owner: null, isBase: false, captureZones: [{c:16, r:2}, {c:16, r:4}, {c:15, r:3}, {c:17, r:3}, {c:15, r:2}, {c:15, r:4}, {c:17, r:2}, {c:17, r:4}] },
    { id: 'gc4', c: 22, r: 6, owner: null, isBase: false, captureZones: [{c:22, r:5}, {c:22, r:7}, {c:21, r:6}, {c:23, r:6}, {c:21, r:5}, {c:21, r:7}, {c:23, r:5}, {c:23, r:7}] },
    { id: 'gc5', c: 17, r: 7, owner: null, isBase: false, captureZones: [{c:17, r:6}, {c:17, r:8}, {c:16, r:7}, {c:18, r:7}, {c:16, r:6}, {c:16, r:8}, {c:18, r:6}, {c:18, r:8}] },
    { id: 'gc6', c: 21, r: 10, owner: null, isBase: false, captureZones: [{c:21, r:9}, {c:21, r:11}, {c:20, r:10}, {c:22, r:10}, {c:20, r:9}, {c:20, r:11}, {c:22, r:9}, {c:22, r:11}] },
    { id: 'gc7', c: 13, r: 16, owner: null, isBase: false, captureZones: [{c:13, r:15}, {c:13, r:17}, {c:12, r:16}, {c:14, r:16}, {c:12, r:15}, {c:12, r:17}, {c:14, r:15}, {c:14, r:17}] },
    { id: 'gc8', c: 7, r: 14, owner: null, isBase: false, captureZones: [{c:7, r:13}, {c:7, r:15}, {c:6, r:14}, {c:8, r:14}, {c:6, r:13}, {c:6, r:15}, {c:8, r:13}, {c:8, r:15}] },
    { id: 'gc9', c: 17, r: 17, owner: null, isBase: false, captureZones: [{c:17, r:16}, {c:17, r:18}, {c:16, r:17}, {c:18, r:17}, {c:16, r:16}, {c:16, r:18}, {c:18, r:16}, {c:18, r:18}] },
    { id: 'gc10', c: 12, r: 21, owner: null, isBase: false, captureZones: [{c:12, r:20}, {c:12, r:22}, {c:11, r:21}, {c:13, r:21}, {c:11, r:20}, {c:11, r:22}, {c:13, r:20}, {c:13, r:22}] },
    { id: 'gc11', c: 6, r: 24, owner: null, isBase: false, captureZones: [{c:6, r:23}, {c:6, r:25}, {c:5, r:24}, {c:7, r:24}, {c:5, r:23}, {c:5, r:25}, {c:7, r:23}, {c:7, r:25}] },
    { id: 'gc12', c: 2, r: 31, owner: null, isBase: false, captureZones: [{c:2, r:30}, {c:2, r:32}, {c:3, r:31}, {c:2, r:31}, {c:3, r:30}, {c:3, r:32}] },
    { id: 'rbc', c: 13, r: 26, owner: 'red', isBase: true, teamBase: 'red', captureZones: [{c:13, r:25}, {c:13, r:27}, {c:12, r:26}, {c:14, r:26}] },
    { id: 'bbc', c: 6, r: 6, owner: 'blue', isBase: true, teamBase: 'blue', captureZones: [{c:6, r:5}, {c:6, r:7}, {c:5, r:6}, {c:7, r:6}] }
];

const spawnConfig = {
    artillery: [
        { c: 8, r: 5, anchorCore: 'bbc' },
        { c: 13, r: 24, anchorCore: 'rbc' },
        { c: 19, r: 7, anchorCore: 'gc5' },
        { c: 18, r: 15, anchorCore: 'gc9' }
    ],
    tanks: [
        { c: 8, r: 6, anchorCore: 'bbc' },
        { c: 12, r: 24, anchorCore: 'rbc' },
        { c: 17, r: 9, anchorCore: 'gc5' },
        { c: 19, r: 15, anchorCore: 'gc9' }
    ],
    engineer: [
        { c: 7, r: 6, anchorCore: 'bbc' },
        { c: 13, r: 25, anchorCore: 'rbc' },
        { c: 18, r: 8, anchorCore: 'gc5' },
        { c: 17, r: 15, anchorCore: 'gc9' }
    ],
    plane: [
        { c: 6, r: 4, anchorCore: 'bbc' },
        { c: 13, r: 23, anchorCore: 'rbc' },
        { c: 17, r: 7, anchorCore: 'gc5' },
        { c: 18, r: 16, anchorCore: 'gc9' }
    ],
    antiair: [
        { c: 9, r: 6, anchorCore: 'bbc' },
        { c: 14, r: 24, anchorCore: 'rbc' },
        { c: 18, r: 9, anchorCore: 'gc5' },
        { c: 20, r: 15, anchorCore: 'gc9' }
    ],
    naval: [
        { c: 8, r: 4, anchorCore: 'bbc' },
        { c: 5, r: 14, anchorCore: 'gc8' },
        { c: 15, r: 6, anchorCore: 'gc5' },
        { c: 20, r: 16, anchorCore: 'gc9' }
    ],
    mines: [
        { c: 7, r: 4, anchorCore: 'bbc' }, { c: 9, r: 4, anchorCore: 'bbc' }, { c: 8, r: 3, anchorCore: 'bbc' },
        { c: 4, r: 14, anchorCore: 'gc8' }, { c: 6, r: 14, anchorCore: 'gc8' }, { c: 5, r: 13, anchorCore: 'gc8' }, { c: 5, r: 15, anchorCore: 'gc8' },
        { c: 14, r: 6, anchorCore: 'gc5' }, { c: 16, r: 6, anchorCore: 'gc5' }, { c: 15, r: 5, anchorCore: 'gc5' }, { c: 15, r: 7, anchorCore: 'gc5' },
        { c: 19, r: 16, anchorCore: 'gc9' }, { c: 21, r: 16, anchorCore: 'gc9' }, { c: 20, r: 15, anchorCore: 'gc9' }, { c: 20, r: 17, anchorCore: 'gc9' }
    ],
    redBases: [
        { c: 12, r: 25 }, { c: 13, r: 25 }, { c: 14, r: 25 },
        { c: 12, r: 26 }, { c: 13, r: 26 }, { c: 14, r: 26 },
        { c: 12, r: 27 }, { c: 13, r: 27 }, { c: 14, r: 27 }
    ],
    blueBases: [
        { c: 5, r: 6 }, { c: 6, r: 6 }, { c: 7, r: 6 },
        { c: 7, r: 5 }, { c: 6, r: 5 },
        { c: 5, r: 7 }, { c: 6, r: 7 }, { c: 7, r: 7 }
    ]
};

function getBaseSquares(team) {
    return team === 'red' ? spawnConfig.redBases : team === 'blue' ? spawnConfig.blueBases : [];
}

const TeamLog = {
    info: (msg, data = null) => console.log(`[INFO][team_core]: ${msg}`, data ?? ''),
    warn: (msg, data = null) => console.warn(`[WARN][team_core]: ${msg}`, data ?? ''),
    success: (msg, data = null) => console.log(`[SUCCESS][team_core]: ${msg}`, data ?? '')
};
