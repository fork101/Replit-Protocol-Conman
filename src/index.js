#!/usr/bin/env node

import readline from 'readline';
import { Writable } from 'stream';

import Client, { channels } from './utils/crosis.js';
import * as utils from './utils/utils.js';

const mutableStdout = new Writable({
	write: function (chunk, encoding, callback) {
		if (!this.muted) process.stdout.write(chunk, encoding);
		callback();
	},
});

mutableStdout.muted = false;

const rl = readline.createInterface({
	input: process.stdin,
	output: mutableStdout,
	prompt: '> ',
	terminal: true,
});

rl.prompt();

const config = { token: '', id: '', events: {} };
let client;

rl.on('line', async (line) => {
	const args = line.trim().split(' ');
	switch (args[0]) {
		case '.login': {
			if (process.env.REPLIT_TOKEN || (args[1] && args[1].length)) {
				console.log('Logging in...');
				config['token'] = process.env.REPLIT_TOKEN || args[1];
				const userInfo = await utils.gqlCurrentUser(config['token']);
				console.log(`Logged in as ${userInfo.username}.`);
			} else console.log('Please pass a connect.sid token to login.');
			break;
		}
		case '.connect': {
			if (!(config['token'] && config['token'].length > 0)) {
				console.log(
					'Please authenticate with the login command before opening clients.',
				);
				break;
			}

			if (process.env.REPLIT_ID || (args[1] && args[1].length)) {
				config['id'] = process.env.REPLIT_ID || args[1];
				console.log(`Opening connection to ${config['id']}...`);

				client = new Client(config['token'], config['id']);
				await client.connect();
				console.log(`Connected to ${client.repl.slug}`);
			} else console.log('Please pass a replId to connect.');
			break;
		}
		case '.attach': {
			if (
				args[1] &&
				args[1].length > 0 &&
				channels.includes(args[1]) &&
				!config.events[args[1]]
			) {
				console.log(`Attaching to ${args[1]} channel...`);
				const emitter = await client.attach(args[1]);
				config.events[args[1]] = emitter;

				config.events[args[1]].on('command', (cmd) => {
					mutableStdout.muted = true;
					console.log(`(${args[1]}) ${JSON.stringify(cmd)}`);
					mutableStdout.muted = false;
				});
				console.log(`Attached to ${args[1]}.`);
			} else
				console.log(
					`${args[1]} is not a channel or cannot be attached to.`,
				);
			break;
		}
		case '.detach': {
			if (
				args[1] &&
				args[1].length > 0 &&
				channels.includes(args[1]) &&
				config.events[args[1]]
			) {
				console.log(`Detaching from ${args[1]} channel...`);
				config.events[args[1]].removeAllListeners();
				config.events[args[1]] = undefined;
				console.log(`Detached from ${args[1]}.`);
			} else
				console.log(
					`${args[1]} is not a channel or cannot be attached to.`,
				);
			break;
		}
		case '.close': {
			if (client) {
				console.log('Closing client connection...');
				client.close();
				console.log('Client closed.');
			} else console.log('No client is open to close.');
			client = undefined;
			break;
		}
		case '.clear': {
			console.clear();
			break;
		}
		case '.exit': {
			if (client) client.close();
			rl.close();
			break;
		}
		default: {
			if (args[0] && args[0].length > 0) {
				console.log(
					`Running ${line.substr(line.indexOf(' ') + 1)} on ${
						args[0]
					} channel.`,
				);
				try {
					const res = JSON.stringify(
						await client.command(
							args[0],
							JSON.parse(line.substr(line.indexOf(' ') + 1)),
						),
					);
					if (res && res.length > 0) console.log(res);
					else console.log('Ran command successfully.');
				} catch (error) {
					console.log(error.message);
				}
			} else console.log(`${args[0]} is not a channel.`);
		}
	}

	rl.prompt();
}).on('close', () => {
	process.exit(0);
});
