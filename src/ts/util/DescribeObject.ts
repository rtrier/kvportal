type AttrType = {
	name:string, 
	type:string, 
	properties?:AttrType[]
}

export function describeObject(o:object) {
    const root:AttrType = {name:'root', type: typeof o, properties:[]}
    testClasses(o, root);
    console.info(root)
    console.info(printPr(root.properties));
}

function printPr(props:AttrType[], inset?:number) {
	inset = inset || 0;
	let sInset = '';
	for (let i=0; i<inset; i++) {
		sInset += '\t'
	}
	let s = '\n';
	for (let i=0; i<props.length; i++) {
		const prop = props[i];
		
		if (prop.type==='object') { 
			s += sInset+prop.name+':{'+printPr(prop.properties, inset+1);
			s += sInset+'}\n'
		} else if (prop.type==='array') {
			s += sInset+prop.name+':[{'+printPr(prop.properties, inset+1);
			s += sInset+'}]\n'
		} else {
			s += sInset+prop.name+':'+prop.type;
			s += '\n'
		}
	}
	return s;
}
function testClasses(obj:any[]|any, attrType:AttrType) {
	if (Array.isArray(obj)) {
		for (let i=0; i<obj.length; i++) {
			testClasses(obj[i], attrType);
		}
	} else {
		for (const k in obj) {
			let type:string = typeof obj[k];
			if (type === 'object' && Array.isArray(obj[k])) {
				type = 'array'
			}
			let att = attrType.properties.find((element) => element.name===k && element.type === type);
			if (!att) {
				
				att = {name:k, type: type }
				if (type === 'object' || type === 'array') {
					att.properties = []
				};
				attrType.properties.push(att);
			}
			if (typeof obj[k] === 'object') {
				testClasses(obj[k], att);
			}
		}
	}
}