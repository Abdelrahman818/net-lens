"use client";

import React from "react";

export default function SkeletonLoader({ lines = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-200" />
      ))}
    </div>
  );
}
