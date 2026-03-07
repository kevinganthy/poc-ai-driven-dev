export function decodeTokenPayload(token: string): { id: string; email: string; role: string } | null {
	try {
		return JSON.parse(atob(token.split('.')[1]));
	} catch {
		return null;
	}
}
