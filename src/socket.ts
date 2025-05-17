import Discord, { ChannelType, Colors } from "discord.js";
import io, { Socket } from "socket.io-client";
import { db_guild_get } from "./db/guild.js";
import { db_osu_get_players } from "./db/osu.js";
import { bot } from "./okbot.js";
import { formatDate, formatNumber } from "./utils.js";
import { getOsuAvatar } from "./utilsOsu.js";

let socket: Socket;

export async function rankingSocket() {
	socket = io(process.env.SOCKET_URI + "/poggers", {
		path: process.env.SOCKET_PATH
	});

	return await new Promise(socketHandler);
}

function socketHandler(resolve: (value: boolean) => void, reject: (reason: string) => void) {
	socket.on("connect", () => {
		socket.emit("room", process.env.SOCKET_ROOM_NAME);
		console.log(`Connected to ${process.env.SOCKET_ROOM_NAME}.`);

		socket.on("ranking-update", async (g50: { id: number; nam: string; g50: number }) => {
			console.log(`Poggers ranking updated:`, g50);
			if (!g50?.g50) {
				console.warn("Assuming ranking data is malformed - won't notify listeners");
				resolve(false);
				return;
			}

			// scrape guilds to look for channels that track players
			const guilds = await db_guild_get({ otrack: { $exists: true } }, { _id: 1, otrack: 1 });
			const plrIds = new Set<number>(); // players to fetch from poggers db
			const destinationGuilds: Array<Omit<okbot.OsuTrackSettings, "chn"> & { chn: Discord.TextChannel }> = [];

			for (const i in guilds) {
				const trackSettings = guilds[Number(i)].otrack;
				if (!trackSettings?.plr?.length || !trackSettings.chn) continue;

				const channel = await bot.channels.fetch(trackSettings.chn);
				if (!channel || channel.type !== ChannelType.GuildText) continue;

				for (const j of trackSettings.plr) plrIds.add(j);
				destinationGuilds.push({ ...trackSettings, chn: channel });
			}

			// get all needed players from the db
			const plrArr = await db_osu_get_players([...plrIds]);
			if (!plrArr?.length) {
				console.warn("No data for players with given ids:\n", [...plrIds]);
				return;
			}

			// convert array to map _id => {...player info}
			const plrMap = new Map();
			for (const i of plrArr) plrMap.set(i._id, { ...i });
			const poggerslink = "https://poggers.ltd/ranking/gains/" + formatDate(new Date(), "alphabetical");

			// send to text channels
			for (const trackSettings of destinationGuilds) {
				const msge = new Discord.EmbedBuilder()
					.setTitle("Tracked top 50s update")
					.setFooter({
						text: "poggers.ltd",
						iconURL: "https://poggers.ltd/senkoicon.png"
					})
					.setColor(Colors.LuminousVividPink)
					.setURL(poggerslink);

				if (trackSettings.topGain) {
					msge.setAuthor({
						name: `Top gained was ${g50.g50} by ${g50.nam}`,
						iconURL: getOsuAvatar(g50.id)
					});
				}
				let plrs = 0;

				for (const plrId of trackSettings.plr) {
					const plrData = plrMap.get(plrId);
					// have to check if player data exists because add -id doesn't validate players
					if (plrData?.cur && (trackSettings.minGain == null || plrData.g50 >= trackSettings.minGain)) {
						const t50 = `${formatNumber(plrData.t50 - plrData.g50)} → ${formatNumber(plrData.t50)}`;
						const g50 = `${plrData.g50 >= 0 ? "+" : ""}${plrData.g50}`;

						msge.addFields({
							name: `:flag_${plrData.cntr.toLowerCase()}: ${plrData.nam} (#${plrData.pos})`,
							value: `${t50} (${g50})`
						});
						++plrs;
					}
				}

				// send only if there's any content
				if (trackSettings.topGain || plrs) trackSettings.chn.send({ embeds: [msge] });
			}
			resolve(true);
		});
	});

	socket.on("connect_failed", () => reject("Socket connection failed."));
}
