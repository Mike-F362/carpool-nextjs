type Props = {
    className?: string;
};

export default function AppVersion({ className = "" }: Props) {
    const version = process.env.NEXT_PUBLIC_APP_VERSION;
    const gitTag = process.env.NEXT_PUBLIC_GIT_TAG;
    const commit = process.env.NEXT_PUBLIC_COMMIT_HASH;

    if (!version) return null;

    const tooltip = `${gitTag ? `Tag: ${gitTag}\n` : ""}${commit ? `Commit: ${commit}` : ""}`;

    return (
        <span className={className} title={tooltip} style={{ whiteSpace: "nowrap", cursor: "help" }}>
            {version}
        </span>
    );
}
