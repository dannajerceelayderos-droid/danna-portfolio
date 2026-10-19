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
