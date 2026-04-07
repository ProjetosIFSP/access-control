import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
	const [roomId, setRoomId] = useState("");
	const [sensorProtocol, setSensorProtocol] = useState("");
	const [sensorModel, setSensorModel] = useState("");
	const [firmwareVersion, setFirmwareVersion] = useState("");

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
			<FormField label="Room ID (Vinculado)" htmlFor="roomId">
				<Input
					id="roomId"
					value={roomId}
					onChange={(e) => setRoomId(e.target.value)}
					placeholder="ID da sala vinculada"
				/>
			</FormField>

			<FormField label="Protocolo do Sensor" htmlFor="sensorProtocol">
				<Input
					id="sensorProtocol"
					value={sensorProtocol}
					onChange={(e) => setSensorProtocol(e.target.value)}
					placeholder="Ex: zw111_basic"
				/>
			</FormField>

			<FormField label="Modelo do Sensor" htmlFor="sensorModel">
				<Input
					id="sensorModel"
					value={sensorModel}
					onChange={(e) => setSensorModel(e.target.value)}
					placeholder="Ex: WA26"
				/>
			</FormField>

			<FormField label="Versão do Firmware" htmlFor="firmwareVersion">
				<Input
					id="firmwareVersion"
					value={firmwareVersion}
					onChange={(e) => setFirmwareVersion(e.target.value)}
					placeholder="Ex: 1.0.0"
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
