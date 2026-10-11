<template>
	<div class="eg-media-container" :class="`eg-media-container--${layout}`">
		<!-- 1. Mode Grille Justifiée (layout === 'justified') -->
		<div v-if="layout === 'justified'" class="eg-viewer__justified-container">
			<div class="eg-viewer__justified-grid">
				<div
					v-for="(img, idx) in images"
					:key="img.id || idx"
					class="eg-viewer__justified-item"
					:style="getJustifiedStyle(img)"
					@click="openFullscreen(idx)"
				>
					<img
						:src="img.thumbSrc"
						:alt="img.alt || ''"
						loading="lazy"
						decoding="async"
					/>
				</div>
			</div>
		</div>

		<!-- 2. Mode Visionneuse Standard (layout === 'viewer') -->
		<div v-else class="eg-viewer">
			<div class="eg-viewer__main" @click="openFullscreen(activeImageIndex)">
				<img
					v-if="activeImage"
					class="eg-viewer__main-image"
					:src="activeImage.fullSrc || activeImage.thumbSrc"
					:alt="activeImage.alt || ''"
					decoding="async"
				/>
			</div>

			<div class="eg-viewer__track-container">
				<button
					class="eg-viewer__arrow eg-viewer__arrow--left"
					aria-label="Précédent"
					@click="prevImage"
				>
					&lsaquo;
				</button>

				<div class="eg-viewer__thumbnails">
					<div class="eg-viewer__track">
						<div
							v-for="(img, idx) in images"
							:key="img.id || idx"
							class="eg-viewer__thumbnail"
							:class="{ 'eg-viewer__thumbnail--active': idx === activeImageIndex }"
							@click="selectImage(idx)"
						>
							<img
								:src="img.thumbSrc"
								:alt="img.alt || ''"
								loading="lazy"
								decoding="async"
							/>
						</div>
					</div>
				</div>

				<button
					class="eg-viewer__arrow eg-viewer__arrow--right"
					aria-label="Suivant"
					@click="nextImage"
				>
					&rsaquo;
				</button>
			</div>
		</div>

		<!-- 3. Lightbox / Modal Plein Écran (tous terminaux) -->
		<Teleport to="body">
			<div
				v-if="isFullscreen"
				class="eg-lightbox"
				@touchstart="handleTouchStart"
				@touchend="handleTouchEnd"
			>
				<!-- Bouton fermer -->
				<button
					class="eg-lightbox__close"
					aria-label="Fermer le plein écran"
					@click="closeFullscreen"
				>
					&times;
				</button>

				<!-- Compteur & Légende -->
				<div class="eg-lightbox__header">
					<span class="eg-lightbox__counter">
						{{ activeImageIndex + 1 }} / {{ images.length }}
					</span>
					<span v-if="activeImage?.alt" class="eg-lightbox__caption">
						{{ activeImage.alt }}
					</span>
				</div>

				<!-- Bouton Précédent (Desktop / Tablette) -->
				<button
					class="eg-lightbox__nav eg-lightbox__nav--prev"
					aria-label="Photo précédente"
					@click="prevImage"
				>
					&lsaquo;
				</button>

				<!-- Image principale en plein écran -->
				<div class="eg-lightbox__stage" @click.self="closeFullscreen">
					<img
						v-if="activeImage"
						class="eg-lightbox__image"
						:src="activeImage.fullSrc"
						:alt="activeImage.alt || ''"
						decoding="async"
					/>
				</div>

				<!-- Bouton Suivant (Desktop / Tablette) -->
				<button
					class="eg-lightbox__nav eg-lightbox__nav--next"
					aria-label="Photo suivante"
					@click="nextImage"
				>
					&rsaquo;
				</button>

				<!-- Barre de miniatures du bas (navigation rapide) -->
				<div v-if="images.length > 1" class="eg-lightbox__thumbnails">
					<div
						v-for="(img, idx) in images"
						:key="img.id || idx"
						class="eg-lightbox__thumb-item"
						:class="{ 'eg-lightbox__thumb-item--active': idx === activeImageIndex }"
						@click="selectImage(idx)"
					>
						<img
							:src="img.thumbSrc"
							:alt="img.alt || ''"
							loading="lazy"
							decoding="async"
						/>
					</div>
				</div>
			</div>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import type { EgMediaContext, EgMediaImage } from '@/types/egMedia';

const props = defineProps<{
	context: EgMediaContext;
}>();

const images = computed<EgMediaImage[]>( () => props.context?.images || [] );
const layout = computed<'viewer' | 'justified'>( () => props.context?.layout || 'justified' );

const activeImageIndex = ref( props.context?.currentIndex || 0 );
const isFullscreen = ref( false );

const activeImage = computed<EgMediaImage | undefined>( () => {
	return images.value[ activeImageIndex.value ] || images.value[ 0 ];
} );

// Défilement automatique du bandeau de miniatures vers la photo active
watch( activeImageIndex, () => {
	if ( isFullscreen.value ) {
		setTimeout( () => {
			const activeThumb = document.querySelector(
				'.eg-lightbox__thumb-item--active'
			);
			activeThumb?.scrollIntoView( {
				behavior: 'smooth',
				inline: 'center',
				block: 'nearest',
			} );
		}, 50 );
	}
} );

// Calcul du flex pour la grille justifiée
const getJustifiedStyle = ( img: EgMediaImage ) => {
	const ratio = img.width && img.height ? img.width / img.height : 1.33;
	const baseHeight = 135;
	return {
		flexGrow: ratio,
		flexBasis: `${ Math.round( ratio * baseHeight ) }px`,
	};
};

const selectImage = ( index: number ) => {
	if ( index >= 0 && index < images.value.length ) {
		activeImageIndex.value = index;
	}
};

const prevImage = () => {
	if ( images.value.length === 0 ) return;
	if ( activeImageIndex.value > 0 ) {
		activeImageIndex.value--;
	} else {
		activeImageIndex.value = images.value.length - 1;
	}
};

const nextImage = () => {
	if ( images.value.length === 0 ) return;
	if ( activeImageIndex.value < images.value.length - 1 ) {
		activeImageIndex.value++;
	} else {
		activeImageIndex.value = 0;
	}
};

const openFullscreen = ( index: number ) => {
	selectImage( index );
	isFullscreen.value = true;
};

const closeFullscreen = () => {
	isFullscreen.value = false;
};

// Gestion tactile (Swipe)
const touchStartX = ref( 0 );
const touchEndX = ref( 0 );

const handleTouchStart = ( e: TouchEvent ) => {
	if ( e.changedTouches && e.changedTouches.length > 0 ) {
		touchStartX.value = e.changedTouches[ 0 ].screenX;
	}
};

const handleTouchEnd = ( e: TouchEvent ) => {
	if ( e.changedTouches && e.changedTouches.length > 0 ) {
		touchEndX.value = e.changedTouches[ 0 ].screenX;
		const diff = touchEndX.value - touchStartX.value;
		const threshold = 45;

		if ( diff > threshold ) {
			prevImage();
		} else if ( diff < -threshold ) {
			nextImage();
		}
	}
};

// Gestion du clavier pour Desktop
const handleKeyDown = ( e: KeyboardEvent ) => {
	if ( ! isFullscreen.value ) return;
	if ( e.key === 'ArrowLeft' ) {
		prevImage();
	} else if ( e.key === 'ArrowRight' ) {
		nextImage();
	} else if ( e.key === 'Escape' ) {
		closeFullscreen();
	}
};

onMounted( () => {
	window.addEventListener( 'keydown', handleKeyDown );
} );

onBeforeUnmount( () => {
	window.removeEventListener( 'keydown', handleKeyDown );
} );
</script>
