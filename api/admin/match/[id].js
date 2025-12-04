import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { id } = req.query;
    
    if (req.method === 'PUT') {
        const { team1_score, team2_score, is_live, rating, comment } = req.body;
        
        try {
            const { error } = await supabase
                .from('matches')
                .update({ team1_score, team2_score, is_live, rating, comment })
                .eq('id', id);
            
            if (error) throw error;
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Failed to update match' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}