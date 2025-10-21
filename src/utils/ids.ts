export function generateSessionId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
