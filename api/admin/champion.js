import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { teamId, sport } = req.body;
    
    try {
        await supabase.from('teams').update({ is_champion: false }).eq('sport', sport);
        await supabase.from('teams').update({ is_champion: true }).eq('id', teamId);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to set champion' });
    }
}