import { Colors, PermissionsBitField, TextChannel } from "discord.js";
import { createSimpleMessage } from "../../utils.js";

export const name = "say";
export const description = "💬 Get me to say your embarassing thoughts";
export const usage = "(_e) [Message]";

export async function execute(msg: okbot.Message, args: string[]) {
	if (!args?.length) return;

	if (
		msg.guild?.members?.me
			?.permissionsIn(msg.channel as TextChannel)
			.has(PermissionsBitField.Flags.ManageMessages)
	)
		msg.delete();

	if (args[0].toLowerCase() === "_e" && args.length > 1) {
		args.shift();
		return msg.channel.send({
			embeds: [createSimpleMessage(args.join(" "), Colors.White)]
		});
	}
	return msg.channel.send({ content: args.join(" ") });
}
