import { type UseMutationResult, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { roomsAdminQueryOptions } from "@/services/rooms";
import type { IotController } from "./-types";

interface ConfigControllerFormProps {
	controller: IotController | null;
	mutation: UseMutationResult<
		unknown,
		Error,
		{ controllerId: string; data: Record<string, string | undefined> }
	>;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ConfigControllerForm({
	controller,
	mutation,
	onSuccess,
	onCancel,
}: ConfigControllerFormProps) {
	const { data: roomsData } = useQuery(
		roomsAdminQueryOptions({ pageSize: 100 }),
	);

	const [roomId, setRoomId] = useState(controller?.roomId ?? "");
	const [sensorProtocol, setSensorProtocol] = useState(controller?.sensorProtocol ?? "");
	const [sensorModel, setSensorModel] = useState(controller?.sensorModel ?? "");
	const [firmwareVersion, setFirmwareVersion] = useState(controller?.firmwareVersion ?? "");

	useEffect(() => {
		if (controller) {
			setRoomId(controller.roomId ?? "");
			setSensorProtocol(controller.sensorProtocol ?? "");
			setSensorModel(controller.sensorModel ?? "");
			setFirmwareVersion(controller.firmwareVersion ?? "");
		}
	}, [controller]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!controller) return;

		mutation.mutate(
			{
				controllerId: controller.id,
				data: {
					roomId: roomId.trim() || undefined,
					sensorProtocol: sensorProtocol.trim() || undefined,
					sensorModel: sensorModel.trim() || undefined,
					firmwareVersion: firmwareVersion.trim() || undefined,
				},
			},
			{
				onSuccess: () => {
					if (onSuccess) onSuccess();
				},
			},
		);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormField label="Sala (Vinculada)" htmlFor="roomId">
				<Select
					value={roomId || "unassigned"}
					onValueChange={(val) => setRoomId(val === "unassigned" ? "" : val)}
				>
					<SelectTrigger
						id="roomId"
						className="w-full rounded-full shadow-xs border-px bg-white"
					>
						<SelectValue placeholder="Selecione uma sala">
							{roomId && roomId !== "unassigned"
								? roomsData?.result?.find((r) => r.id === roomId)?.name ||
									"Carregando..."
								: "Sem vínculo"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="unassigned">Sem vínculo</SelectItem>
						{roomsData?.result?.map((room) => (
							<SelectItem key={room.id} value={room.id}>
								{room.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			<FormField label="Protocolo do Sensor" htmlFor="sensorProtocol">
				<Input
					id="sensorProtocol"
					value={sensorProtocol}
					onChange={(e) => setSensorProtocol(e.target.value)}
					placeholder="Ex: zw111_basic"
					className="bg-white"
				/>
			</FormField>

			<FormField label="Modelo do Sensor" htmlFor="sensorModel">
				<Input
					id="sensorModel"
					value={sensorModel}
					onChange={(e) => setSensorModel(e.target.value)}
					placeholder="Ex: WA26"
					className="bg-white"
				/>
			</FormField>

			<FormField label="Versão do Firmware" htmlFor="firmwareVersion">
				<Input
					id="firmwareVersion"
					value={firmwareVersion}
					onChange={(e) => setFirmwareVersion(e.target.value)}
					placeholder="Ex: 1.0.0"
					className="bg-white"
				/>
			</FormField>

			<div className="flex justify-end gap-2 pt-4">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
				)}
				<Button type="submit" disabled={mutation.isPending}>
					{mutation.isPending ? "Salvando..." : "Salvar"}
				</Button>
			</div>
		</form>
	);
}
