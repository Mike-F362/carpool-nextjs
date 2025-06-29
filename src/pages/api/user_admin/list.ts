import { createPagesServerClient as createRouteHandlerSupabaseClient} from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerSupabaseClient({ req, res });
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: error.message });

  // Nutzdaten extrahieren
  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'user'
  }));

  res.status(200).json(users);
}