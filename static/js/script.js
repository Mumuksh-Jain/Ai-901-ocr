// OCR Document Intelligence — Pure Vanilla JS Studio & Analytics Engine
// English UI, Zero external module dependencies, Zero cloud rate limits

let currentData = null;
let confidenceChartInstance = null;
let linesChartInstance = null;

// Safe element getter
function el(id) {
    return document.getElementById(id);
}

// Escaping for XSS prevention
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function handleFile(file) {
    if (!file.type.match(/image\/(png|jpeg|jpg|bmp|tiff)/i)) {
        showError('Invalid format. Please upload a PNG, JPG, BMP, or TIFF image.');
        return;
    }
    hideError();

    const fileNameEl = el('fileName');
    if (fileNameEl) fileNameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    
    const fileDetailsEl = el('fileDetails');
    if (fileDetailsEl) fileDetailsEl.style.display = 'inline-flex';

    const analyzeBtnEl = el('analyzeBtn');
    if (analyzeBtnEl) analyzeBtnEl.disabled = false;

    const reader = new FileReader();
    reader.onload = (e) => {
        const previewEl = el('preview');
        if (previewEl) {
            previewEl.src = e.target.result;
            previewEl.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    const input = el('imageInput');
    if (input) input.value = '';
    const previewEl = el('preview');
    if (previewEl) {
        previewEl.src = '';
        previewEl.style.display = 'none';
    }
    const details = el('fileDetails');
    if (details) details.style.display = 'none';
    const btn = el('analyzeBtn');
    if (btn) btn.disabled = true;
    hideError();
}

function showError(msg) {
    const banner = el('error');
    if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
    }
}

function hideError() {
    const banner = el('error');
    if (banner) {
        banner.textContent = '';
        banner.style.display = 'none';
    }
}

function initEvents() {
    const dropZoneEl = el('dropZone');
    const imageInputEl = el('imageInput');
    const selectFileBtnEl = el('selectFileBtn');
    const loadSampleBtnEl = el('loadSampleBtn');
    const clearFileBtnEl = el('clearFileBtn');
    const uploadFormEl = el('uploadForm');
    const toggleBoxesEl = el('toggleBoxes');
    const loadingEl = el('loading');

    if (dropZoneEl && imageInputEl) {
        dropZoneEl.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            imageInputEl.click();
        });

        ['dragenter', 'dragover'].forEach(name => {
            dropZoneEl.addEventListener(name, (e) => {
                e.preventDefault();
                dropZoneEl.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZoneEl.addEventListener(name, (e) => {
                e.preventDefault();
                dropZoneEl.classList.remove('dragover');
            });
        });

        dropZoneEl.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
    }

    if (selectFileBtnEl && imageInputEl) {
        selectFileBtnEl.addEventListener('click', () => imageInputEl.click());
    }

    if (imageInputEl) {
        imageInputEl.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFile(e.target.files[0]);
        });
    }

    if (clearFileBtnEl) {
        clearFileBtnEl.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
        });
    }

    if (loadSampleBtnEl && imageInputEl) {
        loadSampleBtnEl.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const samplePath = window.location.pathname.endsWith('/') 
                    ? 'exemplos/documento_demo.png' 
                    : (window.location.pathname.includes('/Ai-901-ocr') ? 'exemplos/documento_demo.png' : '/exemplos/documento_demo.png');
                const res = await fetch(samplePath).catch(() => fetch('exemplos/documento_demo.png'));
                if (!res || !res.ok) throw new Error('Could not load the demo image.');
                const blob = await res.blob();
                const file = new File([blob], 'documento_demo.png', { type: 'image/png' });
                const dt = new DataTransfer();
                dt.items.add(file);
                imageInputEl.files = dt.files;
                handleFile(file);
            } catch (err) {
                showError('Error loading demo document: ' + err.message);
            }
        });
    }

    if (uploadFormEl && imageInputEl) {
        uploadFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = imageInputEl.files[0];
            if (!file) {
                showError('Please select an image for analysis.');
                return;
            }

            hideError();
            const warningEl = el('confidenceWarning');
            if (warningEl) warningEl.style.display = 'none';

            const analyzeBtnEl = el('analyzeBtn');
            if (analyzeBtnEl) analyzeBtnEl.disabled = true;

            if (loadingEl) loadingEl.style.display = 'block';

            const formData = new FormData();
            formData.append('image', file);

            try {
                let apiResult = null;
                try {
                    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
                    if (res.ok) {
                        apiResult = await res.json();
                    } else if (res.status !== 404) {
                        const errJson = await res.json().catch(() => ({}));
                        throw new Error(errJson.error || `HTTP ${res.status}`);
                    }
                } catch (netErr) {
                    // Endpoint unreachable or static host (e.g. GitHub Pages)
                }

                // If on static host (GitHub Pages) or demo file, provide client demo fallback
                if (!apiResult || !apiResult.success) {
                    if (file.name.toLowerCase().includes('demo') || window.location.hostname.includes('github.io')) {
                        apiResult = getClientSideDemoResult(file.name);
                    } else {
                        throw new Error('Server connection error. Please verify the backend is running locally.');
                    }
                }

                currentData = apiResult;
                renderResults(apiResult);
                const results = el('results');
                if (results) {
                    results.style.display = 'block';
                    results.scrollIntoView({ behavior: 'smooth' });
                }
            } catch (err) {
                showError(err.message || 'Server connection error.');
            } finally {
                if (loadingEl) loadingEl.style.display = 'none';
                if (analyzeBtnEl) analyzeBtnEl.disabled = false;
            }
        });
    }

    if (toggleBoxesEl) {
        toggleBoxesEl.addEventListener('change', (e) => {
            const overlay = el('boundingBoxOverlay');
            if (overlay) overlay.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = el(targetId);
            if (targetContent) targetContent.classList.add('active');

            if (targetId === 'tab-analytics') {
                if (confidenceChartInstance) confidenceChartInstance.resize();
                if (linesChartInstance) linesChartInstance.resize();
            }
        });
    });

    // Copy / Download Action Buttons
    const copyTextBtn = el('copyTextBtn');
    if (copyTextBtn) {
        copyTextBtn.addEventListener('click', () => {
            if (!currentData || !currentData.content) return;
            navigator.clipboard.writeText(currentData.content);
            alert('Text copied to clipboard!');
        });
    }

    const downloadTextBtn = el('downloadTextBtn');
    if (downloadTextBtn) {
        downloadTextBtn.addEventListener('click', () => {
            if (!currentData || !currentData.content) return;
            const blob = new Blob([currentData.content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'extracted_ocr_text.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const copyJsonBtn = el('copyJsonBtn');
    if (copyJsonBtn) {
        copyJsonBtn.addEventListener('click', () => {
            if (!currentData) return;
            navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
            alert('JSON copied to clipboard!');
        });
    }

    // Auto-run for demonstrations
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoload') === 'true' && imageInputEl && uploadFormEl) {
        setTimeout(async () => {
            try {
                const res = await fetch('exemplos/documento_demo.png').catch(() => fetch('/exemplos/documento_demo.png'));
                if (res.ok) {
                    const blob = await res.blob();
                    const file = new File([blob], 'documento_demo.png', { type: 'image/png' });
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    imageInputEl.files = dt.files;
                    handleFile(file);
                    uploadFormEl.dispatchEvent(new Event('submit'));
                }
            } catch(e) { console.error(e); }
        }, 500);
    }
}

/* ==========================================================================
   RESULTS DASHBOARD & CHARTS (ENGLISH)
   ========================================================================== */
function renderResults(data) {
    const avgConf = typeof data.confidence === 'number' ? data.confidence : 0;
    const pctConf = Math.round(avgConf * 100);

    const kpiConfElem = el('kpiConfidence');
    if (kpiConfElem) {
        kpiConfElem.textContent = `${pctConf}%`;
        kpiConfElem.style.color = avgConf >= 0.8 ? '#10b981' : (avgConf >= 0.6 ? '#f59e0b' : '#ef4444');
    }

    const totalWords = data.words ? data.words.length : (data.content ? data.content.split(/\s+/).filter(Boolean).length : 0);
    const totalLines = data.lines ? data.lines.length : 0;
    const totalChars = data.content ? data.content.length : 0;

    const kpiWordsEl = el('kpiWords');
    if (kpiWordsEl) kpiWordsEl.textContent = totalWords.toLocaleString();

    const kpiCharsEl = el('kpiChars');
    if (kpiCharsEl) kpiCharsEl.textContent = `${totalChars.toLocaleString()} total characters`;

    const kpiLinesEl = el('kpiLines');
    if (kpiLinesEl) kpiLinesEl.textContent = totalLines.toLocaleString();

    const page = data.pages && data.pages[0] ? data.pages[0] : { width: 'N/A', height: 'N/A' };
    const kpiDimEl = el('kpiDimensions');
    if (kpiDimEl) kpiDimEl.textContent = `${page.width} × ${page.height}`;

    const warningEl = el('confidenceWarning');
    if (warningEl) {
        warningEl.style.display = avgConf < 0.6 ? 'flex' : 'none';
    }

    const contentAreaEl = el('contentArea');
    if (contentAreaEl) {
        contentAreaEl.textContent = data.content || '(No text detected)';
    }

    const badgeEl = el('linesCountBadge');
    if (badgeEl) badgeEl.textContent = `${totalLines} lines`;

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
        linesHtml = '<p style="color:var(--text-muted);">No lines identified.</p>';
    }
    const linesAreaEl = el('linesArea');
    if (linesAreaEl) linesAreaEl.innerHTML = linesHtml;

    const rawJsonEl = el('rawJsonCode');
    if (rawJsonEl) rawJsonEl.textContent = JSON.stringify(data, null, 2);

    const input = el('imageInput');
    const resultImg = el('resultImage');
    if (input && input.files[0] && resultImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
            resultImg.src = e.target.result;
            resultImg.onload = () => {
                drawBoundingBoxes(data);
            };
        };
        reader.readAsDataURL(input.files[0]);
    }

    renderAnalyticsCharts(data);
}

function renderAnalyticsCharts(data) {
    if (typeof Chart === 'undefined') return;

    if (confidenceChartInstance) confidenceChartInstance.destroy();
    if (linesChartInstance) linesChartInstance.destroy();

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

    const confCanvas = el('confidenceChart');
    if (confCanvas) {
        const ctxConf = confCanvas.getContext('2d');
        confidenceChartInstance = new Chart(ctxConf, {
            type: 'doughnut',
            data: {
                labels: ['High (≥85%)', 'Medium (60-84%)', 'Low (<60%)'],
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
                                return ` ${item.label}: ${item.raw} words`;
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    }

    const linesCanvas = el('linesChart');
    if (linesCanvas) {
        const lines = data.lines || [];
        const lineLabels = lines.map((_, i) => `L${i + 1}`);
        const lineWordCounts = lines.map(l => (l.content || '').split(/\s+/).filter(Boolean).length);

        const ctxLines = linesCanvas.getContext('2d');
        linesChartInstance = new Chart(ctxLines, {
            type: 'bar',
            data: {
                labels: lineLabels.length ? lineLabels : ['Line 1'],
                datasets: [{
                    label: 'Words per Line',
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
}

function drawBoundingBoxes(data) {
    const overlay = el('boundingBoxOverlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    const page = data.pages && data.pages[0];
    if (!page || !page.width || !page.height) return;

    const origW = page.width;
    const origH = page.height;

    overlay.setAttribute('viewBox', `0 0 ${origW} ${origH}`);

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

        overlay.appendChild(rect);
    });
}

function showTooltip(e, content, confidence) {
    const tooltip = el('hoverTooltip');
    if (!tooltip) return;
    const confPct = Math.round((confidence || 0) * 100);
    tooltip.innerHTML = `<strong>${escapeHtml(content)}</strong><br><span style="opacity:0.8;">Confidence: ${confPct}%</span>`;
    tooltip.style.display = 'block';
    positionTooltip(e);
}

function positionTooltip(e) {
    const tooltip = el('hoverTooltip');
    const container = el('visualContainer');
    if (!tooltip || !container) return;
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left + 15;
    const y = e.clientY - containerRect.top + 15;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

function hideTooltip() {
    const tooltip = el('hoverTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function getClientSideDemoResult(filename) {
    const lines = [
        {
            content: "DOCUMENTO DEMONSTRATIVO AI-901",
            confidence: 0.95,
            bounding_box: [[36, 51], [587, 51], [587, 72], [36, 72]]
        },
        {
            content: "Teste de reconhecimento de texto",
            confidence: 0.95,
            bounding_box: [[33, 130], [424, 130], [424, 147], [33, 147]]
        },
        {
            content: "Exemplo sem processamento Azure",
            confidence: 0.95,
            bounding_box: [[35, 200], [444, 200], [444, 217], [35, 217]]
        }
    ];

    const words = [
        { content: "DOCUMENTO", confidence: 0.95, bounding_box: [[36, 51], [223, 51], [223, 72], [36, 72]] },
        { content: "DEMONSTRATIVO", confidence: 0.95, bounding_box: [[237, 51], [484, 51], [484, 72], [237, 72]] },
        { content: "AI-901", confidence: 0.95, bounding_box: [[495, 51], [587, 51], [587, 72], [495, 72]] },
        { content: "Teste", confidence: 0.95, bounding_box: [[33, 130], [91, 130], [91, 147], [33, 147]] },
        { content: "de", confidence: 0.95, bounding_box: [[101, 130], [127, 130], [127, 147], [101, 147]] },
        { content: "reconhecimento", confidence: 0.95, bounding_box: [[138, 130], [321, 130], [321, 147], [138, 147]] },
        { content: "de", confidence: 0.95, bounding_box: [[331, 130], [357, 130], [357, 147], [331, 147]] },
        { content: "texto", confidence: 0.95, bounding_box: [[367, 130], [424, 130], [424, 147], [367, 147]] },
        { content: "Exemplo", confidence: 0.95, bounding_box: [[35, 200], [131, 200], [131, 217], [35, 217]] },
        { content: "sem", confidence: 0.95, bounding_box: [[140, 204], [187, 204], [187, 217], [140, 217]] },
        { content: "processamento", confidence: 0.95, bounding_box: [[197, 204], [371, 204], [371, 217], [197, 217]] },
        { content: "Azure", confidence: 0.95, bounding_box: [[379, 200], [444, 200], [444, 217], [379, 217]] }
    ];

    return {
        success: true,
        confidence: 0.95,
        content: "DOCUMENTO DEMONSTRATIVO AI-901\nTeste de reconhecimento de texto\nExemplo sem processamento Azure",
        engine: "GitHub Pages Live Showcase (Client-Side)",
        lines: lines,
        words: words,
        pages: [
            {
                page_number: 1,
                width: 780,
                height: 320,
                unit: "pixel",
                lines: lines,
                words: words
            }
        ],
        styles: []
    };
}

// Initialise
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
} else {
    initEvents();
}
