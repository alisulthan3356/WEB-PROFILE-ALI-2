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
  // 2. GRID SHIFT GAME ENGINE
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

    function isPathClear(start, goal, obstacles, size) {
      let visited = Array.from({ length: size }, () => Array(size).fill(false));
      let queue = [{ x: start.x, y: start.y }];
      visited[start.y][start.x] = true;

      const directions = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 }
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
      return false;
    }

    function generateGridLevel(lvl) {
      let p, g, obs, spikes, turrets;
      let validLayout = false;
      let attempts = 0;

      while (!validLayout && attempts < 100) {
        attempts++;
        obs = []; spikes = []; turrets = [];

        p = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        do {
          g = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        } while (g.x === p.x && g.y === p.y);

        let numObstacles = Math.min(2 + Math.floor(lvl / 12), 7);
        let numSpikes = Math.min(Math.floor(lvl / 4), 8);
        let numTurrets = Math.min(Math.floor(lvl / 6), 3);

        for (let i = 0; i < numObstacles; i++) {
          let ox = Math.floor(Math.random() * gridSize);
          let oy = Math.floor(Math.random() * gridSize);
          if ((ox !== p.x || oy !== p.y) && (ox !== g.x || oy !== g.y)) {
            if (!obs.some(o => o.x === ox && o.y === oy)) obs.push({ x: ox, y: oy });
          }
        }

        validLayout = isPathClear(p, g, obs, gridSize);

        if (validLayout) {
          for (let i = 0; i < numSpikes; i++) {
            let sx = Math.floor(Math.random() * gridSize);
            let sy = Math.floor(Math.random() * gridSize);
            if ((sx !== p.x || sy !== p.y) && (sx !== g.x || sy !== g.y) && !obs.some(o => o.x === sx && o.y === sy)) {
              spikes.push({ x: sx, y: sy });
            }
          }
          for (let i = 0; i < numTurrets; i++) {
            let tx = Math.floor(Math.random() * gridSize);
            let ty = Math.floor(Math.random() * gridSize);
            if ((tx !== p.x || ty !== p.y) && (tx !== g.x || ty !== g.y) && !obs.some(o => o.x === tx && o.y === ty)) {
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
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, gridCanvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(gridCanvas.width, i * cellSize); ctx.stroke();
      }
      ctx.fillStyle = "#333333";
      levelData.obstacles.forEach((o) => ctx.fillRect(o.x * cellSize + 2, o.y * cellSize + 2, cellSize - 4, cellSize - 4));
      ctx.fillStyle = "#a52c2c";
      levelData.spikes.forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s.x * cellSize + cellSize / 2, s.y * cellSize + 8);
        ctx.lineTo(s.x * cellSize + 8, s.y * cellSize + cellSize - 8);
        ctx.lineTo(s.x * cellSize + cellSize - 8, s.y * cellSize + cellSize - 8);
        ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = "#777777";
      levelData.turrets.forEach((t) => ctx.fillRect(t.x * cellSize + 10, t.y * cellSize + 10, cellSize - 20, cellSize - 20));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(levelData.goal.x * cellSize + 10, levelData.goal.y * cellSize + 10, cellSize - 20, cellSize - 20);
      projectiles.forEach((pr) => {
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2); ctx.fill();
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
          projectiles.push({ x: t.x * cellSize + cellSize / 2, y: t.y * cellSize + cellSize / 2, vx: 3.5, vy: 0 });
        }
      });
      for (let i = projectiles.length - 1; i >= 0; i--) {
        let pr = projectiles[i];
        pr.x += pr.vx; pr.y += pr.vy;
        let px = player.x * cellSize + cellSize / 2;
        let py = player.y * cellSize + cellSize / 2;
        if (Math.hypot(pr.x - px, pr.y - py) < cellSize / 3.5 + 4) {
          respawnGridPlayer(); return;
        }
        if (pr.x > gridCanvas.width || pr.x < 0) projectiles.splice(i, 1);
      }
      drawGrid();
    }

    function respawnGridPlayer() {
      player = { ...levelData.player };
      projectiles = [];
      drawGrid();
    }

    function moveGridPlayer(dx, dy) {
      let nx = player.x + dx, ny = player.y + dy;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return;
      if (levelData.obstacles.some((o) => o.x === nx && o.y === ny)) return;
      if (levelData.spikes.some((s) => s.x === nx && s.y === ny)) { respawnGridPlayer(); return; }

      player.x = nx; player.y = ny; moves++;
      updateGridUI(); drawGrid();

      if (player.x === levelData.goal.x && player.y === levelData.goal.y) {
        if (currentLevel < 100) { currentLevel++; initGridLevel(currentLevel); }
        else { alert("Selamat! Selesai 100 Level Grid Shift!"); currentLevel = 1; initGridLevel(currentLevel); }
      }
    }

    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (document.activeElement === document.body) e.preventDefault();
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
  // 3. SHADOW REALM FPP 3D ENGINE
  // ========================================
  const sCanvas = document.getElementById("shadowRealmCanvas");
  if (sCanvas && typeof THREE !== "undefined") {
    const sLevelUI = document.getElementById("shadowLevel");
    const sHPUI = document.getElementById("shadowHP");
    const sEnemiesUI = document.getElementById("shadowEnemies");
    const resetSBtn = document.getElementById("resetShadowBtn");

    let currentSLevel = 1;
    let sGameActive = true;

    // Stat & Kontrol Player
    let player = {
      hp: 100,
      maxHp: 100,
      ammo: 10,
      maxAmmo: 10,
      canShoot: true,
      isReloading: false,
      shootCooldown: 700 // 0.7 Detik
    };

    let keys = {};
    let mouseYaw = 0;
    let mousePitch = 0;

    // Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.035);

    const camera = new THREE.PerspectiveCamera(75, sCanvas.width / sCanvas.height, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Mata player

    const renderer = new THREE.WebGLRenderer({ canvas: sCanvas, antialias: true });
    renderer.setSize(sCanvas.width, sCanvas.height);

    // Pencahayaan
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const flashlight = new THREE.SpotLight(0xffffff, 1.5, 40, Math.PI / 6);
    camera.add(flashlight);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight.target);
    scene.add(camera);

    // Arena Petualangan (Lantai & Dinding)
    const arenaSize = 60;
    const floorGeo = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(arenaSize, 30, 0x333333, 0x151515);
    grid.position.y = 0.01;
    scene.add(grid);

    // Model Pistol FPP (Anak dari Kamera)
    const gunGroup = new THREE.Group();
    const gunBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.15, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 })
    );
    const gunBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.05, -0.2);
    gunGroup.add(gunBody, gunBarrel);
    gunGroup.position.set(0.25, -0.2, -0.5); // Posisi di sudut kanan bawah layar
    camera.add(gunGroup);

    // Kontrol Mouse (Pointer Lock)
    sCanvas.addEventListener("click", () => {
      sCanvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== sCanvas) {
        // Pointer rilis
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === sCanvas) {
        mouseYaw -= e.movementX * 0.002;
        mousePitch -= e.movementY * 0.002;
        mousePitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, mousePitch));

        camera.rotation.order = "YXZ";
        camera.rotation.y = mouseYaw;
        camera.rotation.x = mousePitch;
      }
    });

    // Kontrol Keyboard
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "KeyR" && !player.isReloading && player.ammo < player.maxAmmo) {
        reloadWeapon();
      }
    });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; });

    // Sistem Menembak
    window.addEventListener("mousedown", (e) => {
      if (document.pointerLockElement === sCanvas && e.button === 0) {
        shootWeapon();
      }
    });

    function reloadWeapon() {
      player.isReloading = true;
      setTimeout(() => {
        player.ammo = player.maxAmmo;
        player.isReloading = false;
        updateShadowUI();
      }, 1500); // Durasi Reload 1.5s
    }

    let fireballs = [];
    let enemies = [];
    const enemyGroup = new THREE.Group();
    scene.add(enemyGroup);

    function shootWeapon() {
      if (!player.canShoot || player.isReloading || player.ammo <= 0 || !sGameActive) return;

      player.ammo--;
      player.canShoot = false;

      // Animasi Rekoil Pistol
      gunGroup.position.z += 0.08;
      setTimeout(() => gunGroup.position.z -= 0.08, 100);

      // Raycasting untuk Tembakan (Damage 10)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      const intersects = raycaster.intersectObjects(enemyGroup.children, true);
      if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && hitObj.parent !== enemyGroup) {
          hitObj = hitObj.parent;
        }

        const enemy = enemies.find(e => e.mesh === hitObj);
        if (enemy) {
          enemy.hp -= 10;
          // Feedback Visual Damage
          enemy.mesh.children.forEach(m => {
            if (m.material) m.material.color.setHex(0xff0000);
          });
          setTimeout(() => {
            enemy.mesh.children.forEach(m => {
              if (m.material) m.material.color.setHex(enemy.baseColor);
            });
          }, 100);

          if (enemy.hp <= 0) {
            enemyGroup.remove(enemy.mesh);
            enemies = enemies.filter(e => e !== enemy);
          }
        }
      }

      updateShadowUI();
      setTimeout(() => { player.canShoot = true; }, player.shootCooldown);
    }

    // Spawn Musuh Berdasarkan Kategori
    function spawnEnemies(lvl) {
      while (enemyGroup.children.length > 0) enemyGroup.remove(enemyGroup.children[0]);
      enemies = [];

      let totalEnemies = 4 + Math.floor(lvl * 1.2);

      for (let i = 0; i < totalEnemies; i++) {
        let typeRand = Math.random();
        let type, hp, size, color, speed, attackDamage;

        let eMeshGroup = new THREE.Group();

        if (typeRand < 0.45) {
          // ASSASIN: HP 50, Damage 14, Pedang Mengayun Realistis
          type = "assasin"; hp = 50; size = 1.6; color = 0x222222; speed = 0.07; attackDamage = 14;

          const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, size, 0.6), new THREE.MeshStandardMaterial({ color: color }));
          body.position.y = size / 2;
          eMeshGroup.add(body);

          // Pedang
          const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
          sword.position.set(0.4, 0.8, -0.4);
          sword.name = "sword";
          eMeshGroup.add(sword);

        } else if (typeRand < 0.8) {
          // PENYIHIR: HP 20, Damage 7 (Bola Api Jarak Jauh)
          type = "mage"; hp = 20; size = 1.4; color = 0x441155; speed = 0.03; attackDamage = 7;

          const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, size, 8), new THREE.MeshStandardMaterial({ color: color }));
          body.position.y = size / 2;
          eMeshGroup.add(body);

        } else {
          // RAKSASA: HP 50, Damage 20, Cooldown 8 Detik
          type = "giant"; hp = 50; size = 3.2; color = 0x3a1a1a; speed = 0.025; attackDamage = 20;

          const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, size, 1.4), new THREE.MeshStandardMaterial({ color: color }));
          body.position.y = size / 2;
          eMeshGroup.add(body);
        }

        let spawnAngle = Math.random() * Math.PI * 2;
        let spawnDist = 12 + Math.random() * 18;
        eMeshGroup.position.set(Math.cos(spawnAngle) * spawnDist, 0, Math.sin(spawnAngle) * spawnDist);

        enemyGroup.add(eMeshGroup);
        enemies.push({
          mesh: eMeshGroup,
          type: type,
          hp: hp,
          speed: speed,
          damage: attackDamage,
          baseColor: color,
          lastAttackTime: 0,
          attackCooldown: type === "giant" ? 8000 : 1500, // Giant 8s, Lainnya 1.5s
          swinging: false
        });
      }
    }

    function initShadowLevel(lvl) {
      sGameActive = true;
      player.hp = 100;
      player.ammo = 10;
      camera.position.set(0, 1.6, 0);
      mouseYaw = 0; mousePitch = 0;

      // Hapus Bola Api Sisa
      fireballs.forEach(f => scene.remove(f.mesh));
      fireballs = [];

      spawnEnemies(lvl);
      updateShadowUI();
    }

    function updateShadowUI() {
      sLevelUI.textContent = `LEVEL: ${currentSLevel} / 100`;
      sHPUI.textContent = `HP: ${Math.max(0, player.hp)} / ${player.maxHp} | AMMO: ${player.isReloading ? 'RELOADING...' : player.ammo + '/10'}`;
      sEnemiesUI.textContent = `MUSUH SISA: ${enemies.length}`;
    }

    // Game Loop FPP
    let lastFrameTime = performance.now();

    function updateShadowGame() {
      if (!sGameActive) return;

      const now = performance.now();
      const delta = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // Pergerakan Player (WASD)
      const moveSpeed = 6.0 * delta;
      let moveDir = new THREE.Vector3();

      if (keys["KeyW"]) moveDir.z -= 1;
      if (keys["KeyS"]) moveDir.z += 1;
      if (keys["KeyA"]) moveDir.x -= 1;
      if (keys["KeyD"]) moveDir.x += 1;

      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseYaw);

      camera.position.x += moveDir.x * moveSpeed;
      camera.position.z += moveDir.z * moveSpeed;

      // Batas Arena Petualangan
      const limit = arenaSize / 2 - 1;
      camera.position.x = Math.max(-limit, Math.min(limit, camera.position.x));
      camera.position.z = Math.max(-limit, Math.min(limit, camera.position.z));

      // AI Musuh & Mekanik Serangan
      enemies.forEach((en) => {
        let enemyPos = en.mesh.position;
        let distToPlayer = enemyPos.distanceTo(camera.position);

        en.mesh.lookAt(camera.position.x, enemyPos.y, camera.position.z);

        // Movement & Attack AI
        if (en.type === "mage") {
          // Penyihir menjaga jarak dan melempar bola api
          if (distToPlayer > 8) {
            en.mesh.translateZ(en.speed);
          }
          if (now - en.lastAttackTime > en.attackCooldown && distToPlayer < 20) {
            en.lastAttackTime = now;
            // Spawn Bola Api
            const fireballMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.25, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xff4400 })
            );
            fireballMesh.position.set(enemyPos.x, enemyPos.y + 1, enemyPos.z);
            scene.add(fireballMesh);

            let dir = new THREE.Vector3().subVectors(camera.position, fireballMesh.position).normalize();
            fireballs.push({ mesh: fireballMesh, dir: dir, damage: en.damage, speed: 10 });
          }

        } else {
          // Assasin & Raksasa Mengejar Ke Jarak Melee
          let attackDist = en.type === "giant" ? 2.8 : 1.8;

          if (distToPlayer > attackDist) {
            en.mesh.translateZ(en.speed);
          } else {
            // Melakukan Serangan Melee jika Cooldown Selesai
            if (now - en.lastAttackTime > en.attackCooldown) {
              en.lastAttackTime = now;
              player.hp -= en.damage;

              // Animasi Mengayun Pedang Khusus Assasin
              if (en.type === "assasin") {
                const sword = en.mesh.getObjectByName("sword");
                if (sword) {
                  sword.rotation.y = Math.PI / 2;
                  setTimeout(() => { sword.rotation.y = 0; }, 250);
                }
              }

              if (player.hp <= 0) {
                player.hp = 0;
                sGameActive = false;
                document.exitPointerLock();
                alert("Kamu Kalah! Bayangan telah menguasaimu.");
              }
            }
          }
        }
      });

      // Update Pergerakan & Kolisi Bola Api Penyihir
      for (let i = fireballs.length - 1; i >= 0; i--) {
        let fb = fireballs[i];
        fb.mesh.position.addScaledVector(fb.dir, fb.speed * delta);

        if (fb.mesh.position.distanceTo(camera.position) < 0.8) {
          player.hp -= fb.damage;
          scene.remove(fb.mesh);
          fireballs.splice(i, 1);

          if (player.hp <= 0) {
            player.hp = 0;
            sGameActive = false;
            document.exitPointerLock();
            alert("Kamu Kalah! Terkena sihir bola api.");
          }
        } else if (fb.mesh.position.distanceTo(camera.position) > 40) {
          scene.remove(fb.mesh);
          fireballs.splice(i, 1);
        }
      }

      updateShadowUI();

      // Naik Level Jika Semua Musuh Kalah
      if (enemies.length === 0) {
        if (currentSLevel < 100) {
          currentSLevel++;
          initShadowLevel(currentSLevel);
        } else {
          alert("Selamat! Anda menaklukkan seluruh 100 Level Shadow Realm 3D!");
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
