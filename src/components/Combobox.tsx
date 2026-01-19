import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ComboboxProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
    onFocus?: () => void;
}

const Combobox: React.FC<ComboboxProps> = ({
    value,
    onChange,
    options,
    placeholder = '',
    className = '',
    onFocus
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Deduplicate options to avoid repeating recent + common items
    const uniqueOptions = Array.from(new Set(options));

    // Filter options based on current value`
    const filteredOptions = uniqueOptions.filter(opt =>
        opt.toLowerCase().includes(value.toLowerCase())
    );

    const displayOptions = value ? filteredOptions : uniqueOptions;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt: string) => {
        onChange(opt);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        if (onFocus) onFocus();
                    }}
                    className={`w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none placeholder-gray-500 text-black font-bold text-lg pr-10 ${className}`}
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-black"
                    tabIndex={-1} // Prevent tab stopping
                >
                    <ChevronDown size={20} />
                </button>
            </div>

            {isOpen && displayOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto rounded-sm">
                    {displayOptions.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSelect(opt)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 font-bold text-gray-700 border-b border-gray-100 last:border-0"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Combobox;
