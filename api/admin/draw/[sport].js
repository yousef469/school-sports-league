import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { sport } = req.query;
    
    try {
        const { data: teams } = await supabase
            .from('teams').select('id, team_name').eq('sport', sport);
        
        if (!teams || teams.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 teams for a draw' });
        }
        
        await supabase.from('matches').delete().eq('sport', sport);
        
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        while (shuffled.length < 16) shuffled.push(null);
        
        const r16Matches = [];
        for (let i = 0; i < 16; i += 2) {
            r16Matches.push({
                sport, round: 1,
                team1_id: shuffled[i]?.id || null,
                team2_id: shuffled[i + 1]?.id || null,
                team1_score: null, team2_score: null,
                winner_id: null, is_live: false
            });
        }
        await supabase.from('matches').insert(r16Matches);
        
        const qfMatches = Array(4).fill(null).map(() => ({
            sport, round: 2, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        }));
        await supabase.from('matches').insert(qfMatches);
        
        const sfMatches = Array(2).fill(null).map(() => ({
            sport, round: 3, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        }));
        await supabase.from('matches').insert(sfMatches);
        
        await supabase.from('matches').insert({
            sport, round: 4, team1_id: null, team2_id: null,
            team1_score: null, team2_score: null, winner_id: null, is_live: false
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to perform draw' });
    }
}