"use client";

import React from "react";

import Driver from "@/components/driver";
import styles from "./tour_table.module.css";

type Props = {
    daten: any[],
    fahrerListe: Driver[],
    anwesenheiten: Set<string>[],
    pageSize: number,
    entferneFahrt: (id: number) => void,
    tableContainerRef: React.RefObject<HTMLDivElement>,
    handleScroll?: () => void,
    geöffneteZeilen?: number[],
    zeileUmschalten?: (index: number) => void
};

export default function Fahrtentabelle({
                                           daten,
                                           fahrerListe,
                                           anwesenheiten,
                                           pageSize,
                                           entferneFahrt,
                                           tableContainerRef,
                                           handleScroll,
                                           geöffneteZeilen,
                                           zeileUmschalten
                                       }: Props) {
    return (
        <div
            className="table-responsive mb-3"
            style={{maxHeight: "100%", height:"100%", overflowY: "auto"}}
            ref={tableContainerRef}
            onScroll={handleScroll}
        >
            <table className={`table table-bordered table-sm able-hover ${styles.tableSticky}`}>
                <thead className={styles.stickyMobile}>
                <tr>
                    <th>
                        Datum
                        <button
                            className="btn btn-sm btn-outline-secondary ms-2"
                            title="Zur neuesten Tour scrollen"
                            onClick={() => {
                                if (tableContainerRef.current) {
                                    tableContainerRef.current.scrollTop = 0;
                                }
                            }}
                        >
                            ↑
                        </button>
                    </th>
                    {fahrerListe.map(fahrer => (
                        <th key={fahrer.name} className="d-sm-table-cell">{fahrer.name}</th>
                    ))}
                    <th className={styles.deleteButton}></th>
                </tr>
                </thead>

                <tbody>
                {[...daten].map((f, i) => {
                    const zeileIstOffen = geöffneteZeilen.includes(i);
                    const anwesenheitszellen = fahrerListe.map(m => (
                        <td key={m.name} className={f.fahrerA === m.name ? "table-warning" : f.fahrerB === m.name ? "table-primary" : ""}>
                            {anwesenheiten[daten.indexOf(f)]?.has(m.name) ? "✓" : ""}
                        </td>
                    ));

                    return (
                        <React.Fragment key={i}>
                            <tr
                                className="clickable-row"
                                onClick={() => zeileUmschalten(i)}
                                style={{cursor: "pointer"}}
                            >
                                <td>
                                    {new Date(f.datum || "").toLocaleDateString("de-DE", {
                                        weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit"
                                    })}
                                </td>
                                {anwesenheitszellen}
                                <td className="text-end">
                                    <button
                                        className="btn btn-sm  btn-outline-danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            entferneFahrt(f.id);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                            {zeileIstOffen && (
                                <tr className={styles.fahrerInfoMobile}>
                                    <td colSpan={fahrerListe.length + 1} className="bg-light small">
                                        <strong>Fahrer:</strong> {f.fahrerA} → {f.fahrerB}
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}
