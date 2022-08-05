import type { ComponentAncestor } from '../classes/Component.ts';
import { Component } from '../classes/Component.ts';
import { createChildComponentsFromNodes, registerComponent } from '../utilities/components.ts';
import { create } from '../utilities/dom.ts';
import { QNS } from '../utilities/namespaces.ts';
import { evaluateXPathToMap } from '../utilities/xquery.ts';
import { Paragraph } from './Paragraph.ts';
import { Table } from './Table.ts';

export type CellChild = Paragraph;

export type CellProps = {
	colSpan?: number | null;
	rowSpan?: number | null;
};

export class Cell extends Component<CellProps, CellChild> {
	public static readonly children: string[] = ['Paragraph', 'Table'];
	public static readonly mixed: boolean = false;

	public toNode(ancestry: ComponentAncestor[]): Node {
		const table = ancestry.find((ancestor): ancestor is Table => ancestor instanceof Table);
		if (!table) {
			throw new Error('A row cannot be rendered outside the context of a table');
		}

		const children = this.childrenToNode(ancestry) as Node[];
		if (!(this.children[this.children.length - 1] instanceof Paragraph)) {
			// Cells must always end with a paragraph, or MS Word will complain about
			// file corruption.
			children.push(new Paragraph({}).toNode([this, ...ancestry]));
		}

		return create(
			`
				element ${QNS.w}tc {
					element ${QNS.w}tcPr {
						element ${QNS.w}tcW {
							attribute ${QNS.w}w { $width },
							attribute ${QNS.w}type { "dxa" }
						},
						if ($colSpan > 1) then element ${QNS.w}gridSpan {
							attribute ${QNS.w}val { $colSpan }
						} else (),
						if ($rowSpan > 1) then element ${QNS.w}vMerge {
							attribute ${QNS.w}val { "restart" }
						} else ()
					},
					for $child in $children
						return $child
				}
			`,
			{
				children,
				width: table.props.columnWidths?.[table.model.getCellInfo(this).column]?.twip || 0,
				colSpan: this.getColSpan(),
				rowSpan: this.getRowSpan(),
			},
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public toRepeatingNode(ancestry: ComponentAncestor[], column: number, _row: number): Node | null {
		const table = ancestry.find((ancestor): ancestor is Table => ancestor instanceof Table);
		if (!table) {
			throw new Error('A row cannot be rendered outside the context of a table');
		}

		const info = table.model.getCellInfo(this);
		if (column > info.column) {
			// Colspans are only recorded on the left-most cell coordinate. No extra node needed;
			return null;
		}

		return create(
			`
				element ${QNS.w}tc {
					element ${QNS.w}tcPr {
						element ${QNS.w}tcW {
							attribute ${QNS.w}w { $width },
							attribute ${QNS.w}type { "dxa" }
						},
						if ($colSpan > 1) then element ${QNS.w}gridSpan {
							attribute ${QNS.w}val { $colSpan }
						} else (),
						element ${QNS.w}vMerge {
							attribute ${QNS.w}val { "continue" }
						}
					},
					element ${QNS.w}p {}
				}
			`,
			{
				width: table.props.columnWidths?.[info.column]?.twip || 0,
				colSpan: this.getColSpan(),
			},
		);
	}

	public getColSpan() {
		return this.props.colSpan || 1;
	}

	public getRowSpan() {
		return this.props.rowSpan || 1;
	}

	static matchesNode(node: Node): boolean {
		return node.nodeName === 'w:tc';
	}

	static fromNode(node: Node): Cell {
		const { children, ...props } = evaluateXPathToMap(
			`
				let $colStart := ooxml:cell-column(.)

				let $rowStart := count(../preceding-sibling::${QNS.w}tr)

				let $firstNextRow := ../following-sibling::${QNS.w}tr[
					child::${QNS.w}tc[ooxml:cell-column(.) = $colStart and not(
						./${QNS.w}tcPr/${QNS.w}vMerge[
							@${QNS.w}val = "continue" or
							not(./@${QNS.w}val)
						]
					)]
				][1]

				let $rowEnd := if ($firstNextRow)
					then count($firstNextRow/preceding-sibling::${QNS.w}tr)
					else count(../../${QNS.w}tr) - 1

				return map {
					"colSpan": if (./${QNS.w}tcPr/${QNS.w}gridSpan)
						then ./${QNS.w}tcPr/${QNS.w}gridSpan/@${QNS.w}val/number()
						else 1,
					"rowSpan": $rowEnd - $rowStart,
					"children": array{ ./(${QNS.w}p) }
				}
			`,
			node,
		) as CellProps & { children: Node[] };
		return new Cell(props, ...createChildComponentsFromNodes<CellChild>(this.children, children));
	}
}

registerComponent(Cell);
