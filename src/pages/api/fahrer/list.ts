import {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase.from('fahrer').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
}