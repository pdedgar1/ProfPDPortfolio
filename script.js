(function () {
  'use strict';

  /* ---------------- Theme toggle ---------------- */

  var root = document.documentElement;
  var themeBtn = document.getElementById('theme-toggle');
  var stored = localStorage.getItem('pd-theme');
  if (stored) root.setAttribute('data-theme', stored);

  themeBtn.addEventListener('click', function () {
    var current = root.getAttribute('data-theme');
    var isDark = current
      ? current === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('pd-theme', next);
  });

  /* ---------------- Generic ARIA tabs ---------------- */

  function wireTabs(tabButtons, panelLookup) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabButtons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
          b.tabIndex = active ? 0 : -1;
          var panel = panelLookup(b);
          if (panel) {
            panel.hidden = !active;
            panel.classList.toggle('is-hidden', !active);
          }
        });
      });
    });
  }

  var syllabusTabs = Array.prototype.slice.call(
    document.querySelectorAll('.tablist .tab')
  );
  wireTabs(syllabusTabs, function (btn) {
    return document.getElementById(btn.getAttribute('aria-controls'));
  });

  var toolTabs = Array.prototype.slice.call(
    document.querySelectorAll('.tool-switch .tool-tab')
  );
  wireTabs(toolTabs, function (btn) {
    return document.getElementById(btn.getAttribute('aria-controls'));
  });

  var pageTabs = Array.prototype.slice.call(
    document.querySelectorAll('.page-tabs .page-tab')
  );
  wireTabs(pageTabs, function (btn) {
    return document.getElementById(btn.getAttribute('aria-controls'));
  });
  pageTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var banner = document.querySelector('.course-banner');
      if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-goto-tab]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById(el.dataset.gotoTab);
      if (target) target.click();
    });
  });

  /* ---------------- Zine rubric (real weights from the signature assignment) ---------------- */

  var zineRubric = [
    {
      key: 'concept', label: 'Concept', theme: 'Vision', weight: 10, group: 'quality',
      levels: {
        full: "You've come up with a name and theme the works cohere around; the title, design, and arrangement all develop it.",
        half: "You've got a theme and title, but the concept is vague and doesn't extend past the cover into the design or notes.",
        low: "The title is incidental to the contents — no organizing principle stages the work for the reader."
      }
    },
    {
      key: 'call', label: 'Call', theme: 'Criteria', weight: 5, group: 'quality',
      levels: {
        full: 'The manifesto, revised from our in-class "call," is well-written and makes your critical lens clear.',
        half: 'The manifesto is general — it invites work but could apply to almost anything.',
        low: "The call hasn't been revised into a manifesto; it appears as originally composed, or is missing."
      }
    },
    {
      key: 'collect', label: 'Collect', theme: 'Fullness', weight: 20, group: 'completion',
      levels: {
        full: '10+ pages of your own work and 3+ pages of process note.',
        half: '5–10 pages of your own work and under 3 pages of process note.',
        low: 'Fewer than 5 pages of your own work and 1 page of process note.'
      }
    },
    {
      key: 'curate', label: 'Curate', theme: 'Cohesion', weight: 5, group: 'quality',
      levels: {
        full: 'The pieces align with each other and the concept, across 3+ modes of composition from class.',
        half: 'The pieces represent your semester adequately but don’t fully cohere or span 3 modes.',
        low: 'The works are all in the same mode and don’t align with the manifesto’s concept.'
      }
    },
    {
      key: 'critique', label: 'Critique', theme: 'Clarity', weight: 5, group: 'quality',
      levels: {
        full: 'The process notes elucidate the pieces, giving insight into composition and concept.',
        half: 'The notes explain what a piece means without showing the compositional work behind it.',
        low: 'No process notes or editorial note are included.'
      }
    },
    {
      key: 'compose', label: 'Compose', theme: 'Structure', weight: 5, group: 'quality',
      levels: {
        full: 'The works are ordered thoughtfully, with headers, breaks, and titles supporting the flow.',
        half: 'The works are organized understandably but with little connection to the concept.',
        low: 'No hint of thoughtful ordering — or the print copy itself is out of order.'
      }
    },
    {
      key: 'composite', label: 'Composite', theme: 'Print', weight: 40, group: 'completion',
      levels: {
        full: 'The PDF and print copies are executed effectively — 16+ pages at 4.25×5.5in, legible, exist and open.',
        half: 'Only the PDF or only the print copy exists (or it’s an unbound 8.5×11 Word doc) — but it’s legible.',
        low: 'Neither is printed and composed, and what exists is illegible or inaccessible.'
      }
    },
    {
      key: 'convey', label: 'Convey', theme: 'Present', weight: 10, group: 'completion',
      levels: {
        full: 'A thoughtful 7-minute presentation, including a reading from the zine.',
        half: 'Delivered, but not well-timed, thoughtful, or inclusive of a reading.',
        low: "You don't give the presentation."
      }
    }
  ];

  var zineTouched = {};
  var zineSliders = {};
  var SCALE_STEP = 5;   // a working notch every 5 points — 21 stops, not just 3
  var TICKS = [0, 25, 50, 75, 100];

  function levelFor(value) {
    if (value < 34) return 'low';
    if (value > 66) return 'full';
    return 'half';
  }
  function colorFor(value) {
    if (value < 34) return 'var(--ink-faint)';
    if (value > 66) return 'var(--good)';
    return 'var(--grade)';
  }

  var criteriaList = document.getElementById('zine-criteria');

  zineRubric.forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'criterion';

    var head = document.createElement('div');
    head.className = 'criterion-head';
    head.innerHTML =
      '<span class="criterion-name">' + item.label +
      '<small>' + item.theme + '</small></span>' +
      '<span class="criterion-weight">' + item.weight + '%</span>';
    li.appendChild(head);

    var listId = 'ticks-' + item.key;
    var datalist = document.createElement('datalist');
    datalist.id = listId;
    TICKS.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      datalist.appendChild(opt);
    });
    li.appendChild(datalist);

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = String(SCALE_STEP);
    slider.value = '0';
    slider.className = 'level-slider';
    slider.setAttribute('list', listId);
    slider.setAttribute('aria-label', item.label + ' credit, 0 to 100 percent');
    zineSliders[item.key] = slider;
    li.appendChild(slider);

    var labels = document.createElement('div');
    labels.className = 'scale-labels';
    labels.innerHTML = '<span class="end-left">Low</span><span class="mid">Half</span><span class="end-right">Full</span>';
    li.appendChild(labels);

    var detail = document.createElement('p');
    detail.className = 'criterion-detail';
    li.appendChild(detail);

    slider.addEventListener('input', function () {
      zineTouched[item.key] = true;
      var value = parseInt(slider.value, 10);
      slider.style.setProperty('--thumb-color', colorFor(value));
      detail.textContent = value + '% credit — ' + item.levels[levelFor(value)];
      recomputeZine();
    });

    criteriaList.appendChild(li);
  });

  function recomputeZine() {
    var total = 0, completion = 0, quality = 0;
    zineRubric.forEach(function (item) {
      var slider = zineSliders[item.key];
      var value = zineTouched[item.key] ? (parseInt(slider.value, 10) / 100) * item.weight : 0;
      total += value;
      if (item.group === 'completion') completion += value;
      else quality += value;
    });

    document.getElementById('zine-score').textContent = Math.round(total);
    document.getElementById('zine-completion').textContent = Math.round(completion);
    document.getElementById('zine-quality').textContent = Math.round(quality);
    document.getElementById('zine-letter').textContent = letterGrade(total, zineRubric.some(function (i) { return zineTouched[i.key]; }));
  }

  function letterGrade(pct, anySelected) {
    if (!anySelected) return '—';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A−';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B−';
    if (pct >= 77) return 'C+';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  }

  document.getElementById('zine-reset').addEventListener('click', function () {
    zineTouched = {};
    zineRubric.forEach(function (item) {
      var slider = zineSliders[item.key];
      slider.value = '0';
      slider.style.setProperty('--thumb-color', 'var(--ink-faint)');
    });
    criteriaList.querySelectorAll('.criterion-detail').forEach(function (p) { p.textContent = ''; });
    recomputeZine();
  });

  recomputeZine();

  /* ---------------- Wiki-Essay checklist (derived from the assignment steps, not a weighted rubric) ---------------- */

  var wikiItems = [
    { key: 'poem', label: 'Chose a public-domain sonnet (10–15 lines) to work with or against' },
    { key: 'define', label: 'Highlighted 10+ words in the poem and defined each in my own words' },
    { key: 'micros', label: 'Freewrote micros (6–200 words) titled with each chosen word' },
    { key: 'repo', label: 'Initialized a GitHub repo and uploaded the Twine HTML' },
    { key: 'interface', label: 'Used Claude Code to build the click-to-reveal word interface' },
    { key: 'note', label: 'Wrote the 250-word process note reflecting on the poem, the micros, and working with Claude Code' }
  ];

  var wikiList = document.getElementById('wiki-checklist');
  var wikiState = {};

  wikiItems.forEach(function (item) {
    var li = document.createElement('li');
    li.className = 'wiki-item';

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'wiki-' + item.key;

    var span = document.createElement('span');
    span.textContent = item.label;

    var label = document.createElement('label');
    label.style.display = 'flex';
    label.style.gap = '0.65rem';
    label.style.cursor = 'pointer';
    label.style.width = '100%';
    label.appendChild(checkbox);
    label.appendChild(span);
    li.appendChild(label);

    checkbox.addEventListener('change', function () {
      wikiState[item.key] = checkbox.checked;
      li.classList.toggle('is-checked', checkbox.checked);
      recomputeWiki();
    });

    wikiList.appendChild(li);
  });

  function recomputeWiki() {
    var done = wikiItems.filter(function (i) { return wikiState[i.key]; }).length;
    var pct = Math.round((done / wikiItems.length) * 100);
    document.getElementById('wiki-score').textContent = pct;
    document.getElementById('wiki-count').textContent = done + ' / ' + wikiItems.length;
  }

  document.getElementById('wiki-reset').addEventListener('click', function () {
    wikiState = {};
    wikiList.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    wikiList.querySelectorAll('.wiki-item').forEach(function (li) { li.classList.remove('is-checked'); });
    recomputeWiki();
  });

  recomputeWiki();
})();
