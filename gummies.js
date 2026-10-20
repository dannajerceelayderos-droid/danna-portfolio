/* Floating 3D gummy bears and apples around the Nyva AlcoBlock carousel. */
(() => {
  const host = document.querySelector('[data-deco="gummies"]');
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
  scene.add(new THREE.HemisphereLight("#fff4f6", "#ff9fb0", 0.45));
  const key = new THREE.DirectionalLight("#ffffff", 1.4);
  key.position.set(3, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffd0dc", 0.8);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 20);

  // ---------- gummy bear ----------
  const jelly = new THREE.MeshPhysicalMaterial({
    color: "#d10a24", roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
    transparent: true, opacity: 0.9, envMapIntensity: 0.55,
    sheen: 0.5, sheenColor: new THREE.Color("#ff4a62"), emissive: "#6a0012", emissiveIntensity: 0.35,
  });
  const S = (r, w = 28, h = 20) => new THREE.SphereGeometry(r, w, h);
  function bear() {
    const g = new THREE.Group();
    const part = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, jelly);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m;
    };
    part(S(0.62), 0, -0.25, 0, 1, 1.12, 0.78);           // body
    part(S(0.5), 0, 0.72, 0, 1.06, 0.92, 0.8);           // head
    part(S(0.19, 16, 12), -0.4, 1.12, 0, 1, 1, 0.7);      // ears
    part(S(0.19, 16, 12), 0.4, 1.12, 0, 1, 1, 0.7);
    part(S(0.18, 16, 12), 0, 0.6, 0.37, 1.25, 0.85, 0.8); // snout
    part(S(0.24, 16, 12), -0.56, 0.05, 0.05, 0.9, 1.25, 0.8); // arms
    part(S(0.24, 16, 12), 0.56, 0.05, 0.05, 0.9, 1.25, 0.8);
    part(S(0.29, 16, 12), -0.33, -0.86, 0.06, 1, 1.05, 0.85); // legs
    part(S(0.29, 16, 12), 0.33, -0.86, 0.06, 1, 1.05, 0.85);
    return g;
  }

  // ---------- apple ----------
  const appleMat = new THREE.MeshPhysicalMaterial({ color: "#c40f24", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.5, emissive: "#3a0008", emissiveIntensity: 0.3 });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#6b3d1f", roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#58b33a", roughness: 0.5, side: THREE.DoubleSide });
  const appleGeo = (() => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, a = t * Math.PI;
      // apple profile: wide shoulders, dimple at top and bottom
      const r = Math.sin(a) * (1 + 0.12 * Math.sin(a * 2 - 0.6)) * (1 - 0.18 * Math.pow(Math.cos(a), 8));
      let y = -Math.cos(a) * 0.95;
      if (t < 0.08) y += (0.08 - t) * 1.6;      // bottom dimple
      if (t > 0.9) y -= (t - 0.9) * 2.6;        // top dimple
      pts.push(new THREE.Vector2(Math.max(0.001, r), y));
    }
    const g = new THREE.LatheGeometry(pts, 48);
    g.computeVertexNormals();
    return g;
  })();
  const leafGeo = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.bezierCurveTo(0.25, 0.15, 0.45, 0.4, 0.75, 0.42); sh.bezierCurveTo(0.5, 0.05, 0.3, -0.05, 0, 0);
    return new THREE.ShapeGeometry(sh, 12);
  })();
  function apple() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(appleGeo, appleMat));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 8), stemMat);
    stem.position.set(0.04, 0.82, 0); stem.rotation.z = -0.25; g.add(stem);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(0.06, 0.86, 0); leaf.rotation.set(0.4, 0.3, 0.1); leaf.scale.setScalar(0.8); g.add(leaf);
    return g;
  }

  // ---------- layout: keep things in the margins around the slides ----------
  // [type, x (fraction of half-width), y (fraction of half-height), z, scale]
  const SPOTS = [
    ["bear", -0.96, 0.28, 1.5, 0.8], ["apple", 0.95, 0.78, 0.5, 0.8], ["bear", 0.97, -0.45, 2.2, 0.65],
    ["apple", -0.95, -0.62, 1.2, 0.85], ["bear", -0.55, -1.0, 3, 0.5], ["bear", 0.62, -0.98, 1, 0.7],
    ["bear", 0.32, 1.02, -1, 0.45], ["apple", 0.08, 1.1, -2, 0.45], ["bear", -0.99, -0.2, -1.5, 0.5],
  ];
  const items = SPOTS.map(([type, fx, fy, z, s], i) => {
    const o = type === "bear" ? bear() : apple();
    o.scale.setScalar(s);
    o.userData = { fx, fy, z, s, phase: i * 1.7, spin: (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.12), tilt: (i % 3 - 1) * 0.5 };
    o.rotation.set(0.2 * (i % 3), i, o.userData.tilt);
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
      o.visible = !mobile || [1, 3, 5, 6].includes(i);
      o.userData.base = new THREE.Vector3(u.fx * (halfW - 1.1 * k), u.fy * (halfH - 1.1 * k), u.z);
      o.scale.setScalar(u.s * k * (mobile ? 0.8 : 1.0));
    });
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const ptr = { x: 0, y: 0 }, look = { x: 0, y: 0 };
  addEventListener("pointermove", (ev) => {
    ptr.x = ev.clientX / innerWidth - 0.5; ptr.y = ev.clientY / innerHeight - 0.5;
  }, { passive: true });

  function frame(now) {
    const t = now / 1000;
    look.x += (ptr.x - look.x) * 0.05; look.y += (ptr.y - look.y) * 0.05;
    const r = host.getBoundingClientRect();
    const scrollK = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1 as it passes
    items.forEach((o) => {
      const u = o.userData, b = u.base;
      const m = reduce ? 0 : 1;
      o.position.set(
        b.x + look.x * (1 + u.z * 0.3) * m,
        b.y + Math.sin(t * 0.9 + u.phase) * 0.28 * m - look.y * 0.6 * m + scrollK * (u.z + 2) * 0.35 * m,
        b.z
      );
      o.rotation.y = u.phase + t * u.spin * m + scrollK * 1.2 * m;
      o.rotation.x = Math.sin(t * 0.6 + u.phase) * 0.25 * m + 0.15;
      o.rotation.z = u.tilt + Math.sin(t * 0.5 + u.phase) * 0.15 * m;
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
  window.__gummies = { render: () => frame(performance.now()) };
})();
