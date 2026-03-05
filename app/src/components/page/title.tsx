interface PageTitleProps {
	title: string;
	subtitle?: string;
}

export function PageTitle({ title, subtitle }: PageTitleProps) {
	return (
		<div className="flex flex-col px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
			<h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
				{title}
			</h1>
			{subtitle && (
				<span className="text-xs text-zinc-400 dark:text-zinc-600 font-medium">
					{subtitle}
				</span>
			)}
		</div>
	);
}
