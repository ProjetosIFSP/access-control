import gsap from "gsap";
import { memo, useCallback, useRef } from "react";
import { RoomCard, type RoomCardItem } from "./room-card";

interface BlockSectionProps {
	blockName: string;
	rooms: RoomCardItem[];
	authenticated: boolean;
}

export const BlockSection = memo(function BlockSection({
	blockName,
	rooms,
	authenticated,
}: BlockSectionProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);
	const startX = useRef(0);
	const scrollLeft = useRef(0);
	const lastX = useRef(0);
	const lastTime = useRef(0);
	const velocity = useRef(0);
	const inertiaTween = useRef<gsap.core.Tween | null>(null);

	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		inertiaTween.current?.kill();
		isDragging.current = true;
		startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
		scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
		lastX.current = e.pageX;
		lastTime.current = Date.now();
		velocity.current = 0;
	}, []);

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDragging.current) return;
		e.preventDefault();

		const now = Date.now();
		const dt = now - lastTime.current;
		if (dt > 0) {
			velocity.current = (e.pageX - lastX.current) / dt;
		}
		lastX.current = e.pageX;
		lastTime.current = now;

		const x = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
		if (scrollRef.current) {
			scrollRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
		}
	}, []);

	const stopDragging = useCallback(() => {
		if (!isDragging.current) return;
		isDragging.current = false;

		const el = scrollRef.current;
		if (!el || Math.abs(velocity.current) < 0.05) return;

		const target = el.scrollLeft - velocity.current * 500;
		const proxy = { value: el.scrollLeft };

		inertiaTween.current = gsap.to(proxy, {
			value: target,
			duration: 1,
			ease: "power3.out",
			onUpdate() {
				el.scrollLeft = proxy.value;
			},
		});
	}, []);

	return (
		<section className="flex flex-col gap-2">
			{/* Block title */}
			<h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 px-4 sm:px-8 md:px-16 lg:px-32 first:transition-all">
				{blockName}
			</h2>

			{/* Horizontal scrollable room cards */}
			<section
				ref={scrollRef}
				aria-label={`Salas do bloco ${blockName}`}
				className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={stopDragging}
				onMouseLeave={stopDragging}
			>
				{rooms.map((room) => (
					<RoomCard key={room.id} room={room} authenticated={authenticated} />
				))}
			</section>
		</section>
	);
});
