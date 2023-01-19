import {
	registerCustomXPathFunction,
	registerXQueryModule,
} from 'https://esm.sh/fontoxpath@3.27.1?pin=v96';

import { convert } from './length.ts';
import { QNS } from './namespaces.ts';

export const DOCXML_NS_URI = 'https://github.com/wvbe/docxml';

registerCustomXPathFunction(
	{ namespaceURI: DOCXML_NS_URI, localName: 'length' },
	['xs:float', 'xs:string'],
	'map(*)',
	(_facade, value, unit) => convert(value, unit),
);

registerXQueryModule(`
	module namespace docxml = "${DOCXML_NS_URI}";

	declare %public function docxml:cell-column($cell) as xs:double {
		sum(
			$cell/preceding-sibling::${QNS.w}tc/(
				if (./${QNS.w}tcPr/${QNS.w}gridSpan)
					then number(./${QNS.w}tcPr/${QNS.w}gridSpan/@${QNS.w}val)
					else 1
			)
		)
	};

	declare %public function docxml:is-on-off-enabled($val) as xs:boolean {
		$val = ("on", "true", "1")
	};

	(: @TODO Test this function :)
	declare %public function docxml:border($val) as map(*) {
		$val/map {
			"type": ./@${QNS.w}val/string(),
			"width": if (exists(./@${QNS.w}sz))
				then docxml:length(./@${QNS.w}sz, 'opt')
				else (),
			"spacing": if (exists(./@${QNS.w}space))
				then ./@${QNS.w}space/number()
				else (),
			"color": ./@${QNS.w}color/string()
		}
	};

	(: @TODO Test this function :)
	declare %public function docxml:create-border-element($name as xs:QName, $obj as map(*)?) {
		if (exists($obj)) then element {$name} {
			if ($obj('type')) then attribute ${QNS.w}val { $obj('type') } else (),
			if (exists($obj('width'))) then attribute ${QNS.w}sz { $obj('width')('opt') } else (),
			if (exists($obj('spacing'))) then attribute ${QNS.w}space { $obj('spacing') } else (),
			if ($obj('color')) then attribute ${QNS.w}color { $obj('color') } else ()
		} else ()
	};
`);
