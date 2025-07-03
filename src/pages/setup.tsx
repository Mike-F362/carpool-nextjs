// app/setup/setup.tsx – Einmalige Setup-Seite zum Erstellen des ersten Admins

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [disabled, setDisabled] = useState(false);
    const [ready, setReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/setup-admin/check")
            .then(res => res.json())
            .then(data => {
                if (data.exists) router.push("/");
                else setReady(true);
            });
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setDisabled(true);

        const res = await fetch("/api/setup-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password: pw })
        });

        const data = await res.json();
        if (!res.ok) {
            setErr(data.error || "Fehler bei der Einrichtung");
            setDisabled(false);
        } else {
            setMsg("Admin wurde erstellt. Du kannst dich jetzt einloggen.");
            setTimeout(() => router.push("/"), 2000);
        }
    };

    if (!ready) return <div className="container mt-5">Wird geladen...</div>;

    return (
        <div className="container mt-5" style={{ maxWidth: 500 }}>
            <h3>Initiale Einrichtung</h3>
            <p>Erstelle deinen ersten Admin-Benutzer.</p>
            <form onSubmit={handleSubmit}>
                <input className="form-control my-2" placeholder="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className="form-control my-2" placeholder="Passwort" type="password" value={pw} onChange={e => setPw(e.target.value)} required />
                <button className="btn btn-primary w-100" disabled={disabled} type="submit">
                    Admin erstellen
                </button>
            </form>
            {err && <div className="alert alert-danger mt-3">{err}</div>}
            {msg && <div className="alert alert-success mt-3">{msg}</div>}
        </div>
    );
}
