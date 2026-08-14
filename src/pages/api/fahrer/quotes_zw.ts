import type { NextApiRequest, NextApiResponse } from "next";
import { calcQuoteZw, get_drivers } from "@/pages/api/fahrer/calc_qoutes";
import { createApiClient } from "@/lib/supabase/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Session-bound client: runs as `authenticated`, not as `anon`
    const supabase = createApiClient(req);
    const spIds = await get_drivers(supabase, 1);

    const { data, error } = await supabase.rpc("get_unique_zw_attendance_ids");

    const anwesendIds = data.map((item) => {
        return item.anwesend_ids as number[];
    });

    const quotesPerSpDriver = Array.from(spIds).map(async (spid) => {
        const quotes: Promise<[]> = await anwesendIds.map(async (anwesend: number[]) => {
            const qoutesValue = await calcQuoteZw(supabase, spid, anwesend, spIds);
            const res = {};
            const key = anwesend.join("-");
            res[key] = Object.fromEntries(qoutesValue);
            return res;
        });

        const res = {};
        const key = spid;
        // @ts-expect-error
        res[key] = await Promise.all(quotes);
        return res;
    });

    const quotes_values = await Promise.all(quotesPerSpDriver);

    const arrayToObject = (array: object[]) =>
        array.reduce((obj, item) => {
            Object.entries(item).forEach(([key, value]) => {
                const objValue = {};
                value.forEach((array_value: { [s: string]: object }) => {
                    Object.entries(array_value).forEach(([key, value]) => {
                        objValue[key] = value;
                    });
                });
                obj[key] = objValue;
            });

            return obj;
        }, {});

    // https://stackoverflow.com/questions/19874555/how-do-i-convert-array-of-objects-into-one-object-in-javascript
    const quotes_res = arrayToObject(quotes_values);

    res.status(200).json(quotes_res);
}
