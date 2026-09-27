export function normalizeWebUrl(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  const explicit =
    /^[a-z][a-z\d+.-]*:/i.test(value) &&
    !/^(localhost|[a-z\d.-]+\.[a-z\d-]+):\d+(?:[/#?]|$)/i.test(value);
  if (explicit && !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(explicit ? value : `https://${value}`);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname;
    if (host !== "localhost" && !host.includes(".") && !host.startsWith("["))
      return null;
    if (
      host.includes(".") &&
      !/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d-]+$/i.test(host)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
