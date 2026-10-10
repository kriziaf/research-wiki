/* ============================================================
   Research Wiki — Search / Retrieve / View Article (MVP1)
   Data: window.WIKI_INDEX from data/wiki-index.js (manual snapshot,
   see scripts/snapshot-wiki.mjs and PHASE1_PLAN.md "MVP 1" section).
   Ingest is explicitly out of scope here.
   ============================================================ */

(function () {
  var DOCS = window.WIKI_INDEX || [];
  var titleIndex = {};
  DOCS.forEach(function (d) { titleIndex[d.title.toLowerCase()] = d; });
  var docById = {};
  DOCS.forEach(function (d) { docById[d.id] = d; });

  var app = document.getElementById('research-app');
  var layout = document.getElementById('rw-article-layout');
  var stack = []; // navigation history within the overlay: {screen, query?, id?}

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

  function renderTryChips() {
    var picks = [];
    ['concept', 'entity', 'project'].forEach(function (type) {
      var match = DOCS.filter(function (d) { return d.type === type; }).slice(0, 2);
      picks = picks.concat(match);
    });
    var wrap = el('rw-try-chips');
    wrap.innerHTML = picks.map(function (d) {
      return '<button type="button" class="rw-chip" data-try="' + d.id + '">' +
        '<span class="rw-type-dot ' + d.type + '"></span><span>' + escapeHtml(d.title) + '</span></button>';
    }).join('');
    wrap.querySelectorAll('[data-try]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el('rw-input').value = docById[btn.dataset.try].title;
        runSearch(docById[btn.dataset.try].title);
      });
    });
  }

  function runSearch(query) {
    query = query.trim();
    if (!query) {
      el('rw-hint').textContent = 'Enter a search term.';
      return;
    }
    el('rw-hint').textContent = '';
    var results = search(query);
    stack = [{ screen: 'results', query: query }];
    renderResults(query, results);
    showScreen('results');
  }

  function renderResults(query, results) {
    el('rw-results-query').textContent = '"' + query + '"';
    el('rw-results-count').textContent = results.length + ' result' + (results.length === 1 ? '' : 's');
    var list = el('rw-results-list');
    if (!results.length) {
      list.innerHTML = '<div class="rw-empty"><strong>No matches</strong>Try a different term, or one of the type names: concept, entity, project.</div>';
      return;
    }
    list.innerHTML = results.map(function (d) {
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

  function openArticle(id, pushToStack) {
    var doc = docById[id];
    if (!doc) return;
    if (pushToStack) stack.push({ screen: 'article', id: id });
    closePane();

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
    if (prev.screen === 'results') {
      renderResults(prev.query, search(prev.query));
      showScreen('results');
    } else if (prev.screen === 'article') {
      openArticle(prev.id, false);
    }
  }

  /* ---------------- init ---------------- */

  function wire() {
    el('rw-doc-count').textContent = DOCS.length + ' documents indexed';
    renderTryChips();

    el('rw-send').addEventListener('click', function () { runSearch(el('rw-input').value); });
    el('rw-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runSearch(e.target.value);
    });
    el('rw-new-search').addEventListener('click', function () {
      el('rw-input').value = '';
      stack = [];
      showScreen('search');
    });
    el('rw-back').addEventListener('click', goBack);
    el('rw-pane-backdrop').addEventListener('click', closePane);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && layout.classList.contains('pane-open')) closePane();
    });

    el('rw-input').focus();
  }

  wire();
})();
