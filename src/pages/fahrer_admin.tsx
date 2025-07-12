import {useEffect, useState} from "react";
import AdminLayout from "@/components/admin/layout";
import Driver from "@/interfaces/driver";
import {withRoleAuthSsr} from "@/lib/withRoleAuthSsr";

export const getServerSideProps = withRoleAuthSsr("admin");

export default function FahrerAdminPage() {
    const [fahrer, setFahrer] = useState<Driver[]>([]);
    const [name, setName] = useState("");
    const [startpunkt, setStartpunkt] = useState("1");
    const [label, setLabel] = useState("");

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
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name, startpunkt, label})
        });
        setName("");
        setLabel("");
        await fetchFahrer();
    };

    const handleDelete = async (id: number) => {
        await fetch("/api/fahrer/delete", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({id})
        });
        await fetchFahrer();
    };

    const handleUpdate = async (id: number, field: keyof Driver, value: string) => {
        await fetch("/api/fahrer/update", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({id, [field]: value})
        });
        await fetchFahrer();
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
            </div>
            <div className="mb-3 row g-2 align-items-center">
                <div className="col">
                    <div className="col gap-lg-2">
                        <input
                            className="form-control"
                            placeholder="Label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="mb-3 row g-2 align-items-center">
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
            </div>
            <div className="mb-3 row g-2 align-items-lg-end">
                    <div className="col">
                        <button className="btn btn-primary pull-right" onClick={handleCreate} disabled={!name || !label}>
                            Hinzufügen
                        </button>
                    </div>
            </div>

            <table className="table">
                <thead>
                <tr>
                    <th>Name</th>
                    <th>Label</th>
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
                            <input
                                className="form-control"
                                value={f.label}
                                onChange={(e) => handleUpdate(f.id, "label", e.target.value)}
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
