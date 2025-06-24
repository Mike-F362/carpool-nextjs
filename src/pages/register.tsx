// 📁 src/pages/register.tsx

import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setLoading(true);

        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, code })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setErr(data.error || "Registrierung fehlgeschlagen");
        } else {
            setMsg("Registrierung erfolgreich! Du kannst dich jetzt anmelden.");
            setTimeout(() => router.push("/login"), 2000);
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: 500 }}>
            <h3>Registrierung</h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    className="form-control my-2"
                    placeholder="E-Mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    className="form-control my-2"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="text"
                    className="form-control my-2"
                    placeholder="Einladungscode"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                />
                <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                >
                    Registrieren
                </button>
            </form>
            {err && <div className="alert alert-danger mt-3">{err}</div>}
            {msg && <div className="alert alert-success mt-3">{msg}</div>}
        </div>
    );
}
