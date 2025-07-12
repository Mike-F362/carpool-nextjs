import {NextApiRequest, NextApiResponse} from 'next';
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {withAdminAuth} from '@/lib/middleware/withAdminAuth'

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, ...fields } = req.body;
  const {data, error} = await supabaseAdmin.from('fahrer').update(fields).eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  res.status(200).json(data);
}