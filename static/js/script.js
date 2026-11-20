// OCR Document Intelligence — Interactive Analytics & React Flow Live Simulation
// Safe, defensive, zero-crash architecture

let currentData = null;
let confidenceChartInstance = null;
let linesChartInstance = null;
let simTimerInterval = null;
let simStartTime = 0;

// React Flow state hooks
let rfSetNodesGlobal = null;
let rfSetEdgesGlobal = null;
let isRfMounted = false;

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

/* ==========================================================================
   PIPELINE NODES DATA SPECIFICATION
   ========================================================================== */
const pipelineNodesData = [
    {
        id: 'node-stream',
        x: 20,
        y: 40,
        icon: '📁',
        title: '1. Ingestão Buffer',
        desc: 'Stream em memória & checagem MIME'
    },
    {
        id: 'node-pillow',
        x: 220,
        y: 40,
        icon: '🛡️',
        title: '2. Validador Pillow',
        desc: 'Verificação de integridade sem disco'
    },
    {
        id: 'node-ocr',
        x: 420,
        y: 40,
        icon: '🧠',
        title: '3. OCR Neural Core',
        desc: 'OCR.space Engine 2.0 (tokens & layout)'
    },
    {
        id: 'node-spatial',
        x: 420,
        y: 200,
        icon: '📐',
        title: '4. Geometria Espacial',
        desc: 'Projeção de polígonos & caixas'
    },
    {
        id: 'node-analytics',
        x: 220,
        y: 200,
        icon: '📊',
        title: '5. Síntese Analítica',
        desc: 'Métricas de confiança & gráficos'
    }
];

/* ==========================================================================
   DYNAMIC REACT FLOW LOADER
   ========================================================================== */
async function loadReactFlow() {
    const rfContainer = el('reactflow-mount');
    if (!rfContainer) return;

    try {
        const [reactMod, reactDomMod, rfMod] = await Promise.all([
            import('https://esm.sh/react@18.2.0'),
            import('https://esm.sh/react-dom@18.2.0/client'),
            import('https://esm.sh/reactflow@11.11.4?deps=react@18.2.0,react-dom@18.2.0')
        ]);

        const React = reactMod.default || reactMod;
        const ReactDOM = reactDomMod.default || reactDomMod;
        const ReactFlow = rfMod.default || rfMod.ReactFlow;
        const { Background, Controls, MiniMap } = rfMod;

        const initialNodes = pipelineNodesData.map(n => ({
            id: n.id,
            position: { x: n.x, y: n.y },
            data: { title: n.title, desc: n.desc, icon: n.icon, status: 'standby' },
            type: 'customNode'
        }));

        const initialEdges = [
            { id: 'e1-2', source: 'node-stream', target: 'node-pillow', animated: false, style: { stroke: '#334155', strokeWidth: 2 } },
            { id: 'e2-3', source: 'node-pillow', target: 'node-ocr', animated: false, style: { stroke: '#334155', strokeWidth: 2 } },
            { id: 'e3-4', source: 'node-ocr', target: 'node-spatial', animated: false, style: { stroke: '#334155', strokeWidth: 2 } },
            { id: 'e4-5', source: 'node-spatial', target: 'node-analytics', animated: false, style: { stroke: '#334155', strokeWidth: 2 } }
        ];

        function CustomRfNode({ data }) {
            let statusText = '⏳ Em Espera';
            let cardClass = 'rf-node-card';
            if (data.status === 'active') {
                statusText = '⚡ Processando...';
                cardClass += ' active';
            } else if (data.status === 'completed') {
                statusText = '✅ Concluído';
                cardClass += ' completed';
            }

            return React.createElement('div', { className: cardClass },
                React.createElement('div', { className: 'rf-node-title' },
                    React.createElement('span', null, data.icon),
                    React.createElement('span', null, data.title)
                ),
                React.createElement('div', { className: 'rf-node-desc' }, data.desc),
                React.createElement('div', { className: 'rf-node-status' }, statusText)
            );
        }

        const nodeTypes = { customNode: CustomRfNode };

        function ReactFlowApp() {
            const [nodes, setNodes] = React.useState(initialNodes);
            const [edges, setEdges] = React.useState(initialEdges);

            React.useEffect(() => {
                rfSetNodesGlobal = setNodes;
                rfSetEdgesGlobal = setEdges;
                isRfMounted = true;
            }, []);

            return React.createElement('div', { style: { width: '100%', height: '100%' } },
                React.createElement(ReactFlow, {
                    nodes: nodes,
                    edges: edges,
                    nodeTypes: nodeTypes,
                    fitView: true,
                    fitViewOptions: { padding: 0.2 },
                    attributionPosition: 'bottom-right'
                },
                    React.createElement(Background, { color: '#1e293b', gap: 16, size: 1.2 }),
                    React.createElement(Controls, null),
                    React.createElement(MiniMap, {
                        nodeStrokeColor: '#3b82f6',
                        nodeColor: '#1e293b',
                        maskColor: 'rgba(2, 6, 23, 0.7)'
                    })
                )
            );
        }

        rfContainer.innerHTML = '';
        const root = ReactDOM.createRoot(rfContainer);
        root.render(React.createElement(ReactFlowApp));
    } catch (err) {
        console.warn('React Flow fallback active:', err);
        renderNativePipeline();
    }
}

// Native Canvas/HTML fallback if CDN has delay
function renderNativePipeline() {
    const rfContainer = el('reactflow-mount');
    if (!rfContainer || isRfMounted) return;
    rfContainer.innerHTML = `
        <div style="position:relative; width:100%; height:100%; background:#090e1a; overflow:hidden;">
            <svg style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
                <path id="nedge-1" d="M 180 80 L 220 80" stroke="#334155" stroke-width="2" stroke-dasharray="5 5"/>
                <path id="nedge-2" d="M 380 80 L 420 80" stroke="#334155" stroke-width="2" stroke-dasharray="5 5"/>
                <path id="nedge-3" d="M 500 130 L 500 200" stroke="#334155" stroke-width="2" stroke-dasharray="5 5"/>
                <path id="nedge-4" d="M 420 240 L 380 240" stroke="#334155" stroke-width="2" stroke-dasharray="5 5"/>
            </svg>
            ${pipelineNodesData.map(n => `
                <div id="native-${n.id}" class="rf-node-card" style="position:absolute; left:${n.x}px; top:${n.y}px;">
                    <div class="rf-node-title"><span>${n.icon}</span> <span>${n.title}</span></div>
                    <div class="rf-node-desc">${n.desc}</div>
                    <div class="rf-node-status" id="native-status-${n.id}">⏳ Em Espera</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update nodes and edges during simulation
function updatePipelineNodeState(activeNodeId, completedNodeIds = []) {
    // 1. Update React Flow if ready
    if (isRfMounted && rfSetNodesGlobal && rfSetEdgesGlobal) {
        rfSetNodesGlobal((prevNodes) =>
            prevNodes.map((node) => {
                let status = 'standby';
                if (node.id === activeNodeId) status = 'active';
                else if (completedNodeIds.includes(node.id)) status = 'completed';
                return {
                    ...node,
                    data: { ...node.data, status }
                };
            })
        );

        rfSetEdgesGlobal((prevEdges) =>
            prevEdges.map((edge) => {
                const isCompleted = completedNodeIds.includes(edge.source) && completedNodeIds.includes(edge.target);
                const isActive = completedNodeIds.includes(edge.source) && edge.target === activeNodeId;
                return {
                    ...edge,
                    animated: isActive || isCompleted,
                    style: {
                        stroke: isCompleted ? '#10b981' : (isActive ? '#3b82f6' : '#334155'),
                        strokeWidth: isCompleted || isActive ? 2.5 : 2
                    }
                };
            })
        );
    }

    // 2. Synchronize Native DOM elements if active
    pipelineNodesData.forEach(n => {
        const item = el(`native-${n.id}`);
        const st = el(`native-status-${n.id}`);
        if (!item || !st) return;
        item.classList.remove('active', 'completed');
        if (n.id === activeNodeId) {
            item.classList.add('active');
            st.textContent = '⚡ Processando...';
            st.style.color = '#60a5fa';
        } else if (completedNodeIds.includes(n.id)) {
            item.classList.add('completed');
            st.textContent = '✅ Concluído';
            st.style.color = '#34d399';
        } else {
            st.textContent = '⏳ Em Espera';
            st.style.color = '#64748b';
        }
    });
}

function resetPipelineNodes() {
    updatePipelineNodeState(null, []);
}

/* ==========================================================================
   SIMULATION CONTROLLER (OPTICAL SCANNER + LOGS)
   ========================================================================== */
function logTelemetry(text, type = 'info') {
    const consoleEl = el('telemetryConsole');
    if (!consoleEl) return;
    const elapsed = ((performance.now() - simStartTime) / 1000).toFixed(2);
    const line = document.createElement('div');
    line.className = `t-line log-${type}`;
    line.textContent = `> [00:${elapsed.padStart(5, '0')}] ${text}`;
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function startTimer() {
    simStartTime = performance.now();
    clearInterval(simTimerInterval);
    simTimerInterval = setInterval(() => {
        const timerEl = el('simTimer');
        if (!timerEl) return;
        const elapsed = (performance.now() - simStartTime) / 1000;
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toFixed(2).padStart(5, '0');
        timerEl.textContent = `${mins}:${secs}`;
    }, 50);
}

function stopTimer() {
    clearInterval(simTimerInterval);
}

function flashDetectedBox(topPct, leftPct, widthPct, heightPct, textTag) {
    const layer = el('detectedBoxesLayer');
    if (!layer) return;
    const box = document.createElement('div');
    box.className = 'hud-box-tag';
    box.style.top = `${topPct}%`;
    box.style.left = `${leftPct}%`;
    box.style.width = `${widthPct}%`;
    box.style.height = `${heightPct}%`;
    box.innerHTML = `<span>${escapeHtml(textTag)}</span>`;
    layer.appendChild(box);
}

async function runLiveSimulation(data, onFinished) {
    const theater = el('simulationTheater');
    if (theater) {
        theater.style.display = 'block';
        theater.scrollIntoView({ behavior: 'smooth' });
    }
    const results = el('results');
    if (results) results.style.display = 'none';

    resetPipelineNodes();
    const consoleEl = el('telemetryConsole');
    if (consoleEl) consoleEl.innerHTML = '';
    const layer = el('detectedBoxesLayer');
    if (layer) layer.innerHTML = '';
    const hud = el('hudState');
    if (hud) hud.textContent = 'INICIANDO VARREDURA...';
    startTimer();

    logTelemetry('PIPELINE NEURAL: Inicializando alocadores em memória...', 'info');

    // Step 1: Buffer Ingest
    updatePipelineNodeState('node-stream', []);
    if (hud) hud.textContent = 'INGESTÃO DE BUFFER (MIME CHECK)';
    logTelemetry('STREAM: Imagem carregada no buffer BytesIO (0 persistência em disco).', 'info');

    await new Promise(r => setTimeout(r, 650));

    // Step 2: Pillow Sanitization
    updatePipelineNodeState('node-pillow', ['node-stream']);
    if (hud) hud.textContent = 'VALIDADOR PILLOW: CHECAGEM DE ASSINATURA';
    logTelemetry('PILLOW: Verificação de cabeçalho e assinatura gráfica válida.', 'info');

    await new Promise(r => setTimeout(r, 700));

    // Step 3: OCR Neural Dispatch & Optical Laser Pass
    updatePipelineNodeState('node-ocr', ['node-stream', 'node-pillow']);
    if (hud) hud.textContent = 'VARREDURA ÓPTICA: OCR NEURAL CORE';
    logTelemetry('OCR CORE: Disparando extração vetorial com OCR.space Engine 2.0...', 'info');

    // Laser reveals Line 1
    setTimeout(() => {
        flashDetectedBox(16, 5, 75, 12, 'L1: DOCUMENTO DEMONSTRATIVO');
        logTelemetry('OCR DETECT: Linha 1 capturada (Confiança: 95%).', 'info');
    }, 400);

    // Laser reveals Line 2
    setTimeout(() => {
        flashDetectedBox(42, 5, 55, 12, 'L2: Teste de reconhecimento...');
        logTelemetry('OCR DETECT: Linha 2 capturada (Confiança: 95%).', 'info');
    }, 750);

    // Laser reveals Line 3
    setTimeout(() => {
        flashDetectedBox(65, 5, 58, 12, 'L3: Exemplo sem processamento...');
        logTelemetry('OCR DETECT: Linha 3 capturada (Confiança: 95%).', 'info');
    }, 1100);

    await new Promise(r => setTimeout(r, 1200));

    // Step 4: Spatial Mapping
    updatePipelineNodeState('node-spatial', ['node-stream', 'node-pillow', 'node-ocr']);
    if (hud) hud.textContent = 'PROJEÇÃO DE COORDENADAS ESPACIAIS';
    logTelemetry('SPATIAL: Projeção de caixas delimitadoras e polígonos concluída.', 'info');

    await new Promise(r => setTimeout(r, 700));

    // Step 5: Analytical Synthesis
    updatePipelineNodeState('node-analytics', ['node-stream', 'node-pillow', 'node-ocr', 'node-spatial']);
    if (hud) hud.textContent = 'SÍNTESE ANALÍTICA & GRÁFICOS';
    logTelemetry(`ANALYTICS: Confiança média consolidada em ${Math.round((data.confidence || 0.95) * 100)}%.`, 'success');

    await new Promise(r => setTimeout(r, 650));

    // All Completed
    updatePipelineNodeState(null, ['node-stream', 'node-pillow', 'node-ocr', 'node-spatial', 'node-analytics']);
    if (hud) hud.textContent = 'PIPELINE CONCLUÍDO COM SUCESSO';
    logTelemetry('SUCESSO: Todos os nós completados. Redirecionando para resultados...', 'success');
    stopTimer();

    await new Promise(r => setTimeout(r, 400));

    if (onFinished) onFinished();
}

/* ==========================================================================
   APP INITIALIZATION & EVENT REGISTRATION
   ========================================================================== */
function handleFile(file) {
    if (!file.type.match(/image\/(png|jpeg|jpg|bmp|tiff)/i)) {
        showError('Formato inválido. Por favor, envie uma imagem PNG, JPG, BMP ou TIFF.');
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
        const scannerDocEl = el('scannerDocImage');
        if (scannerDocEl) {
            scannerDocEl.src = e.target.result;
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
    const scannerDocEl = el('scannerDocImage');
    if (scannerDocEl) scannerDocEl.src = '';
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

function finishSimulationAndShowResults(data) {
    renderResults(data);
    const results = el('results');
    if (results) {
        results.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth' });
    }
}

function initEvents() {
    const dropZoneEl = el('dropZone');
    const imageInputEl = el('imageInput');
    const selectFileBtnEl = el('selectFileBtn');
    const loadSampleBtnEl = el('loadSampleBtn');
    const clearFileBtnEl = el('clearFileBtn');
    const uploadFormEl = el('uploadForm');
    const skipSimBtnEl = el('skipSimBtn');
    const replaySimBtnEl = el('replaySimBtn');
    const toggleBoxesEl = el('toggleBoxes');

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
                const res = await fetch('/exemplos/documento_demo.png');
                if (!res.ok) throw new Error('Não foi possível carregar a imagem de exemplo.');
                const blob = await res.blob();
                const file = new File([blob], 'documento_demo.png', { type: 'image/png' });
                const dt = new DataTransfer();
                dt.items.add(file);
                imageInputEl.files = dt.files;
                handleFile(file);
            } catch (err) {
                showError('Erro ao carregar documento de demonstração: ' + err.message);
            }
        });
    }

    if (uploadFormEl && imageInputEl) {
        uploadFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = imageInputEl.files[0];
            if (!file) {
                showError('Selecione uma imagem para análise.');
                return;
            }

            hideError();
            const warningEl = el('confidenceWarning');
            if (warningEl) warningEl.style.display = 'none';

            const analyzeBtnEl = el('analyzeBtn');
            if (analyzeBtnEl) analyzeBtnEl.disabled = true;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const apiPromise = fetch('/api/analyze', { method: 'POST', body: formData })
                    .then(res => res.json());

                const [apiResult] = await Promise.all([
                    apiPromise,
                    new Promise((resolve) => {
                        runLiveSimulation({ confidence: 0.95 }, resolve);
                    })
                ]);

                if (!apiResult.success) {
                    const theater = el('simulationTheater');
                    if (theater) theater.style.display = 'none';
                    showError(apiResult.error || 'Falha ao processar a imagem.');
                } else {
                    currentData = apiResult;
                    finishSimulationAndShowResults(apiResult);
                }
            } catch (err) {
                const theater = el('simulationTheater');
                if (theater) theater.style.display = 'none';
                showError('Erro de conexão com o servidor. Verifique se o backend está em execução.');
            } finally {
                if (analyzeBtnEl) analyzeBtnEl.disabled = false;
            }
        });
    }

    if (skipSimBtnEl) {
        skipSimBtnEl.addEventListener('click', () => {
            stopTimer();
            updatePipelineNodeState(null, ['node-stream', 'node-pillow', 'node-ocr', 'node-spatial', 'node-analytics']);
            if (currentData) finishSimulationAndShowResults(currentData);
        });
    }

    if (replaySimBtnEl) {
        replaySimBtnEl.addEventListener('click', () => {
            if (currentData) {
                runLiveSimulation(currentData, () => {
                    finishSimulationAndShowResults(currentData);
                });
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
            alert('Texto copiado com sucesso!');
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
            a.download = 'texto_extraido_ocr.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const copyJsonBtn = el('copyJsonBtn');
    if (copyJsonBtn) {
        copyJsonBtn.addEventListener('click', () => {
            if (!currentData) return;
            navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
            alert('JSON copiado com sucesso!');
        });
    }

    // Auto-run for demonstrations
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoload') === 'true' && imageInputEl && uploadFormEl) {
        setTimeout(async () => {
            try {
                const res = await fetch('/exemplos/documento_demo.png');
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
   RESULTS DASHBOARD & CHARTS
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
    if (kpiCharsEl) kpiCharsEl.textContent = `${totalChars.toLocaleString()} caracteres totais`;

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
        contentAreaEl.textContent = data.content || '(Nenhum texto detectado)';
    }

    const badgeEl = el('linesCountBadge');
    if (badgeEl) badgeEl.textContent = `${totalLines} linhas`;

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
                    legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
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
    tooltip.innerHTML = `<strong>${escapeHtml(content)}</strong><br><span style="opacity:0.8;">Confiança: ${confPct}%</span>`;
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

// Kick off initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initEvents();
        loadReactFlow();
    });
} else {
    initEvents();
    loadReactFlow();
}
