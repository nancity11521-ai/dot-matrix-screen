/* 接入点：在现有网页脚本后加载。须在服务部署验证成功后才接入公开页面。 */
(() => {
  const API = 'https://nancity-dot-matrix-sync.plumtitan1.chatgpt.site';
  const TOKEN_KEY = 'DOT_MATRIX_ADMIN_SESSION';
  const CACHE_KEY = 'DOT_MATRIX_GLOBAL_DELETED_IDS';
  let removed = new Set();
  let syncing = false;
  try { removed = new Set(JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')); } catch {}
  const loadLocal = loadAnimationsFromStorage;
  loadAnimationsFromStorage = function () {
    loadLocal();
    ALL_ANIMATIONS = ALL_ANIMATIONS.filter(a => !removed.has(a.id));
  };
  function refresh() {
    initUI();
    selectAnimation(state.currentAnim);
  }
  async function sync() {
    if (syncing) return;
    syncing = true;
    try {
      const response = await fetch(API + '/api/deletions', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('同步失败');
      const data = await response.json();
      if (!Array.isArray(data.deletedIds) || !data.deletedIds.every(id => typeof id === 'string')) throw new Error('清单无效');
      const before = [...removed].sort().join(',');
      removed = new Set(data.deletedIds);
      localStorage.setItem(CACHE_KEY, JSON.stringify([...removed]));
      if (before !== [...removed].sort().join(',')) refresh();
    } catch (error) {
      // 暂时离线时使用上次成功读取的清单，不把失败请求当作空清单。
      console.warn('全站删除清单暂未更新', error.message);
    } finally { syncing = false; }
  }
  async function adminToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) token = prompt('输入管理员密钥后，才可删除全站动画。普通访客无需填写。');
    if (!token) return null;
    const response = await fetch(API + '/api/admin', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) { sessionStorage.removeItem(TOKEN_KEY); throw new Error('管理员验证失败'); }
    sessionStorage.setItem(TOKEN_KEY, token);
    return token;
  }
  const deleteLocal = confirmDeleteAnimation;
  confirmDeleteAnimation = async function (id) {
    const animation = ALL_ANIMATIONS.find(a => a.id === id);
    if (!animation) return;
    // 自建作品仅存在本机，不写入全站内置动画删除清单。
    if (!DEFAULT_ANIMATIONS.some(a => a.id === id)) return deleteLocal(id);
    try {
      const token = await adminToken();
      if (!token || !confirm(`删除【${animation.name}】后，所有访客都将停止显示该动画。确定删除吗？`)) return;
      const response = await fetch(API + '/api/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ id }), signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('云端保存失败，未完成全站删除');
      removed.add(id);
      localStorage.setItem(CACHE_KEY, JSON.stringify([...removed]));
      pendingModifications.delete(id);
      savePendingStorage();
      closeAnimationEditor();
      refresh();
      showToast('已从全站删除，其他页面将在约 5 秒内同步');
    } catch (error) { showToast(error.message); }
  };
  refresh();
  sync();
  setInterval(() => { if (!document.hidden) sync(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
})();
