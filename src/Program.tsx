/*
 * MIT License
 *
 * Copyright (c) 2019 Alexander Kromka
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import { raw } from "@nx-js/observer-util";
import * as React from "react";
import { store, view } from "react-easy-state";
import { Cmd } from "./Cmd";
import { Dispatcher } from "./Dispatcher";
import { RouterSetup, routerSetup } from "./router";
import { Sub } from "./Sub";
import { deepMerge, parseQuery as _parseQuery } from "./utils";
// // @ts-ignore
// import IO from "crocks/IO";
// // @ts-ignore
// import unit from "crocks/helpers/unit";

type Router<M, U> = Omit<RouterSetup<M, U>, "model">;
type DevTools<Model, Msg> = {
	onInit: (model: Model) => void;
	onUpdate: (msg: Msg, newModel: Model) => void;
};
/**
 * The program props : asks for init, view, update and subs in order
 * to start the TEA MVU loop.
 */

// type NoOp = null;
// export type Cmd<Msg> =
// 	| NoOp
// 	| {
// 			map: <ChildMsg>(fn: (a: ChildMsg) => Msg) => Cmd<Msg>;
// 			run: () => void;
// 	  };

interface ProgramProps<Model extends object, Msg, U> {
	init: () => [Model, Cmd<Msg>];
	view: ({
		dispatch,
		model
	}: {
		dispatch: Dispatcher<Msg>;
		model: Model;
	}) => JSX.Element;
	router: Router<Model, U>;
	update: (model: Model, msg: Msg) => [Model, Cmd<Msg>];
	subscriptions: (model: Model) => Sub<Msg>;
	devTools?: DevTools<Model, Msg>;
}

let _subscriptions: unknown;

const Program = <Model extends object, Msg, Query>({
	init,
	view: View,
	router,
	update,
	subscriptions,
	devTools
}: ProgramProps<Model, Msg, Query>) => {
	const [model, cmd] = init();

	const urlModel = router.deserializeUrlToModel({
		path: window.location.pathname.slice(1),
		query:
			(router.parseQuery && router.parseQuery(window.location.search)) ||
			_parseQuery(window.location.search)
	});
	deepMerge(model)(urlModel);

	if (devTools) {
		devTools.onInit(model);
	}

	const _store = store(model);
	(_subscriptions as Sub<Msg>) = subscriptions(model);

	const [dispatch] = React.useState(() => (msg: Msg) => {
		const [newModel, newCmds] = update(_store, msg);
		if (devTools) {
			devTools.onUpdate(msg, raw(newModel));
		}

		const newSub = subscriptions(raw(newModel));
		const prevSub = _subscriptions as Sub<Msg>;
		_subscriptions = newSub;

		newSub.init(dispatch);
		prevSub.release();
		setTimeout(() => {
			// IO.of(dispatch)
			// 	.map((_dispatch: typeof dispatch) => (cmd: Msg | NoOp) =>
			// 		cmd === null ? unit() : _dispatch(cmd)
			// 	)
			// 	// .ap(IO.of(newCmds))
			// 	.ap(newCmds)
			// 	.run();
			// newCmds.map(dispatch).run();
			newCmds.execute(dispatch);
		}, 0);
	});

	routerSetup({ model: _store, ...router });

	(_subscriptions as Sub<Msg>).init(dispatch);
	// trigger initial command
	React.useEffect(() => {
		setTimeout(() => {
			// IO.of(dispatch)
			// .map((_dispatch: typeof dispatch) => (cmd: Msg | NoOp) =>
			// 	cmd === null ? unit() : _dispatch(cmd)
			// )
			// // .ap(IO.of(cmd))
			// .ap(cmd)
			// .run();
			// cmd.map(dispatch).run();
			cmd.execute(dispatch);
		}, 0);
	}, []);

	return <View model={_store} dispatch={dispatch} />;
};

export const { mapMsg } = store({
	mapMsg: <Msg, _>(dispatch: Dispatcher<Msg>) => <ChildMsg, _>(
		childToMsg: (childMsg: ChildMsg) => Msg
	) => (childMsg: ChildMsg) => dispatch(childToMsg(childMsg))
});

export { view };
export { _parseQuery as parseQuery };

export type PartialDeep<T> = { [P in keyof T]?: PartialDeep<T[P]> | undefined };

export const run = view(Program);
