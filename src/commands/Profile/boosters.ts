import { EmbedBuilder } from 'discord.js';
import { db_plr_get } from '../../db/db.js';
import { SET } from '../../settings.js';
import {
	checkBoosterValidity,
	drawProgressBar,
	formatMilliseconds,
	getUserFromMsg,
	sendSimpleMessage
} from '../../utils.js';
export const name = 'boosters';
export const alias = ['booster'];
export const description = '💊 Check your active boosters';
export const usage = '<Username OR Mention>';

export async function execute(msg: okbot.Message, args: string[]) {
	const usr = (await getUserFromMsg(msg, args)) || msg.author;

	const plrdat = await db_plr_get({ _id: usr.id, boosters: 1, boosterC: 1, boosterCd: 1 });
	if (!plrdat?.boosters) return sendSimpleMessage(msg, `\`${usr.displayName}\` has no active boosters.`);

	const boostersActive: Array<okbot.TimedBooster & { timeRemaining: number }> = [];
	const boostersOnCooldown: Array<okbot.ExpiredBooster> = [];

	for (const i in plrdat.boosters) {
		const valid = checkBoosterValidity(plrdat, i);
		if (!valid) continue;
		if ((valid as okbot.ExpiredBooster).cooldownRemaining > 0)
			boostersOnCooldown.push(valid as okbot.ExpiredBooster);
		else if ((valid as okbot.TimedBooster).time)
			boostersActive.push(valid as okbot.TimedBooster & { timeRemaining: number });
	}

	if (!boostersActive.length && !boostersOnCooldown.length)
		return sendSimpleMessage(msg, `\`${usr.displayName}\` has no active boosters.`);

	const msge = new EmbedBuilder()
		.setColor('#78b159')
		.setFooter({ text: `${plrdat.boosterC ?? 0} booster${plrdat.boosterC === 1 ? '' : 's'} used total` });

	for (const i in boostersActive) {
		const timeRatio = Math.round((boostersActive[i].timeRemaining / boostersActive[i].time) * 10);
		msge.addFields({
			name: boostersActive[i].name,
			value:
				drawProgressBar(timeRatio, 10) + '\n`' + formatMilliseconds(boostersActive[i].timeRemaining) + '` ⏰'
		});
	}
	const cooldown = (SET.BOOSTER_COOLDOWN || 57600) - (plrdat.boosterCd ?? 0);
	for (const i in boostersOnCooldown) {
		const timeRatio = Math.round((boostersOnCooldown[i].cooldownRemaining / cooldown) * 10);
		msge.addFields({
			name: boostersOnCooldown[i].name,
			value:
				drawProgressBar(timeRatio, 10, '🟥') +
				'\n`' +
				formatMilliseconds(boostersOnCooldown[i].cooldownRemaining * 1000) +
				'` 🚫'
		});
	}

	msge.setAuthor({
		name: `${usr.displayName}'s current boosters (${boostersActive.length + boostersOnCooldown.length})`,
		iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
	});
	msg.reply({ embeds: [msge] });
}
