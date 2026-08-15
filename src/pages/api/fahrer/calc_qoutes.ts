import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quotas per attendance set, for both legs.
 *
 * A quota answers "within exactly this set of people, how often has each of
 * them driven this leg". The proposal in the UI is the minimum over that.
 *
 * Everything here reads the trips exactly once and buckets them in a single
 * pass. The previous version issued one query per attendance set - and for the
 * intermediate stop one per driver *and* set - each time fetching the whole
 * table and filtering it down to a single bucket. The result is identical; what
 * changes is that the database is asked once instead of a dozen times.
 *
 * The grouping functions are pure so they can be tested against a reference
 * implementation without a database (see tests/quotes.test.ts).
 */

/** A trip as far as the leg-1 quota is concerned. */
export interface FahrtSp {
    fahrerA_id: number | null;
    anwesend_ids: number[] | null;
}

/** A trip as far as the leg-2 quota is concerned. */
export interface FahrtZw extends FahrtSp {
    fahrerB_id: number | null;
}

/** `{ "4-5-11": { "4": 12, "5": 9 } }` - counts per driver, per attendance set. */
export type QuotesSp = Record<string, Record<string, number>>;

/** The same, one level deeper: per leg-1 driver, per attendance set. */
export type QuotesZw = Record<string, QuotesSp>;

/** Ids of the drivers boarding at the given stop (1 = start, 2 = intermediate). */
export async function get_drivers(supabase: SupabaseClient, startPoint: number): Promise<Set<number>> {
    const { data, error } = await supabase.from("fahrer").select("id").eq("startpunkt", startPoint);

    if (error) throw new Error(`Could not load drivers for stop ${startPoint}: ${error.message}`);

    return new Set((data ?? []).map((f: { id: number }) => Number(f.id)));
}

/**
 * Key of an attendance set: ids without those boarding later, deduplicated,
 * ascending, joined by "-".
 *
 * This is the same key `get_unique_attendance_ids()` builds in SQL and the same
 * one the UI looks up with. Ids are run through Number() because they come out
 * of a jsonb column, where the SQL side casts them with ::int as well.
 *
 * Returns null for a trip that has nobody left after filtering - the SQL
 * function produces no row for those either, so they form no bucket.
 */
function attendanceKey(anwesend_ids: number[] | null, ausgeschlossen: Set<number>): string | null {
    const ids = [...new Set((anwesend_ids ?? []).map(Number))].filter((id) => !ausgeschlossen.has(id));

    if (!ids.length) return null;

    return ids.sort((a, b) => a - b).join("-");
}

/**
 * Leg 1: how often each driver drove, per attendance set of the people
 * boarding at the start point.
 */
export function groupQuotesSp(fahrten: FahrtSp[], zwischenIds: Set<number>): QuotesSp {
    const quotes: QuotesSp = {};

    for (const fahrt of fahrten) {
        const key = attendanceKey(fahrt.anwesend_ids, zwischenIds);
        if (key === null) continue;

        if (!quotes[key]) quotes[key] = {};

        const bucket = quotes[key];
        const fahrer = String(fahrt.fahrerA_id);
        bucket[fahrer] = (bucket[fahrer] ?? 0) + 1;
    }

    return quotes;
}

/**
 * Leg 2: how often each driver drove, per leg-1 driver and per attendance set
 * of the people boarding at the intermediate stop.
 *
 * Trips whose leg-1 driver is not a start-point driver are skipped, the way the
 * per-driver queries did by only ever asking for known ids.
 */
export function groupQuotesZw(fahrten: FahrtZw[], startPunktIds: Set<number>): QuotesZw {
    const quotes: QuotesZw = {};

    for (const fahrt of fahrten) {
        const fahrerA = Number(fahrt.fahrerA_id);
        if (!startPunktIds.has(fahrerA)) continue;

        const key = attendanceKey(fahrt.anwesend_ids, startPunktIds);
        if (key === null) continue;

        const fahrerAKey = String(fahrerA);
        if (!quotes[fahrerAKey]) quotes[fahrerAKey] = {};

        const proFahrer = quotes[fahrerAKey];
        if (!proFahrer[key]) proFahrer[key] = {};

        const bucket = proFahrer[key];
        const fahrer = String(fahrt.fahrerB_id);
        bucket[fahrer] = (bucket[fahrer] ?? 0) + 1;
    }

    return quotes;
}

/** One query for the whole leg-1 quota table. */
export async function ladeQuotesSp(supabase: SupabaseClient): Promise<QuotesSp> {
    const zwischenIds = await get_drivers(supabase, 2);

    const { data, error } = await supabase.from("fahrten").select("fahrerA_id, anwesend_ids");

    if (error) throw new Error(`Could not load trips: ${error.message}`);

    return groupQuotesSp((data ?? []) as FahrtSp[], zwischenIds);
}

/** One query for the whole leg-2 quota table. */
export async function ladeQuotesZw(supabase: SupabaseClient): Promise<QuotesZw> {
    const startPunktIds = await get_drivers(supabase, 1);

    const { data, error } = await supabase.from("fahrten").select("fahrerA_id, fahrerB_id, anwesend_ids");

    if (error) throw new Error(`Could not load trips: ${error.message}`);

    return groupQuotesZw((data ?? []) as FahrtZw[], startPunktIds);
}
