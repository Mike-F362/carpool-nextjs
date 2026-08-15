import Link from "next/link";
import { useState } from "react";
import type { User as SupabaseUser } from "@supabase/auth-js";
import styles from "./header.module.css";
import { supabase } from "@/lib/supabaseClient";
import AppVersion from "@/components/app_version";

export default function Header({
    user,
    reset,
    isAdmin,
}: {
    user: SupabaseUser | null;
    reset?: () => Promise<void>;
    isAdmin?: boolean;
}) {
    const [offcanvasOpen, setOffcanvasOpen] = useState(false);

    return (
        <header className="border-bottom bg-light">
            {/* Obere Zeile: Titel + Version */}
            {/*<div className={styles.titleRow + "d-flex justify-content-between align-items-baseline flex-wrap"}>*/}
            <div className="w-100">
                <div className={`${styles.titleRow}`}>
                    <h1 className="h5 mb-0">Fahrgemeinschaftsplaner</h1>
                    <div className={`${styles.versionContainer}`}>
                        <AppVersion
                            className={`${styles.version} badge bg-secondary bg-opacity-75 ms-2 text-light text-end`}
                        />
                    </div>
                </div>
            </div>
            {/*</div>*/}

            {/* Untere Zeile: Menü + Benutzerinfo */}
            <div
                className={`${styles.menuRow} badge d-flex justify-content-between align-items-center px-3 pb-2 border-top`}
            >
                <div className="d-flex align-items-center gap-2">
                    {isAdmin && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setOffcanvasOpen(true)}
                        >
                            ☰
                        </button>
                    )}
                </div>

                <div className="d-flex align-items-center ms-auto">
                    {user?.email && <span className="me-2 text-black opacity-75 small">{user.email}</span>}
                    <button
                        type="button"
                        title="Logout"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => supabase.auth.signOut()}
                    >
                        🚪
                    </button>
                </div>
            </div>

            {/* Offcanvas-Menü */}
            {isAdmin && (
                <div
                    className={`offcanvas offcanvas-start ${offcanvasOpen ? "show" : ""}`}
                    tabIndex={-1}
                    style={{ visibility: offcanvasOpen ? "visible" : "hidden" }}
                >
                    <div className="offcanvas-header">
                        <h5 className="offcanvas-title">Admin-Menü</h5>
                        <button type="button" className="btn-close" onClick={() => setOffcanvasOpen(false)}></button>
                    </div>
                    <div className="offcanvas-body">
                        <ul className="list-group list-group-flush">
                            <li>
                                <Link href="/invite_admin" className="list-group-item list-group-item-action">
                                    🔐 Invite-Admin
                                </Link>
                            </li>
                            <li>
                                <Link href="/user_admin" className="list-group-item list-group-item-action">
                                    👥 Benutzerverwaltung
                                </Link>
                            </li>
                            <li>
                                <Link href="/fahrer_admin" className="list-group-item list-group-item-action">
                                    🚗 Fahrerverwaltung
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="list-group-item list-group-item-action" onClick={reset}>
                                    ❌ Reset Tours
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </header>
    );
}
