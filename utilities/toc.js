const currentURL = window.location.href;

function getThemeColors(theme) {
  const themes = {
    ayu: {
      baseColor: "#c5c5c5",
      activeColor: "#ffb454",
      hoverColor: "#b7b9cc",
    },
    coal: {
      baseColor: "#98a3ad",
      activeColor: "#3473ad",
      hoverColor: "#b3c0cc",
    },
    light: {
      baseColor: "#88848a",
      activeColor: "#000",
      hoverColor: "hsl(0, 4.70%, 74.90%)",
    },
    navy: {
      baseColor: "#bcbdd0",
      activeColor: "#2b79a2",
      hoverColor: "#b7b9cc",
    },
    rust: {
      baseColor: "#bdbdbd",
      activeColor: "#e69f67",
      hoverColor: "#e8aa2e",
    },
  };
  return themes[theme] || themes.light;
}

function toggleVisibility(id) {
  const element = document.getElementById(id);
  if (!element) return;

  const iconSpan = document.getElementById(id + "-icon");
  const title = element.previousElementSibling;

  if (element.style.display === "none") {
    element.style.display = "block";
    if (iconSpan) {
      iconSpan.textContent = "▼";
    } else if (title) {
      title.innerHTML = `▼ ${title.textContent.trim().replace(/^▶|^▼/, "")}`;
    }
    localStorage.setItem(id, "open");
  } else {
    element.style.display = "none";
    if (iconSpan) {
      iconSpan.textContent = "▶";
    } else if (title) {
      title.innerHTML = `▶ ${title.textContent.trim().replace(/^▶|^▼/, "")}`;
    }
    localStorage.setItem(id, "closed");
  }
}

function HeadingCollapsible(text, id, fontSize = "15px", fontWeight = "bold") {
  const isOpen = localStorage.getItem(id) !== "closed"; // Default open for cleaner nav
  const displayStyle = isOpen ? "block" : "none";
  const icon = isOpen ? "▼" : "▶";

  return `
    <p 
      style="font-size: ${fontSize}; font-weight: ${fontWeight}; cursor: pointer; user-select: none; padding: 5px 0; margin-top: 15px;" 
      onclick="toggleVisibility('${id}')"
    >
      <span id="${id}-icon">${icon}</span> ${text}
    </p>
    <div id="${id}" style="display: ${displayStyle}; padding-left: 10px;">
  `;
}

function SubHeadingCollapsible(
  id,
  number,
  href,
  text,
  theme,
  fontSize = "13px",
  fontWeight = "bold",
  sublist = ""
) {
  const isOpen = localStorage.getItem(id) !== "closed";
  const displayStyle = isOpen ? "block" : "none";
  const icon = isOpen ? "▼" : "▶";
  const headingNumberSpan = createHeadingNumberSpan(number);
  const link = href ? createLink(href, text, theme) : text;

  return `<li style="margin: 7px 0px; font-size: ${fontSize}; list-style-type: none; padding-left: 0; font-weight: ${fontWeight};"><span style="cursor: pointer; user-select: none;" onclick="toggleVisibility('${id}')"><span id="${id}-icon">${icon}</span> ${headingNumberSpan}${link}</span><div id="${id}" style="display: ${displayStyle};">${sublist}</div></li>`;
}

function createHeadingNumberSpan(number) {
  if (!number) return "";
  return `<span style="font-weight: bold; margin-right: 5px;">${number}</span>`;
}

function createLink(href, text, theme) {
  const currentURL = window.location.pathname;
  const isActive = currentURL.endsWith(href) || currentURL === href;

  const { baseColor, activeColor, hoverColor } = getThemeColors(theme);

  const baseStyle = `text-decoration: none; color: ${baseColor}; margin-right: 5px;`;
  const activeStyle = `font-weight: bold; color: ${activeColor};`;

  return `<a href="${href}" style="${baseStyle} ${
    isActive ? activeStyle : ""
  }" onmouseover="this.style.color='${hoverColor}'" onmouseout="this.style.color='${
    isActive ? activeColor : baseColor
  }'">${text}</a>`;
}

function SubHeading(
  number,
  href,
  text,
  theme,
  fontSize = "12px",
  fontWeight = "normal",
  sublist = ""
) {
  const headingNumberSpan = createHeadingNumberSpan(number);
  const link = href ? createLink(href, text, theme) : text;

  return `<li style="margin: 7px 0px; font-size: ${fontSize}; list-style-type: none; padding-left: 0; font-weight: ${fontWeight};">${headingNumberSpan}${link}${sublist}</li>`;
}

function SubHeadingList(items, indentation = false) {
  const indentationCSS = indentation
    ? "padding-left: 15px;"
    : "padding-left: 0;";
  return `<ul style="list-style-type: none; ${indentationCSS}">${items.join(
    ""
  )}</ul>`;
}

function Heading(text, fontSize = "14px", fontWeight = "bold") {
  return `<p style="font-size: ${fontSize}; font-weight: ${fontWeight}; margin: 10px 0 5px 0;">${text}</p>`;
}

function updateTOC(url, theme) {
  const tocElement = document.querySelector(
    "#mdbook-sidebar .sidebar-scrollbox"
  );

  if (!tocElement) return;

  const tocContentEn = `
    ${SubHeading("", "/index.html", "Welcome & Overview", theme, "13px", "bold")}
    ${SubHeading("", "/introduction.html", "Introduction", theme, "13px", "normal")}
    
    ${HeadingCollapsible("AI Agents & Autonomous Systems", "ai-agents-section")}
      ${SubHeadingList([
        SubHeading(
          "Phase 1",
          "",
          "Foundations & Core Concepts",
          theme,
          "13px",
          "bold",
          SubHeadingList(
            [
              SubHeading(
                "01",
                "/ai-agents/day-01.html",
                "Introduction to AI Agents & Autonomous Systems",
                theme
              ),
              SubHeading(
                "02",
                "/ai-agents/day-02.html",
                "The Agentic Mindset: LLMs, Tools, and Memory",
                theme
              ),
              SubHeading(
                "03",
                "/ai-agents/day-03.html",
                "Popular Agent Frameworks",
                theme
              ),
              SubHeading(
                "04",
                "/ai-agents/day-04.html",
                "Building a Research Assistant Agent",
                theme
              ),
              SubHeading(
                "05",
                "/ai-agents/day-05.html",
                "Agent Architecture: ReAct & Self-Correction",
                theme
              ),
            ],
            true
          )
        ),
        SubHeading(
          "Phase 2",
          "",
          "Core Agent Capabilities",
          theme,
          "13px",
          "bold",
          SubHeadingList(
            [
              SubHeading(
                "06",
                "/ai-agents/day-06.html",
                "Working with Tools & APIs",
                theme
              ),
              SubHeading(
                "07",
                "/ai-agents/day-07.html",
                "Memory & State Management",
                theme
              ),
              SubHeading(
                "08",
                "/ai-agents/day-08.html",
                "Building Multi-Agent Systems",
                theme
              ),
              SubHeading(
                "09",
                "/ai-agents/day-09.html",
                "Evaluating & Debugging AI Agents",
                theme
              ),
            ],
            true
          )
        ),
      ])}
    </div>
  `;

  const tocContentTr = `
    ${SubHeading("", "/tr/index.html", "Karşılama ve Genel Bakış", theme, "13px", "bold")}
    ${SubHeading("", "/tr/introduction.html", "Giriş", theme, "13px", "normal")}
    
    ${HeadingCollapsible("Yapay Zeka Ajanları ve Otonom Sistemler", "ai-agents-section-tr")}
      ${SubHeadingList([
        SubHeading(
          "Aşama 1",
          "",
          "Temeller ve Çekirdek Kavramlar",
          theme,
          "13px",
          "bold",
          SubHeadingList(
            [
              SubHeading(
                "01",
                "/tr/ai-agents/day-01.html",
                "AI Ajanlarına ve Otonom Sistemlere Giriş",
                theme
              ),
              SubHeading(
                "02",
                "/tr/ai-agents/day-02.html",
                "Ajan Zihniyeti: LLM'ler, Araçlar ve Bellek",
                theme
              ),
              SubHeading(
                "03",
                "/tr/ai-agents/day-03.html",
                "Popüler Yapay Zeka Ajan Framework'leri",
                theme
              ),
              SubHeading(
                "04",
                "/tr/ai-agents/day-04.html",
                "Araştırma Asistanı Ajanı İnşası",
                theme
              ),
              SubHeading(
                "05",
                "/tr/ai-agents/day-05.html",
                "Ajan Mimarisi: ReAct ve Kendi Kendini Düzeltme",
                theme
              ),
            ],
            true
          )
        ),
        SubHeading(
          "Aşama 2",
          "",
          "Çekirdek Ajan Yetenekleri",
          theme,
          "13px",
          "bold",
          SubHeadingList(
            [
              SubHeading(
                "06",
                "/tr/ai-agents/day-06.html",
                "Araçlar ve API'lar ile Çalışmak",
                theme
              ),
              SubHeading(
                "07",
                "/tr/ai-agents/day-07.html",
                "Bellek ve Durum Yönetimi",
                theme
              ),
              SubHeading(
                "08",
                "/tr/ai-agents/day-08.html",
                "Çoklu Ajan Sistemleri İnşası",
                theme
              ),
              SubHeading(
                "09",
                "/tr/ai-agents/day-09.html",
                "Ajanları Değerlendirme ve Hata Ayıklama",
                theme
              ),
            ],
            true
          )
        ),
      ])}
    </div>
  `;

  const tocContent = url.includes("/tr") ? tocContentTr : tocContentEn;
  tocElement.innerHTML = tocContent;
}

function currentUiTheme() {
  var t = null;
  try {
    t = localStorage.getItem("mdbook-theme");
  } catch (e) {}
  if (t) return t;
  var names = ["light", "rust", "coal", "navy", "ayu"];
  for (var i = 0; i < names.length; i++) {
    if (document.documentElement.classList.contains(names[i])) {
      return names[i];
    }
  }
  return "rust";
}

function initializeTOC() {
  updateTOC(currentURL, currentUiTheme());
}

initializeTOC();
