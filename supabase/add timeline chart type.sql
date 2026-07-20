-- Add 'timeline' chart type (date on x-axis, metric dots, no connecting lines)
ALTER TYPE chart_type_enum ADD VALUE IF NOT EXISTS 'timeline';
