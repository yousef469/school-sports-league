const TEAM_SIZES = { football: 8, volleyball: 5 };
const ADMIN_PASSWORD = 'hijaznationalschool1991';

let currentBracketSport = 'football';
let currentTeamsSport = 'football';
let currentMatchFilter = 'football';
let allMatches = { football: [], volleyball: [] };

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'homePage') loadHomeData();
}

// Load all home data
async function loadHomeData() {
    await loadAllMatches();
    renderMatches();
    renderBracket();
    loadTeams(currentTeamsSport);
}

// Load matches for both sports
async function loadAllMatches() {
    try {
        const [footballRes, volleyballRes] = await Promise.all([
            fetch('/api/bracket/football'),
            fetch('/api/bracket/volleyball')
        ]);
        const footballData = await footballRes.json();
        const volleyballData = await volleyballRes.json();
        
        allMatches.football = footballData.matches || [];
        allMatches.volleyball = volleyballData.matches || [];
    } catch (e) {
        console.error(e);
    }
}

// Render matches by status
function renderMatches() {
    const all = [...allMatches.football, ...allMatches.volleyball];
    
    const live = all.filter(m => m.is_live);
    const upcoming = all.filter(m => !m.is_live && !m.winner_id && m.team1_id && m.team2_id);
    const completed = all.filter(m => m.winner_id);
    
    document.getElementById('liveMatches').innerHTML = live.length > 0
        ? live.map(m => renderMatchCard(m, 'live')).join('')
        : '<p class="no-matches">No live matches right now</p>';
    
    document.getElementById('upcomingMatches').innerHTML = upcoming.length > 0
        ? upcoming.map(m => renderMatchCard(m, 'upcoming')).join('')
        : '<p class="no-matches">No upcoming matches</p>';
    
    document.getElementById('completedMatches').innerHTML = completed.length > 0
        ? completed.map(m => renderMatchCard(m, 'ended')).join('')
        : '<p class="no-matches">No completed matches yet</p>';
}

function renderMatchCard(match, status) {
    const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
    const team1Winner = match.winner_id === match.team1_id;
    const team2Winner = match.winner_id === match.team2_id;
    const sportClass = match.sport === 'volleyball' ? 'volleyball' : '';
    
    return `
        <div class="match-card ${status}" onclick="openMatchDetail(${match.id})">
            <span class="match-sport ${sportClass}">${match.sport === 'football' ? '⚽' : '🏐'} ${match.sport}</span>
            <span class="match-status ${status}">${status === 'live' ? '🔴 LIVE' : status === 'ended' ? 'ENDED' : 'UPCOMING'}</span>
            <div class="match-teams">
                <div class="match-team ${team1Winner ? 'winner' : ''}">
                    <div class="name">${match.team1_name || 'TBD'}</div>
                    <div class="score">${match.team1_score ?? '-'}</div>
                </div>
                <div class="match-vs">VS</div>
                <div class="match-team ${team2Winner ? 'winner' : ''}">
                    <div class="name">${match.team2_name || 'TBD'}</div>
                    <div class="score">${match.team2_score ?? '-'}</div>
                </div>
            </div>
        </div>
    `;
}

// Bracket
function switchBracket(sport) {
    currentBracketSport = sport;
    document.querySelectorAll('.bracket-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sport === sport);
    });
    renderBracket();
}

function renderBracket() {
    const matches = allMatches[currentBracketSport];
    const container = document.getElementById('tournamentBracket');
    
    if (!matches || matches.length === 0) {
        container.innerHTML = '<p class="no-matches">Draw not made yet</p>';
        return;
    }
    
    const rounds = { 1: [], 2: [], 3: [], 4: [] };
    matches.forEach(m => {
        if (rounds[m.round]) rounds[m.round].push(m);
    });
    
    const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
    
    let html = '';
    [1, 2, 3, 4].forEach((round, idx) => {
        html += `<div class="bracket-round" style="margin-top: ${idx * 30}px;">
            <div class="round-header">${roundNames[idx]}</div>`;
        
        rounds[round].forEach(match => {
            const team1Winner = match.winner_id === match.team1_id;
            const team2Winner = match.winner_id === match.team2_id;
            const isLive = match.is_live;
            
            html += `
                <div class="bracket-match ${isLive ? 'live' : ''}" onclick="openMatchDetail(${match.id})">
                    <div class="bracket-team ${team1Winner ? 'winner' : ''} ${!match.team1_id ? 'tbd' : ''}">
                        <span class="team-name">${match.team1_name || 'TBD'}</span>
                        <span class="team-score">${match.team1_score ?? '-'}</span>
                    </div>
                    <div class="bracket-team ${team2Winner ? 'winner' : ''} ${!match.team2_id ? 'tbd' : ''}">
                        <span class="team-name">${match.team2_name || 'TBD'}</span>
                        <span class="team-score">${match.team2_score ?? '-'}</span>
                    </div>
                    <div class="bracket-status ${isLive ? 'live' : ''}">
                        ${isLive ? '🔴 LIVE' : match.winner_id ? '✓ Ended' : '○ Upcoming'}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    container.innerHTML = html;
}

// Teams
function showTeams(sport) {
    currentTeamsSport = sport;
    document.querySelectorAll('.teams-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(sport));
    });
    loadTeams(sport);
}

async function loadTeams(sport) {
    try {
        const res = await fetch(`/api/teams?sport=${sport}`);
        const teams = await res.json();
        
        document.getElementById('teamsList').innerHTML = teams.length > 0
            ? teams.map(team => `
                <div class="team-card ${team.is_champion ? 'champion' : ''}">
                    <h4>${team.team_name} ${team.is_champion ? '🏆' : ''}</h4>
                    <div class="meta">Grade ${team.grade} • Captain: ${team.captain_name}</div>
                    <div class="players">👥 ${team.players.join(', ')}</div>
                </div>
            `).join('')
            : '<p class="no-matches">No teams registered yet</p>';
    } catch (e) {
        console.error(e);
    }
}

// Match Detail Modal
async function openMatchDetail(matchId) {
    try {
        const res = await fetch(`/api/match/${matchId}`);
        const match = await res.json();
        
        const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
        const team1Winner = match.winner_id === match.team1_id;
        const team2Winner = match.winner_id === match.team2_id;
        
        let status = match.is_live ? '🔴 LIVE' : match.winner_id ? '✅ ENDED' : '📅 UPCOMING';
        
        let html = `
            <div class="modal-header">
                <h3>${match.team1_name || 'TBD'} vs ${match.team2_name || 'TBD'}</h3>
                <p class="info">${roundNames[match.round - 1]} • ${match.sport} • ${status}</p>
            </div>
            
            <div class="modal-score">
                <div class="modal-team ${team1Winner ? 'winner' : ''}">
                    <div class="name">${match.team1_name || 'TBD'}</div>
                    <div class="score">${match.team1_score ?? '-'}</div>
                </div>
                <div class="match-vs">VS</div>
                <div class="modal-team ${team2Winner ? 'winner' : ''}">
                    <div class="name">${match.team2_name || 'TBD'}</div>
                    <div class="score">${match.team2_score ?? '-'}</div>
                </div>
            </div>
        `;
        
        if (match.rating) {
            html += `<p style="text-align:center;">Match Rating: ${'⭐'.repeat(match.rating)}</p>`;
        }
        
        if (match.comment) {
            html += `<div style="background:rgba(0,0,0,0.2);padding:1rem;border-radius:10px;margin-top:1rem;">
                <h4 style="margin-bottom:0.5rem;">📝 Commentary</h4>
                <p style="color:var(--text-muted);">${match.comment}</p>
            </div>`;
        }
        
        document.getElementById('matchModalContent').innerHTML = html;
        document.getElementById('matchModal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
}

function closeModal() {
    document.getElementById('matchModal').classList.remove('active');
}


// Team Registration
const sportSelect = document.getElementById('sport');
const gradeSelect = document.getElementById('grade');

sportSelect?.addEventListener('change', updateTeammateInputs);
gradeSelect?.addEventListener('change', updateTeammateInputs);

function updateTeammateInputs() {
    const sport = sportSelect.value;
    const grade = gradeSelect.value;
    
    if (sport && grade) {
        const total = TEAM_SIZES[sport];
        const needed = total - 1;
        
        document.getElementById('teammatesHint').textContent = `Add ${needed} teammates (${total} total)`;
        
        const container = document.getElementById('teammatesInputs');
        container.innerHTML = '';
        for (let i = 1; i <= needed; i++) {
            container.innerHTML += `<div class="form-group"><input type="text" name="teammate${i}" required placeholder="Player ${i + 1}"></div>`;
        }
        
        document.getElementById('teammatesSection').style.display = 'block';
        document.getElementById('passwordSection').style.display = 'block';
        document.getElementById('submitBtn').style.display = 'block';
    }
}

document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const captainName = document.getElementById('captainName').value.trim();
    const teamName = document.getElementById('teamName').value.trim();
    const grade = gradeSelect.value;
    const sport = sportSelect.value;
    const password = document.getElementById('teamPassword').value;
    
    if (!password || password.length < 4) {
        showMessage('createMessage', 'Password must be at least 4 characters!', 'error');
        return;
    }
    
    const teammates = [];
    document.querySelectorAll('#teammatesInputs input').forEach(input => {
        if (input.value.trim()) teammates.push(input.value.trim());
    });
    
    if (teammates.length < TEAM_SIZES[sport] - 1) {
        showMessage('createMessage', 'Please fill all teammate names!', 'error');
        return;
    }
    
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
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
            document.getElementById('teammatesSection').style.display = 'none';
            document.getElementById('passwordSection').style.display = 'none';
            document.getElementById('submitBtn').style.display = 'none';
        } else {
            showMessage('createMessage', result.error, 'error');
        }
    } catch (err) {
        showMessage('createMessage', 'Failed to create team', 'error');
    }
    
    btn.disabled = false;
    btn.textContent = 'Create Team';
});

// Admin
function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        showPage('adminPanel');
        loadAdminData();
    } else {
        showMessage('adminMessage', 'Invalid password', 'error');
    }
}

async function loadAdminData() {
    await loadAdminTeams();
    await loadDrawStatus();
    await loadAdminMatches();
    await loadChampionSelects();
}

async function loadAdminTeams(filter = 'all') {
    try {
        const res = await fetch('/api/teams');
        const teams = await res.json();
        const filtered = filter === 'all' ? teams : teams.filter(t => t.sport === filter);
        
        document.getElementById('adminTeamsList').innerHTML = filtered.length > 0
            ? filtered.map(team => `
                <div class="team-card-admin ${team.is_champion ? 'champion' : ''}">
                    <h4>${team.team_name} ${team.is_champion ? '🏆' : ''}</h4>
                    <div class="meta">Grade ${team.grade} • ${team.sport} • ${team.captain_name}</div>
                    <div class="players">👥 ${team.players.join(', ')}</div>
                </div>
            `).join('')
            : '<p>No teams yet</p>';
    } catch (e) { console.error(e); }
}

function filterAdminTeams(filter) {
    document.querySelectorAll('#adminTeams .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(filter));
    });
    loadAdminTeams(filter);
}

function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('admin' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

async function loadDrawStatus() {
    for (const sport of ['football', 'volleyball']) {
        const res = await fetch(`/api/teams?sport=${sport}`);
        const teams = await res.json();
        document.getElementById(`${sport}DrawStatus`).textContent = `${teams.length}/16 teams registered`;
    }
}

async function performDraw(sport) {
    if (!confirm(`Randomize ${sport} bracket?`)) return;
    try {
        const res = await fetch(`/api/admin/draw/${sport}`, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            alert('Draw completed! 🎲');
            loadHomeData();
        } else {
            alert(result.error);
        }
    } catch (e) { alert('Failed'); }
}

async function loadAdminMatches() {
    try {
        const res = await fetch(`/api/admin/matches?sport=${currentMatchFilter}`);
        const matches = await res.json();
        const roundNames = ['R16', 'QF', 'SF', 'Final'];
        
        document.getElementById('matchesList').innerHTML = matches.length > 0
            ? matches.map(m => `
                <div class="match-item" onclick="openAdminMatch(${m.id})">
                    <span>${roundNames[m.round - 1]}</span>
                    ${m.is_live ? '<span class="match-status live">LIVE</span>' : ''}
                    <strong>${m.team1_name || 'TBD'}</strong> ${m.team1_score ?? '-'} - ${m.team2_score ?? '-'} <strong>${m.team2_name || 'TBD'}</strong>
                </div>
            `).join('')
            : '<p>No matches. Do the draw first.</p>';
    } catch (e) { console.error(e); }
}

function filterMatches(sport) {
    currentMatchFilter = sport;
    document.querySelectorAll('#adminMatches .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(sport));
    });
    loadAdminMatches();
}

async function loadChampionSelects() {
    for (const sport of ['football', 'volleyball']) {
        const res = await fetch(`/api/teams?sport=${sport}`);
        const teams = await res.json();
        document.getElementById(`${sport}Champion`).innerHTML = '<option value="">Select</option>' + 
            teams.map(t => `<option value="${t.id}" ${t.is_champion ? 'selected' : ''}>${t.team_name}</option>`).join('');
    }
}

async function setChampion(sport) {
    const teamId = document.getElementById(`${sport}Champion`).value;
    if (!teamId) return;
    try {
        await fetch('/api/admin/champion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: parseInt(teamId), sport })
        });
        alert('Champion set! 🏆');
        loadAdminTeams();
    } catch (e) { alert('Failed'); }
}

// Admin Match Modal
let currentMatchId = null;
let currentRating = 0;

async function openAdminMatch(matchId) {
    currentMatchId = matchId;
    try {
        const res = await fetch(`/api/match/${matchId}`);
        const match = await res.json();
        currentRating = match.rating || 0;
        
        if (!match.team1_id || !match.team2_id) {
            alert('No teams assigned yet');
            return;
        }
        
        document.getElementById('matchModalContent').innerHTML = `
            <div class="modal-header">
                <h3>Edit Match</h3>
                <p class="info">Round ${match.round} • ${match.sport}</p>
            </div>
            <div class="score-editor">
                <div class="score-team">
                    <div class="name">${match.team1_name}</div>
                    <input type="number" class="score-input" id="score1" value="${match.team1_score || 0}" min="0">
                </div>
                <span>VS</span>
                <div class="score-team">
                    <div class="name">${match.team2_name}</div>
                    <input type="number" class="score-input" id="score2" value="${match.team2_score || 0}" min="0">
                </div>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="isLive" ${match.is_live ? 'checked' : ''}> 🔴 Match is LIVE</label>
            </div>
            <div class="rating-section">
                <h4>Rating</h4>
                <div class="stars-input">${[1,2,3,4,5].map(i => `<span class="star ${i <= currentRating ? 'active' : ''}" onclick="setRating(${i})">⭐</span>`).join('')}</div>
            </div>
            <div class="comment-section">
                <h4>Commentary</h4>
                <textarea id="matchComment">${match.comment || ''}</textarea>
            </div>
            <div style="display:flex;gap:1rem;margin-top:1rem;">
                <button class="btn btn-primary" onclick="saveMatch()">💾 Save</button>
                <button class="btn" style="background:var(--success);" onclick="finishMatch()">✅ Finish</button>
            </div>
        `;
        document.getElementById('matchModal').classList.add('active');
    } catch (e) { console.error(e); }
}

function setRating(r) {
    currentRating = r;
    document.querySelectorAll('.stars-input .star').forEach((s, i) => s.classList.toggle('active', i < r));
}

async function saveMatch() {
    try {
        await fetch(`/api/admin/match/${currentMatchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team1_score: parseInt(document.getElementById('score1').value) || 0,
                team2_score: parseInt(document.getElementById('score2').value) || 0,
                is_live: document.getElementById('isLive').checked,
                rating: currentRating,
                comment: document.getElementById('matchComment').value
            })
        });
        alert('Saved!');
        loadAdminMatches();
        loadHomeData();
    } catch (e) { alert('Failed'); }
}

async function finishMatch() {
    const s1 = parseInt(document.getElementById('score1').value) || 0;
    const s2 = parseInt(document.getElementById('score2').value) || 0;
    if (s1 === s2) { alert('Cannot end in draw!'); return; }
    if (!confirm('Finish match?')) return;
    
    try {
        await fetch(`/api/admin/match/${currentMatchId}/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team1_score: s1, team2_score: s2, rating: currentRating, comment: document.getElementById('matchComment').value })
        });
        alert('Match finished!');
        closeModal();
        loadAdminMatches();
        loadHomeData();
    } catch (e) { alert('Failed'); }
}

function showMessage(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'message ' + type;
}

// Init
loadHomeData();