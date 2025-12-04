const TEAM_SIZES = { football: 8, volleyball: 5 };
const ADMIN_PASSWORD = 'hijaznationalschool1991';

let allMatches = { football: [], volleyball: [] };
let currentSportFilter = 'all';
let currentStatusFilter = 'all';
let currentTableSport = 'football';
let currentMatchFilter = 'football';

// Page & Section Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'homePage') loadHomeData();
}

function showSection(section) {
    document.querySelectorAll('.main-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.main-nav-btn[onclick*="${section}"]`).classList.add('active');
    document.querySelectorAll('.main-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section + 'Section').classList.add('active');
}

// Load Data
async function loadHomeData() {
    await loadAllMatches();
    renderMatchesList();
    renderBracket();
}

async function loadAllMatches() {
    try {
        const [fb, vb] = await Promise.all([
            fetch('/api/bracket/football').then(r => r.json()),
            fetch('/api/bracket/volleyball').then(r => r.json())
        ]);
        allMatches.football = fb.matches || [];
        allMatches.volleyball = vb.matches || [];
    } catch (e) { console.error(e); }
}

// Filters
function filterSport(sport) {
    currentSportFilter = sport;
    document.querySelectorAll('.sport-pill').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(sport) || (sport === 'all' && b.textContent === 'All')));
    renderMatchesList();
}

function filterStatus(status) {
    currentStatusFilter = status;
    document.querySelectorAll('.status-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(status) || (status === 'all' && b.textContent === 'All')));
    renderMatchesList();
}

// Render Matches List (365scores style)
function renderMatchesList() {
    let matches = [];
    if (currentSportFilter === 'all') {
        matches = [...allMatches.football, ...allMatches.volleyball];
    } else {
        matches = allMatches[currentSportFilter] || [];
    }
    
    // Filter by status
    if (currentStatusFilter === 'live') {
        matches = matches.filter(m => m.is_live);
    } else if (currentStatusFilter === 'upcoming') {
        matches = matches.filter(m => !m.is_live && !m.winner_id && m.team1_id && m.team2_id);
    } else if (currentStatusFilter === 'ended') {
        matches = matches.filter(m => m.winner_id);
    } else {
        matches = matches.filter(m => m.team1_id && m.team2_id);
    }
    
    const container = document.getElementById('matchesList');
    
    if (matches.length === 0) {
        container.innerHTML = '<div class="no-matches">No matches found</div>';
        return;
    }
    
    const roundNames = ['R16', 'QF', 'SF', 'Final'];
    
    container.innerHTML = matches.map(m => {
        const isLive = m.is_live;
        const isEnded = m.winner_id;
        const team1Winner = m.winner_id === m.team1_id;
        const team2Winner = m.winner_id === m.team2_id;
        
        let statusClass = isLive ? 'live' : isEnded ? 'ended' : '';
        let timeText = isLive ? 'LIVE' : isEnded ? 'FT' : 'Soon';
        
        return `
            <div class="match-row ${statusClass}" onclick="openMatchDetail(${m.id})">
                <div class="match-time ${statusClass}">${timeText}</div>
                <div class="match-sport-icon">${m.sport === 'football' ? '⚽' : '🏐'}</div>
                <div class="match-info">
                    <div class="match-teams-col">
                        <div class="match-team-row ${team1Winner ? 'winner' : ''}">
                            <span class="name">${m.team1_name || 'TBD'}</span>
                            <span class="score">${m.team1_score ?? '-'}</span>
                        </div>
                        <div class="match-team-row ${team2Winner ? 'winner' : ''}">
                            <span class="name">${m.team2_name || 'TBD'}</span>
                            <span class="score">${m.team2_score ?? '-'}</span>
                        </div>
                    </div>
                </div>
                <div class="match-round">${roundNames[m.round - 1]}</div>
            </div>
        `;
    }).join('');
}

// Table/Bracket
function switchTableSport(sport) {
    currentTableSport = sport;
    document.querySelectorAll('.table-sport-btn').forEach(b => b.classList.toggle('active', b.dataset.sport === sport));
    renderBracket();
}

function renderBracket() {
    const matches = allMatches[currentTableSport];
    const container = document.getElementById('bracketView');
    
    if (!matches || matches.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:white;padding:3rem;">Draw not made yet</div>';
        return;
    }
    
    const rounds = { 1: [], 2: [], 3: [], 4: [] };
    matches.forEach(m => { if (rounds[m.round]) rounds[m.round].push(m); });
    
    // Split R16 into left (0-3) and right (4-7)
    const r16Left = rounds[1].slice(0, 4);
    const r16Right = rounds[1].slice(4, 8);
    const qfLeft = rounds[2].slice(0, 2);
    const qfRight = rounds[2].slice(2, 4);
    const sfLeft = rounds[3].slice(0, 1);
    const sfRight = rounds[3].slice(1, 2);
    const final = rounds[4][0];
    
    container.innerHTML = `
        <div class="bracket-side left">
            <div class="bracket-column r16">${r16Left.map(m => renderBracketMatch(m)).join('')}</div>
            <div class="bracket-column qf">${qfLeft.map(m => renderBracketMatch(m)).join('')}</div>
            <div class="bracket-column sf">${sfLeft.map(m => renderBracketMatch(m)).join('')}</div>
        </div>
        <div class="final-section">
            <div class="final-title">FINAL</div>
            ${final ? `<div class="final-match">${renderBracketMatchInner(final)}</div>` : '<div class="bracket-match-card"><div class="bracket-team-row tbd">TBD</div><div class="bracket-team-row tbd">TBD</div></div>'}
        </div>
        <div class="bracket-side right">
            <div class="bracket-column sf">${sfRight.map(m => renderBracketMatch(m)).join('')}</div>
            <div class="bracket-column qf">${qfRight.map(m => renderBracketMatch(m)).join('')}</div>
            <div class="bracket-column r16">${r16Right.map(m => renderBracketMatch(m)).join('')}</div>
        </div>
    `;
}

function renderBracketMatch(m) {
    return `<div class="bracket-match-card" onclick="openMatchDetail(${m.id})">${renderBracketMatchInner(m)}</div>`;
}

function renderBracketMatchInner(m) {
    const t1Win = m.winner_id === m.team1_id;
    const t2Win = m.winner_id === m.team2_id;
    return `
        <div class="bracket-team-row ${t1Win ? 'winner' : ''} ${!m.team1_id ? 'tbd' : ''}">
            <span class="team-name">${m.team1_name || 'TBD'}</span>
            <span class="team-score">${m.team1_score ?? ''}</span>
        </div>
        <div class="bracket-team-row ${t2Win ? 'winner' : ''} ${!m.team2_id ? 'tbd' : ''}">
            <span class="team-name">${m.team2_name || 'TBD'}</span>
            <span class="team-score">${m.team2_score ?? ''}</span>
        </div>
    `;
}

// Match Detail
async function openMatchDetail(matchId) {
    try {
        const m = await fetch(`/api/match/${matchId}`).then(r => r.json());
        const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
        const t1Win = m.winner_id === m.team1_id;
        const t2Win = m.winner_id === m.team2_id;
        const status = m.is_live ? '🔴 LIVE' : m.winner_id ? 'ENDED' : 'UPCOMING';
        
        document.getElementById('matchModalContent').innerHTML = `
            <div class="modal-header">
                <h3>${m.team1_name || 'TBD'} vs ${m.team2_name || 'TBD'}</h3>
                <p class="info">${roundNames[m.round - 1]} • ${m.sport} • ${status}</p>
            </div>
            <div class="modal-score">
                <div class="modal-team ${t1Win ? 'winner' : ''}">
                    <div class="name">${m.team1_name || 'TBD'}</div>
                    <div class="score">${m.team1_score ?? '-'}</div>
                </div>
                <span>-</span>
                <div class="modal-team ${t2Win ? 'winner' : ''}">
                    <div class="name">${m.team2_name || 'TBD'}</div>
                    <div class="score">${m.team2_score ?? '-'}</div>
                </div>
            </div>
            ${m.rating ? `<p style="text-align:center;margin-top:1rem;">${'⭐'.repeat(m.rating)}</p>` : ''}
            ${m.comment ? `<div style="background:rgba(0,0,0,0.2);padding:0.75rem;border-radius:8px;margin-top:1rem;"><p style="color:var(--text-muted);font-size:0.85rem;">${m.comment}</p></div>` : ''}
        `;
        document.getElementById('matchModal').classList.add('active');
    } catch (e) { console.error(e); }
}

function closeModal() { document.getElementById('matchModal').classList.remove('active'); }

// Tea
m Registration
const sportSelect = document.getElementById('sport');
const gradeSelect = document.getElementById('grade');
sportSelect?.addEventListener('change', updateTeammateInputs);
gradeSelect?.addEventListener('change', updateTeammateInputs);

function updateTeammateInputs() {
    const sport = sportSelect.value, grade = gradeSelect.value;
    if (sport && grade) {
        const needed = TEAM_SIZES[sport] - 1;
        document.getElementById('teammatesHint').textContent = `Add ${needed} teammates`;
        document.getElementById('teammatesInputs').innerHTML = Array(needed).fill(0).map((_, i) => 
            `<div class="form-group"><input type="text" name="t${i}" required placeholder="Player ${i + 2}"></div>`
        ).join('');
        document.getElementById('teammatesSection').style.display = 'block';
        document.getElementById('passwordSection').style.display = 'block';
        document.getElementById('submitBtn').style.display = 'block';
    }
}

document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const captainName = document.getElementById('captainName').value.trim();
    const teamName = document.getElementById('teamName').value.trim();
    const grade = gradeSelect.value, sport = sportSelect.value;
    const password = document.getElementById('teamPassword').value;
    
    if (!password || password.length < 4) { showMessage('createMessage', 'Password min 4 chars!', 'error'); return; }
    
    const teammates = [...document.querySelectorAll('#teammatesInputs input')].map(i => i.value.trim()).filter(v => v);
    if (teammates.length < TEAM_SIZES[sport] - 1) { showMessage('createMessage', 'Fill all teammates!', 'error'); return; }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Creating...';
    
    try {
        const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamName, captainName, grade: parseInt(grade), sport, password, teammates })
        });
        const result = await res.json();
        if (result.success) {
            showMessage('createMessage', `Team "${result.teamName}" created! 🎉`, 'success');
            document.getElementById('teamForm').reset();
            ['teammatesSection', 'passwordSection', 'submitBtn'].forEach(id => document.getElementById(id).style.display = 'none');
        } else { showMessage('createMessage', result.error, 'error'); }
    } catch (e) { showMessage('createMessage', 'Failed', 'error'); }
    btn.disabled = false; btn.textContent = 'Create Team';
});

// Admin
function adminLogin() {
    if (document.getElementById('adminPassword').value === ADMIN_PASSWORD) {
        showPage('adminPanel'); loadAdminData();
    } else { showMessage('adminMessage', 'Invalid password', 'error'); }
}

async function loadAdminData() {
    await loadAdminTeams();
    await loadDrawStatus();
    await loadAdminMatches();
    await loadChampionSelects();
}

async function loadAdminTeams(filter = 'all') {
    const teams = await fetch('/api/teams').then(r => r.json());
    const filtered = filter === 'all' ? teams : teams.filter(t => t.sport === filter);
    document.getElementById('adminTeamsList').innerHTML = filtered.length ? filtered.map(t => `
        <div class="team-card-admin ${t.is_champion ? 'champion' : ''}">
            <h4>${t.team_name} ${t.is_champion ? '🏆' : ''}</h4>
            <div class="meta">G${t.grade} • ${t.sport} • ${t.captain_name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">👥 ${t.players.join(', ')}</div>
        </div>
    `).join('') : '<p>No teams</p>';
}

function filterAdminTeams(f) {
    document.querySelectorAll('#adminTeams .filter-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(f)));
    loadAdminTeams(f);
}

function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

async function loadDrawStatus() {
    for (const s of ['football', 'volleyball']) {
        const teams = await fetch(`/api/teams?sport=${s}`).then(r => r.json());
        document.getElementById(`${s}DrawStatus`).textContent = `${teams.length}/16 teams`;
    }
}

async function performDraw(sport) {
    if (!confirm(`Randomize ${sport}?`)) return;
    const res = await fetch(`/api/admin/draw/${sport}`, { method: 'POST' }).then(r => r.json());
    if (res.success) { alert('Done! 🎲'); loadHomeData(); } else { alert(res.error); }
}

async function loadAdminMatches() {
    const matches = await fetch(`/api/admin/matches?sport=${currentMatchFilter}`).then(r => r.json());
    const rn = ['R16', 'QF', 'SF', 'F'];
    document.getElementById('adminMatchesList').innerHTML = matches.length ? matches.map(m => `
        <div class="match-item-admin" onclick="openAdminMatch(${m.id})">
            <span>${rn[m.round-1]}</span> ${m.is_live ? '🔴' : ''} 
            <strong>${m.team1_name || 'TBD'}</strong> ${m.team1_score ?? '-'} - ${m.team2_score ?? '-'} <strong>${m.team2_name || 'TBD'}</strong>
        </div>
    `).join('') : '<p>No matches</p>';
}

function filterMatches(s) {
    currentMatchFilter = s;
    document.querySelectorAll('#adminMatches .filter-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(s)));
    loadAdminMatches();
}

async function loadChampionSelects() {
    for (const s of ['football', 'volleyball']) {
        const teams = await fetch(`/api/teams?sport=${s}`).then(r => r.json());
        document.getElementById(`${s}Champion`).innerHTML = '<option value="">Select</option>' + teams.map(t => `<option value="${t.id}" ${t.is_champion ? 'selected' : ''}>${t.team_name}</option>`).join('');
    }
}

async function setChampion(sport) {
    const id = document.getElementById(`${sport}Champion`).value;
    if (!id) return;
    await fetch('/api/admin/champion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId: parseInt(id), sport }) });
    alert('Champion set! 🏆'); loadAdminTeams();
}

// Admin Match Modal
let currentMatchId = null, currentRating = 0;

async function openAdminMatch(matchId) {
    currentMatchId = matchId;
    const m = await fetch(`/api/match/${matchId}`).then(r => r.json());
    currentRating = m.rating || 0;
    if (!m.team1_id || !m.team2_id) { alert('No teams yet'); return; }
    
    document.getElementById('matchModalContent').innerHTML = `
        <div class="modal-header"><h3>Edit Match</h3><p class="info">R${m.round} • ${m.sport}</p></div>
        <div class="score-editor">
            <div class="score-team"><div class="name">${m.team1_name}</div><input type="number" class="score-input" id="score1" value="${m.team1_score||0}" min="0"></div>
            <span>-</span>
            <div class="score-team"><div class="name">${m.team2_name}</div><input type="number" class="score-input" id="score2" value="${m.team2_score||0}" min="0"></div>
        </div>
        <div class="form-group"><label><input type="checkbox" id="isLive" ${m.is_live?'checked':''}> 🔴 LIVE</label></div>
        <div class="rating-section"><h4>Rating</h4><div class="stars-input">${[1,2,3,4,5].map(i=>`<span class="star ${i<=currentRating?'active':''}" onclick="setRating(${i})">⭐</span>`).join('')}</div></div>
        <div class="comment-section"><h4>Comment</h4><textarea id="matchComment">${m.comment||''}</textarea></div>
        <div style="display:flex;gap:0.5rem;margin-top:1rem;">
            <button class="btn btn-primary" onclick="saveMatch()">💾 Save</button>
            <button class="btn" style="background:var(--success);" onclick="finishMatch()">✅ Finish</button>
        </div>
    `;
    document.getElementById('matchModal').classList.add('active');
}

function setRating(r) { currentRating = r; document.querySelectorAll('.stars-input .star').forEach((s,i) => s.classList.toggle('active', i < r)); }

async function saveMatch() {
    await fetch(`/api/admin/match/${currentMatchId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1_score: +document.getElementById('score1').value, team2_score: +document.getElementById('score2').value, is_live: document.getElementById('isLive').checked, rating: currentRating, comment: document.getElementById('matchComment').value })
    });
    alert('Saved!'); loadAdminMatches(); loadHomeData();
}

async function finishMatch() {
    const s1 = +document.getElementById('score1').value, s2 = +document.getElementById('score2').value;
    if (s1 === s2) { alert('No draw!'); return; }
    if (!confirm('Finish?')) return;
    await fetch(`/api/admin/match/${currentMatchId}/finish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1_score: s1, team2_score: s2, rating: currentRating, comment: document.getElementById('matchComment').value })
    });
    alert('Done!'); closeModal(); loadAdminMatches(); loadHomeData();
}

function showMessage(id, msg, type) { const el = document.getElementById(id); el.textContent = msg; el.className = 'message ' + type; }

loadHomeData();