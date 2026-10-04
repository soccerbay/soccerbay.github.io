// js/tab1_concept.js

// Box-Muller 標準常態分佈亂數
function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// 根據目標相關係數 r 產生常態散布點
function generateCorrelationData(r, n = 200) {
  const x = [], y = [];
  const factor = Math.sqrt(Math.max(0, 1 - r * r));
  for (let i = 0; i < n; i++) {
    const xi = randNormal();
    const zi = randNormal();
    const yi = r * xi + factor * zi;
    x.push(xi);
    y.push(yi);
  }
  return { x, y };
}

// 取得相關強度文字與顏色標籤
function getCorrelationMeta(r) {
  const absR = Math.abs(r);
  let text = '';
  let color = '#059669'; // 正相關：綠色
  let bg = '#ecfdf5';

  if (absR < 0.05) {
    text = '無相關';
    color = '#94a3b8'; // 無相關：灰色
    bg = '#f1f5f9';
  } else if (r < 0) {
    text = absR >= 0.7 ? '高度負相關' : absR >= 0.3 ? '中度負相關' : '低度負相關';
    color = '#ef4444'; // 負相關：紅色
    bg = '#fef2f2';
  } else {
    text = absR >= 0.7 ? '高度正相關' : absR >= 0.3 ? '中度正相關' : '低度正相關';
  }

  return { text, color, bg };
}

// 繪製 Plotly 散布圖
function updateConceptPlot(r) {
  const { x, y } = generateCorrelationData(r, 250); // 增加點數讓視覺更密集
  const meta = getCorrelationMeta(r);

  const xLine = [-3.5, 3.5];
  const yLine = [-3.5 * r, 3.5 * r];

  const traceDots = {
    x: x, y: y,
    mode: 'markers',
    type: 'scatter',
    marker: { color: meta.color, size: 7, opacity: 0.6 },
    hoverinfo: 'none'
  };

  const traceLine = {
    x: xLine, y: yLine,
    mode: 'lines',
    line: { color: meta.color, dash: 'dash', width: 3 },
    hoverinfo: 'none'
  };

  const layout = {
    margin: { t: 30, r: 30, b: 30, l: 30 },
    xaxis: { range: [-4, 4], zeroline: true, zerolinecolor: '#94a3b8', showgrid: false },
    yaxis: { range: [-4, 4], zeroline: true, zerolinecolor: '#94a3b8', showgrid: false, scaleanchor: "x", scaleratio: 1 }, // scaleanchor 強制 X/Y 比例為 1:1
    showlegend: false,
    autosize: true
  };

  Plotly.react('concept-plot', [traceDots, traceLine], layout, { responsive: true, displayModeBar: false });
}

// 初始化單元一的互動綁定
function initConceptTab() {
  const slider = document.getElementById('r-slider');
  const valText = document.getElementById('r-val-text');
  const statusTag = document.getElementById('r-status');
  const presetBtns = document.querySelectorAll('.btn-preset');

  function applyR(rVal) {
    const r = parseFloat(rVal);
    valText.innerText = r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
    
    const meta = getCorrelationMeta(r);
    statusTag.innerText = meta.text;
    statusTag.style.color = meta.color;
    statusTag.style.backgroundColor = meta.bg;
    valText.style.color = meta.color;

    updateConceptPlot(r);
  }

  if (slider) {
    slider.addEventListener('input', (e) => applyR(e.target.value));
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetR = parseFloat(btn.getAttribute('data-r'));
      if (slider) slider.value = targetR;
      applyR(targetR);
    });
  });

  // 初次執行預設值 0.60
  applyR(slider ? slider.value : 0.6);
}