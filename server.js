require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const SLOTS_PER_GRADE = 5;
const TOTAL_SLOTS = 16;

const path = require('path');

app.use(express.json());
app.use(express.static(__dirname));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Stats for landing page
app.get('/api/stats', async (req, res) => {
    try {
        const { data: teams } = await supabase.from('teams').select('id, players');
        const { data: matches } = await supabase.from('matches').select('id').eq('is_live', true);
        
        const totalPlayers = teams?.reduce((sum, t) => sum + (t.players?.length || 0), 0) || 0;
        
        res.json({
            totalTeams: teams?.length || 0,
            totalPlayers,
            activeMatches: matches?.length || 0
        });
    } catch (e) {
        res.json({ totalTeams: 0, totalPlayers: 0, activeMatches: 0 });
    }
});

// Verify team password
app.get('/api/verify-team', async (req, res) => {
    const { password } = req.query;
    const { data } = await supabase.from('teams').select('id').eq('password', password).single();
    res.json({ valid: !!data });
});

// Get teams
app.get('/api/teams', async (req, res) => {
    try {
        let query = supabase.from('teams').select('*').order('created_at');
        if (req.query.sport) query = query.eq('sport', req.query.sport);
        const { data } = await query;
        res.json(data || []);
    } catch (e) {
        res.json([]);
    }
});

// Create team
app.post('/api/teams', async (req, res) => {
    const { teamName, captainName, grade, sport, password, teammates } = req.body;
    
    if (!teamName || !captainName || !grade || !sport || !password || !teammates) {
        return res.status(400).json({ error: 'All fields required' });
    }
    
    try {
        // Check grade slots
        const { data: gradeTeams } = await supabase
            .from('teams').select('id').eq('grade', grade).eq('sport', sport);
        
        if (gradeTeams && gradeTeams.length >= SLOTS_PER_GRADE) {
            return res.status(400).json({ error: `Grade ${grade} ${sport} is full!` });
        }
        
        // Check total slots
        const { data: allTeams } = await supabase
            .from('teams').select('id').eq('sport', sport);
        
        if (allTeams && allTeams.length >= TOTAL_SLOTS) {
            return res.status(400).json({ error: `${sport} is full! All 16 slots taken.` });
        }
        
        // Handle duplicate names
        let finalName = teamName;
        const { data: sameNames } = await supabase
            .from('teams').select('team_name').ilike('team_name', `${teamName}%`);
        
        if (sameNames && sameNames.length > 0) {
            let max = 0;
            sameNames.forEach(t => {
                const match = t.team_name.match(new RegExp(`^${teamName}\\s*(\\d*)$`, 'i'));
                if (match) {
                    const num = match[1] ? parseInt(match[1]) : 1;
                    if (num > max) max = num;
                }
            });
            finalName = `${teamName} ${max + 1}`;
        }
        
        const players = [captainName, ...teammates];
        
        const { error } = await supabase.from('teams').insert({
            team_name: finalName,
            captain_name: captainName,
            grade, sport, password, players,
            is_champion: false
        });
        
        if (error) throw error;
        res.json({ success: true, teamName: finalName });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// Get bracket
app.get('/api/bracket/:sport', async (req, res) => {
    try {
        const { data: matches } = await supabase
            .from('matches')
            .select(`
                id, round, sport, team1_id, team2_id, 
                team1_score, team2_score, winner_id, is_live,
                rating, comment,
                team1:teams!matches_team1_id_fkey(team_name),
                team2:teams!matches_team2_id_fkey(team_name)
            `)
            .eq('sport', req.params.sport)
            .order('round')
            .order('id');
        
        const formatted = matches?.map(m => ({
            ...m,
            team1_name: m.team1?.team_name,
            team2_name: m.team2?.team_name
        })) || [];
        
        res.json({ matches: formatted });
    } catch (e) {
        console.error(e);
        res.json({ matches: [] });
    }
});

// Get single match
app.get('/api/match/:id', async (req, res) => {
    try {
        const { data: match } = await supabase
            .from('matches')
            .select(`
                *, 
                team1:teams!matches_team1_id_fkey(team_name),
                team2:teams!matches_team2_id_fkey(team_name)
            `)
            .eq('id', req.params.id)
            .single();
        
        res.json({
            ...match,
            team1_name: match.team1?.team_name,
            team2_name: match.team2?.team_name
        });
    } catch (e) {
        res.status(500).json({ error: 'Match not found' });
    }
});

// ADMIN ENDPOINTS

// Get all teams (admin)
app.get('/api/admin/teams', async (req, res) => {
    try {
        let query = supabase.from('teams').select('*').order('created_at');
        if (req.query.sport) query = query.eq('sport', req.query.sport);
        
        const { data } = await query;
        res.json(data || []);
    } catch (e) {
        res.json([]);
    }
});

// Perform draw
app.post('/api/admin/draw/:sport', async (req, res) => {
    const sport = req.params.sport;
    
    try {
        const { data: teams } = await supabase
            .from('teams').select('id, team_name').eq('sport', sport);
        
        if (!teams || teams.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 teams for a draw' });
        }
        
        // Delete existing matches for this sport
        await supabase.from('matches').delete().eq('sport', sport);
        
        // Shuffle teams
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        
        // Pad to 16 if needed (some matches will have TBD)
        while (shuffled.length < 16) {
            shuffled.push(null);
        }
        
        // Create Round of 16 matches (8 matches)
        const r16Matches = [];
        for (let i = 0; i < 16; i += 2) {
            r16Matches.push({
                sport,
                round: 1,
                team1_id: shuffled[i]?.id || null,
                team2_id: shuffled[i + 1]?.id || null,
                team1_score: null,
                team2_score: null,
                winner_id: null,
                is_live: false
            });
        }
        
        await supabase.from('matches').insert(r16Matches);
        
        // Create placeholder matches for later rounds
        // Quarter finals (4 matches)
        const qfMatches = Array(4).fill(null).map(() => ({
            sport, round: 2, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        }));
        await supabase.from('matches').insert(qfMatches);
        
        // Semi finals (2 matches)
        const sfMatches = Array(2).fill(null).map(() => ({
            sport, round: 3, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        }));
        await supabase.from('matches').insert(sfMatches);
        
        // Final (1 match)
        await supabase.from('matches').insert({
            sport, round: 4, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to perform draw' });
    }
});

// Get matches (admin)
app.get('/api/admin/matches', async (req, res) => {
    try {
        const { data } = await supabase
            .from('matches')
            .select(`
                *, 
                team1:teams!matches_team1_id_fkey(team_name),
                team2:teams!matches_team2_id_fkey(team_name)
            `)
            .eq('sport', req.query.sport || 'football')
            .order('round')
            .order('id');
        
        const formatted = data?.map(m => ({
            ...m,
            team1_name: m.team1?.team_name,
            team2_name: m.team2?.team_name
        })) || [];
        
        res.json(formatted);
    } catch (e) {
        res.json([]);
    }
});

// Update match (live score, rating, comment, status, game time)
app.put('/api/admin/match/:id', async (req, res) => {
    const { team1_score, team2_score, is_live, is_suspended, game_time, rating, comment } = req.body;
    
    try {
        const { error } = await supabase
            .from('matches')
            .update({ 
                team1_score, 
                team2_score, 
                is_live, 
                is_suspended: is_suspended || false,
                game_time: game_time || null,
                rating, 
                comment 
            })
            .eq('id', req.params.id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update match' });
    }
});

// Finish match and advance winner
app.post('/api/admin/match/:id/finish', async (req, res) => {
    const { team1_score, team2_score, rating, comment } = req.body;
    
    try {
        // Get current match
        const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (!match) return res.status(404).json({ error: 'Match not found' });
        
        const winnerId = team1_score > team2_score ? match.team1_id : match.team2_id;
        
        // Update current match
        await supabase.from('matches').update({
            team1_score, team2_score, winner_id: winnerId,
            is_live: false, rating, comment
        }).eq('id', req.params.id);
        
        // Advance winner to next round
        if (match.round < 4) {
            const { data: currentRoundMatches } = await supabase
                .from('matches')
                .select('id, winner_id')
                .eq('sport', match.sport)
                .eq('round', match.round)
                .order('id');
            
            const matchIndex = currentRoundMatches.findIndex(m => m.id === match.id);
            const nextMatchIndex = Math.floor(matchIndex / 2);
            const isFirstTeam = matchIndex % 2 === 0;
            
            const { data: nextRoundMatches } = await supabase
                .from('matches')
                .select('id')
                .eq('sport', match.sport)
                .eq('round', match.round + 1)
                .order('id');
            
            if (nextRoundMatches && nextRoundMatches[nextMatchIndex]) {
                const updateField = isFirstTeam ? 'team1_id' : 'team2_id';
                await supabase.from('matches')
                    .update({ [updateField]: winnerId })
                    .eq('id', nextRoundMatches[nextMatchIndex].id);
            }
        }
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to finish match' });
    }
});

// Set champion
app.post('/api/admin/champion', async (req, res) => {
    const { teamId, sport } = req.body;
    
    try {
        // Remove champion status from all teams of this sport
        await supabase.from('teams').update({ is_champion: false }).eq('sport', sport);
        
        // Set new champion
        await supabase.from('teams').update({ is_champion: true }).eq('id', teamId);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to set champion' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});