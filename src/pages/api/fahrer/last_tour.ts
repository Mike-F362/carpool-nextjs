import {NextApiRequest, NextApiResponse} from "next";
import {supabase} from "@/lib/supabaseClient";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {

    const {data, error} = await supabase.rpc("get_last_tour_per_driver");

    if (error) return res.status(500).json({error: error.message});

    res.status(200).json(data);
}