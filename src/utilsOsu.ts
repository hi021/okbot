import canvasModule from "canvas";
import fetch from "cross-fetch";
import * as d3 from "d3";
import fs from "fs";
import jsdom from "jsdom";
import path from "path";
const { JSDOM } = jsdom;
const DOM = new JSDOM("<!DOCTYPE html><html><body></body></html>");
const API_URL = "https://poggers.ltd/api/";

export async function osu_getId(name: string): Promise<number | null> {
	try {
		const res = await fetch(`${API_URL}id/${name}`, {
			method: "GET",
			headers: {
				Accept: "application/json"
			}
		});
		if (!res.ok) throw new Error(res.statusText);

		const resJson = await res.json();
		return resJson.id;
	} catch (e) {
		console.error("Failed to get osu id:\n", e);
		return null;
	}
}

export async function osu_getT50(id: string | number) {
	try {
		const res = await fetch(`${API_URL}profile/${id}`, {
			method: "GET",
			headers: {
				Accept: "application/json"
			}
		});
		if (!res.ok) throw new Error(res.statusText);

		const resJson = await res.json();
		return resJson;
	} catch (e) {
		console.error("Failed to get osu top50:\n", e);
		return null;
	}
}

export const getOsuAvatar = (id: string | number) => `https://a.ppy.sh/${id}_0.png`;

// filename is 'id_date.png' or 'id1_id2_date.png'
export function top50_chart_get(filename: string) {
	const filePath = path.join(process.env.T50_IMG_PATH ?? "./", filename);
	return fs.existsSync(filePath) ? filePath : null;
}

// filename is 'id1-id2-date.png'
export function merged_avatars_get(filename: string) {
	const filePath = path.join(process.env.T50_AV_PATH ?? "./", filename);
	return fs.existsSync(filePath) ? filePath : null;
}

const clearBody = (body: any) => body.html(null);

export async function merge_avatars(url1: string, url2: string, saveFilename: string) {
	const w = 160,
		h = 160,
		imgw = 96,
		imgh = 96;
	const canvas = canvasModule.createCanvas(w, h);
	const context = canvas.getContext("2d");
	const image1 = new canvasModule.Image();
	const image2 = new canvasModule.Image();

	const img1Promise = new Promise((resolve, reject) => {
		image1.onload = () => resolve(1);
		image1.onerror = e => reject(e);
	});
	const img2Promise = new Promise((resolve, reject) => {
		image2.onload = () => resolve(1);
		image2.onerror = e => reject(e);
	});

	try {
		image1.src = url1;
		image2.src = url2;
		await Promise.all([img1Promise, img2Promise]);
		context.drawImage(image1, 0, 0, imgw, imgh);
		context.drawImage(image2, w - imgw, h - imgh, imgw, imgh);

		const returnPromise: Promise<string | null> = new Promise((resolve, reject) => {
			const filePath = path.join(process.env.T50_AV_PATH ?? "./", saveFilename);
			const writeStream = fs.createWriteStream(filePath);
			const pngStream = canvas.createPNGStream();
			pngStream.pipe(writeStream);

			writeStream.on("finish", () => resolve(filePath));
			writeStream.on("error", e => reject(e));
		});

		return await returnPromise;
	} catch (e) {
		console.error(`Failed to merge avatars for ${url1} and ${url2}:\n`, e);
		return null;
	}
}

// takes an array of arrays of sorted values,
// array of colors (any format that canvas accepts) (can be different size than data array)
// if `pngFilename` is not defined the png won't be saved
// will break if any data is empty
// can be changed to return just the data uri without saving png to disk
// TODO?: order the data arrays and make putting images synchronous to put smaller areas on top ; also stacked chart!
export async function top50_chart_generate(
	data: Array<number[]>,
	colors: Array<string>,
	pngFilename?: string,
	showAxisY = true,
	w = 432,
	h = 64,
	topMargin = 2
) {
	// get domains and remove null values
	let longestData = 0;
	for (let i = 0; i < data.length; i++) {
		data[i] = data[i].filter(a => a != null);
		if (data[i].length > longestData) longestData = data[i].length;
	}
	if (!longestData) return null;

	let set = false;
	let minData = 0;
	let maxData = 0;
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < data[i].length; j++) {
			const curValue = data[i][j];

			if (!set) {
				minData = maxData = curValue;
				set = true;
				continue;
			}

			if (curValue < minData) minData = curValue;
			else if (curValue > maxData) maxData = curValue;
		}
	}

	const domainPadding = data.length === 1 ? 20 : Math.round((maxData - minData) * 0.32);

	// generate svg in DOM
	try {
		const body = d3.select(DOM.window.document).select("body");
		const svg = body
			.attr("width", `${w}px`)
			.attr("height", `${h}px`)
			.append("svg")
			.attr("width", `${w}px`)
			.attr("height", `${h}px`)
			.attr("xmlns", "http://www.w3.org/2000/svg")
			.attr("viewBox", `0 0 ${w} ${h}`);

		// domain is data, range is size in pixels
		const xScale = d3
			.scaleLinear()
			.domain([0, longestData - 1])
			.range([0, w]);
		const yScale = d3
			.scaleLinear()
			.domain([minData - domainPadding, maxData + domainPadding])
			.range([h, topMargin]);

		const line = d3
			.line()
			.curve(d3.curveCardinal)
			.x((_, i) => xScale(i))
			.y((d: any) => yScale(d));
		const area = d3
			.area()
			.curve(d3.curveCardinal)
			.x((_, i) => xScale(i))
			.y1((d: any) => yScale(d))
			.y0(h)
			.defined((d: any) => d != null);

		for (let i = 0; i < data.length; i++) {
			const clr = colors[i % colors.length];
			svg
				.append("g")
				.append("path")
				.datum(data[i])
				.attr("d", area(data[i] as unknown as any))
				.attr("fill", clr)
				.attr("opacity", 0.3);
			svg
				.append("path")
				.datum(data[i])
				.attr("d", line(data[i] as unknown as any))
				.attr("stroke", clr)
				.attr("stroke-width", 1)
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("fill", "none");
		}

		if (showAxisY)
			svg
				.append("g")
				.call(d3.axisRight(yScale).ticks(3, " f").tickSizeInner(3).tickSizeOuter(0))
				.attr("font-size", "10")
				.attr("color", "#fff");

		// paint onto canvas and export as png
		const svgString = body.html();
		const svgDataUrl = "data:image/svg+xml," + Buffer.from(svgString).toString("utf8");
		const canvas = canvasModule.createCanvas(w, h);
		const context = canvas.getContext("2d");
		const image = new canvasModule.Image();

		const imagePromise: Promise<string | null> = new Promise((resolve, reject) => {
			image.onload = () => {
				context.drawImage(image, 0, 0, w, h);
				if (!pngFilename) {
					resolve(null);
					return;
				}

				try {
					const filePath = path.join(process.env.T50_IMG_PATH ?? "./", pngFilename);
					const writeStream = fs.createWriteStream(filePath);
					const pngStream = canvas.createPNGStream();
					pngStream.pipe(writeStream);

					writeStream.on("finish", () => resolve(filePath));
				} catch (e) {
					reject(e);
				}
			};

			image.onerror = e => reject(e);
			image.src = svgDataUrl;
		});

		const localPath = await imagePromise;
		clearBody(body);
		return localPath;
	} catch (e) {
		console.error("Failed to generate chart image:\n", e);
		return null;
	}
}
