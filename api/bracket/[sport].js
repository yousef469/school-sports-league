import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { sport } = req.query;
    
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
            .eq('sport', sport)
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
}