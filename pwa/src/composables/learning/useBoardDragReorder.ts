import { ref, onBeforeUnmount, type Ref } from 'vue';

export interface UseBoardDragReorderOptions {
  /** Désactive le glisser-déposer (ex: lorsque l'étape est déjà validée). */
  disabled?: Ref<boolean>;
  /** Seuil en pixels avant d'activer le mode glissement. */
  dragThresholdPx?: number;
}

/**
 * Composable de réordonnancement par glisser-déposer (Pointer Events)
 * compatible souris et tactile pour les grilles de diagrammes.
 * @param items
 * @param options
 */
export function useBoardDragReorder<T>(
  items: Ref<T[]>,
  options: UseBoardDragReorderOptions = {}
) {
  const dragSourceIndex = ref<number | null>(null);
  const dragTargetIndex = ref<number | null>(null);
  const isDraggingCard = ref(false);

  const threshold = options.dragThresholdPx ?? 6;
  let dragStartX = 0;
  let dragStartY = 0;

  const reorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    const list = [...items.value];
    const [moved] = list.splice(fromIndex, 1);
    if (moved === undefined) {
      return;
    }
    list.splice(toIndex, 0, moved);
    items.value = list;
  };

  const cleanupDragListeners = () => {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
  };

  const resetDragState = () => {
    cleanupDragListeners();
    dragSourceIndex.value = null;
    dragTargetIndex.value = null;
    isDraggingCard.value = false;
  };

  const onWindowPointerMove = (e: PointerEvent) => {
    if (dragSourceIndex.value === null) {
      return;
    }

    if (!isDraggingCard.value) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.hypot(dx, dy) < threshold) {
        return;
      }
      isDraggingCard.value = true;
    }

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el?.closest('[data-order-index]') as HTMLElement | null;
    if (card) {
      const idx = Number(card.dataset.orderIndex);
      if (!Number.isNaN(idx)) {
        dragTargetIndex.value = idx;
      }
    }
  };

  const onWindowPointerUp = () => {
    if (
      isDraggingCard.value &&
      dragSourceIndex.value !== null &&
      dragTargetIndex.value !== null &&
      dragSourceIndex.value !== dragTargetIndex.value
    ) {
      reorderItems(dragSourceIndex.value, dragTargetIndex.value);
    }
    resetDragState();
  };

  const onWindowPointerCancel = () => {
    resetDragState();
  };

  const onCardPointerDown = (e: PointerEvent, index: number) => {
    if (options.disabled?.value) {
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return;
    }
    resetDragState();
    dragSourceIndex.value = index;
    dragTargetIndex.value = index;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);
  };

  onBeforeUnmount(() => {
    cleanupDragListeners();
  });

  return {
    dragSourceIndex,
    dragTargetIndex,
    isDraggingCard,
    onCardPointerDown,
    resetDragState,
    cleanupDragListeners,
  };
}
