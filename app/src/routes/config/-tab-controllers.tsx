import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { roomsAdminQueryOptions } from "@/services/rooms";
import type { IotController } from "./-types";

interface TabControllersProps {
	controllers: IotController[];
	onEdit: (controller: IotController) => void;
	onDelete: (controller: IotController) => void;
}

export function TabControllers({
	controllers,
	onEdit,
	onDelete,
}: TabControllersProps) {
	const { data: roomsData } = useQuery(roomsAdminQueryOptions({ pageSize: 100 }));
	
	const roomsMap = useMemo(() => {
		const map = new Map<string, string>();
		roomsData?.result.forEach(r => map.set(r.id, r.name));
		return map;
	}, [roomsData]);

	return (
		<div className="rounded-lg border bg-white dark:bg-zinc-950 dark:border-zinc-800">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent border-zinc-200 dark:border-zinc-800">
						<TableHead className="w-[100px]">Status</TableHead>
						<TableHead>Controller ID</TableHead>
						<TableHead>Sala (Vinculada)</TableHead>
						<TableHead>Firmware / Sensor</TableHead>
						<TableHead className="text-right">Última vez visto</TableHead>
						<TableHead className="w-[100px] text-right">Ações</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{controllers.length > 0 ? (
						controllers.map((controller) => (
							<TableRow
								key={controller.id}
								className="border-zinc-200 dark:border-zinc-800"
							>
								<TableCell>
									<div className="flex items-center gap-2">
										<div
											className={`h-2.5 w-2.5 rounded-full ${
												controller.isOnline
													? "bg-emerald-500"
													: "bg-zinc-300 dark:bg-zinc-600"
											}`}
											title={controller.isOnline ? "Online" : "Offline"}
										/>
										<span className="text-sm text-zinc-500">
											{controller.isOnline ? "On" : "Off"}
										</span>
									</div>
								</TableCell>
								<TableCell className="font-mono text-sm">
									{controller.id}
								</TableCell>
								<TableCell>
									{controller.roomId ? (
										<Badge variant="outline" className="font-mono">
											{roomsMap.get(controller.roomId) || controller.roomId}
										</Badge>
									) : (
										<span className="text-sm text-zinc-500">Não vinculado</span>
									)}
								</TableCell>
								<TableCell className="text-sm text-zinc-500 whitespace-nowrap">
									V: {controller.firmwareVersion || "N/A"} <br />
									{controller.sensorModel || "ND"}
								</TableCell>
								<TableCell className="text-right text-sm text-zinc-500">
									{new Date(controller.lastSeenAt).toLocaleString()}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button
											variant="ghost"
											size="icon-xs"
											onClick={(e) => {
												e.stopPropagation();
												onEdit(controller);
											}}
										>
											<Edit2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon-xs"
											className="text-red-500 hover:text-red-600"
											onClick={(e) => {
												e.stopPropagation();
												onDelete(controller);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={6} className="h-24 text-center text-zinc-500">
								Nenhum controlador encontrado.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
