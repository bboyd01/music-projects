import type { Component } from 'svelte';
import Piano from '@lucide/svelte/icons/piano';
import KeyboardMusic from '@lucide/svelte/icons/keyboard-music';
import Guitar from '@lucide/svelte/icons/guitar';
import Drum from '@lucide/svelte/icons/drum';
import Mic from '@lucide/svelte/icons/mic';
import MicVocal from '@lucide/svelte/icons/mic-vocal';
import Headphones from '@lucide/svelte/icons/headphones';
import AudioLines from '@lucide/svelte/icons/audio-lines';
import Radio from '@lucide/svelte/icons/radio';
import Disc3 from '@lucide/svelte/icons/disc-3';
import CassetteTape from '@lucide/svelte/icons/cassette-tape';
import Speaker from '@lucide/svelte/icons/speaker';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import TreeDeciduous from '@lucide/svelte/icons/tree-deciduous';
import TreePine from '@lucide/svelte/icons/tree-pine';
import Trees from '@lucide/svelte/icons/trees';
import Leaf from '@lucide/svelte/icons/leaf';
import Sprout from '@lucide/svelte/icons/sprout';
import Flower2 from '@lucide/svelte/icons/flower-2';
import Cloud from '@lucide/svelte/icons/cloud';
import CloudRain from '@lucide/svelte/icons/cloud-rain';
import CloudMoon from '@lucide/svelte/icons/cloud-moon';
import Droplet from '@lucide/svelte/icons/droplet';
import Waves from '@lucide/svelte/icons/audio-waveform';
import Wind from '@lucide/svelte/icons/wind';
import Snowflake from '@lucide/svelte/icons/snowflake';
import Sun from '@lucide/svelte/icons/sun';
import Sunrise from '@lucide/svelte/icons/sunrise';
import Moon from '@lucide/svelte/icons/moon';
import Star from '@lucide/svelte/icons/star';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Mountain from '@lucide/svelte/icons/mountain';
import Flame from '@lucide/svelte/icons/flame';
import Zap from '@lucide/svelte/icons/zap';
import Rainbow from '@lucide/svelte/icons/rainbow';
import Shell from '@lucide/svelte/icons/shell';
import Bird from '@lucide/svelte/icons/bird';
import Fish from '@lucide/svelte/icons/fish';
import Feather from '@lucide/svelte/icons/feather';
import Building from '@lucide/svelte/icons/building';
import Landmark from '@lucide/svelte/icons/landmark';
import Church from '@lucide/svelte/icons/church';
import Castle from '@lucide/svelte/icons/castle';
import Factory from '@lucide/svelte/icons/factory';
import House from '@lucide/svelte/icons/house';
import TrainFront from '@lucide/svelte/icons/train-front';
import Ship from '@lucide/svelte/icons/ship';
import Plane from '@lucide/svelte/icons/plane';
import Rocket from '@lucide/svelte/icons/rocket';
import Computer from '@lucide/svelte/icons/computer';
import Cpu from '@lucide/svelte/icons/cpu';
import Bot from '@lucide/svelte/icons/bot';
import Orbit from '@lucide/svelte/icons/orbit';
import Atom from '@lucide/svelte/icons/atom';
import Telescope from '@lucide/svelte/icons/telescope';
import Globe from '@lucide/svelte/icons/globe';
import Compass from '@lucide/svelte/icons/compass';
import User from '@lucide/svelte/icons/user';
import Heart from '@lucide/svelte/icons/heart';
import Eye from '@lucide/svelte/icons/eye';
import Hand from '@lucide/svelte/icons/hand';
import Ghost from '@lucide/svelte/icons/ghost';
import Drama from '@lucide/svelte/icons/drama';
import Crown from '@lucide/svelte/icons/crown';
import Gem from '@lucide/svelte/icons/gem';
import Key from '@lucide/svelte/icons/key';
import Hourglass from '@lucide/svelte/icons/hourglass';
import Infinity from '@lucide/svelte/icons/infinity';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Coffee from '@lucide/svelte/icons/coffee';
import Wine from '@lucide/svelte/icons/wine';
import Film from '@lucide/svelte/icons/film';
import Gamepad from '@lucide/svelte/icons/gamepad-2';
import Book from '@lucide/svelte/icons/book';
import Brush from '@lucide/svelte/icons/brush';
import Origami from '@lucide/svelte/icons/origami';
import Puzzle from '@lucide/svelte/icons/puzzle';
import Swords from '@lucide/svelte/icons/swords';
import Skull from '@lucide/svelte/icons/skull';
import Cat from '@lucide/svelte/icons/cat';
import Rabbit from '@lucide/svelte/icons/rabbit';

/**
 * Custom instrument glyphs drawn in the Lucide style (24×24, 2px stroke, round caps)
 * for instruments Lucide doesn't have.
 */
export const customIcons: Record<string, string[]> = {
	oboe: ['M16.5 3.5l4 4', 'M18.5 5.5L7 17', 'M7 17l-2.5 3.5', 'M4.5 20.5l-1 0.5 0.5-1', 'M14 10l1 1', 'M11.5 12.5l1 1', 'M9 15l1 1'],
	tuba: [
		'M9 3h4',
		'M10 3v9',
		'M12 3v9',
		'M7 12h8a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-1',
		'M5 16h-1.5a1.5 1.5 0 0 1 0-3H7',
		'M15 7h3'
	],
	trumpet: ['M2 12h12', 'M14 12l7-5v10z', 'M6 12V8', 'M8.5 12V8', 'M11 12V8', 'M4 12v3h8v-3'],
	violin: [
		'M15 2l-1 1',
		'M14 3l-3 3',
		'M11 6a3 3 0 0 0-4 1 2.5 2.5 0 0 1-2 3 3 3 0 0 0-1 5l3 3a3 3 0 0 0 5-1 2.5 2.5 0 0 1 3-2 3 3 0 0 0 1-4z',
		'M9.5 11.5l3 3',
		'M18 6L8 16'
	],
	flute: ['M3 18L18 3', 'M20 1.5l-1.5 1.5', 'M8 11.5l1 1', 'M10.5 9l1 1', 'M13 6.5l1 1', 'M2 19l1 1'],
	harp: ['M6 21V4', 'M6 4c5 0 9 3 12 8', 'M18 12l-1 9H6', 'M9 5v14', 'M12 6.5V20', 'M15 9v11'],
	note: ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z']
};

export type IconEntry = { key: string; label: string; component?: Component<Record<string, unknown>> };

const L = (key: string, label: string, component: unknown): IconEntry => ({
	key,
	label,
	component: component as Component<Record<string, unknown>>
});
const C = (key: string, label: string): IconEntry => ({ key, label });

export const iconGroups: { name: string; icons: IconEntry[] }[] = [
	{
		name: 'Music',
		icons: [
			L('piano', 'Piano', Piano),
			L('keys', 'Keys', KeyboardMusic),
			L('guitar', 'Guitar', Guitar),
			C('violin', 'Violin'),
			C('harp', 'Harp'),
			C('oboe', 'Oboe'),
			C('flute', 'Flute'),
			C('trumpet', 'Trumpet'),
			C('tuba', 'Tuba'),
			L('drum', 'Drum', Drum),
			L('mic', 'Mic', Mic),
			L('vocal', 'Vocal', MicVocal),
			C('note', 'Note'),
			L('headphones', 'Headphones', Headphones),
			L('waveform', 'Waveform', AudioLines),
			L('mixer', 'Mixer', SlidersHorizontal),
			L('speaker', 'Speaker', Speaker),
			L('radio', 'Radio', Radio),
			L('vinyl', 'Record', Disc3),
			L('cassette', 'Cassette', CassetteTape)
		]
	},
	{
		name: 'Nature',
		icons: [
			L('tree', 'Tree', TreeDeciduous),
			L('pine', 'Pine', TreePine),
			L('forest', 'Forest', Trees),
			L('leaf', 'Leaf', Leaf),
			L('sprout', 'Sprout', Sprout),
			L('flower', 'Flower', Flower2),
			L('cloud', 'Cloud', Cloud),
			L('rain', 'Rain', CloudRain),
			L('night', 'Night', CloudMoon),
			L('droplet', 'Water droplet', Droplet),
			L('waves', 'Waves', Waves),
			L('wind', 'Wind', Wind),
			L('snow', 'Snow', Snowflake),
			L('sun', 'Sun', Sun),
			L('sunrise', 'Sunrise', Sunrise),
			L('moon', 'Moon', Moon),
			L('star', 'Star', Star),
			L('mountain', 'Mountain', Mountain),
			L('flame', 'Flame', Flame),
			L('bolt', 'Lightning', Zap),
			L('rainbow', 'Rainbow', Rainbow),
			L('shell', 'Shell', Shell),
			L('bird', 'Bird', Bird),
			L('fish', 'Fish', Fish),
			L('feather', 'Feather', Feather),
			L('cat', 'Cat', Cat),
			L('rabbit', 'Rabbit', Rabbit)
		]
	},
	{
		name: 'Places & things',
		icons: [
			L('city', 'City', Building),
			L('landmark', 'Landmark', Landmark),
			L('church', 'Church', Church),
			L('castle', 'Castle', Castle),
			L('factory', 'Factory', Factory),
			L('house', 'House', House),
			L('train', 'Train', TrainFront),
			L('ship', 'Ship', Ship),
			L('plane', 'Plane', Plane),
			L('rocket', 'Rocket', Rocket),
			L('computer', 'Computer', Computer),
			L('chip', 'Chip', Cpu),
			L('robot', 'Robot', Bot),
			L('orbit', 'Orbit', Orbit),
			L('atom', 'Atom', Atom),
			L('telescope', 'Telescope', Telescope),
			L('globe', 'Globe', Globe),
			L('compass', 'Compass', Compass),
			L('film', 'Film', Film),
			L('game', 'Game', Gamepad),
			L('book', 'Book', Book),
			L('brush', 'Brush', Brush),
			L('coffee', 'Coffee', Coffee),
			L('wine', 'Wine', Wine),
			L('lightbulb', 'Idea', Lightbulb),
			L('hourglass', 'Hourglass', Hourglass),
			L('key', 'Key', Key)
		]
	},
	{
		name: 'Abstract',
		icons: [
			L('profile', 'Profile', User),
			L('heart', 'Heart', Heart),
			L('eye', 'Eye', Eye),
			L('hand', 'Hand', Hand),
			L('ghost', 'Ghost', Ghost),
			L('drama', 'Drama', Drama),
			L('crown', 'Crown', Crown),
			L('gem', 'Gem', Gem),
			L('sparkles', 'Sparkles', Sparkles),
			L('infinity', 'Infinity', Infinity),
			L('origami', 'Origami', Origami),
			L('puzzle', 'Puzzle', Puzzle),
			L('swords', 'Swords', Swords),
			L('skull', 'Skull', Skull)
		]
	}
];

export const iconByKey = new Map(iconGroups.flatMap((g) => g.icons).map((i) => [i.key, i]));
