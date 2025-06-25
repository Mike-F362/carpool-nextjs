import { createPagesServerClient as createRouteHandlerSupabaseClient} from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerSupabaseClient({ req, res });
  const { id, ...fields } = req.body;
  const { data, error } = await supabase.from('fahrer').update(fields).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}