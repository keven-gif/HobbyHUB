/**
 * Opens the device's file picker and returns the selected File.
 * This is the ONLY reliable way to open a file picker on Android Chrome.
 * Hidden inputs (opacity: 0, sr-only, display: none) are all blocked by Android.
 */
export function pickFile(accept: string = 'image/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;';
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) document.body.removeChild(input);
    };

    input.addEventListener('change', () => {
      resolve(input.files?.[0] || null);
      cleanup();
    });

    input.addEventListener('cancel', () => {
      resolve(null);
      cleanup();
    });

    // Fallback: cleanup if nothing happens after 60 seconds
    setTimeout(() => {
      resolve(null);
      cleanup();
    }, 60000);

    input.click();
  });
}

/**
 * Reads a File as a base64 data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
