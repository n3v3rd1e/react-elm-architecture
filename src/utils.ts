import * as qs from "qs";

export const debounce = (delay: number, fn: (...args: any[]) => void) => {
	let timerId: number | null;
	return (...args: any[]) => {
		if (timerId) {
			clearTimeout(timerId);
		}
		timerId = setTimeout(() => {
			fn(...args);
			timerId = null;
		}, delay);
	};
};

export const parseQuery = <U>(queryString: string): U => {
	return qs.parse(queryString, {
		ignoreQueryPrefix: true,
		// @ts-ignore
		arrayFormat: "indices",
		encodeValuesOnly: true,
		arrayLimit: 150,
		depth: 6,
		decoder(value: string) {
			if (
				/^-?(0|0\.\d+|[1-9]|[1-9](\.\d+)|[1-9]+\d+(\.\d+)?)$/.test(
					value
				)
			) {
				return parseFloat(value);
			}

			const keywords = {
				undefined,
				true: true,
				false: false,
				null: null
			};
			if (value in keywords) {
				// @ts-ignore
				return keywords[value];
			}

			return decodeURIComponent(value);
		}
	});
};

const isObject = (x: any) =>
	!!x && Object.prototype.toString.call(x) === "[object Object]";

const isArray = (x: any) => !!x && Array.isArray(x);

export const deepMerge = (obj: any) => (obj2: any) => {
	for (const key in obj2) {
		if (obj[key] === undefined) {
			obj[key] = obj2[key];
			continue;
		}

		if (!isArray(obj2[key]) && !isObject(obj2[key])) {
			if (obj[key] !== obj2[key]) {
				obj[key] = obj2[key];
			}
			continue;
		}

		if (isArray(obj2[key])) {
			obj[key].splice(
				obj2[key].length,
				obj[key].length - obj2[key].length
			);
			obj2[key].forEach((item: any, index: number) =>
				deepMerge(obj[key][index])(item)
			);
			continue;
		}

		if (isObject(obj2[key])) {
			deepMerge(obj[key])(obj2[key]);
		}
	}
};
