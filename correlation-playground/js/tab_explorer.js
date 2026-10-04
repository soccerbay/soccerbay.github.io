// js/tab_explorer.js

let rawCsvData = [];
let currentTabId = 'tab-marriage';

const TAIWAN_COUNTIES = [
  '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
  '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市',
  '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
];

const COUNTY_CENTERS = {
  '臺北市': [25.04, 121.55, 12], '新北市': [24.98, 121.50, 11], '桃園市': [24.95, 121.20, 11],
  '臺中市': [24.16, 120.65, 11], '臺南市': [23.15, 120.25, 11], '高雄市': [22.75, 120.35, 11],
  '基隆市': [25.13, 121.74, 13], '新竹市': [24.80, 120.97, 13], '新竹縣': [24.75, 121.15, 11],
  '苗栗縣': [24.50, 120.90, 11], '彰化縣': [23.98, 120.48, 11], '南投縣': [23.85, 120.90, 10],
  '雲林縣': [23.70, 120.35, 11], '嘉義市': [23.48, 120.44, 13], '嘉義縣': [23.45, 120.30, 11],
  '屏東縣': [22.50, 120.60, 10], '宜蘭縣': [24.60, 121.75, 11], '花蓮縣': [23.75, 121.40, 9],
  '臺東縣': [22.85, 121.05, 9],  '澎湖縣': [23.57, 119.58, 11], '金門縣': [24.44, 118.38, 11],
  '連江縣': [26.16, 119.95, 11]
};

const COLOR_RAMP_BLUE = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
const COLOR_RAMP_DIVERGING = ['#b91c1c', '#f87171', '#e2e8f0', '#60a5fa', '#1d4ed8'];

const THEME_CONFIG = {
  'tab-marriage': {
    name: '婚生的抉擇',
    mapId: 'map-marriage',
    scatterId: 'scatter-marriage',
    targets: ['15歲以上已婚率', '15歲以上離婚率', '15歲以上未婚率', '粗出生率', '自然增加率'],
    candidates: ['綜合所得中位數', '綜合所得平均數', '15歲以上高教比', '戶量', '人口密度', '性比例', '老化指數', '扶老比', '扶養比', '粗死亡率']
  },
  'tab-wealth': {
    name: '致富的條件',
    mapId: 'map-wealth',
    scatterId: 'scatter-wealth',
    targets: ['綜合所得平均數', '綜合所得中位數', '綜合所得變異係數', '各類所得金額薪資所得(108年起)', '各類所得金額財產交易所得(108年起)', '各類所得金額股利所得(108年起)'],
    candidates: ['15歲以上高教比', '15歲以上碩士人口數', '15歲以上博士人口數', '綜合所得第一分位數', '綜合所得第三分位數', '綜合所得標準差', '各類所得金額利息所得(108年起)', '各類所得金額租賃及權利金(108年起)', '性比例', '戶量', '粗死亡率', '老化指數']
  },
  'tab-population': {
    name: '人口的流動',
    mapId: 'map-population',
    scatterId: 'scatter-population',
    targets: ['社會增加率', '扶幼比', '0-14歲人口數', '0-5歲兒童人口數', '6-11歲兒童人口數', '12-17歲少年人口數'],
    candidates: ['15歲以上高教比', '綜合所得中位數', '戶量', '人口密度', '老化指數', '扶老比', '扶養比', '粗死亡率', '粗出生率', '人口數', '戶數', '性比例']
  }
};

// 每個主題分頁完全獨立的記憶狀態
window.tabStates = {
  'tab-marriage': { map: null, selectedCounties: [], xVar: '', yVar: '', breaks: [], valueLookup: new Map(), fullDataLookup: new Map(), isRendered: false },
  'tab-wealth': { map: null, selectedCounties: [], xVar: '', yVar: '', breaks: [], valueLookup: new Map(), fullDataLookup: new Map(), isRendered: false },
  'tab-population': { map: null, selectedCounties: [], xVar: '', yVar: '', breaks: [], valueLookup: new Map(), fullDataLookup: new Map(), isRendered: false }
};

let pmtilesProtocolAdded = false;

// 1. 初始化指定主題的地圖（確保在元素可見時掛載）
function initMapForTab(tabId) {
  const st = window.tabStates[tabId];
  const cfg = THEME_CONFIG[tabId];
  if (!cfg) return;

  if (st.map) {
    st.map.resize();
    return;
  }

  const container = document.getElementById(cfg.mapId);
  if (!container || container.clientWidth === 0) return;

  if (!pmtilesProtocolAdded) {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    pmtilesProtocolAdded = true;
  }

  const map = new maplibregl.Map({
    container: container,
    style: {
      version: 8,
      sources: {
        'basemap': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256
        }
      },
      layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }]
    },
    center: [120.9, 23.8],
    zoom: 7,
    minZoom: 6,
    maxZoom: 16
  });

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  st.map = map;

  const hoveredPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'village-tooltip', offset: 15 });

  map.on('mousemove', 'villages-fill', (e) => {
    if (e.features && e.features.length > 0) {
      const feat = e.features[0];
      const props = feat.properties || {};

      if (!st.selectedCounties.includes(props.COUNTY)) {
        map.getCanvas().style.cursor = '';
        hoveredPopup.remove();
        map.setFilter('villages-highlight', ['==', ['get', 'V_ID'], '']);
        const plotEl = document.getElementById(cfg.scatterId);
        if (plotEl) Plotly.Fx.unhover(plotEl);
        return;
      }

      map.getCanvas().style.cursor = 'pointer';
      const vId = props.V_ID || props['V-ID'];
      const data = st.fullDataLookup.get(vId);

      if (data) {
        const html = `<b>${data['縣市名稱']}${data['鄉鎮市區名稱']}${data['村里名稱']}</b><br>${st.xVar}: ${data[st.xVar]}<br>${st.yVar}: ${data[st.yVar]}`;
        hoveredPopup.setLngLat(e.lngLat).setHTML(html).addTo(map);
      }

      map.setFilter('villages-highlight', [
        'all',
        ['in', ['get', 'COUNTY'], ['literal', st.selectedCounties]],
        ['==', ['get', 'V_ID'], vId]
      ]);

      highlightPlotlyPoint(tabId, vId);
    }
  });

  map.on('mouseleave', 'villages-fill', () => {
    map.getCanvas().style.cursor = '';
    hoveredPopup.remove();
    map.setFilter('villages-highlight', [
      'all',
      ['in', ['get', 'COUNTY'], ['literal', st.selectedCounties]],
      ['==', ['get', 'V_ID'], '']
    ]);
    const plotEl = document.getElementById(cfg.scatterId);
    if (plotEl) Plotly.Fx.unhover(plotEl);
  });
}

// 2. 載入 CSV 並初始化三個主題面板
function loadCsvDataset() {
  Papa.parse('data/111年行政區常用資料集_村里 - 表格瘦身.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      rawCsvData = results.data;
      
      Object.keys(THEME_CONFIG).forEach(tabId => {
        setupCountySelector(tabId);
        setupDropdowns(tabId);
      });

      // 初始化當前預設主題地圖
      setTimeout(() => initMapForTab(currentTabId), 150);
    }
  });
}

// 3. 縣市選單設定（加入完成、清空樣式與不自動收合保護）
function setupCountySelector(tabId) {
  const pane = document.getElementById(tabId);
  if (!pane) return;

  const container = pane.querySelector('.county-checkbox-container');
  const btnText = pane.querySelector('.county-btn-text');
  const dropdownBtn = pane.querySelector('.county-dropdown-btn');
  const dropdownMenu = pane.querySelector('.county-dropdown-menu');

  if (!container) return;
  container.innerHTML = '';
  window.tabStates[tabId].selectedCounties = [];

  TAIWAN_COUNTIES.forEach(county => {
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    label.innerHTML = `<input type="checkbox" value="${county}" /> <span>${county}</span>`;
    
    label.querySelector('input').addEventListener('change', (e) => {
      e.stopPropagation();
      updateSelectedCounties(tabId);
    });
    container.appendChild(label);
  });

  if (btnText) btnText.innerText = '請選擇行政區 (已選 0 縣市)';

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.onclick = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    };
    dropdownMenu.onclick = (e) => e.stopPropagation();
  }

  const btnAll = pane.querySelector('.btn-select-all-counties');
  const btnClear = pane.querySelector('.btn-clear-counties');
  const btnDone = pane.querySelector('.btn-done-counties');

  if (btnAll) {
    btnAll.onclick = (e) => {
      e.stopPropagation();
      container.querySelectorAll('input').forEach(cb => cb.checked = true);
      updateSelectedCounties(tabId);
    };
  }
  if (btnClear) {
    btnClear.onclick = (e) => {
      e.stopPropagation();
      container.querySelectorAll('input').forEach(cb => cb.checked = false);
      updateSelectedCounties(tabId);
    };
  }
  if (btnDone) {
    btnDone.onclick = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.remove('show');
    };
  }
}

function updateSelectedCounties(tabId) {
  const pane = document.getElementById(tabId);
  if (!pane) return;

  const checked = Array.from(pane.querySelectorAll('.county-checkbox-container input:checked')).map(cb => cb.value);
  window.tabStates[tabId].selectedCounties = checked;

  const btnText = pane.querySelector('.county-btn-text');
  if (btnText) {
    btnText.innerText = checked.length === 0 ? '請選擇行政區 (已選 0 縣市)' : `選擇行政區 (已選 ${checked.length} 縣市)`;
  }

  checkReadyState(tabId);
  if (checked.length > 0) {
    updateScatterPlot(tabId);
  }
}

function setupDropdowns(tabId) {
  const cfg = THEME_CONFIG[tabId];
  const pane = document.getElementById(tabId);
  if (!cfg || !pane) return;

  const mapVarSelect = pane.querySelector('.map-var-select');
  const scatterXSelect = pane.querySelector('.scatter-x-select');

  if (!mapVarSelect || !scatterXSelect) return;

  mapVarSelect.innerHTML = '<option value="">選擇統計數據 (應變數 Y)</option>';
  scatterXSelect.innerHTML = '<option value="">選擇自變數 X</option>';

  cfg.targets.forEach(col => mapVarSelect.add(new Option(col, col)));
  cfg.candidates.forEach(col => scatterXSelect.add(new Option(col, col)));

  // 預設選取第一個指標
  mapVarSelect.value = cfg.targets[0] || '';
  scatterXSelect.value = cfg.candidates[0] || '';

  window.tabStates[tabId].yVar = mapVarSelect.value;
  window.tabStates[tabId].xVar = scatterXSelect.value;

  checkReadyState(tabId);

  mapVarSelect.onchange = () => {
    window.tabStates[tabId].yVar = mapVarSelect.value;
    checkReadyState(tabId);
    if (window.tabStates[tabId].selectedCounties.length > 0) {
      updateScatterPlot(tabId);
    }
  };

  scatterXSelect.onchange = () => {
    window.tabStates[tabId].xVar = scatterXSelect.value;
    if (window.tabStates[tabId].selectedCounties.length > 0) {
      updateScatterPlot(tabId);
    }
  };

  const btnLoad = pane.querySelector('.btn-load-map');
  const btnReset = pane.querySelector('.btn-reset-map');

  if (btnLoad) btnLoad.onclick = () => renderChoroplethMap(tabId);
  if (btnReset) btnReset.onclick = () => resetTab(tabId);
}

function checkReadyState(tabId) {
  const pane = document.getElementById(tabId);
  if (!pane) return;

  const btnLoad = pane.querySelector('.btn-load-map');
  const isReady = window.tabStates[tabId].selectedCounties.length > 0 && window.tabStates[tabId].yVar !== '';

  if (btnLoad) {
    if (isReady) {
      btnLoad.classList.remove('disabled'); btnLoad.classList.add('ready'); btnLoad.disabled = false;
    } else {
      btnLoad.classList.add('disabled'); btnLoad.classList.remove('ready'); btnLoad.disabled = true;
    }
  }
}

// 4. 自然斷點與雙向色階計算
function isDivergingMetric(validValues) {
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  return min < 0 && max > 0;
}

function computeJenksBreaks(values, numClasses = 5) {
  const clean = values.filter(v => typeof v === 'number' && !isNaN(v) && v !== -999).sort((a, b) => a - b);
  if (clean.length === 0) return [0, 0, 0, 0, 0];

  if (isDivergingMetric(clean)) {
    const negs = clean.filter(v => v < 0);
    const poss = clean.filter(v => v >= 0);
    const negBreak1 = negs.length > 0 ? ss.quantile(negs, 0.5) : -1;
    const posBreak1 = poss.length > 0 ? ss.quantile(poss, 0.5) : 1;
    const posBreak2 = poss.length > 0 ? Math.max(...poss) : 2;
    return [negBreak1, 0, posBreak1, posBreak2];
  }

  const clusters = ss.ckmeans(clean, Math.min(numClasses, clean.length));
  return clusters.map(c => c[c.length - 1]);
}

function getColor(value, breaks, isDiverging) {
  if (value === null || value === undefined || isNaN(value) || value === -999) return '#cbd5e1';

  if (isDiverging) {
    if (value < breaks[0]) return COLOR_RAMP_DIVERGING[0];
    if (value < 0) return COLOR_RAMP_DIVERGING[1];
    if (value === 0) return COLOR_RAMP_DIVERGING[2];
    if (value <= breaks[2]) return COLOR_RAMP_DIVERGING[3];
    return COLOR_RAMP_DIVERGING[4];
  }

  for (let i = 0; i < breaks.length; i++) {
    if (value <= breaks[i]) return COLOR_RAMP_BLUE[i];
  }
  return COLOR_RAMP_BLUE[COLOR_RAMP_BLUE.length - 1];
}

// 5. 渲染各主題面量圖
function renderChoroplethMap(tabId) {
  const st = window.tabStates[tabId];
  const pane = document.getElementById(tabId);
  if (!pane) return;

  initMapForTab(tabId);
  const map = st.map;

  const mapVarSelect = pane.querySelector('.map-var-select');
  if (mapVarSelect && mapVarSelect.value) st.yVar = mapVarSelect.value;

  if (!map || !st.yVar || st.selectedCounties.length === 0) return;

  st.valueLookup.clear();
  st.fullDataLookup.clear();
  const validValues = [];

  rawCsvData.forEach(row => {
    if (st.selectedCounties.includes(row['縣市名稱'])) {
      const code = row['村里代碼'];
      const val = parseFloat(row[st.yVar]);
      st.fullDataLookup.set(code, row);
      if (!isNaN(val) && val !== -999) {
        st.valueLookup.set(code, val);
        validValues.push(val);
      } else {
        st.valueLookup.set(code, -999);
      }
    }
  });

  const diverging = isDivergingMetric(validValues);
  st.isDiverging = diverging;
  st.breaks = computeJenksBreaks(validValues, 5);
  updateLegend(tabId, st.yVar, st.breaks, validValues, diverging);

  const applyLayers = () => {
    if (!map.getSource('villages')) {
      map.addSource('villages', { type: 'vector', url: 'pmtiles://data/map_data.pmtiles' });
    }

    let matchColors = ['match', ['get', 'V_ID']];
    st.valueLookup.forEach((val, vId) => {
      matchColors.push(vId, getColor(val, st.breaks, diverging));
    });
    matchColors.push('rgba(0,0,0,0)');

    if (map.getLayer('villages-fill')) map.removeLayer('villages-fill');
    if (map.getLayer('villages-highlight')) map.removeLayer('villages-highlight');

    map.addLayer({
      id: 'villages-fill',
      type: 'fill',
      source: 'villages',
      'source-layer': '111_village',
      paint: { 'fill-color': matchColors, 'fill-opacity': 0.85 }
    });

    map.addLayer({
      id: 'villages-highlight',
      type: 'line',
      source: 'villages',
      'source-layer': '111_village',
      paint: { 'line-color': '#dc2626', 'line-width': 3 },
      filter: [
        'all',
        ['in', ['get', 'COUNTY'], ['literal', st.selectedCounties]],
        ['==', ['get', 'V_ID'], '']
      ]
    });

    if (st.selectedCounties.length === 1 && COUNTY_CENTERS[st.selectedCounties[0]]) {
      const [lat, lng, zoom] = COUNTY_CENTERS[st.selectedCounties[0]];
      map.flyTo({ center: [lng, lat], zoom: zoom });
    } else if (st.selectedCounties.length === TAIWAN_COUNTIES.length) {
      map.flyTo({ center: [120.9, 23.8], zoom: 8 });
    }
  };

  if (!map.isStyleLoaded()) {
    map.once('load', applyLayers);
  } else {
    applyLayers();
  }

  st.isRendered = true;
  updateScatterPlot(tabId);
}

function updateLegend(tabId, varName, breaks, validValues, isDiverging) {
  const pane = document.getElementById(tabId);
  const legendDiv = pane.querySelector('.map-legend');
  if (!legendDiv) return;

  legendDiv.style.display = 'block';
  const minVal = validValues.length > 0 ? Math.min(...validValues).toFixed(1) : '0';

  let html = `<strong>${varName} ${isDiverging ? '(發散階層)' : '(自然斷點)'}</strong>`;

  if (isDiverging) {
    html += `
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <span style="width:14px;height:14px;background:${COLOR_RAMP_DIVERGING[4]};border:1px solid #ccc;"></span>
        <span>正成長極高 (&gt; ${breaks[2].toFixed(1)})</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <span style="width:14px;height:14px;background:${COLOR_RAMP_DIVERGING[3]};border:1px solid #ccc;"></span>
        <span>淨移入 (0 ~ ${breaks[2].toFixed(1)})</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <span style="width:14px;height:14px;background:${COLOR_RAMP_DIVERGING[1]};border:1px solid #ccc;"></span>
        <span>淨遷出 (${breaks[0].toFixed(1)} ~ 0)</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <span style="width:14px;height:14px;background:${COLOR_RAMP_DIVERGING[0]};border:1px solid #ccc;"></span>
        <span>負成長極高 (&lt; ${breaks[0].toFixed(1)})</span>
      </div>
    `;
  } else {
    for (let i = breaks.length - 1; i >= 0; i--) {
      const low = i === 0 ? minVal : breaks[i - 1].toFixed(1);
      html += `
        <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
          <span style="width:14px;height:14px;background:${COLOR_RAMP_BLUE[i]};border:1px solid #ccc;"></span>
          <span>${low} - ${breaks[i].toFixed(1)}</span>
        </div>`;
    }
  }

  html += `
    <div style="display:flex;align-items:center;gap:6px;margin-top:5px;border-top:1px dashed #cbd5e1;padding-top:4px;">
      <span style="width:14px;height:14px;background:#cbd5e1;border:1px solid #ccc;"></span>
      <span style="color:#64748b;">無資料 (#N/A)</span>
    </div>`;
  legendDiv.innerHTML = html;
}

// 6. 散布圖更新與雙向聯動
function updateScatterPlot(tabId) {
  const st = window.tabStates[tabId];
  const cfg = THEME_CONFIG[tabId];
  const pane = document.getElementById(tabId);
  const plotElement = document.getElementById(cfg.scatterId);

  if (!st.xVar || !st.yVar || !plotElement) return;

  const traces = [];
  const xAll = [], yAll = [];

  st.selectedCounties.forEach(county => {
    const c_x = [], c_y = [], c_labels = [], c_ids = [];
    rawCsvData.forEach(row => {
      if (row['縣市名稱'] === county) {
        const x = parseFloat(row[st.xVar]);
        const y = parseFloat(row[st.yVar]);
        if (!isNaN(x) && !isNaN(y) && x !== -999 && y !== -999) {
          c_x.push(x); c_y.push(y); c_ids.push(row['村里代碼']);
          c_labels.push(`<b>${row['縣市名稱']}${row['鄉鎮市區名稱']}${row['村里名稱']}</b><br>${st.xVar}: ${x}<br>${st.yVar}: ${y}`);
          xAll.push(x); yAll.push(y);
        }
      }
    });

    if (c_x.length > 0) {
      traces.push({
        x: c_x, y: c_y, text: c_labels, customdata: c_ids, name: county,
        hoverinfo: 'text', mode: 'markers', type: 'scatter',
        marker: st.selectedCounties.length === 1 ? { color: '#2563eb', size: 6, opacity: 0.7 } : { size: 6, opacity: 0.7 }
      });
    }
  });

  const r = (xAll.length > 1 ? ss.sampleCorrelation(xAll, yAll) : 0).toFixed(3);

  const layout = {
    title: `${st.xVar} 與 ${st.yVar}<br><sub>皮爾森相關係數 r = ${r} (n = ${xAll.length})</sub>`,
    xaxis: { title: st.xVar }, yaxis: { title: st.yVar },
    margin: { t: 50, r: 20, b: 40, l: 50 },
    hovermode: 'closest',
    showlegend: st.selectedCounties.length > 1
  };

  Plotly.react(plotElement, traces, layout, { responsive: true, displayModeBar: false });

  plotElement.removeAllListeners('plotly_hover');
  plotElement.removeAllListeners('plotly_unhover');

  plotElement.on('plotly_hover', (data) => {
    const pt = data.points[0];
    const targetVid = pt.customdata;
    const map = st.map;

    if (map && map.getLayer('villages-highlight')) {
      map.setFilter('villages-highlight', [
        'all',
        ['in', ['get', 'COUNTY'], ['literal', st.selectedCounties]],
        ['==', ['get', 'V_ID'], targetVid]
      ]);

      const features = map.querySourceFeatures('villages', {
        sourceLayer: '111_village', filter: ['==', ['get', 'V_ID'], targetVid]
      });

      if (features.length > 0) {
        let lon = 0, lat = 0, pts = 0;
        const processRing = (ring) => ring.forEach(c => { lon += c[0]; lat += c[1]; pts++; });
        if (features[0].geometry.type === 'Polygon') {
          features[0].geometry.coordinates.forEach(processRing);
        } else if (features[0].geometry.type === 'MultiPolygon') {
          features[0].geometry.coordinates.forEach(poly => poly.forEach(processRing));
        }
        if (pts > 0) map.panTo([lon / pts, lat / pts], { duration: 400 });
      }
    }
  });

  plotElement.on('plotly_unhover', () => {
    const map = st.map;
    if (map && map.getLayer('villages-highlight')) {
      map.setFilter('villages-highlight', [
        'all',
        ['in', ['get', 'COUNTY'], ['literal', st.selectedCounties]],
        ['==', ['get', 'V_ID'], '']
      ]);
    }
  });
}

function highlightPlotlyPoint(tabId, vId) {
  const cfg = THEME_CONFIG[tabId];
  const plot = document.getElementById(cfg.scatterId);
  if (!plot || !plot.data) return;
  for (let i = 0; i < plot.data.length; i++) {
    const ids = plot.data[i].customdata;
    if (ids) {
      const idx = ids.indexOf(vId);
      if (idx !== -1) {
        Plotly.Fx.hover(plot, [{ curveNumber: i, pointNumber: idx }]);
        break;
      }
    }
  }
}

function resetTab(tabId) {
  const st = window.tabStates[tabId];
  const pane = document.getElementById(tabId);
  const cfg = THEME_CONFIG[tabId];

  if (st.map) {
    if (st.map.getLayer('villages-fill')) st.map.removeLayer('villages-fill');
    if (st.map.getLayer('villages-highlight')) st.map.removeLayer('villages-highlight');
  }
  const legend = pane.querySelector('.map-legend');
  if (legend) legend.style.display = 'none';

  pane.querySelector('.map-var-select').value = '';
  pane.querySelector('.scatter-x-select').value = '';
  st.xVar = '';
  st.yVar = '';
  st.isRendered = false;

  const plot = document.getElementById(cfg.scatterId);
  if (plot) Plotly.purge(plot);
  checkReadyState(tabId);
}

// 7. AI 對話助手
function setupAiChat() {
  document.querySelectorAll('.pane-chat').forEach(chatPane => {
    const btn = chatPane.querySelector('.btn-send-chat');
    const input = chatPane.querySelector('.chat-input');

    if (btn) btn.onclick = () => handleAiSubmit(chatPane);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          handleAiSubmit(chatPane);
        }
      });
    }
  });
}

async function handleAiSubmit(chatPane) {
  const input = chatPane.querySelector('.chat-input');
  const msgBox = chatPane.querySelector('.chat-messages');
  const message = input.value.trim();
  if (!message) return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-msg user-msg';
  userBubble.innerText = message;
  msgBox.appendChild(userBubble);
  input.value = '';

  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-msg ai-msg';
  aiBubble.innerText = '正在思考統計觀點...';
  msgBox.appendChild(aiBubble);
  msgBox.scrollTop = msgBox.scrollHeight;

  const st = window.tabStates[currentTabId];
  const context = {
    theme: THEME_CONFIG[currentTabId]?.name || '統計分析',
    counties: st.selectedCounties.length > 0 ? st.selectedCounties : ['全台灣'],
    xVar: st.xVar || '未選擇',
    yVar: st.yVar || '未選擇'
  };

  try {
    if (typeof window.sendToGemini === 'function') {
      const response = await window.sendToGemini(message, context);
      aiBubble.innerText = response;
    } else {
      aiBubble.innerText = 'Gemini 串接函式尚未就緒，請檢查 js/gemini_chat.js。';
    }
  } catch (err) {
    aiBubble.innerText = err.message || '連線稍微有點問題，請檢查網路連線或金鑰狀態。';
  }
  msgBox.scrollTop = msgBox.scrollHeight;
}

// 8. 總初始化入口與分頁導覽控制
window.addEventListener('DOMContentLoaded', () => {
  if (typeof setupSplitters === 'function') setupSplitters();
  if (typeof initConceptTab === 'function') initConceptTab();
  
  loadCsvDataset();
  setupAiChat();

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(m => m.classList.remove('show'));
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (THEME_CONFIG[targetId]) {
        currentTabId = targetId;

        // 當切換到該主題時，延遲 120ms 確保容器可見後掛載地圖或更新尺寸
        setTimeout(() => {
          initMapForTab(targetId);
          const st = window.tabStates[targetId];
          if (st.map) st.map.resize();

          const plotEl = document.getElementById(THEME_CONFIG[targetId].scatterId);
          if (plotEl && window.Plotly) Plotly.Plots.resize(plotEl);
        }, 120);
      } else if (targetId === 'tab-concept') {
        setTimeout(() => {
          const cPlot = document.getElementById('concept-plot');
          if (cPlot && window.Plotly) Plotly.Plots.resize(cPlot);
        }, 120);
      }
    });
  });
});