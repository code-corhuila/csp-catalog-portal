/** The longest web address the Catalog contract accepts for a poster or a trailer (catalog-service.yaml 1.11.0). */
export const MAX_WEB_URL_LENGTH = 2048;

/** The address, trimmed, when it is an absolute http or https URL within the contract limit; otherwise null. */
export function httpUrlOrNull(value: string | undefined): string | null {
  const address = value?.trim() ?? '';
  if (!address || address.length > MAX_WEB_URL_LENGTH) {
    return null;
  }
  try {
    const { protocol } = new URL(address);
    return protocol === 'http:' || protocol === 'https:' ? address : null;
  } catch {
    return null;
  }
}
