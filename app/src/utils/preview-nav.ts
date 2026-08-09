export function buildPreviewNav(): string {
  return `<div id="pier-preview-nav" class="pier-collapsed" style="position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:8px;padding:8px;background:rgba(255,255,255,0.95);border:1px solid rgba(0,0,0,0.1);border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,0.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:-apple-system,'Microsoft YaHei','PingFang SC',sans-serif;transition:all 0.25s ease;">
  <button type="button" id="pier-nav-toggle" title="展开/收起" aria-label="展开/收起导航" style="display:none;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border:none;border-radius:999px;background:#333;color:#fff;font-size:16px;cursor:pointer;flex-shrink:0;">☰</button>
  <button type="button" id="pier-nav-home" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border:none;border-radius:999px;background:#ff6b9d;color:#fff;font-size:14px;cursor:pointer;">🏠 返回首页</button>
  <button type="button" id="pier-nav-copy" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border:1px solid rgba(0,0,0,0.12);border-radius:999px;background:#fff;color:#333;font-size:14px;cursor:pointer;">📋 复制地址</button>
  <button type="button" id="pier-nav-print" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border:none;border-radius:999px;background:#1a73e8;color:#fff;font-size:14px;cursor:pointer;">🖨 打印</button>
</div>
<style>
@media print {
  #pier-preview-nav { display: none !important; }
}
@media (max-width: 640px) {
  #pier-preview-nav {
    top: 50%;
    left: auto;
    right: 0;
    transform: translateY(-50%);
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 6px;
    border-radius: 999px 0 0 999px;
  }
  #pier-nav-toggle {
    display: inline-flex;
  }
  #pier-preview-nav:not(.pier-open) .pier-nav-action {
    display: none;
  }
}
</style>
<script>
(function() {
  var nav = document.getElementById('pier-preview-nav');
  if (!nav) return;
  var toggle = document.getElementById('pier-nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var open = nav.classList.toggle('pier-open');
      toggle.textContent = open ? '✕' : '☰';
    });
  }
  var home = document.getElementById('pier-nav-home');
  var copy = document.getElementById('pier-nav-copy');
  var printBtn = document.getElementById('pier-nav-print');
  if (home) home.addEventListener('click', function() { window.location.href = '/'; });
  if (copy) {
    copy.addEventListener('click', function() {
      var done = function() {
        var original = copy.textContent;
        copy.textContent = '✅ 已复制';
        setTimeout(function() { copy.textContent = original; }, 1600);
      };
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = window.location.href;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(done, fallback);
      } else {
        fallback();
      }
    });
  }
  if (printBtn) printBtn.addEventListener('click', function() { window.print(); });
})();
</script>`;
}
