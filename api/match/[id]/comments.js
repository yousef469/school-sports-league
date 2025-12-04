import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    const { id } = req.query;
    
    if (req.method === 'GET') {
        try {
            const { data } = await supabase
                .from('match_comments')
                .select('*')
                .eq('match_id', id)
                .order('created_at', { ascending: false })
                .limit(50);
            
            res.json({ comments: data || [] });
        } catch (e) {
            res.json({ comments: [] });
        }
    } else if (req.method === 'POST') {
        const { name, text, prediction } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name required' });
        }
        
        try {
            await supabase.from('match_comments').insert({
                match_id: parseInt(id),
                name,
                text: text || '',
                prediction: prediction || null
            });
            
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Failed to post comment' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}