"use client";

/**
 * Tiny "Save as PDF" button — fires the browser's print dialog, which the
 * @media print stylesheet on `.resume` is tuned for. Client-only because
 * `window.print()` doesn't exist on the server; deliberately small so the
 * server component carrying the resume stays as a server component.
 */
export default function ResumePrintButton() {
  return (
    <button type="button" className="resume-print" onClick={() => window.print()}>
      Save as PDF
      <span className="resume-print-kbd" aria-hidden="true">⌘P</span>
    </button>
  );
}
