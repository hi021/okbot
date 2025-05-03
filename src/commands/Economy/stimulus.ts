import { Colors } from "discord.js";
import { db_plr_add, db_plr_get, db_plr_set } from "../../db/db.js";
import { SET } from "../../settings.js";
import { calcMoneyLevelsGain, formatDoler, formatMilliseconds, sendSimpleMessage } from "../../utils.js";

export const name = "stimulus";
export const alias = ["social", "stim"];
export const description = "💸 Get money fukc boys (only if you are very broke)";

export async function execute(msg: okbot.Message) {
	const plrdat = await db_plr_get({
		_id: msg.author.id,
		mon: 1,
		monLv: 1,
		monTot: 1,
		stimLast: 1,
		stimAm: 1
	});

	const stimLv = SET.STIMULUS_MINLV ?? 1;
	if (!plrdat || (plrdat?.monLv ?? 0) < stimLv) {
		return sendSimpleMessage(
			msg,
			`Sorry, you are not eligible for a stimulus check.\nYour money level must be at least **${stimLv}** to apply.\nAnd the rich get richer.`
		);
	}

	const stim = SET.STIMULUS_AMOUNT ?? 250;
	const now = Date.now() / 1000;
	const sinceLast = plrdat.stimLast ? now - plrdat.stimLast : Infinity;

	if (SET.STIMULUS_COOLDOWN && sinceLast < SET.STIMULUS_COOLDOWN) {
		return sendSimpleMessage(
			msg,
			`Please wait \`${formatMilliseconds((SET.STIMULUS_COOLDOWN - sinceLast) * 1000)}\` before applying for a stimulus check again.`
		);
	}

	const monLv = plrdat.monLv ?? 0;
	let monTot = plrdat.monTot ?? 0;
	const stimMax = SET.STIMULUS_MON ?? 60;

	if ((plrdat.mon ?? 0) > stimMax) {
		return sendSimpleMessage(
			msg,
			`Sorry, you are not eligible for a stimulus check.\nOnly people with ${formatDoler(stimMax)} or less can apply.`
		);
	}

	monTot += stim;
	const addMonLv = calcMoneyLevelsGain(monLv, monTot, msg);

	db_plr_add({
		_id: msg.author.id,
		mon: stim,
		monTot: stim,
		monLv: addMonLv,
		stimAm: 1
	});
	db_plr_set({
		_id: msg.author.id,
		stimLast: Math.floor(now)
	});

	return sendSimpleMessage(
		msg,
		`Received ${formatDoler(stim)} of taxpayers' money.`,
		Colors.DarkGreen,
		false
	);
}
