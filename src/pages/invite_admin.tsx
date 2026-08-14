import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/layout";
import InviteLink from "@/components/invite_link";
import { withRoleAuthSsr } from "@/lib/withRoleAuthSsr";

export const getServerSideProps = withRoleAuthSsr("admin");

export default function InviteAdminPage() {
    const [email, setEmail] = useState("");
    const [invites, setInvites] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    const loadInvites = async () => {
        const res = await fetch("/api/invite/list");
        const data = await res.json();
        setInvites(data);
    };

    useEffect(() => {
        loadInvites();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg("");
        setErr("");
        const res = await fetch("/api/invite/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role: "user" }),
        });
        const data = await res.json();
        if (!res.ok) {
            setErr(data.error);
        } else {
            setMsg(`Einladung erstellt: ${data.code}`);
            setEmail("");
            await loadInvites();
        }
    };

    const handleDelete = async (code: string) => {
        await fetch("/api/invite/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
        });
        await loadInvites();
    };

    return (
        <AdminLayout>
            <h3>Admin-Einladungen</h3>
            <form onSubmit={handleCreate} className="mb-3">
                <input
                    className="form-control mb-2"
                    placeholder="E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <button className="btn btn-primary w-100" type="submit">
                    Einladung erstellen
                </button>
            </form>

            {msg && <div className="alert alert-success">{msg}</div>}
            {err && <div className="alert alert-danger">{err}</div>}

            <table className="table mt-4">
                <thead>
                    <tr>
                        <th>E-Mail</th>
                        <th>Rolle</th>
                        <th>Code</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {invites.map((i) => (
                        <tr key={i.code}>
                            <td>{i.email}</td>
                            <td>{i.role}</td>
                            <InviteLink key={i.code} token={i.code} email={i.email} />
                            <td>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i.code)}>
                                    Löschen
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
