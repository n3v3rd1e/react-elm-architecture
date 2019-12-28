import { observe } from "@nx-js/observer-util";
import { stringify } from "qs";
import { debounce, parseQuery as _parseQuery, deepMerge } from "./utils";
import { batch } from "react-easy-state";

let shouldReact = true;

const serializeModelReactions = debounce(0, reaction => {
	if (shouldReact) {
		return reaction();
	}
	shouldReact = true;
});

type Url<U> = { path: string; query: U };

export type RouterSetup<M, U> = {
	model: M;
	serializeModelToUrl: (m: M) => Url<U>;
	deserializeUrlToModel: (u: Url<U>) => { path: Url<U>["path"] } & any;
	parseQuery?: (q: string) => Url<U>["query"];
	onPopState?: (m: M) => void;
};

export const routerSetup = <M, U>({
	model,
	serializeModelToUrl,
	deserializeUrlToModel,
	parseQuery,
	onPopState
}: RouterSetup<M, U>) => {
	observe(
		() => {
			const { path, query } = serializeModelToUrl(model);
			window.history.pushState(
				null,
				path,
				`/${path}?${stringify(query, {
					arrayFormat: "indices",
					encodeValuesOnly: true
				})}`
			);
		},
		{
			scheduler: serializeModelReactions,
		}
	);
	window.onpopstate = () => {
		shouldReact = false;
		const urlModel = deserializeUrlToModel({
			path: window.location.pathname.slice(1),
			query:
				(parseQuery && parseQuery(window.location.search)) ||
				_parseQuery(window.location.search)
		});
		batch(() => {
			deepMerge(model)(urlModel);
			if (onPopState) {
				onPopState(model);
			}
		});
	};
};
