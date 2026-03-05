import type { Preview } from "@storybook/react";
import "../src/styles.css";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		viewport: {
			defaultViewport: "desktop",
			viewports: {
				mobile: {
					name: "Mobile",
					styles: { width: "390px", height: "844px" },
				},
				tablet: {
					name: "Tablet",
					styles: { width: "768px", height: "1024px" },
				},
				desktop: {
					name: "Desktop",
					styles: { width: "1280px", height: "800px" },
				},
			},
		},
		backgrounds: {
			default: "light",
			values: [
				{ name: "light", value: "#ffffff" },
				{ name: "dark", value: "#09090b" },
				{ name: "muted", value: "#f4f4f5" },
			],
		},
	},
};

export default preview;
