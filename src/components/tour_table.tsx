"use client";

import React, { useEffect, useState } from "react";

import type Driver from "@/interfaces/driver";
import styles from "./tour_table.module.css";
import type Tour from "@/interfaces/tour";

type Props = {
    daten: Tour[];
    fahrerListe: Driver[];
    pageSize: number;
    entferneFahrt: (id: number) => void;
    tableContainerRef: React.RefObject<HTMLDivElement>;
    handleScroll: () => void;
    visibleRows: number;
    driversSp: number[];
    driversIm: number[];
    loading: boolean;
};

export default function Fahrtentabelle({
    daten,
    fahrerListe,
    pageSize,
    entferneFahrt,
    tableContainerRef,
    handleScroll,
    visibleRows,
    driversSp,
    driversIm,
    loading,
}: Props) {
    const [activeRow, setActiveRow] = useState<number>();
    const [geöffneteZeilen, setGeöffneteZeilen] = useState<number[]>([]);
    const [selectedTour, setSelectedTour] = useState<Tour>();
    const [driverIdsImOnly, setDriverIdsImOnly] = useState<number[]>([]);

    const rowHeight = 36;
    const maxHeight = rowHeight * pageSize; // + 60;

    useEffect(() => {
        const init = async () => {
            if (driversSp && driversIm) {
                const newDriversImOnly = driversIm.filter((id) => !driversSp.includes(id));
                setDriverIdsImOnly(newDriversImOnly);
                console.log("set newDriversImOnly", newDriversImOnly);
            }
        };

        init();
    }, [driversSp, driversIm]);

    const toggleRow = (index: number) => {
        setGeöffneteZeilen((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
    };

    function getDriverA(f: Tour) {
        return fahrerListe.find((item) => item.id === f.fahrerA_id);
    }

    function getDriverB(f: Tour) {
        return fahrerListe.find((item) => item.id === f.fahrerB_id);
    }

    function isSameAttendanceSp(attendanceA: number[], attendanceB: number[]) {
        const filter = (arr: number[]) => arr.filter((id) => driversSp.includes(id)).sort();
        const a = filter(attendanceA);
        const b = filter(attendanceB);
        return a.length > 1 && JSON.stringify(a) === JSON.stringify(b);
    }

    function isSameAttendanceIm(
        fahrerA_id: number,
        attendanceA: number[],
        fahrerA_id_B: number,
        attendanceB: number[],
    ) {
        const filter = (arr: number[]) => arr.filter((id) => id === fahrerA_id || driverIdsImOnly.includes(id)).sort();
        const a = filter(attendanceA);
        const b = filter(attendanceB);
        return (
            a.length > 1 &&
            fahrerA_id &&
            fahrerA_id === fahrerA_id_B &&
            a.includes(fahrerA_id) &&
            JSON.stringify(a) === JSON.stringify(b)
        );
    }

    function attendanceClass(tourA: Tour, tourB: Tour) {
        if (!tourA || !tourB) {
            return "";
        }

        const sameAttendanceSp = isSameAttendanceSp(tourA?.anwesend_ids, tourB?.anwesend_ids);
        const sameAttendanceIm = isSameAttendanceIm(
            tourA?.fahrerA_id,
            tourA?.anwesend_ids,
            tourB?.fahrerA_id,
            tourB?.anwesend_ids,
        );

        if (sameAttendanceSp && sameAttendanceIm) {
            return styles.sameTourImSp;
        } else if (sameAttendanceSp) {
            return styles.sameTourSp;
        } else if (sameAttendanceIm) {
            return styles.sameTourIm;
        } else {
            return "";
        }
    }

    function eqArraySet(a: number[], b: number[]): boolean {
        if (a.length !== b.length) return false;
        const setA = new Set(a);
        const setB = new Set(b);
        for (const val of setA) {
            if (!setB.has(val)) return false;
        }
        return true;
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-4">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Lädt...</span>
                </div>
            </div>
        );
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
                                type="button"
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
                        {fahrerListe.map((fahrer) => (
                            <th title={fahrer.label} key={fahrer.name} className="d-sm-table-cell">
                                {fahrer.name}
                            </th>
                        ))}
                        <th className={styles.hideOnMobile}>Fahrer</th>
                        <th className={styles.deleteButton}></th>
                    </tr>
                </thead>

                <tbody>
                    {[...daten]
                        .slice(-visibleRows)
                        .reverse()
                        .map((tour, i) => {
                            const zeileIstOffen = geöffneteZeilen.includes(i);
                            const anwesenheitszellen = fahrerListe.map((driver) => (
                                <td
                                    key={driver.id}
                                    className={
                                        tour.fahrerA_id === driver.id
                                            ? "table-warning"
                                            : tour.fahrerB_id === driver.id
                                              ? "table-primary"
                                              : ""
                                    }
                                >
                                    {tour?.anwesend_ids.includes(driver.id) ? "✓" : ""}
                                </td>
                            ));

                            return (
                                // The open-row state in geoeffneteZeilen is keyed by index too, and tour.id is
                                // optional - a row that was just inserted has none. Giving rows a stable identity
                                // means changing that state, not just this key.
                                // biome-ignore lint/suspicious/noArrayIndexKey: row identity is the index here
                                <React.Fragment key={i}>
                                    <tr
                                        className={
                                            "clickable-row " +
                                            attendanceClass(tour, selectedTour) +
                                            " " +
                                            (activeRow === i ? "table-active" : "")
                                        }
                                        onClick={() => {
                                            toggleRow(i);
                                            setActiveRow(i);
                                            setSelectedTour(tour);
                                        }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>
                                            {new Date(tour.datum || "").toLocaleDateString("de-DE", {
                                                weekday: "short",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "2-digit",
                                            })}
                                        </td>
                                        {anwesenheitszellen}
                                        <td className={styles.hideOnMobile}>
                                            {getDriverA(tour)?.label} → {getDriverB(tour)?.label}
                                        </td>
                                        <td className="text-end">
                                            <button
                                                type="button"
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
                                                <strong>Fahrer:</strong> {getDriverA(tour)?.label} →{" "}
                                                {getDriverB(tour)?.label}
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
