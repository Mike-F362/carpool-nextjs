// 📁 src/pages/fahrer_admin.tsx
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/layout";

interface Fahrer {
    id: string;
    name: string;
    startpunkt: string;
}

export default function FahrerAdminPage() {
    const [fahrer, setFahrer] = useState<Fahrer[]>([]);
    const [name, setName] = useState("");
    const [startpunkt, setStartpunkt] = useState("1");

    const fetchFahrer = async () => {
        const res = await fetch("/api/fahrer/list");
        const data = await res.json();
        setFahrer(data);
    };

    useEffect(() => {
        fetchFahrer();
    }, []);

    const handleCreate = async () => {
        await fetch("/api/fahrer/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, startpunkt })
        });
        setName("");
        fetchFahrer();
    };

    const handleDelete = async (id: string) => {
        await fetch("/api/fahrer/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });
        fetchFahrer();
    };

    const handleUpdate = async (id: string, field: keyof Fahrer, value: string) => {
        await fetch("/api/fahrer/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, [field]: value })
        });
        fetchFahrer();
    };

    return (
        <AdminLayout>
            <h3>Fahrerverwaltung</h3>

            <div className="mb-3 row g-2 align-items-center">
                <div className="col">
                    <input
                        className="form-control"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="col-auto">
                    <select
                        className="form-select"
                        value={startpunkt}
                        onChange={(e) => setStartpunkt(e.target.value)}
                    >
                        <option value="1">Startpunkt 1</option>
                        <option value="2">Zwischenstopp</option>
                    </select>
                </div>
                <div className="col-auto">
                    <button className="btn btn-primary" onClick={handleCreate} disabled={!name}>
                        Hinzufügen
                    </button>
                </div>
            </div>

            <table className="table">
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Startpunkt</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {fahrer.map((f) => (
                    <tr key={f.id}>
                        <td>
                            <input
                                className="form-control"
                                value={f.name}
                                onChange={(e) => handleUpdate(f.id, "name", e.target.value)}
                            />
                        </td>
                        <td>
                            <select
                                className="form-select"
                                value={f.startpunkt}
                                onChange={(e) => handleUpdate(f.id, "startpunkt", e.target.value)}
                            >
                                <option value="1">Startpunkt 1</option>
                                <option value="2">Zwischenstopp</option>
                            </select>
                        </td>
                        <td>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(f.id)}
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
