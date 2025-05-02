import { Colors, EmbedBuilder, User } from 'discord.js';
import { db_plr_get, db_plr_set } from '../../db/db.js';
import { db_store_get_item } from '../../db/store.js';
import { SET } from '../../settings.js';
import { sendSimpleMessage } from '../../utils.js';

function listEditable() {
	const msge = new EmbedBuilder()
		.setColor(Colors.White)
		.setTitle('Editable fields')
		.setFooter({ text: "Use 'edit [Field Name] [Field Value]' to edit your profile." });

	let d = '';
	for (const a in editable) d += `${editable[a].emoji} ${a}\n`;
	if (d) msge.setDescription(d);

	return msge;
}

const defaultEditFunction = async (
	usr: User,
	fieldValue: string,
	fieldName: string,
	fieldIdSchema: string
) => {
	if (!fieldValue) {
		db_plr_set({
			_id: usr.id,
			[fieldName]: undefined
		});
		return { success: true, msg: `Reset your ${fieldName}.` };
	}

	//get item from the store by name and check if it exists and is of the item category
	let item = await db_store_get_item({ nam: fieldValue });
	if (!item || !item._id.startsWith(fieldIdSchema)) {
		item = await db_store_get_item({ nam: fieldValue.toUpperCase() });
		if (!item || !item._id.startsWith(fieldIdSchema))
			return { success: false, msg: `\`${fieldValue}\` is not a valid ${fieldName}.` };
		fieldValue = fieldValue.toUpperCase();
	}

	//check if the user owns the item
	const plrdat = await db_plr_get({ _id: usr.id, itms: 1 });
	if (!plrdat?.itms?.[item._id])
		return {
			success: false,
			msg: `You do not own \`${fieldValue}\`. Purchase it using the \`store\` command first.`
		};

	await db_plr_set({
		_id: usr.id,
		[fieldName]: item.v
	});
	return {
		success: true,
		msg: `Set your **${fieldName}** to ${item.emoji ? item.emoji + ' ' : ''}\`${fieldValue}\`.`
	};
};

//every editable field has its function that:
//takes in the user and new value to be set,
//returns whether the action was a success and optionally a message to show
const editable: Record<
	string,
	{ emoji: string; func: (...args: any[]) => Promise<{ success: boolean; msg?: string }> }
> = {};
editable['title'] = {
	emoji: '✏️',
	func: async (usr: User, title: string) => {
		const maxlen = Number(SET.LEN_MAX_TITLE) || 64;
		if (title.length > maxlen)
			return { success: false, msg: 'Sorry, the maximum title length is `' + maxlen + '` characters.' };

		await db_plr_set({
			_id: usr.id,
			title: title || ''
		});

		return !title ? { success: true, msg: 'Reset your title.' } : { success: true };
	}
};

editable['color'] = {
	emoji: '🖌️',
	func: (usr: User, fieldValue: string) => defaultEditFunction(usr, fieldValue, 'color', 'CLR')
};

editable['badge'] = {
	emoji: '⭐',
	func: (usr: User, fieldValue: string) => defaultEditFunction(usr, fieldValue, 'badge', 'BDG')
};

export const name = 'edit';
export const description = '✏️ Make your profile look less bad';
export const usage = '[Profile Field] [New Value (Leave blank to reset)]';

export async function execute(msg: okbot.Message, args: string[]) {
	if (!args.length) return msg.reply({ embeds: [listEditable()] });

	const fieldName = args[0];
	if (!editable[fieldName]) return msg.reply({ content: '> **Invalid field**.', embeds: [listEditable()] });
	const fieldValue = args.slice(1).join(' ');

	//set fieldValue case (e.g. Blue)
	const ret = await editable[fieldName].func(
		msg.author,
		fieldValue.charAt(0).toUpperCase() + fieldValue.slice(1).toLowerCase()
	);
	if (ret.success)
		return sendSimpleMessage(
			msg,
			ret.msg || 'Set your **' + fieldName + '** to `' + fieldValue + '`',
			Colors.DarkGreen
		);
	return sendSimpleMessage(msg, ret.msg || 'Something exploded... 🤕');
}
