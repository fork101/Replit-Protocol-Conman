import WebSocket from 'ws';
import EventEmitter from 'events';

import { Client } from '@replit/crosis';

import * as utils from './utils.js';

/* eslint-disable no-control-regex */
function addslashes(str) {
	return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}
/* eslint-enable no-control-regex */

const cmdTimeout = (channel, timeout) => {
	return new Promise((res, rej) => {
		let timeoutId;
		let promiseDidFinish = false;

		const listener = (cmd) => {
			if (!promiseDidFinish && cmd) {
				promiseDidFinish = true;
				clearTimeout(timeoutId);
				res(cmd);
			}
		};

		if (timeout && timeout > 0) {
			timeoutId = setTimeout(() => {
				promiseDidFinish = true;
				rej(
					'The command timed out. If you wish to stay open longer, change the REPLIT_TIMEOUT env variable.',
				);
			}, timeout);
		}

		channel.onCommand(listener);
	});
};

class CrosisClient {
	constructor(token, replId) {
		if (!token) throw new Error('UserError: Missing token parameter.');

		this.client = new Client();

		this.token = token;

		this.user = {};
		this.replId = replId;
		this.repl = {};

		this.channels = {};
		this.connected = false;
	}

	async connect() {
		if (!this.replId)
			throw new Error(
				'UserError: No ReplID Found. Either pass a ReplID into the constructor or create a Repl with the <Client>.create(...) command.',
			);

		this.user = await utils.gqlCurrentUser(this.token);
		this.repl = await utils.gqlRepl(this.token, this.replId);

		await new Promise((res) => {
			const context = {
				user: { name: this.user.username },
				repl: { id: this.repl.id },
			};

			this.client.connectOptions = { timeout: 3000 };
			this.client.open(
				{
					context,
					urlOptions: {
						secure: true,
						host: `eval.${
							this.user.isHacker ? 'hacker' : 'global'
						}.replit.com`,
					},
					fetchConnectionMetadata: () =>
						utils.getConnectionMetadata(this.token, this.repl.id),
					WebSocketClass: WebSocket,
				},
				({ channel }) => {
					if (!channel) return;

					this.connected = true;
					res();
				},
			);
		});
	}

	close() {
		this.client.close();
	}

	async channel(name) {
		const stored = this.channels[name];
		if (stored) {
			return stored;
		} else {
			const chan = await new Promise((res) => {
				this.client.openChannel({ service: name }, ({ channel }) => {
					if (channel) res(channel);
				});
			});

			this.channels[name] = chan;
			return chan;
		}
	}

	async attach(channel) {
		const chan = await this.channel(channel);
		const events = new EventEmitter();

		chan.onCommand((cmd) => events.emit('command', cmd));
		return events;
	}

	async command(channel, cmdJSON) {
		const chan = await this.channel(channel);
		chan.send(cmdJSON);
		return await cmdTimeout(chan, process.env.REPLIT_TIMEOUT || 3000);
	}

	async create(name, description, language, visibility, run) {
		const options = {
			title: name,
			description: description,
			language: language,
			folderId: null,
			gitRemoteUrl: null,
			originId: null,
			isPrivate: visibility === 'private',
			teamId: null,
			files: [
				{
					name: '.replit',
					content: `lang = "${language}"\nrun = "${addslashes(run)}"`,
				},
			],
		};

		const {
			data: { createRepl },
		} = await utils.gqlCreateRepl(options);

		if (createRepl['__typename'] === 'UserError')
			throw new Error(`UserError: ${createRepl.message}`);

		this.replId = createRepl.id;
		this.repl = createRepl;
		return createRepl;
	}
}

const channels = [
	'audio',
	'chat',
	'eval',
	'exec',
	'fsevents',
	'interp',
	'interp2',
	'ot',
	'packager2',
	'packager3',
	'presences',
	'shellrun',
	'shellrun2',
	'run',
	'run2',
	'shell',
];

export default CrosisClient;
export { channels };
