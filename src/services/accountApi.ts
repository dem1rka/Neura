export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch('/api' + path, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Neura-Request': '1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({ error: 'Бэкенд недоступен. Запустите сервер.' }));
  if (!response.ok) throw Object.assign(new Error(result.error || 'Запрос не выполнен'),{status:response.status});
  return result;
}
