// Offers a text as a file download. Used for "download a copy of the raw data".
// The text is never sent anywhere: it goes from memory to the user's own device.
export function downloadTextFile(
  filename: string,
  text: string,
  mimeType = 'text/plain;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
