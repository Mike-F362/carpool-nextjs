"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPage() {
    const [pw, setPw] = useState("");
    const [done, setDone] = useState(false);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) {
            alert("Fehler: " + error.message);
        } else {
            setDone(true);
            setTimeout(() => router.push("/"), 2000);
        }
    };

    return (
        <div className="container" style={{ maxWidth: 500, marginTop: "5rem" }}>
            <h3>Neues Passwort setzen</h3>
            <form onSubmit={handleReset}>
                <input
                    type="password"
                    className="form-control my-3"
                    placeholder="Neues Passwort"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">Speichern</button>
            </form>
            {done && <div className="text-success mt-3">✔ Passwort gespeichert. Weiterleitung…</div>}
        </div>
    );
}
