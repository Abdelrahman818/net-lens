"use client";

import React from "react";

export default function EmptyState({ title = "No data", message = "No data available.", details = null }) {
  return (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
      <div className="font-semibold">{title}</div>
      <div className="mt-1">{message}</div>
      {details ? <div className="mt-2 text-xs font-mono text-yellow-900">{details}</div> : null}
    </div>
  );
}
