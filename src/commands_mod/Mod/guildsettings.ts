import { EmbedBuilder } from "discord.js";
import { SET } from "../../settings.js";
import { Guilds } from "../../volatile.js";

export const name = "guildsettings";
export const alias = ["server", "guild", "serversettings"];
export const description = "View bot settings for this guild";
export const restrict = "GUILD_ADMIN";

export async function execute(msg: okbot.Message, _: string[]) {
	const settings = Guilds[msg.guild!.id];

	let disabledChannels = "";
	if (settings?.blacklist) {
		for (const i of settings.blacklist) {
			disabledChannels += `<#${i}> `;
		}
	}

	const msge = new EmbedBuilder()
		.setTitle(`Preferences for ${msg.guild!.name}`)
		.addFields(
			{ name: "Prefix", value: `\`${settings?.pre ?? SET.PREFIX}\``, inline: true },
			{
				name: "Level up messages",
				value: settings?.lvl === false ? "`Disabled`" : "`Enabled`",
				inline: true
			},
			{
				name: `Disabled channels (${settings?.blacklist?.length ?? 0})`,
				value: disabledChannels || "None",
				inline: false
			}
		)
		.setFooter({
			text: "Use 'listreaction' to view custom reactions\nUse 'osutrack' to view osu! track settings for this guild"
		});

	return msg.reply({ embeds: [msge], allowedMentions: { repliedUser: false } });
}
