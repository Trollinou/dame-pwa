import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const TabsPage = () => import( '@/views/layout/TabsPage.vue' );
const LoginPage = () => import( '@/views/auth/LoginPage.vue' );
const MembersPage = () => import( '@/views/admin/MembersPage.vue' );
const ContactsPage = () => import( '@/views/admin/ContactsPage.vue' );
const LeClubPage = () => import( '@/views/public/LeClubPage.vue' );
const BenevolatPage = () => import( '@/views/public/BenevolatPage.vue' );
const MessagesPage = () => import( '@/views/admin/MessagesPage.vue' );
const AdminLayout = () => import( '@/views/layout/AdminLayout.vue' );
const TournamentPage = () => import( '@/views/public/TournamentPage.vue' );
const GenericPage = () => import( '@/views/layout/GenericPage.vue' );
const EventsPage = () => import( '@/views/admin/EventsPage.vue' );

const routes: Array< RouteRecordRaw > = [
	{
		path: '/',
		redirect: '/tabs/home',
	},
	{
		path: '/login',
		component: LoginPage,
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
				component: () => import( '@/views/public/PublicHomePage.vue' ),
			},
			{
				path: 'agenda',
				component: LeClubPage,
			},
			{
				path: 'apprentissage',
				component: () =>
					import( '@/views/learning/ApprentissageHubPage.vue' ),
			},
			{
				path: 'profil',
				component: () => import( '@/views/auth/ProfilePage.vue' ),
			},
		],
	},
	// Nouveau groupe de routes d'administration protégé avec un layout dédié
	{
		path: '/admin',
		component: AdminLayout,
		meta: { requiresAuth: true, requiresAdmin: true },
		children: [
			{
				path: '',
				redirect: '/admin/dashboard',
			},
			{
				path: 'dashboard',
				component: () => import( '@/views/admin/HomePage.vue' ),
			},
			{
				path: 'members',
				component: MembersPage,
			},
			{
				path: 'members/:id',
				name: 'MemberDetail',
				component: () => import( '@/views/admin/MemberDetailPage.vue' ),
			},
			{
				path: 'contact',
				component: ContactsPage,
			},
			{
				path: 'contact/:id',
				name: 'ContactDetail',
				component: () =>
					import( '@/views/admin/ContactDetailPage.vue' ),
			},
			{
				path: 'agenda',
				component: EventsPage,
			},
			{
				path: 'agenda/:id',
				name: 'AdminAgendaDetail',
				component: () =>
					import( '@/views/admin/AdminAgendaDetailPage.vue' ),
			},
			{
				path: 'events',
				redirect: '/admin/agenda',
			},
			{
				path: 'events/:id',
				redirect: ( to ) => `/admin/agenda/${ to.params.id }`,
			},
			{
				path: 'message',
				component: MessagesPage,
			},
			{
				path: 'message/:id',
				name: 'MessageDetail',
				component: () =>
					import( '@/views/admin/MessageDetailPage.vue' ),
			},
			{
				path: 'benevolat',
				component: BenevolatPage,
			},
			{
				path: 'benevolat/:id',
				name: 'BenevolatDetail',
				component: () =>
					import( '@/views/admin/BenevolatDetailPage.vue' ),
			},
		],
	},
	// Routes publiques secondaires hors Tabs
	{
		path: '/news',
		component: () => import( '@/views/public/NewsPage.vue' ),
	},
	{
		path: '/news/:id',
		name: 'NewsDetail',
		component: () => import( '@/views/public/NewsDetailPage.vue' ),
	},
	{
		path: '/agenda/:id',
		name: 'AgendaDetail',
		component: () => import( '@/views/public/AgendaDetailPage.vue' ),
	},
	{
		path: '/tournoi',
		component: TournamentPage,
	},
	{
		path: '/benevolat',
		component: BenevolatPage,
	},
	{
		path: '/benevolat/participation/:id',
		name: 'BenevolatVote',
		meta: { requiresAuth: true },
		component: () => import( '@/views/public/BenevolatVotePage.vue' ),
	},
	{
		path: '/page/:id',
		name: 'GenericPage',
		component: GenericPage,
	},
	{
		path: '/register',
		component: () => import( '@/views/auth/RegisterPage.vue' ),
	},
	{
		path: '/pre-inscription',
		component: () => import( '@/views/public/PreInscriptionPage.vue' ),
	},
	{
		path: '/select-person',
		component: () => import( '@/views/auth/SelectPersonPage.vue' ),
		meta: { requiresAuth: true },
	},
	{
		path: '/play',
		name: 'Play',
		component: () => import( '@/views/learning/PlayPage.vue' ),
	},
	{
		path: '/analysis',
		name: 'Analysis',
		component: () => import( '@/views/learning/AnalysisPage.vue' ),
	},
	{
		path: '/apprentissage/cours',
		name: 'ApprentissageCoursList',
		component: () =>
			import( '@/views/learning/ApprentissageCoursListPage.vue' ),
		meta: { requiresAuth: true, requiresApprentissageAccess: true },
	},
	{
		path: '/contenu/:id',
		component: () => import( '@/views/learning/ContenuPage.vue' ),
		meta: { requiresAuth: true, requiresApprentissageAccess: true },
	},
	{
		path: '/cours/:id',
		component: () => import( '@/views/learning/CoursPage.vue' ),
		meta: { requiresAuth: true, requiresApprentissageAccess: true },
	},
];

const router = createRouter( {
	history: createWebHashHistory(),
	routes,
} );

// Navigation Guard (Vue Router 4 style)
router.beforeEach( ( to ) => {
	// Défocus de l'élément actif pour éviter les warnings WAI-ARIA lors des transitions de page Ionic
	if (
		typeof document !== 'undefined' &&
		document.activeElement instanceof HTMLElement
	) {
		document.activeElement.blur();
	}

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
