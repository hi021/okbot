import { EmbedBuilder, User } from "discord.js";
import { db_plr_get, db_plr_set } from "../../db/db.js";
import { SET } from "../../settings.js";
import {
	calcMoneyTotNeeded,
	drawProgressBar,
	formatDoler,
	formatNumber,
	getUserFromMsg
} from "../../utils.js";

export const name = "stats";
export const description = "📊 states";
export const usage = "<Username OR Mention>";

export async function execute(msg: okbot.Message, args: string[]) {
	let user: User;
	if (!args.length) user = msg.author;
	else user = (await getUserFromMsg(msg, args)) ?? msg.author;

	const plrdat = await db_plr_get({
		_id: user.id,
		mon: 1,
		monTot: 1,
		monLv: 1,
		okTot: 1,
		fishTotC: 1,
		okLv: 1,
		gay: 1,
		rep: { v: 1, am: 1 },
		day: { v: 1, am: 1 },
		color: 1,
		badge: 1,
		flags: 1,
		boosterC: 1
	});

	const statMsg = new EmbedBuilder()
		.setAuthor({
			name: user.displayName,
			iconURL: user.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setFooter({ text: "ok stats" });

	if (!plrdat) {
		db_plr_set({
			_id: user.id,
			mon: 0
		});

		statMsg.setDescription("🕸️ *There are no stats for this user...*");

		msg.reply({ embeds: [statMsg] });
		return;
	}

	const rep = plrdat.rep ?? { am: 0, v: 0 };
	let day = plrdat.day;
	if (!day) {
		day = { am: 0, v: 0 };
	} else {
		if (day.am === undefined) day.am = 0;
		if (day.v === undefined) day.v = 0;
	}

	const lvMonTot = calcMoneyTotNeeded(plrdat.monLv);
	const nextLvMonTot = calcMoneyTotNeeded((plrdat.monLv ?? 0) + 1);
	const nextLvMonNeeded = nextLvMonTot - (plrdat.monTot ?? 0);
	const lvMonProgress = 1 - nextLvMonNeeded / (nextLvMonTot - lvMonTot);
	const lvMonProgressPercent = Math.round(lvMonProgress * 10000) / 100;

	const lvMonProgressBarValue = Math.round(lvMonProgressPercent / 10);
	let monProgressString = drawProgressBar(lvMonProgressBarValue, 10);

	if (lvMonProgress < 1 && lvMonProgress >= 0)
		monProgressString += `\n${formatNumber(nextLvMonNeeded)} 💵 to next level (${lvMonProgressPercent}%)`;
	else monProgressString += `⭐\nNext level ready! Gain any amount of money to rank up.`;

	statMsg.addFields(
		{
			name: "doler",
			value: `${formatDoler(plrdat.mon ?? 0)} **|** ${formatDoler(plrdat.monTot ?? 0, false)} total (Lv. ${
				plrdat.monLv ?? 0
			})\n${monProgressString}`,
			inline: false
		},
		{ name: "rapes", value: `${rep?.v ?? 0} ♂️ **|** ${rep?.am ?? 0} ♂️ given`, inline: true },
		{
			name: "dailies",
			value: `${(SET.DAILY_AMOUNT ?? 0) + (day?.v ?? 0)} 💵 **|** ${day.am} claimed`,
			inline: false
		},
		{ name: "\u200b", value: "╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼╼", inline: false },
		{ name: "okays", value: `${formatNumber(plrdat.okTot ?? 0)}`, inline: true },
		{ name: "fish", value: `${formatNumber(plrdat.fishTotC ?? 0)}`, inline: true },
		{ name: "gays", value: `${formatNumber(plrdat.gay ?? 0)}`, inline: true },
		{ name: "flags", value: `${formatNumber(plrdat.flags ?? 0)}`, inline: true },
		{ name: "boosters", value: `${formatNumber(plrdat.boosterC ?? 0)}`, inline: true },
		{ name: "\u200b", value: "\u200b", inline: true }
	);

	if (plrdat.color) statMsg.setColor(plrdat.color);
	if (plrdat.badge) statMsg.setTitle(plrdat.badge);

	msg.reply({ embeds: [statMsg] });
}
