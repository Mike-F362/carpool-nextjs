"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UserCreateModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [info, setInfo] = useState("");
    const [error, setError] = useState("");

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");

        const { error } = await supabase.auth.admin.createUser({
            email,
            password: pw,
            email_confirm: true,
        });

        if (error) setError(error.message);
        else {
            setInfo("Benutzer erfolgreich erstellt.");
            setEmail("");
            setPw("");
        }
    };

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
                <form className="modal-content" onSubmit={createUser}>
                    <div className="modal-header">
                        <h5 className="modal-title">Neuen Benutzer erstellen</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <input
                            className="form-control mb-2"
                            placeholder="E-Mail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            className="form-control mb-2"
                            placeholder="Passwort"
                            type="password"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            required
                        />
                        {error && <div className="alert alert-danger py-1 small">{error}</div>}
                        {info && <div className="alert alert-success py-1 small">{info}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn btn-primary">
                            Benutzer erstellen
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Schließen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
