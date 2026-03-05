import { useState } from "react";
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

export function SelectFilter({
  value,
  onValueChange,
  placeholder,
  options,
  defaultValue = "all",
  className,
}: SelectFilterProps) {
  const [query, setQuery] = useState("");

  const currentValue =
    value === defaultValue
      ? null
      : (options.find((o) => o.value === value) ?? null);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) =>
          o.label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(
              query
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, ""),
            ),
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
}
