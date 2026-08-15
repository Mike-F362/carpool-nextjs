import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/layout";
import { withRoleAuthSsr } from "@/lib/withRoleAuthSsr";
import type User from "@/interfaces/user";

export const getServerSideProps = withRoleAuthSsr("admin");

export default function UserAdminPage() {
    const [users, setUsers] = useState<User[]>([]);

    const fetchUsers = useCallback(async () => {
        const res = await fetch("/api/users/list");
        const data = (await res.json()) || [];
        setUsers(data);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (id: string, role: string) => {
        await fetch("/api/users/set-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, role }),
        });
        await fetchUsers();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Diesen Nutzer wirklich löschen?")) return;

        await fetch("/api/users/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: id }),
        });
        await fetchUsers();
    };

    return (
        <AdminLayout>
            <h3>Benutzerverwaltung</h3>
            <table className="table">
                <thead>
                    <tr>
                        <th>E-Mail</th>
                        <th>Rolle</th>
                        <th>Aktion</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <select
                                    className="form-select form-select-sm"
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                >
                                    <option value="user">user</option>
                                    <option value="admin">admin</option>
                                </select>
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(user.id)}
                                >
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
