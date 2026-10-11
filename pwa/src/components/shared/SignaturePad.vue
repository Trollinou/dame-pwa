<template>
  <div class="signature-pad-container">
    <div class="signature-pad-header">
      <span class="signature-label">{{ label || 'Signature manuscrite *' }}</span>
      <ion-button fill="clear" size="small" color="medium" @click="clear">
        <ion-icon slot="start" :icon="trashOutline"></ion-icon>
        Effacer
      </ion-button>
    </div>

    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        @pointerdown="startDrawing"
        @pointermove="draw"
        @pointerup="stopDrawing"
        @pointercancel="stopDrawing"
      ></canvas>
      <div v-if="isEmpty" class="canvas-placeholder">
        Signez ici (tactile ou souris)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';

const props = defineProps<{
  modelValue?: string;
  label?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const isEmpty = ref(true);

let ctx: CanvasRenderingContext2D | null = null;

const resizeCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;

  let tempImage: ImageData | null = null;
  if (ctx && canvas.width > 0 && canvas.height > 0 && !isEmpty.value) {
    tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 160 * dpr;

  ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#000000';

    if (tempImage) {
      ctx.putImageData(tempImage, 0, 0);
    }
  }
};

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  if (!props.modelValue) {
    clear();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas);
});

watch(
  () => props.modelValue,
  (val) => {
    if (!val && !isEmpty.value) {
      clear();
    }
  }
);

const getPointerPos = (e: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

const startDrawing = (e: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return;

  canvas.setPointerCapture(e.pointerId);
  isDrawing.value = true;
  const { x, y } = getPointerPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
};

const draw = (e: PointerEvent) => {
  if (!isDrawing.value || !ctx) return;
  const { x, y } = getPointerPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  isEmpty.value = false;
};

const stopDrawing = (e: PointerEvent) => {
  if (!isDrawing.value) return;
  const canvas = canvasRef.value;
  if (canvas) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }
  }
  isDrawing.value = false;
  exportSignature();
};

const clear = () => {
  const canvas = canvasRef.value;
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  isEmpty.value = true;
  emit('update:modelValue', '');
};

const exportSignature = () => {
  const canvas = canvasRef.value;
  if (!canvas || isEmpty.value) {
    emit('update:modelValue', '');
    return;
  }
  const dataUrl = canvas.toDataURL('image/png');
  emit('update:modelValue', dataUrl);
};
</script>
