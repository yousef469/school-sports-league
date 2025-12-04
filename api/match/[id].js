import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { id } = req.query;
    
    try {
        const { data: match } = await supabase
            .from('matches')
            .select(`
                *, 
                team1:teams!matches_team1_id_fkey(team_name),
                team2:teams!matches_team2_id_fkey(team_name)
            `)
            .eq('id', id)
            .single();
        
        res.json({
            ...match,
            team1_name: match.team1?.team_name,
            team2_name: match.team2?.team_name
        });
    } catch (e) {
        res.status(500).json({ error: 'Match not found' });
    }
}