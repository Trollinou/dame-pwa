/**
 * Réexportation des types partagés depuis le plugin ROI.
 */
export type * from 'roi-types';

import type {
	ContenuExerciceResponse,
	ContenuLeconResponse,
	ContenuVideoResponse,
	ExerciceConfig,
	ExerciceType1Config,
	ExerciceType2Config,
	ExerciceType3Config,
	ExerciceType4Config,
	ExerciceType5Config,
	ExerciceType6Config,
	ExerciceType7Config,
	ExerciceType8Config,
	ExerciceType9Config,
	ExerciceType10Config,
	ExerciceType11Config,
	ExerciceType12Config,
	ExerciceType13Config,
	ExerciceType14Config,
	ExerciceType15Config,
	ExerciceType16Config,
	SavedGame,
} from 'roi-types';

// Aliases pratiques pour les données de contenu et les jeux
export type ExerciceData = ContenuExerciceResponse;
export type LeconData = ContenuLeconResponse;
export type VideoData = ContenuVideoResponse;
export type ExerciseConfig = ExerciceConfig;
export type GameEntry = SavedGame;

// Aliases ExerciseType*Config (anglais / français)
export type ExerciseType1Config = ExerciceType1Config;
export type ExerciseType2Config = ExerciceType2Config;
export type ExerciseType3Config = ExerciceType3Config;
export type ExerciseType4Config = ExerciceType4Config;
export type ExerciseType5Config = ExerciceType5Config;
export type ExerciseType6Config = ExerciceType6Config;
export type ExerciseType7Config = ExerciceType7Config;
export type ExerciseType8Config = ExerciceType8Config;
export type ExerciseType9Config = ExerciceType9Config;
export type ExerciseType10Config = ExerciceType10Config;
export type ExerciseType11Config = ExerciceType11Config;
export type ExerciseType12Config = ExerciceType12Config;
export type ExerciseType13Config = ExerciceType13Config;
export type ExerciseType14Config = ExerciceType14Config;
export type ExerciseType15Config = ExerciceType15Config;
export type ExerciseType16Config = ExerciceType16Config;
