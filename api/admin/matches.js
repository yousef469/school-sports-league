import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
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
}