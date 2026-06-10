(function () {
  const data = window.WORLD_CUP_LEADERBOARD_DATA;

  if (!data) {
    document.body.innerHTML = '<main class="view is-visible"><h1>File data tidak ditemukan</h1><p>Pastikan site/data/site-data.js mendefinisikan WORLD_CUP_LEADERBOARD_DATA.</p></main>';
    return;
  }

  const state = {
    view: 'leaderboard',
    group: 'ALL',
    matchday: 'ALL',
    search: '',
  };

  const resultByMatch = new Map(data.results.map((result) => [result.matchId, result]));
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const predictionsByParticipant = groupBy(data.predictions, 'participantId');
  const streamMode = new URLSearchParams(window.location.search).get('mode') === 'stream';

  const els = {
    dataMode: document.getElementById('dataMode'),
    lastUpdated: document.getElementById('lastUpdated'),
    scoringNote: document.getElementById('scoringNote'),
    summaryParticipants: document.getElementById('summaryParticipants'),
    summaryFinished: document.getElementById('summaryFinished'),
    summaryPending: document.getElementById('summaryPending'),
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
  };

  init();

  function init() {
    document.body.classList.toggle('stream', streamMode);
    fillMetadata();
    fillFilters();
    bindEvents();
    render();

    if (streamMode) {
      renderStream();
      window.setInterval(renderStream, 30000);
    }
  }

  function fillMetadata() {
    const finalCount = data.results.filter((result) => result.status === 'FINAL').length;
    els.dataMode.textContent = data.metadata.dataMode;
    els.lastUpdated.textContent = `Dibuat: ${formatDateTime(data.metadata.generatedAt)}`;
    els.scoringNote.textContent = data.metadata.scoring;
    els.summaryParticipants.textContent = data.participants.length;
    els.summaryFinished.textContent = finalCount;
    els.summaryPending.textContent = data.matches.length - finalCount;
  }

  function fillFilters() {
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
    document.querySelectorAll('.tab').forEach((button) => {
      button.addEventListener('click', () => {
        state.view = button.dataset.view;
        document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('is-active', tab === button));
        render();
      });
    });

    els.groupFilter.addEventListener('change', (event) => {
      state.group = event.target.value;
      render();
    });

    els.matchdayFilter.addEventListener('change', (event) => {
      state.matchday = event.target.value;
      render();
    });

    els.searchInput.addEventListener('input', (event) => {
      state.search = event.target.value.trim().toLowerCase();
      render();
    });
  }

  function render() {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('is-visible'));
    document.getElementById(`${state.view}View`).classList.add('is-visible');

    const standings = calculateStandings();
    renderLeaderboard(standings);
    renderParticipants(standings);
    renderMatches();
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

    els.leaderboardBody.innerHTML = standings.map((row, index) => `
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
    `).join('');
  }

  function renderParticipants(standings) {
    els.participantCards.innerHTML = standings.map((row) => `
      <article class="participant-card">
        <div class="participant-name">
          <span class="badge">${escapeHtml(row.badge || row.displayName.slice(0, 1))}</span>
          <h3>${escapeHtml(row.displayName)}</h3>
        </div>
        <p class="meta">${escapeHtml(row.division)}</p>
        <div class="metric-row">
          ${metric(row.points, 'Poin')}
          ${metric(`${row.correct}/${row.played}`, 'Benar')}
          ${metric(formatPercent(row.accuracy), 'Akurasi')}
        </div>
        <button type="button" data-participant="${escapeHtml(row.id)}">Lihat Prediksi</button>
      </article>
    `).join('');

    els.participantCards.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => renderParticipantDetail(button.dataset.participant));
    });
  }

  function renderParticipantDetail(participantId) {
    const participant = data.participants.find((item) => item.id === participantId);
    const predictions = (predictionsByParticipant.get(participantId) || []).filter((prediction) => {
      return filteredMatchSet().has(prediction.matchId);
    });

    els.participantDetail.hidden = false;
    els.participantDetail.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Lembar prediksi</p>
          <h2>${escapeHtml(participant.displayName)}</h2>
        </div>
        <p>${escapeHtml(participant.division)}</p>
      </div>
      <div class="prediction-list">
        ${predictions.map((prediction) => predictionItem(prediction)).join('')}
      </div>
    `;
    els.participantDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    els.matchCards.innerHTML = matches.map((match) => {
      const result = resultByMatch.get(match.id);
      const isFinal = result && result.status === 'FINAL';
      const score = isFinal ? `${result.homeScore} - ${result.awayScore}` : '-';
      return `
        <article class="match-card">
          <header>
            <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? 'Selesai' : 'Menunggu'}</span>
            <span class="meta">Grup ${escapeHtml(match.group)}</span>
          </header>
          <div class="teams">
            <span>${escapeHtml(match.homeTeam)}</span>
            <span class="scoreline">${score}</span>
            <span>${escapeHtml(match.awayTeam)}</span>
          </div>
          <p class="meta">${formatDateTime(match.kickoffWib)} · ${escapeHtml(match.location)}</p>
          <p class="meta">Ambil hasil setelah: ${formatDateTime(match.resultFetchAfterWib)}</p>
        </article>
      `;
    }).join('');
  }

  function renderStream() {
    const standings = calculateStandings().slice(0, 10);
    els.streamBoard.innerHTML = standings.map((row, index) => `
      <div class="stream-row">
        <strong>#${index + 1}</strong>
        <div>
          <strong>${escapeHtml(row.displayName)}</strong>
          <span>${escapeHtml(row.division)}</span>
        </div>
        <strong>${row.points} poin</strong>
        <span>${formatPercent(row.accuracy)}</span>
      </div>
    `).join('');
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
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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
