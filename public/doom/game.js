// =============================
// DOOM-STYLE JAVASCRIPT ENGINE
// =============================

let scene, camera, renderer, controls;
let bullets = [];
let enemies = [];
let doors = [];
let pickups = [];

let health = 100;
let ammo = 50;

let clock = new THREE.Clock();

// For pixelation shader
let pixelPass;

// ========== INIT ==========
function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 1, 2000
    );

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Pointer lock
    const startButton = document.getElementById("start");
    controls = new THREE.PointerLockControls(camera, document.body);
    startButton.onclick = () => {
        controls.lock();
        startButton.style.display = "none";
    };
    scene.add(controls.getObject());

    // Lights
    let light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);
    let dlight = new THREE.DirectionalLight(0xffffff, 1);
    dlight.position.set(1, 3, 2);
    scene.add(dlight);

    // Load textures
    const loader = new THREE.TextureLoader();
    const wallTex = loader.load("assets/textures/wall.jpg");
    const floorTex = loader.load("assets/textures/floor.jpg");
    const ceilTex  = loader.load("assets/textures/ceiling.jpg");
    const enemyTex = loader.load("assets/textures/enemy.png");
    const bloodTex = loader.load("assets/textures/blood.png");

    // Retro look
    wallTex.magFilter = floorTex.magFilter = ceilTex.magFilter =
        enemyTex.magFilter = THREE.NearestFilter;

    // ========== BUILD LEVEL ==========
    buildFloor(floorTex);
    buildCeiling(ceilTex);
    buildWalls(wallTex);
    buildDoors(wallTex);
    spawnEnemies(enemyTex);
    spawnPickups();

    // Click to shoot
    window.addEventListener("mousedown", shoot);

    // Pixelation effect
    setupPixelation();

    animate();
}

// ========== LEVEL BUILDERS ==========

function buildFloor(tex) {
    let floor = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 300),
        new THREE.MeshLambertMaterial({ map: tex })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    scene.add(floor);
}
function buildCeiling(tex) {
    let ceil = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 300),
        new THREE.MeshLambertMaterial({ map: tex })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 20;
    scene.add(ceil);
}
// wall layout grid
const GRID = [
    "####################",
    "#..................#",
    "#....E.......D.....#",
    "#..................#",
    "#..........P.......#",
    "####################"
];

function buildWalls(tex) {
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const size = 10;

    for (let z=0; z<GRID.length; z++) {
        for (let x=0; x<GRID[z].length; x++) {
            if (GRID[z][x] === "#") {
                let wall = new THREE.Mesh(
                    new THREE.BoxGeometry(size, 20, size),
                    mat
                );
                wall.position.set(x * size, 9, z * size);
                scene.add(wall);
            }
        }
    }
}

function buildDoors(tex) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const size = 10;

    for (let z=0; z<GRID.length; z++) {
        for (let x=0; x<GRID[z].length; x++) {
            if (GRID[z][x] === "D") {
                let door = new THREE.Mesh(
                    new THREE.BoxGeometry(size, 20, 2),
                    mat
                );
                door.position.set(x * size, 9, z * size);
                door.userData.closedY = 9;
                door.userData.openY = -8;
                doors.push(door);
                scene.add(door);
            }
        }
    }
}

function spawnEnemies(tex) {
    const size = 10;
    const mat = new THREE.SpriteMaterial({ map: tex });

    for (let z=0; z<GRID.length; z++) {
        for (let x=0; x<GRID[z].length; x++) {
            if (GRID[z][x] === "E") {
                let enemy = new THREE.Sprite(mat);
                enemy.scale.set(6, 8, 1);
                enemy.position.set(x * size, 4, z * size);
                enemy.userData.health = 50;
                enemies.push(enemy);
                scene.add(enemy);
            }
        }
    }
}

function spawnPickups() {
    const size = 10;
    for (let z=0; z<GRID.length; z++) {
        for (let x=0; x<GRID[z].length; x++) {
            if (GRID[z][x] === "P") {
                let geo = new THREE.BoxGeometry(3, 3, 3);
                let mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                let p = new THREE.Mesh(geo, mat);
                p.position.set(x * size, 2, z * size);
                pickups.push(p);
                scene.add(p);
            }
        }
    }
}

// ========== SHOOT ==========
function shoot() {
    if (ammo <= 0) return;

    // muzzle flash effect
    flashScreen();

    let dir = new THREE.Vector3();
    controls.getDirection(dir);
    let origin = camera.position.clone();

    // Raycast
    const ray = new THREE.Raycaster(origin, dir);
    const hits = ray.intersectObjects(enemies);

    ammo--;
    updateUI();

    if (hits.length > 0) {
        let e = hits[0].object;
        e.userData.health -= 25;

        if (e.userData.health <= 0) {
            scene.remove(e);
            enemies.splice(enemies.indexOf(e), 1);
        }
    }
}

// ========== MUZZLE FLASH SCREEN ==========
function flashScreen() {
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.left = "0"; overlay.style.top = "0";
    overlay.style.width = "100%"; overlay.style.height = "100%";
    overlay.style.background = "rgba(255,255,200,0.25)";
    overlay.style.pointerEvents = "none";
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.remove(), 50);
}

// ========== UPDATE UI ==========
function updateUI() {
    document.getElementById("ui").innerHTML =
        `HEALTH: ${health}<br>AMMO: ${ammo}`;
}

// ========== PIXEL SHADER ==========
function setupPixelation() {
    renderer.setPixelRatio(1);
    renderer.domElement.style.imageRendering = "pixelated";
}

// ========== ENEMY AI ==========
function updateEnemies(dt) {
    enemies.forEach(e => {
        const toPlayer = camera.position.clone().sub(e.position);
        const dist = toPlayer.length();

        // face player
        e.lookAt(camera.position.x, 4, camera.position.z);

        // chase
        if (dist < 60) {
            const move = toPlayer.normalize().multiplyScalar(5 * dt);
            e.position.add(move.negate());
        }

        // attack
        if (dist < 8) {
            health -= 10 * dt;
            updateUI();
            if (health <= 0) {
                alert("YOU DIED");
                location.reload();
            }
        }
    });
}

// ========== DOOR LOGIC ==========
function updateDoors(dt) {
    doors.forEach(door => {
        let dist = door.position.distanceTo(camera.position);

        if (dist < 15) {
            door.position.y -= 20 * dt;
            if (door.position.y < door.userData.openY)
                door.position.y = door.userData.openY;
        } else {
            door.position.y += 20 * dt;
            if (door.position.y > door.userData.closedY)
                door.position.y = door.userData.closedY;
        }
    });
}

// ========== PICKUP LOGIC ==========
function updatePickups() {
    pickups.forEach((p, i) => {
        if (camera.position.distanceTo(p.position) < 4) {
            health = Math.min(100, health + 30);
            ammo += 20;
            updateUI();

            scene.remove(p);
            pickups.splice(i, 1);
        }
    });
}

// ========== ANIMATE LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    updateEnemies(dt);
    updateDoors(dt);
    updatePickups();

    renderer.render(scene, camera);
}

// RUN
init();
