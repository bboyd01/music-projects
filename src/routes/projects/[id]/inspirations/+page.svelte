<script lang="ts">
	import Canvas from '#lib/components/inspirations/Canvas.svelte';

	let { data } = $props();
</script>

<Canvas items={data.items} tracks={data.tracks} projectId={data.project.id} canEdit={data.role !== 'viewer'} />
