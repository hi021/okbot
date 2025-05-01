import canvasModule from 'canvas';
import { AttachmentBuilder, Colors, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getImageUrlFromMsg, sendSimpleMessage } from '../../utils.js';

// sets random pixels to black, higher threshold = more noise
function generateNoise(ctx: canvasModule.CanvasRenderingContext2D, noiseThreshold = 0.2, noiseColor = 255) {
	const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	const len = imgData.data.length;

	let skip = 4;
	if (len > 10000000) {
		skip = 8;
		noiseThreshold *= 2;
	}

	for (let i = 0; i < len; i += skip) {
		if (Math.random() < noiseThreshold)
			imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = noiseColor;
	}

	ctx.putImageData(imgData, 0, 0);
}

// higher threshold = more
function applyThreshold(ctx: canvasModule.CanvasRenderingContext2D, threshold = 175) {
	const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

	// +4 is for RGBA channels
	for (let i = 0; i < imgData.data.length; i += 4) {
		imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = imgData.data[i + 1] > threshold ? 255 : 0;
	}

	ctx.putImageData(imgData, 0, 0);
}

export const name = 'pinkify';
export const description =
	'<:color_lightPink:1008342282153513020> Makes images ridiculously pink (or any other color)';
export const alias = ['twinkify', 'sandpaper'];
export const usage =
	'[Image OR Image URL OR Mention OR Username (spaces replaced with _)] <Threshold (0-255)> <Max dimensions (WxH)> <Noise threshold (0-1)> <#Hex color>';
export const usageDetail = 'Default color is #FF5ED7';

export async function execute(msg: okbot.Message, args: string[]) {
	const url = await getImageUrlFromMsg(msg, args);
	if (!url) return sendSimpleMessage(msg, 'The usage for this command is:\n`' + usage + '`', Colors.White);

	let color: `#${string}` = '#FF5ED7';
	let threshold = 175;
	let maxW = 2048,
		maxH = 2048;
	let noiseThreshold = 0.2;

	if (args.length) {
		let thresholdTmp = parseFloat(args[0]);
		if (!isNaN(thresholdTmp) && thresholdTmp >= 0 && thresholdTmp <= 255) {
			threshold = thresholdTmp;
			args.shift();
		}

		if (args.length) {
			const dim = args[0].split('x');
			const newW = parseInt(dim[0]);
			const newH = parseInt(dim[1]);
			if (!isNaN(newW) && !isNaN(newH) && newW >= 10 && newH > 10) {
				maxW = Math.min(newW, maxW);
				maxH = Math.min(newH, maxH);
				args.shift();
			}

			if (args.length) {
				const noiseTmp = parseFloat(args[0]);
				if (!isNaN(noiseTmp) && noiseTmp >= 0 && noiseTmp <= 1) {
					noiseThreshold = noiseTmp;
					args.shift();
				}

				if (args[0]?.startsWith('#')) {
					const colorString = args[0].slice(1);
					const colorInt = Number('0x' + colorString);

					if (!isNaN(colorInt)) {
						if (colorString.length === 6) {
							color = args.shift() as `#${string}`;
						} else if (colorString.length === 3) {
							color = ('#' +
								colorString[0].repeat(2) +
								colorString[1].repeat(2) +
								colorString[2].repeat(2)) as `#${string}`;
						}
					}
				}
			}
		}
	}

	msg.channel.sendTyping();
	const filename = `pinkify_${new Date().getTime()}.png`;

	try {
		// draw original image and threshold it
		const canvasImage = canvasModule.createCanvas(maxW, maxH);
		const contextImage = canvasImage.getContext('2d');

		const image = new canvasModule.Image();
		const imagePromise: Promise<{ w: number; h: number }> = new Promise((resolve, reject) => {
			image.onload = () => {
				let w = image.width,
					h = image.height;
				if (w > maxW || h > maxH) {
					if (w > h) {
						h = Math.round(Math.min(maxW * (h / w), maxH));
						w = maxW;
					} else {
						w = Math.round(Math.min(maxH * (w / h), maxW));
						h = maxH;
					}
				}
				canvasImage.width = w;
				canvasImage.height = h;

				contextImage.drawImage(image, 0, 0, w, h);
				applyThreshold(contextImage, threshold);

				resolve({ w, h });
			};

			image.onerror = e => {
				reject(e);
			};

			image.src = url;
		});

		const { w, h } = await imagePromise;
		if (noiseThreshold > 0) generateNoise(contextImage, noiseThreshold);

		// fill bg
		const canvasMain = canvasModule.createCanvas(w, h);
		const contextMain = canvasMain.getContext('2d');
		contextMain.fillStyle = color;
		contextMain.fillRect(0, 0, maxW, maxH);
		contextMain.globalCompositeOperation = 'overlay';

		const imageURI = canvasImage.toDataURL();
		const imageFiltered = new canvasModule.Image();
		const mergePromise: Promise<string> = new Promise((resolve, reject) => {
			try {
				imageFiltered.onload = () => {
					contextMain.drawImage(imageFiltered, 0, 0, w, h);

					const filePath = path.join(process.env.IMG_EDIT_PATH ?? './', filename);
					const writeStream = fs.createWriteStream(filePath);
					const pngStream = canvasMain.createPNGStream();

					pngStream.pipe(writeStream);
					writeStream.on('finish', () => {
						console.log('PNG created in ' + filePath);
						resolve(filePath);
					});
				};

				imageFiltered.onerror = e => reject(e);

				imageFiltered.src = imageURI;
			} catch (e) {
				reject(e);
			}
		});

		const finalFilename = await mergePromise;
		const attachment = new AttachmentBuilder(finalFilename);
		const msge = new EmbedBuilder()
			.setImage(`attachment://${filename}`)
			.setColor(color)
			.setFooter({ text: `${w}x${h} ● ${threshold} threshold ● ${noiseThreshold} noise` });
		msg.reply({ embeds: [msge], files: [attachment], allowedMentions: { repliedUser: false } });
	} catch (e) {
		console.error(`Failed to pinkify ${url}:\n`, e);
		return sendSimpleMessage(
			msg,
			'No suitable image found.\nIt might not exist or be of an unsupported type (e.g. .webp).'
		);
	}
}
