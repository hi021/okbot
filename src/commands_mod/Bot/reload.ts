import { Colors } from 'discord.js';
import { loadBot } from '../../okbot.js';
import { sendSimpleMessage } from '../../utils.js';

export const name = 'reload';
export const description = 'reload settings and stuffs without restarting the bot (aka. call load())';
export const restrict = 'BOT_ADMIN';

export async function execute(msg: okbot.Message) {
	await loadBot();
	return sendSimpleMessage(msg, 'Re-initialized settings and databases.', Colors.White);
}
