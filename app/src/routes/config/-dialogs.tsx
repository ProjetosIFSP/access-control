import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfigDialogsProps {
	isAddControllerOpen: boolean;
	onAddControllerChange: (open: boolean) => void;
}

export function ConfigDialogs({
	isAddControllerOpen,
	onAddControllerChange,
}: ConfigDialogsProps) {
	return (
		<Dialog open={isAddControllerOpen} onOpenChange={onAddControllerChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Configurar Controlador</DialogTitle>
					<DialogDescription>
						Instruções para configurar um controlador novo ou perdido:
					</DialogDescription>
				</DialogHeader>

				<div className="pl-4 font-medium  border-l-2 border-primary/50 text-xs italic text-muted-foreground">
					Para o controlador ser configurado, o firmware deve ser previamente
					instalado.
				</div>

				<ol className="list-decimal pl-4 space-y-2 mt-4 text-sm text-muted-foreground">
					<li>
						Ligue o Controlador NFC à uma fonte de energia (ou pressione Reset).
					</li>
					<li>
						No seu celular ou notebook, vá até as redes Wi-Fi e conecte-se à
						rede:{" "}
						<strong className="text-foreground">
							access-control-setup
						</strong>{" "}
					</li>
					<li>
						A tela de portal abrirá sozinha. Caso isso não ocorra, navegue para:{" "}
						<a
							href="http://192.168.4.1"
							target="_blank"
							className="text-primary font-bold hover:underline inline-flex items-center gap-1"
							rel="noopener noreferrer"
						>
							192.168.4.1
						</a>
					</li>
					<li>
						Preencha sua rede Wi-Fi, o IP do servidor MQTT, Device Secret e Room
						ID (vazio se quiser pareamento).
					</li>
					<li>
						Salve. O controlador reiniciará conectado na sua rede e aparecerá na
						listagem!
					</li>
				</ol>
			</DialogContent>
		</Dialog>
	);
}
