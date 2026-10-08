<template>
  <div class="form-section">
    <h3 class="section-title">Informations de l'adhérent</h3>

    <ion-list lines="full" class="ion-no-padding">
      <ion-item>
        <ion-input
          v-model="form.dame_birth_name"
          label="Nom de naissance *"
          label-placement="stacked"
          required
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_last_name"
          label="Nom d'usage"
          label-placement="stacked"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_first_name"
          label="Prénom *"
          label-placement="stacked"
          required
        ></ion-input>
      </ion-item>

      <ion-item>
        <div class="radio-group-container">
          <span class="input-label">Sexe *</span>
          <div class="radio-options">
            <label><input type="radio" v-model="form.dame_sexe" value="Masculin"> Masculin</label>
            <label><input type="radio" v-model="form.dame_sexe" value="Féminin"> Féminin</label>
            <label><input type="radio" v-model="form.dame_sexe" value="Non précisé"> Non précisé</label>
          </div>
        </div>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_birth_date"
          type="date"
          label="Date de naissance *"
          label-placement="stacked"
          required
          @ionChange="$emit('check-age')"
        ></ion-input>
      </ion-item>

      <!-- Ville de naissance avec autocomplétion -->
      <ion-item>
        <ion-input
          v-model="form.dame_birth_city"
          label="Lieu de naissance"
          label-placement="stacked"
          @ionInput="(e: CustomEvent) => $emit('search-birth-city', e.detail.value || '')"
          :placeholder="isMinor ? '' : 'Obligatoire pour les majeurs'"
        ></ion-input>
      </ion-item>
      <div v-if="suggestions.birthCity.length > 0" class="suggestions-outer-container">
        <ul class="suggestions-list">
          <li
            v-for="s in suggestions.birthCity"
            :key="s"
            @click="$emit('select-birth-city', s)"
          >
            {{ s }}
          </li>
        </ul>
      </div>

      <ion-item>
        <ion-input
          v-model="form.dame_phone_number"
          type="tel"
          label="Numéro de téléphone *"
          label-placement="stacked"
          required
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_email"
          type="email"
          label="Email *"
          label-placement="stacked"
          required
        ></ion-input>
      </ion-item>

      <ion-item lines="none" class="optin-item ion-text-wrap" style="--background: transparent; margin-top: -5px; margin-bottom: 5px;">
        <ion-checkbox
          class="ion-text-wrap"
          v-model="form.dame_refuses_comms"
          style="--size: 18px; font-size: 0.85em; --border-radius: 4px;"
        >
          <span style="white-space: normal; line-height: 1.3; display: block; color: var(--ion-color-medium); font-size: 0.9em; margin-left: 8px;">
            Je m'oppose à la réception des e-mails d'information de l'association.
          </span>
        </ion-checkbox>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_profession"
          label="Profession"
          label-placement="stacked"
        ></ion-input>
      </ion-item>

      <!-- Adresse avec autocomplétion -->
      <ion-item>
        <ion-input
          v-model="form.dame_address_1"
          label="Adresse *"
          label-placement="stacked"
          required
          @ionInput="(e: CustomEvent) => $emit('search-address', e.detail.value || '')"
        ></ion-input>
      </ion-item>
      <div v-if="suggestions.address.length > 0" class="suggestions-outer-container">
        <ul class="suggestions-list">
          <li
            v-for="s in suggestions.address"
            :key="s.fulltext"
            @click="$emit('select-address', s)"
          >
            {{ s.fulltext }}
          </li>
        </ul>
      </div>

      <ion-item>
        <ion-input
          v-model="form.dame_address_2"
          label="Complément d'adresse"
          label-placement="stacked"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_postal_code"
          label="Code Postal"
          label-placement="stacked"
          style="max-width: 120px;"
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-input
          v-model="form.dame_city"
          label="Ville *"
          label-placement="stacked"
          required
        ></ion-input>
      </ion-item>

      <ion-item>
        <ion-select
          v-model="form.dame_taille_vetements"
          label="Taille de vêtements"
          label-placement="stacked"
        >
          <ion-select-option v-for="size in clothingSizes" :key="size" :value="size">
            {{ size }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-select
          v-model="form.dame_license_type"
          label="Type de licence *"
          label-placement="stacked"
          required
        >
          <ion-select-option value="A">Licence A (Cours + Compétition)</ion-select-option>
          <ion-select-option value="B">Licence B (Jeu libre)</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import {
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCheckbox
} from '@ionic/vue';
import type { PreInscriptionFormData } from '@/composables/public/preinscription/usePreInscriptionForm';
import type { GeoAddressResult } from '@/utils/geoApi';

const form = inject<PreInscriptionFormData>('preInscriptionForm')!;

defineProps<{
  clothingSizes: string[];
  isMinor: boolean;
  suggestions: {
    birthCity: string[];
    address: GeoAddressResult[];
  };
}>();

defineEmits<{
  (e: 'check-age'): void;
  (e: 'search-birth-city', query: string): void;
  (e: 'select-birth-city', city: string): void;
  (e: 'search-address', query: string): void;
  (e: 'select-address', feature: GeoAddressResult): void;
}>();
</script>
