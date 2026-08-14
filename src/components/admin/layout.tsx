// 📁 src/components/admin/layout.tsx
import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="container mt-5">
            <nav className="mb-4">
                <ul className="nav nav-pills">
                    <li className="nav-item">
                        <Link href="/" className="nav-link">
                            Startseite
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link href="/invite_admin" className="nav-link">
                            Einladungen
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link href="/user_admin" className="nav-link">
                            Benutzer
                        </Link>
                    </li>
                    <li className="nav-item">
                        <Link href="/fahrer_admin" className="nav-link">
                            Fahrer
                        </Link>
                    </li>
                </ul>
            </nav>
            {children}
        </div>
    );
}
