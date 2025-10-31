import React, { useState } from "react";

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface CountryFlagPickerProps {
  selectedCountry?: string | null;
  onCountrySelect?: (country: Country | null) => void;
  placeholder?: string;
  className?: string;
}

// Common countries list
const commonCountries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
];

export default function CountryFlagPicker({
  selectedCountry,
  onCountrySelect,
  placeholder = "Select country",
  className = ""
}: CountryFlagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCountryObj = commonCountries.find(c => c.code === selectedCountry);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-zinc-800 border border-amber-400/30 rounded-lg text-white flex items-center justify-between hover:border-amber-400/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          {selectedCountryObj ? (
            <>
              <span>{selectedCountryObj.flag}</span>
              <span>{selectedCountryObj.name}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <span className="text-gray-400">▼</span>
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-zinc-900 border border-amber-400/30 rounded-lg max-h-60 overflow-y-auto">
            {commonCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => {
                  onCountrySelect?.(country);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors"
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

