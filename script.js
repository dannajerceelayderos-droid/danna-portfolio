(() => {
  // ----- lightbox -----
  const dlg = document.querySelector(".lightbox");
  const lbImg = dlg.querySelector("img");
  const lbCap = dlg.querySelector("figcaption");
  const links = [...document.querySelectorAll("a.zoom")];
  let idx = 0;

  function show(i) {
    idx = (i + links.length) % links.length;
    const a = links[idx];
    const alt = a.querySelector("img").alt;
    const w = +a.dataset.w, h = +a.dataset.h;
    dlg.classList.toggle("is-tall", h / w > 1.8);
    lbImg.src = a.href;
    lbImg.alt = alt;
    lbImg.width = w; lbImg.height = h;
    lbCap.textContent = alt;
    dlg.querySelector("figure").scrollTop = 0;
  }

  links.forEach((a, i) => a.addEventListener("click", (ev) => {
    ev.preventDefault();
    show(i);
    dlg.showModal();
  }));
  dlg.querySelector(".lb-close").addEventListener("click", () => dlg.close());
  dlg.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
  dlg.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg || ev.target.tagName === "FIGURE") dlg.close(); });
  dlg.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") show(idx + 1);
    if (ev.key === "ArrowLeft") show(idx - 1);
  });

  // ----- HD ad carousels: native swipe + mouse drag + arrows + dots -----
  document.querySelectorAll("[data-car]").forEach((car) => {
    const track = car.querySelector("[data-track]");
    const slides = [...track.children];
    const dots = [...car.querySelectorAll("[data-dot]")];
    const cur = car.querySelector("[data-cur]");
    const prev = car.querySelector("[data-prev]"), next = car.querySelector("[data-next]");
    let idx = -1;
    const center = (el) => el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;
    const go = (i, smooth = true) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: center(slides[i]), behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    };
    const update = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best === idx) return;
      idx = best;
      slides.forEach((s, i) => s.classList.toggle("is-on", i === idx));
      dots.forEach((d, i) => { d.classList.toggle("is-on", i === idx); d.setAttribute("aria-current", i === idx ? "true" : "false"); });
      if (cur) cur.textContent = idx + 1;
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx === slides.length - 1;
    };
    let raf = 0;
    track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener("resize", () => go(Math.max(idx, 0), false));
    prev && prev.addEventListener("click", () => go(idx - 1));
    next && next.addEventListener("click", () => go(idx + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    track.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") { ev.preventDefault(); go(idx + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); go(idx - 1); }
    });
    // mouse drag (touch already swipes natively)
    let down = null, moved = false;
    track.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType !== "mouse" || ev.button !== 0) return;
      down = { x: ev.clientX, left: track.scrollLeft }; moved = false;
    });
    addEventListener("pointermove", (ev) => {
      if (!down) return;
      const dx = ev.clientX - down.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("is-drag"); }
      if (moved) track.scrollLeft = down.left - dx;
    });
    addEventListener("pointerup", () => {
      if (!down) return;
      down = null;
      if (moved) { track.classList.remove("is-drag"); go(idx); }
    });
    track.addEventListener("click", (ev) => { if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; } }, true);
    update();
  });

  // ----- page-turning brochure -----
  document.querySelectorAll("[data-fb]").forEach((fb) => {
    const book = fb.querySelector("[data-book]");
    const leaves = [...book.querySelectorAll(".fb-leaf")];
    const states = JSON.parse(fb.dataset.states);
    const label = fb.querySelector("[data-label]");
    const dots = [...fb.querySelectorAll("[data-go]")];
    const hd = fb.querySelector("[data-hd]");
    const prev = fb.querySelector("[data-prev]"), next = fb.querySelector("[data-next]");
    let k = 0;
    const set = (to) => {
      to = Math.max(0, Math.min(leaves.length, to));
      if (to === k) return;
      const dir = to > k ? 1 : -1;
      // flip the leaves between k and to, staggered so several pages fan over
      const list = dir > 0 ? leaves.slice(k, to) : leaves.slice(to, k).reverse();
      list.forEach((leaf, n) => setTimeout(() => {
        leaf.classList.add("is-moving");
        leaf.classList.toggle("is-flipped", dir > 0);
        clearTimeout(leaf._t);
        leaf._t = setTimeout(() => leaf.classList.remove("is-moving"), 1000);
      }, n * 140));
      k = to;
      render();
    };
    const render = () => {
      book.classList.toggle("is-closed", k === 0);
      book.classList.toggle("is-end", k === leaves.length);
      const st = states[k];
      if (label) label.textContent = st.label;
      dots.forEach((d, i) => { d.classList.toggle("is-on", i === k); d.setAttribute("aria-current", i === k ? "true" : "false"); });
      if (prev) prev.disabled = k === 0;
      if (next) next.disabled = k === leaves.length;
      if (hd) { hd.href = "img/" + st.hd + ".webp"; hd.dataset.w = st.w; hd.dataset.h = st.h; hd.querySelector("img").alt = book.getAttribute("aria-label").split(".")[0] + ", " + st.label; }
    };
    prev && prev.addEventListener("click", () => set(k - 1));
    next && next.addEventListener("click", () => set(k + 1));
    dots.forEach((d) => d.addEventListener("click", () => set(+d.dataset.go)));
    book.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") { ev.preventDefault(); set(k + 1); }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); set(k - 1); }
    });
    // click a page edge or swipe/drag across the book
    let sx = null, sy = 0, swiped = false;
    book.addEventListener("pointerdown", (ev) => { sx = ev.clientX; sy = ev.clientY; swiped = false; });
    book.addEventListener("pointerup", (ev) => {
      if (sx === null) return;
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; set(k + (dx < 0 ? 1 : -1)); }
    });
    book.addEventListener("click", (ev) => {
      if (swiped) { swiped = false; return; }
      const r = book.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      if (k === 0) set(1);
      else if (k === leaves.length) set(k - 1);
      else set(k + (ev.clientX > mid ? 1 : -1));
    });
    render();
  });

  // ----- copy email -----
  document.querySelectorAll("button.copy").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; }
    catch { b.textContent = "Select & copy"; }
    setTimeout(() => (b.textContent = "Copy"), 2000);
  }));

  // ----- highlight the section you're in -----
  const navLinks = new Map([...document.querySelectorAll(".topbar nav a")].map((a) => [a.hash.slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.remove("is-on"));
      const a = navLinks.get(en.target.id);
      if (a) {
        a.classList.add("is-on");
        const nav = a.closest("nav");
        nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2 });
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section.work").forEach((s) => io.observe(s));
  // ----- sparkle trail behind the strawberry cursor -----
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fine && !still) {
    const layer = document.createElement("div");
    layer.className = "sparkle-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    const colors = ["#ff599b", "#fffc7a", "#8c52ff", "#ffb3c6", "#556fff", "#ffe08a"];
    const star = '<svg viewBox="0 0 64 64"><path d="M32 2c2.6 16 8 22 30 30-22 8-27.4 14-30 30-2.6-16-8-22-30-30 22-8 27.4-14 30-30z" fill="currentColor"/></svg>';
    let last = 0, lx = 0, ly = 0;
    addEventListener("pointermove", (ev) => {
      const now = performance.now();
      const dist = Math.hypot(ev.clientX - lx, ev.clientY - ly);
      if (now - last < 28 || dist < 6) return;
      last = now; lx = ev.clientX; ly = ev.clientY;
      if (layer.childElementCount > 40) layer.firstChild.remove();
      const s = document.createElement("span");
      s.className = "spk";
      s.innerHTML = star;
      s.style.left = ev.clientX + "px";
      s.style.top = ev.clientY + 10 + "px";
      s.style.setProperty("--s", 8 + Math.random() * 10 + "px");
      s.style.setProperty("--k", colors[(Math.random() * colors.length) | 0]);
      s.style.setProperty("--dx", (Math.random() - 0.5) * 30 + "px");
      s.style.setProperty("--dy", 12 + Math.random() * 26 + "px");
      s.addEventListener("animationend", () => s.remove());
      layer.appendChild(s);
    }, { passive: true });
    // a little burst when you click
    addEventListener("pointerdown", (ev) => {
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        const a = (i / 8) * Math.PI * 2;
        s.className = "spk";
        s.innerHTML = star;
        s.style.left = ev.clientX + "px";
        s.style.top = ev.clientY + "px";
        s.style.setProperty("--s", "12px");
        s.style.setProperty("--k", colors[i % colors.length]);
        s.style.setProperty("--dx", Math.cos(a) * 46 + "px");
        s.style.setProperty("--dy", Math.sin(a) * 46 + "px");
        s.addEventListener("animationend", () => s.remove());
        layer.appendChild(s);
      }
    }, { passive: true });
  }
})();
