import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue';
import { useAuthStore } from '@/stores/auth';

const routes: Array< RouteRecordRaw > = [
	{
		path: '/',
		redirect: '/tabs/home',
	},
	{
		path: '/login',
		component: () => import( '../views/LoginPage.vue' ),
	},
	{
		path: '/tabs/login',
		redirect: '/login',
	},
	// Routes principales de la navigation PWA (Tabs)
	{
		path: '/tabs/',
		component: TabsPage,
		children: [
			{
				path: '',
				redirect: '/tabs/home',
			},
			{
				path: 'home',
				component: () => import( '../views/PublicHomePage.vue' ),
			},
			{
				path: 'agenda',
				component: () => import( '../views/LeClubPage.vue' ),
			},
			{
				path: 'apprentissage',
				component: () => import( '../views/ApprentissageHubPage.vue' ),
				meta: { requiresAuth: true, requiresApprentissageAccess: true },
			},
			{
				path: 'profil',
				component: () => import( '../views/ProfilePage.vue' ),
			},
		],
	},
	// Nouveau groupe de routes d'administration protégé avec un layout dédié
	{
		path: '/admin',
		component: () => import( '../views/AdminLayout.vue' ),
		meta: { requiresAuth: true, requiresAdmin: true },
		children: [
			{
				path: '',
				redirect: '/admin/dashboard',
			},
			{
				path: 'dashboard',
				component: () => import( '../views/HomePage.vue' ),
			},
			{
				path: 'members',
				component: () => import( '../views/MembersPage.vue' ),
			},
			{
				path: 'members/:id',
				name: 'MemberDetail',
				component: () => import( '@/views/MemberDetailPage.vue' ),
			},
			{
				path: 'contact',
				component: () => import( '../views/ContactsPage.vue' ),
			},
			{
				path: 'contact/:id',
				name: 'ContactDetail',
				component: () => import( '@/views/ContactDetailPage.vue' ),
			},
			{
				path: 'message',
				component: () => import( '../views/MessagesPage.vue' ),
			},
			{
				path: 'message/:id',
				name: 'MessageDetail',
				component: () => import( '@/views/MessageDetailPage.vue' ),
			},
			{
				path: 'benevolat',
				component: () => import( '../views/BenevolatPage.vue' ),
			},
			{
				path: 'benevolat/:id',
				name: 'BenevolatDetail',
				component: () => import( '@/views/BenevolatDetailPage.vue' ),
			},
		],
	},
	// Routes publiques secondaires hors Tabs
	{
		path: '/news',
		component: () => import( '../views/NewsPage.vue' ),
	},
	{
		path: '/news/:id',
		name: 'NewsDetail',
		component: () => import( '../views/NewsDetailPage.vue' ),
	},
	{
		path: '/agenda/:id',
		name: 'AgendaDetail',
		component: () => import( '@/views/AgendaDetailPage.vue' ),
	},
	{
		path: '/tournoi',
		component: () => import( '../views/TournamentPage.vue' ),
	},
	{
		path: '/benevolat',
		component: () => import( '../views/BenevolatPage.vue' ),
	},
	{
		path: '/benevolat/participation/:id',
		name: 'BenevolatVote',
		meta: { requiresAuth: true },
		component: () => import( '@/views/BenevolatVotePage.vue' ),
	},
	{
		path: '/page/:id',
		name: 'GenericPage',
		component: () => import( '../views/GenericPage.vue' ),
	},
	{
		path: '/register',
		component: () => import( '../views/RegisterPage.vue' ),
	},
	{
		path: '/pre-inscription',
		component: () => import( '../views/PreInscriptionPage.vue' ),
	},
	{
		path: '/select-person',
		component: () => import( '../views/SelectPersonPage.vue' ),
		meta: { requiresAuth: true },
	},
	{
		path: '/contenu/:id',
		component: () => import( '../views/ContenuPage.vue' ),
		meta: { requiresAuth: true, requiresApprentissageAccess: true },
	},
	{
		path: '/cours/:id',
		component: () => import( '../views/CoursPage.vue' ),
		meta: { requiresAuth: true, requiresApprentissageAccess: true },
	},
];

const router = createRouter( {
	history: createWebHashHistory(),
	routes,
} );

// Navigation Guard (Vue Router 4 style)
router.beforeEach( ( to ) => {
	const authStore = useAuthStore();

	// 1. Vérification de l'authentification de base
	if ( to.meta.requiresAuth && ! authStore.isAuthenticated ) {
		return {
			path: '/login',
			query: {
				message: 'Vous devez être connecté pour accéder à cette page.',
			},
		};
	}

	// 2. Vérification des droits d'administration
	if ( to.meta.requiresAdmin && ! authStore.isAdmin ) {
		return {
			path: '/tabs/home',
			query: { message: 'Accès refusé : Droits insuffisants.' },
		};
	}

	// 2b. Vérification adhérent
	if ( to.meta.requiresAdherent && ! authStore.isAdherent ) {
		return {
			path: '/tabs/home',
			query: { message: 'Accès réservé aux adhérents.' },
		};
	}

	// 3. Vérification de l'activation du module de jeu (requiert ROI)
	const chessRoutes = [ '/tabs/play', '/tabs/analysis' ];
	if ( chessRoutes.includes( to.path ) && ! authStore.isRoiActive ) {
		return {
			path: '/tabs/home',
		};
	}

	// 4. Vérification de l'accès au module Apprentissage
	if (
		to.meta.requiresApprentissageAccess &&
		! authStore.canAccessApprentissage
	) {
		return {
			path: '/tabs/home',
			query: {
				message:
					"Vous n'avez pas l'autorisation d'accéder au module Apprentissage.",
			},
		};
	}

	return true;
} );

export default router;
