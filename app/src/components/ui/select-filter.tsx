import { memo, useMemo, useState } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";

interface SelectFilterOption {
	value: string;
	label: string;
}

interface SelectFilterProps {
	value: string;
	onValueChange: (value: string) => void;
	placeholder: string;
	options: SelectFilterOption[];
	defaultValue?: string;
	className?: string;
}

/** Strips diacritics from a string for accent-insensitive comparison. */
function normalize(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export const SelectFilter = memo(function SelectFilter({
	value,
	onValueChange,
	placeholder,
	options,
	defaultValue = "all",
	className,
}: SelectFilterProps) {
	const [query, setQuery] = useState("");

	const currentValue = useMemo(
		() =>
			value === defaultValue
				? null
				: (options.find((o) => o.value === value) ?? null),
		[value, defaultValue, options],
	);

	const normalizedQuery = useMemo(() => normalize(query.trim()), [query]);

	const filtered = useMemo(
		() =>
			normalizedQuery === ""
				? options
				: options.filter((o) => normalize(o.label).includes(normalizedQuery)),
		[options, normalizedQuery],
	);

	return (
		<Combobox<SelectFilterOption>
			items={options}
			value={currentValue}
			onValueChange={(opt) => {
				onValueChange(opt?.value ?? defaultValue);
				setQuery("");
			}}
			onInputValueChange={(inputValue) => {
				// Only update query when the user is actively typing (not when the
				// combobox writes the selected label back into the input on selection).
				setQuery(inputValue);
			}}
		>
			<ComboboxInput
				placeholder={placeholder}
				showClear
				className={className}
			/>
			<ComboboxContent>
				{filtered.length === 0 ? (
					<ComboboxEmpty>Nenhum resultado encontrado.</ComboboxEmpty>
				) : (
					<ComboboxList>
						{filtered.map((opt) => (
							<ComboboxItem key={opt.value} value={opt}>
								{opt.label}
							</ComboboxItem>
						))}
					</ComboboxList>
				)}
			</ComboboxContent>
		</Combobox>
	);
});
