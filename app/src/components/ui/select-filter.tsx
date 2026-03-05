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
  const currentValue =
    value === defaultValue
      ? null
      : (options.find((o) => o.value === value) ?? null);

  return (
    <Combobox<SelectFilterOption>
      items={options}
      value={currentValue}
      onValueChange={(opt) => onValueChange(opt?.value ?? defaultValue)}
      className={className}
    >
      <ComboboxInput placeholder={placeholder} showClear />
      <ComboboxContent>
        {options.length === 0 && (
          <ComboboxEmpty>Nenhum resultado encontrado.</ComboboxEmpty>
        )}
        <ComboboxList>
          {options.map((opt) => (
            <ComboboxItem key={opt.value} value={opt}>
              {opt.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
