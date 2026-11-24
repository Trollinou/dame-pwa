<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Connexion Echiquier Lédonien</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        <div class="login-container">
          <!-- Message de redirection contextuel -->
          <div v-if="redirectMessage" class="dame-banner dame-banner--primary">
            <ion-icon :icon="informationCircleOutline" color="primary"></ion-icon>
            <p>{{ redirectMessage }}</p>
          </div>

          <div class="login-header">
            <h2>Bienvenue</h2>
            <p v-if="!twoFactorChallenge">Connectez-vous à votre dossier administratif</p>
            <p v-else>Vérification en deux étapes requise</p>
          </div>

          <div v-if="twoFactorChallenge" class="dame-banner dame-banner--primary ion-margin-bottom">
            <ion-icon :icon="shieldCheckmarkOutline" color="primary"></ion-icon>
            <p>{{ getTwoFactorProviderLabel(twoFactorChallenge.provider) }}</p>
          </div>

          <form v-if="!twoFactorChallenge" @submit.prevent="handleSubmit">
            <ion-item lines="full" class="ion-margin-bottom">
              <ion-label position="stacked">Identifiant</ion-label>
              <ion-input
                v-model="credentials.username"
                type="text"
                placeholder="Nom d'utilisateur"
                :autocorrect="false"
                autocomplete="off"
                required
              ></ion-input>
            </ion-item>

            <ion-item lines="full" class="ion-margin-bottom">
              <ion-label position="stacked">Mot de passe</ion-label>
              <ion-input
                v-model="credentials.password"
                type="password"
                placeholder="••••••••"
                required
              ></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              type="submit"
              class="ion-margin-top"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
            </ion-button>
            
            <div class="ion-text-center ion-margin-top">
              <ion-button fill="clear" @click="goToRegister" color="medium">
                Pas encore de compte ? S'inscrire
              </ion-button>
            </div>

            <div class="ion-text-center">
              <ion-button fill="clear" @click="handleCancel" color="medium">
                Annuler
              </ion-button>
            </div>
          </form>

          <form v-else @submit.prevent="handleVerifyTwoFactor">
            <ion-item lines="full" class="ion-margin-bottom">
              <ion-label position="stacked">Code de vérification</ion-label>
              <ion-input
                v-model="twoFactorCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                :autocorrect="false"
                placeholder="Code à 6 chiffres"
                required
              ></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              type="submit"
              class="ion-margin-top"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Vérification en cours...' : 'Valider le code' }}
            </ion-button>

            <div class="ion-text-center ion-margin-top">
              <ion-button fill="clear" @click="handleCancelTwoFactor" color="medium">
                Retour à la connexion
              </ion-button>
            </div>
          </form>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  onIonViewWillLeave
} from '@ionic/vue';
import { informationCircleOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { reactive, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getTwoFactorProviderLabel } from '@/stores/auth/jwtService';
import { storeToRefs } from 'pinia';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { isLoading, twoFactorChallenge } = storeToRefs(authStore);

// Force reset isLoading to false to avoid being stuck if it was persisted as true
authStore.isLoading = false;

// Récupération du message de redirection depuis les paramètres d'URL
const redirectMessage = computed(() => route.query.message as string);

// État du formulaire
const credentials = reactive({
  username: '',
  password: ''
});
const twoFactorCode = ref('');

/**
 * Gère la soumission du formulaire
 */
const handleSubmit = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  twoFactorCode.value = '';
  authStore.login(credentials.username, credentials.password);
};

const handleVerifyTwoFactor = async () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const success = await authStore.verifyTwoFactor(twoFactorCode.value);
  if (success) {
    twoFactorCode.value = '';
  }
};

const handleCancelTwoFactor = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  twoFactorCode.value = '';
  authStore.cancelTwoFactor();
};

const goToRegister = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  router.push('/tabs/register');
};

const handleCancel = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push('/tabs/home');
  }
};

/**
 * Sécurité Accessibilité : Retire le focus de l'élément actif lors du changement de page
 * Évite l'avertissement "Blocked aria-hidden on an element because its descendant retained focus"
 */
onIonViewWillLeave(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  twoFactorCode.value = '';
  if (twoFactorChallenge.value) {
    authStore.cancelTwoFactor();
  }
});
</script>
