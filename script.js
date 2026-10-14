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
})();
