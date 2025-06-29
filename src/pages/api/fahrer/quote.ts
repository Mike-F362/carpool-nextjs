import { createPagesServerClient as createRouteHandlerSupabaseClient} from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerSupabaseClient({ req, res });

  const anwesend = req.body.anwesend as string[] || [];

  // Zwischenfahrer mit startpunkt = 2
  const { data: zwischenfahrer, error: err1 } = await supabase
    .from("fahrer")
    .select("id")
    .eq("startpunkt", 2);

  if (err1) return res.status(500).json({ error: err1.message });

  const zwischenIds = new Set(zwischenfahrer.map((f) => f.id));
  const anwesendOhneZwischen = anwesend.filter((id) => !zwischenIds.has(id));

  // Fahrten abrufen
  const { data: fahrten, error } = await supabase
    .from("fahrten")
    .select("fahrerA_id, anwesend_ids");

  if (error) return res.status(500).json({ error: error.message });

  // TODO: Berechnung aus DB
  // Berechnung
  const counter = new Map<number, number>();
  for (const fahrt of fahrten) {
    const aktuelleAnwesenheit = (fahrt.anwesend_ids || []).filter((id: string) => !zwischenIds.has(id));
    if (eqArraySet(aktuelleAnwesenheit, anwesendOhneZwischen)) {
      const count = counter.get(fahrt.fahrerA_id) || 0;
      counter.set(fahrt.fahrerA_id, count + 1);
    }
  }

  res.status(200).json(Object.fromEntries(counter));
}

function eqArraySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  for (const val of setA) {
    if (!setB.has(val)) return false;
  }
  return true;
}