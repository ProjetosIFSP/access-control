const fs = require('fs');
const path = '../app/src/components/users/fingerprint-tab.tsx';
const content = fs.readFileSync(path, 'utf8');

// The new render function body:
const newRender = `
        const leftCount = countRegisteredInSet(FINGERS_LEFT, fingerprints);
        const rightCount = countRegisteredInSet(FINGERS_RIGHT, fingerprints);

        const TABS = [
                { key: "left" as const, label: "Mão Esquerda", count: leftCount },
                { key: "right" as const, label: "Mão Direita", count: rightCount },
        ];

        return (
<div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <nav className="flex items-center gap-6 border-b border-border/40">
                    {TABS.map(({ key, label, count }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => handleTabChange(key)}
                            className={cn(
                                "relative pb-3 text-sm font-semibold transition-colors flex items-center gap-2",
                                activeTab === key
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {label}
                            {count > 0 && (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-black rounded-full",
                                        activeTab === key
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                            {activeTab === key && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="flex flex-col items-center flex-1 max-h-[400px]">
                    <Hand
                        side={activeTab}
                        fingerprints={fingerprints}
                        selectedFinger={selectedFinger}
                        interactive={true}
                        onFingerClick={handleFingerClick}
                        className="w-full h-full max-w-[280px] text-zinc-900 dark:text-zinc-50"
                    />
                </div>

                <div className="mt-auto px-1 flex-shrink-0">
                    <FingerprintCaptureFeedback
                        status={reader.status}
                        countdown={reader.countdown}
                        lastTemplate={reader.lastTemplate}
                        errorMessage={reader.errorMessage}
                        onConnect={reader.connect}
                        onDisconnect={reader.disconnect}
                        onRetry={reader.reset}
                        userName={userName}
                    />
                </div>
            </div>
);
}
`;

// Replace everything from `const leftCount = countRegisteredInSet` up to the end of the file.
const replacementPoint = content.indexOf('const leftCount = countRegisteredInSet');
if (replacementPoint !== -1) {
    const newContent = content.substring(0, replacementPoint) + newRender;
    fs.writeFileSync(path, newContent, 'utf8');
} else {
    console.error('Could not find injection point');
}
