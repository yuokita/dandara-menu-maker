(function () {
  const paperSizes = {
    a4: { label: "A4 縦", width: 2480, height: 3508 },
    a5: { label: "A5 縦", width: 1748, height: 2480 },
    b5: { label: "B5 縦", width: 2150, height: 3035 },
    sns: { label: "SNS 縦", width: 1080, height: 1350 },
  };

  const storageKey = "dandara-menu-maker-current-v3";
  const snapshotKey = "dandara-menu-maker-snapshot-v3";

  const defaultMenu = {
    dateLabel: "PLAT DU JOUR",
    note: "",
    paperSize: "a4",
    categories: [
      {
        id: "cat-amuse",
        title: "AMUSE-BOUCHE",
        subtitle: "前菜盛合わせ",
        items: ["手作りハム・紫キャベツのマリネ", "キャロットラペ"],
      },
      {
        id: "cat-entrees",
        title: "ENTRÉES FROIDES",
        subtitle: "冷菜",
        items: ["ベーコンとポーチドエッグサラダ", "ダンダラのカルパッチョ"],
      },
      {
        id: "cat-fritures",
        title: "FRITURES",
        subtitle: "揚げ物料理",
        items: ["ダンダラのフリット"],
      },
      {
        id: "cat-poissons",
        title: "POISSONS",
        subtitle: "魚料理",
        items: ["ブイヤベース　フォカッチャ"],
      },
      {
        id: "cat-viande",
        title: "PLATS DE VIANDE",
        subtitle: "肉料理",
        items: ["ハーブチキン"],
      },
      {
        id: "cat-pasta",
        title: "PASTA",
        subtitle: "パスタ",
        items: ["ミートパスタ"],
      },
      {
        id: "cat-desserts",
        title: "DESSERTS",
        subtitle: "",
        items: ["ベリーアイス"],
      },
    ],
  };

  function createId() {
    return `cat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeMenu(menu) {
    return {
      dateLabel: menu && menu.dateLabel ? menu.dateLabel : "PLAT DU JOUR",
      note: menu && menu.note ? menu.note : "",
      paperSize: menu && paperSizes[menu.paperSize] ? menu.paperSize : "a4",
      categories:
        menu && Array.isArray(menu.categories) && menu.categories.length
          ? menu.categories.map((category) => ({
              id: category.id || createId(),
              title: category.title || "",
              subtitle: category.subtitle || "",
              items: Array.isArray(category.items) && category.items.length ? category.items : [""],
            }))
          : clone(defaultMenu.categories),
    };
  }

  function loadMenu(key) {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    try {
      return normalizeMenu(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function wrapText(value, maxChars) {
    const text = String(value).trim();
    if (!text) return [""];

    const chunks = [];
    let line = "";

    for (const char of text) {
      const charWidth = /[ -~]/.test(char) ? 0.58 : 1;
      const lineWidth = Array.from(line).reduce(
        (sum, current) => sum + (/[ -~]/.test(current) ? 0.58 : 1),
        0,
      );

      if (line && lineWidth + charWidth > maxChars) {
        chunks.push(line);
        line = char;
      } else {
        line += char;
      }
    }

    if (line) chunks.push(line);
    return chunks.slice(0, 3);
  }

  function getVisibleCategories(menu) {
    return menu.categories.filter((category) => {
      const cleanItems = category.items.map((item) => item.trim()).filter(Boolean);
      return category.title.trim() || category.subtitle.trim() || cleanItems.length;
    });
  }

  function isReferenceMenu(menu) {
    if (
      menu.dateLabel.trim() !== defaultMenu.dateLabel ||
      menu.note.trim() ||
      menu.categories.length !== defaultMenu.categories.length
    ) {
      return false;
    }

    return menu.categories.every((category, index) => {
      const referenceCategory = defaultMenu.categories[index];
      return (
        category.title === referenceCategory.title &&
        category.subtitle === referenceCategory.subtitle &&
        JSON.stringify(category.items) === JSON.stringify(referenceCategory.items)
      );
    });
  }

  function getMenuDensityScale(categories) {
    const units = categories.reduce((total, category, index) => {
      const itemUnits = category.items
        .filter((item) => item.trim())
        .reduce((sum, item) => sum + wrapText(item, 21).length, 0);

      return total + 1.25 + itemUnits + (index > 0 ? 0.62 : 0);
    }, 0);

    return Math.max(0.66, Math.min(1, 17.2 / Math.max(units, 1)));
  }

  function buildMenuSvg(menu, referenceImageHref) {
    const size = paperSizes[menu.paperSize] || paperSizes.a4;
    const width = 1122;
    const height = Math.round((size.height / size.width) * width);
    const verticalScale = height / 1402;

    if (isReferenceMenu(menu)) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${width} ${height}">
  <image href="${referenceImageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>
</svg>`;
    }

    const bottomRuleY = Math.round(1269 * verticalScale);
    const textRows = [];
    const visibleCategories = getVisibleCategories(menu);
    const densityScale = Math.max(
      0.68,
      Math.min(1, getMenuDensityScale(visibleCategories) * Math.min(1.1, verticalScale)),
    );
    const contentTop = Math.round(319 * verticalScale);
    const contentBottom = bottomRuleY - Math.round(22 * verticalScale);
    const contentHeight = contentBottom - contentTop;
    const titleSize = Math.round(51 * densityScale * verticalScale);
    const dishSize = Math.round(37 * densityScale * verticalScale);
    const dishSmallSize = Math.round(34 * densityScale * verticalScale);
    const separatorSize = Math.round(27 * densityScale * verticalScale);
    let y = contentTop;

    visibleCategories.forEach((category, categoryIndex) => {
      const cleanItems = category.items.map((item) => item.trim()).filter(Boolean);
      if (categoryIndex > 0) {
        y += Math.round(16 * verticalScale * densityScale);
        textRows.push(
          `<line x1="356" y1="${y}" x2="766" y2="${y}" stroke="#082756" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 12"/>`,
          `<text x="561" y="${y + separatorSize * 0.3}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${separatorSize}" font-weight="700" fill="#082756">✤</text>`,
        );
        y += Math.round(27 * verticalScale * densityScale);
      }

      textRows.push(
        `<text x="561" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="900" letter-spacing="3" fill="#082756"><tspan>${escapeXml(category.title.toUpperCase())}</tspan>${category.subtitle.trim() ? `<tspan dx="22" font-family="'Hiragino Mincho ProN', 'Yu Mincho', serif" font-size="${Math.round(titleSize * 0.7)}" letter-spacing="1">${escapeXml(category.subtitle)}</tspan>` : ""}</text>`,
      );
      y += Math.round(48 * verticalScale * densityScale);

      cleanItems.forEach((item) => {
        wrapText(item, 21).forEach((line, index) => {
          textRows.push(
            `<text x="561" y="${y}" text-anchor="middle" font-family="'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif" font-size="${index ? dishSmallSize : dishSize}" font-weight="700" fill="#b6421f">${escapeXml(line)}</text>`,
          );
          y += Math.round((index ? 38 : 42) * verticalScale * densityScale);
        });
        y += Math.round(2 * verticalScale * densityScale);
      });

      y += Math.round(9 * verticalScale * densityScale);
    });

    const overflow = Math.max(0, y - contentBottom);
    const textTransform = overflow > 0 ? ` transform="translate(0 ${Math.round(-overflow)})"` : "";
    const note = menu.note.trim();
    const titleText = menu.dateLabel.trim() || "PLAT DU JOUR";

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#fbf1dc"/>
  <image href="${referenceImageHref}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>
  <rect x="96" y="${Math.round(103 * verticalScale)}" width="930" height="${Math.round(164 * verticalScale)}" fill="#fbf1dc"/>
  <rect x="138" y="${Math.round(270 * verticalScale)}" width="810" height="${Math.round(978 * verticalScale)}" fill="#fbf1dc"/>
  <text x="561" y="${Math.round(239 * verticalScale)}" text-anchor="middle" font-family="'Didot', 'Bodoni 72', 'Baskerville', Georgia, 'Times New Roman', serif" font-size="${Math.round(114 * verticalScale)}" font-weight="900" letter-spacing="11" fill="#b6421f" stroke="#7f2b21" stroke-width="1.25" textLength="900" lengthAdjust="spacingAndGlyphs">${escapeXml(titleText.toUpperCase())}</text>
  <g clip-path="url(#menu-text-clip)"${textTransform}>
    ${textRows.join("\n    ")}
  </g>
  <clipPath id="menu-text-clip">
    <rect x="90" y="${contentTop - 45}" width="760" height="${contentHeight + 45}"/>
  </clipPath>
  ${
    note
      ? `<text x="561" y="${height - 23}" text-anchor="middle" font-family="'Hiragino Sans', 'Yu Gothic', sans-serif" font-size="24" fill="#5f463b">${escapeXml(note)}</text>`
      : ""
  }
</svg>`;
  }

  function loadImageAsDataUrl(path) {
    return fetch(path)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      );
  }

  function createLabel(text, child) {
    const label = document.createElement("label");
    label.append(document.createTextNode(text), child);
    return label;
  }

  function createButton(text, className, onClick, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    if (className) button.className = className;
    if (title) {
      button.title = title;
      button.setAttribute("aria-label", title);
    }
    button.addEventListener("click", onClick);
    return button;
  }

  function createInput(value, placeholder, onInput) {
    const input = document.createElement("input");
    input.value = value || "";
    input.placeholder = placeholder || "";
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }

  function init(root) {
    let menu = loadMenu(storageKey) || loadMenu(snapshotKey) || clone(defaultMenu);
    let savedMessage = "前回内容を自動保存中";
    const referenceImage = window.DandaraMenuMaker && window.DandaraMenuMaker.referenceImage
      ? window.DandaraMenuMaker.referenceImage
      : "";
    const editor = root.querySelector(".dmm-editor");
    const preview = root.querySelector(".dmm-preview");

    function setMenu(nextMenu, message) {
      menu = normalizeMenu(nextMenu);
      window.localStorage.setItem(storageKey, JSON.stringify(menu));
      savedMessage = message || "保存済み";
      render();
    }

    function updateCategory(id, patch) {
      setMenu({
        ...menu,
        categories: menu.categories.map((category) =>
          category.id === id ? { ...category, ...patch } : category,
        ),
      });
    }

    function moveCategory(id, direction) {
      const index = menu.categories.findIndex((category) => category.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= menu.categories.length) return;
      const categories = [...menu.categories];
      const target = categories.splice(index, 1)[0];
      categories.splice(nextIndex, 0, target);
      setMenu({ ...menu, categories });
    }

    function removeCategory(id) {
      setMenu({
        ...menu,
        categories:
          menu.categories.length === 1
            ? [{ id: createId(), title: "", subtitle: "", items: [""] }]
            : menu.categories.filter((category) => category.id !== id),
      });
    }

    function updateItem(categoryId, itemIndex, value) {
      setMenu({
        ...menu,
        categories: menu.categories.map((category) => {
          if (category.id !== categoryId) return category;
          const items = [...category.items];
          items[itemIndex] = value;
          return { ...category, items };
        }),
      });
    }

    function addItem(categoryId) {
      setMenu({
        ...menu,
        categories: menu.categories.map((category) =>
          category.id === categoryId
            ? { ...category, items: [...category.items, ""] }
            : category,
        ),
      });
    }

    function removeItem(categoryId, itemIndex) {
      setMenu({
        ...menu,
        categories: menu.categories.map((category) => {
          if (category.id !== categoryId) return category;
          const items = category.items.filter((_, index) => index !== itemIndex);
          return { ...category, items: items.length ? items : [""] };
        }),
      });
    }

    function saveSnapshot() {
      window.localStorage.setItem(snapshotKey, JSON.stringify(menu));
      savedMessage = "複製用に保存しました";
      render();
    }

    function restoreSnapshot() {
      setMenu(loadMenu(snapshotKey) || loadMenu(storageKey) || clone(defaultMenu), "保存内容を読み込みました");
    }

    function addCategory() {
      setMenu({
        ...menu,
        categories: [
          ...menu.categories,
          { id: createId(), title: "NOUVEAU", subtitle: "新しい料理", items: [""] },
        ],
      });
    }

    async function downloadPng() {
      const size = paperSizes[menu.paperSize] || paperSizes.a4;
      const referenceImageHref = await loadImageAsDataUrl(referenceImage);
      const svg = buildMenuSvg(menu, referenceImageHref);
      const image = new Image();
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.fillStyle = "#f7efe0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(svgUrl);

        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `dandara-menu-${menu.paperSize}-${new Date().toISOString().slice(0, 10)}.png`;
        link.click();
      };

      image.src = svgUrl;
    }

    function renderEditor() {
      editor.innerHTML = "";

      const brand = document.createElement("div");
      brand.className = "dmm-brand";
      brand.innerHTML = `<div><p class="dmm-eyebrow">DANDARA MENU MAKER</p><h1 class="dmm-title">今日のメニューを入力</h1></div><span class="dmm-save-state">${savedMessage}</span>`;
      editor.append(brand);

      const topFields = document.createElement("div");
      topFields.className = "dmm-top-fields";

      topFields.append(
        createLabel(
          "メインタイトル",
          createInput(menu.dateLabel, "PLAT DU JOUR", (value) => setMenu({ ...menu, dateLabel: value })),
        ),
      );

      const select = document.createElement("select");
      Object.entries(paperSizes).forEach(([key, size]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = size.label;
        option.selected = key === menu.paperSize;
        select.append(option);
      });
      select.addEventListener("change", () => setMenu({ ...menu, paperSize: select.value }));
      topFields.append(createLabel("用紙サイズ", select));

      topFields.append(
        createLabel("下部メモ", createInput(menu.note, "", (value) => setMenu({ ...menu, note: value }))),
      );
      editor.append(topFields);

      const toolbar = document.createElement("div");
      toolbar.className = "dmm-toolbar";
      toolbar.append(
        createButton("複製用に保存", "", saveSnapshot),
        createButton("保存内容から複製", "", restoreSnapshot),
      );
      editor.append(toolbar);

      const categoryList = document.createElement("div");
      categoryList.className = "dmm-category-list";

      menu.categories.forEach((category, categoryIndex) => {
        const card = document.createElement("article");
        card.className = "dmm-category-card";

        const header = document.createElement("header");
        const label = document.createElement("span");
        label.textContent = `カテゴリー ${categoryIndex + 1}`;
        const actions = document.createElement("div");
        actions.className = "dmm-icon-actions";
        const up = createButton("↑", "", () => moveCategory(category.id, -1), "上へ");
        up.disabled = categoryIndex === 0;
        const down = createButton("↓", "", () => moveCategory(category.id, 1), "下へ");
        down.disabled = categoryIndex === menu.categories.length - 1;
        actions.append(up, down, createButton("×", "", () => removeCategory(category.id), "削除"));
        header.append(label, actions);
        card.append(header);

        const columns = document.createElement("div");
        columns.className = "dmm-two-columns";
        columns.append(
          createLabel(
            "カテゴリー名",
            createInput(category.title, "FRITURES", (value) => updateCategory(category.id, { title: value })),
          ),
          createLabel(
            "日本語名",
            createInput(category.subtitle, "揚げ物料理", (value) => updateCategory(category.id, { subtitle: value })),
          ),
        );
        card.append(columns);

        const dishList = document.createElement("div");
        dishList.className = "dmm-dish-list";
        category.items.forEach((item, itemIndex) => {
          const row = document.createElement("span");
          row.className = "dmm-dish-row";
          row.append(
            createInput(item, "料理名を入力", (value) => updateItem(category.id, itemIndex, value)),
            createButton("×", "", () => removeItem(category.id, itemIndex), "料理を削除"),
          );
          dishList.append(createLabel(`料理名 ${itemIndex + 1}`, row));
        });
        card.append(dishList, createButton("料理を追加", "dmm-ghost", () => addItem(category.id)));
        categoryList.append(card);
      });

      editor.append(
        categoryList,
        createButton("カテゴリーを追加", "dmm-add-category", addCategory),
      );

      const exportActions = document.createElement("div");
      exportActions.className = "dmm-export-actions";
      exportActions.append(createButton("PNG保存", "dmm-primary", downloadPng));
      editor.append(exportActions);
    }

    function renderPreview() {
      const size = paperSizes[menu.paperSize] || paperSizes.a4;
      preview.innerHTML = "";
      const label = document.createElement("div");
      label.className = "dmm-preview-label";
      label.textContent = `プレビュー: ${size.label}`;

      const paper = document.createElement("div");
      paper.className = "dmm-menu-paper";
      paper.style.aspectRatio = `${size.width} / ${size.height}`;

      const svg = document.createElement("div");
      svg.className = "dmm-preview-svg";
      svg.setAttribute("aria-label", "メニュー表の完成イメージ");
      svg.innerHTML = buildMenuSvg(menu, referenceImage);
      paper.append(svg);
      preview.append(label, paper);
    }

    function render() {
      renderEditor();
      renderPreview();
    }

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-dandara-menu-maker]").forEach(init);
  });
})();
