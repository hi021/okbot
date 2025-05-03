export const name = "eep";
export const hidden = true;

export function execute(msg: okbot.Message) {
	msg.channel.send("no rep for you 🛌");
}
