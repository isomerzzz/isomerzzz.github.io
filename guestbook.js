const guestbook = document.querySelector('[data-guestbook]');

if (guestbook) {
  const endpoint = guestbook.dataset.api;
  const form = guestbook.querySelector('form');
  const message = form.elements.namedItem('message');
  const submit = form.querySelector('[type="submit"]');
  const feedback = guestbook.querySelector('.guestbook-feedback');
  const state = guestbook.querySelector('.guestbook-state');
  const retry = guestbook.querySelector('.guestbook-retry');
  const list = guestbook.querySelector('.guestbook-list');
  const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
  const comments = new Map();

  async function request(options) {
    const response = await fetch(endpoint, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
      ...options,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '留言服务暂时不可用，请稍后再试。');
    }
    return data;
  }

  function renderComments() {
    const recent = [...comments.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    const entries = recent.map(({ nickname, message, createdAt }) => {
      const entry = document.createElement('li');
      const meta = document.createElement('div');
      const name = document.createElement('strong');
      const time = document.createElement('time');
      const body = document.createElement('p');

      entry.className = 'guestbook-entry';
      meta.className = 'guestbook-meta';
      name.textContent = nickname;
      time.dateTime = createdAt;
      time.textContent = dateFormat.format(new Date(createdAt));
      body.textContent = message;
      meta.append(name, time);
      entry.append(meta, body);
      return entry;
    });

    list.replaceChildren(...entries);
    state.hidden = entries.length > 0;
    state.textContent = entries.length ? '' : '还没有留言。';
  }

  async function loadComments() {
    state.hidden = false;
    state.textContent = '正在读取留言…';
    retry.hidden = true;
    try {
      const data = await request();
      for (const comment of data.comments) comments.set(comment.id, comment);
      renderComments();
    } catch {
      state.hidden = false;
      state.textContent = '暂时无法读取留言。';
      retry.hidden = false;
    }
  }

  if (endpoint) {
    submit.disabled = false;
    retry.addEventListener('click', loadComments);
    loadComments();
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;

      const data = Object.fromEntries(new FormData(form));
      feedback.removeAttribute('data-error');
      if (!message.value.trim()) {
        feedback.setAttribute('data-error', '');
        feedback.textContent = '请填写留言内容。';
        message.focus();
        return;
      }

      submit.disabled = true;
      feedback.textContent = '正在发送…';
      try {
        const { comment } = await request({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        comments.set(comment.id, comment);
        renderComments();
        form.reset();
        feedback.textContent = '留言已发布。';
      } catch (error) {
        feedback.setAttribute('data-error', '');
        feedback.textContent = error.constructor === Error
          ? error.message
          : '发送失败，请稍后再试。';
      } finally {
        submit.disabled = false;
      }
    });
  } else {
    state.textContent = '留言服务暂未开放。';
  }
}
