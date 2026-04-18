export function normalizeAddress(address?: string | null): string {
  return address ? address.trim().toLowerCase() : "";
}
