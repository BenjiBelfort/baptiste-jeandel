// Auto-init : attache le comportement à tous les éléments [data-back-link]
(() => {
  const els = document.querySelectorAll('[data-back-link]');
  els.forEach((el) => {
    const fallback = el.getAttribute('data-fallback') || '/';

    function goBack() {
      // 1) S'il y a un historique, on tente
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      // 2) Paramètre ?from=/xxx
      const from = new URLSearchParams(window.location.search).get('from');
      if (from && from.startsWith('/')) {
        window.location.href = from;
        return;
      }
      // 3) Referrer interne (si dispo)
      try {
        const ref = document.referrer;
        if (ref && new URL(ref).origin === window.location.origin) {
          window.location.href = ref;
          return;
        }
      } catch {}
      // 4) Fallback
      window.location.href = fallback;
    }

    el.addEventListener('click', (e) => {
      e.preventDefault();
      goBack();
    });
  });
})();
