export function fileNameFromPath(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;
}

export function fileNameWithoutExtension(filePath: string, extension: string): string {
  const fileName = fileNameFromPath(filePath);
  return fileName.endsWith(extension) ? fileName.slice(0, -extension.length) : fileName;
}

export function parentFolderFromPath(filePath: string): string {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

export function compactPathLabel(filePath: string): string {
  const fileName = fileNameFromPath(filePath);
  const parentFolder = parentFolderFromPath(filePath);
  return parentFolder ? `${parentFolder} / ${fileName}` : fileName;
}
