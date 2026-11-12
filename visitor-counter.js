(() => {
  const endpoint = document.currentScript?.dataset.visitorApi;
  if (!endpoint) return;

  const widget = document.querySelector('[data-visitor-counter]');
  const visitorKey = 'personal-site-visitor';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  function readVisitor() {
    try {
      const saved = JSON.parse(localStorage.getItem(visitorKey));
      if (saved && uuid.test(saved.id)) return saved;
      const visitor = { id: crypto.randomUUID(), counted: false };
      localStorage.setItem(visitorKey, JSON.stringify(visitor));
      return visitor;
    } catch {
      return null;
    }
  }

  async function request(visitorId) {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
      ...(visitorId && {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      }),
    });
    if (!response.ok) throw new Error('Visitor count unavailable');
    const data = await response.json();
    if (!Number.isSafeInteger(data.total) || data.total < 0 || typeof data.historicalIncluded !== 'boolean') {
      throw new Error('Invalid visitor count');
    }
    return data;
  }

  function display({ total }) {
    if (!widget) return;
    widget.querySelector('[data-visitor-total]').textContent = new Intl.NumberFormat('zh-CN').format(total);
  }

  async function update() {
    const visitor = navigator.locks
      ? await navigator.locks.request(visitorKey, readVisitor)
      : readVisitor();

    if (visitor && !visitor.counted) {
      const data = await request(visitor.id).catch(() => null);
      if (data) {
        try {
          localStorage.setItem(visitorKey, JSON.stringify({ id: visitor.id, counted: true }));
        } catch {
          // Retrying with the same stored ID is safe if this write fails.
        }
        display(data);
        return;
      }
    }

    if (widget) display(await request());
  }

  update().catch(() => {
    if (!widget) return;
    const total = widget.querySelector('[data-visitor-total]');
    total.dataset.unavailable = '';
    total.textContent = '暂时无法读取访客数';
  });
})();
