import { EmbedBuilder } from "discord.js";
import { bot } from "../../okbot.js";
import { SET } from "../../settings.js";
import { formatNumber } from "../../utils.js";

export const name = "status";
export const alias = ["stats", "info"];
export const description = "ouh spooky scary internal stuff";

export async function execute(msg: okbot.Message) {
	const users = bot.users.cache.filter(user => !user.bot);
	const cpu = process.cpuUsage();
	const msge = new EmbedBuilder()
		.setTitle("bot status don't look")
		.setColor("White")
		.addFields(
			{ name: "Uptime", value: (Math.round(process.uptime() / 36) / 100).toString() + " h" },
			{
				name: "Latency",
				value: `msg: ${Date.now() - msg.createdTimestamp} ms | ws: ${Math.round(msg.client.ws.ping)} ms`
			},
			{ name: "RSS", value: formatNumber(Math.round(process.memoryUsage().rss / 1024)) + " KB" },
			{
				name: "CPU",
				value: `user: \`${Math.round(cpu.user / 1_000_000)}\` s | system: \`${Math.round(cpu.system / 1_000_000)}\` s`
			},
			{ name: "pid", value: process.pid.toString() },
			{ name: "NodeJS", value: process.version },
			{ name: "Cached users", value: formatNumber(users.size) }
		)
		.setFooter({ text: `okbot ${SET.BOT_VER}` });

	msg.reply({
		embeds: [msge],
		allowedMentions: {
			repliedUser: false
		}
	});
}
