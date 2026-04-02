import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import { SplitView, SplitViewMain } from "@/components/ui/split-view";
import { controllersQueryOptions } from "@/services/iot";
import { configSearchParams } from "./-types";
import { ConfigHeader } from "./-header";
import { ConfigTabs } from "./-tabs";
import { ConfigToolbar } from "./-toolbar";
import { ConfigDialogs } from "./-dialogs";
import { TabControllers } from "./-tab-controllers";
import { TabCredentials } from "./-tab-credentials";

export const Route = createFileRoute("/config/")({
	beforeLoad: () => {
		if (typeof document === "undefined") return;
	},
	loader: ({ context }) => {
		if (typeof document === "undefined") return Promise.resolve();
		return context.queryClient.ensureQueryData(controllersQueryOptions);
	},
	component: ConfigManagePage,
});

function ConfigManagePage() {
	const { data } = useSuspenseQuery(controllersQueryOptions);
	const [params, setParams] = useQueryStates(configSearchParams, {
		history: "replace",
		shallow: false,
		clearOnDefault: true,
	});

	const activeTab = params.tab;
	const [searchQuery, setSearchQuery] = useState("");
	const [isAddControllerOpen, setIsAddControllerOpen] = useState(false);

	const filteredControllers = (data?.controllers ?? []).filter(
		(c) =>
			c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(c.roomId?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()),
	);

	return (
		<>
			<main className="flex w-full flex-1 flex-col overflow-hidden px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8">
				<SplitView open={false} onOpenChange={() => {}}>
					<SplitViewMain>
						<div className="flex flex-col gap-6">
							<ConfigHeader />

							<ConfigTabs
								activeTab={activeTab}
								onTabChange={(tab) => setParams({ tab })}
								controllersCount={data?.controllers?.length ?? 0}
							/>

							<ConfigToolbar
								activeTab={activeTab}
								searchValue={searchQuery}
								onSearchChange={setSearchQuery}
								onAddController={() => setIsAddControllerOpen(true)}
							/>

							<div className="flex-1 overflow-auto rounded-lg">
								{activeTab === "controllers" && (
									<TabControllers controllers={filteredControllers} />
								)}
								{activeTab === "credentials" && <TabCredentials />}
							</div>
						</div>
					</SplitViewMain>
				</SplitView>
			</main>

			<ConfigDialogs
				isAddControllerOpen={isAddControllerOpen}
				onAddControllerChange={setIsAddControllerOpen}
			/>
		</>
	);
}
