/**
 * Grow a textarea to fit its content (Safari doesn't support `field-sizing: content`).
 * Pass the value as the parameter so external changes re-fit: use:autogrow={value}
 */
export function autogrow(node: HTMLTextAreaElement, _value?: unknown) {
	let lastWidth = 0;
	const fit = () => {
		node.style.height = 'auto';
		node.style.height = `${node.scrollHeight + (node.offsetHeight - node.clientHeight)}px`;
	};
	const ro = new ResizeObserver(([entry]) => {
		// Only re-fit when the width changes (height changes come from us).
		const w = entry.contentRect.width;
		if (w !== lastWidth) {
			lastWidth = w;
			fit();
		}
	});
	node.style.overflow = 'hidden';
	node.addEventListener('input', fit);
	ro.observe(node);
	queueMicrotask(fit);
	return {
		update: () => queueMicrotask(fit),
		destroy() {
			node.removeEventListener('input', fit);
			ro.disconnect();
		}
	};
}
