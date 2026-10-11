<template>
	<div class="wp-content-renderer">
		<template v-for="(block, idx) in blocks" :key="idx">
			<div
				v-if="block.type === 'html'"
				class="wp-content-renderer__html"
				v-safe-html="block.content"
				@click="handleInternalLinks"
			></div>
			<EgMediaViewer
				v-else-if="block.type === 'eg-media'"
				:context="block.context"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ContentBlock } from '@/types/egMedia';
import { parseWpContent } from '@/utils/parsers/wpContentParser';
import { useInternalLinks } from '@/composables/core/useInternalLinks';
import EgMediaViewer from '@/components/shared/MediaViewer/EgMediaViewer.vue';

const props = defineProps<{
	content: string;
}>();

const { handleInternalLinks } = useInternalLinks();

const blocks = computed<ContentBlock[]>( () => {
	return parseWpContent( props.content || '' );
} );
</script>
