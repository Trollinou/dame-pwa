<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Mon Profil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="safe-area-wrapper">
        
        <!-- ÉTAT CONNECTÉ -->
        <div v-if="authStore.isAuthenticated" class="profile-container">
          <!-- En-tête du profil -->
          <div class="profile-header">
            <div class="avatar-container">
              <ion-icon :icon="personCircleOutline" class="avatar-icon"></ion-icon>
            </div>
            <h2>{{ authStore.selectedIdentity?.name || authStore.user?.name }}</h2>
            <p class="email">{{ authStore.user?.email }}</p>
            <span class="dame-badge" :class="identityBadgeClass">
              {{ identityTypeText }}
            </span>
          </div>

          <!-- Section administration (si admin) -->
          <div v-if="authStore.isAdmin" class="dame-panel">
            <div class="admin-access-content">
              <ion-icon :icon="shieldCheckmarkOutline" color="primary" class="admin-icon"></ion-icon>
              <div>
                <h3>Espace Administration</h3>
                <p>Vous disposez des accès de gestion du club.</p>
              </div>
            </div>
            <ion-button 
              expand="block" 
              color="primary" 
              fill="solid" 
              class="dame-btn-large"
              style="margin-top: 14px;"
              @click="goToAdmin"
            >
              <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
              Accéder à l'espace Administration
            </ion-button>
          </div>

          <!-- Informations & ELO (si adhérent) -->
          <div v-if="authStore.selectedIdentity?.type === 'member'" class="dame-panel">
            <h3 class="card-title">
              <ion-icon :icon="trophyOutline" color="primary"></ion-icon>
              Classements ELO
            </h3>
            <div class="dame-stat-grid dame-stat-grid--3col">
              <div class="dame-stat-box">
                <span class="dame-stat-label">Standard</span>
                <span class="dame-stat-value">{{ authStore.selectedIdentity?.elo_standard || 'N/A' }}</span>
              </div>
              <div class="dame-stat-box">
                <span class="dame-stat-label">Rapide</span>
                <span class="dame-stat-value">{{ authStore.selectedIdentity?.elo_rapide || 'N/A' }}</span>
              </div>
              <div class="dame-stat-box">
                <span class="dame-stat-label">Blitz</span>
                <span class="dame-stat-value">{{ authStore.selectedIdentity?.elo_blitz || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- Membres Associés / Famille -->
          <div v-if="hasAssociatedMembers" class="dame-panel">
            <h3 class="card-title">
              <ion-icon :icon="peopleOutline" color="primary"></ion-icon>
              Membres associés
            </h3>
            <ion-list lines="none">
              <ion-item 
                v-for="member in authStore.selectedIdentity?.associated_members" 
                :key="member.member_id"
                class="dame-list-item"
              >
                <ion-icon slot="start" :icon="personOutline" class="member-icon"></ion-icon>
                <ion-label>
                  <h4>{{ member.firstname }} {{ member.name || '' }}</h4>
                  <p>Adhérent</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>

          <!-- Personnalisation des pièces et du fond de l'échiquier -->
          <ChessThemeCustomizer />

          <!-- Actions de profil -->
          <div class="actions-container">
            <ion-button 
              v-if="hasMultipleIdentities" 
              expand="block" 
              fill="outline" 
              class="dame-btn-large"
              @click="changeIdentity"
            >
              <ion-icon slot="start" :icon="swapHorizontalOutline"></ion-icon>
              Changer de profil actif
            </ion-button>

            <!-- Déconnexion tout en bas -->
            <ion-button 
              expand="block" 
              color="danger" 
              fill="outline"
              class="dame-btn-large"
              @click="handleLogout"
            >
              <ion-icon slot="start" :icon="logOutOutline"></ion-icon>
              Se déconnecter
            </ion-button>
          </div>
        </div>

        <!-- ÉTAT NON CONNECTÉ -->
        <div v-else class="login-prompt">
          <div class="prompt-header">
            <ion-icon :icon="lockOpenOutline" class="prompt-icon"></ion-icon>
            <h2>Bienvenue sur l'application</h2>
            <p>Connectez-vous ou créez un compte pour accéder à votre espace adhérent, vos cours d'apprentissage, et gérer vos informations.</p>
          </div>
          
          <div class="prompt-actions">
            <ion-button expand="block" color="primary" @click="goToLogin" class="ion-margin-bottom">
              <ion-icon slot="start" :icon="logInOutline"></ion-icon>
              Se connecter
            </ion-button>
            <ion-button expand="block" fill="outline" color="primary" @click="goToRegister">
              <ion-icon slot="start" :icon="personAddOutline"></ion-icon>
              Créer un compte
            </ion-button>
          </div>
        </div>

        <!-- Section Système & Mises à jour PWA -->
        <div class="dame-panel" style="margin-top: 24px; margin-bottom: 32px;">
          <div class="system-info">
            <ion-icon :icon="informationCircleOutline" class="system-icon"></ion-icon>
            <div>
              <p class="system-title">Échiquier Lédonien PWA</p>
              <p class="system-version">Version {{ appVersion }}</p>
            </div>
          </div>
          <div class="system-actions">
            <ion-button 
              expand="block"
              fill="outline" 
              size="small"
              :disabled="isChecking"
              @click="handleCheckUpdate"
            >
              <ion-icon slot="start" :icon="cloudDownloadOutline"></ion-icon>
              {{ isChecking ? 'Vérification en cours...' : 'Rechercher les mises à jour' }}
            </ion-button>
            <ion-button 
              expand="block"
              fill="clear" 
              size="small"
              color="medium"
              @click="handleClearCache"
            >
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Vider le cache & actualiser
            </ion-button>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  useIonRouter,
  onIonViewWillEnter,
  onIonViewWillLeave
} from '@ionic/vue';
import {
  personCircleOutline,
  trophyOutline,
  peopleOutline,
  personOutline,
  logOutOutline,
  swapHorizontalOutline,
  shieldCheckmarkOutline,
  settingsOutline,
  lockOpenOutline,
  logInOutline,
  personAddOutline,
  informationCircleOutline,
  cloudDownloadOutline,
  refreshOutline
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePwaUpdate } from '@/composables/usePwaUpdate';
import { useFeedback } from '@/composables/useFeedback';
import ChessThemeCustomizer from '@/components/auth/profile/ChessThemeCustomizer.vue';

const router = useRouter();
const ionRouter = useIonRouter();
const authStore = useAuthStore();
const { appVersion, isChecking, checkForUpdates, clearCacheAndReload } = usePwaUpdate();
const { showInfo, showSuccess } = useFeedback();
const identitiesCount = ref(0);

const handleCheckUpdate = async () => {
  const result = await checkForUpdates();
  if (result.updated) {
    showSuccess(result.message);
  } else {
    showInfo(result.message);
  }
};

const handleClearCache = async () => {
  showInfo('Nettoyage du cache et réinitialisation en cours...', 1500);
  setTimeout(async () => {
    await clearCacheAndReload();
  }, 400);
};

const checkMultipleIdentities = async () => {
  if (!authStore.isAuthenticated) return;
  try {
    const data = await authStore.fetchMyIdentities();
    identitiesCount.value = data.length;
  } catch (error) {
    console.warn("Erreur chargement identités dans profil:", error);
  }
};

onIonViewWillEnter(() => {
  checkMultipleIdentities();
});

const identityTypeText = computed(() => {
  const type = authStore.selectedIdentity?.type;
  if (type === 'admin') return 'Administrateur';
  if (type === 'representative') return 'Responsable Légal';
  return 'Adhérent';
});

const identityBadgeClass = computed(() => {
  const type = authStore.selectedIdentity?.type;
  if (type === 'admin') return 'dame-badge--admin';
  if (type === 'representative') return 'dame-badge--rep';
  return 'dame-badge--member';
});

const hasAssociatedMembers = computed(() => {
  const members = authStore.selectedIdentity?.associated_members;
  return Array.isArray(members) && members.length > 0;
});

const hasMultipleIdentities = computed(() => {
  return identitiesCount.value > 1;
});

const goToLogin = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  router.push('/login');
};

const goToRegister = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  router.push('/register');
};

const changeIdentity = () => {
  router.push('/select-person');
};

const goToAdmin = () => {
  authStore.adminMode = true;
  ionRouter.navigate('/admin/dashboard', 'root', 'replace');
};

const handleLogout = () => {
  authStore.logout();
};

onIonViewWillLeave(() => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});
</script>
