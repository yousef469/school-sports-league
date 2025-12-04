import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const SLOTS_PER_GRADE = 5;
const TOTAL_SLOTS = 16;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        // Get teams
        try {
            let query = supabase.from('teams').select('*').order('created_at');
            if (req.query.sport) query = query.eq('sport', req.query.sport);
            
            const { data } = await query;
            res.json(data || []);
        } catch (e) {
            res.json([]);
        }
    } else if (req.method === 'POST') {
        // Create team
        const { teamName, captainName, grade, sport, password, teammates } = req.body;
        
        if (!teamName || !captainName || !grade || !sport || !password || !teammates) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        try {
            const { data: gradeTeams } = await supabase
                .from('teams').select('id').eq('grade', grade).eq('sport', sport);
            
            if (gradeTeams && gradeTeams.length >= SLOTS_PER_GRADE) {
                return res.status(400).json({ error: `Grade ${grade} ${sport} is full!` });
            }
            
            const { data: allTeams } = await supabase
                .from('teams').select('id').eq('sport', sport);
            
            if (allTeams && allTeams.length >= TOTAL_SLOTS) {
                return res.status(400).json({ error: `${sport} is full! All 16 slots taken.` });
            }
            
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
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}