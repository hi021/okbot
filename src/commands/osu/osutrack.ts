import { Colors, EmbedBuilder } from 'discord.js';
import { db_guild_get, db_guild_set } from '../../db/guild.js';
import { db_osu_get_players } from '../../db/osu.js';
import { osu_getId } from '../../utilsOsu.js';

export const name = 'osutrack';
export const alias = ['otrack', 't50track'];
export const description = 'View and edit osu! top 50 tracking settings';
export const usage = '<Action> <Field name> <Comma-separated values> (-id)';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!msg.guild) return;
	const otrack = (await db_guild_get({ _id: msg.guild.id }, { otrack: 1 }))?.[0]?.otrack;

	if (!args?.length) {
		//show settings
		if (!otrack) {
			return msg.reply({
				content: `> Top 50s are not tracked in this server.\n> use \`${name} add <player name(s)>\` to start tracking!`,
				allowedMentions: {
					repliedUser: false
				}
			});
		}

		const msge = new EmbedBuilder()
			.setTitle(`Top 50s tracking settings for ${msg.guild.name}`)
			.setColor(Colors.DarkVividPink)
			.setDescription(`Tracked in <#${otrack.chn}>`);

		const plrs = await db_osu_get_players(otrack.plr, { nam: 1, cntr: 1, pos: 1 });
		let plrsString = '`None`';
		if (plrs?.length) {
			plrsString = '';
			for (const i of plrs) plrsString += `:flag_${i.cntr.toLowerCase()}:  ${i.nam} (#${i.pos})\n`;
		}
		msge.addFields(
			{ name: `Players (${plrs?.length ?? 0})`, value: plrsString },
			{
				name: 'Minimum gained',
				value: otrack.minGain == null ? '`None`' : otrack.minGain.toString(),
				inline: true
			},
			{ name: 'Show top gained player', value: otrack.topGain ? 'Yes' : 'No', inline: true }
		);

		return msg.reply({
			embeds: [msge],
			allowedMentions: {
				repliedUser: false
			}
		});
	} else if (args.length === 1) {
		if (args[0] === 'disable') {
			//stop tracking
			if (!otrack) {
				msg.reply('> Top 50s tracking is not enabled in this server.');
				return;
			}

			msg.reply('> Disabling top 50s tracking in this server.');
			await db_guild_set({
				_id: msg.guild.id,
				otrack: undefined
			});
		} else if (args[0] === 'channel') {
			//set tracking channel
			if (otrack && otrack.chn == msg.channel.id) {
				const msge = new EmbedBuilder()
					.setColor(Colors.Orange)
					.setDescription(`<#${otrack.chn}> is already set as the current tracking channel.`);

				msg.reply({ embeds: [msge] });
				return;
			}

			await db_guild_set({
				_id: msg.guild.id,
				otrack: {
					...otrack,
					chn: msg.channel.id,
					plr: otrack?.plr || []
				}
			});

			const msge = new EmbedBuilder()
				.setColor(Colors.DarkGreen)
				.setDescription(`Set <#${msg.channel.id}> as the new tracking channel.`);
			msg.reply({
				content: otrack ? undefined : `> Starting tracking in <#${msg.channel.id}>`,
				embeds: [msge]
			});
		} else {
			return msg.reply(
				'> Invalid action or parameters.\nCan be `set`, `add`, `remove`, `disable`, `channel` or blank.'
			);
		}
	} else if (args.length === 2) {
		if (args[0] === 'add') {
			//add by nick
			const res = await addPlayers(msg.guild.id, otrack || { chn: msg.channel.id, plr: [] }, args[1]);

			if (res.pass?.length) {
				const msge = new EmbedBuilder().setColor(Colors.DarkGreen).setAuthor({
					name: `Started tracking ${res.pass.length} player${res.pass.length == 1 ? '' : 's'}`
				});
				if (res.fail?.length) {
					msge
						.setColor(Colors.Orange)
						.setDescription('Warning: only players with at least **1000** top 50s are tracked')
						.addFields({ name: 'Failed to add', value: res.fail.join('\n') });
				}
				msg.reply({
					content: otrack ? undefined : `> Starting tracking in <#${msg.channel.id}>`,
					embeds: [msge]
				});
			} else {
				const msge = new EmbedBuilder()
					.setColor(Colors.DarkRed)
					.setAuthor({
						name: `Failed to start tracking given player${res.fail.length == 1 ? '' : 's'}`
					})
					.setDescription('Only players with at least **1000** top 50s are tracked.');
				msg.reply({ embeds: [msge] });
			}
		} else if (args[0] === 'remove') {
			//TODO: remove all
			//remove by nick
			if (!otrack) {
				msg.reply('> Top 50s tracking is not enabled in this server.');
				return;
			}

			const removed = await removePlayers(msg.guild.id, otrack, args[1]);
			const msge = new EmbedBuilder();
			if (!removed) {
				msge
					.setColor(Colors.DarkRed)
					.setDescription(`failed to stop tracking given player${args[1].split(',').length == 1 ? '' : 's'}`);
			} else {
				msge.setColor(Colors.DarkGreen).setDescription(`removed ${removed} player${removed == 1 ? '' : 's'}`);
			}

			return msg.reply({
				embeds: [msge]
			});
		} else {
			return msg.reply(
				'> Invalid action or parameters.\nCan be `set`, `add`, `remove`, `disable`, `channel` or blank.'
			);
		}
	} else if (args.length === 3) {
		if (args[0] === 'set') {
			//change setting
			switch (args[1].toLowerCase()) {
				case 'topgained':
				case 'top_gain':
				case 'top_gained': {
					const valRaw = args[2].toLowerCase();
					let val = valRaw == 'true' || valRaw == 'yes' || valRaw == 'y';
					if (!otrack) msg.reply(`> Starting tracking in <#${msg.channel.id}>`);
					msg.reply(`> **${val ? 'Enabling' : 'Disabling'}** top gained player of the day`);
					await db_guild_set({
						_id: msg.guild.id,
						otrack: {
							...otrack,
							chn: otrack?.chn || msg.channel.id,
							plr: otrack?.plr || [],
							topGain: val
						}
					});
					return;
				}
				case 'mingain':
				case 'min_gain':
				case 'min_gained': {
					let val: undefined | number = Number(args[2]);
					if (isNaN(val)) val = undefined;
					if (!otrack) msg.reply(`> Starting tracking in <#${msg.channel.id}>`);
					msg.reply(`> Setting minimum necessary top 50s to **${val == null ? '`none`' : val}**.`);
					await db_guild_set({
						_id: msg.guild.id,
						otrack: {
							...otrack,
							chn: otrack?.chn || msg.channel.id,
							plr: otrack?.plr || [],
							minGain: val
						}
					});
					return;
				}
				default:
					return msg.reply('> Invalid property name.\n> Must be `top_gained` or `min_gained`.');
			}
		} else if (args[2].startsWith('-') && args[2].includes('id')) {
			if (args[0] === 'add') {
				//add by id
				const plr: Array<string | number> = args[1].split(',');
				for (const i in plr) {
					plr[i] = Number(plr[i]);
				}

				const res = await addPlayersID(
					msg.guild.id,
					otrack || { chn: msg.channel.id, plr: [] },
					plr as number[]
				);

				const msge = new EmbedBuilder()
					.setColor(Colors.DarkGreen)
					.setDescription(`Started tracking ${plr.length} player${plr.length == 1 ? '' : 's'}`);

				msg.reply({
					content: otrack ? undefined : `> Starting tracking in <#${msg.channel.id}>`,
					embeds: [msge]
				});
			} else if (args[0] === 'remove') {
				//remove by id
				if (!otrack) {
					msg.reply('> Top 50s tracking is not enabled in this server.');
					return;
				}

				const plr: Array<string | number> = args[1].split(',');
				for (const i in plr) {
					plr[i] = Number(plr[i]);
				}
				const removed = await removePlayersID(msg.guild.id, otrack, plr as number[]);
				const msge = new EmbedBuilder();
				if (!removed) {
					msge
						.setColor(Colors.DarkRed)
						.setDescription(
							`failed to stop tracking given player${args[1].split(',').length == 1 ? '' : 's'}`
						);
				} else {
					msge
						.setColor(Colors.DarkGreen)
						.setDescription(`removed ${removed} player${removed == 1 ? '' : 's'}`);
				}

				return msg.reply({
					embeds: [msge]
				});
			}
		} else {
			return msg.reply(
				'> Invalid action or parameters.\nCan be `set`, `add`, `remove`, `disable`, `channel` or blank.'
			);
		}
	}
}

async function addPlayers(_id: string, otrack: okbot.OsuTrackSettings, plr: string) {
	let plrArr = plr.split(',');
	const promises = new Array(plrArr.length);
	for (const i in plrArr) {
		promises.push(
			new Promise(async (resolve, reject) => {
				let id = await osu_getId(plrArr[i]);
				if (!id || otrack?.plr?.includes(id)) {
					reject(plrArr[i]);
					return;
				}
				resolve(id);
			})
		);
	}

	const res = await Promise.allSettled(promises);
	const fail: string[] = []; //failed nicknames
	const pass: Set<number> = new Set(); //successfully added ids
	for (const i in res) {
		if ((res[i] as any).value) pass.add((res[i] as any).value);
		else if ((res[i] as any).reason) fail.push((res[i] as any).reason);
	}

	const passArr = [...pass];
	await addPlayersID(_id, otrack, passArr);
	return { fail, pass: passArr };
}

//Warning: doesn't check for invalid ids
async function addPlayersID(_id: string, otrack: okbot.OsuTrackSettings, plr: number[]) {
	return await db_guild_set({ _id, otrack: { ...otrack, plr: [...otrack.plr, ...plr] } });
}

async function removePlayers(_id: string, otrack: okbot.OsuTrackSettings, plr: string) {
	let plrArr = plr.split(',');
	const promises = new Array(plrArr.length);
	for (const i in plrArr) {
		promises.push(
			new Promise(async (resolve, reject) => {
				let id = await osu_getId(plrArr[i]);
				if (!id) {
					reject(plrArr[i]);
					return;
				}
				resolve(id);
			})
		);
	}

	const res = await Promise.allSettled(promises);
	const fail: string[] = []; //failed nicknames
	const pass: number[] = []; //successfully fetched ids
	for (const i in res) {
		if ((res[i] as any).value) pass.push((res[i] as any).value);
		else if ((res[i] as any).reason) fail.push((res[i] as any).reason);
	}

	return await removePlayersID(_id, otrack, pass);
}

async function removePlayersID(_id: string, otrack: okbot.OsuTrackSettings, plr: number[]) {
	const plrSet = new Set(otrack.plr);
	let removed = 0;
	for (const i in plr) {
		if (plrSet.has(plr[i])) {
			++removed;
			plrSet.delete(plr[i]);
		}
	}

	await db_guild_set({ _id, otrack: { ...otrack, plr: [...plrSet] } });
	return removed;
}
