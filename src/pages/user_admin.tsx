import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/layout";
import { withRoleAuth } from "@/lib/withRoleAuth";

export const getServerSideProps = withRoleAuth("admin");

export default function UserAdminPage() {
    const [users, setUsers] = useState<any[]>([]);

    const fetchUsers = async () => {
        const res = await fetch("/api/users/list");
        const data = await res.json() || [];
        setUsers(data);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (id: string, role: string) => {
        await fetch("/api/users/set-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, role })
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
                    </tr>
                ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
