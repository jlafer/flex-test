import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import pkg from './package.json';

export default [
	// browser-friendly UMD build
	{
		input: 'src/index.js',
		output: {
			name: 'fnal-util',
			file: pkg.browser,
			format: 'umd'
		},
		plugins: [
			resolve(), // so Rollup can find node_modules dependencies
			commonjs(), // so Rollup can convert dependencies to ES modules
			babel({
				exclude: ['node_modules/**']
			})
		]
	},
	{
		input: 'src/index.js',
		external: [],
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		],
		plugins: [
			resolve(), // so Rollup can find node_modules dependencies
			babel({
				exclude: ['node_modules/**']
			})
		]
	}
];
