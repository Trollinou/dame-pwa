/**
 * Types pour les galeries et visionneuses eg-media intégrées dans la PWA.
 */

export interface EgMediaImage {
	id: number;
	index: number;
	thumbSrc: string;
	fullSrc: string;
	alt: string;
	width: number;
	height: number;
}

export interface EgMediaContext {
	currentIndex: number;
	isFullscreen?: boolean;
	isSlideshowRunning?: boolean;
	slideshow?: boolean;
	tempo?: number;
	layout: 'viewer' | 'justified';
	limit?: number;
	loadedImagesCount?: number;
	images: EgMediaImage[];
}

export type ContentBlock =
	| { type: 'html'; content: string }
	| { type: 'eg-media'; context: EgMediaContext };
