/* Danna's prize machine: a 3D claw machine where every prize box opens a portfolio category. */
(() => {
  const stage = document.querySelector(".claw-stage");
  if (!stage) return;
  const canvas = stage.querySelector("canvas");
  const PRIZES = JSON.parse(stage.dataset.prizes);
  const toast = document.querySelector(".claw-toast");
  const tip = stage.querySelector(".claw-tip");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- renderer ----------
  let renderer;
  try {
    if (!window.THREE) throw new Error("three.js missing");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    stage.classList.add("no-gl");
    const msg = stage.querySelector(".loading");
    if (msg) msg.textContent = "The claw machine needs WebGL. Pick a prize from the list instead.";
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  const camTarget = new THREE.Vector3(0, 2.6, 0);

  // ---------- materials ----------
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.25 }, o));
  const M = {
    shell: phys("#ff62a9", { envMapIntensity: 0.55 }),
    shellDeep: phys("#f2479a", { envMapIntensity: 0.7 }),
    shellPale: phys("#ffc1dc", { roughness: 0.4, envMapIntensity: 0.7 }),
    inner: new THREE.MeshStandardMaterial({ color: "#ffb7d6", roughness: 0.75 }),
    floor: new THREE.MeshStandardMaterial({ color: "#ff8fc2", roughness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#f1eef4", metalness: 1, roughness: 0.16 }),
    chromeDark: new THREE.MeshStandardMaterial({ color: "#c9c4cf", metalness: 1, roughness: 0.28 }),
    box: phys("#ffffff", { roughness: 0.38, clearcoat: 0.5 }),
    handle: phys("#ffd0e4", { roughness: 0.12, transparent: true, opacity: 0.86, clearcoat: 1 }),
    ball: phys("#ff8cc3", { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    btnPink: phys("#ff8cc3", { roughness: 0.2, clearcoat: 1 }),
    btnPale: phys("#ffffff", { roughness: 0.2, clearcoat: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.4, clearcoat: 1, depthWrite: false }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: "#ffe6f1", roughness: 0.06, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false }),
    cable: new THREE.MeshStandardMaterial({ color: "#e9e6ee", metalness: 0.9, roughness: 0.3 }),
    coil: new THREE.MeshStandardMaterial({ color: "#ff6fae", roughness: 0.4 }),
    purple: phys("#5a20d8", { envMapIntensity: 0.35, clearcoat: 0.6 }),
    yellow: phys("#ffcc2e", { roughness: 0.22, clearcoat: 1, envMapIntensity: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: "#d63a86", roughness: 0.6 }),
  };

  const RB = (w, h, d, r = 0.12, seg = 4) => new THREE.RoundedBoxGeometry(w, h, d, seg, r);
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, cast = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight("#fff4fa", "#ff9cc8", 0.35));
  const key = new THREE.DirectionalLight("#ffffff", 1.15);
  key.position.set(4, 14, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 10, bottom: -6, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);
  const inside = new THREE.PointLight("#ffe6f2", 0.45, 14, 2);
  inside.position.set(0, 6.4, 1);
  scene.add(inside);

  // ---------- cabinet ----------
  const X = 5, TOP = 7, Z = 3;
  const machine = new THREE.Group();
  scene.add(machine);

  // interior
  const backTex = canvasTex(2048, 1440, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffe3f0"); g.addColorStop(0.55, "#ffc6df"); g.addColorStop(1, "#ff9fca");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ff5fa8";
    c.font = "56px Anton, Impact, sans-serif";
    c.textBaseline = "top";
    c.fillText("DANNAJERCEELAYDEROS@GMAIL.COM", 120, 110);
    c.textAlign = "right";
    c.fillText("DANNAJERCEE.VERCEL.APP", w - 120, 110);
    c.textAlign = "center";
    c.globalAlpha = 0.16; c.fillStyle = "#ffffff";
    c.font = "420px Anton, Impact, sans-serif";
    c.fillText("PRIZES", w / 2, 360);
  });
  mesh(new THREE.PlaneGeometry(X * 2, TOP), new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.8 }), 0, TOP / 2, -Z, machine, false);
  [-1, 1].forEach((s) => {
    const p = mesh(new THREE.PlaneGeometry(Z * 2, TOP), M.inner, s * X, TOP / 2, 0, machine, false);
    p.rotation.y = -s * Math.PI / 2;
  });
  const ceil = mesh(new THREE.PlaneGeometry(X * 2, Z * 2), M.inner, 0, TOP, 0, machine, false);
  ceil.rotation.x = Math.PI / 2;
  const floor = mesh(new THREE.PlaneGeometry(X * 2, Z * 2), M.floor, 0, 0, 0, machine, false);
  floor.rotation.x = -Math.PI / 2;
  // raised back step so the back row of prizes peeks over the front
  mesh(RB(X * 2 - 0.1, 0.62, 1.9, 0.18), M.shellPale, 0, 0.31 - 0.001, -Z + 0.95 + 0.05, machine, false);
  // ceiling light strip
  const strip = mesh(RB(8.6, 0.08, 0.5, 0.04, 2), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff3f9", emissiveIntensity: 0.9 }), 0, TOP - 0.06, 2.4, machine, false);

  // shell
  const depth = Z * 2 + 1.2;
  mesh(RB(1.5, 12.4, depth, 0.32), M.shell, -X - 0.72, 2.5, 0, machine);
  mesh(RB(1.5, 12.4, depth, 0.32), M.shell, X + 0.72, 2.5, 0, machine);
  const header = mesh(RB(X * 2 + 2.9, 2.4, depth, 0.36), M.shell, 0, TOP + 1.18, 0, machine);
  mesh(RB(X * 2 + 2.9, 3.7, depth, 0.36), M.shell, 0, -1.85, 0, machine);
  mesh(RB(X * 2 + 2.6, 12.2, 0.4, 0.15), M.shellDeep, 0, 2.5, -Z - 0.25, machine);
  // inner frame around the window
  const fz = Z + 0.42;
  mesh(RB(X * 2 + 0.5, 0.34, 0.5, 0.14), M.shellDeep, 0, TOP + 0.05, fz, machine);
  mesh(RB(X * 2 + 0.5, 0.34, 0.5, 0.14), M.shellDeep, 0, -0.05, fz, machine);
  mesh(RB(0.34, TOP + 0.4, 0.5, 0.14), M.shellDeep, -X - 0.08, TOP / 2, fz, machine);
  mesh(RB(0.34, TOP + 0.4, 0.5, 0.14), M.shellDeep, X + 0.08, TOP / 2, fz, machine);
  const glass = mesh(new THREE.PlaneGeometry(X * 2, TOP), M.glass, 0, TOP / 2, Z + 0.3, machine, false);
  glass.renderOrder = 10;
  // screws
  [[-X - 0.72, TOP + 1.9], [X + 0.72, TOP + 1.9], [-X - 0.72, -3.2], [X + 0.72, -3.2]].forEach(([x, y]) => {
    const s = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 20), M.chromeDark, x, y, depth / 2 + 0.01, machine, false);
    s.rotation.x = Math.PI / 2;
  });

  // marquee sign with chasing bulbs
  function drawSign(c, w, h) {
    c.fillStyle = "#ff5fa8"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffffff";
    c.font = "150px Anton, Impact, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("GRAB A PRIZE", w / 2, h / 2 + 8);
  }
  const signTex = canvasTex(1600, 260, (c, w, h) => {
    drawSign(c, w, h);
  });
  const sign = mesh(RB(7.6, 1.25, 0.2, 0.1), [M.shellDeep, M.shellDeep, M.shellDeep, M.shellDeep, new THREE.MeshStandardMaterial({ map: signTex, emissive: "#ffffff", emissiveMap: signTex, emissiveIntensity: 0.25, roughness: 0.4 }), M.shellDeep], 0, TOP + 1.2, depth / 2 + 0.06, machine);
  sign.geometry.groups.forEach((g, i) => (g.materialIndex = i));
  const bulbs = [];
  const bulbGeo = new THREE.SphereGeometry(0.075, 14, 10);
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    let x, y;
    if (t < 0.38) { x = -4.05 + (t / 0.38) * 8.1; y = 0.82; }
    else if (t < 0.5) { x = 4.05; y = 0.82 - ((t - 0.38) / 0.12) * 1.64; }
    else if (t < 0.88) { x = 4.05 - ((t - 0.5) / 0.38) * 8.1; y = -0.82; }
    else { x = -4.05; y = -0.82 + ((t - 0.88) / 0.12) * 1.64; }
    const b = mesh(bulbGeo, new THREE.MeshStandardMaterial({ color: "#fff6c9", emissive: "#ffd86a", emissiveIntensity: 1 }), x, TOP + 1.2 + y * 0.92, depth / 2 + 0.12, machine, false);
    bulbs.push(b);
  }

  // name strip at the bottom of the window
  const lipTex = canvasTex(2400, 180, (c, w, h) => {
    c.fillStyle = "#fff4f9"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#ff5fa8";
    c.font = "78px Anton, Impact, sans-serif";
    c.textBaseline = "middle";
    c.textAlign = "left"; c.fillText("2026", 120, h / 2 + 4);
    c.textAlign = "center"; c.fillText("DANNA JERCEE", w * 0.3, h / 2 + 4);
    c.textAlign = "right"; c.fillText("DESIGNER ★", w - 120, h / 2 + 4);
  });
  const lip = mesh(new THREE.BoxGeometry(X * 2 - 0.1, 0.72, 0.12), [M.box, M.box, M.box, M.box, new THREE.MeshStandardMaterial({ map: lipTex, roughness: 0.5 }), M.box], 0, 0.36, Z + 0.12, machine);

  // prize chute (front left) and door
  const CHUTE = { x: -3.85, z: 1.85 };
  const chute = new THREE.Group();
  chute.position.set(CHUTE.x, 0, CHUTE.z);
  machine.add(chute);
  const cw = 2.0, cd = 2.1, ch = 1.45;
  mesh(new THREE.BoxGeometry(cw, ch, 0.05), M.acrylic, 0, ch / 2, -cd / 2, chute, false).renderOrder = 5;
  mesh(new THREE.BoxGeometry(0.05, ch, cd), M.acrylic, cw / 2, ch / 2, 0, chute, false).renderOrder = 5;
  mesh(RB(cw + 0.1, 0.1, 0.14, 0.04, 2), M.shellDeep, 0, ch, -cd / 2, chute, false);
  mesh(RB(0.14, 0.1, cd + 0.1, 0.04, 2), M.shellDeep, cw / 2, ch, 0, chute, false);
  const hole = mesh(new THREE.PlaneGeometry(cw - 0.1, cd - 0.1), new THREE.MeshStandardMaterial({ color: "#d94f92", roughness: 0.9 }), 0, 0.01, 0, chute, false);
  hole.rotation.x = -Math.PI / 2;
  const door = mesh(RB(3.2, 1.9, 0.3, 0.3), M.shellPale, -3.3, -2.0, depth / 2 + 0.02, machine);
  mesh(RB(2.7, 1.45, 0.3, 0.24), new THREE.MeshStandardMaterial({ color: "#f06aa9", roughness: 0.7 }), -3.3, -2.0, depth / 2 + 0.06, machine, false);
  const flap = mesh(RB(2.6, 1.3, 0.06, 0.2), M.acrylic, -3.3, -2.0, depth / 2 + 0.24, machine, false);

  // control panel
  const panel = new THREE.Group();
  panel.position.set(2.4, -0.55, depth / 2 + 0.75);
  machine.add(panel);
  const desk = mesh(RB(6.4, 0.6, 1.9, 0.26), M.shellPale, 0, 0, 0, panel);
  desk.rotation.x = 0.12;
  mesh(RB(6.6, 1.6, 1.5, 0.3), M.shell, 0, -0.95, -0.25, panel);
  const joy = new THREE.Group();
  joy.position.set(-1.0, 0.32, 0.05);
  panel.add(joy);
  const joyBase = mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.08, 40), M.chrome, 0, 0, 0, joy);
  mesh(new THREE.TorusGeometry(0.62, 0.05, 12, 40), M.chromeDark, 0, 0.04, 0, joy).rotation.x = Math.PI / 2;
  const stick = new THREE.Group();
  joy.add(stick);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.05, 16), M.chrome, 0, 0.52, 0, stick);
  const ball = mesh(new THREE.SphereGeometry(0.42, 40, 28), M.ball, 0, 1.18, 0, stick);
  ball.userData.ctrl = "joystick";
  const btnSmall = new THREE.Group(); btnSmall.position.set(1.0, 0.32, 0.1); panel.add(btnSmall);
  mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.1, 32), M.chrome, 0, 0, 0, btnSmall);
  const capS = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.16, 32), M.btnPink, 0, 0.1, 0, btnSmall);
  capS.userData.ctrl = "grab";
  const btnBig = new THREE.Group(); btnBig.position.set(2.35, 0.32, 0.1); panel.add(btnBig);
  mesh(new THREE.CylinderGeometry(0.56, 0.6, 0.12, 40), M.chrome, 0, 0, 0, btnBig);
  const capB = mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.2, 40), M.btnPale, 0, 0.12, 0, btnBig);
  capB.userData.ctrl = "grab";

  // ---------- gantry + claw ----------
  const RAIL_Y = TOP - 0.45;
  [-1, 1].forEach((s) => {
    const r = mesh(new THREE.CylinderGeometry(0.06, 0.06, X * 2, 12), M.chromeDark, 0, RAIL_Y, s * (Z - 0.35), machine, false);
    r.rotation.z = Math.PI / 2;
  });
  const bridge = new THREE.Group();
  scene.add(bridge);
  const bridgeBar = mesh(new THREE.BoxGeometry(0.22, 0.16, Z * 2 - 0.5), M.chrome, 0, RAIL_Y + 0.02, 0, bridge, false);
  const carriage = mesh(RB(0.8, 0.42, 0.62, 0.1, 2), M.shellPale, 0, RAIL_Y - 0.12, 0, scene, true);
  const cable = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), M.cable, 0, 0, 0, scene, false);
  // coiled pink cord (like the reference machine)
  const coilPts = [];
  for (let i = 0; i <= 120; i++) { const t = i / 120; coilPts.push(new THREE.Vector3(Math.cos(t * 40) * 0.09, -t, Math.sin(t * 40) * 0.09)); }
  const coil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 400, 0.022, 6, false), M.coil, 0, 0, 0, scene, false);

  const claw = new THREE.Group();
  scene.add(claw);
  mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.55, 28), M.chrome, 0, 0, 0, claw);
  mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.18, 28), M.chromeDark, 0, -0.35, 0, claw);
  mesh(new THREE.TorusGeometry(0.33, 0.05, 10, 28), M.chromeDark, 0, 0.18, 0, claw).rotation.x = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.16, 20, 14), M.chrome, 0, -0.46, 0, claw);
  const fingerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.32, -0.36, 0), new THREE.Vector3(0.5, -0.9, 0),
    new THREE.Vector3(0.42, -1.32, 0), new THREE.Vector3(0.18, -1.56, 0),
  ]);
  const fingerGeo = new THREE.TubeGeometry(fingerCurve, 40, 0.055, 10, false);
  const tipGeo = new THREE.SphereGeometry(0.075, 12, 10);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * 0.17, -0.42, Math.sin(a) * 0.17);
    holder.rotation.y = -a;
    claw.add(holder);
    const pivot = new THREE.Group();
    holder.add(pivot);
    mesh(fingerGeo, M.chrome, 0, 0, 0, pivot);
    mesh(tipGeo, M.chrome, 0.18, -1.56, 0, pivot);
    fingers.push(pivot);
  }
  let clawOpen = 0.55;
  const setOpen = (v) => { clawOpen = v; fingers.forEach((f) => (f.rotation.z = v)); };
  setOpen(0.4);

  const CLAW_REST_Y = 5.4;
  const C = { x: 0, z: -0.2, y: CLAW_REST_Y };
  const BOUND = { x: X - 0.85, z: Z - 0.8 };

  function placeGantry() {
    bridge.position.x = C.x;
    carriage.position.set(C.x, RAIL_Y - 0.12, C.z);
    claw.position.set(C.x, C.y, C.z);
    const top = RAIL_Y - 0.33, bottom = C.y + 0.28, len = Math.max(0.05, top - bottom);
    cable.scale.y = len;
    cable.position.set(C.x, (top + bottom) / 2, C.z);
    coil.scale.y = len;
    coil.position.set(C.x + 0.2, top, C.z);
  }

  // ---------- fuzzy letters ----------
  const furVert = `
    uniform float uShell; uniform float uLen; uniform float uTime; uniform float uWiggle;
    varying vec3 vPos; varying vec3 vN; varying float vH;
    void main(){
      vec3 p = position + normal * uLen * uShell;
      p.y -= 0.05 * uShell * uShell;
      p.x += sin(uTime * 2.0 + position.y * 3.0) * 0.012 * uShell * uWiggle;
      vPos = position; vH = uShell;
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const furFrag = `
    uniform vec3 uRoot; uniform vec3 uTip; uniform float uGlow;
    varying vec3 vPos; varying vec3 vN; varying float vH;
    float hash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main(){
      vec3 q = vPos * 46.0;
      vec3 cell = floor(q);
      float r = hash(cell);
      if (vH > 0.0) {
        float d = length(fract(q) - 0.5);
        float len = 0.45 + 0.55 * r;
        if (vH > len) discard;
        if (d > 0.62 * (1.0 - vH / len)) discard;
      }
      vec3 L = normalize(vec3(0.35, 0.85, 0.6));
      float diff = 0.72 + 0.32 * max(dot(normalize(vN), L), 0.0);
      float ao = 0.74 + 0.26 * vH;
      vec3 col = mix(uRoot, uTip, vH * vH) * diff * ao + uGlow * 0.12;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`;
  const furUniforms = { uTime: { value: 0 } };
  const letters = [];

  // ---------- prize boxes ----------
  const prizes = [];
  const prizeLayout = [
    [-3.25, 0.62, -1.85, 0.16], [-1.1, 0.62, -1.9, -0.12], [1.1, 0.62, -1.85, 0.1], [3.25, 0.62, -1.9, -0.18],
    [-2.15, 0.0, -0.1, -0.22], [0.25, 0.0, 0.0, 0.14], [2.6, 0.0, -0.1, -0.1],
  ];
  function labelTex(p) {
    return canvasTex(640, 420, (c, w, h) => {
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, w, h);
      c.fillStyle = p.color; c.fillRect(0, h - 70, w, 70);
      c.fillStyle = p.color;
      const words = p.label.toUpperCase().split(" ");
      const lines = words.length > 1 && p.label.length > 9 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [p.label.toUpperCase()];
      let size = lines.length > 1 ? 118 : 150;
      c.font = `${size}px Anton, Impact, sans-serif`;
      while (Math.max(...lines.map((l) => c.measureText(l).width)) > w - 70) { size -= 6; c.font = `${size}px Anton, Impact, sans-serif`; }
      c.textAlign = "center"; c.textBaseline = "middle";
      const mid = (h - 70) / 2 + 6;
      lines.forEach((l, i) => c.fillText(l, w / 2, mid + (i - (lines.length - 1) / 2) * size * 0.98));
      c.fillStyle = "#ffffff";
      c.font = "30px Silkscreen, monospace";
      c.fillText("DANNA ★ PRIZE", w / 2, h - 34);
    });
  }
  const BW = 1.62, BH = 1.2;
  const boxGeo = RB(BW, BH, BH, 0.11, 4);
  const handleGeo = new THREE.TorusGeometry(0.38, 0.08, 14, 36, Math.PI);
  PRIZES.forEach((p, i) => {
    const [x, y, z, ry] = prizeLayout[i % prizeLayout.length];
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    g.rotation.z = (i % 2 ? 1 : -1) * 0.04;
    const lbl = new THREE.MeshPhysicalMaterial({ map: labelTex(p), roughness: 0.4, clearcoat: 0.5 });
    const body = mesh(boxGeo, [M.box, M.box, M.box, M.box, lbl, M.box], 0, BH / 2, 0, g);
    boxGeo.groups.forEach((gr, gi) => (gr.materialIndex = gi));
    const handle = mesh(handleGeo, M.handle, 0, BH, 0, g);
    const tag = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4 }), BW / 2 - 0.2, BH - 0.18, BH / 2 + 0.005, g, false);
    tag.rotation.x = Math.PI / 2;
    g.traverse((o) => { if (o.isMesh) o.userData.prize = i; });
    scene.add(g);
    prizes.push({ ...p, g, home: g.position.clone(), homeRot: g.rotation.clone(), state: "idle", top: y + BH + 0.38 });
  });

  // ---------- load font + build letters ----------
  function buildLetters(font) {
    const word = "DANNA";
    const spots = [
      [-1.45, 1.75, -0.18, 0.22], [0.15, 1.95, 0.12, -0.2], [1.75, 1.7, -0.06, 0.12],
      [3.3, 1.95, 0.16, -0.28], [4.25, 2.55, -0.32, 0.4],
    ];
    const root = lin("#f2569f"), tipC = lin("#ffd3e8");
    [...word].forEach((ch, i) => {
      const geo = new THREE.TextGeometry(ch, { font, size: 1.2, height: 0.5, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.09, bevelSegments: 4 });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
      geo.computeVertexNormals();
      const g = new THREE.Group();
      const [x, z, rz, ry] = spots[i];
      g.position.set(x, 0.02, z);
      g.rotation.set(-0.05, ry, rz);
      const SHELLS = reduce ? 10 : 22;
      for (let s = 0; s < SHELLS; s++) {
        const mat = new THREE.ShaderMaterial({
          vertexShader: furVert, fragmentShader: furFrag,
          uniforms: { uShell: { value: s / (SHELLS - 1) }, uLen: { value: 0.16 }, uTime: furUniforms.uTime, uWiggle: { value: 1 }, uRoot: { value: root }, uTip: { value: tipC }, uGlow: { value: 0 } },
        });
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = s === 0;
        m.receiveShadow = false;
        g.add(m);
      }
      scene.add(g);
      letters.push(g);
    });
  }

  // ---------- camera fit ----------
  let W = 1, H = 1;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const needH = 14.6, needW = 14.4;
    const dist = Math.max(needH / 2 / Math.tan(fov / 2), needW / 2 / (Math.tan(fov / 2) * camera.aspect)) * 1.02;
    camera.userData.dist = dist;
    camera.userData.placed = false;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- input ----------
  const keys = new Set();
  let busy = false;
  let joyVec = { x: 0, z: 0 };
  let lastInput = performance.now();
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hover = -1, dragJoy = false, dragStart = null;
  const look = { x: 0, y: 0 };

  function setPtr(ev) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    look.x = ptr.x; look.y = ptr.y;
  }
  function pick() {
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects([...prizes.map((p) => p.g), ball, capS, capB], true);
    return hits[0] ? hits[0].object : null;
  }
  canvas.addEventListener("pointermove", (ev) => {
    setPtr(ev);
    if (dragJoy) {
      const dx = (ev.clientX - dragStart.x) / 60, dy = (ev.clientY - dragStart.y) / 60;
      joyVec = { x: THREE.MathUtils.clamp(dx, -1, 1), z: THREE.MathUtils.clamp(dy, -1, 1) };
      lastInput = performance.now();
      return;
    }
    const o = pick();
    const idx = o && o.userData.prize !== undefined ? o.userData.prize : -1;
    hover = busy ? -1 : idx;
    canvas.style.cursor = o && (idx >= 0 || o.userData.ctrl) ? "pointer" : "";
    if (hover >= 0 && prizes[hover].state === "idle") {
      tip.textContent = prizes[hover].label;
      tip.hidden = false;
      const r = canvas.getBoundingClientRect();
      tip.style.left = ev.clientX - r.left + "px";
      tip.style.top = ev.clientY - r.top + "px";
    } else tip.hidden = true;
  });
  canvas.addEventListener("pointerleave", () => { tip.hidden = true; hover = -1; look.x = 0; look.y = 0; });
  canvas.addEventListener("pointerdown", (ev) => {
    setPtr(ev);
    const o = pick();
    if (!o) return;
    if (o.userData.ctrl === "joystick") {
      dragJoy = true; dragStart = { x: ev.clientX, y: ev.clientY };
      canvas.setPointerCapture(ev.pointerId);
    } else if (o.userData.ctrl === "grab") {
      press(o); grab();
    } else if (o.userData.prize !== undefined) {
      grabPrize(o.userData.prize);
    }
  });
  const endDrag = () => { if (dragJoy) { dragJoy = false; joyVec = { x: 0, z: 0 }; } };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  stage.addEventListener("keydown", (ev) => {
    const k = ev.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(k)) { keys.add(k); ev.preventDefault(); lastInput = performance.now(); }
    if (k === " " || k === "enter") { if (ev.target === canvas || ev.target === stage) { ev.preventDefault(); grab(); } }
  });
  stage.addEventListener("keyup", (ev) => keys.delete(ev.key.toLowerCase()));

  // on-screen pad
  document.querySelectorAll("[data-pad]").forEach((b) => {
    const dir = b.dataset.pad;
    const on = (ev) => { ev.preventDefault(); keys.add("pad-" + dir); lastInput = performance.now(); };
    const off = () => keys.delete("pad-" + dir);
    b.addEventListener("pointerdown", on);
    ["pointerup", "pointerleave", "pointercancel"].forEach((t) => b.addEventListener(t, off));
  });
  document.querySelectorAll("[data-grab]").forEach((b) => b.addEventListener("click", () => grab()));
  document.querySelectorAll("[data-prize]").forEach((b) => b.addEventListener("click", (ev) => {
    const i = prizes.findIndex((p) => p.id === b.dataset.prize);
    if (i < 0) return;
    ev.preventDefault();
    const r = stage.getBoundingClientRect();
    if (r.top < -r.height * 0.4 || r.bottom > innerHeight + r.height * 0.4) stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    grabPrize(i);
  }));

  function press(obj) {
    obj.position.y -= 0.07;
    setTimeout(() => (obj.position.y += 0.07), 160);
  }

  // ---------- animation helpers ----------
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tweens = [];
  function tween(dur, fn) {
    return new Promise((res) => tweens.push({ t0: performance.now(), dur: reduce ? dur * 0.4 : dur, fn, res }));
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? ms * 0.4 : ms));
  function moveClaw(x, z, dur) {
    const sx = C.x, sz = C.z;
    return tween(dur, (k) => { C.x = sx + (x - sx) * k; C.z = sz + (z - sz) * k; });
  }
  function moveY(y, dur) { const sy = C.y; return tween(dur, (k) => { C.y = sy + (y - sy) * k; }); }
  function openTo(v, dur) { const s = clawOpen; return tween(dur, (k) => setOpen(s + (v - s) * k)); }

  async function grabPrize(i) {
    if (busy) return;
    const p = prizes[i];
    if (p.state !== "idle") return;
    stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    busy = true;
    const d = Math.hypot(p.g.position.x - C.x, p.g.position.z - C.z);
    await moveClaw(p.g.position.x, p.g.position.z, 500 + d * 220);
    busy = false;
    grab();
  }

  async function grab() {
    if (busy) return;
    busy = true;
    tip.hidden = true;
    stage.classList.add("is-grabbing");
    let target = -1, best = 0.85;
    prizes.forEach((p, i) => {
      if (p.state !== "idle") return;
      const d = Math.hypot(p.g.position.x - C.x, p.g.position.z - C.z);
      if (d < best) { best = d; target = i; }
    });
    await openTo(0.62, 300);
    const p = prizes[target];
    const downTo = p ? p.top + 0.62 : 2.15;
    await moveY(downTo, 1100);
    await openTo(-0.1, 420);
    if (!p) {
      await moveY(CLAW_REST_Y, 900);
      await openTo(0.4, 300);
      say("So close!", "The claw came up empty. Line it up over a box and try again.", null);
      busy = false; stage.classList.remove("is-grabbing");
      return;
    }
    p.state = "held";
    const off = new THREE.Vector3().subVectors(p.g.position, new THREE.Vector3(C.x, C.y, C.z));
    const r0 = p.g.rotation.clone();
    p.follow = () => { p.g.position.set(C.x + off.x * 0.6, C.y + off.y, C.z + off.z * 0.6); };
    await moveY(CLAW_REST_Y, 1000);
    const sway = tween(1300, (k) => { p.g.rotation.z = r0.z + Math.sin(k * Math.PI * 3) * 0.08 * (1 - k); });
    await moveClaw(CHUTE.x, CHUTE.z, 1300);
    await sway;
    await openTo(0.62, 260);
    p.follow = null;
    p.state = "drop";
    const sy = p.g.position.y;
    await tween(750, (k) => {
      p.g.position.y = sy - (sy + 1.8) * k * k;
      p.g.rotation.x = r0.x + k * 0.9;
      p.g.rotation.z = r0.z + k * 0.6;
    });
    p.g.visible = false;
    flap.rotation.x = -0.35;
    setTimeout(() => (flap.rotation.x = 0), 420);
    burst();
    say("You won!", p.label, p);
    await wait(250);
    moveClaw(0, -0.2, 900).then(() => openTo(0.4, 300));
    await wait(900);
    busy = false;
    stage.classList.remove("is-grabbing");
    setTimeout(() => respawn(p), 2200);
  }

  async function respawn(p) {
    p.g.position.copy(p.home);
    p.g.position.y += 3;
    p.g.rotation.copy(p.homeRot);
    p.g.scale.setScalar(0.01);
    p.g.visible = true;
    p.state = "spawn";
    await tween(700, (k) => {
      const s = 1 - Math.pow(1 - k, 3);
      p.g.scale.setScalar(Math.max(0.01, s));
      p.g.position.y = p.home.y + 3 * (1 - k) * (1 - k);
    });
    p.state = "idle";
  }

  // ---------- toast ----------
  let toastTimer = 0;
  function say(title, text, p) {
    toast.querySelector(".t-title").textContent = title;
    toast.querySelector(".t-text").textContent = p ? p.label : text;
    const a = toast.querySelector(".t-go");
    if (p) { a.href = "#" + p.id; a.textContent = "Open prize"; a.hidden = false; toast.style.setProperty("--pc", p.color); }
    else { a.hidden = true; toast.style.setProperty("--pc", "#ff5fa8"); }
    toast.hidden = false;
    toast.classList.remove("show"); void toast.offsetWidth; toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), p ? 7000 : 3200);
  }
  toast.querySelector(".t-go").addEventListener("click", () => toast.classList.remove("show"));

  function burst() {
    const layer = stage.querySelector(".claw-confetti");
    if (!layer || reduce) return;
    const colors = ["#ff5fa8", "#ffd54a", "#8c6bff", "#4fc8f2", "#ffffff"];
    const v = new THREE.Vector3(CHUTE.x, 0.4, CHUTE.z + 1.2).project(camera);
    const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i");
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const sp = 90 + Math.random() * 160;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.background = colors[i % colors.length];
      s.style.setProperty("--dx", Math.cos(a) * sp + "px");
      s.style.setProperty("--dy", Math.sin(a) * sp + "px");
      s.style.setProperty("--r", Math.random() * 720 + "deg");
      s.addEventListener("animationend", () => s.remove());
      layer.appendChild(s);
    }
  }

  // ---------- loop ----------
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });

  let last = performance.now(), running = false;
  const camPos = new THREE.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    furUniforms.uTime.value = now / 1000;

    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(ease(k));
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }

    // manual control
    let ix = joyVec.x, iz = joyVec.z;
    if (keys.has("arrowleft") || keys.has("a") || keys.has("pad-left")) ix -= 1;
    if (keys.has("arrowright") || keys.has("d") || keys.has("pad-right")) ix += 1;
    if (keys.has("arrowup") || keys.has("w") || keys.has("pad-up")) iz -= 1;
    if (keys.has("arrowdown") || keys.has("s") || keys.has("pad-down")) iz += 1;
    if (!busy && (ix || iz)) {
      C.x = THREE.MathUtils.clamp(C.x + ix * dt * 4.2, -BOUND.x, BOUND.x);
      C.z = THREE.MathUtils.clamp(C.z + iz * dt * 3.2, -BOUND.z, BOUND.z);
      lastInput = now;
    }
    // idle drift so the machine feels alive
    if (!busy && !reduce && now - lastInput > 7000 && !ix && !iz) {
      const t = now / 1000;
      C.x += (Math.sin(t * 0.35) * 2.6 - C.x) * dt * 0.6;
      C.z += (Math.sin(t * 0.23) * 0.9 - 0.4 - C.z) * dt * 0.6;
    }
    stick.rotation.z += ((-ix * 0.32) - stick.rotation.z) * Math.min(1, dt * 12);
    stick.rotation.x += ((iz * 0.32) - stick.rotation.x) * Math.min(1, dt * 12);

    placeGantry();
    prizes.forEach((p, i) => {
      if (p.follow) p.follow();
      const glow = i === hover && p.state === "idle" ? 1 : 0;
      p.hl = (p.hl || 0) + (glow - (p.hl || 0)) * Math.min(1, dt * 10);
      p.g.children[0].material.forEach((m) => { if (m.emissive) m.emissive.setRGB(p.hl * 0.12, p.hl * 0.04, p.hl * 0.08); });
    });

    // bulbs chase
    const step = Math.floor(now / 140);
    bulbs.forEach((b, i) => { b.material.emissiveIntensity = (i + step) % 3 === 0 ? 2.2 : 0.35; });

    // camera parallax
    const dist = camera.userData.dist || 40;
    const ax = (reduce ? 0 : look.x) * 0.16, ay = (reduce ? 0 : look.y) * 0.08;
    camPos.set(Math.sin(ax - 0.1) * dist, camTarget.y + dist * 0.3 + ay * dist * 0.5, Math.cos(ax - 0.1) * dist);
    if (!camera.userData.placed) { camera.position.copy(camPos); camera.userData.placed = true; }
    else camera.position.lerp(camPos, Math.min(1, dt * 3));
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
  }
  // adaptive quality: if frames are slow (older phones), drop resolution and fur density
  const STILL = /[?&]still\b/.test(location.search);
  let slowFrames = 0, degraded = 0;
  function adapt(ms) {
    if (degraded >= 2) return;
    slowFrames = ms > 34 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 30) return;
    slowFrames = 0; degraded++;
    if (degraded === 1) { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); resize(); }
    else {
      renderer.setPixelRatio(1); resize();
      letters.forEach((g) => g.children.forEach((m, i) => { if (i % 2) m.visible = false; }));
    }
  }
  function loop() {
    if (STILL) { requestAnimationFrame(frame); return; }
    if (running) return;
    running = true;
    let prevT = 0;
    last = performance.now();
    const tick = (t) => {
      if (!visible || document.hidden) { running = false; return; }
      if (prevT) adapt(t - prevT);
      prevT = t;
      frame(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // build after fonts so canvas labels use the right typefaces
  const fontsReady = Promise.all([
    document.fonts.load("150px Anton"), document.fonts.load("30px Silkscreen"),
  ]).catch(() => {});
  fontsReady.then(() => {
    // redraw canvas textures now that fonts are ready
    prizes.forEach((p) => { const m = p.g.children[0].material[4]; m.map = labelTex(p); m.needsUpdate = true; });
    redraw(signTex, drawSign);
    redraw(lipTex, (c, w, h) => { c.fillStyle = "#fff4f9"; c.fillRect(0, 0, w, h); c.fillStyle = "#ff5fa8"; c.font = "78px Anton, Impact, sans-serif"; c.textBaseline = "middle"; c.textAlign = "left"; c.fillText("2026", 120, h / 2 + 4); c.textAlign = "center"; c.fillText("DANNA JERCEE", w * 0.3, h / 2 + 4); c.textAlign = "right"; c.fillText("DESIGNER ★", w - 120, h / 2 + 4); });
    redraw(backTex, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#ffe3f0"); g.addColorStop(0.55, "#ffc6df"); g.addColorStop(1, "#ff9fca");
      c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = "#ff5fa8"; c.font = "56px Anton, Impact, sans-serif"; c.textBaseline = "top";
      c.fillText("DANNAJERCEELAYDEROS@GMAIL.COM", 120, 110); c.textAlign = "right"; c.fillText("DANNAJERCEE.VERCEL.APP", w - 120, 110);
      c.textAlign = "center"; c.globalAlpha = 0.16; c.fillStyle = "#ffffff"; c.font = "420px Anton, Impact, sans-serif"; c.fillText("PRIZES", w / 2, 360);
    });
  });
  function redraw(tex, draw) { const c = tex.image; const ctx = c.getContext("2d"); ctx.save(); ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height); ctx.restore(); tex.needsUpdate = true; }

  new THREE.FontLoader().load(stage.dataset.font, (font) => {
    buildLetters(font);
    stage.classList.add("is-ready");
  }, undefined, () => stage.classList.add("is-ready"));

  placeGantry();
  loop();
  window.__claw = { grab, grabPrize, C, prizes, render: () => frame(performance.now()) };
})();
