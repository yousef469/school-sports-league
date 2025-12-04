import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { id } = req.query;
    const { team1_score, team2_score, rating, comment } = req.body;
    
    try {
        const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', id)
            .single();
        
        if (!match) return res.status(404).json({ error: 'Match not found' });
        
        const winnerId = team1_score > team2_score ? match.team1_id : match.team2_id;
        
        await supabase.from('matches').update({
            team1_score, team2_score, winner_id: winnerId,
            is_live: false, rating, comment
        }).eq('id', id);
        
        if (match.round < 4) {
            const { data: currentRoundMatches } = await supabase
                .from('matches')
                .select('id, winner_id')
                .eq('sport', match.sport)
                .eq('round', match.round)
                .order('id');
            
            const matchIndex = currentRoundMatches.findIndex(m => m.id === parseInt(id));
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
}