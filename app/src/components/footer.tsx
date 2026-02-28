import nameBlack from "@/assets/images/nameblack.png";
export function Footer() {
	return (
		<footer className="mt-auto flex items-center justify-center mb-4">
			<p className="flex items-center text-zinc-400 text-xs italic font-medium group">
				Desenvolvido por
				<a
					href="https://abnerjs.vercel.app/"
					target="_blank"
					rel="noopener noreferrer"
				>
					<img
						src={nameBlack}
						alt="Nome do desenvolvedor"
						className="inline h-6 mx-1 filter opacity-50 group-hover:opacity-75 transition-all duration-300"
					/>
				</a>
			</p>
		</footer>
	);
}
