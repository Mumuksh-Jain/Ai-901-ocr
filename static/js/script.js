// OCR Document Intelligence — Interactive Analytics & Visualization Engine
let currentData = null;
let confidenceChartInstance = null;
let linesChartInstance = null;

// Escaping for XSS prevention
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

// Elements
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const fileDetails = document.getElementById('fileDetails');
const fileName = document.getElementById('fileName');
const clearFileBtn = document.getElementById('clearFileBtn');
const preview = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadForm = document.getElementById('uploadForm');
const loading = document.getElementById('loading');
const errorBanner = document.getElementById('error');
const confidenceWarning = document.getElementById('confidenceWarning');
const resultsSection = document.getElementById('results');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const toggleBoxes = document.getElementById('toggleBoxes');
const boundingBoxOverlay = document.getElementById('boundingBoxOverlay');
const resultImage = document.getElementById('resultImage');
const hoverTooltip = document.getElementById('hoverTooltip');

// Drag & Drop
dropZone.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    imageInput.click();
});
selectFileBtn.addEventListener('click', () => imageInput.click());

['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
});

dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
});

clearFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

// Load Demo Sample Image
loadSampleBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
        const res = await fetch('/exemplos/documento_demo.png');
        if (!res.ok) throw new Error('Não foi possível carregar a imagem de exemplo.');
        const blob = await res.blob();
        const file = new File([blob], 'documento_demo.png', { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        imageInput.files = dt.files;
        handleFile(file);
    } catch (err) {
        showError('Erro ao carregar documento de demonstração: ' + err.message);
    }
});

function handleFile(file) {
    if (!file.type.match(/image\/(png|jpeg|jpg|bmp|tiff)/i)) {
        showError('Formato inválido. Por favor, envie uma imagem PNG, JPG, BMP ou TIFF.');
        return;
    }
    hideError();
    fileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileDetails.style.display = 'inline-flex';
    analyzeBtn.disabled = false;

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    imageInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    fileDetails.style.display = 'none';
    analyzeBtn.disabled = true;
    hideError();
}

function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
}

function hideError() {
    errorBanner.textContent = '';
    errorBanner.style.display = 'none';
}

// Form Submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = imageInput.files[0];
    if (!file) {
        showError('Selecione uma imagem para análise.');
        return;
    }

    hideError();
    confidenceWarning.style.display = 'none';
    loading.style.display = 'block';
    analyzeBtn.disabled = true;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await response.json();

        if (!data.success) {
            showError(data.error || 'Falha ao processar a imagem.');
        } else {
            currentData = data;
            renderResults(data);
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        showError('Erro de conexão com o servidor. Verifique se o backend está em execução.');
    } finally {
        loading.style.display = 'none';
        analyzeBtn.disabled = false;
    }
});

// Render Results & Metrics
function renderResults(data) {
    // 1. KPI Cards
    const avgConf = typeof data.confidence === 'number' ? data.confidence : 0;
    const pctConf = Math.round(avgConf * 100);
    const kpiConfElem = document.getElementById('kpiConfidence');
    kpiConfElem.textContent = `${pctConf}%`;
    kpiConfElem.style.color = avgConf >= 0.8 ? '#10b981' : (avgConf >= 0.6 ? '#f59e0b' : '#ef4444');

    const totalWords = data.words ? data.words.length : (data.content ? data.content.split(/\s+/).filter(Boolean).length : 0);
    const totalLines = data.lines ? data.lines.length : 0;
    const totalChars = data.content ? data.content.length : 0;

    document.getElementById('kpiWords').textContent = totalWords.toLocaleString();
    document.getElementById('kpiChars').textContent = `${totalChars.toLocaleString()} caracteres totais`;
    document.getElementById('kpiLines').textContent = totalLines.toLocaleString();

    const page = data.pages && data.pages[0] ? data.pages[0] : { width: 'N/A', height: 'N/A' };
    document.getElementById('kpiDimensions').textContent = `${page.width} × ${page.height}`;

    // 2. Low Confidence Warning
    if (avgConf < 0.6) {
        confidenceWarning.style.display = 'flex';
    } else {
        confidenceWarning.style.display = 'none';
    }

    // 3. Extracted Text Tab
    document.getElementById('contentArea').textContent = data.content || '(Nenhum texto detectado)';

    // 4. Lines Breakdown Tab
    document.getElementById('linesCountBadge').textContent = `${totalLines} linhas`;
    let linesHtml = '';
    if (data.lines && data.lines.length) {
        data.lines.forEach((line, idx) => {
            const conf = typeof line.confidence === 'number' ? Math.round(line.confidence * 100) : pctConf;
            const badgeColor = conf >= 80 ? '#ecfdf5' : '#fffbeb';
            const textColor = conf >= 80 ? '#047857' : '#b45309';
            linesHtml += `
                <div class="line-item-card" data-line-index="${idx}">
                    <div class="line-text-wrap">
                        <strong>${escapeHtml(line.content || '')}</strong>
                        <span class="line-coords">Coords: ${escapeHtml(JSON.stringify(line.bounding_box))}</span>
                    </div>
                    <span class="line-badge" style="background:${badgeColor}; color:${textColor};">${conf}%</span>
                </div>
            `;
        });
    } else {
        linesHtml = '<p style="color:var(--text-muted);">Nenhuma linha identificada.</p>';
    }
    document.getElementById('linesArea').innerHTML = linesHtml;

    // 5. Raw JSON Tab
    document.getElementById('rawJsonCode').textContent = JSON.stringify(data, null, 2);

    // 6. Setup Visual Inspector & Bounding Boxes
    const input = document.getElementById('imageInput');
    if (input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            resultImage.src = e.target.result;
            resultImage.onload = () => {
                drawBoundingBoxes(data);
            };
        };
        reader.readAsDataURL(input.files[0]);
    }

    // 7. Render Charts
    renderAnalyticsCharts(data);
}

// Analytics Charts (Chart.js)
function renderAnalyticsCharts(data) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing instances
    if (confidenceChartInstance) confidenceChartInstance.destroy();
    if (linesChartInstance) linesChartInstance.destroy();

    // Chart 1: Quality / Confidence Distribution
    const words = data.words || [];
    let high = 0, med = 0, low = 0;
    if (words.length) {
        words.forEach(w => {
            const c = w.confidence || 0;
            if (c >= 0.85) high++;
            else if (c >= 0.60) med++;
            else low++;
        });
    } else {
        high = 1;
    }

    const ctxConf = document.getElementById('confidenceChart').getContext('2d');
    confidenceChartInstance = new Chart(ctxConf, {
        type: 'doughnut',
        data: {
            labels: ['Alta (≥85%)', 'Média (60-84%)', 'Baixa (<60%)'],
            datasets: [{
                data: [high, med, low],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                hoverOffset: 6,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            return ` ${item.label}: ${item.raw} palavras`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });

    // Chart 2: Words per Line Breakdown
    const lines = data.lines || [];
    const lineLabels = lines.map((_, i) => `L${i + 1}`);
    const lineWordCounts = lines.map(l => (l.content || '').split(/\s+/).filter(Boolean).length);

    const ctxLines = document.getElementById('linesChart').getContext('2d');
    linesChartInstance = new Chart(ctxLines, {
        type: 'bar',
        data: {
            labels: lineLabels.length ? lineLabels : ['Linha 1'],
            datasets: [{
                label: 'Palavras por Linha',
                data: lineWordCounts.length ? lineWordCounts : [0],
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: 'Inter' } },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Inter' } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Visual Inspector: Draw SVG Bounding Boxes
function drawBoundingBoxes(data) {
    boundingBoxOverlay.innerHTML = '';
    const page = data.pages && data.pages[0];
    if (!page || !page.width || !page.height) return;

    const origW = page.width;
    const origH = page.height;

    boundingBoxOverlay.setAttribute('viewBox', `0 0 ${origW} ${origH}`);

    const lines = data.lines || [];
    lines.forEach((line, idx) => {
        if (!line.bounding_box || line.bounding_box.length < 4) return;
        const box = line.bounding_box;
        const x = Math.min(...box.map(p => p[0]));
        const y = Math.min(...box.map(p => p[1]));
        const w = Math.max(...box.map(p => p[0])) - x;
        const h = Math.max(...box.map(p => p[1])) - y;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('class', 'box-rect');
        rect.setAttribute('data-index', idx);

        rect.addEventListener('mouseenter', (e) => {
            rect.classList.add('active');
            showTooltip(e, line.content, line.confidence);
        });

        rect.addEventListener('mousemove', (e) => {
            positionTooltip(e);
        });

        rect.addEventListener('mouseleave', () => {
            rect.classList.remove('active');
            hideTooltip();
        });

        boundingBoxOverlay.appendChild(rect);
    });
}

toggleBoxes.addEventListener('change', (e) => {
    boundingBoxOverlay.style.display = e.target.checked ? 'block' : 'none';
});

function showTooltip(e, content, confidence) {
    const confPct = Math.round((confidence || 0) * 100);
    hoverTooltip.innerHTML = `<strong>${escapeHtml(content)}</strong><br><span style="opacity:0.8;">Confiança: ${confPct}%</span>`;
    hoverTooltip.style.display = 'block';
    positionTooltip(e);
}

function positionTooltip(e) {
    const containerRect = document.getElementById('visualContainer').getBoundingClientRect();
    const x = e.clientX - containerRect.left + 15;
    const y = e.clientY - containerRect.top + 15;
    hoverTooltip.style.left = `${x}px`;
    hoverTooltip.style.top = `${y}px`;
}

function hideTooltip() {
    hoverTooltip.style.display = 'none';
}

// Tabs
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');

        if (targetId === 'tab-analytics') {
            if (confidenceChartInstance) confidenceChartInstance.resize();
            if (linesChartInstance) linesChartInstance.resize();
        }
    });
});

// Copy & Download Actions
document.getElementById('copyTextBtn').addEventListener('click', () => {
    if (!currentData || !currentData.content) return;
    navigator.clipboard.writeText(currentData.content);
    alert('Texto copiado com sucesso!');
});

document.getElementById('downloadTextBtn').addEventListener('click', () => {
    if (!currentData || !currentData.content) return;
    const blob = new Blob([currentData.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'texto_extraido_ocr.txt';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('copyJsonBtn').addEventListener('click', () => {
    if (!currentData) return;
    navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
    alert('JSON copiado com sucesso!');
});

// Auto-run for demonstrations / visual verification
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('autoload') === 'true') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            try {
                const res = await fetch('/exemplos/documento_demo.png');
                if (res.ok) {
                    const blob = await res.blob();
                    const file = new File([blob], 'documento_demo.png', { type: 'image/png' });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    imageInput.files = dt.files;
                    handleFile(file);
                    uploadForm.dispatchEvent(new Event('submit'));
                }
            } catch(e) { console.error(e); }
        }, 200);
    });
}

// Support opening a specific tab on autoload for screenshots
if (urlParams.get('tab')) {
    setTimeout(() => {
        const targetBtn = document.querySelector(.tab-btn[data-tab=" + urlParams.get('tab') + "]);
        if (targetBtn) targetBtn.click();
    }, 3000);
}
