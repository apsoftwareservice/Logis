// Import the necessary components and hooks
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select';

// Updated types from step 1
export type NestedObject = {
    [key: string]: string | number | boolean | NestedObject | NestedObject[] | string[] | number[] | boolean[];
};

export type DotPath<T> = T extends object
    ? {
        [K in keyof T & (string | number)]: T[K] extends object
            ? T[K] extends (infer U)[]
                ? U extends object
                    ? `${K}` | `${K}[${number}]` | `${K}[${number}].${DotPath<U>}`
                    : `${K}` | `${K}[${number}]`
                : `${K}` | `${K}.${DotPath<T[K]>}`
            : `${K}`;
    }[keyof T & (string | number)]
    : never;

interface NestedSelectProps<T extends NestedObject> {
    data: T | T[] | string[] | number[] | boolean[];
    onSelect: (path: DotPath<T>) => void;
    prefix?: string;
}

function NestedSelect<T extends NestedObject>({ data, onSelect, prefix = '' }: NestedSelectProps<T>) {
    const [selectedValue, setSelectedValue] = useState<string | null>(null);

    // If the current data is an array, we'll render its items.
    const isArray = Array.isArray(data);
    const keys = isArray ? data.map((_, index) => index.toString()) : Object.keys(data as T);

    return (
        <Select
            onValueChange={(value: string) => {
                setSelectedValue(value);
                const fullPath = isArray
                    ? `${prefix}[${value}]`
                    : prefix ? `${prefix}.${value}` : `${value}`;

                const nextData = isArray ? data[Number(value)] : (data as T)[value as keyof T];

                // Check if the next level is an object or an array.
                if (typeof nextData !== 'object' || nextData === null) {
                    onSelect(fullPath as DotPath<T>);
                }
            }}
        >
            <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900 min-w-40">
                <SelectValue placeholder="Choose value" />
            </SelectTrigger>
            <SelectContent className={'bg-white cursor-pointer'}>
                {keys.map((key) => (
                    <SelectItem key={String(key)} value={String(key)}>
                        <div className="flex items-center justify-between cursor-pointer">
                            <span>{String(key)}</span>
                            {(isArray
                                ? typeof data[Number(key)] === 'object' && data[Number(key)] !== null
                                : typeof (data as T)[key as keyof T] === 'object' && (data as T)[key as keyof T] !== null) && (
                                <ChevronRight className="ml-2 h-4 w-4" />
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
            {/* Recursively render another NestedSelect */}
            {selectedValue && (isArray
                ? typeof data[Number(selectedValue)] === 'object' && data[Number(selectedValue)] !== null
                : typeof (data as T)[selectedValue as keyof T] === 'object' && (data as T)[selectedValue as keyof T] !== null) && (
                <NestedSelect
                    //@ts-expect-error ignore
                    data={isArray ? data[Number(selectedValue)] : (data as T)[selectedValue as keyof T] as NestedObject}
                    onSelect={onSelect}
                    prefix={isArray ? `${prefix}[${selectedValue}]` : prefix ? `${prefix}.${String(selectedValue)}` : String(selectedValue)}
                />
            )}
        </Select>
    );
}

export default NestedSelect;