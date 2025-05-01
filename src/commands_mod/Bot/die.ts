export const name = 'die';
export const alias = ['kill'];
export const description = "immediately terminate the boot's :( process";
export const restrict = 'BOT_OWNER';

export function execute() {
	process.kill(process.pid, 'SIGTERM');
}
