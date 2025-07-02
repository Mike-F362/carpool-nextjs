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
    handleScroll: () => void,
    visibleRows
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
    const [matchingFahrten, setMatchingFahrten] = useState(new Set());

    const rowHeight = 36;
    const maxHeight = (rowHeight * pageSize); // + 60;

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

    // function isSameAnwesenheit(fahrtAnwesend, selectedAnwesend) {
    // const filter = (arr) => arr.filter(id => !zwischenIds.has(id)).sort();
    // const a = filter(fahrtAnwesend);
    // const b = filter(selectedAnwesend);
    // return JSON.stringify(a) === JSON.stringify(b);
    // }

    function eqSet<T> (as: Set<T>, bs: Set<T>): boolean
    {
        if (as.size !== bs.size) {
            return false;
        }
        for (const a of as) {
            if (!bs.has(a)) {
                return false;
            }
        }
        return true;
    }

    function calcMatches(selectedAnwesend: number[]) {
        const neueMatches = new Set();
        const selectedAnwesendSet = new Set(selectedAnwesend);

        anwesenheiten.forEach((anwesenheit, index) => {
            if (eqSet(anwesenheit, selectedAnwesendSet)) {
                neueMatches.add(daten[index].id);
            }
        });

        setMatchingFahrten(neueMatches);
    }

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
                                    className={"clickable-row" + (eqArraySet(tour.anwesend_ids, selectedAnwesenheit) ? " table-active" : "")}
                                    onClick={() => {
                                        zeileUmschalten(i);
                                        setSelectedAnwesenheit(tour.anwesend_ids);
                                    }}
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
