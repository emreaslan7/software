/**
 * Minimal & High-Reliability Mermaid Fullscreen Lightbox with Zoom/Pan
 */

(function () {
  // Initialize Mermaid with clean sequence & flowchart configurations
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
      securityLevel: "loose",
      sequence: {
        actorFontSize: 14,
        messageFontSize: 13,
        noteFontSize: 12,
        useMaxWidth: true,
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
    });
  }

  let modal = null;
  let canvas = null;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function createLightboxModal() {
    if (document.getElementById("mermaid-lightbox-modal")) return;

    modal = document.createElement("div");
    modal.id = "mermaid-lightbox-modal";
    modal.className = "mermaid-lightbox-modal";
    modal.innerHTML = `
      <div class="mermaid-lightbox-backdrop"></div>
      <div class="mermaid-lightbox-controls">
        <button class="mermaid-btn" id="mermaid-zoom-in" title="Zoom In (+)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button class="mermaid-btn" id="mermaid-zoom-out" title="Zoom Out (-)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button class="mermaid-btn" id="mermaid-zoom-reset" title="Reset (R)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
        </button>
        <span class="mermaid-zoom-badge" id="mermaid-zoom-level">100%</span>
        <button class="mermaid-btn mermaid-btn-close" id="mermaid-close" title="Close (Esc)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="mermaid-lightbox-viewport" id="mermaid-viewport">
        <div class="mermaid-lightbox-canvas" id="mermaid-canvas"></div>
      </div>
    `;

    document.body.appendChild(modal);

    canvas = document.getElementById("mermaid-canvas");
    const viewport = document.getElementById("mermaid-viewport");
    const backdrop = modal.querySelector(".mermaid-lightbox-backdrop");

    // Close actions
    document.getElementById("mermaid-close").addEventListener("click", closeLightbox);
    backdrop.addEventListener("click", closeLightbox);

    // Zoom buttons
    document.getElementById("mermaid-zoom-in").addEventListener("click", (e) => {
      e.stopPropagation();
      adjustZoom(0.25);
    });
    document.getElementById("mermaid-zoom-out").addEventListener("click", (e) => {
      e.stopPropagation();
      adjustZoom(-0.25);
    });
    document.getElementById("mermaid-zoom-reset").addEventListener("click", (e) => {
      e.stopPropagation();
      resetTransform();
    });

    // Mouse wheel zoom
    viewport.addEventListener("wheel", function (e) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      adjustZoom(delta);
    }, { passive: false });

    // Drag & Pan handlers
    viewport.addEventListener("mousedown", function (e) {
      if (e.target.closest(".mermaid-lightbox-controls")) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener("mouseup", function () {
      if (isDragging) {
        isDragging = false;
        if (viewport) viewport.style.cursor = "grab";
      }
    });

    // Keyboard shortcuts
    window.addEventListener("keydown", function (e) {
      if (!modal || modal.style.display !== "flex") return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "+" || e.key === "=") adjustZoom(0.25);
      if (e.key === "-") adjustZoom(-0.25);
      if (e.key === "r" || e.key === "R" || e.key === "0") resetTransform();
    });
  }

  function updateTransform() {
    if (!canvas) return;
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    const badge = document.getElementById("mermaid-zoom-level");
    if (badge) {
      badge.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  function adjustZoom(delta) {
    scale = Math.min(Math.max(0.3, scale + delta), 4.0);
    updateTransform();
  }

  function resetTransform() {
    scale = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function openLightbox(svgElement) {
    createLightboxModal();
    canvas.innerHTML = "";

    // Extract original dimensions from viewBox or bounding box
    const viewBox = svgElement.getAttribute("viewBox");
    let targetWidth = "auto";
    let targetHeight = "auto";

    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        const w = parseFloat(parts[2]);
        const h = parseFloat(parts[3]);
        if (w > 0 && h > 0) {
          targetWidth = `${w}px`;
          targetHeight = `${h}px`;
        }
      }
    }

    // Clone SVG with exact properties
    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.style.maxWidth = "none";
    clonedSvg.style.maxHeight = "none";
    clonedSvg.style.width = targetWidth;
    clonedSvg.style.height = targetHeight;
    clonedSvg.style.display = "block";
    clonedSvg.style.margin = "auto";

    // Enclose inside theme-aware card
    const card = document.createElement("div");
    card.className = "mermaid-lightbox-card";
    card.appendChild(clonedSvg);

    canvas.appendChild(card);
    resetTransform();

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "";
    if (canvas) canvas.innerHTML = "";
  }

  function bindMermaidDiagrams() {
    const diagrams = document.querySelectorAll(".mermaid, pre.mermaid, div.mermaid");
    diagrams.forEach((container) => {
      const svg = container.querySelector("svg");
      if (!svg) return;

      if (!container.dataset.lightboxBound) {
        container.dataset.lightboxBound = "true";
        container.classList.add("mermaid-interactive-container");

        // Minimal icon button in corner
        if (!container.querySelector(".mermaid-expand-badge")) {
          const badge = document.createElement("button");
          badge.className = "mermaid-expand-badge";
          badge.setAttribute("type", "button");
          badge.setAttribute("title", "Zoom");
          badge.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
          container.appendChild(badge);
        }

        container.addEventListener("click", function (e) {
          e.stopPropagation();
          const targetSvg = container.querySelector("svg");
          if (targetSvg) {
            openLightbox(targetSvg);
          }
        });
      }
    });
  }

  // Hook into DOM lifecycle
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(bindMermaidDiagrams, 300);
      setTimeout(bindMermaidDiagrams, 1000);
    });
  } else {
    setTimeout(bindMermaidDiagrams, 300);
    setTimeout(bindMermaidDiagrams, 1000);
  }

  const observer = new MutationObserver(() => {
    bindMermaidDiagrams();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
