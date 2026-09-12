<template>
  <div class="form-section ion-margin-top">
    <h3 class="section-title">Questionnaire de santé</h3>

    <div class="health-info-box ion-padding-bottom">
      <p>
        Veuillez consulter le questionnaire officiel. Si vous répondez "OUI" à au moins une question, vous devrez fournir un certificat médical.
      </p>
      <ion-button fill="clear" color="primary" size="small" :href="`${siteUrl}/wp-content/plugins/dame/assets/pdf/questionnaire_sante_majeur.pdf`" target="_blank">
        🔗 Ouvrir le Questionnaire Majeurs
      </ion-button>
      <ion-button fill="clear" color="primary" size="small" :href="`${siteUrl}/wp-content/plugins/dame/assets/pdf/questionnaire_sante_mineur.pdf`" target="_blank">
        🔗 Ouvrir le Questionnaire Mineurs
      </ion-button>
    </div>

    <ion-list lines="none">
      <ion-item>
        <div class="radio-group-container">
          <span class="input-label">Vos réponses au questionnaire *</span>
          <div class="radio-options vertical">
            <label><input type="radio" v-model="form.dame_health_questionnaire" value="non"> J'ai répondu NON partout</label>
            <label><input type="radio" v-model="form.dame_health_questionnaire" value="oui"> J'ai au moins une réponse à OUI</label>
          </div>
        </div>
      </ion-item>

      <!-- Si NON partout : Déclarations sur l'honneur et signature électronique intégrée -->
      <div v-if="form.dame_health_questionnaire === 'non'" class="signature-section ion-margin-top">
        <!-- 1. Attestation de santé sur l'honneur -->
        <ion-item class="ion-text-wrap consent-item">
          <ion-checkbox
            class="ion-text-wrap"
            v-model="form.health_honor_consent"
            required
            justify="start"
            label-placement="end"
            style="--size: 20px;"
          >
            <span class="consent-text">
              <strong v-if="!isMinor">Attestation sur l'honneur (Majeur) :</strong>
              <strong v-else>Attestation sur l'honneur (Représentant légal) :</strong>
              {{ isMinor
                ? "J'atteste avoir renseigné le questionnaire de santé pour mon enfant et avoir répondu par la négative à l'ensemble des rubriques.*"
                : "J'atteste avoir renseigné le questionnaire de santé FFE pour les personnes majeures et avoir répondu par la négative à l'ensemble des rubriques.*"
              }}
            </span>
          </ion-checkbox>
        </ion-item>

        <!-- 2. Autorisation parentale (si mineur) -->
        <ion-item v-if="isMinor" class="ion-text-wrap consent-item" style="margin-top: 10px;">
          <ion-checkbox
            class="ion-text-wrap"
            v-model="form.parental_consent"
            required
            justify="start"
            label-placement="end"
            style="--size: 20px;"
          >
            <span class="consent-text">
              <strong>Autorisation parentale :</strong>
              En qualité de représentant légal, j'autorise mon enfant à participer aux activités de l'Échiquier Lédonien (pratique, déplacements éventuels, hospitalisation d'extrême urgence et droit à l'image).*
            </span>
          </ion-checkbox>
        </ion-item>

        <!-- 3. Pad de signature tactile / manuscrite -->
        <SignaturePad
          v-model="form.signature_image"
          :label="isMinor ? 'Signature du représentant légal 1 (valable pour l’attestation de santé et l’autorisation parentale) *' : 'Signature manuscrite de l’adhérent *'"
        />
      </div>

      <!-- Règlement intérieur -->
      <ion-item style="margin-top: 15px;" class="ion-text-wrap">
        <ion-checkbox
          class="ion-text-wrap"
          :model-value="consentCheckbox"
          @update:model-value="$emit('update:consentCheckbox', $event)"
          required
          justify="start"
          label-placement="end"
          style="--size: 20px;"
        >
          <span class="consent-text" style="white-space: normal; display: block;">
            En cochant cette case, je reconnais avoir pris connaissance du règlement intérieur de l’Association Échiquier Lédonien et m’engage à le respecter. *
          </span>
        </ion-checkbox>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import {
  IonList,
  IonItem,
  IonButton,
  IonCheckbox
} from '@ionic/vue';
import type { PreInscriptionFormData } from '@/composables/preinscription/usePreInscriptionForm';
import SignaturePad from '@/components/common/SignaturePad.vue';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const siteUrl = apiBaseUrl.replace(/\/wp-json\/?$/, '');

const form = inject<PreInscriptionFormData>('preInscriptionForm')!;

defineProps<{
  consentCheckbox: boolean;
  isMinor?: boolean;
}>();

defineEmits<{
  (e: 'update:consentCheckbox', val: boolean): void;
}>();
</script>

<style scoped>
.section-title {
  font-size: 1.25em;
  font-weight: 700;
  color: var(--ion-color-primary);
  margin-top: 25px;
  margin-bottom: 12px;
  border-bottom: 2px solid var(--ion-color-step-100, #e0e0e0);
  padding-bottom: 6px;
}

.health-info-box {
  background: var(--ion-color-step-50, #f4f5f8);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: var(--ion-color-step-800, #444);
}

.radio-group-container {
  padding: 10px 0;
  width: 100%;
}

.input-label {
  font-size: 0.9em;
  color: var(--ion-color-medium);
  display: block;
  margin-bottom: 8px;
}

.radio-options.vertical {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-options label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95em;
  cursor: pointer;
}

.consent-text {
  font-size: 0.85em;
  line-height: 1.4;
  color: var(--ion-color-dark);
}

.consent-item {
  --padding-start: 0;
  border-left: 3px solid var(--ion-color-primary);
  padding-left: 8px;
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 4px;
}

.signature-section {
  background: var(--ion-color-step-50, #fafafa);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--ion-color-step-150, #e5e5e5);
}
</style>
