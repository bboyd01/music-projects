import { toast } from '#lib/state/ui.svelte.ts';

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
	}
}

type Opts = { quiet?: boolean; headers?: Record<string, string> };

/** JSON fetch helper. Shows a toast on failure unless `quiet`. */
export async function api<T = { ok: true }>(
	method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
	url: string,
	body?: unknown,
	opts: Opts = {}
): Promise<T> {
	const isForm = body instanceof FormData;
	const isRaw = body instanceof Blob && !isForm;
	let res: Response;
	try {
		res = await fetch(url, {
			method,
			headers: body !== undefined && !isForm && !isRaw ? { 'content-type': 'application/json', ...opts.headers } : opts.headers,
			body: body === undefined ? undefined : isForm || isRaw ? (body as BodyInit) : JSON.stringify(body)
		});
	} catch {
		const err = new ApiError('Network error — check your connection', 0);
		if (!opts.quiet) toast(err.message, 'error');
		throw err;
	}
	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const j = await res.json();
			if (j?.message) message = j.message;
		} catch {
			/* ignore */
		}
		const err = new ApiError(message, res.status);
		if (!opts.quiet) toast(message, 'error');
		throw err;
	}
	return (await res.json()) as T;
}

/** Upload with progress (fetch has no upload progress). */
export function uploadWithProgress(
	method: 'PUT' | 'POST',
	url: string,
	body: Blob | FormData,
	headers: Record<string, string>,
	onProgress: (fraction: number) => void
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open(method, url);
		for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
		xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
		xhr.onload = () => {
			let data: { message?: string } = {};
			try {
				data = JSON.parse(xhr.responseText);
			} catch {
				/* ignore */
			}
			if (xhr.status >= 200 && xhr.status < 300) resolve(data);
			else {
				const msg = data.message ?? `Upload failed (${xhr.status})`;
				toast(msg, 'error');
				reject(new ApiError(msg, xhr.status));
			}
		};
		xhr.onerror = () => {
			toast('Upload failed — network error', 'error');
			reject(new ApiError('Network error', 0));
		};
		xhr.send(body);
	});
}
