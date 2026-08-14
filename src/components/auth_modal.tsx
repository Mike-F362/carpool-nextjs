"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    useEffect(() => {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
                document.cookie = `sb-access-token=${session.access_token}; path=/`;
                document.cookie = `sb-refresh-token=${session.refresh_token}; path=/`;
            }
        });

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, []);

    const login = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) setError(error.message);
        else onClose();
    };

    const reset = async () => {
        if (!email) return setError("Bitte eine gültige E-Mail Adresse eingeben.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/reset`,
        });
        if (error) setError(error.message);
        else setInfo("Ein Link zum Zurücksetzen wurde versendet.");
    };

    return (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <form className="modal-content" onSubmit={login}>
                    <div className="modal-header">
                        <h5 className="modal-title">Anmeldung</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label">E-Mail-Adresse</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-2">
                            <label className="form-label">Passwort</label>
                            <input
                                type="password"
                                className="form-control"
                                value={pw}
                                onChange={(e) => setPw(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <button type="button" className="btn btn-link p-0" onClick={reset}>
                                Passwort vergessen?
                            </button>
                        </div>

                        {error && <div className="alert alert-danger mt-2 py-2">{error}</div>}
                        {info && <div className="alert alert-success mt-2 py-2">{info}</div>}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-primary" type="submit">
                            Anmelden
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={onClose}>
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
