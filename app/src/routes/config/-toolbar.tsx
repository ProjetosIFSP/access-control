import { Loader2, Plus, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchToolbar } from "@/components/ui/search-toolbar";
import { SelectFilter } from "@/components/ui/select-filter";

import type { MqttNfcReaderStatus } from "@/hooks/use-mqtt-nfc-reader";
import type { RoomControllerTarget } from "@/services/doors";
import type { ConfigActiveTab } from "./-types";

interface ConfigToolbarProps {
	activeTab: ConfigActiveTab;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onAddController: () => void;
	doorControllers: RoomControllerTarget[];
	selectedControllerId: string;
	onSelectedControllerChange: (id: string) => void;
	nfcStatus: MqttNfcReaderStatus;
	onStartCapture: () => void;
	onCancelCapture: () => void;
}

export function ConfigToolbar({
	activeTab,
	searchValue,
	onSearchChange,
	onAddController,
	doorControllers,
	selectedControllerId,
	onSelectedControllerChange,
	nfcStatus,
	onStartCapture,
	onCancelCapture,
}: ConfigToolbarProps) {
	const selectOptions = [
		{ value: "none", label: "Nenhum leitor online" },
		...doorControllers.map((c) => ({
			value: c.controllerId,
			label: c.roomName,
		})),
	];

	return (
		<div className="flex items-center justify-between gap-3 w-full">
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<SearchToolbar
					value={searchValue}
					onChange={onSearchChange}
					placeholder={
						activeTab === "controllers"
							? "Buscar controlador"
							: "Buscar por UID ou usuário..."
					}
				/>

				{activeTab === "credentials" && (
					<FilterBar
						activeCount={selectedControllerId !== "none" ? 1 : 0}
						panelOpen={false}
					>
						<SelectFilter
							value={selectedControllerId}
							onValueChange={onSelectedControllerChange}
							placeholder="Leitor NFC"
							options={selectOptions}
						/>
					</FilterBar>
				)}
			</div>

			<div className="shrink-0">
				{activeTab === "controllers" ? (
					<Button
						variant="hover"
						size="sm"
						onClick={onAddController}
						className="max-sm:px-2 max-sm:w-9 max-sm:h-9"
					>
						<Plus className="size-4" />
						<span className="hidden sm:inline">Configurar Controlador</span>
					</Button>
				) : (
					<Button
						variant="hover"
						size="sm"
						onClick={
							nfcStatus === "waiting" || nfcStatus === "connecting"
								? onCancelCapture
								: onStartCapture
						}
						className="max-sm:px-2 max-sm:w-9 max-sm:h-9"
					>
						{nfcStatus === "connecting" || nfcStatus === "waiting" ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<ScanLine className="size-4" />
						)}
						<span className="hidden sm:inline">
							{nfcStatus === "connecting"
								? "Conectando..."
								: nfcStatus === "waiting"
									? "Aguardando..."
									: "Ler Tag NFC"}
						</span>
					</Button>
				)}
			</div>
		</div>
	);
}
