import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ScrollText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CrudPageHeader } from "#/components/ui/crud-page-header";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import type { GetLogs200ItemsItem, GetLogsStatus } from "@/lib/api/schemas";
import { logsQueryOptions } from "@/services/logs";

const logsSearchSchema = z.object({
	q: z.string().optional(),
	roomId: z.string().optional(),
	userId: z.string().optional(),
	status: z.enum(["GRANTED", "DENIED", "all"]).optional(),
	page: z.number().optional().catch(1),
});

export const Route = createFileRoute("/logs/")({
	validateSearch: logsSearchSchema,
	component: LogsPage,
});

type SearchType = ReturnType<typeof Route.useSearch>;

function LogsPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { q, roomId, userId, status, page = 1 } = search;
	const pageSize = 20;

	const [inputValue, setInputValue] = useState(q ?? "");
	const debouncedQ = useDebounce(inputValue, 500);

	useEffect(() => {
		navigate({
			search: (prev: SearchType) => ({
				...prev,
				q: debouncedQ || undefined,
				page: 1,
			}),
			replace: true,
		});
	}, [debouncedQ, navigate]);

	const handleStatusChange = (val: string) => {
		navigate({
			search: (prev: SearchType) => ({
				...prev,
				status: (val === "all" ? undefined : val) as
					| "GRANTED"
					| "DENIED"
					| undefined,
				page: 1,
			}),
		});
	};

	const { data, isLoading } = useQuery(
		logsQueryOptions({
			page,
			pageSize,
			roomId,
			userId,
			status: (status === "all" ? undefined : status) as GetLogsStatus,
			q,
		}),
	);

	return (
		<div className="flex flex-col gap-6 h-full w-full  px-4 sm:px-8 md:px-16 lg:px-32 transition-all py-8 mx-auto">
			<CrudPageHeader
				title="Logs de Acesso"
				subtitle="Acompanhe o histórico de acessos às salas do sistema."
			/>

			<div className="flex flex-wrap items-center gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
					<Input
						placeholder="Buscar por usuário ou sala..."
						className="pl-9 bg-white"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
					/>
				</div>
				<Select value={status ?? "all"} onValueChange={handleStatusChange}>
					<SelectTrigger className="w-45 bg-white rounded-full">
						<SelectValue placeholder="Status do acesso" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos os acessos</SelectItem>
						<SelectItem value="GRANTED">Permitido</SelectItem>
						<SelectItem value="DENIED">Negado</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{isLoading ? (
				<TableSkeleton rows={10} />
			) : !data || data.items.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ScrollText className="size-6" />
						</EmptyMedia>
						<EmptyTitle>Nenhum log encontrado</EmptyTitle>
						<EmptyDescription>
							Não há nenhum registro de acesso correspondente aos filtros
							atuais.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<div className="rounded-md border border-zinc-200 dark:border-zinc-800">
						<div className="relative w-full overflow-auto">
							<table className="w-full caption-bottom text-sm">
								<thead className="[&_tr]:border-b border-zinc-200 dark:border-zinc-800">
									<tr className="border-b transition-colors hover:bg-zinc-100/50 data-[state=selected]:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:data-[state=selected]:bg-zinc-800 text-left">
										<th className="h-12 px-4 align-middle font-medium text-zinc-500">
											Data/Hora
										</th>
										<th className="h-12 px-4 align-middle font-medium text-zinc-500">
											Status
										</th>
										<th className="h-12 px-4 align-middle font-medium text-zinc-500">
											Sala
										</th>
										<th className="h-12 px-4 align-middle font-medium text-zinc-500">
											Usuário
										</th>
										<th className="h-12 px-4 align-middle font-medium text-zinc-500">
											Motivo
										</th>
									</tr>
								</thead>
								<tbody className="[&_tr:last-child]:border-0">
									{data?.items.map((log: GetLogs200ItemsItem) => (
										<tr
											key={log.id}
											className="border-b transition-colors hover:bg-zinc-100/50 data-[state=selected]:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:data-[state=selected]:bg-zinc-800"
										>
											<td className="p-4 align-middle whitespace-nowrap">
												{dayjs(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
											</td>
											<td className="p-4 align-middle">
												<span
													className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
														log.status === "GRANTED"
															? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
															: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
													}`}
												>
													{log.status === "GRANTED" ? "Permitido" : "Negado"}
												</span>
											</td>
											<td className="p-4 align-middle">
												{log.roomName} ({log.blockName})
											</td>
											<td className="p-4 align-middle">
												{log.userName || "Desconhecido"} <br />
												<span className="text-xs text-zinc-500">
													{log.userEmail || "Sem email"}
												</span>
											</td>
											<td className="p-4 align-middle text-zinc-500">
												{log.reason || "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex items-center justify-between px-2">
						<div className="text-sm text-zinc-500">
							Total de logs: {data?.total || 0}
						</div>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() =>
									navigate({
										search: (prev: SearchType) => ({
											...prev,
											page: Math.max(1, page - 1),
										}),
									})
								}
								disabled={page === 1}
								className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
							>
								Anterior
							</button>
							<span className="flex items-center px-4 text-sm">
								Página {page} de {data?.totalPages || 1}
							</span>
							<button
								type="button"
								onClick={() =>
									navigate({
										search: (prev: SearchType) => ({
											...prev,
											page: Math.min(data?.totalPages || 1, page + 1),
										}),
									})
								}
								disabled={!data || page >= (data.totalPages || 1)}
								className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
							>
								Próxima
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
