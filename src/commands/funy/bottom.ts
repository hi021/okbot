import { EmbedBuilder, User } from 'discord.js';
import { db_plr_get, db_plr_set } from '../../db/db.js';
import { drawProgressBar, getUserFromMsg, randomFromArray, sendSimpleMessage } from '../../utils.js';

export const name = 'bottom';
export const alias = ['bottomlevel', 'bottomtest'];
export const description = '🥺 or not 🥺';
export const usage = '<Username OR Mention>';

function getBottomDescription(bottomRange: number) {
	let btmTitle = '';
	let btmEmoji = '';
	switch (bottomRange) {
		case 0:
		default:
			btmTitle = randomFromArray([
				'would dominate senator Armstrong',
				'can definitely top you',
				'can be your personal BLAHAJ'
			]);
			btmEmoji = '😈';
			break;
		case 1:
			btmTitle = randomFromArray([
				'drinks black coffee',
				'would make you put on kneesocks',
				'is seeking out a bottom',
				'could be your mattress'
			]);
			btmEmoji = '😤';
			break;
		case 2:
			btmTitle = randomFromArray([
				'would beat you at arm wrestling',
				'is not a bottom...',
				'will play with your hair'
			]);
			btmEmoji = '🙄';
			break;
		case 3:
			btmTitle = randomFromArray([
				'would be the first to confess',
				'is a bottom in training',
				'wants to hug you tight'
			]);
			btmEmoji = ':relaxed:';
			break;
		case 4:
			btmTitle = randomFromArray([
				'would cling to you',
				"doesn't want you to leave",
				'likes all kinds of pats'
			]);
			btmEmoji = '😳';
			break;
		case 5:
			btmTitle = randomFromArray([
				'is a bottom',
				'likes to imagine themselves in embarrassing situations',
				'meows often',
				'will purr at you'
			]);
			btmEmoji = '😳';
			break;
		case 6:
			btmTitle = randomFromArray([
				'refuses to acknowledge how bottom they are',
				'cannot cure their bottomness',
				'talks about getting hugged a lot',
				'covers their mouth while speaking'
			]);
			btmTitle = '😖';
			break;
		case 7:
			btmTitle = randomFromArray([
				'would get all red while holding hands',
				"won't stop blushing",
				'refuses to change out of the oversized pink hoodie',
				'always keeps their hands in long sleeves'
			]);
			btmEmoji = '🥺';
			break;
		case 8:
			btmTitle = randomFromArray([
				'is begging to be lifted up',
				'would eat dog food if asked to',
				'is wearing pink kneesocks at this very moment',
				"can't stop snuggling everyone they see"
			]);
			btmEmoji = '🥵';
			break;
		case 9:
			btmTitle = randomFromArray([
				'would squeal on eye contact',
				'is a terminal bottom',
				'lives under Bikini Bottom',
				'meows more than household cats',
				'is too far gone',
				'is the smallest spoon',
				"doesn't want to leave their cage"
			]);
			btmEmoji = '🤯';
			break;
		case 10:
			btmTitle = randomFromArray([
				'would perish after hearing their name',
				'can get topped by abstract constructs',
				'has trouble breathing around tall people',
				"can't get any worse",
				'has hit rock bottom'
			]);
			btmEmoji = '💀';
			break;
	}

	return { btmEmoji, btmTitle };
}

export async function execute(msg: okbot.Message, args: string[]) {
	let usr: User | undefined = msg.author;
	if (args.length) usr = await getUserFromMsg(msg, args);
	if (!usr) return sendSimpleMessage(msg, 'User not found.');

	const plrdat = await db_plr_get({ _id: usr.id, bottom: 1 });
	let btm = plrdat?.bottom;
	if (btm == null) {
		btm = Math.ceil(Math.random() * 100);
		await db_plr_set({ _id: usr.id, bottom: btm });
	}

	const btmRange = Math.round(btm / 10);
	const bar = drawProgressBar(btmRange, 10, '🟪', '⬜');
	const { btmEmoji, btmTitle } = getBottomDescription(btmRange);

	const msge = new EmbedBuilder()
		.setColor('#aa8ed6')
		.setAuthor({
			name: `${usr.displayName} ${btmTitle}`,
			iconURL: usr.displayAvatarURL({ forceStatic: true, size: 32 })
		})
		.setDescription(`**${btm}%** bottom\n ${bar}  ${btmEmoji}`);
	msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
