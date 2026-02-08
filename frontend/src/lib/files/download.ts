export function openBlobInNewTab(blob: Blob): void {
  const url = window.URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");

  // If popup was blocked, load the PDF in the same tab to keep the flow unblocked.
  if (!opened) {
    window.location.assign(url);
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 120_000);
}
