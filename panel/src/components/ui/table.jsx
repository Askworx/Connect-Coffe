import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * The drawing-sheet table: hairline rules, mono uppercase heads on paper,
 * tabular figures. Always scrolls inside its own container so the page body
 * never scrolls horizontally.
 */
function Table({ className, containerClassName, ...props }) {
  return (
    <div className={cn("w-full overflow-x-auto", containerClassName)}>
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-collapse text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b border-border bg-paper", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-border", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn("transition-colors hover:bg-paper", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // Ink, not titanium: a column head is a heading, and it sits on the
        // same screen as ink card titles and ink page titles. At 10px under
        // 0.16em tracking the grey read as disabled rather than recessive.
        "whitespace-nowrap px-5 py-3 font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-ink",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-5 py-3.5 align-middle text-[13px] text-body-text", className)}
      {...props}
    />
  );
}

function TableEmpty({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-titanium-700">
          {children}
        </p>
      </td>
    </tr>
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty };
