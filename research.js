/* ============================================================
   Research Wiki — Search / Retrieve / View Article (MVP1)
   Data: window.WIKI_INDEX from data/wiki-index.js (manual snapshot,
   see scripts/snapshot-wiki.mjs and spec/PHASE1_PLAN.md "MVP 1" section).
   Ingest is explicitly out of scope here.
   ============================================================ */

(function () {
  // Single source of truth for the footer's "Research Wiki Chat vX.Y.Z" label.
  // Bump this when spec/PHASE1_PLAN.md records a new version — nothing else to touch.
  var APP_VERSION = '0.4.1';

  var DOCS = window.WIKI_INDEX || [];
  var titleIndex = {};
  DOCS.forEach(function (d) { titleIndex[d.title.toLowerCase()] = d; });
  var docById = {};
  DOCS.forEach(function (d) { docById[d.id] = d; });

  var app = document.getElementById('research-app');
  var layout = document.getElementById('rw-article-layout');
  var askLayout = document.getElementById('rw-ask-layout');
  var stack = []; // navigation history within the overlay: {screen, query?, id?}
  var currentArticleId = null;

  function el(id) { return document.getElementById(id); }

  function findDocByTitle(title) {
    return titleIndex[title.trim().toLowerCase()];
  }

  /* ---------------- search ---------------- */

  function search(query) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var scored = DOCS.map(function (d) {
      var title = d.title.toLowerCase();
      var tags = d.tags.join(' ').toLowerCase();
      var body = d.body.toLowerCase();
      var score = 0;
      terms.forEach(function (t) {
        if (title === t) score += 12;
        else if (title.indexOf(t) !== -1) score += 8;
        if (tags.indexOf(t) !== -1) score += 5;
        if (d.type.toLowerCase() === t) score += 4;
        if (body.indexOf(t) !== -1) score += 1;
      });
      return { doc: d, score: score };
    });
    return scored
      .filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 25)
      .map(function (s) { return s.doc; });
  }

  function previewParagraphs(body, count) {
    var stripped = body.replace(/^#\s+.+\n+/, '');
    var lines = stripped.split(/\r?\n/);
    var paras = [];
    var buffer = [];
    function flush() {
      if (buffer.length) { paras.push(buffer.join(' ')); buffer = []; }
    }
    for (var i = 0; i < lines.length && paras.length < count; i++) {
      var line = lines[i];
      if (/^(#{2,4})\s+/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        flush();
        continue;
      }
      if (line.trim() === '') { flush(); continue; }
      buffer.push(line.trim());
    }
    flush();
    return paras.slice(0, count);
  }

  function snippet(doc, len) {
    var plain = doc.body
      .replace(/^#\s+.+$/m, '')
      .replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, function (_, t, alias) { return alias ? alias.slice(1) : t; })
      .replace(/[#*_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > len ? plain.slice(0, len).replace(/\s+\S*$/, '') + '…' : plain;
  }

  /* ---------------- markdown rendering ---------------- */

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderInline(raw) {
    var t = escapeHtml(raw);
    t = t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, function (_, target, alias) {
      var label = (alias || target).trim();
      var doc = findDocByTitle(target.trim());
      if (doc) {
        return '<button type="button" class="wikilink" data-id="' + doc.id + '">' + label + '</button>';
      }
      return '<span class="wikilink-unresolved">' + label + '</span>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    return t;
  }

  function renderMarkdown(body) {
    var stripped = body.replace(/^#\s+.+\n+/, '');
    var lines = stripped.split(/\r?\n/);
    var html = '';
    var listBuffer = null;
    var paraBuffer = [];

    function flushList() {
      if (listBuffer) {
        var tag = listBuffer.type;
        html += '<' + tag + '>' + listBuffer.items.map(function (it) {
          return '<li>' + renderInline(it) + '</li>';
        }).join('') + '</' + tag + '>';
        listBuffer = null;
      }
    }
    function flushPara() {
      if (paraBuffer.length) {
        html += '<p>' + renderInline(paraBuffer.join(' ')) + '</p>';
        paraBuffer = [];
      }
    }

    lines.forEach(function (line) {
      var h = line.match(/^(#{2,4})\s+(.*)$/);
      var li = line.match(/^[-*]\s+(.*)$/);
      var ol = line.match(/^\d+\.\s+(.*)$/);
      if (h) {
        flushPara(); flushList();
        var level = h[1].length;
        html += '<h' + level + '>' + renderInline(h[2]) + '</h' + level + '>';
      } else if (li) {
        flushPara();
        if (!listBuffer || listBuffer.type !== 'ul') { flushList(); listBuffer = { type: 'ul', items: [] }; }
        listBuffer.items.push(li[1]);
      } else if (ol) {
        flushPara();
        if (!listBuffer || listBuffer.type !== 'ol') { flushList(); listBuffer = { type: 'ol', items: [] }; }
        listBuffer.items.push(ol[1]);
      } else if (line.trim() === '') {
        flushPara(); flushList();
      } else {
        paraBuffer.push(line.trim());
      }
    });
    flushPara(); flushList();
    return html;
  }

  /* ---------------- screens ---------------- */

  function showScreen(name) {
    app.dataset.screen = name;
    app.querySelector('main').scrollTop = 0;
    window.scrollTo(0, 0);
  }

  var RECOMMENDED_TOPICS = [
    { id: 'concepts/civic.ai-6-pack-of-care', question: 'What is the Civic.ai 6-Pack of Care?' },
    { id: 'projects/smol-gardens', question: 'Who maintains Smol Gardens?' },
    { id: 'concepts/llm-wiki-pattern', question: 'RAG vs. the LLM wiki pattern' },
    { id: 'concepts/accountable-ai', question: 'What is Accountable AI?' },
    { id: 'entities/betanyc', question: 'Who is BetaNYC?' },
    { id: 'concepts/vibecoding-risks-and-accountability', question: 'Risks of vibecoding in civic tech' }
  ];

  function renderTryChips() {
    var picks = RECOMMENDED_TOPICS
      .map(function (t) { return { doc: docById[t.id], question: t.question }; })
      .filter(function (p) { return p.doc; });
    var wrap = el('rw-try-chips');
    wrap.innerHTML = picks.map(function (p) {
      return '<button type="button" class="rw-chip" data-try="' + p.doc.id + '" data-question="' + escapeHtml(p.question) + '">' +
        '<span class="rw-type-dot ' + p.doc.type + '"></span><span>' + escapeHtml(p.question) + '</span></button>';
    }).join('');
    wrap.querySelectorAll('[data-try]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el('rw-input').value = btn.dataset.question;
        askQuery(btn.dataset.question, true, btn.dataset.try);
      });
    });
  }

  function findRelated(doc) {
    var tagSet = {};
    doc.tags.forEach(function (t) { tagSet[t] = true; });
    var scored = DOCS.filter(function (d) { return d.id !== doc.id; }).map(function (d) {
      var score = 0;
      d.tags.forEach(function (t) { if (tagSet[t]) score += 3; });
      if (d.type === doc.type) score += 1;
      return { doc: d, score: score };
    });
    return scored
      .filter(function (s) { return s.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 12)
      .map(function (s) { return s.doc; });
  }

  function showRelated(doc) {
    stack.push({ screen: 'related', id: doc.id });
    renderRelated(doc, findRelated(doc));
    showScreen('related');
  }

  function renderRelated(doc, related) {
    el('rw-results-query').textContent = 'Related to "' + doc.title + '"';
    el('rw-results-count').textContent = related.length + ' related article' + (related.length === 1 ? '' : 's');
    var list = el('rw-results-list');
    if (!related.length) {
      list.innerHTML = '<div class="rw-empty"><strong>No related articles</strong>No other documents share tags with this one yet.</div>';
      return;
    }
    list.innerHTML = related.map(function (d) {
      return '<button type="button" class="rw-result-card" data-open="' + d.id + '">' +
        '<div class="rw-result-top"><span class="rw-type-dot ' + d.type + '"></span><span class="rw-result-type">' + d.type + ' · ' + d.id + '.md</span></div>' +
        '<div class="rw-result-title">' + escapeHtml(d.title) + '</div>' +
        '<div class="rw-result-snippet">' + escapeHtml(snippet(d, 150)) + '</div>' +
        '<div class="rw-result-tags">' + d.tags.map(function (t) { return '<span class="rw-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
        '</button>';
    }).join('');
    list.querySelectorAll('[data-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openArticle(btn.dataset.open, true); });
    });
  }

  /* ---------------- recent search history ---------------- */

  var RECENT_KEY = 'rw-recent-queries';

  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveRecent(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); }
    catch (e) { /* ignore (e.g. private browsing) */ }
  }

  function addRecent(query) {
    var list = loadRecent().filter(function (q) { return q.toLowerCase() !== query.toLowerCase(); });
    list.unshift(query);
    saveRecent(list.slice(0, 3));
    renderRecentChips();
  }

  function renderRecentChips() {
    var list = loadRecent();
    var section = el('rw-recent-section');
    if (!list.length) { section.style.display = 'none'; return; }
    section.style.display = '';
    var wrap = el('rw-recent-chips');
    wrap.innerHTML = list.map(function (q, i) {
      return '<button type="button" class="rw-chip recent" data-recent-index="' + i + '">' +
        '<svg class="rw-chip-icon" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2" stroke-linecap="round"/></svg>' +
        '<span class="rw-chip-text">' + escapeHtml(q) + '</span>' +
        '<span class="rw-chip-dismiss" data-dismiss-index="' + i + '">' +
        '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>' +
        '</span></button>';
    }).join('');
    wrap.querySelectorAll('[data-recent-index]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = loadRecent()[Number(btn.dataset.recentIndex)];
        if (!q) return;
        el('rw-input').value = q;
        askQuery(q, true);
      });
    });
    wrap.querySelectorAll('[data-dismiss-index]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var list = loadRecent();
        list.splice(Number(btn.dataset.dismissIndex), 1);
        saveRecent(list);
        renderRecentChips();
      });
    });
  }

  function buildAskResults(query, pinnedId) {
    var pinned = pinnedId ? docById[pinnedId] : null;
    var rest = search(query).filter(function (d) { return !pinned || d.id !== pinned.id; });
    return pinned ? [pinned].concat(rest) : rest;
  }

  function askQuery(query, fresh, pinnedId) {
    query = query.trim();
    if (!query) {
      el('rw-hint').textContent = 'Enter a question.';
      return;
    }
    el('rw-hint').textContent = '';
    addRecent(query);
    var results = buildAskResults(query, pinnedId);
    var entry = { screen: 'ask', query: query, pinnedId: pinnedId || null };
    if (fresh) stack = [entry]; else stack.push(entry);
    renderAsk(query, results);
    showScreen('ask');
  }

  function topicQuestion(doc) {
    if (/^(what|who|how|why|where|when|which)\b/i.test(doc.title)) return doc.title;
    return (doc.type === 'entity' ? 'Who is ' : 'What is ') + doc.title + '?';
  }

  function renderAsk(query, results) {
    closeAskPane();
    el('rw-ask-question').textContent = query;
    var top = results[0];
    var sourcesChip = el('rw-ask-sources');
    var body = el('rw-ask-body');
    var continueBtn = el('rw-ask-continue');
    var topicsRow = el('rw-ask-followup-topics');

    if (!top) {
      sourcesChip.style.display = 'none';
      body.innerHTML = '<p class="rw-empty-inline">No matches in the wiki yet. Try a different term, or one of the type names: concept, entity, project.</p>';
      continueBtn.textContent = '';
      topicsRow.innerHTML = '';
      return;
    }

    var sourceDocs = results.slice(0, 4);
    var dotStack = sourceDocs.slice(0, 3).map(function (d) {
      return '<span class="rw-type-dot ' + d.type + '"></span>';
    }).join('');
    var names = sourceDocs.slice(0, 2).map(function (d) { return d.title; }).join(', ');
    var extra = results.length > 2 ? ' +' + (results.length - 2) + ' more' : '';

    sourcesChip.style.display = '';
    sourcesChip.innerHTML =
      '<span class="rw-dot-stack">' + dotStack + '</span>' +
      '<span>Sources: ' + escapeHtml(names) + escapeHtml(extra) + '</span>' +
      '<svg class="rw-sources-chip-chevron" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 5l5 5-5 5"/></svg>';
    sourcesChip.onclick = function () { openAskPreview(top.id); };

    var preview = previewParagraphs(top.body, 2);
    if (!preview.length) preview = [snippet(top, 240)];
    body.innerHTML = preview.map(function (p) { return '<p>' + renderInline(p) + '</p>'; }).join('');
    body.querySelectorAll('.wikilink').forEach(function (btn) {
      btn.addEventListener('click', function () { openAskPreview(btn.dataset.id); });
    });

    continueBtn.textContent = 'Continue reading "' + top.title + '" →';
    continueBtn.onclick = function () { openArticle(top.id, true); };

    var topics = findRelated(top).slice(0, 3);
    topicsRow.innerHTML = topics.map(function (d) {
      return '<button type="button" class="rw-suggestion-chip" data-topic="' + d.id + '">' + escapeHtml(topicQuestion(d)) + '</button>';
    }).join('');
    topicsRow.querySelectorAll('[data-topic]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        askQuery(topicQuestion(docById[btn.dataset.topic]), false, btn.dataset.topic);
      });
    });
  }

  function openAskPreview(id) {
    var doc = docById[id];
    if (!doc) return;
    el('rw-ask-preview').innerHTML =
      '<div class="rw-preview-head"><span class="rw-preview-tag">' + doc.type + ' · ' + doc.id + '.md</span>' +
      '<button type="button" class="rw-preview-close" id="rw-ask-preview-close" aria-label="Close">' +
      '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg></button></div>' +
      '<h4>' + escapeHtml(doc.title) + '</h4>' +
      '<div class="rw-preview-meta">tags: ' + escapeHtml(doc.tags.join(', ')) + (doc.updated ? '<br>updated: ' + doc.updated : '') + '</div>' +
      '<div class="rw-preview-snippet">' + escapeHtml(snippet(doc, 220)) + '</div>' +
      '<button type="button" class="rw-preview-open" id="rw-ask-preview-open">Open full document →</button>';

    el('rw-ask-preview-close').addEventListener('click', closeAskPane);
    el('rw-ask-preview-open').addEventListener('click', function () { openArticle(id, true); });

    askLayout.classList.add('pane-open');
  }

  function closeAskPane() {
    askLayout.classList.remove('pane-open');
  }

  function openArticle(id, pushToStack) {
    var doc = docById[id];
    if (!doc) return;
    if (pushToStack) stack.push({ screen: 'article', id: id });
    closePane();
    currentArticleId = id;

    el('rw-article-meta').innerHTML =
      '<span class="rw-article-type">' + doc.type + '</span><span>' + doc.id + '.md</span>' +
      (doc.updated ? '<span>updated ' + doc.updated + '</span>' : '');
    el('rw-article-title').textContent = doc.title;
    el('rw-article-tags').innerHTML = doc.tags.map(function (t) {
      return '<span class="rw-tag">' + escapeHtml(t) + '</span>';
    }).join('');
    el('rw-article-body').innerHTML = renderMarkdown(doc.body);

    el('rw-article-body').querySelectorAll('.wikilink').forEach(function (btn) {
      btn.addEventListener('click', function () { openPreview(btn.dataset.id); });
    });

    showScreen('article');
  }

  function openPreview(id) {
    var doc = docById[id];
    if (!doc) return;
    el('rw-preview').innerHTML =
      '<div class="rw-preview-head"><span class="rw-preview-tag">' + doc.type + ' · ' + doc.id + '.md</span>' +
      '<button type="button" class="rw-preview-close" id="rw-preview-close" aria-label="Close">' +
      '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg></button></div>' +
      '<h4>' + escapeHtml(doc.title) + '</h4>' +
      '<div class="rw-preview-meta">tags: ' + escapeHtml(doc.tags.join(', ')) + (doc.updated ? '<br>updated: ' + doc.updated : '') + '</div>' +
      '<div class="rw-preview-snippet">' + escapeHtml(snippet(doc, 220)) + '</div>' +
      '<button type="button" class="rw-preview-open" id="rw-preview-open">Open full document →</button>';

    el('rw-preview-close').addEventListener('click', closePane);
    el('rw-preview-open').addEventListener('click', function () { openArticle(id, true); });

    layout.classList.add('pane-open');
  }

  function closePane() {
    layout.classList.remove('pane-open');
  }

  function goBack() {
    stack.pop();
    var prev = stack[stack.length - 1];
    if (!prev) { showScreen('search'); return; }
    if (prev.screen === 'related') {
      var relatedDoc = docById[prev.id];
      renderRelated(relatedDoc, findRelated(relatedDoc));
      showScreen('related');
    } else if (prev.screen === 'ask') {
      renderAsk(prev.query, buildAskResults(prev.query, prev.pinnedId));
      showScreen('ask');
    } else if (prev.screen === 'article') {
      openArticle(prev.id, false);
    }
  }

  /* ---------------- init ---------------- */

  function wire() {
    el('rw-doc-count').textContent = DOCS.length + ' documents indexed';
    el('rw-footer-version').textContent = 'Research Wiki Chat v' + APP_VERSION;
    renderTryChips();
    renderRecentChips();

    el('rw-send').addEventListener('click', function () { askQuery(el('rw-input').value, true); });
    el('rw-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') askQuery(e.target.value, true);
    });
    el('rw-related-back').addEventListener('click', goBack);
    el('rw-back').addEventListener('click', goBack);
    el('rw-pane-backdrop').addEventListener('click', closePane);
    el('rw-view-related').addEventListener('click', function () {
      showRelated(docById[currentArticleId]);
    });

    el('rw-ask-back').addEventListener('click', goBack);
    el('rw-new-question').addEventListener('click', function () {
      el('rw-input').value = '';
      stack = [];
      showScreen('search');
      el('rw-input').focus();
    });
    el('rw-ask-pane-backdrop').addEventListener('click', closeAskPane);
    el('rw-followup-send').addEventListener('click', function () {
      askQuery(el('rw-followup-input').value, false);
      el('rw-followup-input').value = '';
    });
    el('rw-followup-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        askQuery(e.target.value, false);
        e.target.value = '';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (layout.classList.contains('pane-open')) closePane();
      if (askLayout.classList.contains('pane-open')) closeAskPane();
    });

    el('rw-input').focus();
  }

  wire();
})();
