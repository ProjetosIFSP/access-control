import {
	CircleCheckIcon,
	CircleXIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			// theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4 text-primary" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4 text-amber-400" />,
				error: <CircleXIcon className="size-4 text-destructive" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--background)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "transparent",
					"--border-radius": "var(--radius)",
					"--error-bg": "var(--background)",
					"--error-text": "var(--foreground)",
					"--error-border": "var(--border)",
					"--success-bg": "var(--background)",
					"--success-text": "var(--foreground)",
					"--success-border": "var(--border)",
					"--warning-bg": "var(--background)",
					"--warning-text": "var(--foreground)",
					"--warning-border": "var(--border)",
					"--info-bg": "var(--background)",
					"--info-text": "var(--foreground)",
					"--info-border": "var(--border)",
					"--loading-bg": "var(--background)",
					"--loading-text": "var(--foreground)",
					"--loading-border": "var(--border)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					// icon: "text-destructive!",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
