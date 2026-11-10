export const trackFields = [
	{ id: 'status', label: 'Status', default: true },
	{ id: 'startDate', label: 'Start date', default: false },
	{ id: 'dueDate', label: 'Due date', default: true },
	{ id: 'audio', label: 'Audio', default: true },
	{ id: 'comments', label: 'Comments', default: true },
	{ id: 'todos', label: 'Todos', default: true },
	{ id: 'inspirations', label: 'Inspirations', default: false },
	{ id: 'description', label: 'Description', default: false }
] as const;

export type TrackFieldId = (typeof trackFields)[number]['id'];

export const defaultFields = trackFields.filter((f) => f.default).map((f) => f.id) as TrackFieldId[];
