import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "bootstrap/dist/css/bootstrap.min.css";

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        // Nur im Produktionsbuild registrieren: im Entwicklungsmodus wuerde der
        // Cache fuer /_next/static mit dem Hot Reload kollidieren.
        if (process.env.NODE_ENV !== "production") return;
        if (!("serviceWorker" in navigator)) return;

        const registrieren = () => {
            navigator.serviceWorker
                .register("/sw.js")
                .catch((fehler) => console.warn("Service Worker nicht registriert", fehler));
        };

        // Erst nach dem Laden, damit die Registrierung nicht mit den
        // Ressourcen der Seite um Bandbreite konkurriert.
        if (document.readyState === "complete") {
            registrieren();
        } else {
            window.addEventListener("load", registrieren);
            return () => window.removeEventListener("load", registrieren);
        }
    }, []);

    return (
        <>
            <Component {...pageProps} />
            <Analytics />
            <SpeedInsights />
        </>
    );
}
