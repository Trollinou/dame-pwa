import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import fs from 'node:fs';

const packageJson = JSON.parse(
	fs.readFileSync(
		fileURLToPath( new URL( '../package.json', import.meta.url ) ),
		'utf-8'
	)
);

// https://vitejs.dev/config/
export default defineConfig( {
	define: {
		__APP_VERSION__: JSON.stringify( packageJson.version ),
	},
	base: './', // Chemins relatifs pour les assets (indispensable pour WordPress)
	plugins: [
		vue( {
			template: {
				compilerOptions: {
					isCustomElement: ( tag ) => tag.startsWith( 'cg-' ),
				},
			},
		} ),
		VitePWA( {
			registerType: 'autoUpdate',
			includeManifestIcons: false,
			manifest: {
				name: 'Echiquier Lédonien',
				short_name: 'Echiquier Lédonien',
				description: 'Echiquier Lédonien PWA',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: './',
				scope: './',
				icons: [
					{
						src: 'assets/icon/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable',
					},
					{
						src: 'assets/icon/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable',
					},
				],
			},
			workbox: {
				skipWaiting: true,
				clientsClaim: true,
				// On s'assure que tous les assets nécessaires sont mis en cache
				globPatterns: [ '**/*.{js,css,html,ico,png,svg,wasm}' ],
				// On augmente la limite de taille pour le fichier WASM de Stockfish (environ 7Mo)
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
				runtimeCaching: [
					{
						urlPattern: /.*\/stockfish\.(js|wasm)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'pwa-stockfish-cache',
							expiration: {
								maxEntries: 2,
								maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
							},
							cacheableResponse: {
								statuses: [ 0, 200 ],
							},
						},
					},
				],
			},
		} ),
	],
	resolve: {
		alias: {
			'@': fileURLToPath( new URL( './src', import.meta.url ) ),
		},
	},
	// --- NOUVELLE SECTION D'OPTIMISATION ---
	build: {
		target: 'es2021', // Indispensable pour supporter les BigInt (0xffn) de chessops
		chunkSizeWarningLimit: 1500, // On augmente la tolérance pour Ionic
		modulePreload: false, // Désactive le préchargement automatique (résout les warnings "unused preload" dans WordPress)
		rollupOptions: {
			output: {
				manualChunks( id ) {
					if ( id.includes( 'node_modules' ) ) {
						if (
							id.includes( 'node_modules/vue/' ) ||
							id.includes( 'node_modules/@vue/' ) ||
							id.includes( 'node_modules/pinia/' ) ||
							id.includes( 'node_modules/vue-router/' )
						) {
							return 'vue-vendor';
						}
						if (
							id.includes( 'node_modules/@ionic/' ) ||
							id.includes( 'node_modules/ionicons/' )
						) {
							return 'ionic-vendor';
						}
						if ( id.includes( 'node_modules/@tanstack/' ) ) {
							return 'tanstack-vendor';
						}
					}
				},
			},
		},
	},
	// ---------------------------------------
	test: {
		globals: true,
		environment: 'jsdom',
		server: {
			deps: {
				inline: [ 'simple-jwt-login' ],
			},
		},
	},
} );
