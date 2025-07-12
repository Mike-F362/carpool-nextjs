import {NextApiRequest, NextApiResponse} from "next";
import {calcQuoteSp, get_drivers} from "@/pages/api/fahrer/calc_qoutes";
import {supabase} from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const zwischenIds = await get_drivers(supabase, 2);

    const {data, error} = await supabase.rpc("get_unique_attendance_ids");

    const anwesendIds = data.map(item => {
        return item.anwesend_ids as number[];
    });

    const quotes = await anwesendIds.map(async (anwesend: number[]) => {
        const qoutesValue = await calcQuoteSp(supabase, anwesend, zwischenIds);
        let res = {}
        const key = anwesend.join('-')
        res[key] = Object.fromEntries(qoutesValue);
        return res;
    })

    const quotes_values = await Promise.all(quotes);

    const arrayToObject = (array) =>
        array.reduce((obj, item) => {
            Object.entries(item).forEach(([key, value]) => {
                obj[key] = value;
            });

            return obj
        }, {})

    // https://stackoverflow.com/questions/19874555/how-do-i-convert-array-of-objects-into-one-object-in-javascript
    const quotes_res = arrayToObject(quotes_values);

    res.status(200).json(quotes_res);
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