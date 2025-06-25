import { createPagesServerClient as createRouteHandlerSupabaseClient} from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerSupabaseClient({ req, res });
  const { data, error } = await supabase.from('fahrer').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}