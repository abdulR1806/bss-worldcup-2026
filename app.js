(function () {
  const data = window.WORLD_CUP_LEADERBOARD_DATA;

  if (!data) {
    document.body.innerHTML = '<main class="view is-visible"><h1>File data tidak ditemukan</h1><p>Pastikan site/data/site-data.js mendefinisikan WORLD_CUP_LEADERBOARD_DATA.</p></main>';
    return;
  }

  const storageKey = 'credit-divisions-world-cup-theme';
  const streamMode = new URLSearchParams(window.location.search).get('mode') === 'stream';

  const state = {
    view: 'leaderboard',
    activeNav: 'beranda',
    group: 'ALL',
    matchday: 'ALL',
    search: '',
    activeParticipant: null,
    theme: 'dark',
  };

  const resultByMatch = new Map(data.results.map((result) => [result.matchId, result]));
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const predictionsByParticipant = groupBy(data.predictions, 'participantId');
  const predictionsByMatch = groupBy(data.predictions, 'matchId');

  const els = {
    brand: document.querySelector('.brand[data-nav="beranda"]'),
    hero: document.getElementById('beranda'),
    aboutSection: document.getElementById('aboutSection'),
    menuToggle: document.getElementById('menuToggle'),
    themeToggle: document.getElementById('themeToggle'),
    heroStats: document.getElementById('heroStats'),
    dataMode: document.getElementById('dataMode'),
    lastUpdated: document.getElementById('lastUpdated'),
    scoringNote: document.getElementById('scoringNote'),
    groupFilter: document.getElementById('groupFilter'),
    matchdayFilter: document.getElementById('matchdayFilter'),
    searchInput: document.getElementById('searchInput'),
    leaderboardBody: document.getElementById('leaderboardBody'),
    leaderboardContext: document.getElementById('leaderboardContext'),
    podium: document.getElementById('podium'),
    participantCards: document.getElementById('participantCards'),
    participantDetail: document.getElementById('participantDetail'),
    matchCards: document.getElementById('matchCards'),
    streamView: document.getElementById('streamView'),
    streamBoard: document.getElementById('streamBoard'),
    primaryNav: document.getElementById('primaryNav'),
    navButtons: Array.from(document.querySelectorAll('.nav-button[data-nav]')),
  };

  const ICONS = {
    people: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `,
    check: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="m8 12 3 3 5-6"></path>
      </svg>
    `,
    clock: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7v5l3 2"></path>
      </svg>
    `,
    file: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <path d="M14 2v6h6"></path>
        <path d="M8 13h8"></path>
        <path d="M8 17h8"></path>
      </svg>
    `,
  };

  try {
    init();
  } catch (error) {
    showBootError(error);
  }

  function init() {
    document.body.classList.toggle('stream', streamMode);
    state.theme = getInitialTheme();
    applyTheme(state.theme);
    fillMetadata();
    fillFilters();
    bindEvents();
    syncNav();
    render();

    if (streamMode) {
      renderStream();
      window.setInterval(renderStream, 30000);
    }
  }

  function getInitialTheme() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = state.theme;
    if (els.themeToggle) {
      els.themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
      els.themeToggle.setAttribute(
        'aria-label',
        state.theme === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'
      );
    }

    try {
      window.localStorage.setItem(storageKey, state.theme);
    } catch {
      // Storage may be unavailable in some file:// contexts.
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function fillMetadata() {
    const finalCount = data.results.filter((result) => result.status === 'FINAL').length;
    const pendingCount = data.matches.length - finalCount;

    if (els.dataMode) els.dataMode.textContent = data.metadata.dataMode;
    if (els.lastUpdated) els.lastUpdated.textContent = `Dibuat: ${formatDateTime(data.metadata.generatedAt)}`;
    if (els.scoringNote) els.scoringNote.textContent = data.metadata.scoring;

    if (els.heroStats) {
      els.heroStats.innerHTML = [
        heroStat(ICONS.people, data.participants.length, 'Peserta', 'var(--accent)'),
        heroStat(ICONS.check, finalCount, 'Selesai', 'var(--accent-2)'),
        heroStat(ICONS.clock, pendingCount, 'Menunggu', 'var(--accent-3)'),
      ].join('');
    }
  }

  function heroStat(icon, value, label, accent) {
    return `
      <article class="hero-stat">
        <span class="hero-stat-icon" style="color:${accent}">${icon}</span>
        <div>
          <strong class="hero-stat-value">${escapeHtml(String(value))}</strong>
          <span class="hero-stat-label">${escapeHtml(label)}</span>
        </div>
        <span class="hero-stat-bar" style="background:${accent}"></span>
      </article>
    `;
  }

  function fillFilters() {
    if (!els.groupFilter || !els.matchdayFilter) return;

    const groups = unique(data.matches.map((match) => match.group)).sort();
    const matchdays = unique(data.matches.map((match) => match.kickoffWib.slice(0, 10))).sort();

    els.groupFilter.innerHTML = [
      '<option value="ALL">Semua grup</option>',
      ...groups.map((group) => `<option value="${escapeHtml(group)}">Grup ${escapeHtml(group)}</option>`),
    ].join('');

    els.matchdayFilter.innerHTML = [
      '<option value="ALL">Semua hari</option>',
      ...matchdays.map((day) => `<option value="${escapeHtml(day)}">${formatShortDate(day)}</option>`),
    ].join('');
  }

  function bindEvents() {
    if (els.brand) {
      els.brand.addEventListener('click', (event) => {
        event.preventDefault();
        handleNavigation('beranda');
      });
    }

    els.navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nav = button.dataset.nav;
        handleNavigation(nav);
      });
    });

    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', toggleTheme);
    }

    if (els.menuToggle) {
      els.menuToggle.addEventListener('click', toggleMenu);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 1101px)').matches) closeMenu();
    });

    if (els.groupFilter) {
      els.groupFilter.addEventListener('change', (event) => {
        state.group = event.target.value;
        render();
      });
    }

    if (els.matchdayFilter) {
      els.matchdayFilter.addEventListener('change', (event) => {
        state.matchday = event.target.value;
        render();
      });
    }

    if (els.searchInput) {
      els.searchInput.addEventListener('input', (event) => {
        state.search = event.target.value.trim().toLowerCase();
        render();
      });
    }
  }

  function handleNavigation(nav) {
    if (!nav) return;
    closeMenu();

    if (nav === 'beranda') {
      state.view = 'leaderboard';
      state.activeNav = 'beranda';
      render();
      scrollToTarget(els.hero);
      return;
    }

    if (nav === 'tentang') {
      state.activeNav = 'tentang';
      syncNav();
      scrollToTarget(els.aboutSection);
      return;
    }

    state.view = nav;
    state.activeNav = nav;
    render();
    const target = document.getElementById(`${nav}View`);
    scrollToTarget(target);
  }

  function scrollToTarget(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleMenu() {
    const isOpen = document.body.classList.toggle('nav-is-open');
    syncMenu(isOpen);
  }

  function closeMenu() {
    if (!document.body.classList.contains('nav-is-open')) return;
    document.body.classList.remove('nav-is-open');
    syncMenu(false);
  }

  function syncMenu(isOpen) {
    if (els.menuToggle) {
      els.menuToggle.setAttribute('aria-expanded', String(isOpen));
      els.menuToggle.setAttribute('aria-label', isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    }
  }

  function syncNav() {
    els.navButtons.forEach((button) => {
      const active = button.dataset.nav === state.activeNav;
      button.classList.toggle('is-active', active);
      if (active) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function render() {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('is-visible'));
    const activeView = document.getElementById(`${state.view}View`);
    if (activeView) {
      activeView.classList.add('is-visible');
    }

    syncNav();

    const standings = calculateStandings();
    renderLeaderboard(standings);
    renderParticipants(standings);
    renderMatches();
  }

  function showBootError(error) {
    console.error(error);
    const message = error && error.message ? error.message : 'Kesalahan tidak diketahui.';
    const target = els.dataMode || document.getElementById('dataMode');

    if (target) {
      target.textContent = 'Data gagal dimuat';
    }

    const main = document.querySelector('.page-main') || document.body;
    main.insertAdjacentHTML(
      'afterbegin',
      `<section class="site-error" role="alert">
        <strong>Halaman gagal dimuat.</strong>
        <span>Periksa site/data/site-data.js dan app.js. Detail: ${escapeHtml(message)}</span>
      </section>`
    );
  }

  function calculateStandings() {
    const filteredMatches = filteredMatchSet();

    const standings = data.participants.map((participant) => {
      const predictions = predictionsByParticipant.get(participant.id) || [];
      let points = 0;
      let correct = 0;
      let wrong = 0;
      let played = 0;

      predictions.forEach((prediction) => {
        if (!filteredMatches.has(prediction.matchId)) return;

        const result = resultByMatch.get(prediction.matchId);
        if (!result || result.status !== 'FINAL' || !result.result) return;

        played += 1;
        if (prediction.prediction === result.result) {
          correct += 1;
          points += 1;
        } else {
          wrong += 1;
        }
      });

      return {
        ...participant,
        points,
        correct,
        wrong,
        played,
        accuracy: played ? correct / played : 0,
      };
    });

    return standings
      .filter((row) => participantMatchesSearch(row))
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || a.displayName.localeCompare(b.displayName));
  }

  function filteredMatchSet() {
    return new Set(getFilteredMatches().map((match) => match.id));
  }

  function getFilteredMatches() {
    return data.matches.filter((match) => {
      const groupOk = state.group === 'ALL' || match.group === state.group;
      const matchdayOk = state.matchday === 'ALL' || match.kickoffWib.startsWith(state.matchday);
      const searchOk = !state.search ||
        match.homeTeam.toLowerCase().includes(state.search) ||
        match.awayTeam.toLowerCase().includes(state.search) ||
        match.location.toLowerCase().includes(state.search);
      return groupOk && matchdayOk && searchOk;
    });
  }

  function participantMatchesSearch(participant) {
    if (!state.search) return true;

    const direct = `${participant.displayName} ${participant.division}`.toLowerCase().includes(state.search);
    if (direct) return true;

    const predictions = predictionsByParticipant.get(participant.id) || [];
    return predictions.some((prediction) => {
      const match = matchById.get(prediction.matchId);
      return match && (
        match.homeTeam.toLowerCase().includes(state.search) ||
        match.awayTeam.toLowerCase().includes(state.search)
      );
    });
  }

  function renderLeaderboard(standings) {
    els.leaderboardContext.textContent = contextText();

    els.podium.innerHTML = standings.slice(0, 3).map((row, index) => `
      <article class="podium-card rank-${index + 1}">
        <div class="rank-label">Peringkat ${index + 1}</div>
        <h3>${escapeHtml(row.displayName)}</h3>
        <p class="meta">${escapeHtml(row.division)}</p>
        <div class="metric-row">
          ${metric(row.points, 'Poin')}
          ${metric(row.correct, 'Benar')}
          ${metric(formatPercent(row.accuracy), 'Akurasi')}
        </div>
      </article>
    `).join('');

    els.leaderboardBody.innerHTML = standings.length
      ? standings.map((row, index) => `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td>
            <div class="participant-name">
              <span class="badge">${escapeHtml(row.badge || row.displayName.slice(0, 1))}</span>
              <span>${escapeHtml(row.displayName)}</span>
            </div>
          </td>
          <td>${escapeHtml(row.division)}</td>
          <td><strong>${row.points}</strong></td>
          <td>${row.correct}</td>
          <td>${row.played}</td>
          <td>${formatPercent(row.accuracy)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="7">Tidak ada data yang cocok dengan filter saat ini.</td></tr>';
  }

  function renderParticipants(standings) {
    els.participantCards.innerHTML = standings.length
      ? standings.map((row) => `
        <article class="participant-card">
          <div class="participant-name">
            <span class="badge">${escapeHtml(row.badge || row.displayName.slice(0, 1))}</span>
            <h3>${escapeHtml(row.displayName)}</h3>
          </div>
          <p class="meta">${escapeHtml(row.division)}</p>
          ${row.date ? `<p class="meta">Bergabung: ${formatShortDate(row.date)}</p>` : ''}
          <div class="metric-row">
            ${metric(row.points, 'Poin')}
            ${metric(`${row.correct}/${row.played}`, 'Benar')}
            ${metric(formatPercent(row.accuracy), 'Akurasi')}
          </div>
          <button type="button" data-participant="${escapeHtml(row.id)}" aria-expanded="${state.activeParticipant === row.id ? 'true' : 'false'}">Lihat Prediksi</button>
        </article>
      `).join('')
      : '<p class="meta">Tidak ada peserta yang cocok dengan filter saat ini.</p>';

    els.participantCards.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => renderParticipantDetail(button.dataset.participant));
    });
  }

  function renderParticipantDetail(participantId) {
    const participant = data.participants.find((item) => item.id === participantId);
    if (!participant) return;

    const predictions = (predictionsByParticipant.get(participantId) || []).filter((prediction) => {
      return filteredMatchSet().has(prediction.matchId);
    });

    state.activeParticipant = participantId;
    els.participantDetail.hidden = false;
    els.participantDetail.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Lembar prediksi</p>
          <h2>${escapeHtml(participant.displayName)}</h2>
        </div>
        <div class="detail-actions">
          <p>${escapeHtml(participant.division)}${participant.date ? ` - Bergabung: ${formatShortDate(participant.date)}` : ''}</p>
          <button type="button" class="close-detail" aria-label="Tutup lembar prediksi">Tutup</button>
        </div>
      </div>
      <div class="prediction-list">
        ${predictions.map((prediction) => predictionItem(prediction)).join('')}
      </div>
    `;

    els.participantCards.querySelectorAll('button[data-participant]').forEach((button) => {
      button.setAttribute('aria-expanded', String(button.dataset.participant === participantId));
    });

    const closeButton = els.participantDetail.querySelector('.close-detail');
    if (closeButton) {
      closeButton.addEventListener('click', closeParticipantDetail);
    }

    els.participantDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeParticipantDetail() {
    const participantId = state.activeParticipant;
    state.activeParticipant = null;
    els.participantDetail.innerHTML = '';
    els.participantDetail.hidden = true;

    let trigger = null;
    els.participantCards.querySelectorAll('button[data-participant]').forEach((button) => {
      if (button.dataset.participant === participantId) trigger = button;
      button.setAttribute('aria-expanded', 'false');
    });

    if (trigger) trigger.focus();
  }

  function predictionItem(prediction) {
    const match = matchById.get(prediction.matchId);
    const result = resultByMatch.get(prediction.matchId);
    const isFinal = result && result.status === 'FINAL';
    const isCorrect = isFinal && prediction.prediction === result.result;
    const outcomeClass = isFinal ? (isCorrect ? 'outcome-correct' : 'outcome-wrong') : '';

    return `
      <article class="prediction-item ${outcomeClass}">
        <p class="meta">Pertandingan ${match.matchNo} · Grup ${escapeHtml(match.group)} · ${formatShortDate(match.kickoffWib)}</p>
        <strong>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</strong>
        <div class="metric-row">
          <span class="prediction-chip">${predictionLabel(prediction.prediction)}</span>
          <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? result.result : 'Menunggu'}</span>
        </div>
      </article>
    `;
  }

  function renderMatches() {
    const matches = getFilteredMatches();
    els.matchCards.innerHTML = matches.length
      ? matches.map((match) => {
        const result = resultByMatch.get(match.id);
        const isFinal = result && result.status === 'FINAL';
        const score = isFinal ? `${result.homeScore} - ${result.awayScore}` : '-';
        const outcome = isFinal ? matchOutcomeClasses(match, result) : { home: '', away: '' };

        return `
          <article class="match-card">
            <header>
              <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? 'Selesai' : 'Menunggu'}</span>
              <span class="meta">Grup ${escapeHtml(match.group)}</span>
            </header>
            <div class="teams">
              <span class="${outcome.home}">${escapeHtml(match.homeTeam)}</span>
              <span class="scoreline">${score}</span>
              <span class="${outcome.away}">${escapeHtml(match.awayTeam)}</span>
            </div>
            <p class="meta">${formatDateTime(match.kickoffWib)} · ${escapeHtml(match.location)}</p>
            <p class="meta">Ambil hasil setelah: ${formatDateTime(match.resultFetchAfterWib)}</p>
            ${matchPredictions(match.id, isFinal)}
          </article>
        `;
      }).join('')
      : '<p class="meta">Tidak ada pertandingan yang cocok dengan filter saat ini.</p>';
  }

  function matchOutcomeClasses(match, result) {
    const homeScore = Number(result.homeScore);
    const awayScore = Number(result.awayScore);

    if (homeScore > awayScore) {
      return {
        home: 'team-is-winner',
        away: 'team-is-loser',
      };
    }

    if (awayScore > homeScore) {
      return {
        home: 'team-is-loser',
        away: 'team-is-winner',
      };
    }

    return {
      home: 'team-is-draw',
      away: 'team-is-draw',
    };
  }

  function matchPredictions(matchId, isFinal) {
    const predictions = predictionsByMatch.get(matchId) || [];
    const totals = predictions.reduce((counts, prediction) => {
      const value = prediction.prediction;
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, { W: 0, L: 0, D: 0 });

    const items = [
      ['W', 'Menang'],
      ['D', 'Seri'],
      ['L', 'Kalah'],
    ].map(([value, label]) => `
      <li class="${isFinal ? 'is-final' : 'is-pending'}">
        <span>${escapeHtml(label)}</span>
        <strong>${totals[value]}</strong>
      </li>
    `).join('');

    return `
      <div class="match-predictions" aria-label="Statistik prediksi peserta">
        <h3>Statistik Prediksi</h3>
        <ul>${items}</ul>
      </div>
    `;
  }

  function renderStream() {
    const standings = calculateStandings().slice(0, 10);
    els.streamBoard.innerHTML = standings.length
      ? standings.map((row, index) => `
        <div class="stream-row">
          <strong>#${index + 1}</strong>
          <div>
            <strong>${escapeHtml(row.displayName)}</strong>
            <span>${escapeHtml(row.division)}</span>
          </div>
          <strong>${row.points} poin</strong>
          <span>${formatPercent(row.accuracy)}</span>
        </div>
      `).join('')
      : '<p class="meta">Tidak ada data yang cocok dengan filter saat ini.</p>';

    els.streamView.hidden = false;
  }

  function contextText() {
    const parts = [];
    if (state.group !== 'ALL') parts.push(`Grup ${state.group}`);
    if (state.matchday !== 'ALL') parts.push(formatShortDate(state.matchday));
    if (state.search) parts.push(`Cari: ${state.search}`);
    return parts.length ? `Difilter berdasarkan ${parts.join(' · ')}` : 'Diurutkan berdasarkan poin, akurasi, lalu nama.';
  }

  function metric(value, label) {
    return `<div class="metric"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function groupBy(items, key) {
    return items.reduce((map, item) => {
      const value = item[key];
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(item);
      return map;
    }, new Map());
  }

  function unique(items) {
    return Array.from(new Set(items));
  }

  function predictionLabel(value) {
    return { W: 'W', L: 'L', D: 'D' }[value] || value;
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function formatShortDate(value) {
    const date = new Date(value);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
