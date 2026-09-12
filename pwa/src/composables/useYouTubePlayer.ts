import { ref, computed, onUnmounted } from 'vue';

interface YouTubePlayerInstance {
	destroy: () => void;
	getDuration: () => number;
	getCurrentTime: () => number;
}

interface YouTubeApi {
	Player: new (
		_id: string,
		_options: {
			events: {
				onReady?: ( _event: { target: YouTubePlayerInstance } ) => void;
				onStateChange?: ( _event: { data: number } ) => void;
				onError?: ( _event: { data: number } ) => void;
			};
		}
	) => YouTubePlayerInstance;
	ready: ( _callback: () => void ) => void;
}

declare global {
	interface Window {
		YT?: YouTubeApi;
		onYouTubeIframeAPIReady?: ( () => void ) | undefined;
	}
}

export const YOUTUBE_DEFAULT_THRESHOLD_PERCENT = 95;

let ytApiPromise: Promise< void > | null = null;

export function loadYouTubeIframeApi(): Promise< void > {
	if ( typeof window === 'undefined' ) {
		return Promise.resolve();
	}

	if ( window.YT && window.YT.Player ) {
		return Promise.resolve();
	}

	const ytApi = window.YT;
	if ( ytApi && typeof ytApi.ready === 'function' ) {
		return new Promise( ( resolve ) => {
			ytApi.ready( () => resolve() );
		} );
	}

	if ( ! ytApiPromise ) {
		ytApiPromise = new Promise< void >( ( resolve ) => {
			// Sécurité : timeout de 3s au cas où le script externe est bloqué
			const timeout = setTimeout( () => {
				resolve();
			}, 3000 );

			const existingScript =
				document.getElementById( 'youtube-iframe-api' );
			if ( ! existingScript ) {
				const script = document.createElement( 'script' );
				script.id = 'youtube-iframe-api';
				script.src = 'https://www.youtube.com/iframe_api';
				script.onerror = () => {
					clearTimeout( timeout );
					resolve();
				};
				const firstScript =
					document.getElementsByTagName( 'script' )[ 0 ];
				firstScript?.parentNode?.insertBefore( script, firstScript );
			}

			const prevReady = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				clearTimeout( timeout );
				if ( typeof prevReady === 'function' ) {
					try {
						prevReady();
					} catch {
						// ignore
					}
				}
				resolve();
			};
		} );
	}

	return ytApiPromise;
}

export interface UseYouTubePlayerOptions {
	thresholdPercent?: number;
	onThresholdReached?: () => void;
	onEnded?: () => void;
}

export function useYouTubePlayer( options: UseYouTubePlayerOptions = {} ) {
	const threshold =
		options.thresholdPercent ?? YOUTUBE_DEFAULT_THRESHOLD_PERCENT;

	const isReady = ref( false );
	const isPlaying = ref( false );
	const isEnded = ref( false );
	const currentTime = ref( 0 );
	const duration = ref( 0 );
	const progressPercent = ref( 0 );
	const maxPercentReached = ref( 0 );
	const hasReachedThreshold = ref( false );
	const apiError = ref< string | null >( null );

	let playerInstance: YouTubePlayerInstance | null = null;
	let pollTimer: ReturnType< typeof setInterval > | null = null;
	let activeIframe: HTMLIFrameElement | null = null;

	const stopPolling = () => {
		if ( pollTimer ) {
			clearInterval( pollTimer );
			pollTimer = null;
		}
	};

	const evaluateProgress = ( curr: number, dur: number ) => {
		if ( dur <= 0 ) {
			return;
		}

		currentTime.value = curr;
		duration.value = dur;

		const pct = Math.min( 100, Math.round( ( curr / dur ) * 100 ) );
		progressPercent.value = pct;

		if ( pct > maxPercentReached.value ) {
			maxPercentReached.value = pct;
		}

		if (
			maxPercentReached.value >= threshold &&
			! hasReachedThreshold.value
		) {
			hasReachedThreshold.value = true;
			if ( options.onThresholdReached ) {
				options.onThresholdReached();
			}
		}
	};

	const requestIframeInfo = () => {
		if ( ! activeIframe || ! activeIframe.contentWindow ) {
			return;
		}
		try {
			activeIframe.contentWindow.postMessage(
				JSON.stringify( { event: 'command', func: 'getCurrentTime' } ),
				'*'
			);
			activeIframe.contentWindow.postMessage(
				JSON.stringify( { event: 'command', func: 'getDuration' } ),
				'*'
			);
		} catch {
			// ignore cross-origin error
		}
	};

	const startPolling = () => {
		stopPolling();
		requestIframeInfo();
		pollTimer = setInterval( () => {
			if (
				playerInstance &&
				typeof playerInstance.getCurrentTime === 'function'
			) {
				try {
					const cur = playerInstance.getCurrentTime() || 0;
					const dur = playerInstance.getDuration() || 0;
					evaluateProgress( cur, dur );
				} catch {
					requestIframeInfo();
				}
			} else {
				requestIframeInfo();
			}
		}, 500 );
	};

	const handleStateChange = ( state: number ) => {
		// 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
		if ( state === 1 ) {
			isPlaying.value = true;
			startPolling();
		} else if ( state === 2 ) {
			isPlaying.value = false;
			stopPolling();
			requestIframeInfo();
		} else if ( state === 0 ) {
			isPlaying.value = false;
			isEnded.value = true;
			progressPercent.value = 100;
			maxPercentReached.value = 100;
			hasReachedThreshold.value = true;
			stopPolling();
			if ( options.onThresholdReached ) {
				options.onThresholdReached();
			}
			if ( options.onEnded ) {
				options.onEnded();
			}
		} else {
			isPlaying.value = false;
		}
	};

	// Écouteur global postMessage de l'IFrame YouTube
	const handleWindowMessage = ( event: MessageEvent ) => {
		if ( ! event.data ) {
			return;
		}

		let data: unknown = event.data;
		if ( typeof data === 'string' ) {
			try {
				data = JSON.parse( data );
			} catch {
				return;
			}
		}

		if ( ! data || typeof data !== 'object' ) {
			return;
		}

		const payload = data as Record< string, unknown >;

		if (
			payload.event === 'infoDelivery' &&
			payload.info &&
			typeof payload.info === 'object'
		) {
			const info = payload.info as Record< string, unknown >;
			let cur = currentTime.value;
			let dur = duration.value;

			if ( typeof info.currentTime === 'number' ) {
				cur = info.currentTime;
			}
			if ( typeof info.duration === 'number' && info.duration > 0 ) {
				dur = info.duration;
			}
			if ( typeof info.playerState === 'number' ) {
				handleStateChange( info.playerState );
			}

			evaluateProgress( cur, dur );
		} else if (
			payload.event === 'onStateChange' &&
			typeof payload.info === 'number'
		) {
			handleStateChange( payload.info );
		} else if ( payload.event === 'initialDelivery' ) {
			isReady.value = true;
		}
	};

	let isBinding = false;

	const bindIframe = async ( iframeEl: HTMLIFrameElement ) => {
		if ( ! iframeEl ) {
			return;
		}
		if (
			activeIframe === iframeEl &&
			( playerInstance || isReady.value || isBinding )
		) {
			return;
		}
		isBinding = true;
		activeIframe = iframeEl;

		// Envoi du message d'écoute à l'iframe
		const sendListen = () => {
			try {
				iframeEl.contentWindow?.postMessage(
					JSON.stringify( { event: 'listening' } ),
					'*'
				);
				iframeEl.contentWindow?.postMessage(
					JSON.stringify( { event: 'command', func: 'getDuration' } ),
					'*'
				);
			} catch {
				// ignore
			}
		};

		sendListen();
		setTimeout( sendListen, 500 );
		setTimeout( sendListen, 1500 );

		// Tentative d'attachement YT.Player si l'API est disponible
		try {
			await loadYouTubeIframeApi();
			if ( window.YT && window.YT.Player && iframeEl.id ) {
				if (
					playerInstance &&
					typeof playerInstance.destroy === 'function'
				) {
					try {
						playerInstance.destroy();
					} catch {
						// ignore
					}
					playerInstance = null;
				}
				playerInstance = new window.YT.Player( iframeEl.id, {
					events: {
						onReady: ( event ) => {
							isReady.value = true;
							try {
								const dur = event.target.getDuration();
								if ( dur > 0 ) {
									duration.value = dur;
								}
							} catch {
								// ignore
							}
						},
						onStateChange: ( event ) => {
							handleStateChange( event.data );
						},
						onError: ( event ) => {
							apiError.value = `Erreur YouTube (${ event.data })`;
						},
					},
				} );
			}
		} catch ( err: unknown ) {
			// Si YT.Player échoue, postMessage assure le suivi sans problème
			apiError.value = err instanceof Error ? err.message : null;
		} finally {
			isBinding = false;
		}
	};

	const destroyPlayer = () => {
		isBinding = false;
		stopPolling();
		if ( typeof window !== 'undefined' ) {
			window.removeEventListener( 'message', handleWindowMessage );
		}
		if ( playerInstance && typeof playerInstance.destroy === 'function' ) {
			try {
				playerInstance.destroy();
			} catch {
				// ignore
			}
			playerInstance = null;
		}
		activeIframe = null;
		isReady.value = false;
		isPlaying.value = false;
	};

	if ( typeof window !== 'undefined' ) {
		window.addEventListener( 'message', handleWindowMessage );
	}

	onUnmounted( () => {
		destroyPlayer();
	} );

	const canValidate = computed( () => {
		return hasReachedThreshold.value || isEnded.value || !! apiError.value;
	} );

	return {
		isReady,
		isPlaying,
		isEnded,
		currentTime,
		duration,
		progressPercent,
		maxPercentReached,
		hasReachedThreshold,
		apiError,
		canValidate,
		threshold,
		bindIframe,
		destroyPlayer,
	};
}
