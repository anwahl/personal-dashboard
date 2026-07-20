-- Add 'bar' chart type (date on X axis, bars for metric values)
ALTER TYPE chart_type_enum ADD VALUE IF NOT EXISTS 'bar';
