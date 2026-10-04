// js/splitter.js

function setupSplitters() {
  document.querySelectorAll('.tab-pane').forEach(pane => {
    // 1. 水平分隔桿 (左右拖曳)
    const resizerH = pane.querySelector('.resizer-horizontal');
    const mapPane = pane.querySelector('.pane-map');
    const rightPane = pane.querySelector('.pane-right');

    if (resizerH && mapPane && rightPane) {
      let isDraggingH = false;

      resizerH.onmousedown = (e) => {
        isDraggingH = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };

      document.addEventListener('mousemove', (e) => {
        if (!isDraggingH) return;
        const container = pane.querySelector('.workspace-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const totalW = rect.width;

        // 限制左右各至少 25%
        if (offsetX > totalW * 0.25 && offsetX < totalW * 0.75) {
          const leftPct = (offsetX / totalW) * 100;
          mapPane.style.width = `${leftPct}%`;
          rightPane.style.width = `${100 - leftPct}%`;

          // 即時重繪地圖與散布圖
          const currentTabId = pane.id;
          if (window.tabStates && window.tabStates[currentTabId]?.map) {
            window.tabStates[currentTabId].map.resize();
          }
          const plotEl = pane.querySelector('.plotly-scatter');
          if (plotEl && window.Plotly) {
            Plotly.Plots.resize(plotEl);
          }
        }
      });

      document.addEventListener('mouseup', () => {
        if (isDraggingH) {
          isDraggingH = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // 2. 垂直分隔桿 (上下拖曳)
    const resizerV = pane.querySelector('.resizer-vertical');
    const plotPane = pane.querySelector('.pane-plot');
    const chatPane = pane.querySelector('.pane-chat');

    if (resizerV && plotPane && chatPane) {
      let isDraggingV = false;

      resizerV.onmousedown = (e) => {
        isDraggingV = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
      };

      document.addEventListener('mousemove', (e) => {
        if (!isDraggingV) return;
        const rightContainer = pane.querySelector('.pane-right');
        if (!rightContainer) return;
        const rect = rightContainer.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const totalH = rect.height;

        // 限制上下各至少 20%
        if (offsetY > totalH * 0.2 && offsetY < totalH * 0.8) {
          const topPct = (offsetY / totalH) * 100;
          plotPane.style.height = `${topPct}%`;
          chatPane.style.height = `${100 - topPct}%`;
          plotPane.style.flex = 'none'; // 解除 flex-grow 鎖定
          chatPane.style.flex = 'none';

          const plotEl = pane.querySelector('.plotly-scatter');
          if (plotEl && window.Plotly) {
            Plotly.Plots.resize(plotEl);
          }
        }
      });

      document.addEventListener('mouseup', () => {
        if (isDraggingV) {
          isDraggingV = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  });
}