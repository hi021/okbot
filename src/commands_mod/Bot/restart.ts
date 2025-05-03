import { spawn } from "child_process";

export const name = "restart";
export const description = "die and undie, will detatch from terminal!";
export const restrict = "BOT_ADMIN";

// this does not really work anymore :( please help
export async function execute(msg: okbot.Message) {
	await msg.channel.send({ content: "https://youtu.be/Gb2jGy76v0Y" }); // Windows XP Shutdown Sound:)))))

	spawn(process.argv.shift() as string, process.argv, {
		cwd: process.cwd(),
		detached: false,
		stdio: "inherit"
	});
	process.exit();
}
