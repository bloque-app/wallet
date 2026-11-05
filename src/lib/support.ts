export const SUPPORT_EMAIL = 'soporte@bloque.team';

export function buildSupportMailto(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set('body', body);
  return `mailto:${SUPPORT_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}
