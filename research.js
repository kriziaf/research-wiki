/* ============================================================
   Smol Wiki — Search / Retrieve / View Article (MVP1)
   Data: window.WIKI_INDEX from data/wiki-index.js (manual snapshot,
   see scripts/snapshot-wiki.mjs and spec/PHASE1_PLAN.md "MVP 1" section).
   Ingest is explicitly out of scope here.
   ============================================================ */

(function () {
  // Single source of truth for the footer's "Smol Wiki Chat vX.Y.Z" label.
  // Bump this when spec/PHASE1_PLAN.md records a new version — nothing else to touch.
  var APP_VERSION = '0.7.1';

  var DOCS = window.WIKI_INDEX || [];
  var titleIndex = {};
  DOCS.forEach(function (d) { titleIndex[d.title.toLowerCase()] = d; });
  var docById = {};
  DOCS.forEach(function (d) { docById[d.id] = d; });

  // Symmetric [[wikilink]] adjacency: an author connecting A to B is evidence
  // both ways are "related," regardless of which page did the linking.
  var wikilinkGraph = {};
  DOCS.forEach(function (d) { wikilinkGraph[d.id] = {}; });
  DOCS.forEach(function (d) {
    var matches = d.body.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
    matches.forEach(function (m) {
      var target = m.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
      var targetDoc = titleIndex[target.toLowerCase()];
      if (targetDoc && targetDoc.id !== d.id) {
        wikilinkGraph[d.id][targetDoc.id] = true;
        wikilinkGraph[targetDoc.id][d.id] = true;
      }
    });
  });

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

  /* ---------------- autocomplete ---------------- */

  var autocompleteDocs = [];
  var autocompleteActiveIndex = -1;

  function renderAutocomplete(query) {
    var dropdown = el('rw-autocomplete');
    var q = query.trim();
    autocompleteActiveIndex = -1;
    if (!q) {
      autocompleteDocs = [];
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    autocompleteDocs = search(q).slice(0, 6);
    if (!autocompleteDocs.length) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    dropdown.innerHTML = autocompleteDocs.map(function (d, i) {
      return '<button type="button" class="rw-autocomplete-item" data-index="' + i + '">' +
        '<span class="rw-type-dot ' + d.type + '"></span>' +
        '<span>' + escapeHtml(d.title) + '</span>' +
        '</button>';
    }).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.rw-autocomplete-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectAutocompleteDoc(autocompleteDocs[Number(btn.dataset.index)]);
      });
    });
  }

  function closeAutocomplete() {
    autocompleteDocs = [];
    autocompleteActiveIndex = -1;
    el('rw-autocomplete').style.display = 'none';
    el('rw-autocomplete').innerHTML = '';
  }

  function setAutocompleteActive(index) {
    var items = el('rw-autocomplete').querySelectorAll('.rw-autocomplete-item');
    if (!items.length) return;
    autocompleteActiveIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === autocompleteActiveIndex);
    });
  }

  function selectAutocompleteDoc(doc) {
    closeAutocomplete();
    el('rw-input').value = topicQuestion(doc);
    askQuery(topicQuestion(doc), true, doc.id);
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
    { id: 'concepts/critical-ai-literacy', question: 'What is Critical AI Literacy?' }
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
    var linked = wikilinkGraph[doc.id] || {};
    var scored = DOCS.filter(function (d) { return d.id !== doc.id; }).map(function (d) {
      var score = 0;
      d.tags.forEach(function (t) { if (tagSet[t]) score += 3; });
      if (d.type === doc.type) score += 1;
      return { doc: d, score: score, isLinked: !!linked[d.id] };
    });
    var linkedResults = scored.filter(function (s) { return s.isLinked; });
    // Prefer real [[wikilink]] connections over coincidental tag overlap;
    // only fall back to tag-overlap when a page has no wikilinked pages at all.
    var pool = linkedResults.length ? linkedResults : scored.filter(function (s) { return s.score > 0; });
    return pool
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 12)
      .map(function (s) { return s.doc; });
  }

  function showRelated(doc) {
    var entry = { screen: 'related', id: doc.id };
    stack.push(entry);
    renderRelated(doc, findRelated(doc));
    showScreen('related');
    setRoute(entry);
  }

  /* ---------------- topics (browse by tag) ---------------- */

  var topicFilter = null;
  var topicSearchQuery = '';

  function tagCounts() {
    var counts = {};
    DOCS.forEach(function (d) {
      d.tags.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return counts;
  }

  function matchesTopicFilters(d) {
    if (topicFilter && d.tags.indexOf(topicFilter) === -1) return false;
    if (topicSearchQuery) {
      var q = topicSearchQuery.toLowerCase();
      var inTitle = d.title.toLowerCase().indexOf(q) !== -1;
      var inTags = d.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
      if (!inTitle && !inTags) return false;
    }
    return true;
  }

  var TOPIC_PILL_LIMIT = 20;

  function renderTopicPills() {
    var counts = tagCounts();
    var tags = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    }).slice(0, TOPIC_PILL_LIMIT);
    var wrap = el('rw-topic-pills');
    var allBtn = '<button type="button" class="rw-topic-pill' + (topicFilter ? '' : ' active') + '" data-tag="">All</button>';
    wrap.innerHTML = allBtn + tags.map(function (t) {
      return '<button type="button" class="rw-topic-pill' + (topicFilter === t ? ' active' : '') + '" data-tag="' + escapeHtml(t) + '">#' + escapeHtml(t) + '</button>';
    }).join('');
    wrap.querySelectorAll('[data-tag]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        topicFilter = btn.dataset.tag || null;
        renderTopicPills();
        renderTopicGrid();
      });
    });
  }

  function renderTopicGrid() {
    var matches = DOCS.filter(matchesTopicFilters);
    var grid = el('rw-topic-grid');
    if (!matches.length) {
      grid.innerHTML = '<div class="rw-empty"><strong>No topics match</strong>Try a different tag or search term.</div>';
      return;
    }
    grid.innerHTML = matches.map(renderResultCard).join('');
    grid.querySelectorAll('[data-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openArticle(btn.dataset.open, true); });
    });
  }

  function showTopics() {
    stack = [{ screen: 'topics' }];
    topicFilter = null;
    topicSearchQuery = '';
    el('rw-topics-search-input').value = '';
    renderTopicPills();
    renderTopicGrid();
    showScreen('topics');
    setRoute({ screen: 'topics' });
  }

  /* ---------------- ingest log ---------------- */

  function renderIngestLog() {
    var log = window.INGEST_LOG || [];
    var totalArticles = log.reduce(function (n, e) { return n + e.articles.length; }, 0);
    el('rw-log-summary').textContent = totalArticles + ' article' + (totalArticles === 1 ? '' : 's') +
      ' processed across ' + log.length + ' day' + (log.length === 1 ? '' : 's');

    var list = el('rw-log-list');
    if (!log.length) {
      list.innerHTML = '<div class="rw-empty"><strong>No ingest activity yet</strong>Articles processed via wiki-ingest will show up here.</div>';
      return;
    }
    list.innerHTML = log.map(function (entry, i) {
      var parts = entry.date.split('-');
      var stamped = parts.length === 3 ? parts[1] + '.' + parts[2] + '.' + parts[0] : entry.date;
      return '<div class="rw-log-entry" data-entry="' + i + '">' +
        '<button type="button" class="rw-log-entry-head">' +
        '<span class="rw-log-date">' + escapeHtml(stamped) + '</span>' +
        '<span class="rw-log-count">' + entry.articles.length + ' article' + (entry.articles.length === 1 ? '' : 's') + ' processed</span>' +
        '<svg class="rw-log-chevron" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 5l5 5-5 5"/></svg>' +
        '</button>' +
        '<div class="rw-log-entry-body">' +
        entry.articles.map(function (title) { return '<div class="rw-log-article">' + escapeHtml(title) + '</div>'; }).join('') +
        '</div></div>';
    }).join('');
    list.querySelectorAll('.rw-log-entry-head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.closest('.rw-log-entry').classList.toggle('open');
      });
    });
  }

  function showIngestLog() {
    stack = [{ screen: 'ingest-log' }];
    renderIngestLog();
    showScreen('ingest-log');
    setRoute({ screen: 'ingest-log' });
  }

  /* ---------- graph view (3D globe, Canvas2D) ---------- */

  var graphCache = { nodes: null, edges: null, positions: null };

  var GRAPH_COLOR_BASE = '#58544e';
  var GRAPH_COLOR_ACTIVE = '#7b68ee';
  var GRAPH_COLOR_FADED = '#e3e1dd';
  var GRAPH_COLOR_EDGE_HIGHLIGHT = '#8b7cf0';
  var GRAPH_MIN_HIT_RADIUS = 7;
  var GRAPH_ROTATE_SENSITIVITY = 0.006;
  var GRAPH_PITCH_LIMIT = 1.45;

  function buildGraphData() {
    if (graphCache.nodes) return;
    var nodes = DOCS.map(function (d) { return { id: d.id, title: d.title, type: d.type }; });
    var edgeSet = {};
    Object.keys(wikilinkGraph).forEach(function (nodeId) {
      var neighbors = wikilinkGraph[nodeId];
      Object.keys(neighbors).forEach(function (neighborId) {
        var pair = [nodeId, neighborId].sort().join('|');
        edgeSet[pair] = true;
      });
    });
    var edges = Object.keys(edgeSet).map(function (pair) {
      var parts = pair.split('|');
      return { source: parts[0], target: parts[1] };
    });
    nodes.forEach(function (n) {
      n.degree = Object.keys(wikilinkGraph[n.id] || {}).length;
    });
    graphCache.nodes = nodes;
    graphCache.edges = edges;
  }

  function layoutGraphFR(nodes, edges) {
    var width = window.innerWidth;
    var height = window.innerHeight - 60;
    var spread = Math.min(width, height);

    nodes.forEach(function (n) {
      n.x = (Math.random() - 0.5) * spread;
      n.y = (Math.random() - 0.5) * spread;
      n.z = (Math.random() - 0.5) * spread;
      n.vx = 0;
      n.vy = 0;
      n.vz = 0;
    });

    var k = Math.sqrt(width * height / nodes.length) * 0.65;
    var iterations = 300;
    var temperature = Math.sqrt(width * width + height * height) / 10;

    for (var iter = 0; iter < iterations; iter++) {
      nodes.forEach(function (n) { n.fx = 0; n.fy = 0; n.fz = 0; });

      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i];
          var b = nodes[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dz = a.z - b.z;
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
          var repel = (k * k) / (dist + 0.1);
          a.fx += (dx / dist) * repel;
          a.fy += (dy / dist) * repel;
          a.fz += (dz / dist) * repel;
          b.fx -= (dx / dist) * repel;
          b.fy -= (dy / dist) * repel;
          b.fz -= (dz / dist) * repel;
        }
      }

      edges.forEach(function (e) {
        var a = nodes.find(function (n) { return n.id === e.source; });
        var b = nodes.find(function (n) { return n.id === e.target; });
        if (a && b) {
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dz = a.z - b.z;
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
          var attract = (dist * dist) / (k * 1.8);
          a.fx -= (dx / dist) * attract;
          a.fy -= (dy / dist) * attract;
          a.fz -= (dz / dist) * attract;
          b.fx += (dx / dist) * attract;
          b.fy += (dy / dist) * attract;
          b.fz += (dz / dist) * attract;
        }
      });

      var centerGrav = 0.03;
      nodes.forEach(function (n) {
        n.fx -= n.x * centerGrav;
        n.fy -= n.y * centerGrav;
        n.fz -= n.z * centerGrav;
      });

      nodes.forEach(function (n) {
        n.vx = (n.vx + n.fx) * 0.9;
        n.vy = (n.vy + n.fy) * 0.9;
        n.vz = (n.vz + n.fz) * 0.9;
        var speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy + n.vz * n.vz);
        if (speed > temperature) {
          n.vx = (n.vx / speed) * temperature;
          n.vy = (n.vy / speed) * temperature;
          n.vz = (n.vz / speed) * temperature;
        }
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
      });

      temperature *= 0.995;
    }

    // Defensive radial clamp: guarantees a bounded, roughly spherical
    // silhouette for the camera framing even if a node's simulated
    // trajectory escapes the main cluster (the old SVG renderer never
    // needed this since an off-chart node simply drew off-screen; the
    // 3D camera derives its framing from the overall bounding radius,
    // so one runaway point would otherwise skew the whole projection).
    var clampRadius = spread * 0.75;
    nodes.forEach(function (n) {
      var r = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (r > clampRadius) {
        var f = clampRadius / r;
        n.x *= f;
        n.y *= f;
        n.z *= f;
      }
    });

    var boundingRadius = 0;
    nodes.forEach(function (n) {
      var r = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (r > boundingRadius) boundingRadius = r;
    });

    graphCache.positions = nodes;
    graphCache.boundingRadius = boundingRadius || spread / 2;
  }

  var graphView = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    rotationX: -0.25,
    rotationY: 0,
    hoveredId: null,
    lastProjected: [],
    colors: { ground: '#fafaf8', line: '#e2ddd6', muted: '#726b64' }
  };

  function resolveGraphColors() {
    var cs = getComputedStyle(document.documentElement);
    graphView.colors.ground = (cs.getPropertyValue('--rw-ground') || '#fafaf8').trim();
    graphView.colors.line = (cs.getPropertyValue('--rw-line') || '#e2ddd6').trim();
    graphView.colors.muted = (cs.getPropertyValue('--rw-muted') || '#726b64').trim();
  }

  if (window.matchMedia) {
    var graphThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var graphThemeListener = function () {
      if (!graphView.ctx) return;
      resolveGraphColors();
      drawGraph();
    };
    if (graphThemeQuery.addEventListener) {
      graphThemeQuery.addEventListener('change', graphThemeListener);
    } else if (graphThemeQuery.addListener) {
      graphThemeQuery.addListener(graphThemeListener);
    }
  }

  function projectGraphNodes() {
    var cameraDistance = graphCache.boundingRadius * 2.2;
    var focalLength = cameraDistance;
    var cosY = Math.cos(graphView.rotationY);
    var sinY = Math.sin(graphView.rotationY);
    var cosX = Math.cos(graphView.rotationX);
    var sinX = Math.sin(graphView.rotationX);
    var centerX = graphView.width / 2;
    var centerY = graphView.height / 2;
    var R = graphCache.boundingRadius || 1;

    return graphCache.nodes.map(function (n) {
      var x1 = n.x * cosY + n.z * sinY;
      var z1 = -n.x * sinY + n.z * cosY;
      var y2 = n.y * cosX - z1 * sinX;
      var z2 = n.y * sinX + z1 * cosX;
      var x2 = x1;

      var scale = focalLength / (cameraDistance - z2);
      var depthT = Math.max(0, Math.min(1, (z2 + R) / (2 * R)));
      var baseRadius = 3 + (n.degree / 5);

      return {
        node: n,
        sx: centerX + x2 * scale * zoomScale,
        sy: centerY + y2 * scale * zoomScale,
        z: z2,
        depthT: depthT,
        radius: baseRadius * scale * zoomScale
      };
    });
  }

  function drawGraph() {
    var ctx = graphView.ctx;
    if (!ctx) return;
    var w = graphView.width;
    var h = graphView.height;

    ctx.clearRect(0, 0, w, h);

    var projected = projectGraphNodes();
    graphView.lastProjected = projected;

    var byId = {};
    projected.forEach(function (p) { byId[p.node.id] = p; });

    var hoveredId = graphView.hoveredId;
    var neighbors = hoveredId ? (wikilinkGraph[hoveredId] || {}) : null;

    // edges first, behind nodes
    graphCache.edges.forEach(function (e) {
      var a = byId[e.source];
      var b = byId[e.target];
      if (!a || !b) return;

      var isConnected = hoveredId && (e.source === hoveredId || e.target === hoveredId);
      var depthAlpha = 0.15 + 0.55 * ((a.depthT + b.depthT) / 2);

      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      if (hoveredId) {
        if (isConnected) {
          ctx.strokeStyle = GRAPH_COLOR_EDGE_HIGHLIGHT;
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.4;
        } else {
          ctx.strokeStyle = graphView.colors.line;
          ctx.globalAlpha = 0.08;
          ctx.lineWidth = 0.8;
        }
      } else {
        ctx.strokeStyle = graphView.colors.line;
        ctx.globalAlpha = depthAlpha;
        ctx.lineWidth = 0.8;
      }
      ctx.stroke();
    });

    // nodes, back-to-front for correct occlusion
    var sorted = projected.slice().sort(function (a, b) { return a.z - b.z; });
    var hoveredP = null;

    sorted.forEach(function (p) {
      var isHovered = hoveredId === p.node.id;
      var isNeighbor = neighbors && neighbors[p.node.id];

      ctx.beginPath();
      ctx.arc(p.sx, p.sy, Math.max(p.radius, 1.5), 0, Math.PI * 2);

      if (isHovered) {
        ctx.fillStyle = GRAPH_COLOR_ACTIVE;
        ctx.globalAlpha = 1;
        hoveredP = p;
      } else if (hoveredId && !isNeighbor) {
        ctx.fillStyle = GRAPH_COLOR_FADED;
        ctx.globalAlpha = 0.35;
      } else {
        ctx.fillStyle = GRAPH_COLOR_BASE;
        ctx.globalAlpha = 0.35 + 0.65 * p.depthT;
      }
      ctx.fill();
    });

    if (hoveredP) {
      var truncated = hoveredP.node.title.length > 20
        ? hoveredP.node.title.substring(0, 17) + '…'
        : hoveredP.node.title;
      ctx.globalAlpha = 1;
      ctx.fillStyle = graphView.colors.muted;
      ctx.font = '500 11px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif');
      ctx.textAlign = 'center';
      ctx.fillText(truncated, hoveredP.sx, hoveredP.sy + hoveredP.radius + 14);
    }

    ctx.globalAlpha = 1;
  }

  function hitTestGraph(clientX, clientY) {
    var rect = graphView.canvas.getBoundingClientRect();
    var mx = clientX - rect.left;
    var my = clientY - rect.top;

    var best = null;
    var bestDist = Infinity;
    graphView.lastProjected.forEach(function (p) {
      var dx = p.sx - mx;
      var dy = p.sy - my;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var hitRadius = Math.max(p.radius, GRAPH_MIN_HIT_RADIUS);
      if (dist <= hitRadius && dist < bestDist) {
        bestDist = dist;
        best = p.node.id;
      }
    });
    return best;
  }

  function renderGraph() {
    buildGraphData();
    if (!graphCache.positions) {
      layoutGraphFR(graphCache.nodes, graphCache.edges);
    }

    var canvas = el('rw-graph-canvas');
    var width = window.innerWidth;
    var height = window.innerHeight - 60;
    var dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    graphView.canvas = canvas;
    graphView.ctx = ctx;
    graphView.width = width;
    graphView.height = height;

    resolveGraphColors();
    drawGraph();

    renderGraphLegend();
    wireGraphInteractions(canvas);
  }

  function renderGraphLegend() {
    var legend = el('rw-graph-legend');
    legend.innerHTML = '<div class="rw-graph-legend-item">' +
      '<div class="rw-graph-legend-dot"></div>' +
      '<span>' + DOCS.length + ' Wiki Documents</span>' +
      '</div>';
  }

  var graphDrag = null;
  var zoomScale = 1;
  var graphInteractionsWired = false;
  var GRAPH_AUTO_ROTATE_SPEED = 0.0018;
  var GRAPH_AUTO_ROTATE_IDLE_MS = 700;
  var lastGraphInteraction = 0;

  function wireGraphInteractions(canvas) {
    if (graphInteractionsWired) return;
    graphInteractionsWired = true;

    canvas.addEventListener('mousemove', function (e) {
      if (graphDrag) return;
      var hit = hitTestGraph(e.clientX, e.clientY);
      if (hit !== graphView.hoveredId) {
        graphView.hoveredId = hit;
        drawGraph();
      }
    });

    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      lastGraphInteraction = performance.now();
      graphDrag = {
        startX: e.clientX,
        startY: e.clientY,
        startRotationX: graphView.rotationX,
        startRotationY: graphView.rotationY,
        moved: false
      };
      graphView.canvas.classList.add('panning');
    });

    document.addEventListener('mousemove', function (e) {
      if (!graphDrag) return;
      var dx = e.clientX - graphDrag.startX;
      var dy = e.clientY - graphDrag.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        graphDrag.moved = true;
        lastGraphInteraction = performance.now();
        graphView.rotationY = graphDrag.startRotationY + dx * GRAPH_ROTATE_SENSITIVITY;
        graphView.rotationX = Math.max(-GRAPH_PITCH_LIMIT, Math.min(GRAPH_PITCH_LIMIT,
          graphDrag.startRotationX + dy * GRAPH_ROTATE_SENSITIVITY));
        drawGraph();
      }
    });

    document.addEventListener('mouseup', function () {
      if (!graphDrag) return;
      lastGraphInteraction = performance.now();
      if (!graphDrag.moved && graphView.hoveredId) {
        openArticle(graphView.hoveredId, true);
      }
      graphDrag = null;
      if (graphView.canvas) graphView.canvas.classList.remove('panning');
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      lastGraphInteraction = performance.now();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomScale = Math.max(0.3, Math.min(3, zoomScale * delta));
      drawGraph();
      el('rw-graph-zoom-level').textContent = Math.round(zoomScale * 100) + '%';
    }, { passive: false });

    requestAnimationFrame(autoRotateGraph);
  }

  function autoRotateGraph(now) {
    if (app.dataset.screen === 'graph' && !graphDrag &&
      (now - lastGraphInteraction) > GRAPH_AUTO_ROTATE_IDLE_MS) {
      graphView.rotationY += GRAPH_AUTO_ROTATE_SPEED;
      drawGraph();
    }
    requestAnimationFrame(autoRotateGraph);
  }

  function showGraph() {
    stack = [{ screen: 'graph' }];
    renderGraph();
    showScreen('graph');
    setRoute({ screen: 'graph' });
  }

  function zoomGraph(delta) {
    if (!graphView.ctx) return;
    zoomScale = Math.max(0.3, Math.min(3, zoomScale + delta));
    drawGraph();
    el('rw-graph-zoom-level').textContent = Math.round(zoomScale * 100) + '%';
  }

  function renderResultCard(d) {
    return '<button type="button" class="rw-result-card" data-open="' + d.id + '">' +
      '<div class="rw-result-top"><span class="rw-type-dot ' + d.type + '"></span><span class="rw-result-type">' + d.type + ' · ' + d.id + '.md</span></div>' +
      '<div class="rw-result-title">' + escapeHtml(d.title) + '</div>' +
      '<div class="rw-result-snippet">' + escapeHtml(snippet(d, 150)) + '</div>' +
      '<div class="rw-result-tags">' + d.tags.map(function (t) { return '<span class="rw-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' +
      '</button>';
  }

  function renderRelated(doc, related) {
    el('rw-results-query').textContent = 'Related to "' + doc.title + '"';
    el('rw-results-count').textContent = related.length + ' related article' + (related.length === 1 ? '' : 's');
    var list = el('rw-results-list');
    if (!related.length) {
      list.innerHTML = '<div class="rw-empty"><strong>No related articles</strong>No other documents share tags with this one yet.</div>';
      return;
    }
    list.innerHTML = related.map(renderResultCard).join('');
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
    var entry = { screen: 'ask', query: query, pinnedId: pinnedId || null };
    if (fresh) stack = [entry]; else stack.push(entry);
    showScreen('ask');
    setRoute(entry);

    // Show loading state
    el('rw-ask-question').textContent = query;
    el('rw-ask-sources').style.display = 'none';
    el('rw-ask-body').innerHTML = '<div class="rw-thinking"><span class="rw-dot"></span><span class="rw-dot"></span><span class="rw-dot"></span></div>';
    el('rw-ask-continue').textContent = '';
    el('rw-ask-followup-topics').innerHTML = '';

    // Delay before showing actual results (minimum 2 seconds for UX)
    setTimeout(function() {
      var results = buildAskResults(query, pinnedId);
      renderAsk(query, results);
    }, 2000);
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

    var sourceEl = el('rw-article-source');
    if (doc.sourceUrl) {
      sourceEl.style.display = '';
      sourceEl.innerHTML =
        '<a href="' + escapeHtml(doc.sourceUrl) + '" target="_blank" rel="noopener noreferrer" class="rw-article-source-link">Read full article →</a>' +
        (doc.sourceAuthor ? '<span class="rw-article-source-author">by ' + escapeHtml(doc.sourceAuthor) + '</span>' : '');
    } else {
      sourceEl.style.display = 'none';
      sourceEl.innerHTML = '';
    }

    el('rw-article-body').innerHTML = renderMarkdown(doc.body);

    el('rw-article-body').querySelectorAll('.wikilink').forEach(function (btn) {
      btn.addEventListener('click', function () { openPreview(btn.dataset.id); });
    });

    showScreen('article');
    if (pushToStack) setRoute({ screen: 'article', id: id });
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

  /* ---------------- routing + page-view tracking ---------------- */

  var PAGEVIEWS_KEY = 'rw-pageviews';
  var PAGEVIEWS_MAX = 200;
  var suppressNextHashChange = false;

  // Fragment only, no leading '#' (location.hash adds it on assignment,
  // and we strip it back off when reading location.hash in parseRoute).
  function routeFor(entry) {
    if (!entry || entry.screen === 'search') return '';
    if (entry.screen === 'topics') return '/topics';
    if (entry.screen === 'ingest-log') return '/ingest-log';
    if (entry.screen === 'graph') return '/graph';
    if (entry.screen === 'article') return '/article/' + entry.id;
    if (entry.screen === 'related') return '/related/' + entry.id;
    if (entry.screen === 'ask') {
      var params = new URLSearchParams();
      params.set('q', entry.query || '');
      if (entry.pinnedId) params.set('pin', entry.pinnedId);
      return '/ask?' + params.toString();
    }
    return '';
  }

  function parseRoute(hash) {
    var h = (hash || '').replace(/^#/, '');
    if (!h || h === '/') return { screen: 'search' };
    if (h === '/topics') return { screen: 'topics' };
    if (h === '/ingest-log') return { screen: 'ingest-log' };
    if (h === '/graph') return { screen: 'graph' };
    var articleMatch = h.match(/^\/article\/(.+)$/);
    if (articleMatch) return { screen: 'article', id: articleMatch[1] };
    var relatedMatch = h.match(/^\/related\/(.+)$/);
    if (relatedMatch) return { screen: 'related', id: relatedMatch[1] };
    var askMatch = h.match(/^\/ask\?(.*)$/);
    if (askMatch) {
      var params = new URLSearchParams(askMatch[1]);
      return { screen: 'ask', query: params.get('q') || '', pinnedId: params.get('pin') || null };
    }
    return { screen: 'search' };
  }

  function trackPageView(entry) {
    var path = routeFor(entry) || '/';
    console.log('[pageview]', path);
    try {
      var views = JSON.parse(localStorage.getItem(PAGEVIEWS_KEY) || '[]');
      views.push({ path: path, screen: entry.screen, ts: Date.now() });
      if (views.length > PAGEVIEWS_MAX) views = views.slice(views.length - PAGEVIEWS_MAX);
      localStorage.setItem(PAGEVIEWS_KEY, JSON.stringify(views));
    } catch (e) {
      // localStorage unavailable (private mode, quota) - tracking is best-effort.
    }
  }

  // Sets the hash to match `entry` and logs one page view, but only if the
  // route actually changed - repeated calls for the same screen are no-ops.
  function setRoute(entry) {
    var path = routeFor(entry);
    var current = location.hash.replace(/^#/, '');
    if (current === path) return;
    suppressNextHashChange = true;
    location.hash = path;
    trackPageView(entry);
  }

  // Render-only reconstruction of a screen from a route entry - no stack
  // mutation, no hash mutation. Used by goBack() (unchanged from before this
  // feature existed) and by hash-driven navigation (back/forward button,
  // deep links, page refresh), which update the hash themselves beforehand.
  function renderFromRouteEntry(entry) {
    if (entry.screen === 'topics') {
      renderTopicPills();
      renderTopicGrid();
      showScreen('topics');
    } else if (entry.screen === 'ingest-log') {
      renderIngestLog();
      showScreen('ingest-log');
    } else if (entry.screen === 'graph') {
      renderGraph();
      showScreen('graph');
    } else if (entry.screen === 'related') {
      var relatedDoc = docById[entry.id];
      if (!relatedDoc) { renderFromRouteEntry({ screen: 'search' }); return; }
      renderRelated(relatedDoc, findRelated(relatedDoc));
      showScreen('related');
    } else if (entry.screen === 'ask') {
      renderAsk(entry.query, buildAskResults(entry.query, entry.pinnedId));
      showScreen('ask');
    } else if (entry.screen === 'article') {
      if (!docById[entry.id]) { renderFromRouteEntry({ screen: 'search' }); return; }
      openArticle(entry.id, false);
    } else {
      el('rw-input').value = '';
      el('rw-clear-input').style.display = 'none';
      closeAutocomplete();
      showScreen('search');
    }
  }

  function goBack() {
    stack.pop();
    var prev = stack[stack.length - 1] || { screen: 'search' };
    renderFromRouteEntry(prev);
    setRoute(prev);
  }

  /* ---------------- init ---------------- */

  function wire() {
    el('rw-doc-count').textContent = DOCS.length + ' documents indexed';
    el('rw-footer-version').textContent = 'Smol Wiki Chat v' + APP_VERSION;
    renderTryChips();
    renderRecentChips();

    el('rw-send').addEventListener('click', function () { closeAutocomplete(); askQuery(el('rw-input').value, true); });
    el('rw-input').addEventListener('input', function (e) {
      el('rw-clear-input').style.display = e.target.value ? 'flex' : 'none';
      renderAutocomplete(e.target.value);
    });
    el('rw-input').addEventListener('keydown', function (e) {
      var dropdownOpen = el('rw-autocomplete').style.display === 'block';
      if (e.key === 'ArrowDown' && dropdownOpen) {
        e.preventDefault();
        setAutocompleteActive(autocompleteActiveIndex + 1);
      } else if (e.key === 'ArrowUp' && dropdownOpen) {
        e.preventDefault();
        setAutocompleteActive(autocompleteActiveIndex - 1);
      } else if (e.key === 'Escape' && dropdownOpen) {
        closeAutocomplete();
      } else if (e.key === 'Enter') {
        if (dropdownOpen && autocompleteActiveIndex >= 0) {
          selectAutocompleteDoc(autocompleteDocs[autocompleteActiveIndex]);
        } else {
          closeAutocomplete();
          askQuery(e.target.value, true);
        }
      }
    });
    el('rw-clear-input').addEventListener('click', function () {
      el('rw-input').value = '';
      el('rw-clear-input').style.display = 'none';
      closeAutocomplete();
      el('rw-input').focus();
    });
    el('rw-menu-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      el('rw-menu-dropdown').classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      var menu = el('rw-menu-dropdown');
      if (menu.classList.contains('open') &&
        !menu.contains(e.target) && e.target !== el('rw-menu-btn') && !el('rw-menu-btn').contains(e.target)) {
        menu.classList.remove('open');
      }
      var dropdown = el('rw-autocomplete');
      if (dropdown.style.display === 'block' &&
        !dropdown.contains(e.target) && e.target !== el('rw-input')) {
        closeAutocomplete();
      }
    });
    el('rw-menu-dropdown').querySelectorAll('[data-menu-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        el('rw-menu-dropdown').classList.remove('open');
        var action = btn.dataset.menuAction;
        if (action === 'home') {
          el('rw-input').value = '';
          el('rw-clear-input').style.display = 'none';
          closeAutocomplete();
          stack = [];
          showScreen('search');
          el('rw-input').focus();
        } else if (action === 'topics') {
          showTopics();
        } else if (action === 'graph') {
          showGraph();
        } else if (action === 'ingest-log') {
          showIngestLog();
        }
        // 'login' is an inert stub, same as #rw-login-btn — menu just closes.
      });
    });
    el('rw-topics-back').addEventListener('click', goBack);
    el('rw-ingest-log-back').addEventListener('click', goBack);
    el('rw-graph-back').addEventListener('click', goBack);
    el('rw-graph-zoom-in').addEventListener('click', function () { zoomGraph(0.2); });
    el('rw-graph-zoom-out').addEventListener('click', function () { zoomGraph(-0.2); });
    el('rw-topics-search-input').addEventListener('input', function (e) {
      topicSearchQuery = e.target.value;
      renderTopicGrid();
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
      el('rw-clear-input').style.display = 'none';
      closeAutocomplete();
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
      el('rw-menu-dropdown').classList.remove('open');
    });

    window.addEventListener('hashchange', function () {
      if (suppressNextHashChange) { suppressNextHashChange = false; return; }
      var entry = parseRoute(location.hash);
      stack = [entry];
      renderFromRouteEntry(entry);
      trackPageView(entry);
    });

    // Initial load: honor a deep link / refreshed URL if present, otherwise
    // the home screen (already showing by default) is itself the first view.
    if (location.hash) {
      var initialEntry = parseRoute(location.hash);
      stack = [initialEntry];
      renderFromRouteEntry(initialEntry);
      trackPageView(initialEntry);
    } else {
      trackPageView({ screen: 'search' });
    }

    el('rw-input').focus();
  }

  wire();
})();
