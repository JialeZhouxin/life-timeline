// src/app.mjs — UI entry point for Life Timeline
import { createEvent, addEvent, updateEvent, deleteEvent, inferStages, generateId } from './core.mjs';
import { calculateLayout } from './layout.mjs';
import { saveEvents, loadEvents } from './storage.mjs';
import {
  STORAGE_KEY, PADDING_TOP, PADDING_BOTTOM, MIN_RADIUS, MAX_RADIUS,
  TICK_INTERVAL, MOBILE_TICK_INTERVAL, BASE_HEIGHT, MIN_TIMELINE_HEIGHT,
  STAGE_COLORS, getStageColor,
} from './constants.mjs';

// ===== App State =====
let currentEvents = [];
let currentAge = 25;
let zoomLevel = 1;
let editingId = null;

// ===== DOM Cache =====
let $ = {};

function cacheDom() {
  const ids = [
    'timelineContent', 'emptyState', 'timelineContainer', 'timelineArea',
    'eventCount', 'currentAgeInput',
    'inputAge', 'inputTitle', 'inputDesc', 'inputStage', 'inputImpact', 'impactValue',
    'btnAddEvent',
    'modalOverlay', 'modalAge', 'modalTitle', 'modalDesc', 'modalStage',
    'modalImpact', 'modalImpactValue',
    'btnSaveEvent', 'btnDeleteEvent', 'btnCancelModal',
    'zoomIn', 'zoomOut', 'zoomLabel',
    'sidebarToggle', 'sidePanel',
    'bsOverlay', 'bsAdd',
    'bsInputAge', 'bsInputTitle', 'bsInputDesc', 'bsInputStage',
    'bsInputImpact', 'bsImpactValue', 'bsBtnAdd',
    'btnOverview', 'tlBtnExportJSON', 'tlBtnImportJSON', 'btnExportPDF', 'btnClearAll', 'btnExportJSON', 'btnImportJSON', 'bsBtnExportJSON', 'bsBtnImportJSON', 'overviewOverlay', 'overviewContent', 'overviewClose', 'fileInput',
    'toast', 'toastMsg', 'toastUndo',
  ];
  for (const id of ids) {
    $[id] = document.getElementById(id);
  }
}

// ===== Helpers =====
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function getTimelineHeight() {
  const h = Math.max(BASE_HEIGHT * zoomLevel, ($.timelineContainer.clientHeight || 600));
  const minH = Math.max(currentEvents.length * 60 + 200, 600);
  return Math.max(h, minH);
}

// ===== Bottom Sheet (mobile) =====
function openBottomSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  sheet.classList.add('active');
  $.bsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
  document.querySelectorAll('.bottom-sheet').forEach(function (s) {
    s.classList.remove('active');
  });
  $.bsOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== Toast =====
let toastTimer = null;

function showToast(msg, onUndo) {
  $.toastMsg.textContent = msg;
  $.toastUndo.style.display = onUndo ? 'inline-block' : 'none';
  $.toastUndo.onclick = function () {
    clearTimeout(toastTimer);
    $.toast.classList.remove('show');
    if (onUndo) onUndo();
  };
  $.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    $.toast.classList.remove('show');
  }, 3000);
}

// ===== Drag Tooltip =====
let dragTooltip = null;

function createDragTooltip() {
  if (!dragTooltip) {
    dragTooltip = document.createElement('div');
    dragTooltip.className = 'drag-tooltip';
    dragTooltip.style.display = 'none';
    document.body.appendChild(dragTooltip);
  }
  return dragTooltip;
}

// ===== Drag =====
function setupDrag(node, circle, ev) {
  let dragging = false;
  let startY = 0;
  let startAge = 0;
  const tip = createDragTooltip();

  function onDown(e) {
    dragging = true;
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    startAge = ev.age;
    node.style.zIndex = 20;
    circle.style.cursor = 'grabbing';
    tip.style.display = 'block';
    if (e.preventDefault) e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (clientY === undefined) return;
    const dy = clientY - startY;
    const height = getTimelineHeight();
    const usable = height - PADDING_TOP - PADDING_BOTTOM;
    const ageDelta = (dy / usable) * currentAge;
    const newAge = Math.round(Math.max(0, Math.min(currentAge, startAge + ageDelta)));
    const y = PADDING_TOP + (newAge / currentAge) * usable;
    node.style.top = y + 'px';
    tip.textContent = newAge + ' 岁';
    tip.style.left = (e.clientX || 0) + 'px';
    tip.style.top = (e.clientY || 0) + 'px';
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    node.style.zIndex = 10;
    circle.style.cursor = 'grab';
    tip.style.display = 'none';
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    if (clientY === undefined) return;
    const dy = clientY - startY;
    const height = getTimelineHeight();
    const usable = height - PADDING_TOP - PADDING_BOTTOM;
    const ageDelta = (dy / usable) * currentAge;
    const newAge = Math.round(Math.max(0, Math.min(currentAge, startAge + ageDelta)));
    if (newAge !== startAge) {
      const prevEvents = currentEvents.slice();
      currentEvents = updateEvent(currentEvents, ev.id, { age: newAge });
      saveEvents(currentEvents);
      render(true);
      showToast('已更新年龄为 ' + newAge + ' 岁', function () {
        currentEvents = prevEvents;
        saveEvents(currentEvents);
        render(true);
        showToast('已撤销修改');
      });
    }
  }

  circle.addEventListener('mousedown', onDown);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  circle.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
}

// ===== Render =====
function render(animating) {
  const height = getTimelineHeight();
  const containerWidth = $.timelineContainer.clientWidth;
  const effectiveTickInterval = containerWidth < 480 ? MOBILE_TICK_INTERVAL : TICK_INTERVAL;
  const layout = calculateLayout({
    events: currentEvents,
    currentAge,
    height,
    tickInterval: effectiveTickInterval,
    padding: { top: PADDING_TOP, bottom: PADDING_BOTTOM },
  });

  const container = $.timelineContent;
  const empty = $.emptyState;

  container.style.height = height + 'px';
  container.style.position = 'relative';
  empty.style.display = currentEvents.length === 0 ? 'block' : 'none';

  while (container.firstChild) container.removeChild(container.firstChild);

  // Stage bars
  for (const s of layout.stages) {
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    bar.style.top = s.startY + 'px';
    bar.style.height = Math.max(s.endY - s.startY, 4) + 'px';
    bar.style.background = s.color;
    bar.title = s.stage;
    container.appendChild(bar);
  }

  // Age ticks
  for (const t of layout.ticks) {
    const tick = document.createElement('div');
    tick.className = 'age-tick';
    tick.style.top = t.y + 'px';
    tick.textContent = t.age + (t.age === currentAge ? ' 岁 (现在)' : ' 岁');
    container.appendChild(tick);
  }

  // Event nodes
  for (const ev of layout.events) {
    const node = document.createElement('div');
    node.className = 'event-node';
    node.style.top = ev.y + 'px';
    node.dataset.id = ev.id;
    if (!animating) node.style.animation = 'none';

    const circle = document.createElement('div');
    circle.className = 'event-circle';
    circle.style.width = (ev.radius * 2) + 'px';
    circle.style.height = (ev.radius * 2) + 'px';
    const stageColor = ev.stage ? getStageColor(ev.stage) : '#3B82F6';
    circle.style.border = '3px solid ' + stageColor;
    circle.style.background = 'radial-gradient(circle at 35% 30%, #ffffff 0%, ' + hexToRgba(stageColor, 0.15) + ' 100%)';
    circle.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 6px ' + hexToRgba(stageColor, 0.12) + ', 0 2px 8px rgba(0,0,0,0.06)';
    circle.title = '影响力: ' + ev.impact + '/10';

    const label = document.createElement('div');
    label.className = 'event-label';
    label.style.borderLeftColor = stageColor;
    label.innerHTML =
      '<span class="event-title">' + escHtml(ev.title) + '</span>' +
      '<span class="event-age">' + ev.age + ' 岁</span>' +
      (ev.description ? '<span class="event-desc">' + escHtml(ev.description) + '</span>' : '');

    if (ev.sameAge) node.classList.add('same-age');
    node.appendChild(circle);
    node.appendChild(label);
    container.appendChild(node);

    node.addEventListener('click', function (e) {
      e.stopPropagation();
      openEditModal(this.dataset.id);
    });
    setupDrag(node, circle, ev);
  }

  // Same-age bracket connectors
  var bracketGroups = {};
  for (var _i = 0; _i < layout.events.length; _i++) {
    var _ev = layout.events[_i];
    if (_ev.sameAge) {
      if (!bracketGroups[_ev.age]) bracketGroups[_ev.age] = [];
      bracketGroups[_ev.age].push(_ev);
    }
  }
  for (var age in bracketGroups) {
    var g = bracketGroups[age];
    if (g.length <= 1) continue;
    var minY = Math.min.apply(null, g.map(function(e) { return e.y; }));
    var maxY = Math.max.apply(null, g.map(function(e) { return e.y; }));
    var bracket = document.createElement('div');
    bracket.className = 'age-bracket';
    bracket.style.top = minY + 'px';
    bracket.style.height = (maxY - minY) + 'px';
    container.appendChild(bracket);

    // Horizontal connectors from each circle to the bracket
    for (var _j = 0; _j < g.length; _j++) {
      var conn = document.createElement('div');
      conn.className = 'age-connector';
      conn.style.top = g[_j].y + 'px';
      container.appendChild(conn);
    }
  }

  // Timeline line gradient (follow stage colors)
  var line = $.timelineContainer.querySelector('.timeline-line');
  if (layout.stages.length > 0) {
    var stops = layout.stages.map(function (s) {
      var topPct = (s.startY / height) * 100;
      var botPct = (s.endY / height) * 100;
      return s.color + ' ' + topPct + '% ' + botPct + '%';
    });
    line.style.background = 'linear-gradient(to bottom, ' + stops.join(', ') + ')';
  } else {
    line.style.background = '';
  }

  $.eventCount.textContent = currentEvents.length;
}

// ===== Modal =====
function openEditModal(id) {
  editingId = id;
  const ev = currentEvents.find(function (e) { return e.id === id; });
  if (!ev) return;

  $.modalAge.value = ev.age;
  $.modalTitle.value = ev.title;
  $.modalDesc.value = ev.description;
  $.modalStage.value = ev.stage;
  $.modalImpact.value = ev.impact;
  $.modalImpactValue.textContent = ev.impact;
  $.modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(function () { $.modalAge.focus(); }, 100);
}

function closeModal() {
  $.modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  editingId = null;
}

function closeOverview() {
  $.overviewOverlay.classList.remove('active');
}

function showOverview() {
  const events = currentEvents;
  const total = events.length;
  if (total === 0) {
    showToast('暂无事件');
    return;
  }

  const stages = [...new Set(events.filter(function (e) { return e.stage; }).map(function (e) { return e.stage; }))];
  const avgImpact = (events.reduce(function (s, e) { return s + e.impact; }, 0) / total).toFixed(1);
  const maxAge = Math.max.apply(null, events.map(function (e) { return e.age; }));
  const minAge = Math.min.apply(null, events.map(function (e) { return e.age; }));

  // Stage distribution
  var stageCounts = {};
  events.forEach(function (e) {
    var s = e.stage || '未分类';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  var stageMax = Math.max.apply(null, Object.values(stageCounts)) || 1;
  var stageColors = {};
  events.forEach(function (e) {
    if (e.stage && !stageColors[e.stage]) stageColors[e.stage] = getStageColor(e.stage);
  });

  var html = '';

  // Stat cards
  html += '<div class="overview-stats">';
  html += '<div class="ov-stat"><div class="num">' + total + '</div><div class="label">事件总数</div></div>';
  html += '<div class="ov-stat"><div class="num">' + stages.length + '</div><div class="label">人生阶段</div></div>';
  html += '<div class="ov-stat"><div class="num">' + avgImpact + '</div><div class="label">平均影响力</div></div>';
  html += '<div class="ov-stat"><div class="num">' + minAge + '−' + maxAge + '</div><div class="label">年龄跨度</div></div>';
  html += '</div>';

  // Stage distribution bars
  html += '<div class="ov-section"><h4>各阶段事件分布</h4>';
  for (var s in stageCounts) {
    var pct = (stageCounts[s] / stageMax * 100).toFixed(0);
    var color = stageColors[s] || '#94A3B8';
    html += '<div class="ov-stage-row"><span class="name">' + escHtml(s) + '</span><div class="track"><div class="fill" style="width:' + pct + '%;background:' + color + '"></div></div><span class="count">' + stageCounts[s] + '</span></div>';
  }
  html += '</div>';

  // Event list
  var sorted = events.slice().sort(function (a, b) { return a.age - b.age; });
  html += '<div class="ov-section"><h4>事件列表</h4>';
  for (var i = 0; i < sorted.length; i++) {
    var e = sorted[i];
    var color = e.stage ? getStageColor(e.stage) : '#3B82F6';
    var stageTag = e.stage ? '<span class="meta">' + escHtml(e.stage) + '</span>' : '';
    html += '<div class="ov-event"><div class="age">' + e.age + '</div><div class="info"><div class="title">' + escHtml(e.title) + '</div>' + stageTag + '</div><div class="impact-dot" style="background:' + color + ';opacity:' + (e.impact / 10) + ';"></div></div>';
  }
  html += '</div>';

  $.overviewContent.innerHTML = html;
  $.overviewOverlay.classList.add('active');
}

// ===== Export / Import =====
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function generatePrintHTML(events, age) {
  const sorted = events.slice().sort(function (a, b) { return a.age - b.age; });
  let list = '';
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const stageTag = e.stage ? '<div class="p-stage" style="background:' + getStageColor(e.stage) + '">' + escHtml(e.stage) + '</div>' : '';
    const desc = e.description ? '<div class="p-desc">' + escHtml(e.description) + '</div>' : '';
    list += '<div class="p-event"><div class="p-dot" style="background:' + (e.stage ? getStageColor(e.stage) : '#3B82F6') + ';border-color:' + (e.stage ? getStageColor(e.stage) : '#3B82F6') + '"></div><div class="p-line"></div><div class="p-content"><div class="p-age">' + e.age + ' 岁</div><div class="p-title">' + escHtml(e.title) + '</div>' + desc + stageTag + '<div class="p-impact">影响力: ' + e.impact + '/10</div></div></div>';
  }
  let stagesHtml = '';
  const stages = inferStages(events);
  if (stages.length > 0) {
    let tags = '';
    for (let i = 0; i < stages.length; i++) {
      tags += '<span class="p-stage-tag" style="background:' + getStageColor(stages[i].stage) + '">' + stages[i].stage + ' (' + stages[i].startAge + '-' + stages[i].endAge + ' 岁)</span>';
    }
    stagesHtml = '<div class="p-stages"><strong>人生阶段</strong>' + tags + '</div>';
  }
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>生命轴 - 打印版</title><style>body{font-family:-apple-system,"PingFang SC",sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#0F172A;}h1{text-align:center;color:#3B82F6;font-size:24px;margin-bottom:4px;}.sub{text-align:center;color:#64748B;font-size:14px;margin-bottom:32px;}.p-event{position:relative;padding-left:40px;margin-bottom:24px;}.p-dot{position:absolute;left:10px;top:6px;width:14px;height:14px;border-radius:50%;background:#3B82F6;border:3px solid #3B82F6;}.p-line{position:absolute;left:16px;top:20px;bottom:-24px;width:2px;background:#E2E8F0;}.p-event:last-child .p-line{display:none;}.p-age{font-size:13px;font-weight:600;color:#3B82F6;}.p-title{font-size:16px;font-weight:600;margin:2px 0;}.p-desc{font-size:13px;color:#64748B;margin:2px 0;}.p-stage{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;color:#fff;margin:2px 0;}.p-impact{font-size:12px;color:#D97706;}.p-stages{margin-top:32px;padding-top:16px;border-top:1px solid #E2E8F0;}.p-stages strong{display:block;margin-bottom:8px;font-size:14px;}.p-stage-tag{display:inline-block;padding:4px 10px;border-radius:12px;color:#fff;font-size:12px;margin:2px 4px 2px 0;}@media print{body{padding:20px;}.p-event{break-inside:avoid;}}</style></head><body><h1>生命轴</h1><div class="sub">' + age + ' 岁的人生旅途 · 共 ' + events.length + ' 个重要事件</div>' + list + stagesHtml + '<div style="margin-top:40px;text-align:center;font-size:11px;color:#94A3B8;">由 生命轴 生成</div></body></html>';
}

function importData(data) {
  currentEvents = data.events;
  if (data.currentAge) {
    currentAge = data.currentAge;
    $.currentAgeInput.value = currentAge;
  }
  saveEvents(currentEvents);
  render(true);
  showToast('已导入 ' + currentEvents.length + ' 个事件');
}

// ===== Init (event setup) =====
function init() {
  cacheDom();

  // Render Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Load saved data
  currentEvents = loadEvents();
  const savedAge = localStorage.getItem('life-timeline-age');
  if (savedAge) {
    currentAge = parseInt(savedAge) || 25;
    $.currentAgeInput.value = currentAge;
  }

  // Impact slider in form
  $.inputImpact.addEventListener('input', function () {
    $.impactValue.textContent = this.value;
  });

  // Add event button
  $.btnAddEvent.addEventListener('click', function () {
    const age = parseInt($.inputAge.value);
    const title = $.inputTitle.value.trim();
    if (isNaN(age)) { showToast('请输入年龄'); return; }
    if (!title) { showToast('请输入标题'); return; }
    try {
      const event = createEvent({
        age: age,
        title: title,
        description: $.inputDesc.value.trim(),
        stage: $.inputStage.value,
        impact: parseInt($.inputImpact.value) || 0,
      });
      currentEvents = addEvent(currentEvents, event);
      saveEvents(currentEvents);
      render(true);
      $.inputAge.value = '';
      $.inputTitle.value = '';
      $.inputDesc.value = '';
      $.inputStage.value = '';
      $.inputImpact.value = 5;
      $.impactValue.textContent = '5';
      showToast('已添加：「' + title + '」');
    } catch (err) {
      showToast(err.message);
    }
  });

  // Enter key in title field triggers add
  $.inputTitle.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $.btnAddEvent.click();
  });

  // Current age input
  $.currentAgeInput.addEventListener('change', function () {
    const val = parseInt(this.value);
    if (val > 0 && val <= 150) {
      currentAge = val;
      localStorage.setItem('life-timeline-age', this.value);
      render(true);
    }
  });

  // Zoom
  $.zoomIn.addEventListener('click', function () {
    zoomLevel = Math.min(4, zoomLevel * 1.5);
    $.zoomLabel.textContent = zoomLevel.toFixed(1) + '×';
    render(true);
  });
  $.zoomOut.addEventListener('click', function () {
    zoomLevel = Math.max(0.25, zoomLevel / 1.5);
    $.zoomLabel.textContent = zoomLevel.toFixed(1) + '×';
    render(true);
  });
  $.timelineArea.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomLevel = Math.min(4, zoomLevel * 1.1);
      } else {
        zoomLevel = Math.max(0.25, zoomLevel / 1.1);
      }
      $.zoomLabel.textContent = zoomLevel.toFixed(1) + '×';
      render(true);
    }
  }, { passive: false });

  // Sidebar toggle (mobile) / Bottom sheet trigger
  $.sidebarToggle.addEventListener('click', function () {
    if (window.innerWidth <= 768) {
      openBottomSheet('bsAdd');
    } else {
      $.sidePanel.classList.toggle('collapsed');
    }
  });

  // Modal: impact slider
  $.modalImpact.addEventListener('input', function () {
    $.modalImpactValue.textContent = this.value;
  });

  // Modal: save
  $.btnSaveEvent.addEventListener('click', function () {
    if (!editingId) return;
    const changes = {
      age: parseInt($.modalAge.value) || 0,
      title: $.modalTitle.value.trim() || '未命名',
      description: $.modalDesc.value,
      stage: $.modalStage.value,
      impact: parseInt($.modalImpact.value) || 0,
    };
    currentEvents = updateEvent(currentEvents, editingId, changes);
    saveEvents(currentEvents);
    render(true);
    closeModal();
    showToast('已保存修改');
  });

  // Modal: delete
  $.btnDeleteEvent.addEventListener('click', function () {
    if (!editingId || !confirm('确定删除此事件？')) return;
    currentEvents = deleteEvent(currentEvents, editingId);
    saveEvents(currentEvents);
    render(true);
    closeModal();
    showToast('已删除事件');
  });

  // Modal: cancel
  $.btnCancelModal.addEventListener('click', closeModal);
  $.modalOverlay.addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $.modalOverlay.classList.contains('active')) closeModal();
  });

  // JSON Export
  function handleExportJSON() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      currentAge: currentAge,
      events: currentEvents,
    };
    downloadFile(
      JSON.stringify(data, null, 2),
      '生命轴-' + new Date().toISOString().slice(0, 10) + '.json',
      'application/json'
    );
    showToast('已导出 JSON 数据');
  }
  $.btnExportJSON.addEventListener('click', handleExportJSON);
  $.bsBtnExportJSON.addEventListener('click', handleExportJSON);
  $.tlBtnExportJSON.addEventListener('click', handleExportJSON);

  // Export PDF (direct download — html2canvas + jsPDF)
  $.btnExportPDF.addEventListener('click', async function () {
    // Loading toast (persist until done)
    $.toastMsg.textContent = '正在生成 PDF…';
    $.toastUndo.style.display = 'none';
    $.toast.classList.add('show');
    clearTimeout(toastTimer);

    try {
      if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        throw new Error('PDF 库未加载，请刷新页面重试');
      }

      // Scroll timeline to top for consistent capture
      $.timelineArea.scrollTop = 0;

      // Capture at 3x for sharp text, limit to 8000px height (browser canvas safety)
      var captureScale = Math.min(3, 8000 / $.timelineContainer.scrollHeight || 3);
      var canvas = await html2canvas($.timelineContainer, {
        scale: captureScale,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      // Create PDF (A4 portrait)
      var pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      var margin = 8;
      var usableW = pageW - margin * 2;
      var usableH = pageH - margin * 2;

      var cw = canvas.width;
      var ch = canvas.height;
      var pxPerMm = cw / usableW;
      var fullImgH = ch / pxPerMm;  // full image height in mm

      function addPageSlice(canvas, srcY, sliceH) {
        var tmp = document.createElement('canvas');
        tmp.width = cw;
        tmp.height = sliceH;
        tmp.getContext('2d').drawImage(canvas, 0, srcY, cw, sliceH, 0, 0, cw, sliceH);
        pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, usableW, sliceH / pxPerMm);
      }

      if (fullImgH <= usableH) {
        addPageSlice(canvas, 0, ch);
      } else {
        var sliceH = usableH * pxPerMm;
        var srcY = 0;
        var pageNum = 0;
        while (srcY < ch) {
          if (pageNum > 0) pdf.addPage();
          var h = Math.min(sliceH, ch - srcY);
          addPageSlice(canvas, srcY, h);
          srcY += sliceH;
          pageNum++;
        }
      }

      pdf.save('生命轴-时间轴.pdf');

      // Success toast
      $.toastMsg.textContent = 'PDF 已下载 ✓';
      toastTimer = setTimeout(function () {
        $.toast.classList.remove('show');
      }, 3000);
    } catch (err) {
      // Fallback: try print view
      $.toastMsg.textContent = 'PDF 生成失败，改用打印视图: ' + err.message;
      toastTimer = setTimeout(function () {
        $.toast.classList.remove('show');
      }, 4000);
      var pw = window.open('', '_blank');
      pw.document.write(generatePrintHTML(currentEvents, currentAge));
      pw.document.close();
      pw.focus();
      setTimeout(function () { pw.print(); }, 500);
    }
  });

  // JSON Import
  function handleImportJSONClick() { $.fileInput.click(); }
  $.btnImportJSON.addEventListener('click', handleImportJSONClick);
  $.bsBtnImportJSON.addEventListener('click', handleImportJSONClick);
  $.tlBtnImportJSON.addEventListener('click', handleImportJSONClick);
  $.fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.events && Array.isArray(parsed.events)) {
          importData(parsed);
          return;
        }
      } catch (e1) { /* invalid JSON */ }
      showToast('无法识别的文件格式');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // Overview
  $.btnOverview.addEventListener('click', showOverview);
  $.overviewOverlay.addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeOverview();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $.overviewOverlay.classList.contains('active')) closeOverview();
  });
  $.overviewClose.addEventListener('click', closeOverview);

  // Bottom sheet: impact slider
  $.bsInputImpact.addEventListener('input', function () {
    $.bsImpactValue.textContent = this.value;
  });

  // Bottom sheet: add event submit
  $.bsBtnAdd.addEventListener('click', function () {
    const age = parseInt($.bsInputAge.value);
    const title = $.bsInputTitle.value.trim();
    if (isNaN(age)) { showToast('请输入年龄'); return; }
    if (!title) { showToast('请输入标题'); return; }
    try {
      const event = createEvent({
        age: age,
        title: title,
        description: $.bsInputDesc.value.trim(),
        stage: $.bsInputStage.value,
        impact: parseInt($.bsInputImpact.value) || 0,
      });
      currentEvents = addEvent(currentEvents, event);
      saveEvents(currentEvents);
      render(true);
      $.bsInputAge.value = '';
      $.bsInputTitle.value = '';
      $.bsInputDesc.value = '';
      $.bsInputStage.value = '';
      $.bsInputImpact.value = 5;
      $.bsImpactValue.textContent = '5';
      closeBottomSheet();
      showToast('已添加：「' + title + '」');
    } catch (err) {
      showToast(err.message);
    }
  });

  // Bottom sheet: overlay click to close
  $.bsOverlay.addEventListener('click', closeBottomSheet);

  // Clear all
  $.btnClearAll.addEventListener('click', function () {
    if (currentEvents.length === 0) return;
    if (!confirm('确定清空所有事件？')) return;
    const prev = currentEvents;
    currentEvents = [];
    saveEvents(currentEvents);
    render(true);
    showToast('已清空所有事件', function () {
      currentEvents = prev;
      saveEvents(currentEvents);
      render(true);
      showToast('已撤销清空');
    });
  });

  // Initial render
  render(true);
}

// ===== Start =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
