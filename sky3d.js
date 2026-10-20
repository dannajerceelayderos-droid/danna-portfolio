/* Floating 3D sparkles, puffy stars, hearts, clouds and droplets around the Eye Muse carousel. */
(() => {
  const host = document.querySelector('[data-deco="sky"]');
  if (!host || !window.THREE) return;
  const canvas = host.querySelector(".gummy-canvas");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STILL = /[?&]still\b/.test(location.search);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.LinearEncoding; // hex colours render as authored
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  if (THREE.RoomEnvironment) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  }
  scene.add(new THREE.HemisphereLight("#ffffff", "#b9cff7", 0.5));
  const key = new THREE.DirectionalLight("#ffffff", 0.9);
  key.position.set(3, 6, 8);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 20);

  const glossy = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({
    color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.45, emissive: color, emissiveIntensity: 0.18,
  }, o));
  const MAT = {
    yellow: glossy("#ffd54a"),
    blue: glossy("#6f9cf2"),
    sky: glossy("#a9c8ff"),
    white: glossy("#ffffff", { emissiveIntensity: 0.25 }),
    cloud: glossy("#ffffff", { roughness: 0.6, clearcoat: 0.3, emissiveIntensity: 0.35 }),
    drop: new THREE.MeshPhysicalMaterial({ color: "#cfe3ff", roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 1.2, emissive: "#9fc2ff", emissiveIntensity: 0.15 }),
  };

  const extrude = (shape, depth, bevel) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 6, curveSegments: 24 });
    g.center();
    return g;
  };
  // 4-point sparkle with curved inner edges
  const sparkleGeo = (() => {
    const s = new THREE.Shape(), k = 0.16;
    s.moveTo(0, 1);
    s.quadraticCurveTo(k, k, 1, 0);
    s.quadraticCurveTo(k, -k, 0, -1);
    s.quadraticCurveTo(-k, -k, -1, 0);
    s.quadraticCurveTo(-k, k, 0, 1);
    return extrude(s, 0.12, 0.08);
  })();
  // puffy 5-point star
  const starGeo = (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.45 : 1;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    return extrude(s, 0.18, 0.22);
  })();
  const heartGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.9);
    s.bezierCurveTo(-0.2, -0.65, -1.05, -0.2, -1.0, 0.3);
    s.bezierCurveTo(-0.95, 0.85, -0.25, 0.95, 0, 0.45);
    s.bezierCurveTo(0.25, 0.95, 0.95, 0.85, 1.0, 0.3);
    s.bezierCurveTo(1.05, -0.2, 0.2, -0.65, 0, -0.9);
    return extrude(s, 0.22, 0.2);
  })();
  const dropGeo = (() => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32, a = t * Math.PI;
      const r = Math.sin(a) * Math.pow(1 - t, 0.9) * 0.75 + (t > 0.98 ? 0 : 0);
      pts.push(new THREE.Vector2(Math.max(0.001, r), -Math.cos(a) * 0.9 + t * 0.6));
    }
    return new THREE.LatheGeometry(pts, 32);
  })();
  function cloud() {
    const g = new THREE.Group();
    [[0, 0, 0.62], [-0.62, -0.15, 0.45], [0.6, -0.12, 0.5], [0.25, 0.3, 0.48], [-0.3, 0.25, 0.42]].forEach(([x, y, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), MAT.cloud);
      m.position.set(x, y, 0); m.scale.z = 0.7; g.add(m);
    });
    return g;
  }
  const make = (type) => {
    if (type === "cloud") return cloud();
    const geo = { sparkle: sparkleGeo, star: starGeo, heart: heartGeo, drop: dropGeo }[type];
    const mat = { sparkle: null, star: null, heart: MAT.yellow, drop: MAT.drop }[type];
    return new THREE.Mesh(geo, mat || MAT.yellow);
  };

  // [type, material, x, y (fractions of half-size), z, scale, twinkle]
  const SPOTS = [
    ["sparkle", "yellow", -0.97, 0.28, 1.5, 0.7, 1], ["star", "blue", 0.9, 0.72, 0.5, 0.7, 0],
    ["cloud", null, -0.94, -0.35, 0.8, 0.95, 0], ["heart", "yellow", 0.95, -0.4, 2, 0.6, 0],
    ["sparkle", "blue", 0.62, -0.98, 1, 0.55, 1], ["drop", null, -0.6, -0.98, 2.5, 0.6, 0],
    ["sparkle", "white", 0.3, 1.04, -1, 0.45, 1], ["star", "yellow", -0.18, 1.06, -1.5, 0.42, 0],
    ["cloud", null, 0.98, 0.15, -1.5, 0.75, 0], ["sparkle", "yellow", -0.99, 0.05, -1, 0.4, 1],
  ];
  const items = SPOTS.map(([type, mat, fx, fy, z, s, tw], i) => {
    const o = make(type);
    if (mat && o.isMesh && type !== "heart") o.material = MAT[mat];
    o.userData = { fx, fy, z, s, tw, phase: i * 1.9, spin: (i % 2 ? 1 : -1) * (0.3 + (i % 3) * 0.1), tilt: (i % 3 - 1) * 0.4, type };
    scene.add(o);
    return o;
  });

  let W = 1, H = 1, halfW = 1, halfH = 1, mobile = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    mobile = W < 700;
    const k = mobile ? 0.75 : Math.min(1.25, W / 1100);
    items.forEach((o, i) => {
      const u = o.userData;
      o.visible = !mobile || [0, 1, 3, 4, 6].includes(i);
      u.base = new THREE.Vector3(u.fx * (halfW - 1.1 * k), u.fy * (halfH - 1.1 * k), u.z);
      u.size = u.s * k * (mobile ? 0.85 : 1.05);
    });
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const ptr = { x: 0, y: 0 }, look = { x: 0, y: 0 };
  addEventListener("pointermove", (ev) => { ptr.x = ev.clientX / innerWidth - 0.5; ptr.y = ev.clientY / innerHeight - 0.5; }, { passive: true });

  function frame(now) {
    const t = now / 1000, m = reduce ? 0 : 1;
    look.x += (ptr.x - look.x) * 0.05; look.y += (ptr.y - look.y) * 0.05;
    const r = host.getBoundingClientRect();
    const scrollK = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    items.forEach((o) => {
      const u = o.userData, b = u.base;
      o.position.set(
        b.x + look.x * (1 + u.z * 0.3) * m,
        b.y + Math.sin(t * 0.8 + u.phase) * 0.25 * m - look.y * 0.6 * m + scrollK * (u.z + 2) * 0.3 * m,
        b.z
      );
      const pulse = u.tw ? 0.82 + 0.18 * Math.sin(t * 2.4 + u.phase) * m + 0.18 * (1 - m) : 1;
      o.scale.setScalar(u.size * pulse);
      if (u.type === "cloud") {
        o.rotation.set(0.1, Math.sin(t * 0.4 + u.phase) * 0.4 * m, 0);
      } else if (u.type === "drop") {
        o.rotation.set(Math.PI, 0, Math.sin(t * 0.7 + u.phase) * 0.25 * m + 0.3);
      } else {
        o.rotation.y = u.phase + t * u.spin * m + scrollK * 1.1 * m;
        o.rotation.x = Math.sin(t * 0.6 + u.phase) * 0.3 * m;
        o.rotation.z = u.tilt + (u.type === "sparkle" ? t * 0.4 * m : 0);
      }
    });
    renderer.render(scene, camera);
  }

  let visible = false, running = false;
  const loop = () => {
    if (running) return;
    running = true;
    const tick = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      frame(now);
      if (STILL || reduce) { running = false; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }, { rootMargin: "200px" }).observe(host);
  document.addEventListener("visibilitychange", loop);
  if (reduce) addEventListener("resize", () => requestAnimationFrame(frame));
  window.__sky = { render: () => frame(performance.now()) };
})();
