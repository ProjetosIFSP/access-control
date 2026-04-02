import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { IotController } from "./-types";

interface TabControllersProps {
	controllers: IotController[];
}

export function TabControllers({ controllers }: TabControllersProps) {
	return (
		<div className="rounded-lg border bg-white dark:bg-zinc-950 dark:border-zinc-800">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent border-zinc-200 dark:border-zinc-800">
						<TableHead className="w-[100px]">Status</TableHead>
						<TableHead>Controller ID</TableHead>
						<TableHead>Room ID (Vinculado)</TableHead>
						<TableHead>Firmware / Sensor</TableHead>
						<TableHead className="text-right">Última vez visto</TableHead>
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
											{controller.roomId}
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
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={5} className="h-24 text-center text-zinc-500">
								Nenhum controlador encontrado.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
