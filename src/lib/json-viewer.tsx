"use client";
import React, { useState } from "react";

type JsonViewerProps = {
  value: any;
  path?: string;
  onSelectPath?: (path: string) => void;
};

export default function JsonViewer({
  value,
  path = "root",
  onSelectPath,
}: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState(false);

  const safeStringify = (val: any): string => {
    if (val instanceof Date) return `"${val.toISOString()}"`;
    if (val === undefined) return "undefined";
    if (typeof val === "function") return "ƒ()";
    return JSON.stringify(val);
  };

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value).sort();
    return (
      <div className="ml-4 font-mono text-sm">
        <span
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer text-blue-600"
        >
          {collapsed ? "{...}" : "{"}
        </span>
        {!collapsed &&
          keys.map((key) => {
            const childPath = `${path}.${key}`;
            return (
              <div key={childPath} className="ml-4">
                <span
                  onClick={() => onSelectPath?.(childPath)}
                  className="cursor-pointer text-purple-700 hover:underline"
                >
                  {key}
                </span>
                : <JsonViewer value={value[key]} path={childPath} onSelectPath={onSelectPath} />
              </div>
            );
          })}
        {!collapsed && <span>{"}"}</span>}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="ml-4 font-mono text-sm">
        <span
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer text-green-600"
        >
          {collapsed ? "[...]" : "["}
        </span>
        {!collapsed &&
          value.map((item, idx) => {
            const childPath = `${path}[${idx}]`;
            return (
              <div key={childPath} className="ml-4">
                <JsonViewer value={item} path={childPath} onSelectPath={onSelectPath} />
              </div>
            );
          })}
        {!collapsed && <span>{"]"}</span>}
      </div>
    );
  }

  return <span className="text-gray-800">{safeStringify(value)}</span>;
}
