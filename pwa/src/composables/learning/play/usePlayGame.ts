import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import type {
	BoardCore,
	EngineStatus,
	StockfishEvaluation,
	Key,
	Move,
} from '@/components/shared/Chessboard/types';
import { useChessStore } from '@/stores/chess';
import {
	undoMove as apiUndoMove,
	getGameOverReason,
} from '@/utils/chess/boardApiWrapper';
import { normalizeCastlingMoves } from '@/utils/chess/stockfish';
import {
	analyzePositionTactics,
	classifyMoveDiff,
	judgementToGlyph,
} from '@/utils/chess/tacticalGlyphs';

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
	const lastEvalBeforeMove = ref< StockfishEvaluation | null >( null );

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
				oupsCount.value
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
		lastEvalBeforeMove.value = null;
		if ( chessStore.currentPgn ) {
			boardApi.loadPgn( chessStore.currentPgn );
			boardConfig.orientation = chessStore.orientation;
			boardConfig.playerColor = chessStore.orientation;
			boardConfig.movable.color = chessStore.orientation;
			gameSettings.level = chessStore.engineElo;
			gameSettings.playerColor = chessStore.orientation;

			helpCount.value = chessStore.helpCount || 0;
			oupsCount.value = chessStore.oupsCount || 0;
		} else {
			api.newGame();
			resetGameStartTime();
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
			oupsCount.value
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
		timerSeconds?: number
	) => {
		if ( boardConfig.viewOnly ) {
			return;
		}
		const isDraw = type === 'stalemate' || type === 'draw';
		const symbol = isDraw ? '🤝' : '🏁';
		if ( type === 'resigned' ) {
			gameStatus.message = '🏁 Partie terminée par abandon.';
			gameStatus.color = 'danger';
		} else {
			gameStatus.message = `${ symbol } ${ getGameOverReason(
				boardApi
			) }`;
			gameStatus.color = isDraw ? 'medium' : 'danger';
		}
		boardConfig.viewOnly = true;

		if ( gameSettings.gameMode === '1player' ) {
			const finalPgn = boardApi
				? boardApi.getPgn()
				: chessStore.currentPgn;
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
			void chessStore.saveCompletedGame( duration, finalPgn );
		}
	};

	const resignGame = () => {
		if ( boardConfig.viewOnly || ! boardApi ) {
			return;
		}
		handleGameOver( 'resigned' );
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
			oupsCount.value
		);

		const isHumanJustPlayed =
			gameSettings.gameMode === '1player'
				? boardApi.getTurnColor() !== boardConfig.playerColor
				: true;

		if ( gameSettings.coachMode && isHumanJustPlayed ) {
			const currentFen = boardApi.getFen();
			const playerCol = (
				boardConfig.playerColor === 'both'
					? 'white'
					: boardConfig.playerColor
			) as 'white' | 'black';
			const tactics = analyzePositionTactics( currentFen, playerCol );
			const history = ( boardApi.getHistory( true ) as Move[] ) || [];
			const lastMove =
				history.length > 0 ? history[ history.length - 1 ] : null;

			boardApi.clearGlyphs();

			for ( const sq of tactics.pinnedSquares ) {
				boardApi.setGlyph( sq, 'pin' );
			}

			if ( tactics.undefendedSquares.length > 0 && tactics.hasMajorThreat ) {
				for ( const sq of tactics.undefendedSquares ) {
					boardApi.setGlyph( sq, 'undefended' );
				}
				if ( lastMove && lastMove.to ) {
					boardApi.setGlyph( lastMove.to as Key, '??' );
				}

				isAwaitingCoachConfirmation.value = true;
				gameStatus.message =
					'⚠️ Oups ! Tu laisses une pièce sans défense. Veux-tu corriger ?';
				gameStatus.color = 'warning';
				return;
			}

			isAwaitingCoachConfirmation.value = false;
			if ( lastMove && lastMove.to ) {
				boardApi.setGlyph( lastMove.to as Key, '!' );
			}
			if ( gameStatus.color === 'warning' ) {
				gameStatus.message = '';
				gameStatus.color = 'medium';
			}
		} else {
			isAwaitingCoachConfirmation.value = false;
			if ( gameStatus.color === 'warning' ) {
				gameStatus.message = '';
				gameStatus.color = 'medium';
			}
		}

		if ( isHintEnabled.value ) {
			requestHintForPlayer();
		}
	};

	const coachUndoMove = () => {
		if ( ! boardApi ) {
			return;
		}
		isAwaitingCoachConfirmation.value = false;
		oupsCount.value++;
		boardApi.clearGlyphs();
		boardApi.hideMoves();
		lastSuggestedMove.value = '';
		lastHelpPly = null;

		apiUndoMove( boardApi, false );
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
			oupsCount.value
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
	};

	const handleEngineStatus = ( status: EngineStatus ) => {
		engineStatus.value = status;
		if ( status === 'ready' || status === 'searching' ) {
			engineLoaded.value = true;
		}
	};

	const handleEvaluation = ( evaluation: StockfishEvaluation ) => {
		currentEvaluation.value = evaluation;

		if ( gameSettings.coachMode && boardApi && isHumanTurn() ) {
			lastEvalBeforeMove.value = evaluation;
		} else if (
			gameSettings.coachMode &&
			boardApi &&
			! isHumanTurn() &&
			lastEvalBeforeMove.value &&
			! isAwaitingCoachConfirmation.value
		) {
			const playerCol = (
				boardConfig.playerColor === 'both'
					? 'white'
					: boardConfig.playerColor
			) as 'white' | 'black';
			const bestWinChance =
				playerCol === 'white'
					? lastEvalBeforeMove.value.winChancePercentage
					: 100 - lastEvalBeforeMove.value.winChancePercentage;
			const playedWinChance =
				playerCol === 'white'
					? evaluation.winChancePercentage
					: 100 - evaluation.winChancePercentage;

			const diff = Math.max( 0, bestWinChance - playedWinChance );
			const judgement = classifyMoveDiff( diff );
			const glyph = judgementToGlyph( judgement );

			const history = ( boardApi.getHistory( true ) as Move[] ) || [];
			const lastMove =
				history.length > 0 ? history[ history.length - 1 ] : null;

			if ( lastMove && lastMove.to ) {
				boardApi.setGlyph( lastMove.to as Key, glyph );
			}

			if ( diff > 30 ) {
				isAwaitingCoachConfirmation.value = true;
				gameStatus.message =
					'⚠️ Gaffe détectée (??). Veux-tu corriger ton coup ?';
				gameStatus.color = 'warning';
			}
		}
	};

	return {
		getBoardApi: () => boardApi,
		setBoardApi,
		engineLoaded,
		engineStatus,
		currentEvaluation,
		showSettings,
		isHintEnabled,
		isAwaitingCoachConfirmation,
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
		onPlayerMove,
		handleCheck,
		handleGameOver,
		resignGame,
	};
}
