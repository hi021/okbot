import {
	ActionRowBuilder,
	APIEmbedField,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	User
} from 'discord.js';
import { db_fish_add, db_plr_add, db_plr_get } from '../../db/db.js';
import { bot } from '../../okbot.js';
import { SET } from '../../settings.js';
import {
	capitalizeFirstLetter,
	createSimpleMessage,
	formatDoler,
	formatNumber,
	getUserFromMsg,
	numberToEmoji,
	sendEphemeralReply,
	sendSimpleMessage,
	showItemName
} from '../../utils.js';
import { BakeryStaff } from '../Business/bakery.js';
import { Fish } from './fish.js';

export const name = 'collection';
export const alias = ['collectors', 'coll'];
export const description = '👽 View collection of extreme rarities';
export const usage = '<Username OR Mention>';

const displayItem = (item: okbot.CollectionItem) => {
	let itemString = '';

	// top row colors
	for (let i = 1; i <= 5; i++) {
		if (item[i as 1 | 2 | 3 | 4 | 5]) itemString += '🟦';
		else itemString += '⬛';
	}
	if (item.fin) {
		itemString += '  🌟';
		if (item.fin > 1) itemString += `**x${item.fin}**`;
	}
	itemString += '\n';

	// bottom row numbers
	for (let i = 1; i <= 5; i++) {
		const partsCount = item[i as 1 | 2 | 3 | 4 | 5] ?? 0;
		itemString += numberToEmoji(partsCount);
	}

	return itemString;
};

bot.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;
	const split = interaction.customId.split('-');
	const id = split[1];
	const item = split[2];

	if (split[0] === 'collection_forge') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, 'This precious collection does not belong to you!');

		const result = await forgeItem(interaction.user, item);
		return interaction.reply({ embeds: [result.msge], components: result.components ?? [] });
	}

	if (split[0] === 'collection_forge_confirm') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, 'This precious collection does not belong to you!');

		await confirmForgeItem(interaction.user, item, interaction.message as okbot.Message);
		try {
			interaction.message.delete();
		} catch (e) {
			// remove buttons
			interaction.update({ components: [] });
		}
		return;
	}

	if (split[0] === 'collection_forge_cancel') {
		if (id !== interaction.user.id)
			return sendEphemeralReply(interaction, 'This precious collection does not belong to you!');

		try {
			interaction.message.delete();
		} catch (e) {
			// remove buttons
			interaction.update({ components: [] });
		}
		return;
	}
});

// name should already be formatted to have only the first letter capital (eg. Pure euphoria)
async function forgeItem(user: User, item: string) {
	if (Fish.f[item]?.type != 'collectors')
		return {
			msge: createSimpleMessage(
				'Only `collectors` rarity fish parts can be forged into items!\nPlease check your spelling.',
				Colors.DarkRed
			)
		};

	const plrdat = await db_plr_get({ _id: user.id, fishCol: 1, mon: 1 });
	const collItem = plrdat?.fishCol?.[item];
	if (!collItem || !collItem[1] || !collItem[2] || !collItem[3] || !collItem[4] || !collItem[5])
		return {
			msge: createSimpleMessage(
				"You don't have all five collection parts required to forge this item!",
				Colors.DarkRed
			)
		};

	const cost = SET.COLLECTION_FORGE_COST ?? 1000000;
	const mon = plrdat?.mon ?? 0;
	if (cost > mon)
		return {
			msge: createSimpleMessage(
				`You need ${formatDoler(cost - mon)} more to forge this item.`,
				Colors.DarkRed
			)
		};

	const msge = new EmbedBuilder()
		.setColor(Colors.Blurple)
		.setAuthor({ name: `Forging ${showItemName({ nam: item, emoji: Fish.f[item].emoji }, false)}` })
		.addFields({ name: 'Total cost', value: '💵 ' + formatNumber(cost) });

	const components: ActionRowBuilder<ButtonBuilder>[] = [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`collection_forge_confirm-${user.id}-${item}`)
				.setStyle(ButtonStyle.Success)
				.setLabel('Confirm'),
			new ButtonBuilder()
				.setCustomId(`collection_forge_cancel-${user.id}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel('Cancel')
		)
	];

	switch (item) {
		case 'Alien artifact': {
			msge.setDescription("+ Extremely valuable collector's aquarium display item");
			break;
		}
		case 'Ancient skeleton': {
			msge.setDescription('+ 11 000 000 💵 (TEMPORARY - full-fledged reward to be implemented)');
			break;
		}
		case 'Perfect genome': {
			// if already has all 5 employees, give 24M instead
			msge.setDescription(
				(collItem?.fin ?? 0 >= 5)
					? '+ 24 000 000 💵 Large one-time payment'
					: '+ Hyper-effective bakery worker (more rewards to be implemented)'
			);
			break;
		}
		case 'Lost crown': {
			msge.setDescription('+ 10 000 000 💵 Large one-time payment');
			break;
		}
		case 'Pure euphoria': {
			msge.setDescription('+ 11 000 000 💵 (TEMPORARY - full-fledged reward to be implemented)');
			break;
		}
		default: {
			return {
				msge: createSimpleMessage(
					'Only `collectors` rarity fish parts can be forged into items!\nPlease check your spelling.',
					Colors.DarkRed
				)
			};
		}
	}

	return { msge, components };
}

async function confirmForgeItem(user: User, item: string, msg: okbot.Message) {
	if (Fish.f[item]?.type != 'collectors')
		return sendSimpleMessage(
			msg,
			'Only `collectors` rarity fish parts can be forged into items!\nPlease check your spelling.'
		);

	const plrdat = await db_plr_get({ _id: user.id, fishCol: 1, mon: 1 });
	const collItem = plrdat?.fishCol?.[item];
	if (!collItem || !collItem[1] || !collItem[2] || !collItem[3] || !collItem[4] || !collItem[5])
		return sendSimpleMessage(msg, "You don't have all five collection parts required to forge this item!");

	const cost = SET.COLLECTION_FORGE_COST ?? 1000000;
	const mon = plrdat?.mon ?? 0;
	if (cost > mon)
		return sendSimpleMessage(msg, `You need ${formatDoler(cost - mon)} more to forge this item.`);

	// add rewards and remove parts from inventory
	let reward = '';
	switch (item) {
		case 'Alien artifact': {
			await db_plr_add({ _id: user.id, fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } } });
			await db_fish_add(user.id, 'Alien species', 0);
			reward = '- 1x ' + showItemName({ nam: 'Alien species', emoji: Fish.f['Alien species'].emoji }, false);
			break;
		}
		case 'Ancient skeleton': {
			await db_plr_add({
				_id: user.id,
				mon: 11000000,
				income: { fish: 11000000 },
				fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } }
			});
			reward = '- 11 000 000 💵'; // todo
			break;
		}
		case 'Perfect genome': {
			if (collItem?.fin ?? 0 >= 5) {
				await db_plr_add({
					_id: user.id,
					mon: 18000000,
					income: { fish: 18000000 },
					fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } }
				});
				reward = '- 18 000 000 💵';
			} else {
				await db_plr_add({
					_id: user.id,
					fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } }
				});
				reward =
					'- 1x ' + showItemName({ nam: BakeryStaff['90'].nam, emoji: BakeryStaff['90'].emoji }, false);
			}
			break;
		}
		case 'Lost crown': {
			await db_plr_add({
				_id: user.id,
				mon: 10000000,
				income: { fish: 10000000 },
				fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } }
			});
			reward = '- 10 000 000 💵';
			break;
		}
		case 'Pure euphoria': {
			await db_plr_add({
				_id: user.id,
				mon: 11000000,
				income: { fish: 11000000 },
				fishCol: { [item]: { fin: 1, 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 } }
			});
			reward = '- 11 000 000 💵'; // todo
			break;
		}
		default: {
			return sendSimpleMessage(
				msg,
				'Only `collectors` rarity fish parts can be forged into items!\nPlease check your spelling.'
			);
		}
	}

	await db_plr_add({ _id: user.id, mon: -cost, expense: { fish: cost } });
	return sendSimpleMessage(
		msg,
		'Congratulations! 🎊\nYour rewards have been delivered:\n' + reward,
		Colors.Blue
	);
}

const isCollectionItemVisible = (item: okbot.CollectionItem) =>
	item[1] || item[2] || item[3] || item[4] || item[5] || item.fin;
const isCollectionItemForgeable = (item: okbot.CollectionItem) =>
	item[1] && item[2] && item[3] && item[4] && item[5];
const getCollectionItemPartCount = (item: okbot.CollectionItem) =>
	(item[1] ?? 0) + (item[2] ?? 0) + (item[3] ?? 0) + (item[4] ?? 0) + (item[5] ?? 0);

function showEmptyCollectionMessage(msge: EmbedBuilder, msg: okbot.Message) {
	msge.setDescription('🕸️ *nothing to see here...*');
	return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}

export async function execute(msg: okbot.Message, args: string[]) {
	let user = msg.author;
	if (args[0]) {
		if (args[0].toLowerCase() == 'forge') {
			args.shift();
			let forgingItem = capitalizeFirstLetter(args.join(' '));
			if (!forgingItem) return sendSimpleMessage(msg, 'Please provide the name of item you wish to forge.');

			// try to find collectors item by partial name
			if (!Fish.f[forgingItem]) {
				const findRegex = new RegExp(forgingItem, 'gi');
				for (const fish in Fish.f) {
					if (Fish.f[fish].type == 'collectors' && findRegex.test(fish)) {
						forgingItem = fish;
						break;
					}
				}
			}

			const result = await forgeItem(msg.author, forgingItem);
			return msg.reply({ embeds: [result.msge], components: result.components ?? [] });
		} else {
			user = (await getUserFromMsg(msg, args)) ?? msg.author;
		}
	}

	const plrdat = await db_plr_get({ _id: user.id, fishCol: 1 });
	const msge = new EmbedBuilder()
		.setAuthor({
			iconURL: user.displayAvatarURL({ size: 32, forceStatic: true }),
			name: user.displayName + "'s Collectibles vault"
		})
		.setColor(Colors.Blurple);

	if (!plrdat?.fishCol) return showEmptyCollectionMessage(msge, msg);

	let itemCountTotal = 0;
	let partCountTotal = 0;
	const fields: APIEmbedField[] = [];
	const forgeableItems: string[] = [];
	const sortedCollection = Object.entries(plrdat.fishCol).sort((a, b) => (a[0] < b[0] ? -1 : 1));
	for (const i of sortedCollection) {
		const name = i[0];
		const item = i[1];

		if (isCollectionItemVisible(item)) {
			fields.push({ name: `${Fish.f[name].emoji} ${name}`, value: displayItem(item) });

			itemCountTotal += item.fin ?? 0;
			partCountTotal += getCollectionItemPartCount(item);
			if (isCollectionItemForgeable(item)) forgeableItems.push(name);
		}
	}

	if (!fields.length) return showEmptyCollectionMessage(msge, msg);

	msge.addFields([
		...fields,
		{ name: '\u200b', value: '\u200b' },
		{ name: 'Forged items', value: itemCountTotal.toString(), inline: true },
		{ name: 'Total parts', value: partCountTotal.toString(), inline: true }
	]);

	const components: ActionRowBuilder<ButtonBuilder>[] = [];
	if (forgeableItems.length) {
		const cost = formatNumber(SET.COLLECTION_FORGE_COST ?? 1000000);
		msge.setFooter({
			text: `You have forgeable collection items!\nUse 'collection forge <item name>' to claim your rewards.\nEach forge costs 💵 ${cost}.`
		});

		const buttons = new ActionRowBuilder<ButtonBuilder>();
		for (const item of forgeableItems)
			buttons.addComponents(
				new ButtonBuilder()
					.setCustomId(`collection_forge-${user.id}-${item}`)
					.setStyle(ButtonStyle.Primary)
					.setLabel(`Forge ${showItemName({ nam: item, emoji: Fish.f[item].emoji }, false)}`)
			);

		components.push(buttons);
	}

	return msg.reply({ embeds: [msge], components, allowedMentions: { repliedUser: false } });
}
