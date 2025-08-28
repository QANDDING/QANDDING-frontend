export function formatKST(iso?: string): string {
  if (!iso) return '';
  try {
    const hasTZ = /[zZ]|([+-]\d{2}:?\d{2})$/.test(iso);
    const d = new Date(hasTZ ? iso : iso + 'Z');
    return d
      .toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(/\./g, '-')
      .replace(/-\s/g, '-')
      .replace(/\s$/, '');
  } catch {
    return String(iso);
  }
}

