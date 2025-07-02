"use client";

import React, {useState} from "react";

import Driver from "@/interfaces/driver";
import styles from "./tour_table.module.css";
import Tour from "@/interfaces/tour";

type Props = {
    daten: Tour[],
    fahrerListe: Driver[],
    anwesenheiten: Set<number>[],
    pageSize: number,
    entferneFahrt: (id: number) => void,
    tableContainerRef: React.RefObject<HTMLDivElement>,
    handleScroll?: () => void,
    visibleRows?: number
};

export default function Fahrtentabelle({
                                           daten,
                                           fahrerListe,
                                           anwesenheiten,
                                           pageSize,
                                           entferneFahrt,
                                           tableContainerRef,
                                           handleScroll,
                                           visibleRows
                                       }: Props) {
    const [geöffneteZeilen, setGeöffneteZeilen] = useState<number[]>([]);

    const zeileUmschalten = (index: number) => {
        setGeöffneteZeilen(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    function getDriverA(f: Tour) {
        return fahrerListe.find(item => item.id === f.fahrerA_id);
    }

    function getDriverB(f: Tour) {
        return fahrerListe.find(item => item.id === f.fahrerB_id);
    }

    const rowHeight = 36;
    const maxHeight = (rowHeight * pageSize); // + 60;

    return (
        // className={`${styles.tableWrapper} ${styles.scrollContainer}`}
        <div
            ref={tableContainerRef}
            onScroll={handleScroll}
            style={{
              overflowY: "auto",
              maxHeight: `${maxHeight}px`,
              border: "1px solid #ddd",
            }}
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
                        <th title={fahrer.label} key={fahrer.name} className="d-sm-table-cell">{fahrer.name}</th>
                    ))}
                    <th className={styles.hideOnMobile}>Fahrer</th>
                    <th className={styles.deleteButton}></th>
                </tr>
                </thead>

                <tbody>
                {
                    [...daten].slice(-visibleRows).reverse().map((tour, i) => {
                        const zeileIstOffen = geöffneteZeilen.includes(i);
                        const anwesenheitszellen = fahrerListe.map(driver => (
                            <td key={driver.id} className={tour.fahrerA_id === driver.id ? "table-warning" : tour.fahrerB_id === driver.id ? "table-primary" : ""}>
                                {anwesenheiten[daten.indexOf(tour)]?.has(driver.id) ? "✓" : ""}
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
                                        {new Date(tour.datum || "").toLocaleDateString("de-DE", {
                                            weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit"
                                        })}
                                    </td>
                                    {anwesenheitszellen}
                                    <td className={styles.hideOnMobile}>{getDriverA(tour)?.label} → {getDriverB(tour)?.label}</td>
                                    <td className="text-end">
                                        <button
                                            className="btn btn-sm  btn-outline-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                entferneFahrt(tour.id);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>

                                {zeileIstOffen && (
                                    <tr className={styles.fahrerInfoMobile}>
                                        <td colSpan={fahrerListe.length + 1} className="bg-light small">
                                            <strong>Fahrer:</strong> {getDriverA(tour)?.label} → {getDriverB(tour)?.label}
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
