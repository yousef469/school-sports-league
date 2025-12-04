const TEAM_SIZES = { football: 8, volleyball: 5 };
const ADMIN_PASSWORD = 'hijaznationalschool1991';

let currentSport = 'football';
let currentMatchFilter = 'football';

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'homePage') loadHomeData();
}

// Load home page data
async function loadHomeData() {
    await loadMatches();
    await loadTeams();
}

// Switch sport tab
function switchSport(sport) {
    currentSport = sport;
    document.querySelectorAll('.sport-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sport === sport);
    });
    loadHomeData();
}

// Load matches for home page
async function loadMatches() {
    try {
        const res = await fetch(`/api/bracket/${currentSport}`);
        const data = await res.json();
        
        const matches = data.matches || [];
        
        const live = matches.filter(m => m.is_live);
        const upcoming = matches.filter(m => !m.is_live && !m.winner_id && m.team1_id && m.team2_id);
        const ended = matches.filter(m => m.winner_id);
        
        document.getElementById('liveMatches').innerHTML = live.length > 0
            ? live.map(m => renderMatchCard(m, true)).join('')
            : '<p class="no-matches">No live matches right now</p>';
        
        document.getElementById('upcomingMatches').innerHTML = upcoming.length > 0
            ? upcoming.map(m => renderMatchCard(m)).join('')
            : '<p class="no-matches">No upcoming matches scheduled</p>';
        
        document.getElementById('endedMatches').innerHTML = ended.length > 0
            ? ended.map(m => renderMatchCard(m)).join('')
            : '<p class="no-matches">No completed matches yet</p>';
    } catch (e) {
        console.error(e);
    }
}

function renderMatchCard(match, isLive = false) {
    const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
    const team1Winner = match.winner_id === match.team1_id;
    const team2Winner = match.winner_id === match.team2_id;
    
    return `
        <div class="match-card ${isLive ? 'live' : ''}" onclick="openMatchDetail(${match.id})">
            <div class="match-header">
                <span>${roundNames[match.round - 1] || 'Match'}</span>
                ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
            </div>
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

// Load teams
async function loadTeams() {
    try {
        const res = await fetch(`/api/admin/teams?sport=${currentSport}`);
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

// Match Detail Modal (Viewer)
async function openMatchDetail(matchId) {
    try {
        const res = await fetch(`/api/match/${matchId}`);
        const match = await res.json();
        
        const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
        const team1Winner = match.winner_id === match.team1_id;
        const team2Winner = match.winner_id === match.team2_id;
        
        // Generate AI analysis based on match data
        const aiAnalysis = generateAIAnalysis(match, team1Winner, team2Winner);
        
        let html = `
            <div class="modal-header">
                <h3>${match.team1_name || 'TBD'} vs ${match.team2_name || 'TBD'}</h3>
                <p class="round-info">${roundNames[match.round - 1]} • ${match.sport}</p>
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
            
            ${match.is_live ? '<p style="text-align:center;color:var(--danger);font-weight:600;">🔴 LIVE NOW</p>' : ''}
        `;
        
        // Show stats if match has scores
        if (match.team1_score !== null && match.team2_score !== null) {
            const total = (match.team1_score || 0) + (match.team2_score || 0) || 1;
            const team1Pct = Math.round(((match.team1_score || 0) / total) * 100);
            const team2Pct = 100 - team1Pct;
            
            html += `
                <div class="match-stats">
                    <h4>📊 Match Statistics</h4>
                    <div class="stat-bar">
                        <div class="label">
                            <span>${match.team1_name}</span>
                            <span>Score Distribution</span>
                            <span>${match.team2_name}</span>
                        </div>
                        <div class="bar">
                            <div class="bar-fill team1" style="width: ${team1Pct}%"></div>
                            <div class="bar-fill team2" style="width: ${team2Pct}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // AI Analysis
        if (match.winner_id || match.is_live) {
            html += `
                <div class="ai-analysis">
                    <h4>🤖 AI Match Analysis</h4>
                    <p>${aiAnalysis}</p>
                </div>
            `;
        }
        
        // Rating
        if (match.rating) {
            html += `
                <div class="match-rating">
                    <span>Match Rating:</span>
                    <span class="stars">${'⭐'.repeat(match.rating)}</span>
                </div>
            `;
        }
        
        // Comment
        if (match.comment) {
            html += `
                <div class="match-comment">
                    <h4>📝 Match Commentary</h4>
                    <p>${match.comment}</p>
                </div>
            `;
        }
        
        document.getElementById('matchModalContent').innerHTML = html;
        document.getElementById('matchModal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
}

function generateAIAnalysis(match, team1Winner, team2Winner) {
    if (!match.team1_score && !match.team2_score) {
        return "Match analysis will be available once the game begins.";
    }
    
    const scoreDiff = Math.abs((match.team1_score || 0) - (match.team2_score || 0));
    const winner = team1Winner ? match.team1_name : match.team2_name;
    const loser = team1Winner ? match.team2_name : match.team1_name;
    const winnerScore = team1Winner ? match.team1_score : match.team2_score;
    const loserScore = team1Winner ? match.team2_score : match.team1_score;
    
    if (match.is_live) {
        if (scoreDiff === 0) {
            return `An intense battle is unfolding! Both teams are evenly matched with the score tied at ${match.team1_score}-${match.team2_score}. This could go either way!`;
        } else if (scoreDiff <= 2) {
            return `A close contest! ${winner} currently leads ${loser} by a narrow margin. The momentum could shift at any moment.`;
        } else {
            return `${winner} is dominating this match with a commanding lead. ${loser} will need to step up their game significantly to turn this around.`;
        }
    }
    
    if (match.winner_id) {
        if (scoreDiff <= 1) {
            return `What a thriller! ${winner} edged out ${loser} in an incredibly close match (${winnerScore}-${loserScore}). Both teams showed exceptional skill and determination. This was a match that could have gone either way until the final moments.`;
        } else if (scoreDiff <= 3) {
            return `${winner} secured a well-deserved victory against ${loser} with a final score of ${winnerScore}-${loserScore}. The winning team showed better composure in crucial moments and capitalized on their opportunities effectively.`;
        } else {
            return `A dominant performance by ${winner}! They overwhelmed ${loser} with a convincing ${winnerScore}-${loserScore} victory. The winners displayed superior teamwork, strategy, and execution throughout the match.`;
        }
    }
    
    return "Match analysis will be updated as the game progresses.";
}

function closeModal() {
    document.getElementById('matchModal').classList.remove('active');
}

// Tea
m Registration
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
        
        document.getElementById('teammatesHint').textContent = 
            `Add ${needed} teammates (${total} players total for ${sport})`;
        
        const container = document.getElementById('teammatesInputs');
        container.innerHTML = '';
        
        for (let i = 1; i <= needed; i++) {
            container.innerHTML += `
                <div class="form-group">
                    <input type="text" name="teammate${i}" required placeholder="Player ${i + 1} name">
                </div>
            `;
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
        showMessage('adminMessage', 'Invalid admin password', 'error');
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
        const res = await fetch('/api/admin/teams');
        const teams = await res.json();
        
        const filtered = filter === 'all' ? teams : teams.filter(t => t.sport === filter);
        
        document.getElementById('adminTeamsList').innerHTML = filtered.length > 0
            ? filtered.map(team => `
                <div class="team-card-admin ${team.is_champion ? 'champion' : ''}">
                    <h4>${team.team_name} ${team.is_champion ? '🏆' : ''}</h4>
                    <div class="meta">Grade ${team.grade} • ${team.sport} • Captain: ${team.captain_name}</div>
                    <div class="players">👥 ${team.players.join(', ')}</div>
                </div>
            `).join('')
            : '<p>No teams registered yet</p>';
    } catch (e) {
        console.error(e);
    }
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
        const res = await fetch(`/api/admin/teams?sport=${sport}`);
        const teams = await res.json();
        document.getElementById(`${sport}DrawStatus`).textContent = `${teams.length}/16 teams registered`;
        
        const drawRes = await fetch(`/api/bracket/${sport}`);
        const drawData = await drawRes.json();
        
        if (drawData.matches && drawData.matches.length > 0) {
            const r16 = drawData.matches.filter(m => m.round === 1);
            document.getElementById(`${sport}DrawPreview`).innerHTML = r16.map(m => `
                <div class="draw-match">
                    <div>${m.team1_name || 'TBD'}</div>
                    <div class="vs">VS</div>
                    <div>${m.team2_name || 'TBD'}</div>
                </div>
            `).join('');
        }
    }
}

async function performDraw(sport) {
    if (!confirm(`This will randomize the ${sport} bracket. Continue?`)) return;
    
    try {
        const res = await fetch(`/api/admin/draw/${sport}`, { method: 'POST' });
        const result = await res.json();
        
        if (result.success) {
            alert('Draw completed! 🎲');
            loadDrawStatus();
        } else {
            alert(result.error);
        }
    } catch (e) {
        alert('Failed to perform draw');
    }
}

async function loadAdminMatches() {
    try {
        const res = await fetch(`/api/admin/matches?sport=${currentMatchFilter}`);
        const matches = await res.json();
        
        const roundNames = ['Round of 16', 'Quarter Finals', 'Semi Finals', 'Final'];
        
        document.getElementById('matchesList').innerHTML = matches.length > 0
            ? matches.map(match => `
                <div class="match-item" onclick="openAdminMatchModal(${match.id})">
                    <div class="match-header">
                        <span>${roundNames[match.round - 1]}</span>
                        ${match.is_live ? '<span class="live-badge">LIVE</span>' : ''}
                    </div>
                    <div class="match-teams">
                        <div class="match-team">
                            <div class="name">${match.team1_name || 'TBD'}</div>
                            <div class="score">${match.team1_score ?? '-'}</div>
                        </div>
                        <div class="match-vs">VS</div>
                        <div class="match-team">
                            <div class="name">${match.team2_name || 'TBD'}</div>
                            <div class="score">${match.team2_score ?? '-'}</div>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p>No matches yet. Perform the draw first.</p>';
    } catch (e) {
        console.error(e);
    }
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
        const res = await fetch(`/api/admin/teams?sport=${sport}`);
        const teams = await res.json();
        
        const select = document.getElementById(`${sport}Champion`);
        select.innerHTML = '<option value="">Select team</option>' + 
            teams.map(t => `<option value="${t.id}" ${t.is_champion ? 'selected' : ''}>${t.team_name}</option>`).join('');
    }
}

async function setChampion(sport) {
    const teamId = document.getElementById(`${sport}Champion`).value;
    if (!teamId) return alert('Select a team first');
    
    try {
        const res = await fetch('/api/admin/champion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: parseInt(teamId), sport })
        });
        
        if ((await res.json()).success) {
            alert('Champion set! 🏆');
            loadAdminTeams();
        }
    } catch (e) {
        alert('Failed to set champion');
    }
}

// Admi
n Match Modal
let currentMatchId = null;
let currentRating = 0;

async function openAdminMatchModal(matchId) {
    currentMatchId = matchId;
    
    try {
        const res = await fetch(`/api/match/${matchId}`);
        const match = await res.json();
        
        currentRating = match.rating || 0;
        
        if (!match.team1_id || !match.team2_id) {
            alert('This match has no teams assigned yet.');
            return;
        }
        
        const html = `
            <div class="modal-header">
                <h3>Edit Match</h3>
                <p class="round-info">Round ${match.round} • ${match.sport}</p>
            </div>
            
            <div class="score-editor">
                <div class="score-team">
                    <div class="name">${match.team1_name}</div>
                    <input type="number" class="score-input" id="score1" value="${match.team1_score || 0}" min="0">
                </div>
                <div class="match-vs">VS</div>
                <div class="score-team">
                    <div class="name">${match.team2_name}</div>
                    <input type="number" class="score-input" id="score2" value="${match.team2_score || 0}" min="0">
                </div>
            </div>
            
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" id="isLive" ${match.is_live ? 'checked' : ''}> 
                    🔴 Match is LIVE
                </label>
            </div>
            
            <div class="rating-section">
                <h4>Match Rating</h4>
                <div class="stars-input" id="starsContainer">
                    ${[1,2,3,4,5].map(i => `
                        <span class="star ${i <= currentRating ? 'active' : ''}" onclick="setRating(${i})">⭐</span>
                    `).join('')}
                </div>
            </div>
            
            <div class="comment-section">
                <h4>Match Commentary</h4>
                <textarea id="matchComment" placeholder="Add commentary about the match...">${match.comment || ''}</textarea>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="saveMatch()">💾 Save Changes</button>
                <button class="btn" style="background:var(--success);" onclick="finishMatch()">✅ Finish Match</button>
            </div>
        `;
        
        document.getElementById('matchModalContent').innerHTML = html;
        document.getElementById('matchModal').classList.add('active');
    } catch (e) {
        console.error(e);
    }
}

function setRating(rating) {
    currentRating = rating;
    document.querySelectorAll('#starsContainer .star').forEach((star, idx) => {
        star.classList.toggle('active', idx < rating);
    });
}

async function saveMatch() {
    const data = {
        team1_score: parseInt(document.getElementById('score1').value) || 0,
        team2_score: parseInt(document.getElementById('score2').value) || 0,
        is_live: document.getElementById('isLive').checked,
        rating: currentRating,
        comment: document.getElementById('matchComment').value
    };
    
    try {
        const res = await fetch(`/api/admin/match/${currentMatchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if ((await res.json()).success) {
            alert('Match updated!');
            loadAdminMatches();
            loadHomeData();
        }
    } catch (e) {
        alert('Failed to save');
    }
}

async function finishMatch() {
    const score1 = parseInt(document.getElementById('score1').value) || 0;
    const score2 = parseInt(document.getElementById('score2').value) || 0;
    
    if (score1 === score2) {
        alert('Match cannot end in a draw!');
        return;
    }
    
    if (!confirm('Finish this match and advance the winner?')) return;
    
    try {
        const res = await fetch(`/api/admin/match/${currentMatchId}/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team1_score: score1,
                team2_score: score2,
                rating: currentRating,
                comment: document.getElementById('matchComment').value
            })
        });
        
        if ((await res.json()).success) {
            alert('Match finished! Winner advances.');
            closeModal();
            loadAdminMatches();
            loadDrawStatus();
            loadHomeData();
        }
    } catch (e) {
        alert('Failed to finish match');
    }
}

// Utility
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'message ' + type;
}

// Initialize
loadHomeData();