/* All assets and data are local so the gallery also works through file://. */
const $ = (id) => document.getElementById(id);
const categoryNames = {bottle:"瓶子",cable:"电缆",capsule:"胶囊",carpet:"地毯",grid:"网格",hazelnut:"榛子",leather:"皮革",metal_nut:"金属螺母",pill:"药丸",screw:"螺钉",tile:"瓷砖",toothbrush:"牙刷",transistor:"晶体管",wood:"木材",zipper:"拉链"};
const defectNames = {broken_large:"大面积破损",broken_small:"小面积破损",contamination:"污染",cable_swap:"线缆错位",cut_outer_insulation:"外层绝缘切损",cut_inner_insulation:"内层绝缘切损",missing_cable:"线缆缺失",poke_insulation:"绝缘层穿孔",poke:"穿孔",scratch:"划痕",faulty_imprint:"印字缺陷",squeeze:"挤压变形",crack:"裂纹",cut:"切口",hole:"孔洞",thread:"异物纤维",metal_contamination:"金属异物",color:"颜色异常",broken:"断裂",bent:"弯曲变形",glue:"胶水残留",print:"表面印痕",fold:"折痕",flip:"翻转",combined:"复合缺陷",pill_type:"药丸类型异常",thread_side:"侧面螺纹缺陷",manipulated_front:"端部损伤",scratch_neck:"颈部划痕",thread_top:"顶部螺纹缺陷",scratch_head:"头部划痕",rough:"表面粗糙",gray_stroke:"灰色条痕",oil:"油污",glue_strip:"胶条残留",defective:"缺陷",bent_lead:"引脚弯曲",damaged_case:"外壳损伤",cut_lead:"引脚断损",misplaced:"位置偏移",liquid:"液体污染",squeezed_teeth:"链齿挤压",fabric_interior:"内侧织物缺陷",split_teeth:"链齿分离",broken_teeth:"链齿断裂"};
const variants = [
  {key:"original_file",label:"原始图像",en:"INPUT",icon:"image"},
  {key:"heatmap_file",label:"异常热力图",en:"MODEL OUTPUT",icon:"scan"},
  {key:"marked_file",label:"人工缺陷标注",en:"GROUND TRUTH",icon:"pencil-ruler"}
];
const categories = Object.keys(categoryNames);
let category = "bottle", query = "", defect = "", active = CASES[0], view = "compare", timer = null;
let viewerCase = active, viewerVariant = 0;
const src = path => `assets/${path}`;
const name = row => defectNames[row.defect_type] || row.defect_type;
const icon = name => `<i data-lucide="${name}"></i>`;
const icons = () => lucide.createIcons();
function matching(ignoreCategory = false) {
  return CASES.filter(row => (ignoreCategory || row.category === category) &&
    (ignoreCategory || !defect || row.defect_type === defect) &&
    `${row.category} ${categoryNames[row.category]} ${row.defect_type} ${name(row)} ${row.source_id}`.toLowerCase().includes(query));
}
function renderCategories() {
  const matched = matching(true);
  $("categories").innerHTML = categories.map(key => {
    const first = CASES.find(row => row.category === key);
    const count = matched.filter(row => row.category === key).length;
    return `<button class="category-button ${key === category ? "active" : ""}" data-category="${key}" aria-pressed="${key === category}"><img src="${src(first.original_file)}" alt=""><span class="category-label">${categoryNames[key]}<small>${key}</small></span><span class="category-count">${count}</span></button>`;
  }).join("");
}
function renderFilter() {
  const types = [...new Set(CASES.filter(row => row.category === category).map(row => row.defect_type))];
  $("defect-filter").innerHTML = `<option value="">全部缺陷类型</option>` + types.map(type => `<option value="${type}">${defectNames[type] || type}</option>`).join("");
  $("defect-filter").value = defect;
}
function panel(row, variant, index, overview = false) {
  return `<div class="image-panel">${overview ? "" : `<div class="panel-header">${icon(variant.icon)}<span>${variant.label}</span><small>${variant.en}</small></div>`}
  <button class="image-button" data-image="${index}" data-row="${CASES.indexOf(row)}" aria-label="放大${variant.label}：${name(row)}"><img src="${src(row[variant.key])}" alt="${categoryNames[row.category]} ${name(row)} ${variant.label}" ${overview ? 'loading="lazy"' : ""}><span class="expand">${icon("expand")}</span></button>${overview ? `<div class="overview-label">${variant.label}</div>` : ""}</div>`;
}
function render() {
  const rows = matching();
  if (!rows.includes(active)) active = rows[0];
  renderCategories();
  $("category-title").textContent = categoryNames[category];
  $("category-en").textContent = category;
  $("result-count").textContent = rows.length;
  $("empty").hidden = rows.length !== 0;
  $("comparison").hidden = !rows.length || view !== "compare";
  $("overview").hidden = !rows.length || view !== "overview";
  $("compare-tab").setAttribute("aria-selected", view === "compare");
  $("overview-tab").setAttribute("aria-selected", view === "overview");
  if (!rows.length) { stop(); icons(); return; }
  const index = rows.indexOf(active);
  $("sample-number").textContent = String(active.group).padStart(2,"0");
  $("defect-title").textContent = name(active);
  $("sample-detail").textContent = `${active.defect_type} / ${active.source_id}.png`;
  $("position").textContent = `${String(index+1).padStart(2,"0")} / ${String(rows.length).padStart(2,"0")}`;
  $("previous").disabled = index === 0;
  $("next").disabled = index === rows.length-1;
  $("play").disabled = rows.length < 2;
  if (rows.length < 2) stop();
  $("panels").innerHTML = variants.map((variant, i) => panel(active, variant, i)).join("");
  $("scale-min").textContent = Number(active.heatmap_min).toFixed(4);
  $("scale-max").textContent = Number(active.heatmap_max).toFixed(4);
  $("resolution").textContent = `${active.width} × ${active.height} px`;
  $("sample-strip").innerHTML = rows.map(row => `<button class="sample-card ${active === row ? "active" : ""}" data-case="${CASES.indexOf(row)}" aria-pressed="${active === row}"><img src="${src(row.original_file)}" alt="${name(row)} ${row.source_id}"><span class="card-label"><span>${String(row.group).padStart(2,"0")} · ${name(row)}</span>${active === row ? icon("circle-check") : ""}</span><small>${row.defect_type} / ${row.source_id}</small></button>`).join("");
  if (view === "overview") {
    $("overview-title").textContent = `${categoryNames[category]} · ${rows.length} 组检测案例`;
    $("overview-download").href = src(`overview/${category}_5_groups.jpg`);
    $("overview-download").title = "下载该类别完整五组总览";
    $("overview-rows").innerHTML = rows.map(row => `<article class="overview-row"><h3>${String(row.group).padStart(2,"0")} · ${name(row)} <span class="footer-separator">/</span> ${row.source_id}.png</h3><div class="overview-grid">${variants.map((variant,i)=>panel(row,variant,i,true)).join("")}</div></article>`).join("");
  }
  icons();
}
function move(delta, wrap = false) {
  const rows = matching();
  if (!rows.length) return;
  const index = rows.indexOf(active) + delta;
  active = rows[wrap ? (index + rows.length) % rows.length : Math.max(0, Math.min(rows.length - 1,index))];
  render();
}
function stop() {
  clearInterval(timer); timer = null;
  $("play").innerHTML = icon("play");
  $("play").title = "自动播放";
  $("play").setAttribute("aria-label","自动播放");
  $("play").setAttribute("aria-pressed","false");
  icons();
}
function togglePlay() {
  if (timer) { stop(); return; }
  if (matching().length < 2) return;
  timer = setInterval(() => move(1,true),5000);
  $("play").innerHTML = icon("pause");
  $("play").title = "暂停播放";
  $("play").setAttribute("aria-label","暂停播放");
  $("play").setAttribute("aria-pressed","true");
  icons();
}
function setZoom() {
  const percent = Number($("zoom").value);
  const stage = $("viewer-stage");
  const image = $("viewer-image");
  const width = Math.min(stage.clientWidth-40, (stage.clientHeight-40)*Number(viewerCase.width)/Number(viewerCase.height));
  image.style.width = `${Math.max(100,width)*percent/100}px`;
  image.style.height = "auto";
  $("zoom-value").textContent = `${percent}%`;
}
function updateViewer() {
  const variant = variants[viewerVariant];
  $("viewer-title").textContent = `${categoryNames[viewerCase.category]} · ${name(viewerCase)} · ${variant.label}`;
  $("viewer-subtitle").textContent = `${viewerCase.source_id}.png / ${viewerCase.width} × ${viewerCase.height} px`;
  $("viewer-image").src = src(viewerCase[variant.key]);
  $("viewer-image").alt = $("viewer-title").textContent;
  $("viewer-position").textContent = `${viewerVariant+1} / 3`;
  $("viewer-download").href = src(viewerCase[variant.key]);
  $("viewer-download").download = `${viewerCase.category}_${viewerCase.defect_type}_${viewerCase.source_id}_${variant.key}.png`;
  $("zoom").value = 100;
  setZoom();
  $("viewer-stage").scrollTo(0,0);
}
function openViewer(row, index) {
  stop();
  viewerCase = row; viewerVariant = index;
  $("lightbox").showModal();
  updateViewer();
}
function shiftViewer(delta) { viewerVariant = (viewerVariant+delta+3)%3; updateViewer(); }
$("categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  stop(); category = button.dataset.category; defect = ""; renderFilter(); render();
});
$("search").addEventListener("input", () => {
  stop(); query = $("search").value.trim().toLowerCase(); defect = "";
  const rows = matching(true);
  if (!rows.some(row => row.category === category) && rows.length) category = rows[0].category;
  renderFilter(); render();
});
$("defect-filter").addEventListener("change", () => { stop(); defect = $("defect-filter").value; render(); });
$("reset").addEventListener("click", () => { query = ""; defect = ""; $("search").value = ""; renderFilter(); render(); });
$("sample-strip").addEventListener("click", event => {
  const button = event.target.closest("[data-case]");
  if (button) { stop(); active = CASES[Number(button.dataset.case)]; render(); }
});
document.querySelector("main").addEventListener("click", event => {
  const button = event.target.closest("[data-image]");
  if (button) openViewer(CASES[Number(button.dataset.row)],Number(button.dataset.image));
});
$("compare-tab").addEventListener("click", () => { view = "compare"; render(); });
$("overview-tab").addEventListener("click", () => { stop(); view = "overview"; render(); });
$("previous").addEventListener("click", () => { stop(); move(-1); });
$("next").addEventListener("click", () => { stop(); move(1); });
$("play").addEventListener("click", togglePlay);
$("close-viewer").addEventListener("click", () => $("lightbox").close());
$("viewer-previous").addEventListener("click", () => shiftViewer(-1));
$("viewer-next").addEventListener("click", () => shiftViewer(1));
$("zoom").addEventListener("input", setZoom);
window.addEventListener("resize", () => { if ($("lightbox").open) setZoom(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
document.addEventListener("keydown", event => {
  if (["INPUT","SELECT","TEXTAREA"].includes(event.target.tagName)) return;
  if (!["ArrowLeft","ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const delta = event.key === "ArrowRight" ? 1 : -1;
  if ($("lightbox").open) shiftViewer(delta);
  else { stop(); move(delta); }
});
$("fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $("toast").textContent = "浏览器未允许全屏，可使用浏览器的全屏菜单。";
    $("toast").hidden = false;
    setTimeout(() => $("toast").hidden = true,3500);
  }
});
document.addEventListener("fullscreenchange", () => {
  const isFull = Boolean(document.fullscreenElement);
  $("fullscreen").innerHTML = icon(isFull ? "minimize" : "maximize");
  $("fullscreen").title = isFull ? "退出全屏" : "全屏展示";
  $("fullscreen").setAttribute("aria-label",$("fullscreen").title);
  icons();
});
renderFilter();
render();
