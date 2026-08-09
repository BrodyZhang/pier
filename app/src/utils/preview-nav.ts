export function buildPreviewNav(): string {
  return `<div id="pier-preview-nav" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:8px;padding:8px;background:rgba(255,255,255,0.95);border:1px solid rgba(0,0,0,0.1);border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,0.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:-apple-system,'Microsoft YaHei','PingFang SC',sans-serif;">
  <button type="button" id="pier-nav-home" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 18px;border:none;border-radius:999px;background:#ff6b9d;color:#fff;font-size:14px;cursor:pointer;">主页</button>
  <button type="button" id="pier-nav-copy" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 18px;border:1px solid rgba(0,0,0,0.12);border-radius:999px;background:#fff;color:#333;font-size:14px;cursor:pointer;">复制</button>
  <button type="button" id="pier-nav-print" class="pier-nav-action" style="display:inline-flex;align-items:center;gap:4px;padding:8px 18px;border:none;border-radius:999px;background:#1a73e8;color:#fff;font-size:14px;cursor:pointer;">打印</button>
</div>
<style>
@media print {
  #pier-preview-nav { display: none !important; }
}
@media (max-width: 640px) {
  #pier-preview-nav {
    left: 12px;
    right: 12px;
    transform: none;
    bottom: 12px;
  }
  #pier-preview-nav .pier-nav-action {
    flex: 1;
    justify-content: center;
  }
}
</style>
<script>
(function() {
  var nav = document.getElementById('pier-preview-nav');
  if (!nav) return;
  var home = document.getElementById('pier-nav-home');
  var copy = document.getElementById('pier-nav-copy');
  var printBtn = document.getElementById('pier-nav-print');
  if (home) home.addEventListener('click', function() { window.location.href = '/'; });
  if (copy) {
    copy.addEventListener('click', function() {
      var done = function() {
        var original = copy.textContent;
        copy.textContent = '已复制';
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
