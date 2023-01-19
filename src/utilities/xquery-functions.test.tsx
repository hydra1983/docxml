/** @jsx Docx.jsx */
import { describe, expect, it, run } from 'https://deno.land/x/tincan@1.0.1/mod.ts';

import { Cell } from '../components/Cell.ts';
import { Row } from '../components/Row.ts';
import { Table } from '../components/Table.ts';
import { Docx } from '../Docx.ts';
import { cm, emu, hpt, inch, pt, twip } from './length.ts';
import { QNS } from './namespaces.ts';
import { evaluateXPathToBoolean, evaluateXPathToMap, evaluateXPathToNumber } from './xquery.ts';

describe('XQuery functions', () => {
	it('docxml:length', () => {
		expect(evaluateXPathToMap(`docxml:length(10, "pt")`)).toEqual(pt(10));
		expect(evaluateXPathToMap(`docxml:length(10, "emu")`)).toEqual(emu(10));
		expect(evaluateXPathToMap(`docxml:length(10, "hpt")`)).toEqual(hpt(10));
		expect(evaluateXPathToMap(`docxml:length(10, "twip")`)).toEqual(twip(10));
		expect(evaluateXPathToMap(`docxml:length(10, "cm")`)).toEqual(cm(10));
		expect(evaluateXPathToMap(`docxml:length(10, "inch")`)).toEqual(inch(10));
	});

	it('docxml:cell-column', async () => {
		// @TODO isolate this unit test from JSX and the Table/Row/Cell classes. Use OOXML for scaffolding instead.
		const archive = await Docx.fromJsx(
			<Table>
				<Row>
					<Cell />
					<Cell colSpan={2} />
					<Cell />
				</Row>
			</Table>,
		).toArchive();
		const dom = await archive.readXml('word/document.xml');
		expect(evaluateXPathToNumber(`docxml:cell-column(//${QNS.w}tc[1])`, dom)).toBe(0);
		expect(evaluateXPathToNumber(`docxml:cell-column(//${QNS.w}tc[2])`, dom)).toBe(1);
		expect(evaluateXPathToNumber(`docxml:cell-column(//${QNS.w}tc[3])`, dom)).toBe(3);
	});

	it('docxml:is-on-off-enabled', () => {
		expect(evaluateXPathToBoolean(`docxml:is-on-off-enabled("true")`)).toBeTruthy();
		expect(evaluateXPathToBoolean(`docxml:is-on-off-enabled("1")`)).toBeTruthy();
		expect(evaluateXPathToBoolean(`docxml:is-on-off-enabled("on")`)).toBeTruthy();
		expect(evaluateXPathToBoolean(`docxml:is-on-off-enabled("TRUE")`)).toBeFalsy();
		expect(evaluateXPathToBoolean(`docxml:is-on-off-enabled("false")`)).toBeFalsy();
	});
});

run();
