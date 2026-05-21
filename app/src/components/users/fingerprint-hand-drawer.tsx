import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChevronDown,
	Loader2,
	RadioTower,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import type { FingerContextAction } from "@/assets/vectors/hand";
import { Hand } from "@/assets/vectors/hand";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEnrollmentStream } from "@/hooks/use-enrollment-stream";
import { useFingerprintReader } from "@/hooks/use-fingerprint-reader";
import {
	countRegisteredInSet,
	FINGER_LABELS,
	FINGERS_LEFT,
	FINGERS_RIGHT,
	type FingerKey,
} from "@/lib/biometrics";
import { cn } from "@/lib/utils";
import { pairingDevicesQueryOptions } from "@/services/devices/pairing";
import {
	deleteFingerprint,
	fingerprintQueryKeys,
	registerFingerprint,
	requestFingerprintEnrollment,
	userFingerprintsQueryOptions,
} from "@/services/users/fingerprints";
import { userNfcTagsQueryOptions } from "@/services/users/nfc-tags";
import { NfcTab } from "./nfc-tab";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FingerprintHandDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	userName: string;
}

type ActiveHandTab = "left" | "right" | "nfc";

// ── Constants ─────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.65, 0.01, 0.05, 0.99];
const EASE_CLOSE: [number, number, number, number] = [0.65, 0.05, 0, 1];

// ── Device Selector ───────────────────────────────────────────────────────────
// Shared between biometry and NFC tabs

interface DeviceSelectorProps {
	selectedDevice: string | null;
	onSelectDevice: (id: string | null) => void;
}

function DeviceSelector({
	selectedDevice,
	onSelectDevice,
}: DeviceSelectorProps) {
	const devicesQuery = useQuery(pairingDevicesQueryOptions);
	const pairingDevices = devicesQuery.data ?? [];

	// Auto-select first device when list arrives
	useEffect(() => {
		if (pairingDevices.length > 0 && !selectedDevice) {
			onSelectDevice(pairingDevices[0].id);
		}
		if (pairingDevices.length === 0 && selectedDevice) {
			onSelectDevice(null);
		}
	}, [pairingDevices, selectedDevice, onSelectDevice]);

	return (
		<div className="px-6 pb-2 flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
					<RadioTower className="h-3.5 w-3.5" />
					Dispositivo Leitor
				</div>
				{devicesQuery.isLoading ? (
					<Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
				) : (
					<span
						className={cn(
							"text-[11px] font-medium flex items-center gap-1",
							pairingDevices.length > 0
								? "text-emerald-600 dark:text-emerald-400"
								: "text-zinc-400",
						)}
					>
						{pairingDevices.length > 0 ? (
							<>
								<Wifi className="h-3 w-3" />
								{pairingDevices.length}{" "}
								{pairingDevices.length === 1 ? "online" : "online"}
							</>
						) : (
							<>
								<WifiOff className="h-3 w-3" />
								Nenhum online
							</>
						)}
					</span>
				)}
			</div>

			{pairingDevices.length > 0 ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							className="w-full justify-between font-mono text-xs h-9 bg-white dark:bg-zinc-900"
						>
							<span className="flex items-center gap-2 truncate">
								<span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
								<span className="truncate">
									{selectedDevice ?? "Selecionar dispositivo"}
								</span>
							</span>
							<ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0 ml-1" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-full min-w-64">
						{pairingDevices.map((device) => (
							<DropdownMenuItem
								key={device.id}
								onSelect={() => onSelectDevice(device.id)}
								className="flex items-center gap-2 font-mono text-xs cursor-pointer"
							>
								<span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
								<div className="flex flex-col">
									<span>{device.id}</span>
									{device.sensorModel && (
										<span className="text-muted-foreground font-sans text-[11px]">
											{device.sensorModel}
										</span>
									)}
								</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">
					Nenhum leitor físico em modo de pareamento detectado — usando leitor
					USB ou manual.
				</p>
			)}
		</div>
	);
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

export function FingerprintHandDrawer({
	open,
	onOpenChange,
	userId,
	userName,
}: FingerprintHandDrawerProps) {
	const queryClient = useQueryClient();

	// ── Local state ─────────────────────────────────────────────────────────────
	const [activeTab, setActiveTab] = useState<ActiveHandTab>("left");
	const [selectedFinger, setSelectedFinger] = useState<FingerKey | null>(null);
	const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

	// Delete confirmation state
	const [deleteTarget, setDeleteTarget] = useState<{
		finger: FingerKey;
		credentialId: string;
	} | null>(null);

	// ── Reader hook ─────────────────────────────────────────────────────────────
	const reader = useFingerprintReader({ mode: "keyboard" });

	// ── Fetch data ──────────────────────────────────────────────────────────────
	const { data: nfcTags = [] } = useQuery({
		...userNfcTagsQueryOptions(open ? userId : null),
	});

	const { data: fingerprints = [], isLoading: isLoadingFingerprints } =
		useQuery({
			...userFingerprintsQueryOptions(open ? userId : null),
		});

	// ── Register mutation ───────────────────────────────────────────────────────
	const registerMutation = useMutation({
		mutationFn: registerFingerprint,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: fingerprintQueryKeys.list(userId),
			});
			setSelectedFinger(null);
			reader.reset();
		},
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Erro ao cadastrar a digital",
			);
		},
	});

	// ── Enrollment stream (real-time feedback from physical device) ──────────
	const enrollment = useEnrollmentStream({ controllerId: selectedDevice });

	const enrollMutation = useMutation({
		mutationFn: requestFingerprintEnrollment,
		onError: (err) => {
			setSelectedFinger(null);
			enrollment.reset();
			toast.error(
				err instanceof Error
					? err.message
					: "Erro ao iniciar o cadastro biométrico",
			);
		},
	});
	const registerMutate = registerMutation.mutate;
	const registerIsPending = registerMutation.isPending;
	const enrollMutate = enrollMutation.mutate;
	const enrollIsPending = enrollMutation.isPending;

	// ── Delete mutation ─────────────────────────────────────────────────────────
	const deleteMutation = useMutation({
		mutationFn: deleteFingerprint,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: fingerprintQueryKeys.list(userId),
			});
			toast.success("Digital removida com sucesso.");
			setDeleteTarget(null);
		},
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Erro ao remover a digital",
			);
			setDeleteTarget(null);
		},
	});

	// Track previous step to detect ENROLLED transition
	const prevStepRef = useRef(enrollment.step);
	useEffect(() => {
		const prev = prevStepRef.current;
		prevStepRef.current = enrollment.step;

		if (enrollment.step === "ENROLLED" && prev !== "ENROLLED") {
			// Auto-refresh finger list and reset UI after brief delay
			queryClient.invalidateQueries({
				queryKey: fingerprintQueryKeys.list(userId),
			});
			toast.success("Digital cadastrada com sucesso!");
			setTimeout(() => {
				setSelectedFinger(null);
				enrollment.reset();
			}, 2000);
		}

		if (enrollment.step === "FAILED" && prev !== "FAILED") {
			toast.error("Falha no cadastro biométrico. Tente novamente.");
			setTimeout(() => {
				setSelectedFinger(null);
				enrollment.reset();
			}, 3000);
		}

		if (enrollment.step === "EXPIRED" && prev !== "EXPIRED") {
			toast.error("Tempo esgotado para o cadastro biométrico.");
			setTimeout(() => {
				setSelectedFinger(null);
				enrollment.reset();
			}, 3000);
		}
	}, [enrollment.step, enrollment.reset, queryClient, userId]);

	// ── React to reader status changes ───────────────────────────────────────────
	useEffect(() => {
		if (reader.status === "error") {
			setSelectedFinger(null);
			reader.reset();
			return;
		}

		if (
			reader.status === "success" &&
			reader.lastTemplate &&
			selectedFinger &&
			!registerIsPending
		) {
			registerMutate({
				userId,
				finger: selectedFinger,
				template: reader.lastTemplate,
				enrolledByControllerId: selectedDevice ?? undefined,
			});
		}
	}, [
		reader.status,
		reader.lastTemplate,
		reader.reset,
		selectedFinger,
		selectedDevice,
		userId,
		registerMutate,
		registerIsPending,
	]);

	// ── Keyboard close ───────────────────────────────────────────────────────────
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onOpenChange]);

	// ── Lock page scroll ─────────────────────────────────────────────────────────
	useLayoutEffect(() => {
		if (open) {
			document.documentElement.classList.add("drawer-open");
		} else {
			document.documentElement.classList.remove("drawer-open");
		}
		return () => {
			document.documentElement.classList.remove("drawer-open");
		};
	}, [open]);

	// ── Reset on close ───────────────────────────────────────────────────────────
	const readerReset = reader.reset;
	useEffect(() => {
		if (!open) {
			setSelectedFinger(null);
			readerReset();
			setActiveTab("left");
			setSelectedDevice(null);
			enrollment.reset();
		}
	}, [open, readerReset, enrollment.reset]);

	// ── Handlers ─────────────────────────────────────────────────────────────────

	const handleFingerClick = useCallback(
		(finger: FingerKey) => {
			if (selectedDevice) {
				setSelectedFinger(finger);
				enrollment.start();
				enrollMutate({
					userId,
					controllerId: selectedDevice,
					finger,
				});
				return;
			}

			const alreadyRegistered = fingerprints.some(
				(f) => f.finger === finger && f.isActive,
			);
			if (alreadyRegistered) {
				toast.info(`${FINGER_LABELS[finger]} já está cadastrado.`);
				return;
			}

			if (
				selectedFinger === finger &&
				(reader.status === "waiting" || reader.status === "reading")
			) {
				reader.cancelCapture();
				setSelectedFinger(null);
				return;
			}

			if (reader.status === "waiting" || reader.status === "reading") {
				reader.cancelCapture();
			}

			setSelectedFinger(finger);
			reader.startCapture();
		},
		[
			fingerprints,
			reader,
			selectedFinger,
			selectedDevice,
			enrollMutate,
			enrollment,
			userId,
		],
	);

	// ── Context menu handler ────────────────────────────────────────────────────
	const handleFingerContextAction = useCallback(
		(finger: FingerKey, action: FingerContextAction) => {
			if (action === "register" || action === "re-register") {
				handleFingerClick(finger);
				return;
			}
			if (action === "delete") {
				const cred = fingerprints.find(
					(f) => f.finger === finger && f.isActive,
				);
				if (cred) {
					setDeleteTarget({ finger, credentialId: cred.id });
				}
			}
		},
		[fingerprints, handleFingerClick],
	);

	const handleTabChange = useCallback(
		(tab: ActiveHandTab) => {
			if (tab === activeTab) return;
			if (reader.status === "waiting" || reader.status === "reading") {
				reader.cancelCapture();
			}
			setSelectedFinger(null);
			reader.reset();
			setActiveTab(tab);
		},
		[activeTab, reader],
	);

	const handleClose = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	// ── Tab counts ────────────────────────────────────────────────────────────────
	const leftCount = countRegisteredInSet(FINGERS_LEFT, fingerprints);
	const rightCount = countRegisteredInSet(FINGERS_RIGHT, fingerprints);

	const TABS = [
		{ key: "left" as const, label: "Mão Esquerda", count: leftCount },
		{ key: "right" as const, label: "Mão Direita", count: rightCount },
		{ key: "nfc" as const, label: "NFC", count: nfcTags.length },
	];

	return (
		<>
			<AnimatePresence>
				{open && (
					<>
						{/* Overlay */}
						<motion.div
							key="fp-drawer-overlay"
							className="fixed inset-0 z-50 cursor-pointer bg-black/50"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.35, ease: EASE_CLOSE }}
							onClick={handleClose}
							aria-hidden
						/>

						{/* Outer positioner */}
						<div
							key="fp-drawer-positioner"
							className="fixed inset-0 z-50 md:inset-y-0 md:left-auto md:w-full md:max-w-md"
							role="dialog"
							aria-modal
							aria-label={`Cadastro de digitais — ${userName}`}
						>
							<motion.div
								className="relative h-full overflow-hidden md:rounded-tl-2xl md:rounded-bl-2xl"
								initial={{ x: "101%" }}
								animate={{ x: 0 }}
								exit={{ x: "101%" }}
								transition={{ duration: 0.575, ease: EASE_CLOSE }}
							>
								{/* ── Background wipe layers ── */}
								<motion.div
									className="absolute inset-0 bg-primary filter brightness-200 dark:brightness-50"
									initial={{ x: "101%" }}
									animate={{ x: 0 }}
									exit={{ x: 0 }}
									transition={{ duration: 0.5, ease: EASE, delay: 0 }}
								/>
								<motion.div
									className="absolute inset-0 bg-primary"
									initial={{ x: "101%" }}
									animate={{ x: 0 }}
									exit={{ x: 0 }}
									transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
								/>
								<motion.div
									className="absolute inset-0 bg-white dark:bg-zinc-900"
									initial={{ x: "101%" }}
									animate={{ x: 0 }}
									exit={{ x: 0 }}
									transition={{ duration: 0.575, ease: EASE, delay: 0.12 }}
								/>

								{/* ── Content ── */}
								<div className="absolute inset-0 z-10 flex flex-col overflow-hidden">
									{/* ── Fixed Header (não rola) ── */}
									<motion.div
										className="flex items-start justify-between gap-4 px-6 pt-8 pb-4 shrink-0"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.4, ease: EASE, delay: 0.32 }}
									>
										<div className="flex flex-col gap-0.5">
											<h2 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
												Credenciais
											</h2>
											<p className="text-sm text-zinc-400 dark:text-zinc-500">
												Gerencie suas credenciais de acesso
											</p>
										</div>

										<Button
											variant="hover"
											size="icon"
											className="shrink-0 size-8 rounded-md bg-transparent! text-black hover:text-white dark:text-white"
											onClick={handleClose}
											aria-label="Fechar"
											overlayClassname="before:bg-primary"
										>
											<X className="size-4" />
										</Button>
									</motion.div>

									{/* ── Scrollable body ── */}
									<motion.div
										className="flex-1 overflow-y-auto custom-scrollbar"
										initial={{ opacity: 0, y: 16 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.4, ease: EASE, delay: 0.36 }}
									>
										{/* User identity */}
										<div className="px-6 pt-4 pb-5 flex flex-col gap-1">
											<span className="text-xs font-black tracking-wider uppercase text-primary">
												CREDENCIAIS
											</span>
											<span className="text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 leading-none truncate">
												{userName}
											</span>
										</div>

										{/* ── Device Selector — acima das tabs ── */}
										<DeviceSelector
											selectedDevice={selectedDevice}
											onSelectDevice={setSelectedDevice}
										/>

										{/* ── Tabs bar ── */}
										<div className="flex border-b border-zinc-200 dark:border-zinc-700 px-6 mt-2">
											{TABS.map(({ key, label, count }) => (
												<button
													key={key}
													type="button"
													onClick={() => handleTabChange(key)}
													className={cn(
														"flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
														activeTab === key
															? "border-primary text-primary"
															: "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
													)}
												>
													{label}
													{count > 0 && (
														<span
															className={cn(
																"inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-semibold",
																activeTab === key
																	? "bg-primary text-primary-foreground"
																	: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
															)}
														>
															{count}
														</span>
													)}
												</button>
											))}
										</div>

										{/* ── Tab content ── */}
										<div className="px-6 pt-4 pb-16">
											{activeTab === "nfc" ? (
												<NfcTab
													user={{ id: userId, name: userName }}
													selectedControllerId={selectedDevice}
												/>
											) : (
												<div
													key={activeTab}
													className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300"
												>
													{/* Hand SVG */}
													<div className="flex justify-center">
														{isLoadingFingerprints ? (
															<div className="flex size-56 items-center justify-center">
																<Loader2 className="size-6 animate-spin text-zinc-300 dark:text-zinc-600" />
															</div>
														) : (
															<div className="relative size-56 text-zinc-300 dark:text-zinc-700">
																<Hand
																	side={activeTab}
																	registeredFingers={fingerprints}
																	selectedFinger={selectedFinger}
																	onFingerClick={handleFingerClick}
																	onFingerContextAction={
																		handleFingerContextAction
																	}
																	readerStatus={reader.status}
																	captureActive={
																		reader.status === "waiting" ||
																		reader.status === "reading" ||
																		enrollIsPending ||
																		enrollment.isActive
																	}
																	countdown={reader.countdown}
																	interactive
																/>
															</div>
														)}
													</div>

													{selectedFinger ? (
														<div className="flex flex-col gap-3">
															{/* Enrollment step feedback */}
															{enrollment.step !== "idle" && (
																<div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
																	{enrollment.step === "ENROLLED" ? (
																		<div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
																			{/** biome-ignore lint/a11y/noSvgWithoutTitle: <svg sem propósito visual mas mandatory para o funcionamento do código> */}
																			<svg
																				className="size-3 text-white"
																				fill="none"
																				viewBox="0 0 24 24"
																				strokeWidth={3}
																				stroke="currentColor"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					d="M4.5 12.75l6 6 9-13.5"
																				/>
																			</svg>
																		</div>
																	) : enrollment.step === "FAILED" ||
																		enrollment.step === "EXPIRED" ? (
																		<div className="size-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
																			<X className="size-3 text-white" />
																		</div>
																	) : (
																		<Loader2 className="size-4 animate-spin text-primary shrink-0" />
																	)}
																	<span
																		className={cn(
																			"text-sm font-medium",
																			enrollment.step === "ENROLLED"
																				? "text-emerald-600 dark:text-emerald-400"
																				: enrollment.step === "FAILED" ||
																						enrollment.step === "EXPIRED"
																					? "text-red-600 dark:text-red-400"
																					: "text-zinc-700 dark:text-zinc-300",
																		)}
																	>
																		{enrollment.stepLabel}
																	</span>
																</div>
															)}

															{!enrollment.isTerminal && (
																<Button
																	variant="hoverOutline"
																	className="w-full text-black! dark:text-white! after:border-zinc-200! dark:after:border-zinc-800!"
																	overlayClassname="before:bg-zinc-200 dark:before:bg-zinc-800"
																	onClick={() => {
																		if (selectedDevice) {
																			enrollMutation.reset();
																			enrollment.reset();
																		} else {
																			reader.cancelCapture();
																		}
																		setSelectedFinger(null);
																	}}
																>
																	Cancelar leitura
																</Button>
															)}
														</div>
													) : (
														<p className="text-center text-xs text-zinc-400 dark:text-zinc-500 pb-2">
															Toque em um dedo para iniciar o cadastro
														</p>
													)}
												</div>
											)}
										</div>
									</motion.div>
								</div>
							</motion.div>
						</div>
					</>
				)}
			</AnimatePresence>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Apagar digital</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja remover a digital{" "}
							<strong>
								{deleteTarget ? FINGER_LABELS[deleteTarget.finger] : ""}
							</strong>
							? Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							disabled={deleteMutation.isPending}
							onClick={() => {
								if (deleteTarget) {
									deleteMutation.mutate({
										userId,
										credentialId: deleteTarget.credentialId,
									});
								}
							}}
						>
							{deleteMutation.isPending ? "Removendo..." : "Apagar"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
