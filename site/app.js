(function () {
  const data = window.WORLD_CUP_LEADERBOARD_DATA;

  if (!data) {
    document.body.innerHTML = '<main class="view is-visible"><h1>File data tidak ditemukan</h1><p>Pastikan site/data/site-data.js mendefinisikan WORLD_CUP_LEADERBOARD_DATA.</p></main>';
    return;
  }

  const storageKey = 'credit-divisions-world-cup-theme';
  const drawStorageKey = 'credit-divisions-world-cup-country-draws-v1';
  const streamMode = new URLSearchParams(window.location.search).get('mode') === 'stream';

  const state = {
    view: 'leaderboard',
    activeNav: 'beranda',
    group: 'ALL',
    matchday: 'ALL',
    search: '',
    activeParticipant: null,
    theme: 'dark',
    draw: {
      selectedParticipantId: null,
      currentPicks: [],
      spinning: false,
      wheelRotation: 0,
      results: [],
      skippedParticipantIds: [],
      excludedTeamNames: [],
    },
  };

  const resultByMatch = new Map(data.results.map((result) => [result.matchId, result]));
  const matchById = new Map(data.matches.map((match) => [match.id, match]));
  const predictionsByParticipant = groupBy(data.predictions, 'participantId');
  const predictionsByMatch = groupBy(data.predictions, 'matchId');
  const officialStandingsByParticipant = new Map((data.standings || []).map((row) => [row.participantId, row]));

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
    navMenu: document.getElementById('secondaryNav'),
    navButtons: Array.from(document.querySelectorAll('.nav-button[data-nav]')),
    participantsSheetLink: document.getElementById('participantsSheetLink'),
    matchesSheetLink: document.getElementById('matchesSheetLink'),
    participantsSheetEmbed: document.getElementById('participantsSheetEmbed'),
    matchesSheetEmbed: document.getElementById('matchesSheetEmbed'),
    drawWheel: document.getElementById('drawWheel'),
    drawParticipantSelect: document.getElementById('drawParticipantSelect'),
    drawParticipantActive: document.getElementById('drawParticipantActive'),
    drawParticipantButton: document.getElementById('drawParticipantButton'),
    drawSpinButton: document.getElementById('drawSpinButton'),
    drawResetButton: document.getElementById('drawResetButton'),
    drawStatus: document.getElementById('drawStatus'),
    drawStepLabel: document.getElementById('drawStepLabel'),
    drawRemainingLabel: document.getElementById('drawRemainingLabel'),
    drawCurrentParticipant: document.getElementById('drawCurrentParticipant'),
    drawResultBody: document.getElementById('drawResultBody'),
    drawModal: document.getElementById('drawModal'),
    drawModalBody: document.getElementById('drawModalBody'),
    drawModalClose: document.getElementById('drawModalClose'),
    drawExclude1: document.getElementById('drawExclude1'),
    drawExclude2: document.getElementById('drawExclude2'),
    drawExclude3: document.getElementById('drawExclude3'),
    drawExclusionApply: document.getElementById('drawExclusionApply'),
    drawExclusionClear: document.getElementById('drawExclusionClear'),
    drawExportCsvButton: document.getElementById('drawExportCsvButton'),
    bracketBoard: document.getElementById('bracketBoard'),
  };


  const DRAW_COUNTRIES = [
    { name: 'Brazil', bracket: 'Left', group: 'Group C', match: 'M76: Brazil vs Japan | Monday, 29 June 2026 | Houston Stadium, Houston' },
    { name: 'Japan', bracket: 'Left', group: 'Group F', match: 'M76: Brazil vs Japan | Monday, 29 June 2026 | Houston Stadium, Houston' },
    { name: 'Ivory Coast', bracket: 'Left', group: 'Group E', match: 'M78: Ivory Coast vs Norway | Tuesday, 30 June 2026 | Dallas Stadium, Arlington' },
    { name: 'Norway', bracket: 'Left', group: 'Group I', match: 'M78: Ivory Coast vs Norway | Tuesday, 30 June 2026 | Dallas Stadium, Arlington' },
    { name: 'Mexico', bracket: 'Left', group: 'Group A', match: 'M79: Mexico vs Ecuador | Tuesday, 30 June 2026 | Mexico City Stadium, Mexico City' },
    { name: 'Ecuador', bracket: 'Left', group: 'Group E', match: 'M79: Mexico vs Ecuador | Tuesday, 30 June 2026 | Mexico City Stadium, Mexico City' },
    { name: 'England', bracket: 'Left', group: 'Group L', match: 'M80: England vs DR Congo | Wednesday, 1 July 2026 | Atlanta Stadium, Atlanta' },
    { name: 'DR Congo', bracket: 'Left', group: 'Group K', match: 'M80: England vs DR Congo | Wednesday, 1 July 2026 | Atlanta Stadium, Atlanta' },
    { name: 'Switzerland', bracket: 'Left', group: 'Group B', match: 'M85: Switzerland vs Algeria | Thursday, 2 July 2026 | BC Place Vancouver, Vancouver' },
    { name: 'Algeria', bracket: 'Left', group: 'Group J', match: 'M85: Switzerland vs Algeria | Thursday, 2 July 2026 | BC Place Vancouver, Vancouver' },
    { name: 'Colombia', bracket: 'Left', group: 'Group K', match: 'M87: Colombia vs Ghana | Friday, 3 July 2026 | Kansas City Stadium, Kansas City' },
    { name: 'Ghana', bracket: 'Left', group: 'Group L', match: 'M87: Colombia vs Ghana | Friday, 3 July 2026 | Kansas City Stadium, Kansas City' },
    { name: 'Australia', bracket: 'Left', group: 'Group D', match: 'M88: Australia vs Egypt | Friday, 3 July 2026 | Dallas Stadium, Arlington' },
    { name: 'Egypt', bracket: 'Left', group: 'Group G', match: 'M88: Australia vs Egypt | Friday, 3 July 2026 | Dallas Stadium, Arlington' },
    { name: 'Argentina', bracket: 'Left', group: 'Group J', match: 'M86: Argentina vs Cape Verde | Friday, 3 July 2026 | Miami Stadium, Miami Gardens' },
    { name: 'Cape Verde', bracket: 'Left', group: 'Group H', match: 'M86: Argentina vs Cape Verde | Friday, 3 July 2026 | Miami Stadium, Miami Gardens' },
    { name: 'South Africa', bracket: 'Right', group: 'Group A', match: 'M73: South Africa vs Canada | Sunday, 28 June 2026 | Los Angeles Stadium, Los Angeles' },
    { name: 'Canada', bracket: 'Right', group: 'Group B', match: 'M73: South Africa vs Canada | Sunday, 28 June 2026 | Los Angeles Stadium, Los Angeles' },
    { name: 'Netherlands', bracket: 'Right', group: 'Group F', match: 'M75: Netherlands vs Morocco | Monday, 29 June 2026 | Monterrey Stadium, Monterrey' },
    { name: 'Morocco', bracket: 'Right', group: 'Group C', match: 'M75: Netherlands vs Morocco | Monday, 29 June 2026 | Monterrey Stadium, Monterrey' },
    { name: 'Germany', bracket: 'Right', group: 'Group E', match: 'M74: Germany vs Paraguay | Monday, 29 June 2026 | Boston Stadium, Boston' },
    { name: 'Paraguay', bracket: 'Right', group: 'Group D', match: 'M74: Germany vs Paraguay | Monday, 29 June 2026 | Boston Stadium, Boston' },
    { name: 'France', bracket: 'Right', group: 'Group I', match: 'M77: France vs Sweden | Tuesday, 30 June 2026 | New York New Jersey Stadium, New York/New Jersey' },
    { name: 'Sweden', bracket: 'Right', group: 'Group F', match: 'M77: France vs Sweden | Tuesday, 30 June 2026 | New York New Jersey Stadium, New York/New Jersey' },
    { name: 'Belgium', bracket: 'Right', group: 'Group G', match: 'M82: Belgium vs Senegal | Wednesday, 1 July 2026 | Seattle Stadium, Seattle' },
    { name: 'Senegal', bracket: 'Right', group: 'Group I', match: 'M82: Belgium vs Senegal | Wednesday, 1 July 2026 | Seattle Stadium, Seattle' },
    { name: 'United States', bracket: 'Right', group: 'Group D', match: 'M81: United States vs Bosnia and Herzegovina | Wednesday, 1 July 2026 | San Francisco Bay Area Stadium, Santa Clara' },
    { name: 'Bosnia and Herzegovina', bracket: 'Right', group: 'Group B', match: 'M81: United States vs Bosnia and Herzegovina | Wednesday, 1 July 2026 | San Francisco Bay Area Stadium, Santa Clara' },
    { name: 'Spain', bracket: 'Right', group: 'Group H', match: 'M84: Spain vs Austria | Thursday, 2 July 2026 | Los Angeles Stadium, Los Angeles' },
    { name: 'Austria', bracket: 'Right', group: 'Group J', match: 'M84: Spain vs Austria | Thursday, 2 July 2026 | Los Angeles Stadium, Los Angeles' },
    { name: 'Portugal', bracket: 'Right', group: 'Group K', match: 'M83: Portugal vs Croatia | Thursday, 2 July 2026 | Toronto Stadium, Toronto' },
    { name: 'Croatia', bracket: 'Right', group: 'Group L', match: 'M83: Portugal vs Croatia | Thursday, 2 July 2026 | Toronto Stadium, Toronto' },
  ];


  const LOCKED_BRACKET_TEAMS = {
    Brazil: 'Royhan', Japan: 'Rokhim', 'Ivory Coast': 'Junius', Norway: 'Joko', Mexico: 'Ganesh', Ecuador: 'Appa', England: 'Richa', 'DR Congo': 'Rena', Switzerland: 'Bowo', Algeria: 'Irwan', Colombia: 'MBG (Mas Benny G)', Ghana: 'Oman', Australia: 'Karina', Egypt: 'Fauzi Rulandi', Argentina: 'Anggit Pratitis', 'Cape Verde': 'Yanu',
    'South Africa': 'Anggit Pratitis', Canada: 'Joko', Netherlands: 'Fauzi Rulandi', Morocco: 'Yanu', Germany: 'Rokhim', Paraguay: 'Irwan', France: 'Ganesh', Sweden: 'Oman', Belgium: 'Rena', Senegal: 'Royhan', 'United States': 'Bowo', 'Bosnia and Herzegovina': 'Karina', Spain: 'Junius', Austria: 'MBG (Mas Benny G)', Portugal: 'Richa', Croatia: 'Appa',
  };

  const LOCKED_DRAW_RESULTS = [
    {
      timeDrawing: '23 Jun 2026, 20:00',
      participantId: 'P008',
      participantName: 'Royhan',
      firstTeam: { name: 'Brazil', bracket: 'Left', group: 'Group C' },
      secondTeam: { name: 'Senegal', bracket: 'Right', group: 'Group I' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:05',
      participantId: 'P005',
      participantName: 'Rokhim',
      firstTeam: { name: 'Japan', bracket: 'Left', group: 'Group F' },
      secondTeam: { name: 'Germany', bracket: 'Right', group: 'Group E' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:10',
      participantId: 'P018',
      participantName: 'Junius',
      firstTeam: { name: 'Ivory Coast', bracket: 'Left', group: 'Group E' },
      secondTeam: { name: 'Spain', bracket: 'Right', group: 'Group H' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:15',
      participantId: 'P004',
      participantName: 'Joko',
      firstTeam: { name: 'Norway', bracket: 'Left', group: 'Group I' },
      secondTeam: { name: 'Canada', bracket: 'Right', group: 'Group B' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:20',
      participantId: 'P017',
      participantName: 'Ganesh',
      firstTeam: { name: 'Mexico', bracket: 'Left', group: 'Group A' },
      secondTeam: { name: 'France', bracket: 'Right', group: 'Group I' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:25',
      participantId: 'P012',
      participantName: 'Appa',
      firstTeam: { name: 'Ecuador', bracket: 'Left', group: 'Group E' },
      secondTeam: { name: 'Croatia', bracket: 'Right', group: 'Group L' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:30',
      participantId: 'P014',
      participantName: 'Richa',
      firstTeam: { name: 'England', bracket: 'Left', group: 'Group L' },
      secondTeam: { name: 'Portugal', bracket: 'Right', group: 'Group K' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:35',
      participantId: 'P011',
      participantName: 'Rena',
      firstTeam: { name: 'DR Congo', bracket: 'Left', group: 'Group K' },
      secondTeam: { name: 'Belgium', bracket: 'Right', group: 'Group G' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:40',
      participantId: 'P009',
      participantName: 'Bowo',
      firstTeam: { name: 'Switzerland', bracket: 'Left', group: 'Group B' },
      secondTeam: { name: 'United States', bracket: 'Right', group: 'Group D' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:45',
      participantId: 'P013',
      participantName: 'Irwan',
      firstTeam: { name: 'Algeria', bracket: 'Left', group: 'Group J' },
      secondTeam: { name: 'Paraguay', bracket: 'Right', group: 'Group D' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:50',
      participantId: 'P015',
      participantName: 'MBG (Mas Benny G)',
      firstTeam: { name: 'Colombia', bracket: 'Left', group: 'Group K' },
      secondTeam: { name: 'Austria', bracket: 'Right', group: 'Group J' }
    },
    {
      timeDrawing: '23 Jun 2026, 20:55',
      participantId: 'P007',
      participantName: 'Oman',
      firstTeam: { name: 'Ghana', bracket: 'Left', group: 'Group L' },
      secondTeam: { name: 'Sweden', bracket: 'Right', group: 'Group F' }
    },
    {
      timeDrawing: '23 Jun 2026, 21:00',
      participantId: 'P020',
      participantName: 'Karina',
      firstTeam: { name: 'Australia', bracket: 'Left', group: 'Group D' },
      secondTeam: { name: 'Bosnia and Herzegovina', bracket: 'Right', group: 'Group B' }
    },
    {
      timeDrawing: '23 Jun 2026, 21:05',
      participantId: 'P006',
      participantName: 'Fauzi Rulandi',
      firstTeam: { name: 'Egypt', bracket: 'Left', group: 'Group G' },
      secondTeam: { name: 'Netherlands', bracket: 'Right', group: 'Group F' }
    },
    {
      timeDrawing: '23 Jun 2026, 21:10',
      participantId: 'P016',
      participantName: 'Anggit Pratitis',
      firstTeam: { name: 'Argentina', bracket: 'Left', group: 'Group J' },
      secondTeam: { name: 'South Africa', bracket: 'Right', group: 'Group A' }
    },
    {
      timeDrawing: '23 Jun 2026, 21:15',
      participantId: 'P003',
      participantName: 'Yanu',
      firstTeam: { name: 'Cape Verde', bracket: 'Left', group: 'Group H' },
      secondTeam: { name: 'Morocco', bracket: 'Right', group: 'Group C' }
    }
  ];

  const BRACKET_MATCHES = [
    { id: 'M076', side: 'left', round: '32 Besar', home: 'Brazil', away: 'Japan' },
    { id: 'M078', side: 'left', round: '32 Besar', home: 'Ivory Coast', away: 'Norway' },
    { id: 'M079', side: 'left', round: '32 Besar', home: 'Mexico', away: 'Ecuador' },
    { id: 'M080', side: 'left', round: '32 Besar', home: 'England', away: 'DR Congo' },
    { id: 'M085', side: 'left', round: '32 Besar', home: 'Switzerland', away: 'Algeria' },
    { id: 'M087', side: 'left', round: '32 Besar', home: 'Colombia', away: 'Ghana' },
    { id: 'M088', side: 'left', round: '32 Besar', home: 'Australia', away: 'Egypt' },
    { id: 'M086', side: 'left', round: '32 Besar', home: 'Argentina', away: 'Cape Verde' },
    { id: 'M073', side: 'right', round: '32 Besar', home: 'South Africa', away: 'Canada' },
    { id: 'M075', side: 'right', round: '32 Besar', home: 'Netherlands', away: 'Morocco' },
    { id: 'M074', side: 'right', round: '32 Besar', home: 'Germany', away: 'Paraguay' },
    { id: 'M077', side: 'right', round: '32 Besar', home: 'France', away: 'Sweden' },
    { id: 'M082', side: 'right', round: '32 Besar', home: 'Belgium', away: 'Senegal' },
    { id: 'M081', side: 'right', round: '32 Besar', home: 'United States', away: 'Bosnia and Herzegovina' },
    { id: 'M084', side: 'right', round: '32 Besar', home: 'Spain', away: 'Austria' },
    { id: 'M083', side: 'right', round: '32 Besar', home: 'Portugal', away: 'Croatia' },
    { id: 'M091', side: 'left', round: '16 Besar', sources: ['M076', 'M078'] },
    { id: 'M092', side: 'left', round: '16 Besar', sources: ['M079', 'M080'] },
    { id: 'M096', side: 'left', round: '16 Besar', sources: ['M085', 'M087'] },
    { id: 'M095', side: 'left', round: '16 Besar', sources: ['M088', 'M086'] },
    { id: 'M089', side: 'right', round: '16 Besar', sources: ['M073', 'M075'] },
    { id: 'M090', side: 'right', round: '16 Besar', sources: ['M074', 'M077'] },
    { id: 'M094', side: 'right', round: '16 Besar', sources: ['M081', 'M082'] },
    { id: 'M093', side: 'right', round: '16 Besar', sources: ['M083', 'M084'] },
    { id: 'M099', side: 'left', round: '8 Besar', sources: ['M091', 'M092'] },
    { id: 'M100', side: 'left', round: '8 Besar', sources: ['M095', 'M096'] },
    { id: 'M097', side: 'right', round: '8 Besar', sources: ['M089', 'M090'] },
    { id: 'M098', side: 'right', round: '8 Besar', sources: ['M093', 'M094'] },
    { id: 'M102', side: 'left', round: '4 Besar', sources: ['M099', 'M100'] },
    { id: 'M101', side: 'right', round: '4 Besar', sources: ['M097', 'M098'] },
    { id: 'M104', side: 'final', round: 'Final', sources: ['M101', 'M102'] },
  ];

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
    loadDrawState();
    initializeDrawWheel();
    bindEvents();
    syncMenu(false);
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

    fillOfficialSheetLinks();

    if (els.heroStats) {
      els.heroStats.innerHTML = [
        heroStat(ICONS.people, data.participants.length, 'Peserta', 'var(--accent)'),
        heroStat(ICONS.check, finalCount, 'Selesai', 'var(--accent-2)'),
        heroStat(ICONS.clock, pendingCount, 'Menunggu', 'var(--accent-3)'),
      ].join('');
    }
  }

  function fillOfficialSheetLinks() {
    const sheetUrl = data.metadata.officialScoreSheetUrl || data.metadata.officialScoreSheetEmbedUrl;
    const embedUrl = data.metadata.officialScoreSheetEmbedUrl || data.metadata.officialScoreSheetUrl;
    [els.participantsSheetLink, els.matchesSheetLink].forEach((link) => {
      if (!link) return;
      if (sheetUrl) {
        link.href = sheetUrl;
        link.hidden = false;
      } else {
        link.hidden = true;
      }
    });

    [els.participantsSheetEmbed, els.matchesSheetEmbed].forEach((target) => {
      if (!target) return;
      if (!embedUrl) {
        target.hidden = true;
        target.innerHTML = '';
        return;
      }
      target.hidden = false;
      target.innerHTML = `<iframe title="Google Sheet SKOR panitia" src="${escapeHtml(embedUrl)}" loading="lazy"></iframe>`;
    });
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

    if (els.drawParticipantButton) {
      els.drawParticipantButton.addEventListener('click', selectDrawParticipant);
    }

    if (els.drawSpinButton) {
      els.drawSpinButton.addEventListener('click', spinDrawWheel);
    }

    if (els.drawResetButton) {
      els.drawResetButton.addEventListener('click', resetDrawState);
    }

    if (els.drawModalClose) {
      els.drawModalClose.addEventListener('click', closeDrawModal);
    }

    if (els.drawModal) {
      els.drawModal.addEventListener('click', (event) => {
        if (event.target === els.drawModal) closeDrawModal();
      });
    }

    if (els.drawExclusionApply) {
      els.drawExclusionApply.addEventListener('click', applyDrawExclusion);
    }

    if (els.drawExclusionClear) {
      els.drawExclusionClear.addEventListener('click', clearDrawExclusion);
    }

    if (els.drawExportCsvButton) {
      els.drawExportCsvButton.addEventListener('click', exportDrawResultsCsv);
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
    document.body.classList.remove('nav-is-open');
    syncMenu(false);
  }

  function syncMenu(isOpen) {
    if (els.menuToggle) {
      els.menuToggle.setAttribute('aria-expanded', String(isOpen));
      els.menuToggle.setAttribute('aria-label', isOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    }
    if (els.navMenu) {
      els.navMenu.hidden = !isOpen;
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
    renderDraw();
    renderBracket();
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
    const standings = data.participants.map((participant) => {
      const officialStanding = officialStandingsByParticipant.get(participant.id) || {};
      const points = Number(officialStanding.points || 0);
      const scoreAsIs = officialStanding.scoreAsIs === '' ? '' : Number(officialStanding.scoreAsIs || 0);

      return {
        ...participant,
        points,
        correct: points,
        wrong: '',
        played: '',
        accuracy: null,
        scoreAsIs,
        officialDisplayName: officialStanding.displayName || participant.displayName,
      };
    });

    return standings
      .filter((row) => participantMatchesSearch(row))
      .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
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
          ${metric(row.scoreAsIs === '' ? '-' : row.scoreAsIs, 'Skor as-is')}
          ${metric('Sheet SKOR', 'Sumber')}
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
          <td>${row.scoreAsIs === '' ? '-' : row.scoreAsIs}</td>
          <td>Sheet SKOR</td>
        </tr>
      `).join('')
      : '<tr><td colspan="6">Tidak ada data yang cocok dengan filter saat ini.</td></tr>';
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
            ${metric(row.scoreAsIs === '' ? '-' : row.scoreAsIs, 'Skor as-is')}
            ${metric('Sheet SKOR', 'Sumber')}
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
        <p class="meta">Pertandingan ${match.matchNo} Â· Grup ${escapeHtml(match.group)} Â· ${formatShortDate(match.kickoffWib)}</p>
        <strong>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</strong>
        <div class="metric-row">
          <span class="prediction-chip">${predictionLabel(prediction.prediction)}</span>
          <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? result.result : 'Menunggu'}</span>
        </div>
      </article>
    `;
  }


  function renderBracket() {
    if (!els.bracketBoard) return;
    const nodes = buildBracketNodes();
    
    const roundOrder = [
      ['32 Besar', ['M076', 'M078', 'M079', 'M080', 'M088', 'M086', 'M085', 'M087', 'M073', 'M075', 'M074', 'M077', 'M083', 'M084', 'M081', 'M082']],
      ['16 Besar', ['M091', 'M092', 'M095', 'M096', 'M089', 'M090', 'M093', 'M094']],
      ['8 Besar', ['M099', 'M100', 'M097', 'M098']],
      ['4 Besar', ['M102', 'M101']],
      ['Final', ['M104']]
    ];

    let html = '<div class="google-bracket-container">';
    html += '<button type="button" class="bracket-scroll-btn left" aria-label="Scroll left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>';
    html += '<div class="google-bracket-scroll" id="googleBracketScroll">';
    html += '<div class="google-bracket">';
    
    roundOrder.forEach(([roundName, matchIds]) => {
      html += `<div class="bracket-column">`;
      html += `<div class="bracket-round-header">${roundName}</div>`;
      html += `<div class="bracket-column-matches">`;
      matchIds.forEach(id => {
        const node = nodes.find(n => n.id === id);
        html += `<div class="bracket-match-wrapper">`;
        if (node) {
          html += bracketCard(node);
        } else {
          html += `<article class="bracket-card google-match-card"><header class="google-match-header"><span class="meta">TBD</span><span class="status-chip">-</span></header><div class="google-match-teams"><div class="google-match-team"><span class="google-match-team-name"><strong>TBD</strong></span><span class="google-match-score"></span></div><div class="google-match-team"><span class="google-match-team-name"><strong>TBD</strong></span><span class="google-match-score"></span></div></div></article>`;
        }
        html += `</div>`;
      });
      html += `</div></div>`;
    });
    
    html += '</div></div>';
    html += '<button type="button" class="bracket-scroll-btn right" aria-label="Scroll right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>';
    html += '</div>';
    
    els.bracketBoard.innerHTML = html;

    const scrollContainer = document.getElementById('googleBracketScroll');
    const btnLeft = els.bracketBoard.querySelector('.bracket-scroll-btn.left');
    const btnRight = els.bracketBoard.querySelector('.bracket-scroll-btn.right');
    
    if (scrollContainer && btnLeft && btnRight) {
      const scrollAmount = 320;
      btnLeft.addEventListener('click', () => scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
      btnRight.addEventListener('click', () => scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
      
      const updateButtons = () => {
        btnLeft.disabled = scrollContainer.scrollLeft <= 0;
        btnRight.disabled = scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth - 1;
      };
      scrollContainer.addEventListener('scroll', updateButtons);
      updateButtons();
    }
  }

  function buildBracketNodes() {
    const nodes = new Map();
    BRACKET_MATCHES.forEach((template) => {
      const match = matchById.get(template.id) || {};
      const result = resultByMatch.get(template.id);
      const home = template.home ? bracketTeam(template.home) : bracketWinner(nodes.get(template.sources[0]));
      const away = template.away ? bracketTeam(template.away) : bracketWinner(nodes.get(template.sources[1]));
      const node = { ...template, match, result, home, away };
      nodes.set(template.id, node);
    });
    return Array.from(nodes.values());
  }

  function bracketTeam(country) {
    return { country, participant: LOCKED_BRACKET_TEAMS[country] || 'TBD' };
  }

  function bracketWinner(node) {
    if (!node || !node.result || node.result.status !== 'FINAL') return { country: 'TBD', participant: 'TBD' };
    if (node.result.result === 'W') return node.home;
    if (node.result.result === 'L') return node.away;
    return { country: 'TBD', participant: 'TBD' };
  }

  function bracketCard(node) {
    const isFinal = node.result && node.result.status === 'FINAL';
    const date = node.match.kickoffWib ? formatDateTime(node.match.kickoffWib) : 'TBD';
    const scoreText = isFinal ? formatScoreline(node.result) : '';
    return `<article class="bracket-card google-match-card ${isFinal ? 'is-final' : ''}">
      <header class="google-match-header">
        <span class="meta">${escapeHtml(date)}</span>
        <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? 'FT' : '-'}</span>
      </header>
      <div class="google-match-teams">
        ${bracketTeamLine(node.home, scoreText, isFinal && node.result.result === 'W')}
        ${bracketTeamLine(node.away, '', isFinal && node.result.result === 'L')}
      </div>
    </article>`;
  }

  function formatScoreline(result) {
    const homeScore = result ? result.homeScore : '';
    const awayScore = result ? result.awayScore : '';
    const homePenalty = result ? result.homePenaltyScore : '';
    const awayPenalty = result ? result.awayPenaltyScore : '';

    if (homePenalty !== '' && awayPenalty !== '' && homeScore === awayScore) {
      return `${escapeHtml(homeScore)}(${escapeHtml(homePenalty)}):${escapeHtml(awayScore)}(${escapeHtml(awayPenalty)})`;
    }

    return `${escapeHtml(homeScore)} - ${escapeHtml(awayScore)}`;
  }

  function bracketTeamLine(team, score, isWinner) {
    return `<div class="google-match-team ${isWinner ? 'team-is-winner' : ''}">
      <span class="google-match-team-name">${isWinner ? '<span class="winner-badge" aria-hidden="true">🏆</span>' : ''}<strong>${escapeHtml(team.country)}</strong> <small>(${escapeHtml(team.participant)})</small></span>
      <span class="google-match-score">${escapeHtml(score)}</span>
    </div>`;
  }

  function renderMatches() {
    const matches = getFilteredMatches();
    els.matchCards.innerHTML = matches.length
      ? matches.map((match) => {
        const result = resultByMatch.get(match.id);
        const isFinal = result && result.status === 'FINAL';
        const score = isFinal ? formatScoreline(result) : '-';
        const outcome = isFinal ? matchOutcomeClasses(match, result) : { home: '', away: '' };

        return `
          <article class="match-card">
            <header>
              <span class="status-chip ${isFinal ? 'final' : ''}">${isFinal ? 'Selesai' : 'Menunggu'}</span>
              <span class="meta">Grup ${escapeHtml(match.group)}</span>
            </header>
            <div class="teams">
              <span class="${outcome.home}">${outcome.home === 'team-is-winner' ? '<span class="winner-badge" aria-hidden="true">🏆</span>' : ''}${escapeHtml(match.homeTeam)}</span>
              <span class="scoreline">${score}</span>
              <span class="${outcome.away}">${outcome.away === 'team-is-winner' ? '<span class="winner-badge" aria-hidden="true">🏆</span>' : ''}${escapeHtml(match.awayTeam)}</span>
            </div>
            <p class="meta">${formatDateTime(match.kickoffWib)} Â· ${escapeHtml(match.location)}</p>
            <p class="meta">Ambil hasil setelah: ${formatDateTime(match.resultFetchAfterWib)}</p>
            ${matchPredictions(match.id, isFinal)}
          </article>
        `;
      }).join('')
      : '<p class="meta">Tidak ada pertandingan yang cocok dengan filter saat ini.</p>';
  }

  function matchOutcomeClasses(match, result) {
    const winner = String(result.result || '').toUpperCase();
    if (winner === 'W') {
      return {
        home: 'team-is-winner',
        away: 'team-is-loser',
      };
    }

    if (winner === 'L') {
      return {
        home: 'team-is-loser',
        away: 'team-is-winner',
      };
    }

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
          <span>Sheet SKOR</span>
        </div>
      `).join('')
      : '<p class="meta">Tidak ada data yang cocok dengan filter saat ini.</p>';

    els.streamView.hidden = false;
  }


  function initializeDrawWheel() {
    drawWheel();
  }

  function loadDrawState() {
    state.draw.results = LOCKED_DRAW_RESULTS;
    state.draw.skippedParticipantIds = [];
    state.draw.excludedTeamNames = [];
  }

  function saveDrawState() {
    // No-op: Draw results are locked
  }

  function renderDraw() {
    if (!els.drawParticipantSelect) return;
    const usedParticipantIds = new Set(state.draw.results.map((result) => result.participantId));
    const skipped = new Set(state.draw.skippedParticipantIds);
    const availableParticipants = data.participants.filter((participant) => !usedParticipantIds.has(participant.id) && !skipped.has(participant.id));
    const selectedStillAvailable = availableParticipants.some((participant) => participant.id === els.drawParticipantSelect.value);

    els.drawParticipantSelect.innerHTML = [
      '<option value="">Pilih peserta</option>',
      ...availableParticipants.map((participant) => `<option value="${escapeHtml(participant.id)}">${escapeHtml(participant.displayName)} - ${escapeHtml(participant.division)}</option>`),
    ].join('');

    if (selectedStillAvailable) els.drawParticipantSelect.value = state.draw.selectedParticipantId || '';

    // Populate exclusion dropdowns â€” all 32 countries, minus already-drawn ones
    const drawnNames = getDrawnCountryNames();
    const allAvailableForExclusion = DRAW_COUNTRIES.filter((c) => !drawnNames.has(c.name));
    const excluded = state.draw.excludedTeamNames;
    [els.drawExclude1, els.drawExclude2, els.drawExclude3].forEach((sel, idx) => {
      if (!sel) return;
      const currentVal = excluded[idx] || '';
      // Collect values chosen in the other two slots to avoid duplicates
      const otherVals = excluded.filter((_, i) => i !== idx && excluded[i]);
      sel.innerHTML = [
        '<option value="">â€” Tidak ada â€”</option>',
        ...allAvailableForExclusion
          .filter((c) => !otherVals.includes(c.name) || c.name === currentVal)
          .map((c) => `<option value="${escapeHtml(c.name)}"${c.name === currentVal ? ' selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.group)} / ${escapeHtml(c.bracket)})</option>`),
      ].join('');
    });

    const availableCountries = getAvailableDrawCountries();
    if (els.drawRemainingLabel) els.drawRemainingLabel.textContent = `${availableCountries.length} negara tersedia`;
    if (els.drawResultBody) {
      els.drawResultBody.innerHTML = state.draw.results.length
        ? state.draw.results.map((result) => `
          <tr>
            <td>${escapeHtml(result.timeDrawing)}</td>
            <td>${escapeHtml(result.participantName)}</td>
            <td>${escapeHtml(result.firstTeam.name)}</td>
            <td>${escapeHtml(teamGroupBracket(result.firstTeam))}</td>
            <td>${escapeHtml(result.secondTeam.name)}</td>
            <td>${escapeHtml(teamGroupBracket(result.secondTeam))}</td>
          </tr>
        `).join('')
        : '<tr><td colspan="6">Belum ada hasil undian.</td></tr>';
    }

    const participant = getCurrentDrawParticipant();
    if (els.drawCurrentParticipant) {
      els.drawCurrentParticipant.hidden = !participant;
      els.drawCurrentParticipant.innerHTML = participant
        ? `<strong>${escapeHtml(participant.displayName)}</strong><span>${escapeHtml(participant.division)}</span>`
        : '';
    }

    updateDrawControls();
    drawWheel();
  }

  function applyDrawExclusion() {
    const picks = [
      els.drawExclude1 ? els.drawExclude1.value : '',
      els.drawExclude2 ? els.drawExclude2.value : '',
      els.drawExclude3 ? els.drawExclude3.value : '',
    ].filter(Boolean);
    // Deduplicate
    state.draw.excludedTeamNames = [...new Set(picks)];
    saveDrawState();
    const names = state.draw.excludedTeamNames;
    setDrawStatus(names.length
      ? `${names.length} negara dikecualikan: ${names.join(', ')}.`
      : 'Tidak ada negara yang dikecualikan.');
    renderDraw();
  }

  function clearDrawExclusion() {
    state.draw.excludedTeamNames = [];
    saveDrawState();
    setDrawStatus('Semua eksklusif negara dihapus.');
    renderDraw();
  }

  function selectDrawParticipant() {
    const participantId = els.drawParticipantSelect ? els.drawParticipantSelect.value : '';
    if (!participantId) {
      setDrawStatus('Pilih peserta terlebih dahulu.');
      return;
    }

    if (els.drawParticipantActive && !els.drawParticipantActive.checked) {
      state.draw.skippedParticipantIds = unique([...state.draw.skippedParticipantIds, participantId]);
      state.draw.selectedParticipantId = null;
      state.draw.currentPicks = [];
      if (els.drawParticipantActive) els.drawParticipantActive.checked = true;
      saveDrawState();
      setDrawStatus('Peserta ditandai tidak ikut undian.');
      renderDraw();
      return;
    }

    state.draw.selectedParticipantId = participantId;
    state.draw.currentPicks = [];
    const participant = getCurrentDrawParticipant();
    setDrawStatus(participant ? `${participant.displayName} siap untuk undian pertama.` : 'Peserta siap untuk undian.');
    renderDraw();
  }

  function getCurrentDrawParticipant() {
    return data.participants.find((participant) => participant.id === state.draw.selectedParticipantId) || null;
  }

  function getDrawnCountryNames() {
    return new Set(state.draw.results.flatMap((result) => [result.firstTeam.name, result.secondTeam.name]));
  }

  function getAvailableDrawCountries() {
    const drawnNames = getDrawnCountryNames();
    const excluded = new Set(state.draw.excludedTeamNames);
    return DRAW_COUNTRIES.filter((country) => !drawnNames.has(country.name) && !excluded.has(country.name));
  }

  function getEligibleDrawCountries() {
    const available = getAvailableDrawCountries();
    const firstPick = state.draw.currentPicks[0];
    if (!firstPick) return available;
    return available.filter((country) => country.bracket !== firstPick.bracket && country.group !== firstPick.group);
  }

  function spinDrawWheel() {
    if (state.draw.spinning) return;
    const participant = getCurrentDrawParticipant();
    if (!participant) {
      setDrawStatus('Pilih dan gunakan peserta sebelum memutar roda.');
      return;
    }

    const eligible = getEligibleDrawCountries();
    if (!eligible.length) {
      setDrawStatus('Tidak ada negara valid yang tersisa untuk aturan bracket dan grup berbeda.');
      return;
    }

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const wheelCountries = getAvailableDrawCountries();
    const winnerIndex = wheelCountries.findIndex((country) => country.name === winner.name);
    const slice = (Math.PI * 2) / wheelCountries.length;
    const targetAngle = Math.PI * 1.5 - (winnerIndex * slice + slice / 2);
    const extraSpins = 5 + Math.floor(Math.random() * 4);
    const start = state.draw.wheelRotation;
    const end = start + extraSpins * Math.PI * 2 + normalizeAngle(targetAngle - start);
    const duration = 3600;
    const startedAt = performance.now();

    state.draw.spinning = true;
    updateDrawControls();
    setDrawStatus(`Roda berputar untuk ${participant.displayName}...`);

    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.draw.wheelRotation = start + (end - start) * eased;
      drawWheel();
      if (progress < 1) {
        window.requestAnimationFrame(animate);
        return;
      }
      state.draw.wheelRotation = end;
      finishDrawSpin(winner);
    }

    window.requestAnimationFrame(animate);
  }

  function finishDrawSpin(winner) {
    state.draw.spinning = false;
    state.draw.currentPicks.push(winner);

    if (state.draw.currentPicks.length === 1) {
      setDrawStatus(`${winner.name} terpilih. Putar sekali lagi untuk negara kedua dari bracket dan grup berbeda.`);
      updateDrawControls();
      drawWheel();
      return;
    }

    const participant = getCurrentDrawParticipant();
    const [firstTeam, secondTeam] = state.draw.currentPicks;
    const result = {
      timeDrawing: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }),
      participantId: participant.id,
      participantName: participant.displayName,
      firstTeam,
      secondTeam,
    };
    state.draw.results.push(result);
    state.draw.selectedParticipantId = null;
    state.draw.currentPicks = [];
    saveDrawState();
    showDrawModal(result);
    setDrawStatus(`${participant.displayName} selesai mendapatkan ${firstTeam.name} dan ${secondTeam.name}.`);
    renderDraw();
  }

  function updateDrawControls() {
    const participant = getCurrentDrawParticipant();
    const eligibleCount = getEligibleDrawCountries().length;
    if (els.drawSpinButton) {
      els.drawSpinButton.disabled = state.draw.spinning || !participant || eligibleCount === 0;
      els.drawSpinButton.textContent = state.draw.currentPicks.length ? 'Putar Roda Kedua' : 'Putar Roda';
    }
    if (els.drawStepLabel) {
      els.drawStepLabel.textContent = participant
        ? (state.draw.currentPicks.length ? 'Undian ke-2' : 'Undian ke-1')
        : 'Pilih peserta';
    }
  }

  function drawWheel() {
    if (!els.drawWheel) return;
    const canvas = els.drawWheel;
    const context = canvas.getContext('2d');
    const countries = getAvailableDrawCountries();
    const size = canvas.width;
    const radius = size / 2 - 12;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(size / 2, size / 2);
    context.rotate(state.draw.wheelRotation);

    if (!countries.length) {
      context.fillStyle = '#1f2b36';
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
      return;
    }

    const slice = (Math.PI * 2) / countries.length;
    countries.forEach((country, index) => {
      const start = index * slice;
      const end = start + slice;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, radius, start, end);
      context.closePath();
      context.fillStyle = index % 4 === 0 ? '#21d07a' : index % 4 === 1 ? '#43a8ff' : index % 4 === 2 ? '#f2b33d' : '#ef6a70';
      context.fill();
      context.strokeStyle = 'rgba(255,255,255,0.32)';
      context.lineWidth = 2;
      context.stroke();

      context.save();
      context.rotate(start + slice / 2);
      context.textAlign = 'right';
      context.fillStyle = '#06131d';
      context.font = '700 13px Segoe UI, sans-serif';
      context.fillText(country.name, radius - 16, 4);
      context.restore();
    });
    context.restore();
  }

  function showDrawModal(result) {
    if (!els.drawModal || !els.drawModalBody) return;
    els.drawModalBody.innerHTML = `
      <p><strong>${escapeHtml(result.participantName)}</strong> mendapatkan:</p>
      <div class="draw-modal-teams">
        <article><strong>${escapeHtml(result.firstTeam.name)}</strong><span>${escapeHtml(teamGroupBracket(result.firstTeam))}</span></article>
        <article><strong>${escapeHtml(result.secondTeam.name)}</strong><span>${escapeHtml(teamGroupBracket(result.secondTeam))}</span></article>
      </div>
    `;
    els.drawModal.hidden = false;
    els.drawModalClose.focus();
  }

  function closeDrawModal() {
    if (els.drawModal) els.drawModal.hidden = true;
  }

  function resetDrawState() {
    // No-op: Draw results are locked
  }

  function exportDrawResultsCsv() {
    if (!state.draw.results.length) {
      setDrawStatus('Belum ada hasil undian untuk diekspor.');
      return;
    }

    const headers = ['Time Drawing', 'Participant', '1st Team', '1st Team Group/Bracket', '2nd Team', '2nd Team Group/Bracket'];
    const rows = state.draw.results.map((result) => [
      result.timeDrawing,
      result.participantName,
      result.firstTeam.name,
      teamGroupBracket(result.firstTeam),
      result.secondTeam.name,
      teamGroupBracket(result.secondTeam),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `hasil-undian-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDrawStatus(`${state.draw.results.length} hasil undian berhasil diekspor ke CSV.`);
  }

  function setDrawStatus(message) {
    if (els.drawStatus) els.drawStatus.textContent = message;
  }

  function teamGroupBracket(team) {
    return `${team.group} / ${team.bracket}`;
  }

  function normalizeAngle(angle) {
    const full = Math.PI * 2;
    return ((angle % full) + full) % full;
  }

  function contextText() {
    const parts = [];
    if (state.group !== 'ALL') parts.push(`Grup ${state.group}`);
    if (state.matchday !== 'ALL') parts.push(formatShortDate(state.matchday));
    if (state.search) parts.push(`Cari: ${state.search}`);
    return parts.length ? `Difilter berdasarkan ${parts.join(' Â· ')}` : 'Diurutkan berdasarkan total resmi Sheet SKOR panitia, lalu nama.';
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
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' });
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
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

