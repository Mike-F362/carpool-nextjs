"use client";

import {useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import Driver from "@/interfaces/driver";

type Props = {
    fahrerListe: Driver[];
    setFahrerListe: (liste: Driver[]) => void;
    setMitglieder: (liste: Driver[]) => void;
};

export default function Fahrerverwaltung({
                                             fahrerListe,
                                             setFahrerListe,
                                             setMitglieder,
                                         }: Props) {
    const [name, setName] = useState("");

    const aktualisieren = async () => {
        const {data} = await supabase.from("fahrer").select("*");
        if (data) {
            const fahrer: Driver[] = data.map(e => {
                return {
                    id: e.id,
                    name: e.name,
                    label: e.label,
                    startpunkt: e.startpunkt,
                }
            });
            setFahrerListe(fahrer);
            setMitglieder(fahrer);
        }
    };

    const hinzufuegen = async (e: React.FormEvent) => {
        e.preventDefault();
        const neuerName = name.trim();
        if (!neuerName) return;
        await supabase.from("fahrer").insert({name: neuerName});
        setName("");
        aktualisieren();
    };

    const entfernen = async (fahrer: Driver) => {
        if (!confirm(`Fahrer #${fahrer.id} '${fahrer.name}' wirklich löschen?`)) return;
        await supabase.from("fahrer").delete().eq("id", fahrer.id);
        aktualisieren();
    };

    return (
        <div className="card p-3 mb-4">
            <h5>Fahrer verwalten</h5>
            <form className="row g-2 align-items-center" onSubmit={hinzufuegen}>
                <div className="col-auto">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Neuer Fahrer"
                        className="form-control"
                    />
                </div>
                <div className="col-auto">
                    <button type="submit" className="btn btn-success">
                        Hinzufügen
                    </button>
                </div>
            </form>

            <ul className="mt-3 list-group">
                {fahrerListe.map(fahrer => (
                    <li
                        key={fahrer.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                    >
                        {fahrer.name}
                        <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => entfernen(fahrer)}
                        >
                            Entfernen
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
