import { useState } from "react";
import { Button } from "react-bootstrap";

export default function InviteLink({ token, email }: { token: string; email?: string }) {
    const [copied, setCopied] = useState(false);

    const params = new URLSearchParams({ token });
    if (email) params.set("email", email);

    const url = `${window.location.origin}/register?${params.toString()}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="d-flex align-items-center">
            <code className="me-2">{url}</code>
            <Button size="sm" variant="outline-secondary" onClick={copyToClipboard}>
                {copied ? "✅ Kopiert!" : "🔗 Kopieren"}
            </Button>
        </div>
    );
}
