// ================================================
// MIE存档·创作工具
// app.js 完整版
// ================================================

// ===== IndexedDB 初始化 =====
const DB_NAME = 'mie_db';
const DB_VERSION = 1;
const STORE_LIBRARY = 'library';
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
                db.createObjectStore(STORE_LIBRARY, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = e => {
            db = e.target.result;
            resolve(db);
        };
        req.onerror = () => reject(req.error);
    });
}

// 读取全部存档
function dbGetAll() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LIBRARY, 'readonly');
        const req = tx.objectStore(STORE_LIBRARY).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

// 新增一条
function dbAdd(item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LIBRARY, 'readwrite');
        const req = tx.objectStore(STORE_LIBRARY).add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// 更新一条
function dbPut(item) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LIBRARY, 'readwrite');
        const req = tx.objectStore(STORE_LIBRARY).put(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// 删除一条
function dbDelete(id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LIBRARY, 'readwrite');
        const req = tx.objectStore(STORE_LIBRARY).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// 清空全部
function dbClear() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_LIBRARY, 'readwrite');
        const req = tx.objectStore(STORE_LIBRARY).clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// ===== localStorage（只存小数据：API预设）=====
const STORAGE_KEY_PRESETS = 'mie_api_presets';

function loadPresets() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PRESETS) || '[]');
}

function savePresets(presets) {
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
}

// ===== Tab导航切换 =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + target).classList.add('active');
    });
});

// 文字生成子标签切换
document.querySelectorAll('.create-tab-btn[data-create]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.create;
        document.querySelectorAll('.create-tab-btn[data-create]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.create-panel').forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
        });
        const panel = document.getElementById('create-' + target);
        panel.classList.add('active');
        panel.classList.remove('hidden');
    });
});

// 美化生成子标签切换
document.querySelectorAll('.create-tab-btn[data-beautify]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.beautify;
        document.querySelectorAll('.create-tab-btn[data-beautify]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.beautify-panel').forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
        });
        const panel = document.getElementById('beautify-' + target);
        panel.classList.add('active');
        panel.classList.remove('hidden');
    });
});


// ===== 工具函数 =====

// 距今时间
function timeAgo(dateStr) {
    if (!dateStr) return '未导入';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    let relStr = '';
    if (days === 0) relStr = '今天';
    else if (days === 1) relStr = '昨天';
    else if (days < 30) relStr = `${days}天前`;
    else {
        const months = Math.floor(days / 30);
        relStr = months < 12 ? `${months}个月前` : `${Math.floor(months / 12)}年前`;
    }
    return `${relStr} ${timeStr}`;
}

// 压缩图片
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX = 200;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
            else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 通用提示
function showHint(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'input-hint' + (type ? ' ' + type : '');
}


// ===== 多格式文件读取 =====

// 从文本中提取第一个完整JSON
function extractFirstJson(text) {
    let start = -1, isArray = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{' || text[i] === '[') {
            start = i;
            isArray = text[i] === '[';
            break;
        }
    }
    if (start === -1) return null;
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    let depth = 0, inString = false, escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === openChar) depth++;
        if (ch === closeChar) {
            depth--;
            if (depth === 0) {
                const candidate = text.slice(start, i + 1);
                JSON.parse(candidate);
                return candidate;
            }
        }
    }
    return null;
}

async function readFileAsJson(file) {
    const name = file.name.toLowerCase();

    // .json
    if (name.endsWith('.json')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    let text = e.target.result;
                    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                    text = text.trim();
                    try { JSON.parse(text); resolve(text); return; } catch (e1) {}
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    if (lines.length > 1) {
                        try {
                            const arr = lines.map(l => JSON.parse(l));
                            resolve(JSON.stringify(arr)); return;
                        } catch (e2) {}
                    }
                    try {
                        const firstObj = extractFirstJson(text);
                        if (firstObj) { resolve(firstObj); return; }
                    } catch (e3) {}
                    reject(new Error('无法识别的JSON格式'));
                } catch (err) {
                    reject(new Error(`读取失败：${err.message}`));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    // .json.gz
    if (name.endsWith('.json.gz') || name.endsWith('.gz')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async e => {
                try {
                    const ds = new DecompressionStream('gzip');
                    const blob = new Blob([e.target.result]);
                    const stream = blob.stream().pipeThrough(ds);
                    const decompressed = await new Response(stream).text();
                    JSON.parse(decompressed);
                    resolve(decompressed);
                } catch {
                    reject(new Error('gz解压失败或内容不是JSON'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    // .zip
    if (name.endsWith('.zip')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async e => {
                try {
                    const zip = await JSZip.loadAsync(e.target.result);
                    const jsonFiles = [];
                    zip.forEach((path, f) => {
                        if (path.toLowerCase().endsWith('.json') && !f.dir) {
                            jsonFiles.push({ path, file: f });
                        }
                    });
                    if (jsonFiles.length === 0) { reject(new Error('zip里没有找到JSON文件')); return; }
                    if (jsonFiles.length === 1) {
                        const content = await jsonFiles[0].file.async('text');
                        JSON.parse(content);
                        resolve(content); return;
                    }
                    const chosen = await showZipFilePicker(jsonFiles.map(f => f.path));
                    if (!chosen) { reject(new Error('已取消选择')); return; }
                    const picked = jsonFiles.find(f => f.path === chosen);
                    const content = await picked.file.async('text');
                    JSON.parse(content);
                    resolve(content);
                } catch (err) {
                    reject(new Error(err.message || 'zip读取失败'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    throw new Error('不支持的文件格式，支持 .json / .json.gz / .zip');
}

// zip多文件选择弹窗
function showZipFilePicker(paths) {
    return new Promise(resolve => {
        const mask = document.createElement('div');
        mask.className = 'lib-modal-mask open';
        mask.style.zIndex = '999';
        const modal = document.createElement('div');
        modal.className = 'lib-modal';
        modal.innerHTML = `
            <div class="lib-modal-header">
                <span class="lib-modal-name">选择要使用的JSON文件</span>
            </div>
            <div class="zip-file-list">
                ${paths.map(p => `
                    <div class="zip-file-item" data-path="${p}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>${p}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-outline btn-full" id="zipPickerCancel" style="margin-top:14px;">取消</button>
        `;
        mask.appendChild(modal);
        document.body.appendChild(mask);
        modal.querySelectorAll('.zip-file-item').forEach(item => {
            item.addEventListener('click', () => {
                document.body.removeChild(mask);
                resolve(item.dataset.path);
            });
        });
        modal.querySelector('#zipPickerCancel').addEventListener('click', () => {
            document.body.removeChild(mask);
            resolve(null);
        });
    });
}

// ===== 设置页逻辑 =====

function renderPresetSelect() {
    const presets = loadPresets();
    const select = document.getElementById('presetSelect');
    select.innerHTML = '<option value="">— 选择预设 —</option>';
    presets.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

document.getElementById('presetSelect').addEventListener('change', function () {
    const presets = loadPresets();
    const idx = this.value;
    if (idx === '') return;
    const p = presets[idx];
    document.getElementById('apiUrl').value = p.url || '';
    document.getElementById('apiKey').value = p.key || '';
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = '';
    if (p.model) {
        const opt = document.createElement('option');
        opt.value = p.model;
        opt.textContent = p.model;
        modelSelect.appendChild(opt);
    }
    showHint('modelFetchHint', '已载入预设，可重新拉取模型', '');
});

document.getElementById('savePresetBtn').addEventListener('click', () => {
    const name = document.getElementById('presetName').value.trim();
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    if (!name) { showHint('modelFetchHint', '请给预设取个名字～', 'error'); return; }
    if (!url || !key) { showHint('modelFetchHint', 'URL 和 Key 不能为空～', 'error'); return; }
    const presets = loadPresets();
    const existing = presets.findIndex(p => p.name === name);
    const preset = { name, url, key, model };
    if (existing >= 0) presets[existing] = preset;
    else presets.push(preset);
    savePresets(presets);
    renderPresetSelect();
    document.getElementById('presetName').value = '';
    showHint('modelFetchHint', '预设已保存！', 'success');
});

document.getElementById('deletePresetBtn').addEventListener('click', () => {
    const idx = document.getElementById('presetSelect').value;
    if (idx === '') { showHint('modelFetchHint', '请先选择一个预设～', 'error'); return; }
    const presets = loadPresets();
    presets.splice(idx, 1);
    savePresets(presets);
    renderPresetSelect();
    document.getElementById('apiUrl').value = '';
    document.getElementById('apiKey').value = '';
    document.getElementById('modelSelect').innerHTML = '<option value="">— 请先拉取模型 —</option>';
    showHint('modelFetchHint', '预设已删除', 'success');
});

document.getElementById('toggleApiKey').addEventListener('click', () => {
    const input = document.getElementById('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
});

document.getElementById('fetchModelsBtn').addEventListener('click', async () => {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    if (!url || !key) { showHint('modelFetchHint', '请先填写 URL 和 Key～', 'error'); return; }
    showHint('modelFetchHint', '正在拉取模型列表...', '');
    try {
        const res = await fetch(`${url.replace(/\/$/, '')}/models`, {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`请求失败 ${res.status}`);
        const data = await res.json();
        const models = data.data || data.models || [];
        if (models.length === 0) { showHint('modelFetchHint', '未找到可用模型', 'error'); return; }
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            const id = typeof m === 'string' ? m : (m.id || m.name || m);
            opt.value = id;
            opt.textContent = id;
            modelSelect.appendChild(opt);
        });
        showHint('modelFetchHint', `已加载 ${models.length} 个模型`, 'success');
    } catch (err) {
        showHint('modelFetchHint', `拉取失败：${err.message}`, 'error');
    }
});

// ===== 系统数据导出（含IndexedDB）=====
document.getElementById('systemExportBtn').addEventListener('click', async () => {
    try {
        const library = await dbGetAll();
        const presets = loadPresets();
        const allData = { presets, library };
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = `MIE_backup_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert(`导出失败：${err.message}`);
    }
});

// ===== 系统数据导入 =====
document.getElementById('systemImportBtn').addEventListener('click', () => {
    document.getElementById('systemImportFile').click();
});

document.getElementById('systemImportFile').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = JSON.parse(e.target.result);
            // 恢复预设
            if (data.presets) {
                savePresets(data.presets);
                renderPresetSelect();
            }
            // 恢复存档库
            if (data.library && Array.isArray(data.library)) {
                await dbClear();
                for (const item of data.library) {
                    const newItem = { ...item };
                    delete newItem.id;
                    await dbAdd(newItem);
                }
                await renderLibrary();
            }
            showHint('modelFetchHint', '系统数据已恢复！', 'success');
        } catch {
            showHint('modelFetchHint', '导入失败，文件格式有误', 'error');
        }
    };
    reader.readAsText(file);
    this.value = '';
});

// ===== 存档库逻辑 =====

let currentLibItem = null;

// ===== 使用说明弹窗 =====
function openHelpModal() {
    const existing = document.getElementById('helpModalMask');
    if (existing) { existing.classList.add('open'); return; }

    const mask = document.createElement('div');
    mask.className = 'lib-modal-mask open';
    mask.id = 'helpModalMask';

    mask.innerHTML = `
        <div class="lib-modal help-modal" id="helpModal">
            <div class="lib-modal-header">
                <span class="lib-modal-name">📖 MIE 使用说明</span>
                <button class="lib-modal-close" id="helpModalClose">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="help-content">

                <div class="help-section">
                    <div class="help-section-title">🗂️ 前置说明</div>
                    <div class="help-section-body">
                        <ul>
                            <li><b>作者：</b>绵</li>
                            <li><b>工具名：</b>MIE存档·创作工具</li>
                            <li>使用本工具创作的内容请注明辅助工具</li>
                            <li>之前出过一个API和小手机的其他工具可以配套使用：<br/>
                                <a href="https://killu77.github.io/Miemian/" target="_blank" style="color:var(--blue-accent);word-break:break-all;">https://killu77.github.io/Miemian/</a>
                            </li>
                            <li>特别鸣谢耶耶老师帮忙部署链接和APP 🎉</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">🗂️ 设置页</div>
                    <div class="help-section-body">
                        <p>使用MIE前，请先在<b>设置页</b>配置API：</p>
                        <ul>
                            <li>填写 <b>API URL</b> 和 <b>API Key</b>，拉取模型列表后选择模型</li>
                            <li>填写预设名称，点<b>保存预设</b>，下次可直接选择</li>
                            <li>支持<b>整体导出/导入</b>：可备份或恢复所有存档和设置</li>
                            <li>推荐使用 <b>Gemini Pro</b>，效果好，不容易截断</li>
                            <li><b>Gemini Flash</b> 速度快，可用来实验效果</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">📱 存档库</div>
                    <div class="help-section-body">
                        <p>用于管理你的小手机存档：</p>
                        <ul>
                            <li>点击虚线框<b>＋新建</b>，创建一个小手机条目</li>
                            <li>可以上传小手机<b>图标</b>、填写<b>名字</b>和<b>链接</b></li>
                            <li>点击卡片进入详情，可以：</li>
                            <li class="sub">→ <b>导入JSON</b>：把小手机导出的数据文件存进来</li>
                            <li class="sub">→ <b>导出JSON</b>：把存档的数据文件导出</li>
                            <li class="sub">→ <b>编辑信息</b>：修改名字/图标/链接</li>
                            <li class="sub">→ <b>链接处分享按钮</b>：打开小手机网址</li>
                            <li class="sub">→ <b>删除</b>：删除该条目</li>
                            <li>支持 <b>.json / .json.gz / .zip</b> 格式导入</li>
                            <li>显示存档日期，快速查验未及时存档的小手机</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">✍️ 文字生成 · 人设卡</div>
                    <div class="help-section-body">
                        <p>帮你生成AI角色的完整人设卡：</p>
                        <ul>
                            <li>填写角色关键词（<b>所有字段均可留空</b>，留空的AI自由发挥）</li>
                            <li>勾选<b>与User产生关联</b>，可同步生成User人设</li>
                            <li>生成后可在下方<b>按要求修改</b>，或<b>重新生成</b></li>
                            <li>⚠️ 人设卡已明令禁止写User的个人喜好/过敏/厌恶等</li>
                            <li>内容较长时，复制按钮旁会出现 <b>📋 分块复制</b> 按钮</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">✍️ 文字生成 · 世界书</div>
                    <div class="help-section-body">
                        <p>帮你生成小手机世界书条目：</p>
                        <ul>
                            <li>填写<b>核心规则/想要的效果</b>（必填）</li>
                            <li>可选填：标题、具体禁止要求、适用场景</li>
                            <li>AI会生成结构清晰、格式规范的世界书</li>
                            <li>适合用来约束AI的行为、说话风格、禁止内容等</li>
                            <li>生成后可迭代修改，直到满意为止</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">✍️ 文字生成 · 同人梗</div>
                    <div class="help-section-body">
                        <p>帮你生成角色同人故事的世界设定和梗概：</p>
                        <ul>
                            <li>填写<b>同人梗关键词</b>（必填）</li>
                            <li>可选填：Char设定简述、基调风格、其他备注</li>
                            <li>AI会生成世界观背景、核心关系、故事主线、关键情节等</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">✍️ 文字生成 · 小剧场</div>
                    <div class="help-section-body">
                        <p>帮你生成可直接发给小手机的小剧场指令：</p>
                        <ul>
                            <li>填写<b>小剧场关键词</b>（必填）</li>
                            <li>可选填：Char设定、基调风格、字数要求、其他要求</li>
                            <li>生成的指令以 <b>（$$</b> 开头，可直接粘贴到小手机发送</li>
                            <li>小手机收到指令后，char会暂停当前剧情，生成对应番外</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">🎨 美化生成 · 气泡美化</div>
                    <div class="help-section-body">
                        <p>帮你生成聊天气泡美化CSS代码：</p>
                        <ul>
                            <li>可上传 <b>.css / .txt</b> 模板文件，或直接粘贴CSS代码</li>
                            <li>填写<b>效果描述</b>，例如：淡粉色背景、圆润气泡、带阴影</li>
                            <li>可以自己加图床元素、效果轻重、颜色色卡、字体URL说明</li>
                            <li>AI生成两份CSS：</li>
                            <li class="sub">✅ <b>结果区</b>：真实CSS，复制粘贴到小手机使用</li>
                            <li class="sub">👁 <b>预览区</b>：预览专用CSS，实时展示效果</li>
                            <li>预览区可设置头像、名字、示例消息，更真实还原效果</li>
                            <li>不满意可以<b>按要求修改</b>或<b>重新生成</b></li>
                            <li style="color:#ff9800">⚠️ 这个板块尚不成熟，可随便试试，欢迎反馈</li>
                            <li style="color:#ff9800">⚠️ 不同小手机CSS选择器不同，建议上传对应平台CSS模板</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">🎨 美化生成 · HTML创作</div>
                    <div class="help-section-body">
                        <p>帮你生成可在小手机里展示的HTML卡片：</p>
                        <ul>
                            <li>填写<b>想创作的内容</b>，例如：角色信息卡、状态栏、签到卡</li>
                            <li>可粘贴参考HTML或描述样式要求，可确保大小格式渲染符合小手机</li>
                            <li>预览区会<b>自动适应内容高度</b></li>
                            <li>生成后可迭代修改，讲述修改要求即可</li>
                            <li style="color:#ff9800">⚠️ 并非所有小手机都支持HTML展示，请确认你的小手机支持</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-title">📋 分块复制说明</div>
                    <div class="help-section-body">
                        <ul>
                            <li>当生成内容超过 <b>6000字</b> 时，可<b>一键复制全部</b>或<b>分块复制</b></li>
                            <li>分块复制适合输入法有字数限制的情况</li>
                        </ul>
                    </div>
                </div>

                <div class="help-divider"></div>

                <div class="help-section">
                    <div class="help-section-body" style="color:var(--text-light);font-size:12px;text-align:center;">
                        内容尚不完善，以后有机会慢慢更新 🌸
                    </div>
                </div>

            </div>
        </div>
    `;


    document.body.appendChild(mask);

    mask.querySelector('#helpModalClose').addEventListener('click', () => {
        mask.classList.remove('open');
    });
    mask.addEventListener('click', (e) => {
        if (e.target === mask) mask.classList.remove('open');
    });
}


// 渲染网格
async function renderLibrary(filter) {
    const grid = document.getElementById('libraryGrid');
    const list = await dbGetAll();
    const keyword = (filter || '').trim().toLowerCase();
    const filtered = keyword
        ? list.filter(item => item.name.toLowerCase().includes(keyword))
        : list;

    grid.innerHTML = '';

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'lib-card';
        card.dataset.id = item.id;

        let iconHtml = item.icon
            ? `<img class="lib-card-icon" src="${item.icon}" alt="${item.name}"/>`
            : `<div class="lib-card-icon-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="3"/>
                    <line x1="9" y1="7" x2="15" y2="7"/>
                    <line x1="9" y1="11" x2="15" y2="11"/>
                    <line x1="9" y1="15" x2="12" y2="15"/>
                </svg>
               </div>`;

        card.innerHTML = `
            ${iconHtml}
            <div class="lib-card-name">${item.name}</div>
            <div class="lib-card-date">${timeAgo(item.lastImport)}</div>
        `;
        card.addEventListener('click', () => openLibDetail(item));
        grid.appendChild(card);
    });

    // 使用说明卡片（始终第一个）
    if (!keyword) {
        const helpCard = document.createElement('div');
        helpCard.className = 'lib-card lib-help-card';
        helpCard.innerHTML = `
            <img class="lib-card-icon" src="https://i.postimg.cc/rytY6WZ1/1773557119024.jpg" alt="使用说明"/>
            <div class="lib-card-name">使用说明</div>
            <div class="lib-card-date">2026/03/15</div>
        `;

        helpCard.addEventListener('click', openHelpModal);
        grid.insertBefore(helpCard, grid.firstChild);
    }


    // 新建按钮
    if (!keyword) {
        const addCard = document.createElement('div');
        addCard.className = 'lib-add-card';
        addCard.innerHTML = `
            <div class="lib-add-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </div>
            <div class="lib-add-label">新建</div>
        `;
        addCard.addEventListener('click', openNewModal);
        grid.appendChild(addCard);
    }
}

// 详情弹窗
function openLibDetail(item) {
    currentLibItem = item;
    const iconEl = document.getElementById('libModalIcon');
    if (item.icon) {
        iconEl.src = item.icon;
        iconEl.style.display = 'block';
    } else {
        iconEl.style.display = 'none';
    }
    document.getElementById('libModalName').textContent = item.name;
    document.getElementById('libModalDate').textContent = item.lastImport
        ? `最近导入：${timeAgo(item.lastImport)}`
        : '尚未导入数据';
    const urlRow = document.getElementById('libModalUrlRow');
    if (item.url) {
        urlRow.style.display = 'flex';
        document.getElementById('libModalUrl').textContent = item.url;
        const openBtn = document.getElementById('libUrlOpenBtn');
        openBtn.onclick = () => window.open(item.url, '_blank');
    } else {
        urlRow.style.display = 'none';
    }


    document.getElementById('libModalHint').textContent = '';
    document.getElementById('libModalHint').className = 'lib-modal-hint';
    document.getElementById('libModalMask').classList.add('open');
}

function closeLibDetail() {
    document.getElementById('libModalMask').classList.remove('open');
    currentLibItem = null;
}

document.getElementById('libModalClose').addEventListener('click', closeLibDetail);
document.getElementById('libModalMask').addEventListener('click', function (e) {
    if (e.target === this) closeLibDetail();
});

// 导入JSON
document.getElementById('libImportBtn').addEventListener('click', () => {
    document.getElementById('libJsonImport').click();
});

document.getElementById('libJsonImport').addEventListener('change', async function () {
    const file = this.files[0];
    if (!file || !currentLibItem) return;
    const hint = document.getElementById('libModalHint');
    try {
        hint.textContent = '正在读取文件...';
        hint.className = 'lib-modal-hint';
        const content = await readFileAsJson(file);
        currentLibItem.jsonData = content;
        currentLibItem.lastImport = new Date().toISOString();
        currentLibItem.fileName = file.name;
        await dbPut(currentLibItem);
        await renderLibrary();
        hint.textContent = '导入成功！';
        hint.className = 'lib-modal-hint success';
        document.getElementById('libModalDate').textContent =
            `最近导入：${timeAgo(currentLibItem.lastImport)}`;
    } catch (err) {
        hint.textContent = `导入失败：${err.message}`;
        hint.className = 'lib-modal-hint error';
    }
    this.value = '';
});

// 导出JSON
document.getElementById('libExportBtn').addEventListener('click', () => {
    if (!currentLibItem) return;
    if (!currentLibItem.jsonData) {
        const hint = document.getElementById('libModalHint');
        hint.textContent = '还没有导入过数据哦～';
        hint.className = 'lib-modal-hint error';
        return;
    }
    const blob = new Blob([currentLibItem.jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `${currentLibItem.name}_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// 删除
document.getElementById('libDeleteBtn').addEventListener('click', async () => {
    if (!currentLibItem) return;
    if (!confirm(`确定删除「${currentLibItem.name}」吗？`)) return;
    await dbDelete(currentLibItem.id);
    await renderLibrary();
    closeLibDetail();
});

// 编辑
document.getElementById('libEditBtn').addEventListener('click', () => {
    if (!currentLibItem) return;
    // 保存一份引用，关闭弹窗不会清空
    const editingItem = currentLibItem;
    document.getElementById('libEditName').value = editingItem.name || '';
    document.getElementById('libEditUrl').value = editingItem.url || '';
    const preview = document.getElementById('libEditIconPreview');
    const upload = document.getElementById('libEditIconUpload');
    if (editingItem.icon) {
        preview.src = editingItem.icon;
        preview.style.display = 'block';
        upload.style.display = 'none';
    } else {
        preview.style.display = 'none';
        upload.style.display = 'flex';
    }
    // 先存到编辑弹窗，再关闭详情
    document.getElementById('libEditMask').dataset.editId = editingItem.id;
    closeLibDetail();
    document.getElementById('libEditMask').classList.add('open');
});


// ===== 新建弹窗 =====
let newIconBase64 = '';

function openNewModal() {
    newIconBase64 = '';
    document.getElementById('libNewName').value = '';
    document.getElementById('libNewUrl').value = '';
    document.getElementById('libIconPreview').style.display = 'none';
    document.getElementById('libIconUpload').style.display = 'flex';
    document.getElementById('libNewMask').classList.add('open');
}

function closeNewModal() {
    document.getElementById('libNewMask').classList.remove('open');
}

document.getElementById('libNewClose').addEventListener('click', closeNewModal);
document.getElementById('libNewMask').addEventListener('click', function (e) {
    if (e.target === this) closeNewModal();
});

document.getElementById('libIconUpload').addEventListener('click', () => {
    document.getElementById('libIconFile').click();
});
document.getElementById('libIconPreview').addEventListener('click', () => {
    document.getElementById('libIconFile').click();
});

document.getElementById('libIconFile').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    compressImage(file, (base64) => {
        newIconBase64 = base64;
        const preview = document.getElementById('libIconPreview');
        preview.src = base64;
        preview.style.display = 'block';
        document.getElementById('libIconUpload').style.display = 'none';
    });
    this.value = '';
});

document.getElementById('libNewSaveBtn').addEventListener('click', async () => {
    const name = document.getElementById('libNewName').value.trim();
    if (!name) { alert('请给小手机取个名字～'); return; }
    await dbAdd({
        name,
        url: document.getElementById('libNewUrl').value.trim(),
        icon: newIconBase64 || '',
        jsonData: '',
        lastImport: '',
        createdAt: new Date().toISOString()
    });
    await renderLibrary();
    closeNewModal();
});

// ===== 编辑弹窗 =====
let editIconBase64 = null;

function closeEditModal() {
    document.getElementById('libEditMask').classList.remove('open');
}

document.getElementById('libEditClose').addEventListener('click', closeEditModal);
document.getElementById('libEditMask').addEventListener('click', function (e) {
    if (e.target === this) closeEditModal();
});

document.getElementById('libEditIconUpload').addEventListener('click', () => {
    document.getElementById('libEditIconFile').click();
});
document.getElementById('libEditIconPreview').addEventListener('click', () => {
    document.getElementById('libEditIconFile').click();
});

document.getElementById('libEditIconFile').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    compressImage(file, (base64) => {
        editIconBase64 = base64;
        const preview = document.getElementById('libEditIconPreview');
        preview.src = base64;
        preview.style.display = 'block';
        document.getElementById('libEditIconUpload').style.display = 'none';
    });
    this.value = '';
});

document.getElementById('libEditSaveBtn').addEventListener('click', async () => {
    const name = document.getElementById('libEditName').value.trim();
    if (!name) { alert('名字不能为空～'); return; }

    // 从data属性取id，不依赖currentLibItem
    const editId = parseInt(document.getElementById('libEditMask').dataset.editId);
    const list = await dbGetAll();
    const item = list.find(i => i.id === editId);
    if (!item) { alert('找不到该条目，请重试'); return; }

    item.name = name;
    item.url = document.getElementById('libEditUrl').value.trim();
    if (editIconBase64 !== null) item.icon = editIconBase64;
    await dbPut(item);
    await renderLibrary();
    closeEditModal();
    editIconBase64 = null;
});


// ===== 搜索 =====
document.getElementById('librarySearch').addEventListener('input', async function () {
    const val = this.value;
    const clearBtn = document.getElementById('librarySearchClear');
    clearBtn.classList.toggle('visible', !!val);
    await renderLibrary(val);
});

document.getElementById('librarySearchClear').addEventListener('click', async () => {
    document.getElementById('librarySearch').value = '';
    document.getElementById('librarySearchClear').classList.remove('visible');
    await renderLibrary();
});

async function init() {
    await initDB();
    renderPresetSelect();
    await renderLibrary();
    initCreatePage();
    initBeautifyPage();
}


init();


// ===== 调用AI =====
async function callAI(systemPrompt, userContent) {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;

    if (!url || !key || !model) {
        throw new Error('请先在设置页配置并保存 API！');
    }

    const endpoint = url.replace(/\/$/, '');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800000);


    let res;
    try {
        res = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7,
                max_tokens: 4096
            }),
            signal: controller.signal
        });
    } catch(err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('请求超时，请检查网络或换个模型试试');
        }
        throw new Error(`网络请求失败：${err.message}`);
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API错误 ${res.status}：${errText.slice(0, 100)}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}


init();


// ===================================================
// ===== 文字生成页逻辑 =====
// ===================================================

// 通用：复制到剪贴板
function copyToClipboard(text, btnEl) {
    navigator.clipboard.writeText(text).then(() => {
        const original = btnEl.innerHTML;
        btnEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;
        setTimeout(() => { btnEl.innerHTML = original; }, 1500);
    });
}

// 通用：显示结果
const CHUNK_SIZE = 6000;

// 分块弹窗
function showChunkModal(text) {
    const existing = document.getElementById('chunkModal');
    if (existing) existing.remove();

    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    const mask = document.createElement('div');
    mask.id = 'chunkModal';
    mask.className = 'lib-modal-mask open';
    mask.style.zIndex = '999';

    const modal = document.createElement('div');
    modal.className = 'lib-modal';
    modal.innerHTML = `
        <div class="lib-modal-header">
            <span class="lib-modal-name">分块复制（共 ${chunks.length} 块）</span>
            <button class="lib-modal-close" id="chunkModalClose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        <div class="chunk-modal-tip">内容较长，可一键复制全部，或按顺序分块复制</div>
        <div style="padding: 0 16px 12px;">
            <button class="btn btn-primary btn-full" id="chunkCopyAllBtn">📋 一键复制全部</button>
        </div>
        <div class="chunk-modal-list">
            ${chunks.map((chunk, i) => `
                <div class="chunk-modal-item" id="chunkItem${i}">
                    <div class="chunk-modal-item-info">
                        <span class="chunk-modal-num">第 ${i + 1} 块</span>
                        <span class="chunk-modal-size">${chunk.length} 字</span>
                    </div>
                    <button class="btn btn-primary chunk-modal-btn" data-idx="${i}">
                        复制第 ${i + 1} 块
                    </button>
                </div>
            `).join('')}
        </div>
    `;

    mask.appendChild(modal);
    document.body.appendChild(mask);

    // 关闭
    modal.querySelector('#chunkModalClose').addEventListener('click', () => {
        mask.remove();
    });
    mask.addEventListener('click', (e) => {
        if (e.target === mask) mask.remove();
    });

        // 一键复制全部
    modal.querySelector('#chunkCopyAllBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
            const btn = modal.querySelector('#chunkCopyAllBtn');
            btn.textContent = '✅ 已复制全部';
            btn.style.background = '#52c41a';
            btn.style.borderColor = '#52c41a';
            setTimeout(() => {
                btn.textContent = '📋 一键复制全部';
                btn.style.background = '';
                btn.style.borderColor = '';
            }, 2000);
        });
    });


    // 复制按钮
    modal.querySelectorAll('.chunk-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            navigator.clipboard.writeText(chunks[idx]).then(() => {
                btn.textContent = '✅ 已复制';
                btn.style.background = '#52c41a';
                // 标记已复制
                document.getElementById(`chunkItem${idx}`).classList.add('chunk-done');
                setTimeout(() => {
                    btn.textContent = `复制第 ${idx + 1} 块`;
                    btn.style.background = '';
                }, 2000);
            });
        });
    });
}

function showCreateResult(resultId, contentId, text) {
    const resultEl = document.getElementById(resultId);
    const contentEl = document.getElementById(contentId);
    resultEl.classList.remove('hidden');
    contentEl.textContent = text;

    // 找结果区的header里的复制按钮，加上分块入口
    const header = resultEl.querySelector('.result-header');
    const oldChunkBtn = header.querySelector('.chunk-entry-btn');
    if (oldChunkBtn) oldChunkBtn.remove();

    if (text.length > CHUNK_SIZE) {
        const chunkBtn = document.createElement('button');
        chunkBtn.className = 'btn btn-outline chunk-entry-btn';
        chunkBtn.style.fontSize = '12px';
        chunkBtn.style.padding = '4px 10px';
        chunkBtn.textContent = `📋 分块复制（${Math.ceil(text.length / CHUNK_SIZE)} 块）`;
        chunkBtn.addEventListener('click', () => showChunkModal(text));
        header.appendChild(chunkBtn);
    }
}


// ===== 人设卡 =====
let lastPersonaResult = '';

// personaLinkUser 的监听放到 init() 之后才安全
function initCreatePage() {
    const linkUserEl = document.getElementById('personaLinkUser');
    if (linkUserEl) {
        linkUserEl.addEventListener('change', function() {
            document.getElementById('personaUserRelBox').style.display =
                this.checked ? 'block' : 'none';
        });
    }
}



async function generatePersona(iterateInstruction = '') {
    const name = document.getElementById('personaName').value.trim();
    const age = document.getElementById('personaAge').value.trim();
    const appearance = document.getElementById('personaAppearance').value.trim();
    const personality = document.getElementById('personaPersonality').value.trim();
    const background = document.getElementById('personaBackground').value.trim();
    const relation = document.getElementById('personaRelation').value.trim();
    const extra = document.getElementById('personaExtra').value.trim();

    if (!name && !appearance && !personality && !background) {
        alert('至少填写一个字段～'); return;
    }


    const btn = document.getElementById('personaGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastPersonaResult) {
            // 迭代修改
            prompt = `你是一个专业的AI角色人设卡撰写师。
用户对已生成的人设卡不满意，需要按照要求修改。
请根据修改要求，对人设卡进行针对性调整，保持原有内容的完整性。
直接返回修改后的完整人设卡，不要有任何解释。`;
            userContent = `原人设卡：\n${lastPersonaResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            // 首次生成
            prompt = `你是一个专业的AI角色人设卡撰写师，擅长为AI聊天小手机创作细腻、有深度的角色人设。

根据用户提供的关键词，生成一份完整且细腻的人设卡。

【人设卡结构】必须包含以下部分：
1. 基本信息（姓名/年龄/性别/身高体重等）
2. 外貌描写（有画面感，细节丰富）
3. 性格特征（有层次感，有内外反差）
4. 生平经历（成长背景、重要经历、人生转折点）
5. 人物关系网（与其他角色的关系，格式：关系类型：人物名——关系描述）
6. 小习惯（3-5个独特的细节行为）
7. 秘密（深藏的内心秘密或隐藏信息）
8. 开场白（角色的第一句话，要有代入感）
9. 语言风格（说话习惯、口头禅、语气特点）

【铁律，必须严格遵守】：
- 严禁在人设中写任何关于"user/你"的具体喜好、习惯、过敏、厌恶、情感倾向等个人信息
- 错误示范：他记得你喜欢喝拿铁、你对花粉过敏、你讨厌甜食
- 正确示范：只写角色自己的性格和行为，不预设user的任何特征
- 角色的感情和行动由角色自身驱动，不依赖于对user具体特征的了解
- 人物关系网中不出现user，user由用户自己决定与角色的关系

直接输出人设卡内容，不需要任何解释前言。`;


            const history = document.getElementById('personaHistory').value.trim();
            const linkUser = document.getElementById('personaLinkUser').checked;
            const userRel = document.getElementById('personaUserRel').value.trim();

            const fields = [];
            if (name) fields.push(`角色名字：${name}`);
            if (age) fields.push(`年龄/性别：${age}`);
            if (appearance) fields.push(`外貌关键词：${appearance}`);
            if (personality) fields.push(`性格关键词：${personality}`);
            if (background) fields.push(`背景设定：${background}`);
            if (history) fields.push(`生平经历关键词：${history}`);
            if (relation) fields.push(`与User的关系（仅供参考，不要在人设中写User的个人特征）：${relation}`);
            if (extra) fields.push(`特殊设定：${extra}`);
            if (linkUser && userRel) {
                fields.push(`与User的关联：${userRel}`);
                fields.push(`要求：在人物关系网中包含与User的关联，并在人设卡末尾单独输出一份User的基础人设（只写身份背景，不写任何具体的喜好/习惯/过敏/厌恶等个人倾向）`);
            }

            userContent = fields.length > 0
                ? fields.join('\n') + '\n\n未填写的部分请AI自由发挥，让角色更立体有趣。'
                : '请AI自由创作一个有趣的AI聊天角色，包含完整人设结构。';


        }

        const result = await callAI(prompt, userContent);
        lastPersonaResult = result;
        showCreateResult('personaResult', 'personaContent', result);

    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成人设卡';
}

document.getElementById('personaGenerateBtn').addEventListener('click', () => generatePersona());
document.getElementById('personaRegenBtn').addEventListener('click', () => {
    lastPersonaResult = '';
    generatePersona();
});
document.getElementById('personaIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('personaIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generatePersona(instruction);
});
document.getElementById('personaCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastPersonaResult, this);
});

// ===== 世界书 =====
let lastWbResult = '';

async function generateWorldbook(iterateInstruction = '') {
    const title = document.getElementById('wbTitle').value.trim();
    const core = document.getElementById('wbCore').value.trim();
    const rules = document.getElementById('wbRules').value.trim();
    const scene = document.getElementById('wbScene').value.trim();

    if (!core) { alert('请填写核心规则～'); return; }

    const btn = document.getElementById('wbGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastWbResult) {
            prompt = `你是一个专业的AI世界书条目撰写师。
根据修改要求，对世界书进行针对性调整。
直接返回修改后的完整世界书内容，不要有任何解释。`;
            userContent = `原世界书：\n${lastWbResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            prompt = `你是一个专业的AI世界书撰写师，专门为AI聊天小手机创作世界书条目。

世界书是给AI看的规则文档，用于约束AI的行为和输出风格。

根据用户需求，生成一份结构清晰、逻辑严密的世界书。

要求：
1. 使用XML或结构化格式，让AI容易理解和执行
2. 规则要具体可执行，不能模糊
3. 可以加入正反例对比，帮助AI理解
4. 规则之间逻辑连贯，不自相矛盾
5. 直接输出世界书内容，不需要解释`;

            userContent = `世界书标题：${title || '未命名'}
核心规则/效果：${core}
具体禁止/要求：${rules || '无'}
适用场景：${scene || '通用'}`;
        }

        const result = await callAI(prompt, userContent);
        lastWbResult = result;
        showCreateResult('wbResult', 'wbContent', result);

    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成世界书';
}

document.getElementById('wbGenerateBtn').addEventListener('click', () => generateWorldbook());
document.getElementById('wbRegenBtn').addEventListener('click', () => { lastWbResult = ''; generateWorldbook(); });
document.getElementById('wbIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('wbIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generateWorldbook(instruction);
});
document.getElementById('wbCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastWbResult, this);
});

// ===== 同人梗 =====
let lastDoujinResult = '';

async function generateDoujin(iterateInstruction = '') {
    const charDesc = document.getElementById('doujinChar').value.trim();
    const keywords = document.getElementById('doujinKeywords').value.trim();
    const tone = document.getElementById('doujinTone').value.trim();
    const extra = document.getElementById('doujinExtra').value.trim();

    if (!keywords) { alert('请填写同人梗关键词～'); return; }

    const btn = document.getElementById('doujinGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastDoujinResult) {
            prompt = `你是一个专业的同人梗策划师。
根据修改要求，对同人梗进行调整。
直接返回修改后的完整同人梗内容。`;
            userContent = `原同人梗：\n${lastDoujinResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            prompt = `你是一个专业的同人梗策划师，擅长为AI聊天小手机创作世界观设定和故事梗概。

同人梗是一种故事世界规则设定，用于确定角色关系、世界背景、核心冲突和故事走向。

根据用户提供的关键词，生成一份详细的同人梗设定，包含：
1. 世界观背景
2. 核心关系设定
3. 故事主线梗概
4. 关键情节节点
5. 人物弧光走向
6. 独特的氛围和细节

要求创意丰富，有自己的想象力，在用户关键词基础上进行合理扩展。
直接输出同人梗内容，不需要解释。`;

            userContent = `Char设定：${charDesc || '未指定'}
同人梗关键词：${keywords}
基调风格：${tone || '未指定'}
其他要求：${extra || '无'}`;
        }

        const result = await callAI(prompt, userContent);
        lastDoujinResult = result;
        showCreateResult('doujinResult', 'doujinContent', result);

    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成同人梗';
}

document.getElementById('doujinGenerateBtn').addEventListener('click', () => generateDoujin());
document.getElementById('doujinRegenBtn').addEventListener('click', () => { lastDoujinResult = ''; generateDoujin(); });
document.getElementById('doujinIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('doujinIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generateDoujin(instruction);
});
document.getElementById('doujinCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastDoujinResult, this);
});

// ===== 小剧场 =====
let lastSkitResult = '';

async function generateSkit(iterateInstruction = '') {
    const charDesc = document.getElementById('skitChar').value.trim();
    const keywords = document.getElementById('skitKeywords').value.trim();
    const tone = document.getElementById('skitTone').value.trim();
    const length = document.getElementById('skitLength').value;
    const extra = document.getElementById('skitExtra').value.trim();

    if (!keywords) { alert('请填写小剧场关键词～'); return; }

    const btn = document.getElementById('skitGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastSkitResult) {
            prompt = `你是一个专业的小剧场指令撰写师。
根据修改要求，对小剧场指令进行调整。
直接返回修改后的完整指令内容。`;
            userContent = `原指令：\n${lastSkitResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            prompt = `你是一个专业的AI聊天小手机小剧场指令撰写师。

小剧场指令是一种特殊的聊天指令，以"（$$"开头，
用于让AI角色暂停当前剧情，生成一段特定主题的番外小剧场文章。

根据用户提供的关键词，生成一段完整的小剧场指令。

指令格式要求：
1. 以 （$$ 开头
2. 说明"暂停当前剧情，生成一个以'XXX'为主题的番外小剧场"
3. 详细描述剧情要求和注意事项（至少5条具体要求）
4. 说明字数要求（约${length}字）
5. 末尾注明：不需要状态栏，不计入主线剧情，不计入记忆区，严格遵守人物设定，不得OOC，禁止生成message格式
6. 以 ） 结尾

参考示例格式（注意这只是格式参考，内容要根据用户关键词自由发挥）：
（$$暂停当前剧情，生成一个以"XXX"为主题的番外小剧场。[具体剧情描述]
你需要注意的是：1.[要求一] 2.[要求二] 3.[要求三]...
不需要状态栏，不计入主线剧情，不计入记忆区，严格遵守人物设定，不得OOC，禁止生成message格式。不少于${length}字。）

直接输出指令内容，不需要任何解释。`;

            userContent = `Char设定：${charDesc || '未指定'}
小剧场关键词：${keywords}
基调风格：${tone || '未指定'}
字数要求：约${length}字
其他要求：${extra || '无'}`;
        }

        const result = await callAI(prompt, userContent);
        lastSkitResult = result;
        showCreateResult('skitResult', 'skitContent', result);

    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成小剧场指令';
}

document.getElementById('skitGenerateBtn').addEventListener('click', () => generateSkit());
document.getElementById('skitRegenBtn').addEventListener('click', () => { lastSkitResult = ''; generateSkit(); });
document.getElementById('skitIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('skitIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generateSkit(instruction);
});
document.getElementById('skitCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastSkitResult, this);
});

// ===================================================
// ===== 美化生成页逻辑 =====
// ===================================================

let lastBubbleResult = '';
let lastHtmlResult = '';

// ===== 预览设置头像 =====
document.getElementById('userAvatarUpload').addEventListener('click', () => {
    document.getElementById('userAvatarFile').click();
});
document.getElementById('userAvatarFile').addEventListener('change', function() {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('userAvatarPreview');
        img.src = e.target.result;
        img.style.display = 'block';
        document.getElementById('userAvatarUpload').querySelector('svg').style.display = 'none';
        updateBubblePreview();
    };
    reader.readAsDataURL(file); this.value = '';
});

document.getElementById('charAvatarUpload').addEventListener('click', () => {
    document.getElementById('charAvatarFile').click();
});
document.getElementById('charAvatarFile').addEventListener('change', function() {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('charAvatarPreview');
        img.src = e.target.result;
        img.style.display = 'block';
        document.getElementById('charAvatarUpload').querySelector('svg').style.display = 'none';
        updateBubblePreview();
    };
    reader.readAsDataURL(file); this.value = '';
});

['userMsgInput','charMsgInput','userNameInput','charNameInput'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => updateBubblePreview());
});

// ===== CSS文件上传 =====
document.getElementById('cssUploadArea').addEventListener('click', () => {
    document.getElementById('cssFile').click();
});
document.getElementById('cssFile').addEventListener('change', function() {
    const file = this.files[0]; if (!file) return;
    if (file.name.toLowerCase().endsWith('.docx')) {
        alert('docx请打开后复制CSS代码粘贴到文本框～');
        this.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('cssTemplateInput').value = e.target.result;
        document.getElementById('cssUploadText').textContent = `已上传：${file.name}`;
    };
    reader.readAsText(file); this.value = '';
});

// ===== 构建预览HTML =====
function buildPreviewHtml(previewCSS) {
    const userAvatar = document.getElementById('userAvatarPreview').src;
    const charAvatar = document.getElementById('charAvatarPreview').src;
    const userName = document.getElementById('userNameInput').value || '用户';
    const charName = document.getElementById('charNameInput').value || 'Char';
    const userMsg = document.getElementById('userMsgInput').value || '你好呀～';
    const charMsg = document.getElementById('charMsgInput').value || '嗯，在呢。';

    const uA = userAvatar && userAvatar !== window.location.href
        ? `<img src="${userAvatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>`
        : `<div style="width:36px;height:36px;border-radius:50%;background:#ddd;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999">${userName[0]}</div>`;

    const cA = charAvatar && charAvatar !== window.location.href
        ? `<img src="${charAvatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;"/>`
        : `<div style="width:36px;height:36px;border-radius:50%;background:#bbb;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff">${charName[0]}</div>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
    font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
    background:#f5f5f5;
    padding:16px;
    min-height:100vh;
}
.chat-wrap{
    display:flex;
    flex-direction:column;
    gap:16px;
}
.message-row{
    display:flex;
    align-items:flex-end;
    gap:8px;
}
.message-row.user-row{flex-direction:row-reverse}
.name-label{font-size:11px;color:#999;margin-bottom:4px}
.user-row .name-label{text-align:right}
.msg-wrap{
    display:flex;
    flex-direction:column;
    max-width:65%;
}
.user-row .msg-wrap{align-items:flex-end}
.bubble{
    padding:10px 14px;
    border-radius:18px;
    font-size:14px;
    line-height:1.6;
    word-break:break-word;
}
.char-bubble{
    background:#fff;
    color:#333;
    border-bottom-left-radius:4px;
    border:1px solid #e0e0e0;
}
.user-bubble{
    background:#4a90e2;
    color:#fff;
    border-bottom-right-radius:4px;
}
/* 用户自定义CSS */
${previewCSS || ''}
</style>
</head>
<body>
<div class="chat-wrap">
    <div class="message-row char-row">
        ${cA}
        <div class="msg-wrap">
            <div class="name-label">${charName}</div>
            <div class="bubble char-bubble">${charMsg}</div>
        </div>
    </div>
    <div class="message-row user-row">
        ${uA}
        <div class="msg-wrap">
            <div class="name-label">${userName}</div>
            <div class="bubble user-bubble">${userMsg}</div>
        </div>
    </div>
    <div class="message-row char-row">
        ${cA}
        <div class="msg-wrap">
            <div class="name-label">${charName}</div>
            <div class="bubble char-bubble">好的，我在～有什么想说的吗？</div>
        </div>
    </div>
</div>
</body>
</html>`;
}

function updateBubblePreview(previewCSS) {
    const frame = document.getElementById('bubblePreviewFrame');
    if (!frame) return;
    frame.srcdoc = buildPreviewHtml(previewCSS !== undefined ? previewCSS : '');
}

// ===== 气泡美化生成 =====
async function generateBubble(iterateInstruction = '') {
    const cssTemplate = document.getElementById('cssTemplateInput').value.trim();
    const desc = document.getElementById('bubbleDesc').value.trim();

    if (!desc && !cssTemplate) {
        alert('请描述想要的效果或上传CSS模板～'); return;
    }

    const btn = document.getElementById('bubbleGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastBubbleResult) {
            prompt = `你是一个专业的CSS代码编写师。
根据修改要求，对CSS代码进行调整。

需要返回两份CSS，格式如下，不要有其他文字：
===REAL_CSS===
（修改后的真实CSS，用于小手机）
===PREVIEW_CSS===
将真实CSS的视觉效果映射到以下预览专用选择器：
body .char-bubble .user-bubble .char-row .user-row .bubble .name-label
===END===`;
            userContent = `原CSS：\n${lastBubbleResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            prompt = `你是一个专业的AI聊天界面CSS美化师。

${cssTemplate
    ? '用户提供了CSS模板，请基于此模板修改，保留原有选择器结构，只调整视觉样式。'
    : '根据用户描述生成漂亮精致的聊天界面CSS。'}

需要返回两份CSS，格式如下，不要有其他文字：
===REAL_CSS===
（${cssTemplate ? '基于模板修改的真实CSS，保留模板选择器' : '使用通用聊天选择器的真实CSS，用于小手机'}）
===PREVIEW_CSS===
将完全相同的视觉效果，映射到以下预览专用选择器：
body - 整体背景
.char-bubble - AI角色气泡
.user-bubble - 用户气泡
.bubble - 气泡通用
.char-row - AI角色消息行
.user-row - 用户消息行
.name-label - 名字标签
===END===

要求：
1. 两份CSS视觉效果完全一致，只是选择器不同
2. 只返回CSS代码，不要任何解释
3. 视觉效果要漂亮精致，有质感
4. 可以使用渐变、微妙阴影、圆润圆角等`;

            userContent = `${cssTemplate ? `CSS模板：\n${cssTemplate.slice(0,3000)}\n\n` : ''}效果描述：${desc || '生成漂亮的聊天气泡样式'}`;
        }

        const result = await callAI(prompt, userContent);
        console.log('=== AI返回 ===', result);

        // 解析两份CSS
        let realCSS = '';
        let previewCSS = '';

        const realMatch = result.match(/===REAL_CSS===([\s\S]*?)===PREVIEW_CSS===/);
        const previewMatch = result.match(/===PREVIEW_CSS===([\s\S]*?)===END===/);

        if (realMatch && previewMatch) {
            realCSS = realMatch[1].trim().replace(/```css/g,'').replace(/```/g,'').trim();
            previewCSS = previewMatch[1].trim().replace(/```css/g,'').replace(/```/g,'').trim();
        } else {
            // AI没按格式返回，全部当真实CSS
            realCSS = result.replace(/```css/g,'').replace(/```/g,'').trim();
            previewCSS = realCSS;
        }

        lastBubbleResult = realCSS;

        // 结果区显示真实CSS
        showCreateResult('bubbleResult', 'bubbleContent', realCSS);

        // 预览用预览CSS
        updateBubblePreview(previewCSS);

    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成CSS代码';
}

document.getElementById('bubbleGenerateBtn').addEventListener('click', () => generateBubble());
document.getElementById('bubbleRegenBtn').addEventListener('click', () => {
    lastBubbleResult = '';
    generateBubble();
});
document.getElementById('bubbleIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('bubbleIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generateBubble(instruction);
});
document.getElementById('bubbleCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastBubbleResult, this);
});

// ===== HTML创作 =====
async function generateHtml(iterateInstruction = '') {
    const desc = document.getElementById('htmlDesc').value.trim();
    const ref = document.getElementById('htmlRef').value.trim();
    if (!desc) { alert('请描述想创作的HTML模块～'); return; }

    const btn = document.getElementById('htmlGenerateBtn');
    btn.disabled = true;
    btn.textContent = '生成中...';

    try {
        let prompt, userContent;

        if (iterateInstruction && lastHtmlResult) {
            prompt = `你是HTML/CSS/JS开发者。根据修改要求调整代码。只返回纯HTML，不要解释和代码块标记。`;
            userContent = `原HTML：\n${lastHtmlResult}\n\n修改要求：${iterateInstruction}`;
        } else {
            prompt = `你是专业的HTML/CSS/JS开发者，为AI聊天小手机创作HTML卡片模板。

【重要】生成的HTML必须包含以下两部分：

第一部分：触发说明（注释形式，写在HTML最开头）
用HTML注释说明：
- 什么情况下char会发送这个HTML卡片
- 内容仅供参考，实际内容需char根据上下文、char人设和user人设自由发挥
- 禁止照搬模板内容，所有文字数据均为示例

格式示例：
<!--
[触发条件] 当XXX时，char发送此卡片
[内容说明] 以下内容仅为模板示例，char应根据实际对话情境、自身人设与user人设重新创作填充，禁止照搬
-->

第二部分：HTML卡片正文
- 只返回HTML，包含内联style和script
- 有至少一个可交互元素
- 样式精美适合手机端
- 模板内的文字/数据用【示例内容】标注，提醒使用者替换
- 语法正确可直接运行
- 不要代码块标记`;


            userContent = `内容：${desc}${ref ? `\n参考：${ref.slice(0,1000)}` : ''}`;
        }

        const result = await callAI(prompt, userContent);
        const cleanHtml = result.replace(/```html/g,'').replace(/```/g,'').trim();

        lastHtmlResult = cleanHtml;
        showCreateResult('htmlResult', 'htmlContent', cleanHtml);

        const frame = document.getElementById('htmlPreviewFrame');
        frame.srcdoc = cleanHtml;

        // 等iframe加载完自动适应高度
        frame.onload = () => {
            try {
                const height = frame.contentDocument.body.scrollHeight;
                frame.style.height = Math.max(200, height + 20) + 'px';
            } catch(e) {
                frame.style.height = '300px';
            }
        };


    } catch(err) {
        alert(`生成失败：${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = '✨ 生成HTML';
}

document.getElementById('htmlGenerateBtn').addEventListener('click', () => generateHtml());
document.getElementById('htmlRegenBtn').addEventListener('click', () => {
    lastHtmlResult = '';
    generateHtml();
});
document.getElementById('htmlIterateBtn').addEventListener('click', () => {
    const instruction = document.getElementById('htmlIterateInput').value.trim();
    if (!instruction) { alert('请填写修改要求～'); return; }
    generateHtml(instruction);
});
document.getElementById('htmlCopyBtn').addEventListener('click', function() {
    copyToClipboard(lastHtmlResult, this);
});

// ===== 初始化美化页 =====
function initBeautifyPage() {
    updateBubblePreview();
}

// ===== 注册 Service Worker =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW注册成功', reg))
            .catch(err => console.log('SW注册失败', err));
    });
}
