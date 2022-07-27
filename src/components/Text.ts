import { XmlComponent, XmlComponentClassDefinition } from '../classes/XmlComponent.ts';
import { Rpr, RprI } from '../shared/rpr.ts';
import { create } from '../util/dom.ts';
import { QNS } from '../util/namespaces.ts';
import { evaluateXPathToMap } from '../util/xquery.ts';
import { Break } from './Break.ts';

export type TextProps = RprI;

export type TextChild = string | Break;

/**
 * Text run
 *
 * http://officeopenxml.com/WPtext.php
 */
export class Text extends XmlComponent<TextProps, TextChild> {
	public static children = [
		// The static prop `children` on Break (`never[]`) is incompatible with XmlComponentClassDefinition :(
		Break as unknown as XmlComponentClassDefinition,
	];
	public static mixed = true;

	public toNode(asTextDeletion = false): Node {
		return create(
			`
				element ${QNS.w}r {
					$rpr,
					for $child in $children
						return $child
				}
			`,
			{
				rpr: Rpr.toNode(this.props),
				children: this.children.map((child) => {
					if (typeof child === 'string') {
						return create(
							`element ${QNS.w}${asTextDeletion ? 'delText' : 't'} {
								attribute xml:space { "preserve" },
								$text
							}`,
							{
								text: child,
							},
						);
					}
					return child.toNode();
				}),
			},
		);
	}

	static matchesNode(node: Node) {
		return node.nodeName === 'w:r';
	}
	static fromNode(node: Node): Text {
		const { children, rpr } = evaluateXPathToMap(
			`
				map {
					"rpr": ./${QNS.w}rPr,
					"children": array{
						./(
							${QNS.w}br,
							${QNS.w}t/text(),
							${QNS.w}delText/text()
						)
					}
				}
			`,
			node,
		) as { rpr: Node; children: Node[] };
		return new Text(
			Rpr.fromNode(rpr),
			...(children
				.map((node) =>
					node.nodeType === 3
						? node.nodeValue
						: this.children.find((Child) => Child.matchesNode(node))?.fromNode(node) || null,
				)
				.filter((child): child is Exclude<typeof child, null> => !!child) as TextChild[]),
		);
	}
}
