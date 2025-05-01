import { db_ok_prune } from '../../db/db.js';

export const name = 'resetcount';
export const description = '';
export const restrict = 'BOT_OWNER';

export async function execute(msg: okbot.Message, args: string[]) {
	const guild = args[0]?.toLowerCase() === 'global' ? '_GLOBAL' : msg.guild?.id;
	if (!guild) return;

	await db_ok_prune(guild);
	msg.reply('What have you done...');
}
