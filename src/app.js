const API = 'https://api.iconify.design';
const FALLBACK_API = 'https://api.simplesvg.com';
const form = document.querySelector('#search-form');
const input = document.querySelector('#search-input');
const grid = document.querySelector('#results-grid');
const status = document.querySelector('#status');
const title = document.querySelector('#results-title');
const count = document.querySelector('#result-count');
const dialog = document.querySelector('#icon-dialog');
const dialogContent = document.querySelector('#dialog-content');
const toast = document.querySelector('#toast');
let collectionMetaPromise;

const state = { query: '', icons: [] };

const SEARCH_ALIASES = {
  '家': 'home', '房子': 'home', '房屋': 'home',
  '箭頭': 'arrow', '方向': 'arrow',
  '愛心': 'heart', '心': 'heart',
  '雲': 'cloud', '雲朵': 'cloud',
  '使用者': 'user', '用戶': 'user', '人': 'user', '帳號': 'account',
  '設定': 'settings', '齒輪': 'settings', '偏好設定': 'settings',
  '搜尋': 'search', '放大鏡': 'search',
  '新增': 'plus', '加號': 'plus', '增加': 'add',
  '刪除': 'trash', '垃圾桶': 'trash', '移除': 'delete',
  '下載': 'download', '上傳': 'upload',
  '鎖': 'lock', '解鎖': 'unlock',
  '郵件': 'mail', '信件': 'mail', '信封': 'mail',
  '電話': 'phone', '日曆': 'calendar', '行事曆': 'calendar',
  '鉛筆': 'edit', '編輯': 'edit', '眼睛': 'eye',
  '播放': 'play', '暫停': 'pause', '停止': 'stop',
  '錯誤': 'error', '警告': 'warning', '成功': 'check', '勾選': 'check',
  '關閉': 'close', '返回': 'back', '上一頁': 'arrow-left', '下一頁': 'arrow-right',
  '選單': 'menu', '分享': 'share', '收藏': 'bookmark', '星星': 'star'
};

function translateQuery(query) {
  let translated = query;
  Object.entries(SEARCH_ALIASES)
    .sort(([a], [b]) => b.length - a.length)
    .forEach(([traditional, english]) => { translated = translated.replaceAll(traditional, english); });
  return translated;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function iconURL(prefix, name, host = API) {
  return `${host}/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg?height=64`;
}

function setStatus(message = '', isError = false) {
  status.textContent = message;
  status.className = isError ? 'status error' : 'status';
}

function updateURL(query) {
  const url = new URL(window.location.href);
  query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
  window.history.replaceState({}, '', url);
}

function renderIcons(icons) {
  grid.innerHTML = icons.map((icon, index) => `
    <button class="icon-card" type="button" data-index="${index}" aria-label="查看 ${escapeHTML(icon.name)}">
      <span class="icon-preview"><img loading="lazy" src="${iconURL(icon.prefix, icon.name)}" alt="" /></span>
      <span><span class="icon-name">${escapeHTML(icon.name)}</span><span class="icon-set">${escapeHTML(icon.setName || icon.prefix)}</span></span>
    </button>`).join('');
}

async function fetchJSON(path) {
  try {
    const response = await fetch(`${API}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    const response = await fetch(`${FALLBACK_API}${path}`);
    if (!response.ok) throw error;
    return response.json();
  }
}

function getCollectionMeta() {
  if (!collectionMetaPromise) collectionMetaPromise = fetchJSON('/collections');
  return collectionMetaPromise;
}

async function search(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    state.query = '';
    state.icons = [];
    updateURL('');
    title.textContent = '從一個關鍵字開始';
    count.textContent = '';
    setStatus('');
    grid.innerHTML = '';
    return;
  }
  state.query = cleanQuery;
  input.value = cleanQuery;
  updateURL(cleanQuery);
  title.textContent = `「${cleanQuery}」的搜尋結果`;
  count.textContent = '';
  setStatus('正在搜尋圖示⋯');
  grid.innerHTML = '';
  try {
    const apiQuery = translateQuery(cleanQuery);
    const data = await fetchJSON(`/search?query=${encodeURIComponent(apiQuery)}&limit=60`);
    state.icons = (data.icons || []).map((fullName) => {
      const [prefix, ...parts] = fullName.split(':');
      return { prefix, name: parts.join(':'), setName: prefix };
    });
    count.textContent = `${state.icons.length} 個結果`;
    if (!state.icons.length) {
      setStatus('找不到相符的圖示，換個關鍵字試試看。');
      return;
    }
    setStatus('');
    renderIcons(state.icons);
  } catch (error) {
    console.error(error);
    state.icons = [];
    setStatus('目前無法連線到 Iconify，請稍後再試。', true);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); showToast('已複製到剪貼簿'); }
  catch { showToast('複製失敗，請手動選取文字'); }
}

async function openIcon(icon) {
  const svg = iconURL(icon.prefix, icon.name);
  const html = `<img src="${svg}" alt="${escapeHTML(icon.name)}" />`;
  const jsx = `<Icon icon="${escapeHTML(icon.prefix)}:${escapeHTML(icon.name)}" />`;
  dialogContent.innerHTML = `
    <div class="dialog-inner">
      <div class="dialog-preview">${html}</div>
      <h2 class="dialog-title">${escapeHTML(icon.name)}</h2>
      <p class="dialog-meta">圖示集：${escapeHTML(icon.prefix)} · <a href="https://icon-sets.iconify.design/${encodeURIComponent(icon.prefix)}/" target="_blank" rel="noreferrer">查看原始圖示集 ↗</a></p>
      <div class="license">正在載入圖示集授權資訊⋯</div>
      <div class="code-block"><button class="copy-button" type="button" data-copy="${escapeHTML(svg)}">複製 SVG 連結</button><pre>${escapeHTML(svg)}</pre></div>
      <div class="code-block"><button class="copy-button" type="button" data-copy='${escapeHTML(jsx)}'>複製 JSX</button><pre>${escapeHTML(jsx)}</pre></div>
    </div>`;
  dialog.showModal();
  try {
    const collections = await getCollectionMeta();
    const data = collections[icon.prefix] || {};
    const license = data.license || {};
    const author = data.author || {};
    const source = author.url || `https://icon-sets.iconify.design/${encodeURIComponent(icon.prefix)}/`;
    const licenseName = license.title || license.spdx || '請查看原始圖示集授權';
    const authorText = author.name ? `作者：${escapeHTML(author.name)}。` : '';
    const licenseURL = license.url || source;
    const licenseBox = dialogContent.querySelector('.license');
    licenseBox.innerHTML = `${authorText}授權：<a href="${escapeHTML(licenseURL)}" target="_blank" rel="noreferrer">${escapeHTML(licenseName)} ↗</a>。使用前請確認完整授權條款及是否需要署名。`;
  } catch (error) {
    dialogContent.querySelector('.license').innerHTML = '無法載入授權 metadata；請開啟 <a href="https://icon-sets.iconify.design/" target="_blank" rel="noreferrer">Iconify 圖示集清單 ↗</a>確認授權。';
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); search(input.value); });
document.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => search(button.dataset.query)));
grid.addEventListener('click', (event) => {
  const card = event.target.closest('[data-index]');
  if (card) openIcon(state.icons[Number(card.dataset.index)]);
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
  const button = event.target.closest('[data-copy]');
  if (button) copyText(button.dataset.copy);
});
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());

const initialQuery = new URLSearchParams(window.location.search).get('q');
if (initialQuery) search(initialQuery);
