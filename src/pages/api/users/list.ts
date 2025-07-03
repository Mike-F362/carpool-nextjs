import { NextApiRequest, NextApiResponse } from 'next';
import {createClient} from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

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