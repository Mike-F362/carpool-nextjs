import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerSupabaseClient({ req, res });
  const { id, role } = req.body;

  const { error } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: { role }
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}