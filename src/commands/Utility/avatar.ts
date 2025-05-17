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
	let mode = split[2] as "user" | "guild";
	let user: User | GuildMember;
	const msge = EmbedBuilder.from(interaction.message.embeds[0]);

	if (mode == "user") {
		user = await bot.users.fetch(userId);
		mode = "guild";
	} else if (interaction.guild) {
		user = await interaction.guild.members.fetch(userId);
		mode = "user";
	} else {
		interaction.update({});
		return;
	}

	interaction.update({ embeds: [buildAvatarEmbed(msge, user)], components: [buildButtonRow(userId, mode)] });
});

function buildAvatarEmbed(msge: EmbedBuilder, user: User | GuildMember) {
	return msge
		.setDescription(`${user}'s Avatar`)
		.setImage(user.displayAvatarURL({ size: 4096, extension: "png" })) // works with animated avatars!
		.setColor((user instanceof GuildMember && user.displayColor) || Colors.White);
}

function buildButtonRow(userId: string, modeAfterSwitch: "user" | "guild") {
	return new ActionRowBuilder<ButtonBuilder>().setComponents(
		new ButtonBuilder()
			.setCustomId(`av-${userId}-${modeAfterSwitch}`)
			.setStyle(ButtonStyle.Primary)
			.setLabel(`Show ${modeAfterSwitch} avatar`)
			.setEmoji(modeAfterSwitch == "user" ? "🤵" : "👯")
	);
}

export async function execute(msg: okbot.Message, args: string[]) {
	const user = args.length ? await getUserFromMsg(msg, args) : msg.author;
	if (!user) return sendSimpleMessage(msg, "User not found.");
	const userOrMember = msg.inGuild() ? await msg.guild.members.fetch(user) : user;

	return msg.reply({
		embeds: [buildAvatarEmbed(new EmbedBuilder(), userOrMember)],
		components: [buildButtonRow(userOrMember.id, msg.inGuild() ? "user" : "guild")]
	});
}
