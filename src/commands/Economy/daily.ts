import { Colors, EmbedBuilder } from 'discord.js';
import { db_plr_add, db_plr_get, db_plr_set } from '../../db/db.js';
import { SET } from '../../settings.js';
import {
	calcMoneyLevelsGain,
	drawProgressBar,
	formatDoler,
	formatMilliseconds,
	sendSimpleMessage
} from '../../utils.js';

export const name = 'daily';
export const alias = ['pay'];
export const description = '💵 Get money fukc boys';

function buildDailyMsg(
	value: number,
	streak: number,
	needStreak: number,
	streakValue: number,
	streakLvMulti: number,
	streakAmMulti: number,
	streakWasReset?: number
) {
	const msge = new EmbedBuilder().setColor(Colors.DarkGreen);
	const bar = drawProgressBar(streak, needStreak, '🟦', '⬛');
	let description = `+${formatDoler(value, false)} yummy\n\n${bar}`;

	if (streak >= needStreak) {
		description += ` ✨\n+${formatDoler(streakValue)} streak bonus!`;
		if (streakAmMulti > 1) description += `\n-# ${streakAmMulti}x multiplier`;
	} else {
		if (streakWasReset && streakWasReset > 1) description += `\nLost your ${streakWasReset} day streak!`;
		description += `\n**${streak}**/${needStreak} streak`;
	}

	if (streakLvMulti > 1) msge.setFooter({ text: `${streakLvMulti}x level multiplier` });
	return msge.setDescription(description);
}

function handleFirstDaily(dailyVal: number, needStreak: number, streakVal: number, msg: okbot.Message) {
	// count streaks in case they are like 1 day long
	let curStreak = 1;
	let dailyTotal = dailyVal;
	let streakAm = 0;
	if (curStreak >= needStreak) {
		dailyTotal += streakVal;
		curStreak = 0;
		++streakAm;
	}

	const addMonLv = calcMoneyLevelsGain(0, dailyTotal, msg);

	db_plr_set({
		_id: msg.author.id,
		mon: dailyTotal,
		monTot: dailyTotal,
		monLv: addMonLv,
		day: { last: Math.floor(Date.now() / 1000), am: 1, streak: curStreak, streakAm }
	});

	return msg.reply({
		embeds: [buildDailyMsg(dailyVal, curStreak || needStreak, needStreak, streakVal, 1, 1)]
	});
}

export async function execute(msg: okbot.Message) {
	const plrdat = await db_plr_get({
		_id: msg.author.id,
		day: 1,
		monLv: 1,
		monTot: 1
	});
	const needStreak = SET.DAILY_STREAK_LEN ?? 5;
	const streakLvMulti = SET.DAILY_STREAK_LV_MULTI ?? 0.1;
	const streakAmMulti = SET.DAILY_STREAK_AM_MULTI ?? 0.1;
	const dailyVal = (SET.DAILY_AMOUNT ?? 100) + (plrdat?.day?.v ?? 0);
	const streakVal = SET.DAILY_STREAK_AMOUNT ?? 500;

	if (!plrdat?.day) return handleFirstDaily(dailyVal, needStreak, streakVal, msg);

	let streakAm = plrdat.day.streakAm ?? 0;
	let curStreak = plrdat.day.streak ?? 0;
	let streakLost;
	const monLv = plrdat.monLv ?? 0;

	const sinceLast = plrdat.day.last == null ? Infinity : Date.now() / 1000 - plrdat.day.last;
	if (SET.DAILY_COOLDOWN && sinceLast < SET.DAILY_COOLDOWN) {
		return sendSimpleMessage(
			msg,
			`Please wait \`${formatMilliseconds((SET.DAILY_COOLDOWN - sinceLast) * 1000)}\` before claiming your daily again.`
		);
	}

	const streakLvMultiTotal = Math.round((1 + streakLvMulti * monLv) * 10) / 10;
	const streakAmMultiTotal = Math.round((1 + streakAmMulti * streakAm) * 10) / 10;
	let dailyTotal = Math.round(dailyVal * streakLvMultiTotal);
	const streakTotal = Math.round(streakVal * streakAmMultiTotal);
	// check streak
	if (SET.DAILY_STREAK_TIME && sinceLast >= SET.DAILY_STREAK_TIME) {
		streakLost = curStreak;
		curStreak = 1;
	} else {
		++curStreak;
	}

	const msge = buildDailyMsg(
		dailyTotal,
		curStreak || needStreak,
		needStreak,
		streakTotal,
		streakLvMultiTotal,
		streakAmMultiTotal,
		streakLost
	);

	if (curStreak >= needStreak) {
		dailyTotal += streakTotal;
		curStreak = 0;
		++streakAm;
	}
	const am = (plrdat.day.am ?? 0) + 1;
	const monTot = (plrdat.monTot ?? 0) + dailyTotal;
	const addMonLv = calcMoneyLevelsGain(monLv, monTot, msg);

	db_plr_add({
		_id: msg.author.id,
		mon: dailyTotal,
		monTot: dailyTotal,
		monLv: addMonLv
	});
	db_plr_set({
		_id: msg.author.id,
		day: { ...plrdat.day, last: Math.floor(Date.now() / 1000), am, streakAm, streak: curStreak }
	});

	return msg.reply({ embeds: [msge] });
}
