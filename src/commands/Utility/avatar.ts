import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	GuildMember,
	User
} from "discord.js";
import { bot } from "../../okbot.js";
import { getUserFromMsg, sendSimpleMessage } from "../../utils.js";

export const name = "avatar";
export const alias = ["av"];
export const description = "🧑 Get your avatar (or someone else's!)";
export const usage = "<Username OR Mention>";

bot.on("interactionCreate", async interaction => {
	if (!interaction.isButton()) return;

	const split = interaction.customId.split("-");
	if (split[0] !== "av") return;
	const userId = split[1];
	let mode = split[2];

	let user: User | GuildMember;
	const msge = EmbedBuilder.from(interaction.message.embeds[0]);

	if (mode == "user") {
		user = await bot.users.fetch(userId);
		mode = "server";
	} else if (interaction.guild) {
		user = await interaction.guild.members.fetch(userId);
		mode = "user";
	} else {
		interaction.update({});
		return;
	}

	msge.setImage(user.displayAvatarURL({ size: 4096, extension: "png" }));
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`av-${userId}-${mode}`)
			.setStyle(ButtonStyle.Primary)
			.setLabel(`Show ${mode} avatar`)
	);

	interaction.update({ embeds: [msge], components: [row] });
});

export async function execute(msg: okbot.Message, args: string[]) {
	const user = args.length ? await getUserFromMsg(msg, args) : msg.author;
	if (!user) return sendSimpleMessage(msg, "User not found.");
	const userGuild = await msg.guild!.members.fetch(user);

	const msge = new EmbedBuilder()
		.setDescription(`${userGuild}'s Avatar`) //user mention
		.setImage(userGuild.displayAvatarURL({ size: 4096, extension: "png" })) //png to allow pinkifying
		.setColor(userGuild.displayColor || Colors.White);

	const row = new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setCustomId(`av-${userGuild.id}-user`)
			.setStyle(ButtonStyle.Primary)
			.setLabel("Show user avatar")
	);

	return msg.reply({
		embeds: [msge],
		components: [row]
	});
}
