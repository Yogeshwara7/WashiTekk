import React from 'react';

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange, options, className = '' }) => {
  return (
    <select 
      className={`border rounded px-3 py-2 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default SortDropdown; 