// Provides functions like byte formatting
export const formatBytes = (bytes) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB", "TB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
