// Tout le JavaScript du site. Chaque bloc vérifie que les éléments existent,
// donc ce fichier fonctionne aussi sur les pages projet.

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. Apparition des éléments au scroll (avec léger décalage entre voisins) */
  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          // Une fois apparu, on retire le décalage pour que les effets de survol soient immédiats
          setTimeout(() => { entry.target.style.transitionDelay = ""; }, 1200);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach((el) => {
      const siblings = [...el.parentElement.querySelectorAll(":scope > [data-reveal]")];
      el.style.transitionDelay = `${siblings.indexOf(el) * 90}ms`;
      revealObserver.observe(el);
    });
  } else {
    revealItems.forEach((el) => el.classList.add("visible"));
  }

  /* 2. Barre de progression de lecture */
  const progress = document.querySelector(".progress");
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "0";
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* 3. Menu latéral : lien actif selon la section visible */
  const navLinks = document.querySelectorAll(".side-nav a");
  const sections = [...navLinks]
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => navObserver.observe(section));
  }

  /* 4. Menu mobile */
  const sidebar = document.getElementById("sidebar");
  const toggle = document.querySelector(".menu-toggle");
  if (sidebar && toggle) {
    const setMenu = (open) => {
      sidebar.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "✕" : "☰";
    };
    toggle.addEventListener("click", () => setMenu(!sidebar.classList.contains("open")));
    navLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
  }

  /* 6. Images manquantes : on les masque pour garder le fond dégradé
        (utile pour le portrait, les projets et les dessins pas encore ajoutés) */
  document.querySelectorAll("img").forEach((img) => {
    const hide = () => img.classList.add("missing");
    img.addEventListener("error", hide);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("loading") !== "lazy") hide();
  });

  /* 7. Art 2D : un carrousel par série + visionneuse plein écran */
  const artGroups = [...document.querySelectorAll(".art-group")];
  if (artGroups.length) {

    /* --- Visionneuse plein écran (créée une seule fois) --- */
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Visionneuse d'images");
    box.innerHTML = `
      <button type="button" class="lb-close" aria-label="Fermer">×</button>
      <button type="button" class="lb-nav lb-prev" aria-label="Image précédente">‹</button>
      <figure class="lb-stage"><img alt=""><figcaption></figcaption></figure>
      <button type="button" class="lb-nav lb-next" aria-label="Image suivante">›</button>
      <div class="lb-footer"><span class="lb-count"></span><div class="lb-dots"></div></div>
    `;
    document.body.appendChild(box);

    const stageImg = box.querySelector(".lb-stage img");
    const caption = box.querySelector("figcaption");
    const count = box.querySelector(".lb-count");
    const dotsWrap = box.querySelector(".lb-dots");

    let slides = [];
    let dots = [];
    let index = 0;
    let swapTimer = null;
    let lastFocus = null;
    let onClose = null;

    const show = (i, animate = true) => {
      index = (i + slides.length) % slides.length;
      const slide = slides[index];
      clearTimeout(swapTimer);

      const apply = () => {
        stageImg.classList.remove("missing");
        stageImg.src = slide.src;
        stageImg.alt = slide.alt;
        caption.textContent = slide.caption;
        count.textContent = `${index + 1} / ${slides.length}`;
        dots.forEach((dot, k) => dot.classList.toggle("active", k === index));
        stageImg.classList.remove("swap");
      };

      if (animate && !reduceMotion) {
        stageImg.classList.add("swap");
        swapTimer = setTimeout(apply, 180);
      } else {
        apply();
      }
    };

    const buildDots = () => {
      dotsWrap.innerHTML = "";
      dots = slides.map((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "lb-dot";
        dot.setAttribute("aria-label", `Aller à l'image ${i + 1}`);
        dot.addEventListener("click", () => show(i));
        dotsWrap.appendChild(dot);
        return dot;
      });
      // Beaucoup d'images : on garde seulement le compteur
      dotsWrap.hidden = slides.length > 12;
    };

    stageImg.addEventListener("error", () => stageImg.classList.add("missing"));

    const isOpen = () => box.classList.contains("open");

    const openViewer = (list, start, closeCallback) => {
      slides = list;
      onClose = closeCallback;
      lastFocus = document.activeElement;
      buildDots();
      show(start, false);
      box.classList.add("open");
      document.body.style.overflow = "hidden";
      box.querySelector(".lb-close").focus();
    };

    const closeViewer = () => {
      box.classList.remove("open");
      document.body.style.overflow = "";
      if (onClose) onClose(index);
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    box.querySelector(".lb-close").addEventListener("click", closeViewer);
    box.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
    box.querySelector(".lb-next").addEventListener("click", () => show(index + 1));

    // Clic dans le fond sombre : fermer
    box.addEventListener("click", (event) => {
      if (event.target === box) closeViewer();
    });

    // Clavier : flèches pour naviguer, Échap pour fermer
    document.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
    });

    // Tactile : glisser le doigt vers la gauche ou la droite
    let touchStartX = null;
    box.addEventListener("touchstart", (event) => { touchStartX = event.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (event) => {
      if (touchStartX === null) return;
      const dx = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) show(dx < 0 ? index + 1 : index - 1);
      touchStartX = null;
    });

    /* --- Carrousels intégrés à la page (un par série) --- */
    artGroups.forEach((group) => {
      const track = group.querySelector(".car-track");
      if (!track) return;
      const items = [...track.querySelectorAll(".art")];
      if (!items.length) return;

      const prev = group.querySelector(".car-prev");
      const next = group.querySelector(".car-next");
      const counter = group.querySelector(".art-count");
      const behavior = reduceMotion ? "auto" : "smooth";

      const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;
      const step = () => items[0].getBoundingClientRect().width + gap();
      const canScroll = () => track.scrollWidth > track.clientWidth + 4;
      const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;

      // Image la plus proche du centre de la zone visible
      const currentIndex = () => {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        items.forEach((item, i) => {
          const dist = Math.abs(item.offsetLeft + item.offsetWidth / 2 - mid);
          if (dist < bestDist) { best = i; bestDist = dist; }
        });
        return best;
      };

      const update = () => {
        if (!canScroll()) {
          if (counter) counter.textContent = `${items.length} ${items.length > 1 ? "images" : "image"}`;
          if (prev) prev.disabled = true;
          if (next) next.disabled = true;
          return;
        }
        const i = atEnd() ? items.length - 1 : currentIndex();
        if (counter) counter.textContent = `${i + 1} / ${items.length}`;
        if (prev) prev.disabled = track.scrollLeft <= 4;
        if (next) next.disabled = atEnd();
      };

      let ticking = false;
      track.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { update(); ticking = false; });
      }, { passive: true });
      window.addEventListener("resize", update);
      update();

      if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior }));
      if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior }));

      // Glisser avec la souris pour faire défiler (le tactile le fait déjà nativement)
      let dragging = false, moved = false, startX = 0, startLeft = 0;
      track.addEventListener("dragstart", (event) => event.preventDefault());
      track.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0 || !canScroll()) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startLeft = track.scrollLeft;
      });
      window.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        if (!moved && Math.abs(dx) > 5) {
          moved = true;
          track.classList.add("dragging");
          track.style.scrollBehavior = "auto";
          track.style.scrollSnapType = "none";
        }
        if (moved) track.scrollLeft = startLeft - dx;
      });
      window.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;
        if (moved) {
          track.classList.remove("dragging");
          track.style.scrollSnapType = "";
          track.style.scrollBehavior = "";
        }
      });
      // Après un glissement, on n'ouvre pas la visionneuse par erreur
      track.addEventListener("click", (event) => {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
          moved = false;
        }
      }, true);

      // Clic sur une image : visionneuse limitée à cette série
      items.forEach((item, i) => {
        item.querySelector(".art-btn").addEventListener("click", () => {
          const list = items.map((it) => {
            const img = it.querySelector("img");
            return { src: img.src, alt: img.alt, caption: it.querySelector(".art-btn").dataset.caption || "" };
          });
          openViewer(list, i, (last) => {
            const target = items[last];
            track.scrollTo({
              left: target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2,
              behavior
            });
          });
        });
      });
    });
  }

  /* 8. Changement de direction artistique : thème « carnet de croquis » dans la section Art 2D */
  const artSection = document.getElementById("art");
  if (artSection && "IntersectionObserver" in window) {
    const themeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        document.body.classList.toggle("sketch", entry.isIntersecting);
      });
    }, { rootMargin: "-40% 0px -40% 0px" });
    themeObserver.observe(artSection);
  }
  /* 9. Lucioles en arrière-plan (décor, désactivées si l'utilisateur limite les animations) */
  if (!reduceMotion) {
    const layer = document.createElement("div");
    layer.className = "fireflies";
    layer.setAttribute("aria-hidden", "true");
    const total = window.innerWidth < 700 ? 8 : 16;
    for (let i = 0; i < total; i++) {
      const fly = document.createElement("span");
      fly.className = "firefly" + (Math.random() < 0.3 ? " warm" : "");
      fly.style.left = `${Math.random() * 100}%`;
      fly.style.top = `${15 + Math.random() * 80}%`;
      fly.style.setProperty("--s", `${2 + Math.random() * 3}px`);
      fly.style.setProperty("--d", `${10 + Math.random() * 10}s`);
      fly.style.setProperty("--delay", `${-Math.random() * 15}s`);
      fly.style.setProperty("--dx", `${-50 + Math.random() * 100}px`);
      fly.style.setProperty("--dy", `${-70 + Math.random() * 60}px`);
      layer.appendChild(fly);
    }
    document.body.appendChild(layer);
  }
});
