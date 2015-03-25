start = query

query = ' '* where:where? ' '* join:join* sort_by:(' '* sort_by)? {
	var obj = {}
	if (where) {
		obj.where = where
	}
	if (sort_by) {
		obj.sort = sort_by[1]
	}
	if (join && join.length > 0) {
		obj.join = join
	}
	return obj
}

where = 'where' ' '+ part:part {
	return part
}

right = op:('and' / 'or') ' '+ part:part {
	if (part.bop === op) {
		return part
	}
	return { bop:op, constraints:[part] }
}

grouped = '(' ' '* group:( grouped / ungrouped ) ' '* ')' ' '* more:right? {
	if (more.length !== 0) {  // not an empty string
		if (more.bop === group.bop) {
			for (var i=0; i<more.constraints.length; i++) {
				group.constraints.push(more.constraints[i])
			}
		} else {
			more.constraints.splice(0, 0, group)
			group = more
		}
	}
	return group
}

ungrouped = left:constraint ' '* right:right? {
	if (typeof right == 'object') {
		right.constraints.splice(0, 0, left)
		return right
	}
	return left
}

part = grouped / ungrouped

constraint = ' '* f:field subfield:('.' field)? op:operator '?' prop:('.' field)? {
	var obj = {'field': f, 'op': op}
	if (prop) {
		obj.prop = prop[1]
	}
	if (subfield) {
		obj.subfield = subfield[1]
	}
	return obj
}

operator = ' '* op: ('=' / '>=' / '<=' / '>' / '<' / 'like' / 'is not' / 'not in' / 'is' / 'in' / 'has') ' '* { return op }

field = a:[a-zA-Z_] b:[a-zA-Z0-9_-]+ { return a+b.join('')}

join = 'join' ' '+ op:(('first' / 'last') ' '+ n:number ' '+)? field:field ' '* having:having? ' '* fetch:fetch? ' '* {
	var obj = {}
	obj.field = field
	if (op) {
		obj.op = op[0]
		obj.n  = op[2]
	}
	if (having) {
		obj.having = having
	}
	if (fetch) {
		obj.fetch = fetch
	}
	return obj
}

fetch = 'fetch' ' '+ field:field more:(',' ' '* field)* {
	var arr = [field]
	if (more) {
		for (var i=0; i<more.length; i++) {
			arr.push(more[i][2])
		}
	}
	return arr
}

having = 'having' ' '+ part:part {
	return part
}

number = n:[0-9]+ {
	return parseInt(n.join(''), 10)
}

sort_by = 'sort by ' f:field o:(' ' ('asc' / 'desc'))? { var obj = {field: f}; if (o) { obj.order = o[1] }; return obj}
