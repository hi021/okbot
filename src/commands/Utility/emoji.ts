import { Colors } from "discord.js";
import { createSimpleMessage } from "../../utils.js";

const EMOJI: { [name: string]: string } = {
	breathing: "<:adam:1007621226379886652>",
	petpotato: "<a:PETPOTATO:771391855275147264>",
	dyinginside: "<:dyinginside:517835383489298434>",
	handsomeyoungman: "<:handsomeyoungman:786042225271636058>",
	why: "<:why:622509378926411786>",
	poggers: "<:senkopog:765175862471295006>",
	hmmm: "<:hmmm:821207074121056286>",
	unhappiday: "<:unhappiday:731631576269586595>",
	brad: "<:brad:1067143475667140658>",
	rok: "<:rok:772551561704243263>",
	huwaa: "<:huwaa:1033805254694817842>",
	guh: "<:guh:1047230785050116126>",
	emo: "<:emo:1048627401686532176>"
};

function listEmoji() {
	let text = "";
	for (const i in EMOJI) text += `${EMOJI[i]}\t**${i}**\n`;
	return createSimpleMessage(text, Colors.White, "Available emoji").setFooter({
		text: "All occurrences of emoji names will be replaced with those emoji"
	});
}

export const name = "emoji";
export const description = "<:adam:1007621226379886652> No nitro abuser";
export const alias = ["e"];
export const usage =
	"<Any number of preset emoji names (use this command with no arguments to view full list)>";

export async function execute(msg: okbot.Message, args: string[]) {
	if (!args?.length) return msg.reply({ embeds: [listEmoji()], allowedMentions: { repliedUser: false } });

	let emojiText = "";
	for (const arg of args) {
		const e = arg.toLowerCase();
		emojiText += (EMOJI[e] || arg) + " ";
	}

	if (emojiText) return msg.channel.send(emojiText);
	return msg.reply({ embeds: [listEmoji()], allowedMentions: { repliedUser: false } });
}
