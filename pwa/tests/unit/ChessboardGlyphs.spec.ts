import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Chessboard from '@/components/shared/Chessboard/Chessboard.vue';
import type { BoardCore, Key, BoardGlyph } from 'eg-chessboard';

interface ChessboardExposeVm {
	setGlyph: ( _sq: Key | string, _glyph: BoardGlyph | null ) => void;
	clearGlyphs: () => void;
	getGlyph: ( _sq: Key | string ) => BoardGlyph | null;
	getGlyphs: () => Map<Key, BoardGlyph>;
}

// Mock eg-chessboard/vue
vi.mock( 'eg-chessboard/vue', () => ( {
	default: {
		name: 'TheChessboard',
		props: [
			'diagram',
			'boardConfig',
			'playerColor',
			'mode',
			'stockfishConfig',
			'pieceSet',
			'boardTheme',
		],
		template: '<div class="the-chessboard-mock" />',
	},
} ) );

describe( 'Chessboard - Badges & Glyphes tactiques (v1.7.4+)', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	const createMockBoardApi = () => {
		const glyphMap = new Map<Key, BoardGlyph>();
		return {
			setPosition: vi.fn(),
			setShapes: vi.fn(),
			setGlyph: vi.fn( ( sq: Key, glyph: BoardGlyph | null ) => {
				if ( glyph ) {
					glyphMap.set( sq, glyph );
				} else {
					glyphMap.delete( sq );
				}
			} ),
			getGlyph: vi.fn( ( sq: Key ) => glyphMap.get( sq ) ?? null ),
			getGlyphs: vi.fn( () => glyphMap ),
			clearGlyphs: vi.fn( () => glyphMap.clear() ),
			redraw: vi.fn(),
			destroy: vi.fn(),
		} as unknown as BoardCore;
	};

	it( 'applique les glyphes initiaux lors de la création du plateau', async () => {
		const mockBoard = createMockBoardApi();
		const wrapper = mount( Chessboard, {
			props: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				glyphs: {
					d4: 'trapped',
					e4: '!!',
					f7: 'undefended',
				},
			},
		} );

		// Simuler l'émission @board-created de eg-chessboard
		const theChessboard = wrapper.findComponent( { name: 'TheChessboard' } );
		theChessboard.vm.$emit( 'board-created', mockBoard );
		await wrapper.vm.$nextTick();

		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'd4', 'trapped' );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'e4', '!!' );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'f7', 'undefended' );
	} );

	it( 'met à jour les glyphes dynamiquement lors du changement de la prop glyphs', async () => {
		const mockBoard = createMockBoardApi();
		const wrapper = mount( Chessboard, {
			props: {
				glyphs: { d4: 'pin' },
			},
		} );

		const theChessboard = wrapper.findComponent( { name: 'TheChessboard' } );
		theChessboard.vm.$emit( 'board-created', mockBoard );
		await wrapper.vm.$nextTick();

		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'd4', 'pin' );

		// Mise à jour de la prop
		await wrapper.setProps( {
			glyphs: { e1: 'checkable', e4: '!' },
		} );

		expect( mockBoard.clearGlyphs ).toHaveBeenCalled();
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'e1', 'checkable' );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'e4', '!' );
	} );

	it( 'expose les méthodes publiques de manipulation de glyphes', async () => {
		const mockBoard = createMockBoardApi();
		const wrapper = mount( Chessboard, {
			props: {},
		} );

		const theChessboard = wrapper.findComponent( { name: 'TheChessboard' } );
		theChessboard.vm.$emit( 'board-created', mockBoard );
		await wrapper.vm.$nextTick();

		const vm = wrapper.vm as unknown as ChessboardExposeVm;
		expect( typeof vm.setGlyph ).toBe( 'function' );
		expect( typeof vm.clearGlyphs ).toBe( 'function' );
		expect( typeof vm.getGlyph ).toBe( 'function' );
		expect( typeof vm.getGlyphs ).toBe( 'function' );

		vm.setGlyph( 'c5', '?!' );
		expect( mockBoard.setGlyph ).toHaveBeenCalledWith( 'c5', '?!' );

		vm.clearGlyphs();
		expect( mockBoard.clearGlyphs ).toHaveBeenCalled();
	} );
} );
