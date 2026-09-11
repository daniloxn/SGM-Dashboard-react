// src/lib/chartCanvas.js
// Generates clean, high-resolution PNG chart images via HTML5 Canvas
// for embedding into Excel workbooks via ExcelJS

/**
 * Creates an in-memory canvas with 2x scale for crisp retina rendering
 */
function createHiDPICanvas(width, height) {
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas, ctx };
}

/**
 * Renders a Line / Trend chart with subtle gradient fill
 */
export function renderEvolutionChartPng({ labels = [], values = [], title = 'Evolução Mensal de O.S.' }) {
  const width = 640;
  const height = 300;
  const { canvas, ctx } = createHiDPICanvas(width, height);

  // Background
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 12);
  ctx.fill();

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Segoe UI", Calibri, sans-serif';
  ctx.fillText(title, 24, 32);

  if (!labels.length || !values.length) {
    return canvas.toDataURL('image/png');
  }

  const padding = { top: 55, right: 30, bottom: 45, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...values, 5);
  const niceMax = Math.ceil(maxVal * 1.15);

  // Y Gridlines and labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Segoe UI", Calibri, sans-serif';
  ctx.textAlign = 'right';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const yVal = Math.round((niceMax / steps) * i);
    const yPos = padding.top + chartH - (yVal / niceMax) * chartH;

    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(padding.left + chartW, yPos);
    ctx.stroke();

    ctx.fillText(yVal.toString(), padding.left - 10, yPos + 4);
  }

  // Points calculation
  const pts = labels.map((lbl, idx) => {
    const x = padding.left + (idx / Math.max(labels.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (values[idx] / niceMax) * chartH;
    return { x, y, val: values[idx], lbl };
  });

  // Area fill under line
  if (pts.length > 1) {
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, padding.top + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fill();
  }

  // Line
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Dots and X Labels
  pts.forEach(p => {
    // Dot
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value on top of dot
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Segoe UI", Calibri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.val.toString(), p.x, p.y - 10);

    // X Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Segoe UI", Calibri, sans-serif';
    ctx.fillText(p.lbl, p.x, height - 16);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders Horizontal Bars (ideal for Top Famílias and Top Falhas)
 */
export function renderHorizontalBarChartPng({ items = [], title = 'Top Categorias', color = '#10b981' }) {
  const width = 640;
  const height = 320;
  const { canvas, ctx } = createHiDPICanvas(width, height);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Segoe UI", Calibri, sans-serif';
  ctx.fillText(title, 24, 32);

  const topItems = items.slice(0, 8);
  if (!topItems.length) return canvas.toDataURL('image/png');

  const maxVal = Math.max(...topItems.map(x => x.value), 1);
  const startY = 60;
  const barHeight = 20;
  const gap = 12;
  const labelWidth = 150;
  const maxBarWidth = width - labelWidth - 80;

  topItems.forEach((item, idx) => {
    const y = startY + idx * (barHeight + gap);
    const barW = Math.max(8, (item.value / maxVal) * maxBarWidth);

    // Label
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px "Segoe UI", Calibri, sans-serif';
    ctx.textAlign = 'right';
    let text = item.label || '';
    if (text.length > 22) text = text.slice(0, 21) + '…';
    ctx.fillText(text, labelWidth - 12, y + barHeight / 2 + 4);

    // Bar
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(labelWidth, y, barW, barHeight, 4);
    ctx.fill();

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Segoe UI", Calibri, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.value.toLocaleString('pt-BR'), labelWidth + barW + 8, y + barHeight / 2 + 4);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders Vertical Bar Chart (ideal for Mecânicos and Sondas)
 */
export function renderVerticalBarChartPng({ items = [], title = 'Desempenho da Equipe', color = '#6366f1' }) {
  const width = 640;
  const height = 300;
  const { canvas, ctx } = createHiDPICanvas(width, height);

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Segoe UI", Calibri, sans-serif';
  ctx.fillText(title, 24, 32);

  const topItems = items.slice(0, 9);
  if (!topItems.length) return canvas.toDataURL('image/png');

  const padding = { top: 60, right: 30, bottom: 50, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...topItems.map(x => x.value), 1);
  const niceMax = Math.ceil(maxVal * 1.15);

  // Y Grid
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Segoe UI", Calibri, sans-serif';
  ctx.textAlign = 'right';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round((niceMax / 4) * i);
    const yPos = padding.top + chartH - (yVal / niceMax) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(padding.left + chartW, yPos);
    ctx.stroke();
    ctx.fillText(yVal.toString(), padding.left - 8, yPos + 3);
  }

  // Bars
  const barCount = topItems.length;
  const colWidth = chartW / barCount;
  const barWidth = Math.min(36, colWidth * 0.65);

  topItems.forEach((item, i) => {
    const barH = (item.value / niceMax) * chartH;
    const x = padding.left + i * colWidth + (colWidth - barWidth) / 2;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Segoe UI", Calibri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.value.toString(), x + barWidth / 2, y - 6);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Segoe UI", Calibri, sans-serif';
    let lbl = item.label || '';
    if (lbl.length > 9) lbl = lbl.slice(0, 8) + '…';
    ctx.fillText(lbl, x + barWidth / 2, height - 18);
  });

  return canvas.toDataURL('image/png');
}

