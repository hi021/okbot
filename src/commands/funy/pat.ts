export const name = 'pat';
export const hidden = true;

export function execute(msg: okbot.Message) {
	msg.channel.send('no daily for you <a:PETPOTATO:771391855275147264>');
}
