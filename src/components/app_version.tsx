import {useEffect, useState} from "react";

type VersionInfo = {
    version: string;
    tag: string;
    commit: string;
};

type Props = {
    className?: string;
};

export default function AppVersion({ className = "" }: Props) {
    const [info, setInfo] = useState<VersionInfo | null>(null);

    useEffect(() => {
        fetch("/version.json")
            .then((res) => res.json())
            .then(setInfo)
            .catch(() => null);
    }, []);

    if (!info) return null;

    return (
        <span
            className={className}
            title={`Tag: ${info.tag} | Commit: ${info.commit}`}
            style={{cursor: "help"}}
        >
      {info.version}
    </span>
    );
}
