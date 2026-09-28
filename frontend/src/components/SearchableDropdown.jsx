import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";

export default function SearchableDropdown({
  allowCustom = false,
  label,
  onChange,
  options,
  placeholder,
  disabled = false,
  value,
  isMulti = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedOptions = [
    ...new Map(
      options
        .filter(Boolean)
        .map((option) => {
          if (typeof option === "string") {
            return [option, { label: option, value: option }];
          }

          const optionValue = String(option.value ?? option.label ?? "").trim();
          const optionLabel = String(option.label ?? optionValue);
          return [optionValue || optionLabel, { label: optionLabel, value: optionValue || optionLabel }];
        }),
    ).values(),
  ];
  const filteredOptions = normalizedOptions.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  
  const selectedOptions = isMulti 
    ? normalizedOptions.filter((option) => Array.isArray(value) && value.includes(option.value))
    : [];
  const selectedOption = !isMulti ? normalizedOptions.find((option) => option.value === value) : null;

  function handleSelect(nextValue) {
    if (disabled) {
      return;
    }
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(nextValue)) {
        onChange(currentValues.filter((v) => v !== nextValue));
      } else {
        onChange([...currentValues, nextValue]);
      }
      setQuery("");
    } else {
      onChange(nextValue);
      setQuery("");
      setIsOpen(false);
    }
  }

  return (
    <div
      className={`searchableDropdown ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery("");
        }
      }}
      tabIndex={-1}
    >
      <button
        className={`searchableDropdownTrigger ${disabled ? "disabled" : ""}`}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          {isMulti
            ? selectedOptions.length > 0
              ? selectedOptions.length === 1
                ? selectedOptions[0].label
                : `${selectedOptions.length} selected`
              : placeholder
            : selectedOption?.label || value || placeholder}
        </span>
        <ChevronRight size={16} />
      </button>

      {isOpen && !disabled ? (
        <div className="searchableDropdownMenu">
          <label className="searchableDropdownSearch">
            <Search size={14} />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
            />
          </label>
          <div className="searchableDropdownOptions">
            {allowCustom &&
            query.trim() &&
            !normalizedOptions.some(
              (option) =>
                option.label.toLowerCase() === query.trim().toLowerCase() ||
                option.value.toLowerCase() === query.trim().toLowerCase(),
            ) ? (
              <button type="button" onClick={() => handleSelect(query.trim())}>
                Use "{query.trim()}"
              </button>
            ) : null}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = isMulti && Array.isArray(value) && value.includes(option.value);
                return (
                  <button 
                    key={option.value} 
                    type="button" 
                    onClick={() => handleSelect(option.value)}
                    className={isSelected ? "selected" : ""}
                    style={isSelected ? { fontWeight: "bold", background: "var(--background-soft)" } : {}}
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <div className="searchableDropdownEmpty">No matches found.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
