import { ref, computed } from 'vue';

export interface CardNavigationOptions {
	/**
	 * Callback ou délai automatique avant passage à la carte suivante (en ms).
	 * Par exemple 800ms pour laisser le feedback vert s'afficher.
	 */
	autoAdvanceDelay?: number;
}

/**
 * Composable standardisant la logique de progression dans les séries d'exercices ou étapes.
 *
 * @param totalCardsGetter - Nombre total de cartes (ou getter réactif)
 * @param onCompleted      - Action déclenchée quand la dernière carte est validée
 * @param onNext           - Action optionnelle déclenchée à chaque passage de carte
 *
 * @example
 * ```ts
 * const emit = defineEmits<{ (e: 'success'): void; (e: 'next'): void }>();
 * const { currentCard, isSolved, isLastCard, next, markSolved } = useCardNavigation(
 *   () => props.totalCards || 1,
 *   () => emit('success'),
 *   () => emit('next')
 * );
 * ```
 */
export function useCardNavigation(
	totalCardsGetter: number | ( () => number ),
	onCompleted?: () => void,
	onNext?: ( _newCardIndex: number ) => void
) {
	const currentCard = ref( 1 );
	const isSolved = ref( false );

	const getTotalCards = (): number => {
		if ( typeof totalCardsGetter === 'function' ) {
			return totalCardsGetter() || 1;
		}
		return totalCardsGetter || 1;
	};

	const isLastCard = computed( () => currentCard.value >= getTotalCards() );

	/**
	 * Passe à la carte suivante ou signale la réussite finale si on était sur la dernière carte.
	 */
	const next = () => {
		const total = getTotalCards();
		if ( currentCard.value < total ) {
			currentCard.value++;
			isSolved.value = false;
			if ( onNext ) {
				onNext( currentCard.value );
			}
		} else if ( onCompleted ) {
			onCompleted();
		}
	};

	/**
	 * Marque la carte courante comme réussie et permet optionnellement d'enchaîner après un délai.
	 * @param options
	 */
	const markSolved = ( options?: CardNavigationOptions ) => {
		isSolved.value = true;
		if ( options?.autoAdvanceDelay && options.autoAdvanceDelay > 0 ) {
			setTimeout( () => {
				next();
			}, options.autoAdvanceDelay );
		}
	};

	/**
	 * Réinitialise la carte et l'état de résolution.
	 * @param targetCard
	 */
	const reset = ( targetCard = 1 ) => {
		currentCard.value = targetCard;
		isSolved.value = false;
	};

	return {
		currentCard,
		isSolved,
		isLastCard,
		next,
		markSolved,
		reset,
	};
}
