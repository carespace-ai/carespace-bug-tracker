'use client';

import Tooltip from './Tooltip';

export interface FormFieldTooltipProps {
  label: string;
  tooltipContent: string;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  tooltipClassName?: string;
}

export default function FormFieldTooltip({
  label,
  tooltipContent,
  htmlFor,
  required = false,
  className = '',
  labelClassName = '',
  tooltipClassName = '',
}: FormFieldTooltipProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <label
        htmlFor={htmlFor}
        className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Tooltip
        content={tooltipContent}
        tooltipClassName={tooltipClassName}
      />
    </div>
  );
}
