<script lang="ts">
/**
 * The ODS mark, inlined from media/logo.svg so it renders identically in the
 * viewer, the static export and the extension webview without an asset URL.
 * Decorative: the surrounding text carries the meaning.
 */
let { size = 24 }: { size?: number } = $props();
</script>

<svg class="logo" width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
	<path d="M 52.2,42.9 A 114,114 0 0,0 52.2,213.1 L 98,180 L 98,76 Z" fill="#0078D4" />
	<path d="M 52.2,42.9 A 114,114 0 0,1 242,128 L 172,128 C 172,96 154,76 126,76 H 98 Z" fill="#2B88D8" />
	<path d="M 242,128 A 114,114 0 0,1 52.2,213.1 L 98,180 H 126 C 154,180 172,160 172,128 Z" fill="#004E8C" />
</svg>

<style>
	.logo { flex: none; vertical-align: -0.2em; }
</style>
