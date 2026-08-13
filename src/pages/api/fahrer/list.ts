import {NextApiRequest, NextApiResponse} from 'next';
import {createApiClient} from "@/lib/supabase/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sitzungsgebundener Client: laeuft als `authenticated`, nicht als `anon`
  const supabase = createApiClient(req);
  const { data, error } = await supabase.from('fahrer').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
}