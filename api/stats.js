import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
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
}