import Discord, { ChannelType, Colors } from 'discord.js';
import io from 'socket.io-client';
import { bot } from './okbot.js';
import { getOsuAvatar } from './utilsOsu.js';
import { formatDate, formatNumber } from './utils.js';
import { db_osu_get_players } from './db/osu.js';
import { db_guild_get } from './db/guild.js';

export async function rankingSocket() {
	const socket = io(process.env.SOCKET_URI + '/poggers', {
		path: process.env.SOCKET_PATH
	});

	return await new Promise((resolve, reject) => {
		socket.on('connect', () => {
			socket.emit('room', 'ranking-update-listeners');
			console.log('Connected to socket.');

			socket.on('ranking-update', async (g50: { id: number; nam: string; g50: number }) => {
				console.log(`Poggers ranking updated:`, g50);
				if (!g50?.g50) {
					console.warn("Assuming ranking data is malformed - won't notify listeners");
					resolve(0);
					return;
				}

				// scrape guilds to look for channels that track players
				const guilds = await db_guild_get({ otrack: { $exists: true } }, { _id: 1, otrack: 1 });
				const plrIds = new Set<number>(); // players to fetch from poggers db
				const destinationGuilds: Array<Omit<okbot.OsuTrackSettings, 'chn'> & { chn: Discord.TextChannel }> =
					[];

				for (const i in guilds) {
					const set: okbot.OsuTrackSettings = guilds[i as unknown as number].otrack as okbot.OsuTrackSettings;
					if (!set?.plr?.length || !set.chn) continue;

					const channel = await bot.channels.fetch(set.chn);
					if (!channel || channel.type !== ChannelType.GuildText) continue;

					for (const j of set.plr) plrIds.add(j);
					destinationGuilds.push({ ...set, chn: channel as Discord.TextChannel });
				}

				// get all needed players from the db
				const plrArr = await db_osu_get_players([...plrIds]);
				if (!plrArr?.length) {
					console.warn('No data for players with given ids:\n', [...plrIds]);
					return;
				}

				// convert array to map _id => {...player info}
				const plrMap = new Map();
				for (const i of plrArr) plrMap.set(i._id, { ...i });
				const poggerslink = 'https://poggers.ltd/ranking/gains/' + formatDate(new Date(), 'alphabetical');

				// send to text channels
				for (const i of destinationGuilds) {
					const msge = new Discord.EmbedBuilder()
						.setTitle('Tracked top 50s update')
						.setFooter({
							text: 'poggers.ltd',
							iconURL: 'https://poggers.ltd/senkoicon.png'
						})
						.setColor(Colors.LuminousVividPink)
						.setURL(poggerslink);

					if (i.topGain) {
						msge.setAuthor({
							name: `Top gained was ${g50.g50} by ${g50.nam}`,
							iconURL: getOsuAvatar(g50.id)
						});
					}
					let plrs = 0;

					for (const j of i.plr) {
						const pdata = plrMap.get(j);
						// have to check if pdata exists because add -id doesn't validate players
						if (pdata?.cur && (i.minGain == null || pdata.g50 >= i.minGain)) {
							const t50 = `${formatNumber(pdata.t50 - pdata.g50)} → ${formatNumber(pdata.t50)}`;
							const g50 = `${pdata.g50 >= 0 ? '+' : ''}${pdata.g50}`;

							msge.addFields({
								name: `:flag_${pdata.cntr.toLowerCase()}:  ${pdata.nam} (#${pdata.pos})`,
								value: `${t50} (${g50})`
							});
							++plrs;
						}
					}

					// send only if there's any content
					if (i.topGain || plrs) i.chn.send({ embeds: [msge] });
				}
				resolve(1);
			});
		});

		socket.on('connect_failed', () => reject('Socket connection failed'));
	});
}
