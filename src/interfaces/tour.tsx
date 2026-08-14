export default interface Tour {
    id?: number;
    datum: Date;
    fahrerA_id: number;
    fahrerB_id: number;
    anwesend_ids: number[];
}
