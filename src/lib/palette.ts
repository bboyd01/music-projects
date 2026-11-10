/** Curated, muted status palette. Users pick from these so color stays harmonious. */
export const statusPalette = [
	{ name: 'Stone', value: '#a29d94' },
	{ name: 'Slate', value: '#8a96a8' },
	{ name: 'Dusty blue', value: '#7f9dbb' },
	{ name: 'Teal', value: '#6fa5a1' },
	{ name: 'Sage', value: '#8fa98b' },
	{ name: 'Moss', value: '#93a065' },
	{ name: 'Ochre', value: '#c9a75a' },
	{ name: 'Brass', value: '#c49a52' },
	{ name: 'Clay', value: '#c27f62' },
	{ name: 'Rose', value: '#b9808a' },
	{ name: 'Mauve', value: '#a68ba3' },
	{ name: 'Plum', value: '#8f7cab' }
] as const;

export const defaultProjectStatuses = [
	{ name: 'Not Started', color: '#a29d94' },
	{ name: 'In Progress', color: '#7f9dbb' },
	{ name: 'Shelved', color: '#a68ba3' },
	{ name: 'Submitting', color: '#c9a75a' },
	{ name: 'Done', color: '#8fa98b', isDone: true }
];

export const defaultTrackStatuses = [
	{ name: 'Not Started', color: '#a29d94' },
	{ name: 'Sketching', color: '#8a96a8' },
	{ name: 'Writing', color: '#7f9dbb' },
	{ name: 'Polishing', color: '#6fa5a1' },
	{ name: 'Mixing', color: '#8f7cab' },
	{ name: 'Mastering', color: '#c49a52' },
	{ name: 'Done', color: '#8fa98b', isDone: true },
	{ name: 'Waiting Feedback', color: '#c9a75a' },
	{ name: 'Needs Revisions', color: '#c27f62' }
];
