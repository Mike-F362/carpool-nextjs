import { NextApiRequest, NextApiResponse } from 'next';
import {createClient} from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, role } = req.body;

  const { error } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: { role }
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ success: true });
}