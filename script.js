document.addEventListener("DOMContentLoaded", () => {
  // ========================================
  // 1. REVEAL ANIMATION OBSERVER
  // ========================================
  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" }
    );

    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  }

  // ========================================
  // 2. GRID SHIFT GAME ENGINE (FIXED PATH & RANDOM GOAL)
  // ========================================
  const gridCanvas = document.getElementById("gridShiftCanvas");
  if (gridCanvas) {
    const ctx = gridCanvas.getContext("2d");
    const levelDisplay = document.getElementById("gridLevel");
    const movesDisplay = document.getElementById("gridMoves");
    const resetBtn = document.getElementById("resetGridBtn");

    const gridSize = 6;
    const cellSize = gridCanvas.width / gridSize;

    let currentLevel = 1;
    let moves = 0;
    let player = { x: 0, y: 0 };
    let levelData = {};
    let projectiles = [];
    let gameInterval = null;

    // Memeriksa apakah ada jalur bebas dari 'start' ke 'goal' (BFS Pathfinding)
    function isPathClear(start, goal, obstacles, size) {
      let visited = Array.from({ length: size }, () => Array(size).fill(false));
      let queue = [{ x: start.x, y: start.y }];
      visited[start.y][start.x] = true;

      const directions = [
        { x: 0, y: -1 }, // Atas
        { x: 0, y: 1 },  // Bawah
        { x: -1, y: 0 }, // Kiri
        { x: 1, y: 0 }   // Kanan
      ];

      while (queue.length > 0) {
        let curr = queue.shift();

        if (curr.x === goal.x && curr.y === goal.y) return true;

        for (let d of directions) {
          let nx = curr.x + d.x;
          let ny = curr.y + d.y;

          if (
            nx >= 0 && nx < size &&
            ny >= 0 && ny < size &&
            !visited[ny][nx] &&
            !obstacles.some(o => o.x === nx && o.y === ny)
          ) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      return false; // Jalur terhalang total
    }

    function generateGridLevel(lvl) {
      let p, g, obs, spikes, turrets;
      let validLayout = false;
      let attempts = 0;

      while (!validLayout && attempts < 100) {
        attempts++;
        obs = [];
        spikes = [];
        turrets = [];

        // 1. Posisi Player Acak
        p = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize)
        };

        // 2. Posisi Goal Acak (memastikan tidak sama dengan Player)
        do {
          g = {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
          };
        } while (g.x === p.x && g.y === p.y);

        let numObstacles = Math.min(2 + Math.floor(lvl / 12), 7);
        let numSpikes = Math.min(Math.floor(lvl / 4), 8);
        let numTurrets = Math.min(Math.floor(lvl / 6), 3);

        // 3. Generate Obstacles
        for (let i = 0; i < numObstacles; i++) {
          let ox = Math.floor(Math.random() * gridSize);
          let oy = Math.floor(Math.random() * gridSize);
          if ((ox !== p.x || oy !== p.y) && (ox !== g.x || oy !== g.y)) {
            if (!obs.some(o => o.x === ox && o.y === oy)) {
              obs.push({ x: ox, y: oy });
            }
          }
        }

        // 4. Validasi Jalur Kemenangan
        validLayout = isPathClear(p, g, obs, gridSize);

        if (validLayout) {
          // 5. Generate Spikes & Turrets setelah jalur utama terbukti aman
          for (let i = 0; i < numSpikes; i++) {
            let sx = Math.floor(Math.random() * gridSize);
            let sy = Math.floor(Math.random() * gridSize);
            if (
              (sx !== p.x || sy !== p.y) &&
              (sx !== g.x || sy !== g.y) &&
              !obs.some(o => o.x === sx && o.y === sy) &&
              !spikes.some(s => s.x === sx && s.y === sy)
            ) {
              spikes.push({ x: sx, y: sy });
            }
          }

          for (let i = 0; i < numTurrets; i++) {
            let tx = Math.floor(Math.random() * gridSize);
            let ty = Math.floor(Math.random() * gridSize);
            if (
              (tx !== p.x || ty !== p.y) &&
              (tx !== g.x || ty !== g.y) &&
              !obs.some(o => o.x === tx && o.y === ty) &&
              !spikes.some(s => s.x === tx && s.y === ty) &&
              !turrets.some(t => t.x === tx && t.y === ty)
            ) {
              turrets.push({ x: tx, y: ty, cooldown: 0, interval: Math.max(60 - lvl, 25) });
            }
          }
        }
      }

      return { player: p, goal: g, obstacles: obs, spikes: spikes, turrets: turrets };
    }

    function initGridLevel(lvl) {
      levelData = generateGridLevel(lvl);
      player = { ...levelData.player };
      moves = 0;
      projectiles = [];
      updateGridUI();
      drawGrid();
    }

    function updateGridUI() {
      levelDisplay.textContent = `LEVEL: ${currentLevel} / 100`;
      movesDisplay.textContent = `MOVES: ${moves}`;
    }

    function drawGrid() {
      ctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

      ctx.strokeStyle = "#252525";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, gridCanvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(gridCanvas.width, i * cellSize);
        ctx.stroke();
      }

      ctx.fillStyle = "#333333";
      levelData.obstacles.forEach((o) => {
        ctx.fillRect(o.x * cellSize + 2, o.y * cellSize + 2, cellSize - 4, cellSize - 4);
      });

      ctx.fillStyle = "#a52c2c";
      levelData.spikes.forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s.x * cellSize + cellSize / 2, s.y * cellSize + 8);
        ctx.lineTo(s.x * cellSize + 8, s.y * cellSize + cellSize - 8);
        ctx.lineTo(s.x * cellSize + cellSize - 8, s.y * cellSize + cellSize - 8);
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = "#777777";
      levelData.turrets.forEach((t) => {
        ctx.fillRect(t.x * cellSize + 10, t.y * cellSize + 10, cellSize - 20, cellSize - 20);
      });

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(levelData.goal.x * cellSize + 10, levelData.goal.y * cellSize + 10, cellSize - 20, cellSize - 20);

      ctx.fillStyle = "#ffffff";
      projectiles.forEach((pr) => {
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#f2f0eb";
      ctx.beginPath();
      ctx.arc(player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2, cellSize / 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function updateGridLoop() {
      levelData.turrets.forEach((t) => {
        t.cooldown++;
        if (t.cooldown >= t.interval) {
          t.cooldown = 0;
          projectiles.push({
            x: t.x * cellSize + cellSize / 2,
            y: t.y * cellSize + cellSize / 2,
            vx: 3.5,
            vy: 0
          });
        }
      });

      for (let i = projectiles.length - 1; i >= 0; i--) {
        let pr = projectiles[i];
        pr.x += pr.vx;
        pr.y += pr.vy;

        let px = player.x * cellSize + cellSize / 2;
        let py = player.y * cellSize + cellSize / 2;
        let dist = Math.hypot(pr.x - px, pr.y - py);

        if (dist < cellSize / 3.5 + 4) {
          respawnGridPlayer();
          return;
        }

        if (pr.x > gridCanvas.width || pr.x < 0) {
          projectiles.splice(i, 1);
        }
      }

      drawGrid();
    }

    function respawnGridPlayer() {
      player = { ...levelData.player };
      projectiles = [];
      drawGrid();
    }

    function moveGridPlayer(dx, dy) {
      let nx = player.x + dx;
      let ny = player.y + dy;

      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return;
      if (levelData.obstacles.some((o) => o.x === nx && o.y === ny)) return;

      if (levelData.spikes.some((s) => s.x === nx && s.y === ny)) {
        respawnGridPlayer();
        return;
      }

      player.x = nx;
      player.y = ny;
      moves++;
      updateGridUI();
      drawGrid();

      if (player.x === levelData.goal.x && player.y === levelData.goal.y) {
        if (currentLevel < 100) {
          currentLevel++;
          initGridLevel(currentLevel);
        } else {
          alert("Selamat! Anda menyelesaikan seluruh 100 Level Grid Shift!");
          currentLevel = 1;
          initGridLevel(currentLevel);
        }
      }
    }

    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (document.activeElement === document.body) {
          e.preventDefault();
        }
      }
      if (e.key === "ArrowUp") moveGridPlayer(0, -1);
      if (e.key === "ArrowDown") moveGridPlayer(0, 1);
      if (e.key === "ArrowLeft") moveGridPlayer(-1, 0);
      if (e.key === "ArrowRight") moveGridPlayer(1, 0);
    });

    resetBtn.addEventListener("click", () => initGridLevel(currentLevel));

    initGridLevel(currentLevel);
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGridLoop, 1000 / 30);
  }

  // ========================================
  // 3. SHADOW REALM 3D ENGINE (THREE.JS)
  // ========================================
  const sCanvas = document.getElementById("shadowRealmCanvas");
  if (sCanvas && typeof THREE !== "undefined") {
    const sLevelUI = document.getElementById("shadowLevel");
    const sHPUI = document.getElementById("shadowHP");
    const sEnemiesUI = document.getElementById("shadowEnemies");
    const resetSBtn = document.getElementById("resetShadowBtn");

    let currentSLevel = 1;
    let sGameActive = true;
    let keys = {};

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);
    scene.fog = new THREE.FogExp2(0x080808, 0.02);

    const camera = new THREE.PerspectiveCamera(50, sCanvas.width / sCanvas.height, 0.1, 1000);
    camera.position.set(0, 6, 18);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: sCanvas, antialias: true });
    renderer.setSize(sCanvas.width, sCanvas.height);
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const redSpot = new THREE.PointLight(0xa52c2c, 1.5, 30);
    redSpot.position.set(0, 5, 0);
    scene.add(redSpot);

    const arenaWidth = 30;
    const floorGeo = new THREE.BoxGeometry(arenaWidth, 1, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.5, 0);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(arenaWidth, 30, 0x444444, 0x222222);
    gridHelper.position.set(0, 0.01, 0);
    scene.add(gridHelper);

    const playerGroup = new THREE.Group();
    const playerBodyGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const playerBodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const playerBody = new THREE.Mesh(playerBodyGeo, playerBodyMat);
    playerBody.position.y = 0.8;
    playerBody.castShadow = true;
    playerGroup.add(playerBody);

    const swordGeo = new THREE.BoxGeometry(1.2, 0.1, 0.2);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0xe5e5e5, emissive: 0x333333 });
    const swordMesh = new THREE.Mesh(swordGeo, swordMat);
    swordMesh.position.set(0.6, 0.8, 0);
    swordMesh.visible = false;
    playerGroup.add(swordMesh);

    scene.add(playerGroup);

    let player = {
      x: -12,
      y: 0,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      isGrounded: true,
      isAttacking: false,
      attackCooldown: 0,
      facing: "right"
    };

    let enemies = [];
    const enemyContainer = new THREE.Group();
    scene.add(enemyContainer);

    function spawnShadowEnemies(lvl) {
      while (enemyContainer.children.length > 0) {
        enemyContainer.remove(enemyContainer.children[0]);
      }

      enemies = [];
      let totalEnemies = 5 + Math.floor(lvl * 1.5);

      for (let i = 0; i < totalEnemies; i++) {
        let rand = Math.random();
        let type = "normal";
        let hp = 50;
        let speed = 0.04;
        let size = 0.8;
        let color = 0x333333;

        if (rand > 0.85) {
          type = "large";
          hp = 120;
          speed = 0.025;
          size = 1.3;
          color = 0x792626;
        } else if (rand > 0.5) {
          type = "medium";
          hp = 75;
          speed = 0.035;
          size = 1.0;
          color = 0x555555;
        }

        const eGeo = new THREE.BoxGeometry(size, size, size);
        const eMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
        const eMesh = new THREE.Mesh(eGeo, eMat);
        eMesh.castShadow = true;

        let posX = -6 + Math.random() * 18;
        if (Math.abs(posX - player.x) < 3) posX += 5;

        eMesh.position.set(posX, size / 2, 0);
        enemyContainer.add(eMesh);

        enemies.push({
          mesh: eMesh,
          x: posX,
          y: 0,
          size: size,
          hp: hp,
          maxHp: hp,
          type: type,
          speed: speed,
          attackTimer: 0
        });
      }
    }

    function initShadowLevel(lvl) {
      sGameActive = true;
      player.x = -12;
      player.y = 0;
      player.vx = 0;
      player.vy = 0;
      player.hp = 100;
      playerGroup.position.set(player.x, player.y, 0);

      spawnShadowEnemies(lvl);
      updateShadowUI();
    }

    function updateShadowUI() {
      sLevelUI.textContent = `LEVEL: ${currentSLevel} / 100`;
      sHPUI.textContent = `HP: ${Math.max(0, player.hp)} / ${player.maxHp}`;
      sEnemiesUI.textContent = `MUSUH SISA: ${enemies.length}`;
    }

    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
      if (["a", "d", "w", "j", "z", " ", "arrowleft", "arrowright", "arrowup"].includes(e.key.toLowerCase())) {
        if (document.activeElement === document.body) {
          e.preventDefault();
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    sCanvas.addEventListener("mousedown", () => { keys["attack"] = true; });
    sCanvas.addEventListener("mouseup", () => { keys["attack"] = false; });

    function updateShadowGame() {
      if (!sGameActive) return;

      if (keys["a"] || keys["arrowleft"]) {
        player.vx = -0.12;
        player.facing = "left";
        playerGroup.rotation.y = Math.PI;
      } else if (keys["d"] || keys["arrowright"]) {
        player.vx = 0.12;
        player.facing = "right";
        playerGroup.rotation.y = 0;
      } else {
        player.vx = 0;
      }

      if ((keys["w"] || keys["arrowup"] || keys[" "]) && player.isGrounded) {
        player.vy = 0.22;
        player.isGrounded = false;
      }

      player.vy -= 0.01;
      player.x += player.vx;
      player.y += player.vy;

      const limitX = arenaWidth / 2 - 0.5;
      if (player.x < -limitX) player.x = -limitX;
      if (player.x > limitX) player.x = limitX;

      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.isGrounded = true;
      }

      playerGroup.position.set(player.x, player.y, 0);

      if ((keys["j"] || keys["z"] || keys["attack"]) && player.attackCooldown <= 0) {
        player.isAttacking = true;
        player.attackCooldown = 18;
        swordMesh.visible = true;

        enemies.forEach((en, index) => {
          let dist = Math.abs(en.x - player.x);
          let inFacingDirection = player.facing === "right" ? en.x >= player.x : en.x <= player.x;

          if (dist < 2.2 && inFacingDirection && Math.abs(en.y - player.y) < 1.5) {
            en.hp -= 30;
            en.mesh.material.color.setHex(0xff0000);
            setTimeout(() => {
              if (en.mesh) en.mesh.material.color.setHex(en.type === "large" ? 0x792626 : en.type === "medium" ? 0x555555 : 0x333333);
            }, 100);

            if (en.hp <= 0) {
              enemyContainer.remove(en.mesh);
              enemies.splice(index, 1);
            }
          }
        });
      }

      if (player.attackCooldown > 0) {
        player.attackCooldown--;
        if (player.attackCooldown < 10) {
          player.isAttacking = false;
          swordMesh.visible = false;
        }
      }

      enemies.forEach((en) => {
        if (en.x < player.x) en.x += en.speed;
        if (en.x > player.x) en.x -= en.speed;
        en.mesh.position.x = en.x;

        let dist = Math.abs(en.x - player.x);
        if (dist < (en.size / 2 + 0.4) && Math.abs(en.y - player.y) < 1.0) {
          en.attackTimer++;
          if (en.attackTimer >= 20) {
            player.hp -= 15;
            en.attackTimer = 0;
            if (player.hp <= 0) {
              player.hp = 0;
              sGameActive = false;
            }
          }
        }
      });

      camera.position.x = player.x * 0.5;
      updateShadowUI();

      if (enemies.length === 0) {
        if (currentSLevel < 100) {
          currentSLevel++;
          initShadowLevel(currentSLevel);
        } else {
          alert("Selamat! Anda menaklukkan 100 Level Shadow Realm 3D!");
          currentSLevel = 1;
          initShadowLevel(currentSLevel);
        }
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      updateShadowGame();
      renderer.render(scene, camera);
    }

    resetSBtn.addEventListener("click", () => {
      initShadowLevel(currentSLevel);
    });

    initShadowLevel(currentSLevel);
    animate();
  }
});