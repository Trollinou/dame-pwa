import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { alertController } from '@ionic/vue';
import type {
	BoardCore,
	EngineStatus,
	StockfishEvaluation,
	CoachAlertDetail,
} from '@/components/shared/Chessboard/types';
import { useChessStore } from '@/stores/chess';
import { useFeedback } from '@/composables/core/useFeedback';
import {
	undoMove as apiUndoMove,
	getGameOverReason,
} from '@/utils/chess/boardApiWrapper';
import { normalizeCastlingMoves } from '@/utils/chess/stockfish';
import { formatExportPgn, formatPgnDate } from '@/utils/chess/pgnExport';

function getStoredPlayerName(): string {
	try {
		if ( typeof localStorage !== 'undefined' ) {
			const storedIdentity = localStorage.getItem( 'dame_selected_identity' );
			if ( storedIdentity ) {
				const parsed = JSON.parse( storedIdentity );
				if ( parsed.name ) {
					return parsed.name;
				}
				if ( parsed.firstname ) {
					return parsed.firstname;
				}
			}
			const storedUser = localStorage.getItem( 'dame_user' );
			if ( storedUser ) {
				const parsed = JSON.parse( storedUser );
				if ( parsed.display_name ) {
					return parsed.display_name;
				}
			}
		}
	} catch {
		// ignore
	}
	return 'Adhérent';
}

export function usePlayGame() {
	const chessStore = useChessStore();
	const router = useRouter();

	let boardApi: BoardCore | null = null;
	const engineLoaded = ref( false );
	const engineStatus = ref< EngineStatus >( 'uninitialized' );
	const currentEvaluation = ref< StockfishEvaluation | null >( null );
	const showSettings = ref( false );
	const isHintEnabled = ref( false );
	const currentPly = ref( 0 );
	const oupsCount = ref( 0 );
	const helpCount = ref( 0 );
	const lastSuggestedMove = ref( '' );
	const turnColor = ref< 'white' | 'black' >( 'white' );

	const gameStatus = reactive( {
		message: '',
		color: 'medium',
	} );

	const gameStartTime = ref( Date.now() );
	const resetGameStartTime = () => {
		gameStartTime.value = Date.now();
	};
	const getGameDurationSeconds = (): number =>
		Math.max(
			0,
			Math.round( ( Date.now() - gameStartTime.value ) / 1000 )
		);

	const savedLevel = localStorage.getItem( 'dame_pwa_play_elo' );
	const initialLevel = savedLevel ? parseInt( savedLevel, 10 ) : 1320;
	const savedCoachMode = localStorage.getItem( 'dame_pwa_coach_mode' );
	const initialCoachMode = savedCoachMode !== null ? savedCoachMode === 'true' : true;

	const gameSettings = reactive( {
		gameMode: '1player' as '1player' | '2players',
		playerColor: 'white' as 'white' | 'black' | 'random',
		level: isNaN( initialLevel ) ? 1320 : initialLevel,
		coachMode: initialCoachMode,
	} );

	const isAwaitingCoachConfirmation = ref( false );

	watch(
		() => gameSettings.coachMode,
		( enabled ) => {
			localStorage.setItem( 'dame_pwa_coach_mode', enabled ? 'true' : 'false' );
			if ( ! enabled && boardApi ) {
				boardApi.clearGlyphs();
				isAwaitingCoachConfirmation.value = false;
			}
		},
		{ flush: 'sync' }
	);

	const boardConfig = reactive( {
		coordinates: true,
		autoCastling: true,
		orientation: 'white' as 'white' | 'black',
		playerColor: 'white' as 'white' | 'black' | 'both',
		movable: {
			color: 'white' as 'white' | 'black' | 'both',
		},
		viewOnly: false,
	} );

	const playerColor = computed< 'white' | 'black' >(
		() => boardConfig.orientation
	);
	const opponentColor = computed< 'white' | 'black' >( () =>
		boardConfig.orientation === 'white' ? 'black' : 'white'
	);

	const isValidSquare = ( sq: string ) => /^[a-h][1-8]$/.test( sq );

	let lastHelpPly: number | null = null;

	const isHumanTurn = (): boolean => {
		if ( ! boardApi || boardConfig.viewOnly ) {
			return false;
		}
		if ( gameSettings.gameMode === '2players' ) {
			return true;
		}
		return boardApi.getTurnColor() === boardConfig.playerColor;
	};

	const requestHintForPlayer = () => {
		if ( ! boardApi || ! isHintEnabled.value || ! isHumanTurn() ) {
			return;
		}
		normalizeCastlingMoves( boardApi );
		const ply = boardApi.getCurrentPlyNumber();
		if ( lastHelpPly !== ply ) {
			lastHelpPly = ply;
			helpCount.value++;
		}
		if ( typeof boardApi.requestHint === 'function' ) {
			boardApi.requestHint( { multiPv: 2, movetime: 1500 } );
		}
	};

	const toggleHint = () => {
		isHintEnabled.value = ! isHintEnabled.value;
		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		} else if ( boardApi ) {
			boardApi.hideMoves();
			lastSuggestedMove.value = '';
		}
	};

	const handleStockfishHint = ( bestMove: string ) => {
		if ( ! isHintEnabled.value || ! isHumanTurn() ) {
			return;
		}
		lastSuggestedMove.value = bestMove;
		if ( boardApi ) {
			const from = bestMove.substring( 0, 2 );
			const to = bestMove.substring( 2, 4 );
			if ( isValidSquare( from ) && isValidSquare( to ) ) {
				boardApi.drawMove( from, to, 'green' );
			}
		}
	};

	const handleShapesChange = () => {
		if (
			isHintEnabled.value &&
			isHumanTurn() &&
			boardApi &&
			lastSuggestedMove.value
		) {
			const shapes = boardApi.getShapes();
			if ( ! shapes || shapes.length === 0 ) {
				const from = lastSuggestedMove.value.substring( 0, 2 );
				const to = lastSuggestedMove.value.substring( 2, 4 );
				if ( isValidSquare( from ) && isValidSquare( to ) ) {
					boardApi.drawMove( from, to, 'green' );
				}
			}
		}
	};

	const goToAnalysis = () => {
		if ( boardApi ) {
			const finalPgn = boardApi.getPgn();
			const ply = boardApi.getCurrentPlyNumber();
			// Si la partie était active contre l'ordinateur et a au moins 30 demi-coups (15 coups),
			// elle est enregistrée comme abandonnée avant de basculer vers l'analyse
			if (
				! boardConfig.viewOnly &&
				gameSettings.gameMode === '1player' &&
				ply >= 30
			) {
				handleGameOver( 'resigned' );
			}
			chessStore.saveGame(
				finalPgn,
				boardConfig.orientation,
				gameSettings.level,
				helpCount.value,
				oupsCount.value,
				boardConfig.viewOnly,
				gameStatus.message,
				chessStore.gameResult,
				gameSettings.coachMode
			);
			router.push( '/analysis' );
		}
	};

	const refreshDisplay = () => {
		if ( boardApi ) {
			currentPly.value = boardApi.getCurrentPlyNumber();
			turnColor.value = boardApi.getTurnColor();
		}
	};

	const setBoardApi = ( api: BoardCore ) => {
		boardApi = api;
		lastHelpPly = null;
		isAwaitingCoachConfirmation.value = false;
		if ( chessStore.currentPgn ) {
			boardApi.loadPgn( chessStore.currentPgn );
			boardConfig.orientation = chessStore.orientation;
			boardConfig.playerColor = chessStore.orientation;
			boardConfig.movable.color = chessStore.orientation;
			gameSettings.level = chessStore.engineElo;
			gameSettings.playerColor = chessStore.orientation;

			helpCount.value = chessStore.helpCount || 0;
			oupsCount.value = chessStore.oupsCount || 0;

			// Vérifier si la partie rechargée était déjà terminée
			const isEnded = chessStore.isGameOver || boardApi.getIsGameOver();
			if ( isEnded ) {
				boardConfig.viewOnly = true;
				if ( chessStore.gameOverReason ) {
					gameStatus.message = chessStore.gameOverReason;
					gameStatus.color =
						chessStore.gameResult === '1/2-1/2'
							? 'medium'
							: 'danger';
				} else {
					gameStatus.message = `🏁 ${ getGameOverReason( boardApi ) }`;
					gameStatus.color = 'danger';
				}
			} else {
				boardConfig.viewOnly = false;
			}
		} else {
			api.newGame();
			resetGameStartTime();
			boardConfig.viewOnly = false;
		}
		refreshDisplay();
		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		}
	};

	const resetHelpState = () => {
		lastHelpPly = null;
		lastSuggestedMove.value = '';
	};

	const undoMove = () => {
		if ( boardConfig.viewOnly ) {
			return;
		}
		if ( ! boardApi || boardApi.getCurrentPlyNumber() === 0 ) {
			return;
		}

		isAwaitingCoachConfirmation.value = false;
		oupsCount.value++;
		boardApi.hideMoves();
		boardApi.clearGlyphs();
		lastSuggestedMove.value = '';
		lastHelpPly = null;

		apiUndoMove( boardApi, true );
		boardConfig.viewOnly = false;
		if ( boardApi.getIsCheck() ) {
			const checkColor = boardApi.getInCheckColor();
			if ( checkColor ) {
				gameStatus.message = `⚠️ Échec au Roi ${
					checkColor === 'white' ? 'Blanc' : 'Noir'
				} !`;
				gameStatus.color = 'warning';
			}
		} else {
			gameStatus.message = '';
			gameStatus.color = 'medium';
		}
		refreshDisplay();

		chessStore.saveGame(
			boardApi.getPgn(),
			boardConfig.orientation,
			gameSettings.level,
			helpCount.value,
			oupsCount.value,
			false,
			'',
			'*',
			gameSettings.coachMode
		);

		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		}
	};

	const handleCheck = ( color: string ) => {
		gameStatus.message = `⚠️ Échec au Roi ${
			color === 'white' ? 'Blanc' : 'Noir'
		} !`;
		gameStatus.color = 'warning';
	};

	const handleGameOver = (
		type: 'checkmate' | 'stalemate' | 'draw' | 'resigned',
		timerSeconds?: number,
		resignedColor?: string
	) => {
		if ( boardConfig.viewOnly ) {
			return;
		}
		isAwaitingCoachConfirmation.value = false;
		const isDraw = type === 'stalemate' || type === 'draw';
		const symbol = isDraw ? '🤝' : '🏁';
		let result = '*';

		if ( type === 'resigned' ) {
			const resigned =
				resignedColor ||
				( boardConfig.orientation === 'white' ? 'white' : 'black' );
			result = resigned === 'white' ? '0-1' : '1-0';
			const winner = resigned === 'white' ? 'Noirs' : 'Blancs';
			gameStatus.message = `🏁 Partie terminée par abandon. Victoire des ${ winner }.`;
			gameStatus.color = 'danger';
		} else if ( isDraw ) {
			result = '1/2-1/2';
			gameStatus.message = `${ symbol } ${ getGameOverReason( boardApi ) }`;
			gameStatus.color = 'medium';
		} else if ( type === 'checkmate' ) {
			const loser = boardApi?.getTurnColor() || 'white';
			result = loser === 'white' ? '0-1' : '1-0';
			gameStatus.message = `${ symbol } ${ getGameOverReason( boardApi ) }`;
			gameStatus.color = 'danger';
		}

		boardConfig.viewOnly = true;

		// Enrichir le PGN avec en-têtes complets Seven Tag Roster + entraînement
		const playerName = getStoredPlayerName();
		const isPlayerWhite = boardConfig.orientation === 'white';

		let eventName = "Partie contre l'ordinateur";
		if ( gameSettings.coachMode ) {
			eventName = 'Partie en Mode Coach';
		} else if ( gameSettings.gameMode === '2players' ) {
			eventName = 'Partie locale 2 joueurs';
		}

		let whitePlayer = isPlayerWhite
			? playerName
			: `Stockfish (Niveau ${ gameSettings.level })`;
		let blackPlayer = ! isPlayerWhite
			? playerName
			: `Stockfish (Niveau ${ gameSettings.level })`;
		if ( gameSettings.gameMode === '2players' ) {
			whitePlayer = 'Joueur 1 (Blancs)';
			blackPlayer = 'Joueur 2 (Noirs)';
		}

		const rawPgn = boardApi ? boardApi.getPgn() : chessStore.currentPgn;
		const enrichedPgn = formatExportPgn( {
			pgn: rawPgn,
			event: eventName,
			site: 'DAME PWA',
			date: formatPgnDate(),
			round: '1',
			white: whitePlayer,
			black: blackPlayer,
			result,
			whiteElo: isPlayerWhite ? undefined : gameSettings.level,
			blackElo: ! isPlayerWhite ? undefined : gameSettings.level,
			variant: 'Standard',
			termination: gameStatus.message,
			annotator: gameSettings.coachMode ? 'DAME Coach' : undefined,
			takebacks: oupsCount.value,
			hints: helpCount.value,
		} );

		chessStore.saveGame(
			enrichedPgn,
			boardConfig.orientation,
			gameSettings.level,
			helpCount.value,
			oupsCount.value,
			true,
			gameStatus.message,
			result,
			gameSettings.coachMode
		);

		if ( gameSettings.gameMode === '1player' && ! gameSettings.coachMode ) {
			const ply = boardApi
				? boardApi.getCurrentPlyNumber()
				: currentPly.value;
			// Règle métier : les abandons ne sont enregistrés que s'ils atteignent au moins 30 ply (15 coups)
			if ( type === 'resigned' && ply < 30 ) {
				return;
			}
			const duration =
				typeof timerSeconds === 'number' && timerSeconds > 0
					? timerSeconds
					: getGameDurationSeconds();
			void chessStore.saveCompletedGame( duration, enrichedPgn, false );
		}
	};

	const confirmResign = async () => {
		if ( boardConfig.viewOnly || ! boardApi ) {
			return;
		}
		const alert = await alertController.create( {
			header: 'Abandonner la partie ?',
			message:
				currentPly.value >= 30
					? 'La partie sera enregistrée comme abandonnée dans votre historique (au moins 15 coups complets joués).'
					: 'La partie est trop courte (< 15 coups complets) pour être enregistrée.',
			buttons: [
				{
					text: 'Continuer',
					role: 'cancel',
				},
				{
					text: 'Abandonner',
					role: 'destructive',
					handler: () => {
						resignGame();
					},
				},
			],
		} );
		await alert.present();
	};

	const handleResign = (
		detail?:
			| { color: 'white' | 'black'; winner: 'white' | 'black' }
			| string
	) => {
		const color = typeof detail === 'string' ? detail : detail?.color;
		handleGameOver( 'resigned', undefined, color );
	};

	const offerDraw = () => {
		if ( boardConfig.viewOnly || ! boardApi ) {
			return;
		}
		if (
			typeof (
				boardApi as unknown as {
					offerDraw?: ( _col?: string ) => unknown;
				}
			).offerDraw === 'function'
		) {
			(
				boardApi as unknown as {
					offerDraw: ( _col?: string ) => unknown;
				}
			).offerDraw(
				boardConfig.playerColor === 'both'
					? undefined
					: boardConfig.playerColor
			);
		}
	};

	const handleDrawDeclined = ( detail?: { reason?: string } ) => {
		const { showToast } = useFeedback();
		const reason = detail?.reason;
		if ( reason === 'too_early' ) {
			void showToast(
				'Stockfish refuse la nulle : moins de 20 coups complets ont été joués.',
				'warning'
			);
		} else {
			void showToast(
				"Stockfish refuse la nulle : l'ordinateur estime avoir l'avantage.",
				'warning'
			);
		}
	};

	const handleDrawOffer = async (
		detail?: { color?: string } | 'white' | 'black'
	) => {
		const color = typeof detail === 'string' ? detail : detail?.color;
		const offeringColor = color === 'white' ? 'Blancs' : 'Noirs';
		const alert = await alertController.create( {
			header: 'Proposition de nulle',
			message: `Les ${ offeringColor } proposent la partie nulle. Acceptez-vous ?`,
			backdropDismiss: false,
			buttons: [
				{
					text: 'Refuser',
					role: 'cancel',
					handler: () => {
						if (
							typeof (
								boardApi as unknown as {
									declineDraw?: () => void;
								}
							)?.declineDraw === 'function'
						) {
							(
								boardApi as unknown as {
									declineDraw: () => void;
								}
							).declineDraw();
						}
					},
				},
				{
					text: 'Accepter',
					handler: () => {
						if (
							typeof (
								boardApi as unknown as {
									agreeDraw?: () => void;
								}
							)?.agreeDraw === 'function'
						) {
							(
								boardApi as unknown as {
									agreeDraw: () => void;
								}
							).agreeDraw();
						} else if (
							typeof (
								boardApi as unknown as {
									acceptDraw?: () => void;
								}
							)?.acceptDraw === 'function'
						) {
							(
								boardApi as unknown as {
									acceptDraw: () => void;
								}
							).acceptDraw();
						}
					},
				},
			],
		} );
		await alert.present();
	};

	const resignGame = () => {
		if ( boardConfig.viewOnly || ! boardApi ) {
			return;
		}
		if (
			typeof (
				boardApi as unknown as {
					resign?: ( _col?: string ) => void;
				}
			)?.resign === 'function'
		) {
			(
				boardApi as unknown as {
					resign: ( _col?: string ) => void;
				}
			).resign(
				boardConfig.playerColor === 'both'
					? undefined
					: boardConfig.playerColor
			);
		} else {
			handleGameOver( 'resigned' );
		}
	};

	const onPlayerMove = () => {
		if ( ! boardApi ) {
			return;
		}

		refreshDisplay();

		lastSuggestedMove.value = '';
		boardApi.hideMoves();

		chessStore.saveGame(
			boardApi.getPgn(),
			boardConfig.orientation,
			gameSettings.level,
			helpCount.value,
			oupsCount.value,
			false,
			'',
			'*',
			gameSettings.coachMode
		);

		isAwaitingCoachConfirmation.value = false;
		if ( gameStatus.color === 'warning' ) {
			gameStatus.message = '';
			gameStatus.color = 'medium';
		}

		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		}
	};

	const handleCoachAlert = ( detail: CoachAlertDetail ) => {
		isAwaitingCoachConfirmation.value = true;
		gameStatus.message =
			detail.reason === 'bad_trade'
				? '⚠️ Oups ! Cet échange semble défavorable. Veux-tu corriger ?'
				: '⚠️ Oups ! Tu laisses une pièce sans défense. Veux-tu corriger ?';
		gameStatus.color = 'warning';
	};

	const coachUndoMove = () => {
		if ( ! boardApi ) {
			return;
		}
		isAwaitingCoachConfirmation.value = false;
		oupsCount.value++;
		boardApi.hideMoves();
		lastSuggestedMove.value = '';
		lastHelpPly = null;

		if ( typeof boardApi.coachUndo === 'function' ) {
			boardApi.coachUndo();
		} else {
			boardApi.clearGlyphs();
			apiUndoMove( boardApi, false );
		}
		boardConfig.viewOnly = false;
		refreshDisplay();

		gameStatus.message =
			'Tu as repris ton coup. À toi de trouver une meilleure case !';
		gameStatus.color = 'primary';

		chessStore.saveGame(
			boardApi.getPgn(),
			boardConfig.orientation,
			gameSettings.level,
			helpCount.value,
			oupsCount.value,
			false,
			'',
			'*',
			gameSettings.coachMode
		);

		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		}
	};

	const coachProceed = () => {
		if ( ! boardApi ) {
			return;
		}
		isAwaitingCoachConfirmation.value = false;
		gameStatus.message = '';
		gameStatus.color = 'medium';
		if ( typeof boardApi.coachProceed === 'function' ) {
			boardApi.coachProceed();
		}
	};

	const handleEngineStatus = ( status: EngineStatus ) => {
		engineStatus.value = status;
		if ( status === 'ready' || status === 'searching' ) {
			engineLoaded.value = true;
		}
	};

	const handleEvaluation = ( evaluation: StockfishEvaluation ) => {
		currentEvaluation.value = evaluation;
	};

	const isGameOver = computed(
		() => boardConfig.viewOnly || chessStore.isGameOver
	);

	return {
		getBoardApi: () => boardApi,
		setBoardApi,
		engineLoaded,
		engineStatus,
		currentEvaluation,
		showSettings,
		isHintEnabled,
		isAwaitingCoachConfirmation,
		isGameOver,
		currentPly,
		turnColor,
		oupsCount,
		helpCount,
		lastSuggestedMove,
		gameStatus,
		gameSettings,
		boardConfig,
		playerColor,
		opponentColor,
		isHumanTurn,
		requestHintForPlayer,
		resetHelpState,
		resetGameStartTime,
		toggleHint,
		handleStockfishHint,
		handleEngineStatus,
		handleEvaluation,
		handleShapesChange,
		goToAnalysis,
		refreshDisplay,
		undoMove,
		coachUndoMove,
		coachProceed,
		handleCoachAlert,
		onPlayerMove,
		handleCheck,
		handleGameOver,
		resignGame,
		confirmResign,
		handleResign,
		offerDraw,
		handleDrawDeclined,
		handleDrawOffer,
	};
}
