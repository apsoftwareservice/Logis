import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select';

// A generic type for any nested object.
// We use a recursive type where keys map to either a primitive or another NestedObject.
export type NestedObject = {
    [key: string]: string | number | boolean | NestedObject;
};

// This utility type will help us later to get the path as a string.
type DotPath<T> = T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends object
            ? `${K}` | `${K}.${DotPath<T[K]>}`
            : `${K}`;
    }[keyof T & (string | number)]
    : never;

// Use a generic T to represent the type of the nested object.
// The onSelect callback will now have a strongly-typed parameter.
interface NestedSelectProps<T extends NestedObject> {
    data: T;
    // The onSelect function now expects a string that is a valid dot-path of T.
    onSelect: (path: DotPath<T>) => void;
    // An optional prefix for building the full path
    prefix?: string;
}

// Pass the generic type T to the component definition.
function NestedSelect<T extends NestedObject>({ data, onSelect, prefix = '' }: NestedSelectProps<T>) {
    const [selectedValue, setSelectedValue] = useState<keyof T | null>(null);

    // Check if the current data is a valid nested object
    const isNested = typeof data === 'object' && data !== null && !Array.isArray(data);
    if (!isNested) {
        return null;
    }

    const keys = Object.keys(data) as (keyof T)[];

    return (
        <Select
            onValueChange={(value: keyof T) => {
                setSelectedValue(value);
                const fullPath = prefix ? `${prefix}.${value.toString()}` : `${value.toString()}`;

                // Check if the next level is an object.
                if (typeof data[value] !== 'object' || data[value] === null) {
                    // If it's a leaf node, call the onSelect handler with the full path.
                    onSelect(fullPath as DotPath<T>);
                }
            }}
        >
            <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900 min-w-40">
                <SelectValue placeholder="Choose value" />
            </SelectTrigger>
            <SelectContent className={'bg-white cursor-pointer'}>
                {keys.map((key) => (
                    // Value must be a string.
                    <SelectItem key={String(key)} value={String(key)}>
                        <div className="flex items-center justify-between cursor-pointer">
                            <span>{String(key)}</span>
                            {typeof data[key] === 'object' && data[key] !== null && (
                                <ChevronRight className="ml-2 h-4 w-4" />
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
            {/* Recursively render another NestedSelect if the selected value is a nested object */}
            {selectedValue && typeof data[selectedValue] === 'object' && data[selectedValue] !== null && (
                <NestedSelect
                  //@ts-expect-error
                    data={data[selectedValue] as NestedObject}
                    onSelect={onSelect}
                    prefix={prefix ? `${prefix}.${String(selectedValue)}` : String(selectedValue)}
                />
            )}
        </Select>
    );
}

export default NestedSelect;