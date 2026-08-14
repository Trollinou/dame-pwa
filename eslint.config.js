import wordpress from '@wordpress/eslint-plugin';

export default [
	{
		ignores: [
			'node_modules/**',
			'vendor/**',
			'build/**',
			'dist/**',
			'pwa/dist/**',
			'assets/js/*.min.js',
		],
	},
	...wordpress.configs.recommended,
	{
		languageOptions: {
			globals: {
				// On déclare les outils globaux de WordPress et du navigateur
				jQuery: 'readonly',
				ajaxurl: 'readonly',
				confirm: 'readonly',
				alert: 'readonly',
				history: 'readonly',
				console: 'readonly',
				// On autorise vos objets de données localisés (les variables PHP passées au JS)
				dame_admin_data: 'readonly',
				dame_mailing_data: 'readonly',
				dame_agenda_ajax: 'readonly',
				dame_contact_ajax: 'readonly',
				dame_pre_inscription_ajax: 'readonly',
				dame_saisons_data: 'readonly',
				dame_test_send_data: 'readonly',
				dame_adherent_actions_data: 'readonly',
				dame_agenda_manager_data: 'readonly',
				dame_backup_adherent_data: 'readonly',
				dame_backup_agenda_data: 'readonly',
				dame_pre_inscription_actions_data: 'readonly',
				dame_settings_anniversaires: 'readonly',
				damePwaInstaller: 'readonly',
				dame_pwa_data: 'readonly',
			},
		},
		rules: {
			// On désactive les règles trop restrictives pour ce projet
			'camelcase': 'off',          // Autorise les variables avec des _ (snake_case)
			'no-alert': 'off',          // Autorise alert() et confirm()
			'no-console': [ 'warn', { allow: [ 'warn', 'error' ] } ],       // Avertit pour log() mais autorise warn() et error()
			'eqeqeq': 'warn',           // Avertit au lieu de bloquer pour les == au lieu de ===
			'no-unused-vars': [ 'warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' } ],   // Avertit pour les variables non utilisées (sauf préfixées par _)
			'react-hooks/rules-of-hooks': 'off', // Projet Vue.js (pas React)
			'react-hooks/exhaustive-deps': 'off',
			'react/react-in-jsx-scope': 'off',
			'import/no-extraneous-dependencies': 'off',
			'@typescript-eslint/no-shadow': 'off',
			'@wordpress/no-unused-vars-before-return': 'off',
		},
	},
];