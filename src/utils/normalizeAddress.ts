export function normalizeAddress(address?: string | null) {
  return address ? address.trim().toLowerCase() : "";
}
