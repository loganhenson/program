(function(scope){
'use strict';

function F(arity, fun, wrapper) {
  wrapper.a = arity;
  wrapper.f = fun;
  return wrapper;
}

function F2(fun) {
  return F(2, fun, function(a) { return function(b) { return fun(a,b); }; })
}
function F3(fun) {
  return F(3, fun, function(a) {
    return function(b) { return function(c) { return fun(a, b, c); }; };
  });
}
function F4(fun) {
  return F(4, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return fun(a, b, c, d); }; }; };
  });
}
function F5(fun) {
  return F(5, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
  });
}
function F6(fun) {
  return F(6, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return fun(a, b, c, d, e, f); }; }; }; }; };
  });
}
function F7(fun) {
  return F(7, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
  });
}
function F8(fun) {
  return F(8, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return function(h) {
    return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
  });
}
function F9(fun) {
  return F(9, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return function(h) { return function(i) {
    return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
  });
}

function A2(fun, a, b) {
  return fun.a === 2 ? fun.f(a, b) : fun(a)(b);
}
function A3(fun, a, b, c) {
  return fun.a === 3 ? fun.f(a, b, c) : fun(a)(b)(c);
}
function A4(fun, a, b, c, d) {
  return fun.a === 4 ? fun.f(a, b, c, d) : fun(a)(b)(c)(d);
}
function A5(fun, a, b, c, d, e) {
  return fun.a === 5 ? fun.f(a, b, c, d, e) : fun(a)(b)(c)(d)(e);
}
function A6(fun, a, b, c, d, e, f) {
  return fun.a === 6 ? fun.f(a, b, c, d, e, f) : fun(a)(b)(c)(d)(e)(f);
}
function A7(fun, a, b, c, d, e, f, g) {
  return fun.a === 7 ? fun.f(a, b, c, d, e, f, g) : fun(a)(b)(c)(d)(e)(f)(g);
}
function A8(fun, a, b, c, d, e, f, g, h) {
  return fun.a === 8 ? fun.f(a, b, c, d, e, f, g, h) : fun(a)(b)(c)(d)(e)(f)(g)(h);
}
function A9(fun, a, b, c, d, e, f, g, h, i) {
  return fun.a === 9 ? fun.f(a, b, c, d, e, f, g, h, i) : fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
}

console.warn('Compiled in DEV mode. Follow the advice at https://elm-lang.org/0.19.1/optimize for better performance and smaller assets.');


// EQUALITY

function _Utils_eq(x, y)
{
	for (
		var pair, stack = [], isEqual = _Utils_eqHelp(x, y, 0, stack);
		isEqual && (pair = stack.pop());
		isEqual = _Utils_eqHelp(pair.a, pair.b, 0, stack)
		)
	{}

	return isEqual;
}

function _Utils_eqHelp(x, y, depth, stack)
{
	if (depth > 100)
	{
		stack.push(_Utils_Tuple2(x,y));
		return true;
	}

	if (x === y)
	{
		return true;
	}

	if (typeof x !== 'object' || x === null || y === null)
	{
		typeof x === 'function' && _Debug_crash(5);
		return false;
	}

	/**/
	if (x.$ === 'Set_elm_builtin')
	{
		x = $elm$core$Set$toList(x);
		y = $elm$core$Set$toList(y);
	}
	if (x.$ === 'RBNode_elm_builtin' || x.$ === 'RBEmpty_elm_builtin')
	{
		x = $elm$core$Dict$toList(x);
		y = $elm$core$Dict$toList(y);
	}
	//*/

	/**_UNUSED/
	if (x.$ < 0)
	{
		x = $elm$core$Dict$toList(x);
		y = $elm$core$Dict$toList(y);
	}
	//*/

	for (var key in x)
	{
		if (!_Utils_eqHelp(x[key], y[key], depth + 1, stack))
		{
			return false;
		}
	}
	return true;
}

var _Utils_equal = F2(_Utils_eq);
var _Utils_notEqual = F2(function(a, b) { return !_Utils_eq(a,b); });



// COMPARISONS

// Code in Generate/JavaScript.hs, Basics.js, and List.js depends on
// the particular integer values assigned to LT, EQ, and GT.

function _Utils_cmp(x, y, ord)
{
	if (typeof x !== 'object')
	{
		return x === y ? /*EQ*/ 0 : x < y ? /*LT*/ -1 : /*GT*/ 1;
	}

	/**/
	if (x instanceof String)
	{
		var a = x.valueOf();
		var b = y.valueOf();
		return a === b ? 0 : a < b ? -1 : 1;
	}
	//*/

	/**_UNUSED/
	if (!x.$)
	//*/
	/**/
	if (x.$[0] === '#')
	//*/
	{
		return (ord = _Utils_cmp(x.a, y.a))
			? ord
			: (ord = _Utils_cmp(x.b, y.b))
				? ord
				: _Utils_cmp(x.c, y.c);
	}

	// traverse conses until end of a list or a mismatch
	for (; x.b && y.b && !(ord = _Utils_cmp(x.a, y.a)); x = x.b, y = y.b) {} // WHILE_CONSES
	return ord || (x.b ? /*GT*/ 1 : y.b ? /*LT*/ -1 : /*EQ*/ 0);
}

var _Utils_lt = F2(function(a, b) { return _Utils_cmp(a, b) < 0; });
var _Utils_le = F2(function(a, b) { return _Utils_cmp(a, b) < 1; });
var _Utils_gt = F2(function(a, b) { return _Utils_cmp(a, b) > 0; });
var _Utils_ge = F2(function(a, b) { return _Utils_cmp(a, b) >= 0; });

var _Utils_compare = F2(function(x, y)
{
	var n = _Utils_cmp(x, y);
	return n < 0 ? $elm$core$Basics$LT : n ? $elm$core$Basics$GT : $elm$core$Basics$EQ;
});


// COMMON VALUES

var _Utils_Tuple0_UNUSED = 0;
var _Utils_Tuple0 = { $: '#0' };

function _Utils_Tuple2_UNUSED(a, b) { return { a: a, b: b }; }
function _Utils_Tuple2(a, b) { return { $: '#2', a: a, b: b }; }

function _Utils_Tuple3_UNUSED(a, b, c) { return { a: a, b: b, c: c }; }
function _Utils_Tuple3(a, b, c) { return { $: '#3', a: a, b: b, c: c }; }

function _Utils_chr_UNUSED(c) { return c; }
function _Utils_chr(c) { return new String(c); }


// RECORDS

function _Utils_update(oldRecord, updatedFields)
{
	var newRecord = {};

	for (var key in oldRecord)
	{
		newRecord[key] = oldRecord[key];
	}

	for (var key in updatedFields)
	{
		newRecord[key] = updatedFields[key];
	}

	return newRecord;
}


// APPEND

var _Utils_append = F2(_Utils_ap);

function _Utils_ap(xs, ys)
{
	// append Strings
	if (typeof xs === 'string')
	{
		return xs + ys;
	}

	// append Lists
	if (!xs.b)
	{
		return ys;
	}
	var root = _List_Cons(xs.a, ys);
	xs = xs.b
	for (var curr = root; xs.b; xs = xs.b) // WHILE_CONS
	{
		curr = curr.b = _List_Cons(xs.a, ys);
	}
	return root;
}



var _List_Nil_UNUSED = { $: 0 };
var _List_Nil = { $: '[]' };

function _List_Cons_UNUSED(hd, tl) { return { $: 1, a: hd, b: tl }; }
function _List_Cons(hd, tl) { return { $: '::', a: hd, b: tl }; }


var _List_cons = F2(_List_Cons);

function _List_fromArray(arr)
{
	var out = _List_Nil;
	for (var i = arr.length; i--; )
	{
		out = _List_Cons(arr[i], out);
	}
	return out;
}

function _List_toArray(xs)
{
	for (var out = []; xs.b; xs = xs.b) // WHILE_CONS
	{
		out.push(xs.a);
	}
	return out;
}

var _List_map2 = F3(function(f, xs, ys)
{
	for (var arr = []; xs.b && ys.b; xs = xs.b, ys = ys.b) // WHILE_CONSES
	{
		arr.push(A2(f, xs.a, ys.a));
	}
	return _List_fromArray(arr);
});

var _List_map3 = F4(function(f, xs, ys, zs)
{
	for (var arr = []; xs.b && ys.b && zs.b; xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A3(f, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_map4 = F5(function(f, ws, xs, ys, zs)
{
	for (var arr = []; ws.b && xs.b && ys.b && zs.b; ws = ws.b, xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A4(f, ws.a, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_map5 = F6(function(f, vs, ws, xs, ys, zs)
{
	for (var arr = []; vs.b && ws.b && xs.b && ys.b && zs.b; vs = vs.b, ws = ws.b, xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A5(f, vs.a, ws.a, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_sortBy = F2(function(f, xs)
{
	return _List_fromArray(_List_toArray(xs).sort(function(a, b) {
		return _Utils_cmp(f(a), f(b));
	}));
});

var _List_sortWith = F2(function(f, xs)
{
	return _List_fromArray(_List_toArray(xs).sort(function(a, b) {
		var ord = A2(f, a, b);
		return ord === $elm$core$Basics$EQ ? 0 : ord === $elm$core$Basics$LT ? -1 : 1;
	}));
});



var _JsArray_empty = [];

function _JsArray_singleton(value)
{
    return [value];
}

function _JsArray_length(array)
{
    return array.length;
}

var _JsArray_initialize = F3(function(size, offset, func)
{
    var result = new Array(size);

    for (var i = 0; i < size; i++)
    {
        result[i] = func(offset + i);
    }

    return result;
});

var _JsArray_initializeFromList = F2(function (max, ls)
{
    var result = new Array(max);

    for (var i = 0; i < max && ls.b; i++)
    {
        result[i] = ls.a;
        ls = ls.b;
    }

    result.length = i;
    return _Utils_Tuple2(result, ls);
});

var _JsArray_unsafeGet = F2(function(index, array)
{
    return array[index];
});

var _JsArray_unsafeSet = F3(function(index, value, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = array[i];
    }

    result[index] = value;
    return result;
});

var _JsArray_push = F2(function(value, array)
{
    var length = array.length;
    var result = new Array(length + 1);

    for (var i = 0; i < length; i++)
    {
        result[i] = array[i];
    }

    result[length] = value;
    return result;
});

var _JsArray_foldl = F3(function(func, acc, array)
{
    var length = array.length;

    for (var i = 0; i < length; i++)
    {
        acc = A2(func, array[i], acc);
    }

    return acc;
});

var _JsArray_foldr = F3(function(func, acc, array)
{
    for (var i = array.length - 1; i >= 0; i--)
    {
        acc = A2(func, array[i], acc);
    }

    return acc;
});

var _JsArray_map = F2(function(func, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = func(array[i]);
    }

    return result;
});

var _JsArray_indexedMap = F3(function(func, offset, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = A2(func, offset + i, array[i]);
    }

    return result;
});

var _JsArray_slice = F3(function(from, to, array)
{
    return array.slice(from, to);
});

var _JsArray_appendN = F3(function(n, dest, source)
{
    var destLen = dest.length;
    var itemsToCopy = n - destLen;

    if (itemsToCopy > source.length)
    {
        itemsToCopy = source.length;
    }

    var size = destLen + itemsToCopy;
    var result = new Array(size);

    for (var i = 0; i < destLen; i++)
    {
        result[i] = dest[i];
    }

    for (var i = 0; i < itemsToCopy; i++)
    {
        result[i + destLen] = source[i];
    }

    return result;
});



// LOG

var _Debug_log_UNUSED = F2(function(tag, value)
{
	return value;
});

var _Debug_log = F2(function(tag, value)
{
	console.log(tag + ': ' + _Debug_toString(value));
	return value;
});


// TODOS

function _Debug_todo(moduleName, region)
{
	return function(message) {
		_Debug_crash(8, moduleName, region, message);
	};
}

function _Debug_todoCase(moduleName, region, value)
{
	return function(message) {
		_Debug_crash(9, moduleName, region, value, message);
	};
}


// TO STRING

function _Debug_toString_UNUSED(value)
{
	return '<internals>';
}

function _Debug_toString(value)
{
	return _Debug_toAnsiString(false, value);
}

function _Debug_toAnsiString(ansi, value)
{
	if (typeof value === 'function')
	{
		return _Debug_internalColor(ansi, '<function>');
	}

	if (typeof value === 'boolean')
	{
		return _Debug_ctorColor(ansi, value ? 'True' : 'False');
	}

	if (typeof value === 'number')
	{
		return _Debug_numberColor(ansi, value + '');
	}

	if (value instanceof String)
	{
		return _Debug_charColor(ansi, "'" + _Debug_addSlashes(value, true) + "'");
	}

	if (typeof value === 'string')
	{
		return _Debug_stringColor(ansi, '"' + _Debug_addSlashes(value, false) + '"');
	}

	if (typeof value === 'object' && '$' in value)
	{
		var tag = value.$;

		if (typeof tag === 'number')
		{
			return _Debug_internalColor(ansi, '<internals>');
		}

		if (tag[0] === '#')
		{
			var output = [];
			for (var k in value)
			{
				if (k === '$') continue;
				output.push(_Debug_toAnsiString(ansi, value[k]));
			}
			return '(' + output.join(',') + ')';
		}

		if (tag === 'Set_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Set')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Set$toList(value));
		}

		if (tag === 'RBNode_elm_builtin' || tag === 'RBEmpty_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Dict')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Dict$toList(value));
		}

		if (tag === 'Array_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Array')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Array$toList(value));
		}

		if (tag === '::' || tag === '[]')
		{
			var output = '[';

			value.b && (output += _Debug_toAnsiString(ansi, value.a), value = value.b)

			for (; value.b; value = value.b) // WHILE_CONS
			{
				output += ',' + _Debug_toAnsiString(ansi, value.a);
			}
			return output + ']';
		}

		var output = '';
		for (var i in value)
		{
			if (i === '$') continue;
			var str = _Debug_toAnsiString(ansi, value[i]);
			var c0 = str[0];
			var parenless = c0 === '{' || c0 === '(' || c0 === '[' || c0 === '<' || c0 === '"' || str.indexOf(' ') < 0;
			output += ' ' + (parenless ? str : '(' + str + ')');
		}
		return _Debug_ctorColor(ansi, tag) + output;
	}

	if (typeof value === 'object')
	{
		var output = [];
		for (var key in value)
		{
			var field = key[0] === '_' ? key.slice(1) : key;
			output.push(_Debug_fadeColor(ansi, field) + ' = ' + _Debug_toAnsiString(ansi, value[key]));
		}
		if (output.length === 0)
		{
			return '{}';
		}
		return '{ ' + output.join(', ') + ' }';
	}

	return _Debug_internalColor(ansi, '<internals>');
}

function _Debug_addSlashes(str, isChar)
{
	var s = str
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t')
		.replace(/\r/g, '\\r')
		.replace(/\v/g, '\\v')
		.replace(/\0/g, '\\0');

	if (isChar)
	{
		return s.replace(/\'/g, '\\\'');
	}
	else
	{
		return s.replace(/\"/g, '\\"');
	}
}

function _Debug_ctorColor(ansi, string)
{
	return ansi ? '\x1b[96m' + string + '\x1b[0m' : string;
}

function _Debug_numberColor(ansi, string)
{
	return ansi ? '\x1b[95m' + string + '\x1b[0m' : string;
}

function _Debug_stringColor(ansi, string)
{
	return ansi ? '\x1b[93m' + string + '\x1b[0m' : string;
}

function _Debug_charColor(ansi, string)
{
	return ansi ? '\x1b[92m' + string + '\x1b[0m' : string;
}

function _Debug_fadeColor(ansi, string)
{
	return ansi ? '\x1b[37m' + string + '\x1b[0m' : string;
}

function _Debug_internalColor(ansi, string)
{
	return ansi ? '\x1b[94m' + string + '\x1b[0m' : string;
}



// CRASH


function _Debug_crash_UNUSED(identifier)
{
	throw new Error('https://github.com/elm/core/blob/1.0.0/hints/' + identifier + '.md');
}


function _Debug_crash(identifier, fact1, fact2, fact3, fact4)
{
	switch(identifier)
	{
		case 0:
			throw new Error('What node should I take over? In JavaScript I need something like:\n\n    Elm.Main.init({\n        node: document.getElementById("elm-node")\n    })\n\nYou need to do this with any Browser.sandbox or Browser.element program.');

		case 1:
			throw new Error('Browser.application programs cannot handle URLs like this:\n\n    ' + document.location.href + '\n\nWhat is the root? The root of your file system? Try looking at this program with `elm reactor` or some other server.');

		case 2:
			var jsonErrorString = fact1;
			throw new Error('Problem with the flags given to your Elm program on initialization.\n\n' + jsonErrorString);

		case 3:
			var portName = fact1;
			throw new Error('There can only be one port named `' + portName + '`, but your program has multiple.');

		case 4:
			var portName = fact1;
			var problem = fact2;
			throw new Error('Trying to send an unexpected type of value through port `' + portName + '`:\n' + problem);

		case 5:
			throw new Error('Trying to use `(==)` on functions.\nThere is no way to know if functions are "the same" in the Elm sense.\nRead more about this at https://package.elm-lang.org/packages/elm/core/latest/Basics#== which describes why it is this way and what the better version will look like.');

		case 6:
			var moduleName = fact1;
			throw new Error('Your page is loading multiple Elm scripts with a module named ' + moduleName + '. Maybe a duplicate script is getting loaded accidentally? If not, rename one of them so I know which is which!');

		case 8:
			var moduleName = fact1;
			var region = fact2;
			var message = fact3;
			throw new Error('TODO in module `' + moduleName + '` ' + _Debug_regionToString(region) + '\n\n' + message);

		case 9:
			var moduleName = fact1;
			var region = fact2;
			var value = fact3;
			var message = fact4;
			throw new Error(
				'TODO in module `' + moduleName + '` from the `case` expression '
				+ _Debug_regionToString(region) + '\n\nIt received the following value:\n\n    '
				+ _Debug_toString(value).replace('\n', '\n    ')
				+ '\n\nBut the branch that handles it says:\n\n    ' + message.replace('\n', '\n    ')
			);

		case 10:
			throw new Error('Bug in https://github.com/elm/virtual-dom/issues');

		case 11:
			throw new Error('Cannot perform mod 0. Division by zero error.');
	}
}

function _Debug_regionToString(region)
{
	if (region.start.line === region.end.line)
	{
		return 'on line ' + region.start.line;
	}
	return 'on lines ' + region.start.line + ' through ' + region.end.line;
}



// MATH

var _Basics_add = F2(function(a, b) { return a + b; });
var _Basics_sub = F2(function(a, b) { return a - b; });
var _Basics_mul = F2(function(a, b) { return a * b; });
var _Basics_fdiv = F2(function(a, b) { return a / b; });
var _Basics_idiv = F2(function(a, b) { return (a / b) | 0; });
var _Basics_pow = F2(Math.pow);

var _Basics_remainderBy = F2(function(b, a) { return a % b; });

// https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/divmodnote-letter.pdf
var _Basics_modBy = F2(function(modulus, x)
{
	var answer = x % modulus;
	return modulus === 0
		? _Debug_crash(11)
		:
	((answer > 0 && modulus < 0) || (answer < 0 && modulus > 0))
		? answer + modulus
		: answer;
});


// TRIGONOMETRY

var _Basics_pi = Math.PI;
var _Basics_e = Math.E;
var _Basics_cos = Math.cos;
var _Basics_sin = Math.sin;
var _Basics_tan = Math.tan;
var _Basics_acos = Math.acos;
var _Basics_asin = Math.asin;
var _Basics_atan = Math.atan;
var _Basics_atan2 = F2(Math.atan2);


// MORE MATH

function _Basics_toFloat(x) { return x; }
function _Basics_truncate(n) { return n | 0; }
function _Basics_isInfinite(n) { return n === Infinity || n === -Infinity; }

var _Basics_ceiling = Math.ceil;
var _Basics_floor = Math.floor;
var _Basics_round = Math.round;
var _Basics_sqrt = Math.sqrt;
var _Basics_log = Math.log;
var _Basics_isNaN = isNaN;


// BOOLEANS

function _Basics_not(bool) { return !bool; }
var _Basics_and = F2(function(a, b) { return a && b; });
var _Basics_or  = F2(function(a, b) { return a || b; });
var _Basics_xor = F2(function(a, b) { return a !== b; });



var _String_cons = F2(function(chr, str)
{
	return chr + str;
});

function _String_uncons(string)
{
	var word = string.charCodeAt(0);
	return word
		? $elm$core$Maybe$Just(
			0xD800 <= word && word <= 0xDBFF
				? _Utils_Tuple2(_Utils_chr(string[0] + string[1]), string.slice(2))
				: _Utils_Tuple2(_Utils_chr(string[0]), string.slice(1))
		)
		: $elm$core$Maybe$Nothing;
}

var _String_append = F2(function(a, b)
{
	return a + b;
});

function _String_length(str)
{
	return str.length;
}

var _String_map = F2(function(func, string)
{
	var len = string.length;
	var array = new Array(len);
	var i = 0;
	while (i < len)
	{
		var word = string.charCodeAt(i);
		if (0xD800 <= word && word <= 0xDBFF)
		{
			array[i] = func(_Utils_chr(string[i] + string[i+1]));
			i += 2;
			continue;
		}
		array[i] = func(_Utils_chr(string[i]));
		i++;
	}
	return array.join('');
});

var _String_filter = F2(function(isGood, str)
{
	var arr = [];
	var len = str.length;
	var i = 0;
	while (i < len)
	{
		var char = str[i];
		var word = str.charCodeAt(i);
		i++;
		if (0xD800 <= word && word <= 0xDBFF)
		{
			char += str[i];
			i++;
		}

		if (isGood(_Utils_chr(char)))
		{
			arr.push(char);
		}
	}
	return arr.join('');
});

function _String_reverse(str)
{
	var len = str.length;
	var arr = new Array(len);
	var i = 0;
	while (i < len)
	{
		var word = str.charCodeAt(i);
		if (0xD800 <= word && word <= 0xDBFF)
		{
			arr[len - i] = str[i + 1];
			i++;
			arr[len - i] = str[i - 1];
			i++;
		}
		else
		{
			arr[len - i] = str[i];
			i++;
		}
	}
	return arr.join('');
}

var _String_foldl = F3(function(func, state, string)
{
	var len = string.length;
	var i = 0;
	while (i < len)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		i++;
		if (0xD800 <= word && word <= 0xDBFF)
		{
			char += string[i];
			i++;
		}
		state = A2(func, _Utils_chr(char), state);
	}
	return state;
});

var _String_foldr = F3(function(func, state, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		state = A2(func, _Utils_chr(char), state);
	}
	return state;
});

var _String_split = F2(function(sep, str)
{
	return str.split(sep);
});

var _String_join = F2(function(sep, strs)
{
	return strs.join(sep);
});

var _String_slice = F3(function(start, end, str) {
	return str.slice(start, end);
});

function _String_trim(str)
{
	return str.trim();
}

function _String_trimLeft(str)
{
	return str.replace(/^\s+/, '');
}

function _String_trimRight(str)
{
	return str.replace(/\s+$/, '');
}

function _String_words(str)
{
	return _List_fromArray(str.trim().split(/\s+/g));
}

function _String_lines(str)
{
	return _List_fromArray(str.split(/\r\n|\r|\n/g));
}

function _String_toUpper(str)
{
	return str.toUpperCase();
}

function _String_toLower(str)
{
	return str.toLowerCase();
}

var _String_any = F2(function(isGood, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		if (isGood(_Utils_chr(char)))
		{
			return true;
		}
	}
	return false;
});

var _String_all = F2(function(isGood, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		if (!isGood(_Utils_chr(char)))
		{
			return false;
		}
	}
	return true;
});

var _String_contains = F2(function(sub, str)
{
	return str.indexOf(sub) > -1;
});

var _String_startsWith = F2(function(sub, str)
{
	return str.indexOf(sub) === 0;
});

var _String_endsWith = F2(function(sub, str)
{
	return str.length >= sub.length &&
		str.lastIndexOf(sub) === str.length - sub.length;
});

var _String_indexes = F2(function(sub, str)
{
	var subLen = sub.length;

	if (subLen < 1)
	{
		return _List_Nil;
	}

	var i = 0;
	var is = [];

	while ((i = str.indexOf(sub, i)) > -1)
	{
		is.push(i);
		i = i + subLen;
	}

	return _List_fromArray(is);
});


// TO STRING

function _String_fromNumber(number)
{
	return number + '';
}


// INT CONVERSIONS

function _String_toInt(str)
{
	var total = 0;
	var code0 = str.charCodeAt(0);
	var start = code0 == 0x2B /* + */ || code0 == 0x2D /* - */ ? 1 : 0;

	for (var i = start; i < str.length; ++i)
	{
		var code = str.charCodeAt(i);
		if (code < 0x30 || 0x39 < code)
		{
			return $elm$core$Maybe$Nothing;
		}
		total = 10 * total + code - 0x30;
	}

	return i == start
		? $elm$core$Maybe$Nothing
		: $elm$core$Maybe$Just(code0 == 0x2D ? -total : total);
}


// FLOAT CONVERSIONS

function _String_toFloat(s)
{
	// check if it is a hex, octal, or binary number
	if (s.length === 0 || /[\sxbo]/.test(s))
	{
		return $elm$core$Maybe$Nothing;
	}
	var n = +s;
	// faster isNaN check
	return n === n ? $elm$core$Maybe$Just(n) : $elm$core$Maybe$Nothing;
}

function _String_fromList(chars)
{
	return _List_toArray(chars).join('');
}




function _Char_toCode(char)
{
	var code = char.charCodeAt(0);
	if (0xD800 <= code && code <= 0xDBFF)
	{
		return (code - 0xD800) * 0x400 + char.charCodeAt(1) - 0xDC00 + 0x10000
	}
	return code;
}

function _Char_fromCode(code)
{
	return _Utils_chr(
		(code < 0 || 0x10FFFF < code)
			? '\uFFFD'
			:
		(code <= 0xFFFF)
			? String.fromCharCode(code)
			:
		(code -= 0x10000,
			String.fromCharCode(Math.floor(code / 0x400) + 0xD800)
			+
			String.fromCharCode(code % 0x400 + 0xDC00)
		)
	);
}

function _Char_toUpper(char)
{
	return _Utils_chr(char.toUpperCase());
}

function _Char_toLower(char)
{
	return _Utils_chr(char.toLowerCase());
}

function _Char_toLocaleUpper(char)
{
	return _Utils_chr(char.toLocaleUpperCase());
}

function _Char_toLocaleLower(char)
{
	return _Utils_chr(char.toLocaleLowerCase());
}



/**/
function _Json_errorToString(error)
{
	return $elm$json$Json$Decode$errorToString(error);
}
//*/


// CORE DECODERS

function _Json_succeed(msg)
{
	return {
		$: 0,
		a: msg
	};
}

function _Json_fail(msg)
{
	return {
		$: 1,
		a: msg
	};
}

function _Json_decodePrim(decoder)
{
	return { $: 2, b: decoder };
}

var _Json_decodeInt = _Json_decodePrim(function(value) {
	return (typeof value !== 'number')
		? _Json_expecting('an INT', value)
		:
	(-2147483647 < value && value < 2147483647 && (value | 0) === value)
		? $elm$core$Result$Ok(value)
		:
	(isFinite(value) && !(value % 1))
		? $elm$core$Result$Ok(value)
		: _Json_expecting('an INT', value);
});

var _Json_decodeBool = _Json_decodePrim(function(value) {
	return (typeof value === 'boolean')
		? $elm$core$Result$Ok(value)
		: _Json_expecting('a BOOL', value);
});

var _Json_decodeFloat = _Json_decodePrim(function(value) {
	return (typeof value === 'number')
		? $elm$core$Result$Ok(value)
		: _Json_expecting('a FLOAT', value);
});

var _Json_decodeValue = _Json_decodePrim(function(value) {
	return $elm$core$Result$Ok(_Json_wrap(value));
});

var _Json_decodeString = _Json_decodePrim(function(value) {
	return (typeof value === 'string')
		? $elm$core$Result$Ok(value)
		: (value instanceof String)
			? $elm$core$Result$Ok(value + '')
			: _Json_expecting('a STRING', value);
});

function _Json_decodeList(decoder) { return { $: 3, b: decoder }; }
function _Json_decodeArray(decoder) { return { $: 4, b: decoder }; }

function _Json_decodeNull(value) { return { $: 5, c: value }; }

var _Json_decodeField = F2(function(field, decoder)
{
	return {
		$: 6,
		d: field,
		b: decoder
	};
});

var _Json_decodeIndex = F2(function(index, decoder)
{
	return {
		$: 7,
		e: index,
		b: decoder
	};
});

function _Json_decodeKeyValuePairs(decoder)
{
	return {
		$: 8,
		b: decoder
	};
}

function _Json_mapMany(f, decoders)
{
	return {
		$: 9,
		f: f,
		g: decoders
	};
}

var _Json_andThen = F2(function(callback, decoder)
{
	return {
		$: 10,
		b: decoder,
		h: callback
	};
});

function _Json_oneOf(decoders)
{
	return {
		$: 11,
		g: decoders
	};
}


// DECODING OBJECTS

var _Json_map1 = F2(function(f, d1)
{
	return _Json_mapMany(f, [d1]);
});

var _Json_map2 = F3(function(f, d1, d2)
{
	return _Json_mapMany(f, [d1, d2]);
});

var _Json_map3 = F4(function(f, d1, d2, d3)
{
	return _Json_mapMany(f, [d1, d2, d3]);
});

var _Json_map4 = F5(function(f, d1, d2, d3, d4)
{
	return _Json_mapMany(f, [d1, d2, d3, d4]);
});

var _Json_map5 = F6(function(f, d1, d2, d3, d4, d5)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5]);
});

var _Json_map6 = F7(function(f, d1, d2, d3, d4, d5, d6)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6]);
});

var _Json_map7 = F8(function(f, d1, d2, d3, d4, d5, d6, d7)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6, d7]);
});

var _Json_map8 = F9(function(f, d1, d2, d3, d4, d5, d6, d7, d8)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6, d7, d8]);
});


// DECODE

var _Json_runOnString = F2(function(decoder, string)
{
	try
	{
		var value = JSON.parse(string);
		return _Json_runHelp(decoder, value);
	}
	catch (e)
	{
		return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, 'This is not valid JSON! ' + e.message, _Json_wrap(string)));
	}
});

var _Json_run = F2(function(decoder, value)
{
	return _Json_runHelp(decoder, _Json_unwrap(value));
});

function _Json_runHelp(decoder, value)
{
	switch (decoder.$)
	{
		case 2:
			return decoder.b(value);

		case 5:
			return (value === null)
				? $elm$core$Result$Ok(decoder.c)
				: _Json_expecting('null', value);

		case 3:
			if (!_Json_isArray(value))
			{
				return _Json_expecting('a LIST', value);
			}
			return _Json_runArrayDecoder(decoder.b, value, _List_fromArray);

		case 4:
			if (!_Json_isArray(value))
			{
				return _Json_expecting('an ARRAY', value);
			}
			return _Json_runArrayDecoder(decoder.b, value, _Json_toElmArray);

		case 6:
			var field = decoder.d;
			if (typeof value !== 'object' || value === null || !(field in value))
			{
				return _Json_expecting('an OBJECT with a field named `' + field + '`', value);
			}
			var result = _Json_runHelp(decoder.b, value[field]);
			return ($elm$core$Result$isOk(result)) ? result : $elm$core$Result$Err(A2($elm$json$Json$Decode$Field, field, result.a));

		case 7:
			var index = decoder.e;
			if (!_Json_isArray(value))
			{
				return _Json_expecting('an ARRAY', value);
			}
			if (index >= value.length)
			{
				return _Json_expecting('a LONGER array. Need index ' + index + ' but only see ' + value.length + ' entries', value);
			}
			var result = _Json_runHelp(decoder.b, value[index]);
			return ($elm$core$Result$isOk(result)) ? result : $elm$core$Result$Err(A2($elm$json$Json$Decode$Index, index, result.a));

		case 8:
			if (typeof value !== 'object' || value === null || _Json_isArray(value))
			{
				return _Json_expecting('an OBJECT', value);
			}

			var keyValuePairs = _List_Nil;
			// TODO test perf of Object.keys and switch when support is good enough
			for (var key in value)
			{
				if (value.hasOwnProperty(key))
				{
					var result = _Json_runHelp(decoder.b, value[key]);
					if (!$elm$core$Result$isOk(result))
					{
						return $elm$core$Result$Err(A2($elm$json$Json$Decode$Field, key, result.a));
					}
					keyValuePairs = _List_Cons(_Utils_Tuple2(key, result.a), keyValuePairs);
				}
			}
			return $elm$core$Result$Ok($elm$core$List$reverse(keyValuePairs));

		case 9:
			var answer = decoder.f;
			var decoders = decoder.g;
			for (var i = 0; i < decoders.length; i++)
			{
				var result = _Json_runHelp(decoders[i], value);
				if (!$elm$core$Result$isOk(result))
				{
					return result;
				}
				answer = answer(result.a);
			}
			return $elm$core$Result$Ok(answer);

		case 10:
			var result = _Json_runHelp(decoder.b, value);
			return (!$elm$core$Result$isOk(result))
				? result
				: _Json_runHelp(decoder.h(result.a), value);

		case 11:
			var errors = _List_Nil;
			for (var temp = decoder.g; temp.b; temp = temp.b) // WHILE_CONS
			{
				var result = _Json_runHelp(temp.a, value);
				if ($elm$core$Result$isOk(result))
				{
					return result;
				}
				errors = _List_Cons(result.a, errors);
			}
			return $elm$core$Result$Err($elm$json$Json$Decode$OneOf($elm$core$List$reverse(errors)));

		case 1:
			return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, decoder.a, _Json_wrap(value)));

		case 0:
			return $elm$core$Result$Ok(decoder.a);
	}
}

function _Json_runArrayDecoder(decoder, value, toElmValue)
{
	var len = value.length;
	var array = new Array(len);
	for (var i = 0; i < len; i++)
	{
		var result = _Json_runHelp(decoder, value[i]);
		if (!$elm$core$Result$isOk(result))
		{
			return $elm$core$Result$Err(A2($elm$json$Json$Decode$Index, i, result.a));
		}
		array[i] = result.a;
	}
	return $elm$core$Result$Ok(toElmValue(array));
}

function _Json_isArray(value)
{
	return Array.isArray(value) || (typeof FileList !== 'undefined' && value instanceof FileList);
}

function _Json_toElmArray(array)
{
	return A2($elm$core$Array$initialize, array.length, function(i) { return array[i]; });
}

function _Json_expecting(type, value)
{
	return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, 'Expecting ' + type, _Json_wrap(value)));
}


// EQUALITY

function _Json_equality(x, y)
{
	if (x === y)
	{
		return true;
	}

	if (x.$ !== y.$)
	{
		return false;
	}

	switch (x.$)
	{
		case 0:
		case 1:
			return x.a === y.a;

		case 2:
			return x.b === y.b;

		case 5:
			return x.c === y.c;

		case 3:
		case 4:
		case 8:
			return _Json_equality(x.b, y.b);

		case 6:
			return x.d === y.d && _Json_equality(x.b, y.b);

		case 7:
			return x.e === y.e && _Json_equality(x.b, y.b);

		case 9:
			return x.f === y.f && _Json_listEquality(x.g, y.g);

		case 10:
			return x.h === y.h && _Json_equality(x.b, y.b);

		case 11:
			return _Json_listEquality(x.g, y.g);
	}
}

function _Json_listEquality(aDecoders, bDecoders)
{
	var len = aDecoders.length;
	if (len !== bDecoders.length)
	{
		return false;
	}
	for (var i = 0; i < len; i++)
	{
		if (!_Json_equality(aDecoders[i], bDecoders[i]))
		{
			return false;
		}
	}
	return true;
}


// ENCODE

var _Json_encode = F2(function(indentLevel, value)
{
	return JSON.stringify(_Json_unwrap(value), null, indentLevel) + '';
});

function _Json_wrap(value) { return { $: 0, a: value }; }
function _Json_unwrap(value) { return value.a; }

function _Json_wrap_UNUSED(value) { return value; }
function _Json_unwrap_UNUSED(value) { return value; }

function _Json_emptyArray() { return []; }
function _Json_emptyObject() { return {}; }

var _Json_addField = F3(function(key, value, object)
{
	object[key] = _Json_unwrap(value);
	return object;
});

function _Json_addEntry(func)
{
	return F2(function(entry, array)
	{
		array.push(_Json_unwrap(func(entry)));
		return array;
	});
}

var _Json_encodeNull = _Json_wrap(null);



// TASKS

function _Scheduler_succeed(value)
{
	return {
		$: 0,
		a: value
	};
}

function _Scheduler_fail(error)
{
	return {
		$: 1,
		a: error
	};
}

function _Scheduler_binding(callback)
{
	return {
		$: 2,
		b: callback,
		c: null
	};
}

var _Scheduler_andThen = F2(function(callback, task)
{
	return {
		$: 3,
		b: callback,
		d: task
	};
});

var _Scheduler_onError = F2(function(callback, task)
{
	return {
		$: 4,
		b: callback,
		d: task
	};
});

function _Scheduler_receive(callback)
{
	return {
		$: 5,
		b: callback
	};
}


// PROCESSES

var _Scheduler_guid = 0;

function _Scheduler_rawSpawn(task)
{
	var proc = {
		$: 0,
		e: _Scheduler_guid++,
		f: task,
		g: null,
		h: []
	};

	_Scheduler_enqueue(proc);

	return proc;
}

function _Scheduler_spawn(task)
{
	return _Scheduler_binding(function(callback) {
		callback(_Scheduler_succeed(_Scheduler_rawSpawn(task)));
	});
}

function _Scheduler_rawSend(proc, msg)
{
	proc.h.push(msg);
	_Scheduler_enqueue(proc);
}

var _Scheduler_send = F2(function(proc, msg)
{
	return _Scheduler_binding(function(callback) {
		_Scheduler_rawSend(proc, msg);
		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
});

function _Scheduler_kill(proc)
{
	return _Scheduler_binding(function(callback) {
		var task = proc.f;
		if (task.$ === 2 && task.c)
		{
			task.c();
		}

		proc.f = null;

		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
}


/* STEP PROCESSES

type alias Process =
  { $ : tag
  , id : unique_id
  , root : Task
  , stack : null | { $: SUCCEED | FAIL, a: callback, b: stack }
  , mailbox : [msg]
  }

*/


var _Scheduler_working = false;
var _Scheduler_queue = [];


function _Scheduler_enqueue(proc)
{
	_Scheduler_queue.push(proc);
	if (_Scheduler_working)
	{
		return;
	}
	_Scheduler_working = true;
	while (proc = _Scheduler_queue.shift())
	{
		_Scheduler_step(proc);
	}
	_Scheduler_working = false;
}


function _Scheduler_step(proc)
{
	while (proc.f)
	{
		var rootTag = proc.f.$;
		if (rootTag === 0 || rootTag === 1)
		{
			while (proc.g && proc.g.$ !== rootTag)
			{
				proc.g = proc.g.i;
			}
			if (!proc.g)
			{
				return;
			}
			proc.f = proc.g.b(proc.f.a);
			proc.g = proc.g.i;
		}
		else if (rootTag === 2)
		{
			proc.f.c = proc.f.b(function(newRoot) {
				proc.f = newRoot;
				_Scheduler_enqueue(proc);
			});
			return;
		}
		else if (rootTag === 5)
		{
			if (proc.h.length === 0)
			{
				return;
			}
			proc.f = proc.f.b(proc.h.shift());
		}
		else // if (rootTag === 3 || rootTag === 4)
		{
			proc.g = {
				$: rootTag === 3 ? 0 : 1,
				b: proc.f.b,
				i: proc.g
			};
			proc.f = proc.f.d;
		}
	}
}



function _Process_sleep(time)
{
	return _Scheduler_binding(function(callback) {
		var id = setTimeout(function() {
			callback(_Scheduler_succeed(_Utils_Tuple0));
		}, time);

		return function() { clearTimeout(id); };
	});
}




// PROGRAMS


var _Platform_worker = F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.init,
		impl.update,
		impl.subscriptions,
		function() { return function() {} }
	);
});



// INITIALIZE A PROGRAM


function _Platform_initialize(flagDecoder, args, init, update, subscriptions, stepperBuilder)
{
	var result = A2(_Json_run, flagDecoder, _Json_wrap(args ? args['flags'] : undefined));
	$elm$core$Result$isOk(result) || _Debug_crash(2 /**/, _Json_errorToString(result.a) /**/);
	var managers = {};
	result = init(result.a);
	var model = result.a;
	var stepper = stepperBuilder(sendToApp, model);
	var ports = _Platform_setupEffects(managers, sendToApp);

	function sendToApp(msg, viewMetadata)
	{
		result = A2(update, msg, model);
		stepper(model = result.a, viewMetadata);
		_Platform_dispatchEffects(managers, result.b, subscriptions(model));
	}

	_Platform_dispatchEffects(managers, result.b, subscriptions(model));

	return ports ? { ports: ports } : {};
}



// TRACK PRELOADS
//
// This is used by code in elm/browser and elm/http
// to register any HTTP requests that are triggered by init.
//


var _Platform_preload;


function _Platform_registerPreload(url)
{
	_Platform_preload.add(url);
}



// EFFECT MANAGERS


var _Platform_effectManagers = {};


function _Platform_setupEffects(managers, sendToApp)
{
	var ports;

	// setup all necessary effect managers
	for (var key in _Platform_effectManagers)
	{
		var manager = _Platform_effectManagers[key];

		if (manager.a)
		{
			ports = ports || {};
			ports[key] = manager.a(key, sendToApp);
		}

		managers[key] = _Platform_instantiateManager(manager, sendToApp);
	}

	return ports;
}


function _Platform_createManager(init, onEffects, onSelfMsg, cmdMap, subMap)
{
	return {
		b: init,
		c: onEffects,
		d: onSelfMsg,
		e: cmdMap,
		f: subMap
	};
}


function _Platform_instantiateManager(info, sendToApp)
{
	var router = {
		g: sendToApp,
		h: undefined
	};

	var onEffects = info.c;
	var onSelfMsg = info.d;
	var cmdMap = info.e;
	var subMap = info.f;

	function loop(state)
	{
		return A2(_Scheduler_andThen, loop, _Scheduler_receive(function(msg)
		{
			var value = msg.a;

			if (msg.$ === 0)
			{
				return A3(onSelfMsg, router, value, state);
			}

			return cmdMap && subMap
				? A4(onEffects, router, value.i, value.j, state)
				: A3(onEffects, router, cmdMap ? value.i : value.j, state);
		}));
	}

	return router.h = _Scheduler_rawSpawn(A2(_Scheduler_andThen, loop, info.b));
}



// ROUTING


var _Platform_sendToApp = F2(function(router, msg)
{
	return _Scheduler_binding(function(callback)
	{
		router.g(msg);
		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
});


var _Platform_sendToSelf = F2(function(router, msg)
{
	return A2(_Scheduler_send, router.h, {
		$: 0,
		a: msg
	});
});



// BAGS


function _Platform_leaf(home)
{
	return function(value)
	{
		return {
			$: 1,
			k: home,
			l: value
		};
	};
}


function _Platform_batch(list)
{
	return {
		$: 2,
		m: list
	};
}


var _Platform_map = F2(function(tagger, bag)
{
	return {
		$: 3,
		n: tagger,
		o: bag
	}
});



// PIPE BAGS INTO EFFECT MANAGERS


function _Platform_dispatchEffects(managers, cmdBag, subBag)
{
	var effectsDict = {};
	_Platform_gatherEffects(true, cmdBag, effectsDict, null);
	_Platform_gatherEffects(false, subBag, effectsDict, null);

	for (var home in managers)
	{
		_Scheduler_rawSend(managers[home], {
			$: 'fx',
			a: effectsDict[home] || { i: _List_Nil, j: _List_Nil }
		});
	}
}


function _Platform_gatherEffects(isCmd, bag, effectsDict, taggers)
{
	switch (bag.$)
	{
		case 1:
			var home = bag.k;
			var effect = _Platform_toEffect(isCmd, home, taggers, bag.l);
			effectsDict[home] = _Platform_insert(isCmd, effect, effectsDict[home]);
			return;

		case 2:
			for (var list = bag.m; list.b; list = list.b) // WHILE_CONS
			{
				_Platform_gatherEffects(isCmd, list.a, effectsDict, taggers);
			}
			return;

		case 3:
			_Platform_gatherEffects(isCmd, bag.o, effectsDict, {
				p: bag.n,
				q: taggers
			});
			return;
	}
}


function _Platform_toEffect(isCmd, home, taggers, value)
{
	function applyTaggers(x)
	{
		for (var temp = taggers; temp; temp = temp.q)
		{
			x = temp.p(x);
		}
		return x;
	}

	var map = isCmd
		? _Platform_effectManagers[home].e
		: _Platform_effectManagers[home].f;

	return A2(map, applyTaggers, value)
}


function _Platform_insert(isCmd, newEffect, effects)
{
	effects = effects || { i: _List_Nil, j: _List_Nil };

	isCmd
		? (effects.i = _List_Cons(newEffect, effects.i))
		: (effects.j = _List_Cons(newEffect, effects.j));

	return effects;
}



// PORTS


function _Platform_checkPortName(name)
{
	if (_Platform_effectManagers[name])
	{
		_Debug_crash(3, name)
	}
}



// OUTGOING PORTS


function _Platform_outgoingPort(name, converter)
{
	_Platform_checkPortName(name);
	_Platform_effectManagers[name] = {
		e: _Platform_outgoingPortMap,
		r: converter,
		a: _Platform_setupOutgoingPort
	};
	return _Platform_leaf(name);
}


var _Platform_outgoingPortMap = F2(function(tagger, value) { return value; });


function _Platform_setupOutgoingPort(name)
{
	var subs = [];
	var converter = _Platform_effectManagers[name].r;

	// CREATE MANAGER

	var init = _Process_sleep(0);

	_Platform_effectManagers[name].b = init;
	_Platform_effectManagers[name].c = F3(function(router, cmdList, state)
	{
		for ( ; cmdList.b; cmdList = cmdList.b) // WHILE_CONS
		{
			// grab a separate reference to subs in case unsubscribe is called
			var currentSubs = subs;
			var value = _Json_unwrap(converter(cmdList.a));
			for (var i = 0; i < currentSubs.length; i++)
			{
				currentSubs[i](value);
			}
		}
		return init;
	});

	// PUBLIC API

	function subscribe(callback)
	{
		subs.push(callback);
	}

	function unsubscribe(callback)
	{
		// copy subs into a new array in case unsubscribe is called within a
		// subscribed callback
		subs = subs.slice();
		var index = subs.indexOf(callback);
		if (index >= 0)
		{
			subs.splice(index, 1);
		}
	}

	return {
		subscribe: subscribe,
		unsubscribe: unsubscribe
	};
}



// INCOMING PORTS


function _Platform_incomingPort(name, converter)
{
	_Platform_checkPortName(name);
	_Platform_effectManagers[name] = {
		f: _Platform_incomingPortMap,
		r: converter,
		a: _Platform_setupIncomingPort
	};
	return _Platform_leaf(name);
}


var _Platform_incomingPortMap = F2(function(tagger, finalTagger)
{
	return function(value)
	{
		return tagger(finalTagger(value));
	};
});


function _Platform_setupIncomingPort(name, sendToApp)
{
	var subs = _List_Nil;
	var converter = _Platform_effectManagers[name].r;

	// CREATE MANAGER

	var init = _Scheduler_succeed(null);

	_Platform_effectManagers[name].b = init;
	_Platform_effectManagers[name].c = F3(function(router, subList, state)
	{
		subs = subList;
		return init;
	});

	// PUBLIC API

	function send(incomingValue)
	{
		var result = A2(_Json_run, converter, _Json_wrap(incomingValue));

		$elm$core$Result$isOk(result) || _Debug_crash(4, name, result.a);

		var value = result.a;
		for (var temp = subs; temp.b; temp = temp.b) // WHILE_CONS
		{
			sendToApp(temp.a(value));
		}
	}

	return { send: send };
}



// EXPORT ELM MODULES
//
// Have DEBUG and PROD versions so that we can (1) give nicer errors in
// debug mode and (2) not pay for the bits needed for that in prod mode.
//


function _Platform_export_UNUSED(exports)
{
	scope['Elm']
		? _Platform_mergeExportsProd(scope['Elm'], exports)
		: scope['Elm'] = exports;
}


function _Platform_mergeExportsProd(obj, exports)
{
	for (var name in exports)
	{
		(name in obj)
			? (name == 'init')
				? _Debug_crash(6)
				: _Platform_mergeExportsProd(obj[name], exports[name])
			: (obj[name] = exports[name]);
	}
}


function _Platform_export(exports)
{
	scope['Elm']
		? _Platform_mergeExportsDebug('Elm', scope['Elm'], exports)
		: scope['Elm'] = exports;
}


function _Platform_mergeExportsDebug(moduleName, obj, exports)
{
	for (var name in exports)
	{
		(name in obj)
			? (name == 'init')
				? _Debug_crash(6, moduleName)
				: _Platform_mergeExportsDebug(moduleName + '.' + name, obj[name], exports[name])
			: (obj[name] = exports[name]);
	}
}




// HELPERS


var _VirtualDom_divertHrefToApp;

var _VirtualDom_doc = typeof document !== 'undefined' ? document : {};


function _VirtualDom_appendChild(parent, child)
{
	parent.appendChild(child);
}

var _VirtualDom_init = F4(function(virtualNode, flagDecoder, debugMetadata, args)
{
	// NOTE: this function needs _Platform_export available to work

	/**_UNUSED/
	var node = args['node'];
	//*/
	/**/
	var node = args && args['node'] ? args['node'] : _Debug_crash(0);
	//*/

	node.parentNode.replaceChild(
		_VirtualDom_render(virtualNode, function() {}),
		node
	);

	return {};
});



// TEXT


function _VirtualDom_text(string)
{
	return {
		$: 0,
		a: string
	};
}



// NODE


var _VirtualDom_nodeNS = F2(function(namespace, tag)
{
	return F2(function(factList, kidList)
	{
		for (var kids = [], descendantsCount = 0; kidList.b; kidList = kidList.b) // WHILE_CONS
		{
			var kid = kidList.a;
			descendantsCount += (kid.b || 0);
			kids.push(kid);
		}
		descendantsCount += kids.length;

		return {
			$: 1,
			c: tag,
			d: _VirtualDom_organizeFacts(factList),
			e: kids,
			f: namespace,
			b: descendantsCount
		};
	});
});


var _VirtualDom_node = _VirtualDom_nodeNS(undefined);



// KEYED NODE


var _VirtualDom_keyedNodeNS = F2(function(namespace, tag)
{
	return F2(function(factList, kidList)
	{
		for (var kids = [], descendantsCount = 0; kidList.b; kidList = kidList.b) // WHILE_CONS
		{
			var kid = kidList.a;
			descendantsCount += (kid.b.b || 0);
			kids.push(kid);
		}
		descendantsCount += kids.length;

		return {
			$: 2,
			c: tag,
			d: _VirtualDom_organizeFacts(factList),
			e: kids,
			f: namespace,
			b: descendantsCount
		};
	});
});


var _VirtualDom_keyedNode = _VirtualDom_keyedNodeNS(undefined);



// CUSTOM


function _VirtualDom_custom(factList, model, render, diff)
{
	return {
		$: 3,
		d: _VirtualDom_organizeFacts(factList),
		g: model,
		h: render,
		i: diff
	};
}



// MAP


var _VirtualDom_map = F2(function(tagger, node)
{
	return {
		$: 4,
		j: tagger,
		k: node,
		b: 1 + (node.b || 0)
	};
});



// LAZY


function _VirtualDom_thunk(refs, thunk)
{
	return {
		$: 5,
		l: refs,
		m: thunk,
		k: undefined
	};
}

var _VirtualDom_lazy = F2(function(func, a)
{
	return _VirtualDom_thunk([func, a], function() {
		return func(a);
	});
});

var _VirtualDom_lazy2 = F3(function(func, a, b)
{
	return _VirtualDom_thunk([func, a, b], function() {
		return A2(func, a, b);
	});
});

var _VirtualDom_lazy3 = F4(function(func, a, b, c)
{
	return _VirtualDom_thunk([func, a, b, c], function() {
		return A3(func, a, b, c);
	});
});

var _VirtualDom_lazy4 = F5(function(func, a, b, c, d)
{
	return _VirtualDom_thunk([func, a, b, c, d], function() {
		return A4(func, a, b, c, d);
	});
});

var _VirtualDom_lazy5 = F6(function(func, a, b, c, d, e)
{
	return _VirtualDom_thunk([func, a, b, c, d, e], function() {
		return A5(func, a, b, c, d, e);
	});
});

var _VirtualDom_lazy6 = F7(function(func, a, b, c, d, e, f)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f], function() {
		return A6(func, a, b, c, d, e, f);
	});
});

var _VirtualDom_lazy7 = F8(function(func, a, b, c, d, e, f, g)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f, g], function() {
		return A7(func, a, b, c, d, e, f, g);
	});
});

var _VirtualDom_lazy8 = F9(function(func, a, b, c, d, e, f, g, h)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f, g, h], function() {
		return A8(func, a, b, c, d, e, f, g, h);
	});
});



// FACTS


var _VirtualDom_on = F2(function(key, handler)
{
	return {
		$: 'a0',
		n: key,
		o: handler
	};
});
var _VirtualDom_style = F2(function(key, value)
{
	return {
		$: 'a1',
		n: key,
		o: value
	};
});
var _VirtualDom_property = F2(function(key, value)
{
	return {
		$: 'a2',
		n: key,
		o: value
	};
});
var _VirtualDom_attribute = F2(function(key, value)
{
	return {
		$: 'a3',
		n: key,
		o: value
	};
});
var _VirtualDom_attributeNS = F3(function(namespace, key, value)
{
	return {
		$: 'a4',
		n: key,
		o: { f: namespace, o: value }
	};
});



// XSS ATTACK VECTOR CHECKS


function _VirtualDom_noScript(tag)
{
	return tag == 'script' ? 'p' : tag;
}

function _VirtualDom_noOnOrFormAction(key)
{
	return /^(on|formAction$)/i.test(key) ? 'data-' + key : key;
}

function _VirtualDom_noInnerHtmlOrFormAction(key)
{
	return key == 'innerHTML' || key == 'formAction' ? 'data-' + key : key;
}

function _VirtualDom_noJavaScriptUri_UNUSED(value)
{
	return /^javascript:/i.test(value.replace(/\s/g,'')) ? '' : value;
}

function _VirtualDom_noJavaScriptUri(value)
{
	return /^javascript:/i.test(value.replace(/\s/g,''))
		? 'javascript:alert("This is an XSS vector. Please use ports or web components instead.")'
		: value;
}

function _VirtualDom_noJavaScriptOrHtmlUri_UNUSED(value)
{
	return /^\s*(javascript:|data:text\/html)/i.test(value) ? '' : value;
}

function _VirtualDom_noJavaScriptOrHtmlUri(value)
{
	return /^\s*(javascript:|data:text\/html)/i.test(value)
		? 'javascript:alert("This is an XSS vector. Please use ports or web components instead.")'
		: value;
}



// MAP FACTS


var _VirtualDom_mapAttribute = F2(function(func, attr)
{
	return (attr.$ === 'a0')
		? A2(_VirtualDom_on, attr.n, _VirtualDom_mapHandler(func, attr.o))
		: attr;
});

function _VirtualDom_mapHandler(func, handler)
{
	var tag = $elm$virtual_dom$VirtualDom$toHandlerInt(handler);

	// 0 = Normal
	// 1 = MayStopPropagation
	// 2 = MayPreventDefault
	// 3 = Custom

	return {
		$: handler.$,
		a:
			!tag
				? A2($elm$json$Json$Decode$map, func, handler.a)
				:
			A3($elm$json$Json$Decode$map2,
				tag < 3
					? _VirtualDom_mapEventTuple
					: _VirtualDom_mapEventRecord,
				$elm$json$Json$Decode$succeed(func),
				handler.a
			)
	};
}

var _VirtualDom_mapEventTuple = F2(function(func, tuple)
{
	return _Utils_Tuple2(func(tuple.a), tuple.b);
});

var _VirtualDom_mapEventRecord = F2(function(func, record)
{
	return {
		message: func(record.message),
		stopPropagation: record.stopPropagation,
		preventDefault: record.preventDefault
	}
});



// ORGANIZE FACTS


function _VirtualDom_organizeFacts(factList)
{
	for (var facts = {}; factList.b; factList = factList.b) // WHILE_CONS
	{
		var entry = factList.a;

		var tag = entry.$;
		var key = entry.n;
		var value = entry.o;

		if (tag === 'a2')
		{
			(key === 'className')
				? _VirtualDom_addClass(facts, key, _Json_unwrap(value))
				: facts[key] = _Json_unwrap(value);

			continue;
		}

		var subFacts = facts[tag] || (facts[tag] = {});
		(tag === 'a3' && key === 'class')
			? _VirtualDom_addClass(subFacts, key, value)
			: subFacts[key] = value;
	}

	return facts;
}

function _VirtualDom_addClass(object, key, newClass)
{
	var classes = object[key];
	object[key] = classes ? classes + ' ' + newClass : newClass;
}



// RENDER


function _VirtualDom_render(vNode, eventNode)
{
	var tag = vNode.$;

	if (tag === 5)
	{
		return _VirtualDom_render(vNode.k || (vNode.k = vNode.m()), eventNode);
	}

	if (tag === 0)
	{
		return _VirtualDom_doc.createTextNode(vNode.a);
	}

	if (tag === 4)
	{
		var subNode = vNode.k;
		var tagger = vNode.j;

		while (subNode.$ === 4)
		{
			typeof tagger !== 'object'
				? tagger = [tagger, subNode.j]
				: tagger.push(subNode.j);

			subNode = subNode.k;
		}

		var subEventRoot = { j: tagger, p: eventNode };
		var domNode = _VirtualDom_render(subNode, subEventRoot);
		domNode.elm_event_node_ref = subEventRoot;
		return domNode;
	}

	if (tag === 3)
	{
		var domNode = vNode.h(vNode.g);
		_VirtualDom_applyFacts(domNode, eventNode, vNode.d);
		return domNode;
	}

	// at this point `tag` must be 1 or 2

	var domNode = vNode.f
		? _VirtualDom_doc.createElementNS(vNode.f, vNode.c)
		: _VirtualDom_doc.createElement(vNode.c);

	if (_VirtualDom_divertHrefToApp && vNode.c == 'a')
	{
		domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));
	}

	_VirtualDom_applyFacts(domNode, eventNode, vNode.d);

	for (var kids = vNode.e, i = 0; i < kids.length; i++)
	{
		_VirtualDom_appendChild(domNode, _VirtualDom_render(tag === 1 ? kids[i] : kids[i].b, eventNode));
	}

	return domNode;
}



// APPLY FACTS


function _VirtualDom_applyFacts(domNode, eventNode, facts)
{
	for (var key in facts)
	{
		var value = facts[key];

		key === 'a1'
			? _VirtualDom_applyStyles(domNode, value)
			:
		key === 'a0'
			? _VirtualDom_applyEvents(domNode, eventNode, value)
			:
		key === 'a3'
			? _VirtualDom_applyAttrs(domNode, value)
			:
		key === 'a4'
			? _VirtualDom_applyAttrsNS(domNode, value)
			:
		((key !== 'value' && key !== 'checked') || domNode[key] !== value) && (domNode[key] = value);
	}
}



// APPLY STYLES


function _VirtualDom_applyStyles(domNode, styles)
{
	var domNodeStyle = domNode.style;

	for (var key in styles)
	{
		domNodeStyle[key] = styles[key];
	}
}



// APPLY ATTRS


function _VirtualDom_applyAttrs(domNode, attrs)
{
	for (var key in attrs)
	{
		var value = attrs[key];
		typeof value !== 'undefined'
			? domNode.setAttribute(key, value)
			: domNode.removeAttribute(key);
	}
}



// APPLY NAMESPACED ATTRS


function _VirtualDom_applyAttrsNS(domNode, nsAttrs)
{
	for (var key in nsAttrs)
	{
		var pair = nsAttrs[key];
		var namespace = pair.f;
		var value = pair.o;

		typeof value !== 'undefined'
			? domNode.setAttributeNS(namespace, key, value)
			: domNode.removeAttributeNS(namespace, key);
	}
}



// APPLY EVENTS


function _VirtualDom_applyEvents(domNode, eventNode, events)
{
	var allCallbacks = domNode.elmFs || (domNode.elmFs = {});

	for (var key in events)
	{
		var newHandler = events[key];
		var oldCallback = allCallbacks[key];

		if (!newHandler)
		{
			domNode.removeEventListener(key, oldCallback);
			allCallbacks[key] = undefined;
			continue;
		}

		if (oldCallback)
		{
			var oldHandler = oldCallback.q;
			if (oldHandler.$ === newHandler.$)
			{
				oldCallback.q = newHandler;
				continue;
			}
			domNode.removeEventListener(key, oldCallback);
		}

		oldCallback = _VirtualDom_makeCallback(eventNode, newHandler);
		domNode.addEventListener(key, oldCallback,
			_VirtualDom_passiveSupported
			&& { passive: $elm$virtual_dom$VirtualDom$toHandlerInt(newHandler) < 2 }
		);
		allCallbacks[key] = oldCallback;
	}
}



// PASSIVE EVENTS


var _VirtualDom_passiveSupported;

try
{
	window.addEventListener('t', null, Object.defineProperty({}, 'passive', {
		get: function() { _VirtualDom_passiveSupported = true; }
	}));
}
catch(e) {}



// EVENT HANDLERS


function _VirtualDom_makeCallback(eventNode, initialHandler)
{
	function callback(event)
	{
		var handler = callback.q;
		var result = _Json_runHelp(handler.a, event);

		if (!$elm$core$Result$isOk(result))
		{
			return;
		}

		var tag = $elm$virtual_dom$VirtualDom$toHandlerInt(handler);

		// 0 = Normal
		// 1 = MayStopPropagation
		// 2 = MayPreventDefault
		// 3 = Custom

		var value = result.a;
		var message = !tag ? value : tag < 3 ? value.a : value.message;
		var stopPropagation = tag == 1 ? value.b : tag == 3 && value.stopPropagation;
		var currentEventNode = (
			stopPropagation && event.stopPropagation(),
			(tag == 2 ? value.b : tag == 3 && value.preventDefault) && event.preventDefault(),
			eventNode
		);
		var tagger;
		var i;
		while (tagger = currentEventNode.j)
		{
			if (typeof tagger == 'function')
			{
				message = tagger(message);
			}
			else
			{
				for (var i = tagger.length; i--; )
				{
					message = tagger[i](message);
				}
			}
			currentEventNode = currentEventNode.p;
		}
		currentEventNode(message, stopPropagation); // stopPropagation implies isSync
	}

	callback.q = initialHandler;

	return callback;
}

function _VirtualDom_equalEvents(x, y)
{
	return x.$ == y.$ && _Json_equality(x.a, y.a);
}



// DIFF


// TODO: Should we do patches like in iOS?
//
// type Patch
//   = At Int Patch
//   | Batch (List Patch)
//   | Change ...
//
// How could it not be better?
//
function _VirtualDom_diff(x, y)
{
	var patches = [];
	_VirtualDom_diffHelp(x, y, patches, 0);
	return patches;
}


function _VirtualDom_pushPatch(patches, type, index, data)
{
	var patch = {
		$: type,
		r: index,
		s: data,
		t: undefined,
		u: undefined
	};
	patches.push(patch);
	return patch;
}


function _VirtualDom_diffHelp(x, y, patches, index)
{
	if (x === y)
	{
		return;
	}

	var xType = x.$;
	var yType = y.$;

	// Bail if you run into different types of nodes. Implies that the
	// structure has changed significantly and it's not worth a diff.
	if (xType !== yType)
	{
		if (xType === 1 && yType === 2)
		{
			y = _VirtualDom_dekey(y);
			yType = 1;
		}
		else
		{
			_VirtualDom_pushPatch(patches, 0, index, y);
			return;
		}
	}

	// Now we know that both nodes are the same $.
	switch (yType)
	{
		case 5:
			var xRefs = x.l;
			var yRefs = y.l;
			var i = xRefs.length;
			var same = i === yRefs.length;
			while (same && i--)
			{
				same = xRefs[i] === yRefs[i];
			}
			if (same)
			{
				y.k = x.k;
				return;
			}
			y.k = y.m();
			var subPatches = [];
			_VirtualDom_diffHelp(x.k, y.k, subPatches, 0);
			subPatches.length > 0 && _VirtualDom_pushPatch(patches, 1, index, subPatches);
			return;

		case 4:
			// gather nested taggers
			var xTaggers = x.j;
			var yTaggers = y.j;
			var nesting = false;

			var xSubNode = x.k;
			while (xSubNode.$ === 4)
			{
				nesting = true;

				typeof xTaggers !== 'object'
					? xTaggers = [xTaggers, xSubNode.j]
					: xTaggers.push(xSubNode.j);

				xSubNode = xSubNode.k;
			}

			var ySubNode = y.k;
			while (ySubNode.$ === 4)
			{
				nesting = true;

				typeof yTaggers !== 'object'
					? yTaggers = [yTaggers, ySubNode.j]
					: yTaggers.push(ySubNode.j);

				ySubNode = ySubNode.k;
			}

			// Just bail if different numbers of taggers. This implies the
			// structure of the virtual DOM has changed.
			if (nesting && xTaggers.length !== yTaggers.length)
			{
				_VirtualDom_pushPatch(patches, 0, index, y);
				return;
			}

			// check if taggers are "the same"
			if (nesting ? !_VirtualDom_pairwiseRefEqual(xTaggers, yTaggers) : xTaggers !== yTaggers)
			{
				_VirtualDom_pushPatch(patches, 2, index, yTaggers);
			}

			// diff everything below the taggers
			_VirtualDom_diffHelp(xSubNode, ySubNode, patches, index + 1);
			return;

		case 0:
			if (x.a !== y.a)
			{
				_VirtualDom_pushPatch(patches, 3, index, y.a);
			}
			return;

		case 1:
			_VirtualDom_diffNodes(x, y, patches, index, _VirtualDom_diffKids);
			return;

		case 2:
			_VirtualDom_diffNodes(x, y, patches, index, _VirtualDom_diffKeyedKids);
			return;

		case 3:
			if (x.h !== y.h)
			{
				_VirtualDom_pushPatch(patches, 0, index, y);
				return;
			}

			var factsDiff = _VirtualDom_diffFacts(x.d, y.d);
			factsDiff && _VirtualDom_pushPatch(patches, 4, index, factsDiff);

			var patch = y.i(x.g, y.g);
			patch && _VirtualDom_pushPatch(patches, 5, index, patch);

			return;
	}
}

// assumes the incoming arrays are the same length
function _VirtualDom_pairwiseRefEqual(as, bs)
{
	for (var i = 0; i < as.length; i++)
	{
		if (as[i] !== bs[i])
		{
			return false;
		}
	}

	return true;
}

function _VirtualDom_diffNodes(x, y, patches, index, diffKids)
{
	// Bail if obvious indicators have changed. Implies more serious
	// structural changes such that it's not worth it to diff.
	if (x.c !== y.c || x.f !== y.f)
	{
		_VirtualDom_pushPatch(patches, 0, index, y);
		return;
	}

	var factsDiff = _VirtualDom_diffFacts(x.d, y.d);
	factsDiff && _VirtualDom_pushPatch(patches, 4, index, factsDiff);

	diffKids(x, y, patches, index);
}



// DIFF FACTS


// TODO Instead of creating a new diff object, it's possible to just test if
// there *is* a diff. During the actual patch, do the diff again and make the
// modifications directly. This way, there's no new allocations. Worth it?
function _VirtualDom_diffFacts(x, y, category)
{
	var diff;

	// look for changes and removals
	for (var xKey in x)
	{
		if (xKey === 'a1' || xKey === 'a0' || xKey === 'a3' || xKey === 'a4')
		{
			var subDiff = _VirtualDom_diffFacts(x[xKey], y[xKey] || {}, xKey);
			if (subDiff)
			{
				diff = diff || {};
				diff[xKey] = subDiff;
			}
			continue;
		}

		// remove if not in the new facts
		if (!(xKey in y))
		{
			diff = diff || {};
			diff[xKey] =
				!category
					? (typeof x[xKey] === 'string' ? '' : null)
					:
				(category === 'a1')
					? ''
					:
				(category === 'a0' || category === 'a3')
					? undefined
					:
				{ f: x[xKey].f, o: undefined };

			continue;
		}

		var xValue = x[xKey];
		var yValue = y[xKey];

		// reference equal, so don't worry about it
		if (xValue === yValue && xKey !== 'value' && xKey !== 'checked'
			|| category === 'a0' && _VirtualDom_equalEvents(xValue, yValue))
		{
			continue;
		}

		diff = diff || {};
		diff[xKey] = yValue;
	}

	// add new stuff
	for (var yKey in y)
	{
		if (!(yKey in x))
		{
			diff = diff || {};
			diff[yKey] = y[yKey];
		}
	}

	return diff;
}



// DIFF KIDS


function _VirtualDom_diffKids(xParent, yParent, patches, index)
{
	var xKids = xParent.e;
	var yKids = yParent.e;

	var xLen = xKids.length;
	var yLen = yKids.length;

	// FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

	if (xLen > yLen)
	{
		_VirtualDom_pushPatch(patches, 6, index, {
			v: yLen,
			i: xLen - yLen
		});
	}
	else if (xLen < yLen)
	{
		_VirtualDom_pushPatch(patches, 7, index, {
			v: xLen,
			e: yKids
		});
	}

	// PAIRWISE DIFF EVERYTHING ELSE

	for (var minLen = xLen < yLen ? xLen : yLen, i = 0; i < minLen; i++)
	{
		var xKid = xKids[i];
		_VirtualDom_diffHelp(xKid, yKids[i], patches, ++index);
		index += xKid.b || 0;
	}
}



// KEYED DIFF


function _VirtualDom_diffKeyedKids(xParent, yParent, patches, rootIndex)
{
	var localPatches = [];

	var changes = {}; // Dict String Entry
	var inserts = []; // Array { index : Int, entry : Entry }
	// type Entry = { tag : String, vnode : VNode, index : Int, data : _ }

	var xKids = xParent.e;
	var yKids = yParent.e;
	var xLen = xKids.length;
	var yLen = yKids.length;
	var xIndex = 0;
	var yIndex = 0;

	var index = rootIndex;

	while (xIndex < xLen && yIndex < yLen)
	{
		var x = xKids[xIndex];
		var y = yKids[yIndex];

		var xKey = x.a;
		var yKey = y.a;
		var xNode = x.b;
		var yNode = y.b;

		var newMatch = undefined;
		var oldMatch = undefined;

		// check if keys match

		if (xKey === yKey)
		{
			index++;
			_VirtualDom_diffHelp(xNode, yNode, localPatches, index);
			index += xNode.b || 0;

			xIndex++;
			yIndex++;
			continue;
		}

		// look ahead 1 to detect insertions and removals.

		var xNext = xKids[xIndex + 1];
		var yNext = yKids[yIndex + 1];

		if (xNext)
		{
			var xNextKey = xNext.a;
			var xNextNode = xNext.b;
			oldMatch = yKey === xNextKey;
		}

		if (yNext)
		{
			var yNextKey = yNext.a;
			var yNextNode = yNext.b;
			newMatch = xKey === yNextKey;
		}


		// swap x and y
		if (newMatch && oldMatch)
		{
			index++;
			_VirtualDom_diffHelp(xNode, yNextNode, localPatches, index);
			_VirtualDom_insertNode(changes, localPatches, xKey, yNode, yIndex, inserts);
			index += xNode.b || 0;

			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNextNode, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 2;
			continue;
		}

		// insert y
		if (newMatch)
		{
			index++;
			_VirtualDom_insertNode(changes, localPatches, yKey, yNode, yIndex, inserts);
			_VirtualDom_diffHelp(xNode, yNextNode, localPatches, index);
			index += xNode.b || 0;

			xIndex += 1;
			yIndex += 2;
			continue;
		}

		// remove x
		if (oldMatch)
		{
			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNode, index);
			index += xNode.b || 0;

			index++;
			_VirtualDom_diffHelp(xNextNode, yNode, localPatches, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 1;
			continue;
		}

		// remove x, insert y
		if (xNext && xNextKey === yNextKey)
		{
			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNode, index);
			_VirtualDom_insertNode(changes, localPatches, yKey, yNode, yIndex, inserts);
			index += xNode.b || 0;

			index++;
			_VirtualDom_diffHelp(xNextNode, yNextNode, localPatches, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 2;
			continue;
		}

		break;
	}

	// eat up any remaining nodes with removeNode and insertNode

	while (xIndex < xLen)
	{
		index++;
		var x = xKids[xIndex];
		var xNode = x.b;
		_VirtualDom_removeNode(changes, localPatches, x.a, xNode, index);
		index += xNode.b || 0;
		xIndex++;
	}

	while (yIndex < yLen)
	{
		var endInserts = endInserts || [];
		var y = yKids[yIndex];
		_VirtualDom_insertNode(changes, localPatches, y.a, y.b, undefined, endInserts);
		yIndex++;
	}

	if (localPatches.length > 0 || inserts.length > 0 || endInserts)
	{
		_VirtualDom_pushPatch(patches, 8, rootIndex, {
			w: localPatches,
			x: inserts,
			y: endInserts
		});
	}
}



// CHANGES FROM KEYED DIFF


var _VirtualDom_POSTFIX = '_elmW6BL';


function _VirtualDom_insertNode(changes, localPatches, key, vnode, yIndex, inserts)
{
	var entry = changes[key];

	// never seen this key before
	if (!entry)
	{
		entry = {
			c: 0,
			z: vnode,
			r: yIndex,
			s: undefined
		};

		inserts.push({ r: yIndex, A: entry });
		changes[key] = entry;

		return;
	}

	// this key was removed earlier, a match!
	if (entry.c === 1)
	{
		inserts.push({ r: yIndex, A: entry });

		entry.c = 2;
		var subPatches = [];
		_VirtualDom_diffHelp(entry.z, vnode, subPatches, entry.r);
		entry.r = yIndex;
		entry.s.s = {
			w: subPatches,
			A: entry
		};

		return;
	}

	// this key has already been inserted or moved, a duplicate!
	_VirtualDom_insertNode(changes, localPatches, key + _VirtualDom_POSTFIX, vnode, yIndex, inserts);
}


function _VirtualDom_removeNode(changes, localPatches, key, vnode, index)
{
	var entry = changes[key];

	// never seen this key before
	if (!entry)
	{
		var patch = _VirtualDom_pushPatch(localPatches, 9, index, undefined);

		changes[key] = {
			c: 1,
			z: vnode,
			r: index,
			s: patch
		};

		return;
	}

	// this key was inserted earlier, a match!
	if (entry.c === 0)
	{
		entry.c = 2;
		var subPatches = [];
		_VirtualDom_diffHelp(vnode, entry.z, subPatches, index);

		_VirtualDom_pushPatch(localPatches, 9, index, {
			w: subPatches,
			A: entry
		});

		return;
	}

	// this key has already been removed or moved, a duplicate!
	_VirtualDom_removeNode(changes, localPatches, key + _VirtualDom_POSTFIX, vnode, index);
}



// ADD DOM NODES
//
// Each DOM node has an "index" assigned in order of traversal. It is important
// to minimize our crawl over the actual DOM, so these indexes (along with the
// descendantsCount of virtual nodes) let us skip touching entire subtrees of
// the DOM if we know there are no patches there.


function _VirtualDom_addDomNodes(domNode, vNode, patches, eventNode)
{
	_VirtualDom_addDomNodesHelp(domNode, vNode, patches, 0, 0, vNode.b, eventNode);
}


// assumes `patches` is non-empty and indexes increase monotonically.
function _VirtualDom_addDomNodesHelp(domNode, vNode, patches, i, low, high, eventNode)
{
	var patch = patches[i];
	var index = patch.r;

	while (index === low)
	{
		var patchType = patch.$;

		if (patchType === 1)
		{
			_VirtualDom_addDomNodes(domNode, vNode.k, patch.s, eventNode);
		}
		else if (patchType === 8)
		{
			patch.t = domNode;
			patch.u = eventNode;

			var subPatches = patch.s.w;
			if (subPatches.length > 0)
			{
				_VirtualDom_addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
			}
		}
		else if (patchType === 9)
		{
			patch.t = domNode;
			patch.u = eventNode;

			var data = patch.s;
			if (data)
			{
				data.A.s = domNode;
				var subPatches = data.w;
				if (subPatches.length > 0)
				{
					_VirtualDom_addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
				}
			}
		}
		else
		{
			patch.t = domNode;
			patch.u = eventNode;
		}

		i++;

		if (!(patch = patches[i]) || (index = patch.r) > high)
		{
			return i;
		}
	}

	var tag = vNode.$;

	if (tag === 4)
	{
		var subNode = vNode.k;

		while (subNode.$ === 4)
		{
			subNode = subNode.k;
		}

		return _VirtualDom_addDomNodesHelp(domNode, subNode, patches, i, low + 1, high, domNode.elm_event_node_ref);
	}

	// tag must be 1 or 2 at this point

	var vKids = vNode.e;
	var childNodes = domNode.childNodes;
	for (var j = 0; j < vKids.length; j++)
	{
		low++;
		var vKid = tag === 1 ? vKids[j] : vKids[j].b;
		var nextLow = low + (vKid.b || 0);
		if (low <= index && index <= nextLow)
		{
			i = _VirtualDom_addDomNodesHelp(childNodes[j], vKid, patches, i, low, nextLow, eventNode);
			if (!(patch = patches[i]) || (index = patch.r) > high)
			{
				return i;
			}
		}
		low = nextLow;
	}
	return i;
}



// APPLY PATCHES


function _VirtualDom_applyPatches(rootDomNode, oldVirtualNode, patches, eventNode)
{
	if (patches.length === 0)
	{
		return rootDomNode;
	}

	_VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
	return _VirtualDom_applyPatchesHelp(rootDomNode, patches);
}

function _VirtualDom_applyPatchesHelp(rootDomNode, patches)
{
	for (var i = 0; i < patches.length; i++)
	{
		var patch = patches[i];
		var localDomNode = patch.t
		var newNode = _VirtualDom_applyPatch(localDomNode, patch);
		if (localDomNode === rootDomNode)
		{
			rootDomNode = newNode;
		}
	}
	return rootDomNode;
}

function _VirtualDom_applyPatch(domNode, patch)
{
	switch (patch.$)
	{
		case 0:
			return _VirtualDom_applyPatchRedraw(domNode, patch.s, patch.u);

		case 4:
			_VirtualDom_applyFacts(domNode, patch.u, patch.s);
			return domNode;

		case 3:
			domNode.replaceData(0, domNode.length, patch.s);
			return domNode;

		case 1:
			return _VirtualDom_applyPatchesHelp(domNode, patch.s);

		case 2:
			if (domNode.elm_event_node_ref)
			{
				domNode.elm_event_node_ref.j = patch.s;
			}
			else
			{
				domNode.elm_event_node_ref = { j: patch.s, p: patch.u };
			}
			return domNode;

		case 6:
			var data = patch.s;
			for (var i = 0; i < data.i; i++)
			{
				domNode.removeChild(domNode.childNodes[data.v]);
			}
			return domNode;

		case 7:
			var data = patch.s;
			var kids = data.e;
			var i = data.v;
			var theEnd = domNode.childNodes[i];
			for (; i < kids.length; i++)
			{
				domNode.insertBefore(_VirtualDom_render(kids[i], patch.u), theEnd);
			}
			return domNode;

		case 9:
			var data = patch.s;
			if (!data)
			{
				domNode.parentNode.removeChild(domNode);
				return domNode;
			}
			var entry = data.A;
			if (typeof entry.r !== 'undefined')
			{
				domNode.parentNode.removeChild(domNode);
			}
			entry.s = _VirtualDom_applyPatchesHelp(domNode, data.w);
			return domNode;

		case 8:
			return _VirtualDom_applyPatchReorder(domNode, patch);

		case 5:
			return patch.s(domNode);

		default:
			_Debug_crash(10); // 'Ran into an unknown patch!'
	}
}


function _VirtualDom_applyPatchRedraw(domNode, vNode, eventNode)
{
	var parentNode = domNode.parentNode;
	var newNode = _VirtualDom_render(vNode, eventNode);

	if (!newNode.elm_event_node_ref)
	{
		newNode.elm_event_node_ref = domNode.elm_event_node_ref;
	}

	if (parentNode && newNode !== domNode)
	{
		parentNode.replaceChild(newNode, domNode);
	}
	return newNode;
}


function _VirtualDom_applyPatchReorder(domNode, patch)
{
	var data = patch.s;

	// remove end inserts
	var frag = _VirtualDom_applyPatchReorderEndInsertsHelp(data.y, patch);

	// removals
	domNode = _VirtualDom_applyPatchesHelp(domNode, data.w);

	// inserts
	var inserts = data.x;
	for (var i = 0; i < inserts.length; i++)
	{
		var insert = inserts[i];
		var entry = insert.A;
		var node = entry.c === 2
			? entry.s
			: _VirtualDom_render(entry.z, patch.u);
		domNode.insertBefore(node, domNode.childNodes[insert.r]);
	}

	// add end inserts
	if (frag)
	{
		_VirtualDom_appendChild(domNode, frag);
	}

	return domNode;
}


function _VirtualDom_applyPatchReorderEndInsertsHelp(endInserts, patch)
{
	if (!endInserts)
	{
		return;
	}

	var frag = _VirtualDom_doc.createDocumentFragment();
	for (var i = 0; i < endInserts.length; i++)
	{
		var insert = endInserts[i];
		var entry = insert.A;
		_VirtualDom_appendChild(frag, entry.c === 2
			? entry.s
			: _VirtualDom_render(entry.z, patch.u)
		);
	}
	return frag;
}


function _VirtualDom_virtualize(node)
{
	// TEXT NODES

	if (node.nodeType === 3)
	{
		return _VirtualDom_text(node.textContent);
	}


	// WEIRD NODES

	if (node.nodeType !== 1)
	{
		return _VirtualDom_text('');
	}


	// ELEMENT NODES

	var attrList = _List_Nil;
	var attrs = node.attributes;
	for (var i = attrs.length; i--; )
	{
		var attr = attrs[i];
		var name = attr.name;
		var value = attr.value;
		attrList = _List_Cons( A2(_VirtualDom_attribute, name, value), attrList );
	}

	var tag = node.tagName.toLowerCase();
	var kidList = _List_Nil;
	var kids = node.childNodes;

	for (var i = kids.length; i--; )
	{
		kidList = _List_Cons(_VirtualDom_virtualize(kids[i]), kidList);
	}
	return A3(_VirtualDom_node, tag, attrList, kidList);
}

function _VirtualDom_dekey(keyedNode)
{
	var keyedKids = keyedNode.e;
	var len = keyedKids.length;
	var kids = new Array(len);
	for (var i = 0; i < len; i++)
	{
		kids[i] = keyedKids[i].b;
	}

	return {
		$: 1,
		c: keyedNode.c,
		d: keyedNode.d,
		e: kids,
		f: keyedNode.f,
		b: keyedNode.b
	};
}




// ELEMENT


var _Debugger_element;

var _Browser_element = _Debugger_element || F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.init,
		impl.update,
		impl.subscriptions,
		function(sendToApp, initialModel) {
			var view = impl.view;
			/**_UNUSED/
			var domNode = args['node'];
			//*/
			/**/
			var domNode = args && args['node'] ? args['node'] : _Debug_crash(0);
			//*/
			var currNode = _VirtualDom_virtualize(domNode);

			return _Browser_makeAnimator(initialModel, function(model)
			{
				var nextNode = view(model);
				var patches = _VirtualDom_diff(currNode, nextNode);
				domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp);
				currNode = nextNode;
			});
		}
	);
});



// DOCUMENT


var _Debugger_document;

var _Browser_document = _Debugger_document || F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.init,
		impl.update,
		impl.subscriptions,
		function(sendToApp, initialModel) {
			var divertHrefToApp = impl.setup && impl.setup(sendToApp)
			var view = impl.view;
			var title = _VirtualDom_doc.title;
			var bodyNode = _VirtualDom_doc.body;
			var currNode = _VirtualDom_virtualize(bodyNode);
			return _Browser_makeAnimator(initialModel, function(model)
			{
				_VirtualDom_divertHrefToApp = divertHrefToApp;
				var doc = view(model);
				var nextNode = _VirtualDom_node('body')(_List_Nil)(doc.body);
				var patches = _VirtualDom_diff(currNode, nextNode);
				bodyNode = _VirtualDom_applyPatches(bodyNode, currNode, patches, sendToApp);
				currNode = nextNode;
				_VirtualDom_divertHrefToApp = 0;
				(title !== doc.title) && (_VirtualDom_doc.title = title = doc.title);
			});
		}
	);
});



// ANIMATION


var _Browser_cancelAnimationFrame =
	typeof cancelAnimationFrame !== 'undefined'
		? cancelAnimationFrame
		: function(id) { clearTimeout(id); };

var _Browser_requestAnimationFrame =
	typeof requestAnimationFrame !== 'undefined'
		? requestAnimationFrame
		: function(callback) { return setTimeout(callback, 1000 / 60); };


function _Browser_makeAnimator(model, draw)
{
	draw(model);

	var state = 0;

	function updateIfNeeded()
	{
		state = state === 1
			? 0
			: ( _Browser_requestAnimationFrame(updateIfNeeded), draw(model), 1 );
	}

	return function(nextModel, isSync)
	{
		model = nextModel;

		isSync
			? ( draw(model),
				state === 2 && (state = 1)
				)
			: ( state === 0 && _Browser_requestAnimationFrame(updateIfNeeded),
				state = 2
				);
	};
}



// APPLICATION


function _Browser_application(impl)
{
	var onUrlChange = impl.onUrlChange;
	var onUrlRequest = impl.onUrlRequest;
	var key = function() { key.a(onUrlChange(_Browser_getUrl())); };

	return _Browser_document({
		setup: function(sendToApp)
		{
			key.a = sendToApp;
			_Browser_window.addEventListener('popstate', key);
			_Browser_window.navigator.userAgent.indexOf('Trident') < 0 || _Browser_window.addEventListener('hashchange', key);

			return F2(function(domNode, event)
			{
				if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button < 1 && !domNode.target && !domNode.hasAttribute('download'))
				{
					event.preventDefault();
					var href = domNode.href;
					var curr = _Browser_getUrl();
					var next = $elm$url$Url$fromString(href).a;
					sendToApp(onUrlRequest(
						(next
							&& curr.protocol === next.protocol
							&& curr.host === next.host
							&& curr.port_.a === next.port_.a
						)
							? $elm$browser$Browser$Internal(next)
							: $elm$browser$Browser$External(href)
					));
				}
			});
		},
		init: function(flags)
		{
			return A3(impl.init, flags, _Browser_getUrl(), key);
		},
		view: impl.view,
		update: impl.update,
		subscriptions: impl.subscriptions
	});
}

function _Browser_getUrl()
{
	return $elm$url$Url$fromString(_VirtualDom_doc.location.href).a || _Debug_crash(1);
}

var _Browser_go = F2(function(key, n)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		n && history.go(n);
		key();
	}));
});

var _Browser_pushUrl = F2(function(key, url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		history.pushState({}, '', url);
		key();
	}));
});

var _Browser_replaceUrl = F2(function(key, url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		history.replaceState({}, '', url);
		key();
	}));
});



// GLOBAL EVENTS


var _Browser_fakeNode = { addEventListener: function() {}, removeEventListener: function() {} };
var _Browser_doc = typeof document !== 'undefined' ? document : _Browser_fakeNode;
var _Browser_window = typeof window !== 'undefined' ? window : _Browser_fakeNode;

var _Browser_on = F3(function(node, eventName, sendToSelf)
{
	return _Scheduler_spawn(_Scheduler_binding(function(callback)
	{
		function handler(event)	{ _Scheduler_rawSpawn(sendToSelf(event)); }
		node.addEventListener(eventName, handler, _VirtualDom_passiveSupported && { passive: true });
		return function() { node.removeEventListener(eventName, handler); };
	}));
});

var _Browser_decodeEvent = F2(function(decoder, event)
{
	var result = _Json_runHelp(decoder, event);
	return $elm$core$Result$isOk(result) ? $elm$core$Maybe$Just(result.a) : $elm$core$Maybe$Nothing;
});



// PAGE VISIBILITY


function _Browser_visibilityInfo()
{
	return (typeof _VirtualDom_doc.hidden !== 'undefined')
		? { hidden: 'hidden', change: 'visibilitychange' }
		:
	(typeof _VirtualDom_doc.mozHidden !== 'undefined')
		? { hidden: 'mozHidden', change: 'mozvisibilitychange' }
		:
	(typeof _VirtualDom_doc.msHidden !== 'undefined')
		? { hidden: 'msHidden', change: 'msvisibilitychange' }
		:
	(typeof _VirtualDom_doc.webkitHidden !== 'undefined')
		? { hidden: 'webkitHidden', change: 'webkitvisibilitychange' }
		: { hidden: 'hidden', change: 'visibilitychange' };
}



// ANIMATION FRAMES


function _Browser_rAF()
{
	return _Scheduler_binding(function(callback)
	{
		var id = _Browser_requestAnimationFrame(function() {
			callback(_Scheduler_succeed(Date.now()));
		});

		return function() {
			_Browser_cancelAnimationFrame(id);
		};
	});
}


function _Browser_now()
{
	return _Scheduler_binding(function(callback)
	{
		callback(_Scheduler_succeed(Date.now()));
	});
}



// DOM STUFF


function _Browser_withNode(id, doStuff)
{
	return _Scheduler_binding(function(callback)
	{
		_Browser_requestAnimationFrame(function() {
			var node = document.getElementById(id);
			callback(node
				? _Scheduler_succeed(doStuff(node))
				: _Scheduler_fail($elm$browser$Browser$Dom$NotFound(id))
			);
		});
	});
}


function _Browser_withWindow(doStuff)
{
	return _Scheduler_binding(function(callback)
	{
		_Browser_requestAnimationFrame(function() {
			callback(_Scheduler_succeed(doStuff()));
		});
	});
}


// FOCUS and BLUR


var _Browser_call = F2(function(functionName, id)
{
	return _Browser_withNode(id, function(node) {
		node[functionName]();
		return _Utils_Tuple0;
	});
});



// WINDOW VIEWPORT


function _Browser_getViewport()
{
	return {
		scene: _Browser_getScene(),
		viewport: {
			x: _Browser_window.pageXOffset,
			y: _Browser_window.pageYOffset,
			width: _Browser_doc.documentElement.clientWidth,
			height: _Browser_doc.documentElement.clientHeight
		}
	};
}

function _Browser_getScene()
{
	var body = _Browser_doc.body;
	var elem = _Browser_doc.documentElement;
	return {
		width: Math.max(body.scrollWidth, body.offsetWidth, elem.scrollWidth, elem.offsetWidth, elem.clientWidth),
		height: Math.max(body.scrollHeight, body.offsetHeight, elem.scrollHeight, elem.offsetHeight, elem.clientHeight)
	};
}

var _Browser_setViewport = F2(function(x, y)
{
	return _Browser_withWindow(function()
	{
		_Browser_window.scroll(x, y);
		return _Utils_Tuple0;
	});
});



// ELEMENT VIEWPORT


function _Browser_getViewportOf(id)
{
	return _Browser_withNode(id, function(node)
	{
		return {
			scene: {
				width: node.scrollWidth,
				height: node.scrollHeight
			},
			viewport: {
				x: node.scrollLeft,
				y: node.scrollTop,
				width: node.clientWidth,
				height: node.clientHeight
			}
		};
	});
}


var _Browser_setViewportOf = F3(function(id, x, y)
{
	return _Browser_withNode(id, function(node)
	{
		node.scrollLeft = x;
		node.scrollTop = y;
		return _Utils_Tuple0;
	});
});



// ELEMENT


function _Browser_getElement(id)
{
	return _Browser_withNode(id, function(node)
	{
		var rect = node.getBoundingClientRect();
		var x = _Browser_window.pageXOffset;
		var y = _Browser_window.pageYOffset;
		return {
			scene: _Browser_getScene(),
			viewport: {
				x: x,
				y: y,
				width: _Browser_doc.documentElement.clientWidth,
				height: _Browser_doc.documentElement.clientHeight
			},
			element: {
				x: x + rect.left,
				y: y + rect.top,
				width: rect.width,
				height: rect.height
			}
		};
	});
}



// LOAD and RELOAD


function _Browser_reload(skipCache)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function(callback)
	{
		_VirtualDom_doc.location.reload(skipCache);
	}));
}

function _Browser_load(url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function(callback)
	{
		try
		{
			_Browser_window.location = url;
		}
		catch(err)
		{
			// Only Firefox can throw a NS_ERROR_MALFORMED_URI exception here.
			// Other browsers reload the page, so let's be consistent about that.
			_VirtualDom_doc.location.reload(false);
		}
	}));
}



var _Bitwise_and = F2(function(a, b)
{
	return a & b;
});

var _Bitwise_or = F2(function(a, b)
{
	return a | b;
});

var _Bitwise_xor = F2(function(a, b)
{
	return a ^ b;
});

function _Bitwise_complement(a)
{
	return ~a;
};

var _Bitwise_shiftLeftBy = F2(function(offset, a)
{
	return a << offset;
});

var _Bitwise_shiftRightBy = F2(function(offset, a)
{
	return a >> offset;
});

var _Bitwise_shiftRightZfBy = F2(function(offset, a)
{
	return a >>> offset;
});


// CREATE

var _Regex_never = /.^/;

var _Regex_fromStringWith = F2(function(options, string)
{
	var flags = 'g';
	if (options.multiline) { flags += 'm'; }
	if (options.caseInsensitive) { flags += 'i'; }

	try
	{
		return $elm$core$Maybe$Just(new RegExp(string, flags));
	}
	catch(error)
	{
		return $elm$core$Maybe$Nothing;
	}
});


// USE

var _Regex_contains = F2(function(re, string)
{
	return string.match(re) !== null;
});


var _Regex_findAtMost = F3(function(n, re, str)
{
	var out = [];
	var number = 0;
	var string = str;
	var lastIndex = re.lastIndex;
	var prevLastIndex = -1;
	var result;
	while (number++ < n && (result = re.exec(string)))
	{
		if (prevLastIndex == re.lastIndex) break;
		var i = result.length - 1;
		var subs = new Array(i);
		while (i > 0)
		{
			var submatch = result[i];
			subs[--i] = submatch
				? $elm$core$Maybe$Just(submatch)
				: $elm$core$Maybe$Nothing;
		}
		out.push(A4($elm$regex$Regex$Match, result[0], result.index, number, _List_fromArray(subs)));
		prevLastIndex = re.lastIndex;
	}
	re.lastIndex = lastIndex;
	return _List_fromArray(out);
});


var _Regex_replaceAtMost = F4(function(n, re, replacer, string)
{
	var count = 0;
	function jsReplacer(match)
	{
		if (count++ >= n)
		{
			return match;
		}
		var i = arguments.length - 3;
		var submatches = new Array(i);
		while (i > 0)
		{
			var submatch = arguments[i];
			submatches[--i] = submatch
				? $elm$core$Maybe$Just(submatch)
				: $elm$core$Maybe$Nothing;
		}
		return replacer(A4($elm$regex$Regex$Match, match, arguments[arguments.length - 2], count, _List_fromArray(submatches)));
	}
	return string.replace(re, jsReplacer);
});

var _Regex_splitAtMost = F3(function(n, re, str)
{
	var string = str;
	var out = [];
	var start = re.lastIndex;
	var restoreLastIndex = re.lastIndex;
	while (n--)
	{
		var result = re.exec(string);
		if (!result) break;
		out.push(string.slice(start, result.index));
		start = re.lastIndex;
	}
	out.push(string.slice(start));
	re.lastIndex = restoreLastIndex;
	return _List_fromArray(out);
});

var _Regex_infinity = Infinity;




// STRINGS


var _Parser_isSubString = F5(function(smallString, offset, row, col, bigString)
{
	var smallLength = smallString.length;
	var isGood = offset + smallLength <= bigString.length;

	for (var i = 0; isGood && i < smallLength; )
	{
		var code = bigString.charCodeAt(offset);
		isGood =
			smallString[i++] === bigString[offset++]
			&& (
				code === 0x000A /* \n */
					? ( row++, col=1 )
					: ( col++, (code & 0xF800) === 0xD800 ? smallString[i++] === bigString[offset++] : 1 )
			)
	}

	return _Utils_Tuple3(isGood ? offset : -1, row, col);
});



// CHARS


var _Parser_isSubChar = F3(function(predicate, offset, string)
{
	return (
		string.length <= offset
			? -1
			:
		(string.charCodeAt(offset) & 0xF800) === 0xD800
			? (predicate(_Utils_chr(string.substr(offset, 2))) ? offset + 2 : -1)
			:
		(predicate(_Utils_chr(string[offset]))
			? ((string[offset] === '\n') ? -2 : (offset + 1))
			: -1
		)
	);
});


var _Parser_isAsciiCode = F3(function(code, offset, string)
{
	return string.charCodeAt(offset) === code;
});



// NUMBERS


var _Parser_chompBase10 = F2(function(offset, string)
{
	for (; offset < string.length; offset++)
	{
		var code = string.charCodeAt(offset);
		if (code < 0x30 || 0x39 < code)
		{
			return offset;
		}
	}
	return offset;
});


var _Parser_consumeBase = F3(function(base, offset, string)
{
	for (var total = 0; offset < string.length; offset++)
	{
		var digit = string.charCodeAt(offset) - 0x30;
		if (digit < 0 || base <= digit) break;
		total = base * total + digit;
	}
	return _Utils_Tuple2(offset, total);
});


var _Parser_consumeBase16 = F2(function(offset, string)
{
	for (var total = 0; offset < string.length; offset++)
	{
		var code = string.charCodeAt(offset);
		if (0x30 <= code && code <= 0x39)
		{
			total = 16 * total + code - 0x30;
		}
		else if (0x41 <= code && code <= 0x46)
		{
			total = 16 * total + code - 55;
		}
		else if (0x61 <= code && code <= 0x66)
		{
			total = 16 * total + code - 87;
		}
		else
		{
			break;
		}
	}
	return _Utils_Tuple2(offset, total);
});



// FIND STRING


var _Parser_findSubString = F5(function(smallString, offset, row, col, bigString)
{
	var newOffset = bigString.indexOf(smallString, offset);
	var target = newOffset < 0 ? bigString.length : newOffset + smallString.length;

	while (offset < target)
	{
		var code = bigString.charCodeAt(offset++);
		code === 0x000A /* \n */
			? ( col=1, row++ )
			: ( col++, (code & 0xF800) === 0xD800 && offset++ )
	}

	return _Utils_Tuple3(newOffset, row, col);
});
var $elm$core$Basics$EQ = {$: 'EQ'};
var $elm$core$Basics$GT = {$: 'GT'};
var $elm$core$Basics$LT = {$: 'LT'};
var $elm$core$List$cons = _List_cons;
var $elm$core$Dict$foldr = F3(
	function (func, acc, t) {
		foldr:
		while (true) {
			if (t.$ === 'RBEmpty_elm_builtin') {
				return acc;
			} else {
				var key = t.b;
				var value = t.c;
				var left = t.d;
				var right = t.e;
				var $temp$func = func,
					$temp$acc = A3(
					func,
					key,
					value,
					A3($elm$core$Dict$foldr, func, acc, right)),
					$temp$t = left;
				func = $temp$func;
				acc = $temp$acc;
				t = $temp$t;
				continue foldr;
			}
		}
	});
var $elm$core$Dict$toList = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, list) {
				return A2(
					$elm$core$List$cons,
					_Utils_Tuple2(key, value),
					list);
			}),
		_List_Nil,
		dict);
};
var $elm$core$Dict$keys = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, keyList) {
				return A2($elm$core$List$cons, key, keyList);
			}),
		_List_Nil,
		dict);
};
var $elm$core$Set$toList = function (_v0) {
	var dict = _v0.a;
	return $elm$core$Dict$keys(dict);
};
var $elm$core$Elm$JsArray$foldr = _JsArray_foldr;
var $elm$core$Array$foldr = F3(
	function (func, baseCase, _v0) {
		var tree = _v0.c;
		var tail = _v0.d;
		var helper = F2(
			function (node, acc) {
				if (node.$ === 'SubTree') {
					var subTree = node.a;
					return A3($elm$core$Elm$JsArray$foldr, helper, acc, subTree);
				} else {
					var values = node.a;
					return A3($elm$core$Elm$JsArray$foldr, func, acc, values);
				}
			});
		return A3(
			$elm$core$Elm$JsArray$foldr,
			helper,
			A3($elm$core$Elm$JsArray$foldr, func, baseCase, tail),
			tree);
	});
var $elm$core$Array$toList = function (array) {
	return A3($elm$core$Array$foldr, $elm$core$List$cons, _List_Nil, array);
};
var $elm$core$Result$Err = function (a) {
	return {$: 'Err', a: a};
};
var $elm$json$Json$Decode$Failure = F2(
	function (a, b) {
		return {$: 'Failure', a: a, b: b};
	});
var $elm$json$Json$Decode$Field = F2(
	function (a, b) {
		return {$: 'Field', a: a, b: b};
	});
var $elm$json$Json$Decode$Index = F2(
	function (a, b) {
		return {$: 'Index', a: a, b: b};
	});
var $elm$core$Result$Ok = function (a) {
	return {$: 'Ok', a: a};
};
var $elm$json$Json$Decode$OneOf = function (a) {
	return {$: 'OneOf', a: a};
};
var $elm$core$Basics$False = {$: 'False'};
var $elm$core$Basics$add = _Basics_add;
var $elm$core$Maybe$Just = function (a) {
	return {$: 'Just', a: a};
};
var $elm$core$Maybe$Nothing = {$: 'Nothing'};
var $elm$core$String$all = _String_all;
var $elm$core$Basics$and = _Basics_and;
var $elm$core$Basics$append = _Utils_append;
var $elm$json$Json$Encode$encode = _Json_encode;
var $elm$core$String$fromInt = _String_fromNumber;
var $elm$core$String$join = F2(
	function (sep, chunks) {
		return A2(
			_String_join,
			sep,
			_List_toArray(chunks));
	});
var $elm$core$String$split = F2(
	function (sep, string) {
		return _List_fromArray(
			A2(_String_split, sep, string));
	});
var $elm$json$Json$Decode$indent = function (str) {
	return A2(
		$elm$core$String$join,
		'\n    ',
		A2($elm$core$String$split, '\n', str));
};
var $elm$core$List$foldl = F3(
	function (func, acc, list) {
		foldl:
		while (true) {
			if (!list.b) {
				return acc;
			} else {
				var x = list.a;
				var xs = list.b;
				var $temp$func = func,
					$temp$acc = A2(func, x, acc),
					$temp$list = xs;
				func = $temp$func;
				acc = $temp$acc;
				list = $temp$list;
				continue foldl;
			}
		}
	});
var $elm$core$List$length = function (xs) {
	return A3(
		$elm$core$List$foldl,
		F2(
			function (_v0, i) {
				return i + 1;
			}),
		0,
		xs);
};
var $elm$core$List$map2 = _List_map2;
var $elm$core$Basics$le = _Utils_le;
var $elm$core$Basics$sub = _Basics_sub;
var $elm$core$List$rangeHelp = F3(
	function (lo, hi, list) {
		rangeHelp:
		while (true) {
			if (_Utils_cmp(lo, hi) < 1) {
				var $temp$lo = lo,
					$temp$hi = hi - 1,
					$temp$list = A2($elm$core$List$cons, hi, list);
				lo = $temp$lo;
				hi = $temp$hi;
				list = $temp$list;
				continue rangeHelp;
			} else {
				return list;
			}
		}
	});
var $elm$core$List$range = F2(
	function (lo, hi) {
		return A3($elm$core$List$rangeHelp, lo, hi, _List_Nil);
	});
var $elm$core$List$indexedMap = F2(
	function (f, xs) {
		return A3(
			$elm$core$List$map2,
			f,
			A2(
				$elm$core$List$range,
				0,
				$elm$core$List$length(xs) - 1),
			xs);
	});
var $elm$core$Char$toCode = _Char_toCode;
var $elm$core$Char$isLower = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (97 <= code) && (code <= 122);
};
var $elm$core$Char$isUpper = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (code <= 90) && (65 <= code);
};
var $elm$core$Basics$or = _Basics_or;
var $elm$core$Char$isAlpha = function (_char) {
	return $elm$core$Char$isLower(_char) || $elm$core$Char$isUpper(_char);
};
var $elm$core$Char$isDigit = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (code <= 57) && (48 <= code);
};
var $elm$core$Char$isAlphaNum = function (_char) {
	return $elm$core$Char$isLower(_char) || ($elm$core$Char$isUpper(_char) || $elm$core$Char$isDigit(_char));
};
var $elm$core$List$reverse = function (list) {
	return A3($elm$core$List$foldl, $elm$core$List$cons, _List_Nil, list);
};
var $elm$core$String$uncons = _String_uncons;
var $elm$json$Json$Decode$errorOneOf = F2(
	function (i, error) {
		return '\n\n(' + ($elm$core$String$fromInt(i + 1) + (') ' + $elm$json$Json$Decode$indent(
			$elm$json$Json$Decode$errorToString(error))));
	});
var $elm$json$Json$Decode$errorToString = function (error) {
	return A2($elm$json$Json$Decode$errorToStringHelp, error, _List_Nil);
};
var $elm$json$Json$Decode$errorToStringHelp = F2(
	function (error, context) {
		errorToStringHelp:
		while (true) {
			switch (error.$) {
				case 'Field':
					var f = error.a;
					var err = error.b;
					var isSimple = function () {
						var _v1 = $elm$core$String$uncons(f);
						if (_v1.$ === 'Nothing') {
							return false;
						} else {
							var _v2 = _v1.a;
							var _char = _v2.a;
							var rest = _v2.b;
							return $elm$core$Char$isAlpha(_char) && A2($elm$core$String$all, $elm$core$Char$isAlphaNum, rest);
						}
					}();
					var fieldName = isSimple ? ('.' + f) : ('[\'' + (f + '\']'));
					var $temp$error = err,
						$temp$context = A2($elm$core$List$cons, fieldName, context);
					error = $temp$error;
					context = $temp$context;
					continue errorToStringHelp;
				case 'Index':
					var i = error.a;
					var err = error.b;
					var indexName = '[' + ($elm$core$String$fromInt(i) + ']');
					var $temp$error = err,
						$temp$context = A2($elm$core$List$cons, indexName, context);
					error = $temp$error;
					context = $temp$context;
					continue errorToStringHelp;
				case 'OneOf':
					var errors = error.a;
					if (!errors.b) {
						return 'Ran into a Json.Decode.oneOf with no possibilities' + function () {
							if (!context.b) {
								return '!';
							} else {
								return ' at json' + A2(
									$elm$core$String$join,
									'',
									$elm$core$List$reverse(context));
							}
						}();
					} else {
						if (!errors.b.b) {
							var err = errors.a;
							var $temp$error = err,
								$temp$context = context;
							error = $temp$error;
							context = $temp$context;
							continue errorToStringHelp;
						} else {
							var starter = function () {
								if (!context.b) {
									return 'Json.Decode.oneOf';
								} else {
									return 'The Json.Decode.oneOf at json' + A2(
										$elm$core$String$join,
										'',
										$elm$core$List$reverse(context));
								}
							}();
							var introduction = starter + (' failed in the following ' + ($elm$core$String$fromInt(
								$elm$core$List$length(errors)) + ' ways:'));
							return A2(
								$elm$core$String$join,
								'\n\n',
								A2(
									$elm$core$List$cons,
									introduction,
									A2($elm$core$List$indexedMap, $elm$json$Json$Decode$errorOneOf, errors)));
						}
					}
				default:
					var msg = error.a;
					var json = error.b;
					var introduction = function () {
						if (!context.b) {
							return 'Problem with the given value:\n\n';
						} else {
							return 'Problem with the value at json' + (A2(
								$elm$core$String$join,
								'',
								$elm$core$List$reverse(context)) + ':\n\n    ');
						}
					}();
					return introduction + ($elm$json$Json$Decode$indent(
						A2($elm$json$Json$Encode$encode, 4, json)) + ('\n\n' + msg));
			}
		}
	});
var $elm$core$Array$branchFactor = 32;
var $elm$core$Array$Array_elm_builtin = F4(
	function (a, b, c, d) {
		return {$: 'Array_elm_builtin', a: a, b: b, c: c, d: d};
	});
var $elm$core$Elm$JsArray$empty = _JsArray_empty;
var $elm$core$Basics$ceiling = _Basics_ceiling;
var $elm$core$Basics$fdiv = _Basics_fdiv;
var $elm$core$Basics$logBase = F2(
	function (base, number) {
		return _Basics_log(number) / _Basics_log(base);
	});
var $elm$core$Basics$toFloat = _Basics_toFloat;
var $elm$core$Array$shiftStep = $elm$core$Basics$ceiling(
	A2($elm$core$Basics$logBase, 2, $elm$core$Array$branchFactor));
var $elm$core$Array$empty = A4($elm$core$Array$Array_elm_builtin, 0, $elm$core$Array$shiftStep, $elm$core$Elm$JsArray$empty, $elm$core$Elm$JsArray$empty);
var $elm$core$Elm$JsArray$initialize = _JsArray_initialize;
var $elm$core$Array$Leaf = function (a) {
	return {$: 'Leaf', a: a};
};
var $elm$core$Basics$apL = F2(
	function (f, x) {
		return f(x);
	});
var $elm$core$Basics$apR = F2(
	function (x, f) {
		return f(x);
	});
var $elm$core$Basics$eq = _Utils_equal;
var $elm$core$Basics$floor = _Basics_floor;
var $elm$core$Elm$JsArray$length = _JsArray_length;
var $elm$core$Basics$gt = _Utils_gt;
var $elm$core$Basics$max = F2(
	function (x, y) {
		return (_Utils_cmp(x, y) > 0) ? x : y;
	});
var $elm$core$Basics$mul = _Basics_mul;
var $elm$core$Array$SubTree = function (a) {
	return {$: 'SubTree', a: a};
};
var $elm$core$Elm$JsArray$initializeFromList = _JsArray_initializeFromList;
var $elm$core$Array$compressNodes = F2(
	function (nodes, acc) {
		compressNodes:
		while (true) {
			var _v0 = A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, nodes);
			var node = _v0.a;
			var remainingNodes = _v0.b;
			var newAcc = A2(
				$elm$core$List$cons,
				$elm$core$Array$SubTree(node),
				acc);
			if (!remainingNodes.b) {
				return $elm$core$List$reverse(newAcc);
			} else {
				var $temp$nodes = remainingNodes,
					$temp$acc = newAcc;
				nodes = $temp$nodes;
				acc = $temp$acc;
				continue compressNodes;
			}
		}
	});
var $elm$core$Tuple$first = function (_v0) {
	var x = _v0.a;
	return x;
};
var $elm$core$Array$treeFromBuilder = F2(
	function (nodeList, nodeListSize) {
		treeFromBuilder:
		while (true) {
			var newNodeSize = $elm$core$Basics$ceiling(nodeListSize / $elm$core$Array$branchFactor);
			if (newNodeSize === 1) {
				return A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, nodeList).a;
			} else {
				var $temp$nodeList = A2($elm$core$Array$compressNodes, nodeList, _List_Nil),
					$temp$nodeListSize = newNodeSize;
				nodeList = $temp$nodeList;
				nodeListSize = $temp$nodeListSize;
				continue treeFromBuilder;
			}
		}
	});
var $elm$core$Array$builderToArray = F2(
	function (reverseNodeList, builder) {
		if (!builder.nodeListSize) {
			return A4(
				$elm$core$Array$Array_elm_builtin,
				$elm$core$Elm$JsArray$length(builder.tail),
				$elm$core$Array$shiftStep,
				$elm$core$Elm$JsArray$empty,
				builder.tail);
		} else {
			var treeLen = builder.nodeListSize * $elm$core$Array$branchFactor;
			var depth = $elm$core$Basics$floor(
				A2($elm$core$Basics$logBase, $elm$core$Array$branchFactor, treeLen - 1));
			var correctNodeList = reverseNodeList ? $elm$core$List$reverse(builder.nodeList) : builder.nodeList;
			var tree = A2($elm$core$Array$treeFromBuilder, correctNodeList, builder.nodeListSize);
			return A4(
				$elm$core$Array$Array_elm_builtin,
				$elm$core$Elm$JsArray$length(builder.tail) + treeLen,
				A2($elm$core$Basics$max, 5, depth * $elm$core$Array$shiftStep),
				tree,
				builder.tail);
		}
	});
var $elm$core$Basics$idiv = _Basics_idiv;
var $elm$core$Basics$lt = _Utils_lt;
var $elm$core$Array$initializeHelp = F5(
	function (fn, fromIndex, len, nodeList, tail) {
		initializeHelp:
		while (true) {
			if (fromIndex < 0) {
				return A2(
					$elm$core$Array$builderToArray,
					false,
					{nodeList: nodeList, nodeListSize: (len / $elm$core$Array$branchFactor) | 0, tail: tail});
			} else {
				var leaf = $elm$core$Array$Leaf(
					A3($elm$core$Elm$JsArray$initialize, $elm$core$Array$branchFactor, fromIndex, fn));
				var $temp$fn = fn,
					$temp$fromIndex = fromIndex - $elm$core$Array$branchFactor,
					$temp$len = len,
					$temp$nodeList = A2($elm$core$List$cons, leaf, nodeList),
					$temp$tail = tail;
				fn = $temp$fn;
				fromIndex = $temp$fromIndex;
				len = $temp$len;
				nodeList = $temp$nodeList;
				tail = $temp$tail;
				continue initializeHelp;
			}
		}
	});
var $elm$core$Basics$remainderBy = _Basics_remainderBy;
var $elm$core$Array$initialize = F2(
	function (len, fn) {
		if (len <= 0) {
			return $elm$core$Array$empty;
		} else {
			var tailLen = len % $elm$core$Array$branchFactor;
			var tail = A3($elm$core$Elm$JsArray$initialize, tailLen, len - tailLen, fn);
			var initialFromIndex = (len - tailLen) - $elm$core$Array$branchFactor;
			return A5($elm$core$Array$initializeHelp, fn, initialFromIndex, len, _List_Nil, tail);
		}
	});
var $elm$core$Basics$True = {$: 'True'};
var $elm$core$Result$isOk = function (result) {
	if (result.$ === 'Ok') {
		return true;
	} else {
		return false;
	}
};
var $elm$json$Json$Decode$map = _Json_map1;
var $elm$json$Json$Decode$map2 = _Json_map2;
var $elm$json$Json$Decode$succeed = _Json_succeed;
var $elm$virtual_dom$VirtualDom$toHandlerInt = function (handler) {
	switch (handler.$) {
		case 'Normal':
			return 0;
		case 'MayStopPropagation':
			return 1;
		case 'MayPreventDefault':
			return 2;
		default:
			return 3;
	}
};
var $elm$browser$Browser$External = function (a) {
	return {$: 'External', a: a};
};
var $elm$browser$Browser$Internal = function (a) {
	return {$: 'Internal', a: a};
};
var $elm$core$Basics$identity = function (x) {
	return x;
};
var $elm$browser$Browser$Dom$NotFound = function (a) {
	return {$: 'NotFound', a: a};
};
var $elm$url$Url$Http = {$: 'Http'};
var $elm$url$Url$Https = {$: 'Https'};
var $elm$url$Url$Url = F6(
	function (protocol, host, port_, path, query, fragment) {
		return {fragment: fragment, host: host, path: path, port_: port_, protocol: protocol, query: query};
	});
var $elm$core$String$contains = _String_contains;
var $elm$core$String$length = _String_length;
var $elm$core$String$slice = _String_slice;
var $elm$core$String$dropLeft = F2(
	function (n, string) {
		return (n < 1) ? string : A3(
			$elm$core$String$slice,
			n,
			$elm$core$String$length(string),
			string);
	});
var $elm$core$String$indexes = _String_indexes;
var $elm$core$String$isEmpty = function (string) {
	return string === '';
};
var $elm$core$String$left = F2(
	function (n, string) {
		return (n < 1) ? '' : A3($elm$core$String$slice, 0, n, string);
	});
var $elm$core$String$toInt = _String_toInt;
var $elm$url$Url$chompBeforePath = F5(
	function (protocol, path, params, frag, str) {
		if ($elm$core$String$isEmpty(str) || A2($elm$core$String$contains, '@', str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, ':', str);
			if (!_v0.b) {
				return $elm$core$Maybe$Just(
					A6($elm$url$Url$Url, protocol, str, $elm$core$Maybe$Nothing, path, params, frag));
			} else {
				if (!_v0.b.b) {
					var i = _v0.a;
					var _v1 = $elm$core$String$toInt(
						A2($elm$core$String$dropLeft, i + 1, str));
					if (_v1.$ === 'Nothing') {
						return $elm$core$Maybe$Nothing;
					} else {
						var port_ = _v1;
						return $elm$core$Maybe$Just(
							A6(
								$elm$url$Url$Url,
								protocol,
								A2($elm$core$String$left, i, str),
								port_,
								path,
								params,
								frag));
					}
				} else {
					return $elm$core$Maybe$Nothing;
				}
			}
		}
	});
var $elm$url$Url$chompBeforeQuery = F4(
	function (protocol, params, frag, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '/', str);
			if (!_v0.b) {
				return A5($elm$url$Url$chompBeforePath, protocol, '/', params, frag, str);
			} else {
				var i = _v0.a;
				return A5(
					$elm$url$Url$chompBeforePath,
					protocol,
					A2($elm$core$String$dropLeft, i, str),
					params,
					frag,
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$url$Url$chompBeforeFragment = F3(
	function (protocol, frag, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '?', str);
			if (!_v0.b) {
				return A4($elm$url$Url$chompBeforeQuery, protocol, $elm$core$Maybe$Nothing, frag, str);
			} else {
				var i = _v0.a;
				return A4(
					$elm$url$Url$chompBeforeQuery,
					protocol,
					$elm$core$Maybe$Just(
						A2($elm$core$String$dropLeft, i + 1, str)),
					frag,
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$url$Url$chompAfterProtocol = F2(
	function (protocol, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '#', str);
			if (!_v0.b) {
				return A3($elm$url$Url$chompBeforeFragment, protocol, $elm$core$Maybe$Nothing, str);
			} else {
				var i = _v0.a;
				return A3(
					$elm$url$Url$chompBeforeFragment,
					protocol,
					$elm$core$Maybe$Just(
						A2($elm$core$String$dropLeft, i + 1, str)),
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$core$String$startsWith = _String_startsWith;
var $elm$url$Url$fromString = function (str) {
	return A2($elm$core$String$startsWith, 'http://', str) ? A2(
		$elm$url$Url$chompAfterProtocol,
		$elm$url$Url$Http,
		A2($elm$core$String$dropLeft, 7, str)) : (A2($elm$core$String$startsWith, 'https://', str) ? A2(
		$elm$url$Url$chompAfterProtocol,
		$elm$url$Url$Https,
		A2($elm$core$String$dropLeft, 8, str)) : $elm$core$Maybe$Nothing);
};
var $elm$core$Basics$never = function (_v0) {
	never:
	while (true) {
		var nvr = _v0.a;
		var $temp$_v0 = nvr;
		_v0 = $temp$_v0;
		continue never;
	}
};
var $elm$core$Task$Perform = function (a) {
	return {$: 'Perform', a: a};
};
var $elm$core$Task$succeed = _Scheduler_succeed;
var $elm$core$Task$init = $elm$core$Task$succeed(_Utils_Tuple0);
var $elm$core$List$foldrHelper = F4(
	function (fn, acc, ctr, ls) {
		if (!ls.b) {
			return acc;
		} else {
			var a = ls.a;
			var r1 = ls.b;
			if (!r1.b) {
				return A2(fn, a, acc);
			} else {
				var b = r1.a;
				var r2 = r1.b;
				if (!r2.b) {
					return A2(
						fn,
						a,
						A2(fn, b, acc));
				} else {
					var c = r2.a;
					var r3 = r2.b;
					if (!r3.b) {
						return A2(
							fn,
							a,
							A2(
								fn,
								b,
								A2(fn, c, acc)));
					} else {
						var d = r3.a;
						var r4 = r3.b;
						var res = (ctr > 500) ? A3(
							$elm$core$List$foldl,
							fn,
							acc,
							$elm$core$List$reverse(r4)) : A4($elm$core$List$foldrHelper, fn, acc, ctr + 1, r4);
						return A2(
							fn,
							a,
							A2(
								fn,
								b,
								A2(
									fn,
									c,
									A2(fn, d, res))));
					}
				}
			}
		}
	});
var $elm$core$List$foldr = F3(
	function (fn, acc, ls) {
		return A4($elm$core$List$foldrHelper, fn, acc, 0, ls);
	});
var $elm$core$List$map = F2(
	function (f, xs) {
		return A3(
			$elm$core$List$foldr,
			F2(
				function (x, acc) {
					return A2(
						$elm$core$List$cons,
						f(x),
						acc);
				}),
			_List_Nil,
			xs);
	});
var $elm$core$Task$andThen = _Scheduler_andThen;
var $elm$core$Task$map = F2(
	function (func, taskA) {
		return A2(
			$elm$core$Task$andThen,
			function (a) {
				return $elm$core$Task$succeed(
					func(a));
			},
			taskA);
	});
var $elm$core$Task$map2 = F3(
	function (func, taskA, taskB) {
		return A2(
			$elm$core$Task$andThen,
			function (a) {
				return A2(
					$elm$core$Task$andThen,
					function (b) {
						return $elm$core$Task$succeed(
							A2(func, a, b));
					},
					taskB);
			},
			taskA);
	});
var $elm$core$Task$sequence = function (tasks) {
	return A3(
		$elm$core$List$foldr,
		$elm$core$Task$map2($elm$core$List$cons),
		$elm$core$Task$succeed(_List_Nil),
		tasks);
};
var $elm$core$Platform$sendToApp = _Platform_sendToApp;
var $elm$core$Task$spawnCmd = F2(
	function (router, _v0) {
		var task = _v0.a;
		return _Scheduler_spawn(
			A2(
				$elm$core$Task$andThen,
				$elm$core$Platform$sendToApp(router),
				task));
	});
var $elm$core$Task$onEffects = F3(
	function (router, commands, state) {
		return A2(
			$elm$core$Task$map,
			function (_v0) {
				return _Utils_Tuple0;
			},
			$elm$core$Task$sequence(
				A2(
					$elm$core$List$map,
					$elm$core$Task$spawnCmd(router),
					commands)));
	});
var $elm$core$Task$onSelfMsg = F3(
	function (_v0, _v1, _v2) {
		return $elm$core$Task$succeed(_Utils_Tuple0);
	});
var $elm$core$Task$cmdMap = F2(
	function (tagger, _v0) {
		var task = _v0.a;
		return $elm$core$Task$Perform(
			A2($elm$core$Task$map, tagger, task));
	});
_Platform_effectManagers['Task'] = _Platform_createManager($elm$core$Task$init, $elm$core$Task$onEffects, $elm$core$Task$onSelfMsg, $elm$core$Task$cmdMap);
var $elm$core$Task$command = _Platform_leaf('Task');
var $elm$core$Task$perform = F2(
	function (toMessage, task) {
		return $elm$core$Task$command(
			$elm$core$Task$Perform(
				A2($elm$core$Task$map, toMessage, task)));
	});
var $elm$browser$Browser$element = _Browser_element;
var $elm$core$Platform$Cmd$batch = _Platform_batch;
var $elm$core$Platform$Cmd$none = $elm$core$Platform$Cmd$batch(_List_Nil);
var $elm$json$Json$Encode$string = _Json_wrap;
var $author$project$Ports$requestCopy = _Platform_outgoingPort('requestCopy', $elm$json$Json$Encode$string);
var $elm$json$Json$Encode$null = _Json_encodeNull;
var $author$project$Ports$requestPaste = _Platform_outgoingPort(
	'requestPaste',
	function ($) {
		return $elm$json$Json$Encode$null;
	});
var $author$project$PortHandlers$editorPorts = function (cwd) {
	return {
		requestChange: function (code) {
			return $elm$core$Platform$Cmd$none;
		},
		requestCompletion: function (completionRequest) {
			return $elm$core$Platform$Cmd$none;
		},
		requestCopy: $author$project$Ports$requestCopy,
		requestPaste: $author$project$Ports$requestPaste,
		requestRun: function (code) {
			return $elm$core$Platform$Cmd$none;
		},
		requestSave: function (code) {
			return $elm$core$Platform$Cmd$none;
		}
	};
};
var $author$project$Terminal$Types$Primary = {$: 'Primary'};
var $author$project$Terminal$Types$TerminalSize = F2(
	function (height, width) {
		return {height: height, width: width};
	});
var $elm$core$Dict$RBEmpty_elm_builtin = {$: 'RBEmpty_elm_builtin'};
var $elm$core$Dict$empty = $elm$core$Dict$RBEmpty_elm_builtin;
var $elm$core$Dict$Black = {$: 'Black'};
var $elm$core$Dict$RBNode_elm_builtin = F5(
	function (a, b, c, d, e) {
		return {$: 'RBNode_elm_builtin', a: a, b: b, c: c, d: d, e: e};
	});
var $elm$core$Dict$Red = {$: 'Red'};
var $elm$core$Dict$balance = F5(
	function (color, key, value, left, right) {
		if ((right.$ === 'RBNode_elm_builtin') && (right.a.$ === 'Red')) {
			var _v1 = right.a;
			var rK = right.b;
			var rV = right.c;
			var rLeft = right.d;
			var rRight = right.e;
			if ((left.$ === 'RBNode_elm_builtin') && (left.a.$ === 'Red')) {
				var _v3 = left.a;
				var lK = left.b;
				var lV = left.c;
				var lLeft = left.d;
				var lRight = left.e;
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Red,
					key,
					value,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, rK, rV, rLeft, rRight));
			} else {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					color,
					rK,
					rV,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, key, value, left, rLeft),
					rRight);
			}
		} else {
			if ((((left.$ === 'RBNode_elm_builtin') && (left.a.$ === 'Red')) && (left.d.$ === 'RBNode_elm_builtin')) && (left.d.a.$ === 'Red')) {
				var _v5 = left.a;
				var lK = left.b;
				var lV = left.c;
				var _v6 = left.d;
				var _v7 = _v6.a;
				var llK = _v6.b;
				var llV = _v6.c;
				var llLeft = _v6.d;
				var llRight = _v6.e;
				var lRight = left.e;
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Red,
					lK,
					lV,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, llK, llV, llLeft, llRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, key, value, lRight, right));
			} else {
				return A5($elm$core$Dict$RBNode_elm_builtin, color, key, value, left, right);
			}
		}
	});
var $elm$core$Basics$compare = _Utils_compare;
var $elm$core$Dict$insertHelp = F3(
	function (key, value, dict) {
		if (dict.$ === 'RBEmpty_elm_builtin') {
			return A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, key, value, $elm$core$Dict$RBEmpty_elm_builtin, $elm$core$Dict$RBEmpty_elm_builtin);
		} else {
			var nColor = dict.a;
			var nKey = dict.b;
			var nValue = dict.c;
			var nLeft = dict.d;
			var nRight = dict.e;
			var _v1 = A2($elm$core$Basics$compare, key, nKey);
			switch (_v1.$) {
				case 'LT':
					return A5(
						$elm$core$Dict$balance,
						nColor,
						nKey,
						nValue,
						A3($elm$core$Dict$insertHelp, key, value, nLeft),
						nRight);
				case 'EQ':
					return A5($elm$core$Dict$RBNode_elm_builtin, nColor, nKey, value, nLeft, nRight);
				default:
					return A5(
						$elm$core$Dict$balance,
						nColor,
						nKey,
						nValue,
						nLeft,
						A3($elm$core$Dict$insertHelp, key, value, nRight));
			}
		}
	});
var $elm$core$Dict$insert = F3(
	function (key, value, dict) {
		var _v0 = A3($elm$core$Dict$insertHelp, key, value, dict);
		if ((_v0.$ === 'RBNode_elm_builtin') && (_v0.a.$ === 'Red')) {
			var _v1 = _v0.a;
			var k = _v0.b;
			var v = _v0.c;
			var l = _v0.d;
			var r = _v0.e;
			return A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, k, v, l, r);
		} else {
			var x = _v0;
			return x;
		}
	});
var $elm$core$Dict$fromList = function (assocs) {
	return A3(
		$elm$core$List$foldl,
		F2(
			function (_v0, dict) {
				var key = _v0.a;
				var value = _v0.b;
				return A3($elm$core$Dict$insert, key, value, dict);
			}),
		$elm$core$Dict$empty,
		assocs);
};
var $author$project$Terminal$Types$Buffer = F2(
	function (editor, scrollRegion) {
		return {editor: editor, scrollRegion: scrollRegion};
	});
var $author$project$Editor$Msg$RenderableLine = F4(
	function (key, text, errors, multilineSymbols) {
		return {errors: errors, key: key, multilineSymbols: multilineSymbols, text: text};
	});
var $author$project$Editor$Lib$createRenderableLine = F2(
	function (lengthOfRenderableLines, text) {
		return A4(
			$author$project$Editor$Msg$RenderableLine,
			$elm$core$String$fromInt(lengthOfRenderableLines + 1),
			text,
			_List_Nil,
			_List_Nil);
	});
var $author$project$Editor$Msg$EditorCoordinate = F2(
	function (x, y) {
		return {x: x, y: y};
	});
var $author$project$Editor$Msg$Insert = {$: 'Insert'};
var $author$project$Editor$Msg$None = {$: 'None'};
var $author$project$Editor$Msg$Normal = {$: 'Normal'};
var $author$project$Editor$Msg$NormalBuffer = F3(
	function (number, command, clipboard) {
		return {clipboard: clipboard, command: command, number: number};
	});
var $elm_community$list_extra$List$Extra$last = function (items) {
	last:
	while (true) {
		if (!items.b) {
			return $elm$core$Maybe$Nothing;
		} else {
			if (!items.b.b) {
				var x = items.a;
				return $elm$core$Maybe$Just(x);
			} else {
				var rest = items.b;
				var $temp$items = rest;
				items = $temp$items;
				continue last;
			}
		}
	}
};
var $author$project$Editor$Syntax$Elm$syntax = _List_fromArray(
	[
		{_class: 'syntax-comment', regex: '(--.*)'},
		{_class: 'syntax-import', regex: '^(import)\\b'},
		{_class: 'syntax-module-export', regex: '^(module)\\b'},
		{_class: 'syntax-function-def', regex: '(^\\w+[?:^=]*)'},
		{_class: 'syntax-module', regex: '\\b([A-Z]+[a-zA-Z]*)\\b'},
		{_class: 'syntax-string', regex: '(\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*\"?)'},
		{_class: 'syntax-function-type-sig', regex: '^(\\w+)\\s*:'},
		{_class: 'syntax-parens', regex: '(\\(|\\))'},
		{_class: 'syntax-equals', regex: '(=)'},
		{_class: 'syntax-comma', regex: '(,)'},
		{_class: 'syntax-dot-dot', regex: '(\\.\\.)'},
		{_class: 'syntax-case', regex: '\\b(case)\\b'},
		{_class: 'syntax-of', regex: '\\b(of)\\b'},
		{_class: 'syntax-if', regex: '\\b(if)\\b'},
		{_class: 'syntax-else', regex: '\\b(else)\\b'},
		{_class: 'syntax-then', regex: '\\b(then)\\b'},
		{_class: 'syntax-let', regex: '\\b(let)\\b'},
		{_class: 'syntax-in', regex: '\\b(in)\\b'},
		{_class: 'syntax-skinny-arrow', regex: '(->)'},
		{_class: 'syntax-left-compose', regex: '(\\<\\|)'},
		{_class: 'syntax-right-compose', regex: '(\\|\\>)'},
		{_class: 'syntax-forward-slash', regex: '(/)'},
		{_class: 'syntax-minus', regex: '(-)'},
		{_class: 'syntax-plus', regex: '(\\+)'},
		{_class: 'syntax-star', regex: '(\\*)'},
		{_class: 'syntax-double-colon', regex: '(::)'},
		{_class: 'syntax-open-brace', regex: '({)'},
		{_class: 'syntax-close-brace', regex: '(})'},
		{_class: 'syntax-open-bracket', regex: '(\\[)'},
		{_class: 'syntax-close-bracket', regex: '(\\])'},
		{_class: 'syntax-pipe', regex: '(\\|)'},
		{_class: 'syntax-percent', regex: '(%)'},
		{_class: 'syntax-backslash', regex: '(\\\\)'},
		{_class: 'syntax-number', regex: '\\b(\\d+)\\b'}
	]);
var $author$project$Editor$Syntax$Html$syntax = _List_fromArray(
	[
		{_class: 'syntax-comment', regex: '(//.*)'},
		{_class: 'syntax-import', regex: '(<\\/[^>]+>)'},
		{_class: 'syntax-import', regex: '(<[^ |>]+)'},
		{_class: 'syntax-import', regex: '(<|>|\\/>)'},
		{_class: 'syntax-string', regex: '(\"[^\"]*(?:[^\"]*)*\"?)'},
		{_class: 'syntax-string', regex: '(\'[^\']*(?:[^\']*)*\'?)'}
	]);
var $author$project$Editor$Syntax$Javascript$syntax = _List_fromArray(
	[
		{_class: 'syntax-comment', regex: '(//.*)'},
		{_class: 'syntax-import', regex: '\\b(try|catch|const|for|require|return|new|class|function|var|let|const|import|async|await)\\b'},
		{_class: 'syntax-import', regex: '(,|\\;)'},
		{_class: 'syntax-variable', regex: '(\\$\\w+)\\b'},
		{_class: 'syntax-function-def', regex: '([a-zA-Z_{1}][a-zA-Z0-9_]+)(?=\\()'},
		{_class: 'syntax-string', regex: '(\"[^\"]*(?:[^\"]*)*\"?)'},
		{_class: 'syntax-string', regex: '(\'[^\']*(?:[^\']*)*\'?)'},
		{_class: 'syntax-string', regex: '(`[^`]*(?:[^`]*)*`?)'},
		{_class: 'syntax-if', regex: '\\b(if)\\b'},
		{_class: 'syntax-else', regex: '\\b(else|elseif)\\b'},
		{_class: 'syntax-number', regex: '\\b(\\d+)\\b'},
		{_class: 'syntax-parens', regex: '(\\(|\\))'},
		{_class: 'syntax-open-brace', regex: '({)'},
		{_class: 'syntax-close-brace', regex: '(})'},
		{_class: 'syntax-open-bracket', regex: '(\\[)'},
		{_class: 'syntax-close-bracket', regex: '(\\])'},
		{_class: 'syntax-double-colon', regex: '(::)'}
	]);
var $author$project$Editor$Syntax$Json$syntax = _List_fromArray(
	[
		{_class: 'syntax-string', regex: '(\"[^\"]*(?:[^\"]*)*\"?)'},
		{_class: 'syntax-import', regex: '(,|\\;)'},
		{_class: 'syntax-number', regex: '\\b(\\d+)\\b'},
		{_class: 'syntax-parens', regex: '(\\(|\\))'},
		{_class: 'syntax-open-brace', regex: '({)'},
		{_class: 'syntax-close-brace', regex: '(})'},
		{_class: 'syntax-open-bracket', regex: '(\\[)'},
		{_class: 'syntax-close-bracket', regex: '(\\])'}
	]);
var $author$project$Editor$Syntax$Php$syntax = _List_fromArray(
	[
		{_class: 'syntax-comment', regex: '(//.*)'},
		{_class: 'syntax-import', regex: '\\b(fn|static|trait|try|catch|echo|foreach|for|public|protected|private|require|return|new|extends|include|use|class|function|namespace|declare)\\b'},
		{_class: 'syntax-import', regex: '(<\\?php)'},
		{_class: 'syntax-variable', regex: '(\\$\\w+)\\b'},
		{_class: 'syntax-function-def', regex: '([a-zA-Z_{1}][a-zA-Z0-9_]+)(?=\\()'},
		{_class: 'syntax-string', regex: '(\"[^\"]*(?:[^\"]*)*\"?)'},
		{_class: 'syntax-string', regex: '(\'[^\']*(?:[^\']*)*\'?)'},
		{_class: 'syntax-import', regex: '(,|\\;)'},
		{_class: 'syntax-if', regex: '\\b(if)\\b'},
		{_class: 'syntax-else', regex: '\\b(else|elseif)\\b'},
		{_class: 'syntax-number', regex: '\\b(\\d+)\\b'},
		{_class: 'syntax-parens', regex: '(\\(|\\))'},
		{_class: 'syntax-open-brace', regex: '({)'},
		{_class: 'syntax-close-brace', regex: '(})'},
		{_class: 'syntax-open-bracket', regex: '(\\[)'},
		{_class: 'syntax-close-bracket', regex: '(\\])'},
		{_class: 'syntax-double-colon', regex: '(::)'}
	]);
var $author$project$Editor$Syntax$Language$getSyntaxFromFileName = function (fileName) {
	var extension = $elm_community$list_extra$List$Extra$last(
		A2($elm$core$String$split, '.', fileName));
	_v0$6:
	while (true) {
		if (extension.$ === 'Just') {
			switch (extension.a) {
				case 'html':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Html$syntax);
				case 'js':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Javascript$syntax);
				case 'ts':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Javascript$syntax);
				case 'elm':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Elm$syntax);
				case 'php':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Php$syntax);
				case 'json':
					return $elm$core$Maybe$Just($author$project$Editor$Syntax$Json$syntax);
				default:
					break _v0$6;
			}
		} else {
			break _v0$6;
		}
	}
	return $elm$core$Maybe$Nothing;
};
var $elm$core$String$lines = _String_lines;
var $author$project$Editor$Lib$contentsToRenderableLines = function (contents) {
	return A2(
		$elm$core$List$indexedMap,
		$author$project$Editor$Lib$createRenderableLine,
		$elm$core$String$lines(contents));
};
var $author$project$Editor$Lib$makeNewTravelable = function (contents) {
	return {
		cursorPosition: {x: 0, y: 0},
		renderableLines: $author$project$Editor$Lib$contentsToRenderableLines(contents),
		scrollLeft: 0,
		scrollTop: 0
	};
};
var $author$project$Editor$Lib$init = F5(
	function (active, file, contents, config, ports) {
		var travelable = $author$project$Editor$Lib$makeNewTravelable(contents);
		return {
			active: active,
			completions: _List_Nil,
			config: config,
			doubleTripleClick: _Utils_Tuple2(
				1,
				A2($author$project$Editor$Msg$EditorCoordinate, 0, 0)),
			errors: _List_Nil,
			file: file,
			histories: $elm$core$Dict$fromList(
				_List_fromArray(
					[
						_Utils_Tuple2(
						file,
						_Utils_Tuple2(
							0,
							_List_fromArray(
								[travelable])))
					])),
			mode: function () {
				var _v0 = config.vimMode;
				if (_v0) {
					return $author$project$Editor$Msg$Normal;
				} else {
					return $author$project$Editor$Msg$Insert;
				}
			}(),
			normalBuffer: A3($author$project$Editor$Msg$NormalBuffer, 0, '', ''),
			ports: ports,
			selectedCompletionIndex: 0,
			selection: $elm$core$Maybe$Nothing,
			selectionState: $author$project$Editor$Msg$None,
			symbols: _List_Nil,
			syntax: $author$project$Editor$Syntax$Language$getSyntaxFromFileName(file),
			travelable: travelable
		};
	});
var $elm$core$Tuple$second = function (_v0) {
	var y = _v0.b;
	return y;
};
var $elm_community$list_extra$List$Extra$indexedFoldl = F3(
	function (func, acc, list) {
		var step = F2(
			function (x, _v0) {
				var i = _v0.a;
				var thisAcc = _v0.b;
				return _Utils_Tuple2(
					i + 1,
					A3(func, i, x, thisAcc));
			});
		return A3(
			$elm$core$List$foldl,
			step,
			_Utils_Tuple2(0, acc),
			list).b;
	});
var $author$project$Editor$Lib$renderableLinesToContents = function (renderableLines) {
	var length = $elm$core$List$length(renderableLines) - 1;
	return A3(
		$elm_community$list_extra$List$Extra$indexedFoldl,
		F3(
			function (index, renderableLine, acc) {
				var ending = function () {
					var _v0 = _Utils_eq(length, index);
					if (_v0) {
						return '';
					} else {
						return '\n';
					}
				}();
				return _Utils_ap(
					acc,
					_Utils_ap(renderableLine.text, ending));
			}),
		'',
		renderableLines);
};
var $elm$core$List$repeatHelp = F3(
	function (result, n, value) {
		repeatHelp:
		while (true) {
			if (n <= 0) {
				return result;
			} else {
				var $temp$result = A2($elm$core$List$cons, value, result),
					$temp$n = n - 1,
					$temp$value = value;
				result = $temp$result;
				n = $temp$n;
				value = $temp$value;
				continue repeatHelp;
			}
		}
	});
var $elm$core$List$repeat = F2(
	function (n, value) {
		return A3($elm$core$List$repeatHelp, _List_Nil, n, value);
	});
var $elm$core$Bitwise$and = _Bitwise_and;
var $elm$core$Bitwise$shiftRightBy = _Bitwise_shiftRightBy;
var $elm$core$String$repeatHelp = F3(
	function (n, chunk, result) {
		return (n <= 0) ? result : A3(
			$elm$core$String$repeatHelp,
			n >> 1,
			_Utils_ap(chunk, chunk),
			(!(n & 1)) ? result : _Utils_ap(result, chunk));
	});
var $elm$core$String$repeat = F2(
	function (n, chunk) {
		return A3($elm$core$String$repeatHelp, n, chunk, '');
	});
var $author$project$Terminal$makeEmptyBuffer = F2(
	function (size, terminalPorts) {
		var editor = A5(
			$author$project$Editor$Lib$init,
			false,
			'0',
			$author$project$Editor$Lib$renderableLinesToContents(
				A2(
					$elm$core$List$repeat,
					size.height,
					A2(
						$author$project$Editor$Lib$createRenderableLine,
						0,
						A2($elm$core$String$repeat, size.width, ' ')))),
			{padBottom: false, padRight: false, showCursor: true, showLineNumbers: false, vimMode: true},
			terminalPorts);
		return A2($author$project$Terminal$Types$Buffer, editor, $elm$core$Maybe$Nothing);
	});
var $author$project$Terminal$makeEmptyScrollbackEditor = function (terminalPorts) {
	var editor = A5(
		$author$project$Editor$Lib$init,
		false,
		'',
		'',
		{padBottom: false, padRight: false, showCursor: false, showLineNumbers: false, vimMode: false},
		terminalPorts);
	var editorTravelable = editor.travelable;
	return _Utils_update(
		editor,
		{
			travelable: _Utils_update(
				editorTravelable,
				{renderableLines: _List_Nil})
		});
};
var $author$project$Terminal$init = F3(
	function (cwd, editorPorts, terminalPorts) {
		return {
			ports: terminalPorts,
			terminal: {
				activeBuffer: $author$project$Terminal$Types$Primary,
				alternateBuffer: A2(
					$author$project$Terminal$makeEmptyBuffer,
					A2($author$project$Terminal$Types$TerminalSize, 4, 80),
					editorPorts),
				primaryBuffer: A2(
					$author$project$Terminal$makeEmptyBuffer,
					A2($author$project$Terminal$Types$TerminalSize, 4, 80),
					editorPorts),
				scrollback: $author$project$Terminal$makeEmptyScrollbackEditor(editorPorts),
				size: {height: 4, width: 80},
				styles: $elm$core$Dict$fromList(_List_Nil)
			}
		};
	});
var $author$project$Ports$requestSetupTerminalResizeObserver = _Platform_outgoingPort(
	'requestSetupTerminalResizeObserver',
	function ($) {
		return $elm$json$Json$Encode$null;
	});
var $elm$json$Json$Encode$object = function (pairs) {
	return _Json_wrap(
		A3(
			$elm$core$List$foldl,
			F2(
				function (_v0, obj) {
					var k = _v0.a;
					var v = _v0.b;
					return A3(_Json_addField, k, v, obj);
				}),
			_Json_emptyObject(_Utils_Tuple0),
			pairs));
};
var $author$project$Ports$requestPasteTerminal = _Platform_outgoingPort(
	'requestPasteTerminal',
	function ($) {
		return $elm$json$Json$Encode$null;
	});
var $author$project$Ports$requestRunTerminal = _Platform_outgoingPort('requestRunTerminal', $elm$core$Basics$identity);
var $author$project$PortHandlers$terminalPorts = function (cwd) {
	return {
		requestCopyTerminal: function (_v0) {
			return $elm$core$Platform$Cmd$none;
		},
		requestPasteTerminal: $author$project$Ports$requestPasteTerminal,
		requestQuit: function (_v1) {
			return $elm$core$Platform$Cmd$none;
		},
		requestRunTerminal: function (code) {
			return $author$project$Ports$requestRunTerminal(
				$elm$json$Json$Encode$object(
					_List_fromArray(
						[
							_Utils_Tuple2(
							'cwd',
							$elm$json$Json$Encode$string(cwd)),
							_Utils_Tuple2(
							'contents',
							$elm$json$Json$Encode$string(code))
						])));
		}
	};
};
var $author$project$Main$init = function (_v0) {
	return _Utils_Tuple2(
		{
			terminal: A3(
				$author$project$Terminal$init,
				'',
				$author$project$PortHandlers$editorPorts(''),
				$author$project$PortHandlers$terminalPorts(''))
		},
		$author$project$Ports$requestSetupTerminalResizeObserver(_Utils_Tuple0));
};
var $author$project$Msg$RawKeyboardMsg = function (a) {
	return {$: 'RawKeyboardMsg', a: a};
};
var $elm$core$Platform$Sub$batch = _Platform_batch;
var $elm$core$Platform$Sub$map = _Platform_map;
var $author$project$Editor$RawKeyboard$Down = function (a) {
	return {$: 'Down', a: a};
};
var $author$project$Editor$RawKeyboard$Up = function (a) {
	return {$: 'Up', a: a};
};
var $author$project$Editor$RawKeyboard$RawKey = F6(
	function (key, code, shiftKey, altKey, ctrlKey, metaKey) {
		return {altKey: altKey, code: code, ctrlKey: ctrlKey, key: key, metaKey: metaKey, shiftKey: shiftKey};
	});
var $elm$json$Json$Decode$bool = _Json_decodeBool;
var $elm$json$Json$Decode$field = _Json_decodeField;
var $elm$json$Json$Decode$map6 = _Json_map6;
var $elm$json$Json$Decode$string = _Json_decodeString;
var $author$project$Editor$RawKeyboard$decoder = A7(
	$elm$json$Json$Decode$map6,
	$author$project$Editor$RawKeyboard$RawKey,
	A2($elm$json$Json$Decode$field, 'key', $elm$json$Json$Decode$string),
	A2($elm$json$Json$Decode$field, 'code', $elm$json$Json$Decode$string),
	A2($elm$json$Json$Decode$field, 'shiftKey', $elm$json$Json$Decode$bool),
	A2($elm$json$Json$Decode$field, 'altKey', $elm$json$Json$Decode$bool),
	A2($elm$json$Json$Decode$field, 'ctrlKey', $elm$json$Json$Decode$bool),
	A2($elm$json$Json$Decode$field, 'metaKey', $elm$json$Json$Decode$bool));
var $elm$browser$Browser$Events$Document = {$: 'Document'};
var $elm$browser$Browser$Events$MySub = F3(
	function (a, b, c) {
		return {$: 'MySub', a: a, b: b, c: c};
	});
var $elm$browser$Browser$Events$State = F2(
	function (subs, pids) {
		return {pids: pids, subs: subs};
	});
var $elm$browser$Browser$Events$init = $elm$core$Task$succeed(
	A2($elm$browser$Browser$Events$State, _List_Nil, $elm$core$Dict$empty));
var $elm$browser$Browser$Events$nodeToKey = function (node) {
	if (node.$ === 'Document') {
		return 'd_';
	} else {
		return 'w_';
	}
};
var $elm$browser$Browser$Events$addKey = function (sub) {
	var node = sub.a;
	var name = sub.b;
	return _Utils_Tuple2(
		_Utils_ap(
			$elm$browser$Browser$Events$nodeToKey(node),
			name),
		sub);
};
var $elm$core$Process$kill = _Scheduler_kill;
var $elm$core$Dict$foldl = F3(
	function (func, acc, dict) {
		foldl:
		while (true) {
			if (dict.$ === 'RBEmpty_elm_builtin') {
				return acc;
			} else {
				var key = dict.b;
				var value = dict.c;
				var left = dict.d;
				var right = dict.e;
				var $temp$func = func,
					$temp$acc = A3(
					func,
					key,
					value,
					A3($elm$core$Dict$foldl, func, acc, left)),
					$temp$dict = right;
				func = $temp$func;
				acc = $temp$acc;
				dict = $temp$dict;
				continue foldl;
			}
		}
	});
var $elm$core$Dict$merge = F6(
	function (leftStep, bothStep, rightStep, leftDict, rightDict, initialResult) {
		var stepState = F3(
			function (rKey, rValue, _v0) {
				stepState:
				while (true) {
					var list = _v0.a;
					var result = _v0.b;
					if (!list.b) {
						return _Utils_Tuple2(
							list,
							A3(rightStep, rKey, rValue, result));
					} else {
						var _v2 = list.a;
						var lKey = _v2.a;
						var lValue = _v2.b;
						var rest = list.b;
						if (_Utils_cmp(lKey, rKey) < 0) {
							var $temp$rKey = rKey,
								$temp$rValue = rValue,
								$temp$_v0 = _Utils_Tuple2(
								rest,
								A3(leftStep, lKey, lValue, result));
							rKey = $temp$rKey;
							rValue = $temp$rValue;
							_v0 = $temp$_v0;
							continue stepState;
						} else {
							if (_Utils_cmp(lKey, rKey) > 0) {
								return _Utils_Tuple2(
									list,
									A3(rightStep, rKey, rValue, result));
							} else {
								return _Utils_Tuple2(
									rest,
									A4(bothStep, lKey, lValue, rValue, result));
							}
						}
					}
				}
			});
		var _v3 = A3(
			$elm$core$Dict$foldl,
			stepState,
			_Utils_Tuple2(
				$elm$core$Dict$toList(leftDict),
				initialResult),
			rightDict);
		var leftovers = _v3.a;
		var intermediateResult = _v3.b;
		return A3(
			$elm$core$List$foldl,
			F2(
				function (_v4, result) {
					var k = _v4.a;
					var v = _v4.b;
					return A3(leftStep, k, v, result);
				}),
			intermediateResult,
			leftovers);
	});
var $elm$browser$Browser$Events$Event = F2(
	function (key, event) {
		return {event: event, key: key};
	});
var $elm$core$Platform$sendToSelf = _Platform_sendToSelf;
var $elm$browser$Browser$Events$spawn = F3(
	function (router, key, _v0) {
		var node = _v0.a;
		var name = _v0.b;
		var actualNode = function () {
			if (node.$ === 'Document') {
				return _Browser_doc;
			} else {
				return _Browser_window;
			}
		}();
		return A2(
			$elm$core$Task$map,
			function (value) {
				return _Utils_Tuple2(key, value);
			},
			A3(
				_Browser_on,
				actualNode,
				name,
				function (event) {
					return A2(
						$elm$core$Platform$sendToSelf,
						router,
						A2($elm$browser$Browser$Events$Event, key, event));
				}));
	});
var $elm$core$Dict$union = F2(
	function (t1, t2) {
		return A3($elm$core$Dict$foldl, $elm$core$Dict$insert, t2, t1);
	});
var $elm$browser$Browser$Events$onEffects = F3(
	function (router, subs, state) {
		var stepRight = F3(
			function (key, sub, _v6) {
				var deads = _v6.a;
				var lives = _v6.b;
				var news = _v6.c;
				return _Utils_Tuple3(
					deads,
					lives,
					A2(
						$elm$core$List$cons,
						A3($elm$browser$Browser$Events$spawn, router, key, sub),
						news));
			});
		var stepLeft = F3(
			function (_v4, pid, _v5) {
				var deads = _v5.a;
				var lives = _v5.b;
				var news = _v5.c;
				return _Utils_Tuple3(
					A2($elm$core$List$cons, pid, deads),
					lives,
					news);
			});
		var stepBoth = F4(
			function (key, pid, _v2, _v3) {
				var deads = _v3.a;
				var lives = _v3.b;
				var news = _v3.c;
				return _Utils_Tuple3(
					deads,
					A3($elm$core$Dict$insert, key, pid, lives),
					news);
			});
		var newSubs = A2($elm$core$List$map, $elm$browser$Browser$Events$addKey, subs);
		var _v0 = A6(
			$elm$core$Dict$merge,
			stepLeft,
			stepBoth,
			stepRight,
			state.pids,
			$elm$core$Dict$fromList(newSubs),
			_Utils_Tuple3(_List_Nil, $elm$core$Dict$empty, _List_Nil));
		var deadPids = _v0.a;
		var livePids = _v0.b;
		var makeNewPids = _v0.c;
		return A2(
			$elm$core$Task$andThen,
			function (pids) {
				return $elm$core$Task$succeed(
					A2(
						$elm$browser$Browser$Events$State,
						newSubs,
						A2(
							$elm$core$Dict$union,
							livePids,
							$elm$core$Dict$fromList(pids))));
			},
			A2(
				$elm$core$Task$andThen,
				function (_v1) {
					return $elm$core$Task$sequence(makeNewPids);
				},
				$elm$core$Task$sequence(
					A2($elm$core$List$map, $elm$core$Process$kill, deadPids))));
	});
var $elm$core$List$maybeCons = F3(
	function (f, mx, xs) {
		var _v0 = f(mx);
		if (_v0.$ === 'Just') {
			var x = _v0.a;
			return A2($elm$core$List$cons, x, xs);
		} else {
			return xs;
		}
	});
var $elm$core$List$filterMap = F2(
	function (f, xs) {
		return A3(
			$elm$core$List$foldr,
			$elm$core$List$maybeCons(f),
			_List_Nil,
			xs);
	});
var $elm$browser$Browser$Events$onSelfMsg = F3(
	function (router, _v0, state) {
		var key = _v0.key;
		var event = _v0.event;
		var toMessage = function (_v2) {
			var subKey = _v2.a;
			var _v3 = _v2.b;
			var node = _v3.a;
			var name = _v3.b;
			var decoder = _v3.c;
			return _Utils_eq(subKey, key) ? A2(_Browser_decodeEvent, decoder, event) : $elm$core$Maybe$Nothing;
		};
		var messages = A2($elm$core$List$filterMap, toMessage, state.subs);
		return A2(
			$elm$core$Task$andThen,
			function (_v1) {
				return $elm$core$Task$succeed(state);
			},
			$elm$core$Task$sequence(
				A2(
					$elm$core$List$map,
					$elm$core$Platform$sendToApp(router),
					messages)));
	});
var $elm$browser$Browser$Events$subMap = F2(
	function (func, _v0) {
		var node = _v0.a;
		var name = _v0.b;
		var decoder = _v0.c;
		return A3(
			$elm$browser$Browser$Events$MySub,
			node,
			name,
			A2($elm$json$Json$Decode$map, func, decoder));
	});
_Platform_effectManagers['Browser.Events'] = _Platform_createManager($elm$browser$Browser$Events$init, $elm$browser$Browser$Events$onEffects, $elm$browser$Browser$Events$onSelfMsg, 0, $elm$browser$Browser$Events$subMap);
var $elm$browser$Browser$Events$subscription = _Platform_leaf('Browser.Events');
var $elm$browser$Browser$Events$on = F3(
	function (node, name, decoder) {
		return $elm$browser$Browser$Events$subscription(
			A3($elm$browser$Browser$Events$MySub, node, name, decoder));
	});
var $elm$browser$Browser$Events$onKeyDown = A2($elm$browser$Browser$Events$on, $elm$browser$Browser$Events$Document, 'keydown');
var $author$project$Editor$RawKeyboard$downs = function (toMsg) {
	return $elm$browser$Browser$Events$onKeyDown(
		A2($elm$json$Json$Decode$map, toMsg, $author$project$Editor$RawKeyboard$decoder));
};
var $elm$core$Platform$Sub$none = $elm$core$Platform$Sub$batch(_List_Nil);
var $elm$browser$Browser$Events$onKeyUp = A2($elm$browser$Browser$Events$on, $elm$browser$Browser$Events$Document, 'keyup');
var $author$project$Editor$RawKeyboard$ups = function (toMsg) {
	return $elm$browser$Browser$Events$onKeyUp(
		A2($elm$json$Json$Decode$map, toMsg, $author$project$Editor$RawKeyboard$decoder));
};
var $author$project$Editor$RawKeyboard$subscriptions = F2(
	function (down, up) {
		return $elm$core$Platform$Sub$batch(
			_List_fromArray(
				[
					down ? $author$project$Editor$RawKeyboard$downs($author$project$Editor$RawKeyboard$Down) : $elm$core$Platform$Sub$none,
					up ? $author$project$Editor$RawKeyboard$ups($author$project$Editor$RawKeyboard$Up) : $elm$core$Platform$Sub$none
				]));
	});
var $author$project$Terminal$Types$ReceivedTerminalOutput = function (a) {
	return {$: 'ReceivedTerminalOutput', a: a};
};
var $author$project$Terminal$Types$ReceivedTerminalResized = function (a) {
	return {$: 'ReceivedTerminalResized', a: a};
};
var $author$project$Msg$TerminalMsg = function (a) {
	return {$: 'TerminalMsg', a: a};
};
var $elm$json$Json$Decode$value = _Json_decodeValue;
var $author$project$Ports$receiveTerminalOutput = _Platform_incomingPort('receiveTerminalOutput', $elm$json$Json$Decode$value);
var $author$project$Ports$receiveTerminalResized = _Platform_incomingPort('receiveTerminalResized', $elm$json$Json$Decode$value);
var $author$project$Main$terminalSubscriptions = $elm$core$Platform$Sub$batch(
	_List_fromArray(
		[
			A2(
			$elm$core$Platform$Sub$map,
			$author$project$Msg$TerminalMsg,
			$author$project$Ports$receiveTerminalOutput($author$project$Terminal$Types$ReceivedTerminalOutput)),
			A2(
			$elm$core$Platform$Sub$map,
			$author$project$Msg$TerminalMsg,
			$author$project$Ports$receiveTerminalResized($author$project$Terminal$Types$ReceivedTerminalResized))
		]));
var $author$project$Main$subscriptions = function (model) {
	return $elm$core$Platform$Sub$batch(
		_List_fromArray(
			[
				$author$project$Main$terminalSubscriptions,
				A2(
				$elm$core$Platform$Sub$map,
				$author$project$Msg$RawKeyboardMsg,
				A2($author$project$Editor$RawKeyboard$subscriptions, true, true))
			]));
};
var $author$project$Terminal$Input$backspace = '\u0008';
var $author$project$Terminal$Input$characterTabulation = '\t';
var $author$project$Terminal$Input$delete = '\u007F';
var $author$project$Terminal$Input$deviceControlTwo = '\u0012';
var $author$project$Terminal$Input$endOfText = '\u0003';
var $author$project$Terminal$Input$enquiry = '\u0005';
var $author$project$Terminal$Input$escape = '\u001B';
var $author$project$Terminal$Input$fileSeparator = '\u001C';
var $author$project$Terminal$Input$groupSeparator = '\u001D';
var $author$project$Terminal$Input$lineFeed = '\n';
var $elm$core$Basics$not = _Basics_not;
var $author$project$Terminal$Input$space = ' ';
var $author$project$Terminal$Input$startOfHeading = '\u0001';
var $author$project$Terminal$Input$unitSeparator = '\u001F';
var $author$project$Terminal$Input$evaluateKeyboardEvent = function (ev) {
	var _v0 = ev.code;
	switch (_v0) {
		case 'Backspace':
			return ev.shiftKey ? $elm$core$Maybe$Just($author$project$Terminal$Input$backspace) : (ev.altKey ? $elm$core$Maybe$Just(
				_Utils_ap($author$project$Terminal$Input$escape, $author$project$Terminal$Input$delete)) : $elm$core$Maybe$Just($author$project$Terminal$Input$delete));
		case 'Tab':
			return ev.shiftKey ? $elm$core$Maybe$Just($author$project$Terminal$Input$escape + '[Z') : $elm$core$Maybe$Just($author$project$Terminal$Input$characterTabulation);
		case 'Enter':
			return ev.altKey ? $elm$core$Maybe$Just(
				_Utils_ap($author$project$Terminal$Input$escape, $author$project$Terminal$Input$lineFeed)) : $elm$core$Maybe$Just($author$project$Terminal$Input$lineFeed);
		case 'Escape':
			return ev.altKey ? $elm$core$Maybe$Just(
				_Utils_ap($author$project$Terminal$Input$escape, $author$project$Terminal$Input$escape)) : $elm$core$Maybe$Just($author$project$Terminal$Input$escape);
		case 'Space':
			return $elm$core$Maybe$Just($author$project$Terminal$Input$space);
		case 'ArrowLeft':
			return (!(ev.shiftKey || (ev.altKey || (ev.ctrlKey || ev.metaKey)))) ? $elm$core$Maybe$Just($author$project$Terminal$Input$escape + '[D') : $elm$core$Maybe$Nothing;
		case 'ArrowRight':
			return (!(ev.shiftKey || (ev.altKey || (ev.ctrlKey || ev.metaKey)))) ? $elm$core$Maybe$Just($author$project$Terminal$Input$escape + '[C') : $elm$core$Maybe$Nothing;
		case 'ArrowUp':
			return (!(ev.shiftKey || (ev.altKey || (ev.ctrlKey || ev.metaKey)))) ? $elm$core$Maybe$Just($author$project$Terminal$Input$escape + '[A') : $elm$core$Maybe$Nothing;
		case 'ArrowDown':
			return (!(ev.shiftKey || (ev.altKey || (ev.ctrlKey || ev.metaKey)))) ? $elm$core$Maybe$Just($author$project$Terminal$Input$escape + '[B') : $elm$core$Maybe$Nothing;
		default:
			if (ev.ctrlKey && (!(ev.shiftKey || (ev.altKey || ev.metaKey)))) {
				var _v1 = ev.code;
				switch (_v1) {
					case 'KeyC':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$endOfText);
					case 'KeyR':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$deviceControlTwo);
					case 'KeyA':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$startOfHeading);
					case 'KeyE':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$enquiry);
					case 'Digit8':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$delete);
					case 'BracketLeft':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$escape);
					case 'Backslash':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$fileSeparator);
					case 'BracketRight':
						return $elm$core$Maybe$Just($author$project$Terminal$Input$groupSeparator);
					default:
						return $elm$core$Maybe$Nothing;
				}
			} else {
				if ((ev.key === '_') && ev.ctrlKey) {
					return $elm$core$Maybe$Just($author$project$Terminal$Input$unitSeparator);
				} else {
					if ($elm$core$String$length(ev.key) === 1) {
						return $elm$core$Maybe$Just(ev.key);
					} else {
						return $elm$core$Maybe$Nothing;
					}
				}
			}
	}
};
var $elm$core$List$drop = F2(
	function (n, list) {
		drop:
		while (true) {
			if (n <= 0) {
				return list;
			} else {
				if (!list.b) {
					return list;
				} else {
					var x = list.a;
					var xs = list.b;
					var $temp$n = n - 1,
						$temp$list = xs;
					n = $temp$n;
					list = $temp$list;
					continue drop;
				}
			}
		}
	});
var $elm$core$List$head = function (list) {
	if (list.b) {
		var x = list.a;
		var xs = list.b;
		return $elm$core$Maybe$Just(x);
	} else {
		return $elm$core$Maybe$Nothing;
	}
};
var $elm_community$list_extra$List$Extra$getAt = F2(
	function (idx, xs) {
		return (idx < 0) ? $elm$core$Maybe$Nothing : $elm$core$List$head(
			A2($elm$core$List$drop, idx, xs));
	});
var $author$project$Terminal$getBuffer = function (terminal) {
	var _v0 = terminal.activeBuffer;
	if (_v0.$ === 'Primary') {
		var buffer = terminal.primaryBuffer;
		return _Utils_Tuple2(buffer.editor, buffer.scrollRegion);
	} else {
		var buffer = terminal.alternateBuffer;
		return _Utils_Tuple2(buffer.editor, buffer.scrollRegion);
	}
};
var $author$project$Terminal$Keybindings$isAlternateBuffer = function (activeBuffer) {
	if (activeBuffer.$ === 'Alternate') {
		return true;
	} else {
		return false;
	}
};
var $author$project$Terminal$Keybindings$isPrimaryBuffer = function (activeBuffer) {
	return !$author$project$Terminal$Keybindings$isAlternateBuffer(activeBuffer);
};
var $author$project$Terminal$updateTerminalEditor = F2(
	function (updatedEditor, terminal) {
		var _v0 = terminal.activeBuffer;
		if (_v0.$ === 'Primary') {
			var buf = terminal.primaryBuffer;
			return _Utils_update(
				terminal,
				{
					primaryBuffer: _Utils_update(
						buf,
						{editor: updatedEditor})
				});
		} else {
			var buf = terminal.alternateBuffer;
			return _Utils_update(
				terminal,
				{
					alternateBuffer: _Utils_update(
						buf,
						{editor: updatedEditor})
				});
		}
	});
var $author$project$Terminal$Keybindings$handleKeybindings = F2(
	function (key, model) {
		var msgs = function () {
			if (key.metaKey && (key.code === 'KeyK')) {
				return $elm$core$Platform$Cmd$none;
			} else {
				if (key.metaKey && (key.code === 'KeyQ')) {
					return model.ports.requestQuit(_Utils_Tuple0);
				} else {
					if (key.metaKey && (key.code === 'KeyC')) {
						return model.ports.requestCopyTerminal(_Utils_Tuple0);
					} else {
						if (key.metaKey && (key.code === 'KeyV')) {
							return model.ports.requestPasteTerminal(_Utils_Tuple0);
						} else {
							var _v3 = $author$project$Terminal$Input$evaluateKeyboardEvent(key);
							if (_v3.$ === 'Nothing') {
								return $elm$core$Platform$Cmd$none;
							} else {
								var input = _v3.a;
								return model.ports.requestRunTerminal(input);
							}
						}
					}
				}
			}
		}();
		var _v0 = $author$project$Terminal$getBuffer(model.terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var nextModel = (key.metaKey && ((key.code === 'KeyK') && $author$project$Terminal$Keybindings$isPrimaryBuffer(model.terminal.activeBuffer))) ? _Utils_update(
			model,
			{
				terminal: function () {
					var travelable = editor.travelable;
					var term = model.terminal;
					var _v1 = editor.travelable.cursorPosition;
					var x = _v1.x;
					var y = _v1.y;
					var nextRenderableLines = function () {
						var _v2 = A2($elm_community$list_extra$List$Extra$getAt, y, travelable.renderableLines);
						if (_v2.$ === 'Just') {
							var currentLine = _v2.a;
							return A2(
								$elm$core$List$cons,
								currentLine,
								A2(
									$elm$core$List$repeat,
									$elm$core$List$length(travelable.renderableLines) - 1,
									A2($author$project$Editor$Lib$createRenderableLine, 0, '')));
						} else {
							return travelable.renderableLines;
						}
					}();
					return A2(
						$author$project$Terminal$updateTerminalEditor,
						_Utils_update(
							editor,
							{
								travelable: _Utils_update(
									travelable,
									{
										cursorPosition: {x: x, y: 0},
										renderableLines: nextRenderableLines
									})
							}),
						_Utils_update(
							term,
							{
								scrollback: function () {
									var scrollback = model.terminal.scrollback;
									var scrollbackTravelable = scrollback.travelable;
									return _Utils_update(
										scrollback,
										{
											travelable: _Utils_update(
												scrollbackTravelable,
												{renderableLines: _List_Nil})
										});
								}()
							}));
				}()
			}) : model;
		return _Utils_Tuple2(nextModel, msgs);
	});
var $elm$core$Platform$Cmd$map = _Platform_map;
var $author$project$Keybindings$handleKeybindings = F2(
	function (model, msg) {
		if (msg.$ === 'Down') {
			var key = msg.a;
			var _v1 = A2($author$project$Terminal$Keybindings$handleKeybindings, key, model.terminal);
			var nextTerminal = _v1.a;
			var msgs = _v1.b;
			return _Utils_Tuple2(
				_Utils_update(
					model,
					{terminal: nextTerminal}),
				A2($elm$core$Platform$Cmd$map, $author$project$Msg$TerminalMsg, msgs));
		} else {
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		}
	});
var $author$project$Terminal$Types$TerminalEditorMsg = function (a) {
	return {$: 'TerminalEditorMsg', a: a};
};
var $author$project$Terminal$Types$TerminalCommandSequence = function (a) {
	return {$: 'TerminalCommandSequence', a: a};
};
var $author$project$Terminal$Types$TerminalCommandSequenceAndDoubleArgument = F3(
	function (a, b, c) {
		return {$: 'TerminalCommandSequenceAndDoubleArgument', a: a, b: b, c: c};
	});
var $author$project$Terminal$Types$TerminalCommandSequenceAndSingleArgument = F2(
	function (a, b) {
		return {$: 'TerminalCommandSequenceAndSingleArgument', a: a, b: b};
	});
var $author$project$Terminal$Types$TerminalCommandSequenceAndSingleStringArgument = F2(
	function (a, b) {
		return {$: 'TerminalCommandSequenceAndSingleStringArgument', a: a, b: b};
	});
var $author$project$Terminal$Types$TerminalCommandSequenceAndTripleArgument = F4(
	function (a, b, c, d) {
		return {$: 'TerminalCommandSequenceAndTripleArgument', a: a, b: b, c: c, d: d};
	});
var $author$project$Terminal$Types$TerminalCommandText = function (a) {
	return {$: 'TerminalCommandText', a: a};
};
var $elm$json$Json$Decode$int = _Json_decodeInt;
var $elm$json$Json$Decode$map3 = _Json_map3;
var $elm$json$Json$Decode$map4 = _Json_map4;
var $elm$json$Json$Decode$oneOf = _Json_oneOf;
var $author$project$Terminal$Decoders$decodeTerminalCommand = $elm$json$Json$Decode$oneOf(
	_List_fromArray(
		[
			A5(
			$elm$json$Json$Decode$map4,
			$author$project$Terminal$Types$TerminalCommandSequenceAndTripleArgument,
			A2($elm$json$Json$Decode$field, 'command', $elm$json$Json$Decode$string),
			A2($elm$json$Json$Decode$field, 'argument1', $elm$json$Json$Decode$int),
			A2($elm$json$Json$Decode$field, 'argument2', $elm$json$Json$Decode$int),
			A2($elm$json$Json$Decode$field, 'argument3', $elm$json$Json$Decode$int)),
			A4(
			$elm$json$Json$Decode$map3,
			$author$project$Terminal$Types$TerminalCommandSequenceAndDoubleArgument,
			A2($elm$json$Json$Decode$field, 'command', $elm$json$Json$Decode$string),
			A2($elm$json$Json$Decode$field, 'argument1', $elm$json$Json$Decode$int),
			A2($elm$json$Json$Decode$field, 'argument2', $elm$json$Json$Decode$int)),
			A3(
			$elm$json$Json$Decode$map2,
			$author$project$Terminal$Types$TerminalCommandSequenceAndSingleArgument,
			A2($elm$json$Json$Decode$field, 'command', $elm$json$Json$Decode$string),
			A2($elm$json$Json$Decode$field, 'argument', $elm$json$Json$Decode$int)),
			A3(
			$elm$json$Json$Decode$map2,
			$author$project$Terminal$Types$TerminalCommandSequenceAndSingleStringArgument,
			A2($elm$json$Json$Decode$field, 'command', $elm$json$Json$Decode$string),
			A2($elm$json$Json$Decode$field, 'argument', $elm$json$Json$Decode$string)),
			A2(
			$elm$json$Json$Decode$map,
			$author$project$Terminal$Types$TerminalCommandSequence,
			A2($elm$json$Json$Decode$field, 'command', $elm$json$Json$Decode$string)),
			A2($elm$json$Json$Decode$map, $author$project$Terminal$Types$TerminalCommandText, $elm$json$Json$Decode$string)
		]));
var $elm$json$Json$Decode$list = _Json_decodeList;
var $author$project$Terminal$Decoders$decodeTerminalCommands = $elm$json$Json$Decode$list($author$project$Terminal$Decoders$decodeTerminalCommand);
var $author$project$Terminal$Decoders$decodeTerminalResized = A3(
	$elm$json$Json$Decode$map2,
	$author$project$Terminal$Types$TerminalSize,
	A2($elm$json$Json$Decode$field, 'height', $elm$json$Json$Decode$int),
	A2($elm$json$Json$Decode$field, 'width', $elm$json$Json$Decode$int));
var $elm$json$Json$Decode$decodeValue = _Json_run;
var $elm$core$Array$fromListHelp = F3(
	function (list, nodeList, nodeListSize) {
		fromListHelp:
		while (true) {
			var _v0 = A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, list);
			var jsArray = _v0.a;
			var remainingItems = _v0.b;
			if (_Utils_cmp(
				$elm$core$Elm$JsArray$length(jsArray),
				$elm$core$Array$branchFactor) < 0) {
				return A2(
					$elm$core$Array$builderToArray,
					true,
					{nodeList: nodeList, nodeListSize: nodeListSize, tail: jsArray});
			} else {
				var $temp$list = remainingItems,
					$temp$nodeList = A2(
					$elm$core$List$cons,
					$elm$core$Array$Leaf(jsArray),
					nodeList),
					$temp$nodeListSize = nodeListSize + 1;
				list = $temp$list;
				nodeList = $temp$nodeList;
				nodeListSize = $temp$nodeListSize;
				continue fromListHelp;
			}
		}
	});
var $elm$core$Array$fromList = function (list) {
	if (!list.b) {
		return $elm$core$Array$empty;
	} else {
		return A3($elm$core$Array$fromListHelp, list, _List_Nil, 0);
	}
};
var $elm$core$Basics$min = F2(
	function (x, y) {
		return (_Utils_cmp(x, y) < 0) ? x : y;
	});
var $author$project$Terminal$Types$Alternate = {$: 'Alternate'};
var $elm$core$List$append = F2(
	function (xs, ys) {
		if (!ys.b) {
			return xs;
		} else {
			return A3($elm$core$List$foldr, $elm$core$List$cons, ys, xs);
		}
	});
var $elm$core$List$concat = function (lists) {
	return A3($elm$core$List$foldr, $elm$core$List$append, _List_Nil, lists);
};
var $elm$core$String$cons = _String_cons;
var $elm$core$String$fromChar = function (_char) {
	return A2($elm$core$String$cons, _char, '');
};
var $elm$core$String$padRight = F3(
	function (n, _char, string) {
		return _Utils_ap(
			string,
			A2(
				$elm$core$String$repeat,
				n - $elm$core$String$length(string),
				$elm$core$String$fromChar(_char)));
	});
var $author$project$Terminal$deleteCharacters = F3(
	function (x, n, text) {
		var start = A3($elm$core$String$slice, 0, x, text);
		var end = A3(
			$elm$core$String$slice,
			x + n,
			$elm$core$String$length(text),
			text);
		return A3(
			$elm$core$String$padRight,
			n,
			_Utils_chr(' '),
			_Utils_ap(start, end));
	});
var $elm$core$Elm$JsArray$appendN = _JsArray_appendN;
var $elm$core$Elm$JsArray$slice = _JsArray_slice;
var $elm$core$Array$appendHelpBuilder = F2(
	function (tail, builder) {
		var tailLen = $elm$core$Elm$JsArray$length(tail);
		var notAppended = ($elm$core$Array$branchFactor - $elm$core$Elm$JsArray$length(builder.tail)) - tailLen;
		var appended = A3($elm$core$Elm$JsArray$appendN, $elm$core$Array$branchFactor, builder.tail, tail);
		return (notAppended < 0) ? {
			nodeList: A2(
				$elm$core$List$cons,
				$elm$core$Array$Leaf(appended),
				builder.nodeList),
			nodeListSize: builder.nodeListSize + 1,
			tail: A3($elm$core$Elm$JsArray$slice, notAppended, tailLen, tail)
		} : ((!notAppended) ? {
			nodeList: A2(
				$elm$core$List$cons,
				$elm$core$Array$Leaf(appended),
				builder.nodeList),
			nodeListSize: builder.nodeListSize + 1,
			tail: $elm$core$Elm$JsArray$empty
		} : {nodeList: builder.nodeList, nodeListSize: builder.nodeListSize, tail: appended});
	});
var $elm$core$Basics$ge = _Utils_ge;
var $elm$core$Bitwise$shiftLeftBy = _Bitwise_shiftLeftBy;
var $elm$core$Bitwise$shiftRightZfBy = _Bitwise_shiftRightZfBy;
var $elm$core$Array$tailIndex = function (len) {
	return (len >>> 5) << 5;
};
var $elm$core$Array$sliceLeft = F2(
	function (from, array) {
		var len = array.a;
		var tree = array.c;
		var tail = array.d;
		if (!from) {
			return array;
		} else {
			if (_Utils_cmp(
				from,
				$elm$core$Array$tailIndex(len)) > -1) {
				return A4(
					$elm$core$Array$Array_elm_builtin,
					len - from,
					$elm$core$Array$shiftStep,
					$elm$core$Elm$JsArray$empty,
					A3(
						$elm$core$Elm$JsArray$slice,
						from - $elm$core$Array$tailIndex(len),
						$elm$core$Elm$JsArray$length(tail),
						tail));
			} else {
				var skipNodes = (from / $elm$core$Array$branchFactor) | 0;
				var helper = F2(
					function (node, acc) {
						if (node.$ === 'SubTree') {
							var subTree = node.a;
							return A3($elm$core$Elm$JsArray$foldr, helper, acc, subTree);
						} else {
							var leaf = node.a;
							return A2($elm$core$List$cons, leaf, acc);
						}
					});
				var leafNodes = A3(
					$elm$core$Elm$JsArray$foldr,
					helper,
					_List_fromArray(
						[tail]),
					tree);
				var nodesToInsert = A2($elm$core$List$drop, skipNodes, leafNodes);
				if (!nodesToInsert.b) {
					return $elm$core$Array$empty;
				} else {
					var head = nodesToInsert.a;
					var rest = nodesToInsert.b;
					var firstSlice = from - (skipNodes * $elm$core$Array$branchFactor);
					var initialBuilder = {
						nodeList: _List_Nil,
						nodeListSize: 0,
						tail: A3(
							$elm$core$Elm$JsArray$slice,
							firstSlice,
							$elm$core$Elm$JsArray$length(head),
							head)
					};
					return A2(
						$elm$core$Array$builderToArray,
						true,
						A3($elm$core$List$foldl, $elm$core$Array$appendHelpBuilder, initialBuilder, rest));
				}
			}
		}
	});
var $elm$core$Array$bitMask = 4294967295 >>> (32 - $elm$core$Array$shiftStep);
var $elm$core$Elm$JsArray$unsafeGet = _JsArray_unsafeGet;
var $elm$core$Array$fetchNewTail = F4(
	function (shift, end, treeEnd, tree) {
		fetchNewTail:
		while (true) {
			var pos = $elm$core$Array$bitMask & (treeEnd >>> shift);
			var _v0 = A2($elm$core$Elm$JsArray$unsafeGet, pos, tree);
			if (_v0.$ === 'SubTree') {
				var sub = _v0.a;
				var $temp$shift = shift - $elm$core$Array$shiftStep,
					$temp$end = end,
					$temp$treeEnd = treeEnd,
					$temp$tree = sub;
				shift = $temp$shift;
				end = $temp$end;
				treeEnd = $temp$treeEnd;
				tree = $temp$tree;
				continue fetchNewTail;
			} else {
				var values = _v0.a;
				return A3($elm$core$Elm$JsArray$slice, 0, $elm$core$Array$bitMask & end, values);
			}
		}
	});
var $elm$core$Array$hoistTree = F3(
	function (oldShift, newShift, tree) {
		hoistTree:
		while (true) {
			if ((_Utils_cmp(oldShift, newShift) < 1) || (!$elm$core$Elm$JsArray$length(tree))) {
				return tree;
			} else {
				var _v0 = A2($elm$core$Elm$JsArray$unsafeGet, 0, tree);
				if (_v0.$ === 'SubTree') {
					var sub = _v0.a;
					var $temp$oldShift = oldShift - $elm$core$Array$shiftStep,
						$temp$newShift = newShift,
						$temp$tree = sub;
					oldShift = $temp$oldShift;
					newShift = $temp$newShift;
					tree = $temp$tree;
					continue hoistTree;
				} else {
					return tree;
				}
			}
		}
	});
var $elm$core$Elm$JsArray$unsafeSet = _JsArray_unsafeSet;
var $elm$core$Array$sliceTree = F3(
	function (shift, endIdx, tree) {
		var lastPos = $elm$core$Array$bitMask & (endIdx >>> shift);
		var _v0 = A2($elm$core$Elm$JsArray$unsafeGet, lastPos, tree);
		if (_v0.$ === 'SubTree') {
			var sub = _v0.a;
			var newSub = A3($elm$core$Array$sliceTree, shift - $elm$core$Array$shiftStep, endIdx, sub);
			return (!$elm$core$Elm$JsArray$length(newSub)) ? A3($elm$core$Elm$JsArray$slice, 0, lastPos, tree) : A3(
				$elm$core$Elm$JsArray$unsafeSet,
				lastPos,
				$elm$core$Array$SubTree(newSub),
				A3($elm$core$Elm$JsArray$slice, 0, lastPos + 1, tree));
		} else {
			return A3($elm$core$Elm$JsArray$slice, 0, lastPos, tree);
		}
	});
var $elm$core$Array$sliceRight = F2(
	function (end, array) {
		var len = array.a;
		var startShift = array.b;
		var tree = array.c;
		var tail = array.d;
		if (_Utils_eq(end, len)) {
			return array;
		} else {
			if (_Utils_cmp(
				end,
				$elm$core$Array$tailIndex(len)) > -1) {
				return A4(
					$elm$core$Array$Array_elm_builtin,
					end,
					startShift,
					tree,
					A3($elm$core$Elm$JsArray$slice, 0, $elm$core$Array$bitMask & end, tail));
			} else {
				var endIdx = $elm$core$Array$tailIndex(end);
				var depth = $elm$core$Basics$floor(
					A2(
						$elm$core$Basics$logBase,
						$elm$core$Array$branchFactor,
						A2($elm$core$Basics$max, 1, endIdx - 1)));
				var newShift = A2($elm$core$Basics$max, 5, depth * $elm$core$Array$shiftStep);
				return A4(
					$elm$core$Array$Array_elm_builtin,
					end,
					newShift,
					A3(
						$elm$core$Array$hoistTree,
						startShift,
						newShift,
						A3($elm$core$Array$sliceTree, startShift, endIdx, tree)),
					A4($elm$core$Array$fetchNewTail, startShift, end, endIdx, tree));
			}
		}
	});
var $elm$core$Array$translateIndex = F2(
	function (index, _v0) {
		var len = _v0.a;
		var posIndex = (index < 0) ? (len + index) : index;
		return (posIndex < 0) ? 0 : ((_Utils_cmp(posIndex, len) > 0) ? len : posIndex);
	});
var $elm$core$Array$slice = F3(
	function (from, to, array) {
		var correctTo = A2($elm$core$Array$translateIndex, to, array);
		var correctFrom = A2($elm$core$Array$translateIndex, from, array);
		return (_Utils_cmp(correctFrom, correctTo) > 0) ? $elm$core$Array$empty : A2(
			$elm$core$Array$sliceLeft,
			correctFrom,
			A2($elm$core$Array$sliceRight, correctTo, array));
	});
var $elm$core$List$takeReverse = F3(
	function (n, list, kept) {
		takeReverse:
		while (true) {
			if (n <= 0) {
				return kept;
			} else {
				if (!list.b) {
					return kept;
				} else {
					var x = list.a;
					var xs = list.b;
					var $temp$n = n - 1,
						$temp$list = xs,
						$temp$kept = A2($elm$core$List$cons, x, kept);
					n = $temp$n;
					list = $temp$list;
					kept = $temp$kept;
					continue takeReverse;
				}
			}
		}
	});
var $elm$core$List$takeTailRec = F2(
	function (n, list) {
		return $elm$core$List$reverse(
			A3($elm$core$List$takeReverse, n, list, _List_Nil));
	});
var $elm$core$List$takeFast = F3(
	function (ctr, n, list) {
		if (n <= 0) {
			return _List_Nil;
		} else {
			var _v0 = _Utils_Tuple2(n, list);
			_v0$1:
			while (true) {
				_v0$5:
				while (true) {
					if (!_v0.b.b) {
						return list;
					} else {
						if (_v0.b.b.b) {
							switch (_v0.a) {
								case 1:
									break _v0$1;
								case 2:
									var _v2 = _v0.b;
									var x = _v2.a;
									var _v3 = _v2.b;
									var y = _v3.a;
									return _List_fromArray(
										[x, y]);
								case 3:
									if (_v0.b.b.b.b) {
										var _v4 = _v0.b;
										var x = _v4.a;
										var _v5 = _v4.b;
										var y = _v5.a;
										var _v6 = _v5.b;
										var z = _v6.a;
										return _List_fromArray(
											[x, y, z]);
									} else {
										break _v0$5;
									}
								default:
									if (_v0.b.b.b.b && _v0.b.b.b.b.b) {
										var _v7 = _v0.b;
										var x = _v7.a;
										var _v8 = _v7.b;
										var y = _v8.a;
										var _v9 = _v8.b;
										var z = _v9.a;
										var _v10 = _v9.b;
										var w = _v10.a;
										var tl = _v10.b;
										return (ctr > 1000) ? A2(
											$elm$core$List$cons,
											x,
											A2(
												$elm$core$List$cons,
												y,
												A2(
													$elm$core$List$cons,
													z,
													A2(
														$elm$core$List$cons,
														w,
														A2($elm$core$List$takeTailRec, n - 4, tl))))) : A2(
											$elm$core$List$cons,
											x,
											A2(
												$elm$core$List$cons,
												y,
												A2(
													$elm$core$List$cons,
													z,
													A2(
														$elm$core$List$cons,
														w,
														A3($elm$core$List$takeFast, ctr + 1, n - 4, tl)))));
									} else {
										break _v0$5;
									}
							}
						} else {
							if (_v0.a === 1) {
								break _v0$1;
							} else {
								break _v0$5;
							}
						}
					}
				}
				return list;
			}
			var _v1 = _v0.b;
			var x = _v1.a;
			return _List_fromArray(
				[x]);
		}
	});
var $elm$core$List$take = F2(
	function (n, list) {
		return A3($elm$core$List$takeFast, 0, n, list);
	});
var $elm_community$list_extra$List$Extra$splitAt = F2(
	function (n, xs) {
		return _Utils_Tuple2(
			A2($elm$core$List$take, n, xs),
			A2($elm$core$List$drop, n, xs));
	});
var $elm$core$Maybe$withDefault = F2(
	function (_default, maybe) {
		if (maybe.$ === 'Just') {
			var value = maybe.a;
			return value;
		} else {
			return _default;
		}
	});
var $author$project$Terminal$deleteLines = F2(
	function (number, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var _v1 = editor.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var renderableLines = editor.travelable.renderableLines;
		var travelable = editor.travelable;
		var _v2 = A2(
			$elm$core$Maybe$withDefault,
			_Utils_Tuple2(1, terminal.size.height + 1),
			scrollRegion);
		var start = _v2.a;
		var end = _v2.b;
		var nextTravelable = function () {
			var region = $elm$core$Array$toList(
				A3(
					$elm$core$Array$slice,
					start - 1,
					end,
					$elm$core$Array$fromList(renderableLines)));
			var _v3 = A2($elm_community$list_extra$List$Extra$splitAt, end, renderableLines);
			var tail = _v3.b;
			var _v4 = A2($elm_community$list_extra$List$Extra$splitAt, start - 1, renderableLines);
			var head = _v4.a;
			var nextRenderableLines = $elm$core$List$concat(
				_List_fromArray(
					[
						head,
						$elm$core$Array$toList(
						A3(
							$elm$core$Array$slice,
							number,
							$elm$core$List$length(region) + number,
							$elm$core$Array$fromList(
								_Utils_ap(
									region,
									A2(
										$elm$core$List$repeat,
										number,
										A2(
											$author$project$Editor$Lib$createRenderableLine,
											0,
											A2($elm$core$String$repeat, terminal.size.width, ' '))))))),
						tail
					]));
			return _Utils_update(
				travelable,
				{renderableLines: nextRenderableLines});
		}();
		var nextEditor = _Utils_update(
			editor,
			{travelable: nextTravelable});
		return A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
	});
var $elm$core$Dict$values = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, valueList) {
				return A2($elm$core$List$cons, value, valueList);
			}),
		_List_Nil,
		dict);
};
var $author$project$Terminal$setStyle = F4(
	function (renderableLine, start, end, styles) {
		return $elm$core$Dict$values(
			A3(
				$elm$core$List$foldl,
				F2(
					function (i, acc) {
						return A3(
							$elm$core$Dict$insert,
							i,
							{
								end: $elm$core$Maybe$Just(i + 1),
								kind: 1000,
								start: i,
								styles: $elm$core$Dict$toList(styles)
							},
							acc);
					}),
				$elm$core$Dict$fromList(
					A3(
						$elm$core$List$foldl,
						F2(
							function (s, acc) {
								return A2(
									$elm$core$List$cons,
									_Utils_Tuple2(s.start, s),
									acc);
							}),
						_List_Nil,
						renderableLine.multilineSymbols)),
				A2($elm$core$List$range, start, end - 1)));
	});
var $elm_community$list_extra$List$Extra$updateAt = F3(
	function (index, fn, list) {
		if (index < 0) {
			return list;
		} else {
			var tail = A2($elm$core$List$drop, index, list);
			var head = A2($elm$core$List$take, index, list);
			if (tail.b) {
				var x = tail.a;
				var xs = tail.b;
				return _Utils_ap(
					head,
					A2(
						$elm$core$List$cons,
						fn(x),
						xs));
			} else {
				return list;
			}
		}
	});
var $author$project$Terminal$eraseCharacters = F2(
	function (count, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var _v1 = editor.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var travelable = editor.travelable;
		var nextRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				var start = A3($elm$core$String$slice, 0, x, renderableLine.text);
				var middle = A2($elm$core$String$repeat, count, ' ');
				var end = A3($elm$core$String$slice, x + count, terminal.size.width, renderableLine.text);
				var nextText = A3(
					$elm$core$String$slice,
					0,
					terminal.size.width,
					_Utils_ap(
						start,
						_Utils_ap(middle, end)));
				return _Utils_update(
					renderableLine,
					{
						multilineSymbols: A4($author$project$Terminal$setStyle, renderableLine, x, x + count, terminal.styles),
						text: nextText
					});
			},
			travelable.renderableLines);
		return A2(
			$author$project$Terminal$updateTerminalEditor,
			_Utils_update(
				editor,
				{
					travelable: _Utils_update(
						travelable,
						{renderableLines: nextRenderableLines})
				}),
			terminal);
	});
var $author$project$Terminal$eraseLineFromCursorToEnd = F4(
	function (width, x, y, renderableLines) {
		return A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				return _Utils_update(
					renderableLine,
					{
						text: _Utils_ap(
							A3($elm$core$String$slice, 0, x, renderableLine.text),
							A2($elm$core$String$repeat, width - x, ' '))
					});
			},
			renderableLines);
	});
var $author$project$Terminal$eraseLineFromStartToCursor = F4(
	function (width, x, y, renderableLines) {
		return A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				return _Utils_update(
					renderableLine,
					{
						text: _Utils_ap(
							A2($elm$core$String$repeat, x, ' '),
							A3($elm$core$String$slice, x, width, renderableLine.text))
					});
			},
			renderableLines);
	});
var $author$project$Terminal$getAnsiColor = function (number) {
	switch (number) {
		case 30:
			return 'black';
		case 40:
			return 'black';
		case 31:
			return 'rgb(194,54,33)';
		case 41:
			return 'rgb(194,54,33)';
		case 32:
			return 'rgb(37,188,36)';
		case 42:
			return 'rgb(37,188,36)';
		case 33:
			return 'rgb(173,173,39)';
		case 43:
			return 'rgb(173,173,39)';
		case 34:
			return 'rgb(73,46,225)';
		case 44:
			return 'rgb(73,46,225)';
		case 35:
			return 'rgb(211,56,211)';
		case 45:
			return 'rgb(211,56,211)';
		case 36:
			return 'rgb(51,187,200)';
		case 46:
			return 'rgb(51,187,200)';
		case 37:
			return 'rgb(203,204,205)';
		case 47:
			return 'rgb(203,204,205)';
		case 90:
			return 'rgb(129,131,131)';
		case 100:
			return 'rgb(129,131,131)';
		case 91:
			return 'rbg(252,57,31)';
		case 101:
			return 'rbg(252,57,31)';
		case 92:
			return 'rgb(49,231,34)';
		case 102:
			return 'rgb(49,231,34)';
		case 93:
			return 'rgb(234,236,35)';
		case 103:
			return 'rgb(234,236,35)';
		case 94:
			return 'rgb(88,51,255)';
		case 104:
			return 'rgb(88,51,255)';
		case 95:
			return 'rgb(249,53,248)';
		case 105:
			return 'rgb(249,53,248)';
		case 96:
			return 'rgb(20,240,240)';
		case 106:
			return 'rgb(20,240,240)';
		case 97:
			return 'rgb(233,235,235)';
		case 107:
			return 'rgb(233,235,235)';
		default:
			return '';
	}
};
var $author$project$Terminal$EightBitColors$colors = $elm$core$Dict$fromList(
	_List_fromArray(
		[
			_Utils_Tuple2(0, '000000'),
			_Utils_Tuple2(1, '800000'),
			_Utils_Tuple2(2, '008000'),
			_Utils_Tuple2(3, '808000'),
			_Utils_Tuple2(4, '000080'),
			_Utils_Tuple2(5, '800080'),
			_Utils_Tuple2(6, '008080'),
			_Utils_Tuple2(7, 'c0c0c0'),
			_Utils_Tuple2(8, '808080'),
			_Utils_Tuple2(9, 'ff0000'),
			_Utils_Tuple2(10, '00ff00'),
			_Utils_Tuple2(11, 'ffff00'),
			_Utils_Tuple2(12, '0000ff'),
			_Utils_Tuple2(13, 'ff00ff'),
			_Utils_Tuple2(14, '00ffff'),
			_Utils_Tuple2(15, 'ffffff'),
			_Utils_Tuple2(16, '000000'),
			_Utils_Tuple2(17, '00005f'),
			_Utils_Tuple2(18, '000087'),
			_Utils_Tuple2(19, '0000af'),
			_Utils_Tuple2(20, '0000d7'),
			_Utils_Tuple2(21, '0000ff'),
			_Utils_Tuple2(22, '005f00'),
			_Utils_Tuple2(23, '005f5f'),
			_Utils_Tuple2(24, '005f87'),
			_Utils_Tuple2(25, '005faf'),
			_Utils_Tuple2(26, '005fd7'),
			_Utils_Tuple2(27, '005fff'),
			_Utils_Tuple2(28, '008700'),
			_Utils_Tuple2(29, '00875f'),
			_Utils_Tuple2(30, '008787'),
			_Utils_Tuple2(31, '0087af'),
			_Utils_Tuple2(32, '0087d7'),
			_Utils_Tuple2(33, '0087ff'),
			_Utils_Tuple2(34, '00af00'),
			_Utils_Tuple2(35, '00af5f'),
			_Utils_Tuple2(36, '00af87'),
			_Utils_Tuple2(37, '00afaf'),
			_Utils_Tuple2(38, '00afd7'),
			_Utils_Tuple2(39, '00afff'),
			_Utils_Tuple2(40, '00d700'),
			_Utils_Tuple2(41, '00d75f'),
			_Utils_Tuple2(42, '00d787'),
			_Utils_Tuple2(43, '00d7af'),
			_Utils_Tuple2(44, '00d7d7'),
			_Utils_Tuple2(45, '00d7ff'),
			_Utils_Tuple2(46, '00ff00'),
			_Utils_Tuple2(47, '00ff5f'),
			_Utils_Tuple2(48, '00ff87'),
			_Utils_Tuple2(49, '00ffaf'),
			_Utils_Tuple2(50, '00ffd7'),
			_Utils_Tuple2(51, '00ffff'),
			_Utils_Tuple2(52, '5f0000'),
			_Utils_Tuple2(53, '5f005f'),
			_Utils_Tuple2(54, '5f0087'),
			_Utils_Tuple2(55, '5f00af'),
			_Utils_Tuple2(56, '5f00d7'),
			_Utils_Tuple2(57, '5f00ff'),
			_Utils_Tuple2(58, '5f5f00'),
			_Utils_Tuple2(59, '5f5f5f'),
			_Utils_Tuple2(60, '5f5f87'),
			_Utils_Tuple2(61, '5f5faf'),
			_Utils_Tuple2(62, '5f5fd7'),
			_Utils_Tuple2(63, '5f5fff'),
			_Utils_Tuple2(64, '5f8700'),
			_Utils_Tuple2(65, '5f875f'),
			_Utils_Tuple2(66, '5f8787'),
			_Utils_Tuple2(67, '5f87af'),
			_Utils_Tuple2(68, '5f87d7'),
			_Utils_Tuple2(69, '5f87ff'),
			_Utils_Tuple2(70, '5faf00'),
			_Utils_Tuple2(71, '5faf5f'),
			_Utils_Tuple2(72, '5faf87'),
			_Utils_Tuple2(73, '5fafaf'),
			_Utils_Tuple2(74, '5fafd7'),
			_Utils_Tuple2(75, '5fafff'),
			_Utils_Tuple2(76, '5fd700'),
			_Utils_Tuple2(77, '5fd75f'),
			_Utils_Tuple2(78, '5fd787'),
			_Utils_Tuple2(79, '5fd7af'),
			_Utils_Tuple2(80, '5fd7d7'),
			_Utils_Tuple2(81, '5fd7ff'),
			_Utils_Tuple2(82, '5fff00'),
			_Utils_Tuple2(83, '5fff5f'),
			_Utils_Tuple2(84, '5fff87'),
			_Utils_Tuple2(85, '5fffaf'),
			_Utils_Tuple2(86, '5fffd7'),
			_Utils_Tuple2(87, '5fffff'),
			_Utils_Tuple2(88, '870000'),
			_Utils_Tuple2(89, '87005f'),
			_Utils_Tuple2(90, '870087'),
			_Utils_Tuple2(91, '8700af'),
			_Utils_Tuple2(92, '8700d7'),
			_Utils_Tuple2(93, '8700ff'),
			_Utils_Tuple2(94, '875f00'),
			_Utils_Tuple2(95, '875f5f'),
			_Utils_Tuple2(96, '875f87'),
			_Utils_Tuple2(97, '875faf'),
			_Utils_Tuple2(98, '875fd7'),
			_Utils_Tuple2(99, '875fff'),
			_Utils_Tuple2(100, '878700'),
			_Utils_Tuple2(101, '87875f'),
			_Utils_Tuple2(102, '878787'),
			_Utils_Tuple2(103, '8787af'),
			_Utils_Tuple2(104, '8787d7'),
			_Utils_Tuple2(105, '8787ff'),
			_Utils_Tuple2(106, '87af00'),
			_Utils_Tuple2(107, '87af5f'),
			_Utils_Tuple2(108, '87af87'),
			_Utils_Tuple2(109, '87afaf'),
			_Utils_Tuple2(110, '87afd7'),
			_Utils_Tuple2(111, '87afff'),
			_Utils_Tuple2(112, '87d700'),
			_Utils_Tuple2(113, '87d75f'),
			_Utils_Tuple2(114, '87d787'),
			_Utils_Tuple2(115, '87d7af'),
			_Utils_Tuple2(116, '87d7d7'),
			_Utils_Tuple2(117, '87d7ff'),
			_Utils_Tuple2(118, '87ff00'),
			_Utils_Tuple2(119, '87ff5f'),
			_Utils_Tuple2(120, '87ff87'),
			_Utils_Tuple2(121, '87ffaf'),
			_Utils_Tuple2(122, '87ffd7'),
			_Utils_Tuple2(123, '87ffff'),
			_Utils_Tuple2(124, 'af0000'),
			_Utils_Tuple2(125, 'af005f'),
			_Utils_Tuple2(126, 'af0087'),
			_Utils_Tuple2(127, 'af00af'),
			_Utils_Tuple2(128, 'af00d7'),
			_Utils_Tuple2(129, 'af00ff'),
			_Utils_Tuple2(130, 'af5f00'),
			_Utils_Tuple2(131, 'af5f5f'),
			_Utils_Tuple2(132, 'af5f87'),
			_Utils_Tuple2(133, 'af5faf'),
			_Utils_Tuple2(134, 'af5fd7'),
			_Utils_Tuple2(135, 'af5fff'),
			_Utils_Tuple2(136, 'af8700'),
			_Utils_Tuple2(137, 'af875f'),
			_Utils_Tuple2(138, 'af8787'),
			_Utils_Tuple2(139, 'af87af'),
			_Utils_Tuple2(140, 'af87d7'),
			_Utils_Tuple2(141, 'af87ff'),
			_Utils_Tuple2(142, 'afaf00'),
			_Utils_Tuple2(143, 'afaf5f'),
			_Utils_Tuple2(144, 'afaf87'),
			_Utils_Tuple2(145, 'afafaf'),
			_Utils_Tuple2(146, 'afafd7'),
			_Utils_Tuple2(147, 'afafff'),
			_Utils_Tuple2(148, 'afd700'),
			_Utils_Tuple2(149, 'afd75f'),
			_Utils_Tuple2(150, 'afd787'),
			_Utils_Tuple2(151, 'afd7af'),
			_Utils_Tuple2(152, 'afd7d7'),
			_Utils_Tuple2(153, 'afd7ff'),
			_Utils_Tuple2(154, 'afff00'),
			_Utils_Tuple2(155, 'afff5f'),
			_Utils_Tuple2(156, 'afff87'),
			_Utils_Tuple2(157, 'afffaf'),
			_Utils_Tuple2(158, 'afffd7'),
			_Utils_Tuple2(159, 'afffff'),
			_Utils_Tuple2(160, 'd70000'),
			_Utils_Tuple2(161, 'd7005f'),
			_Utils_Tuple2(162, 'd70087'),
			_Utils_Tuple2(163, 'd700af'),
			_Utils_Tuple2(164, 'd700d7'),
			_Utils_Tuple2(165, 'd700ff'),
			_Utils_Tuple2(166, 'd75f00'),
			_Utils_Tuple2(167, 'd75f5f'),
			_Utils_Tuple2(168, 'd75f87'),
			_Utils_Tuple2(169, 'd75faf'),
			_Utils_Tuple2(170, 'd75fd7'),
			_Utils_Tuple2(171, 'd75fff'),
			_Utils_Tuple2(172, 'd78700'),
			_Utils_Tuple2(173, 'd7875f'),
			_Utils_Tuple2(174, 'd78787'),
			_Utils_Tuple2(175, 'd787af'),
			_Utils_Tuple2(176, 'd787d7'),
			_Utils_Tuple2(177, 'd787ff'),
			_Utils_Tuple2(178, 'd7af00'),
			_Utils_Tuple2(179, 'd7af5f'),
			_Utils_Tuple2(180, 'd7af87'),
			_Utils_Tuple2(181, 'd7afaf'),
			_Utils_Tuple2(182, 'd7afd7'),
			_Utils_Tuple2(183, 'd7afff'),
			_Utils_Tuple2(184, 'd7d700'),
			_Utils_Tuple2(185, 'd7d75f'),
			_Utils_Tuple2(186, 'd7d787'),
			_Utils_Tuple2(187, 'd7d7af'),
			_Utils_Tuple2(188, 'd7d7d7'),
			_Utils_Tuple2(189, 'd7d7ff'),
			_Utils_Tuple2(190, 'd7ff00'),
			_Utils_Tuple2(191, 'd7ff5f'),
			_Utils_Tuple2(192, 'd7ff87'),
			_Utils_Tuple2(193, 'd7ffaf'),
			_Utils_Tuple2(194, 'd7ffd7'),
			_Utils_Tuple2(195, 'd7ffff'),
			_Utils_Tuple2(196, 'ff0000'),
			_Utils_Tuple2(197, 'ff005f'),
			_Utils_Tuple2(198, 'ff0087'),
			_Utils_Tuple2(199, 'ff00af'),
			_Utils_Tuple2(200, 'ff00d7'),
			_Utils_Tuple2(201, 'ff00ff'),
			_Utils_Tuple2(202, 'ff5f00'),
			_Utils_Tuple2(203, 'ff5f5f'),
			_Utils_Tuple2(204, 'ff5f87'),
			_Utils_Tuple2(205, 'ff5faf'),
			_Utils_Tuple2(206, 'ff5fd7'),
			_Utils_Tuple2(207, 'ff5fff'),
			_Utils_Tuple2(208, 'ff8700'),
			_Utils_Tuple2(209, 'ff875f'),
			_Utils_Tuple2(210, 'ff8787'),
			_Utils_Tuple2(211, 'ff87af'),
			_Utils_Tuple2(212, 'ff87d7'),
			_Utils_Tuple2(213, 'ff87ff'),
			_Utils_Tuple2(214, 'ffaf00'),
			_Utils_Tuple2(215, 'ffaf5f'),
			_Utils_Tuple2(216, 'ffaf87'),
			_Utils_Tuple2(217, 'ffafaf'),
			_Utils_Tuple2(218, 'ffafd7'),
			_Utils_Tuple2(219, 'ffafff'),
			_Utils_Tuple2(220, 'ffd700'),
			_Utils_Tuple2(221, 'ffd75f'),
			_Utils_Tuple2(222, 'ffd787'),
			_Utils_Tuple2(223, 'ffd7af'),
			_Utils_Tuple2(224, 'ffd7d7'),
			_Utils_Tuple2(225, 'ffd7ff'),
			_Utils_Tuple2(226, 'ffff00'),
			_Utils_Tuple2(227, 'ffff5f'),
			_Utils_Tuple2(228, 'ffff87'),
			_Utils_Tuple2(229, 'ffffaf'),
			_Utils_Tuple2(230, 'ffffd7'),
			_Utils_Tuple2(231, 'ffffff'),
			_Utils_Tuple2(232, '080808'),
			_Utils_Tuple2(233, '121212'),
			_Utils_Tuple2(234, '1c1c1c'),
			_Utils_Tuple2(235, '262626'),
			_Utils_Tuple2(236, '303030'),
			_Utils_Tuple2(237, '3a3a3a'),
			_Utils_Tuple2(238, '444444'),
			_Utils_Tuple2(239, '4e4e4e'),
			_Utils_Tuple2(240, '585858'),
			_Utils_Tuple2(241, '626262'),
			_Utils_Tuple2(242, '6c6c6c'),
			_Utils_Tuple2(243, '767676'),
			_Utils_Tuple2(244, '808080'),
			_Utils_Tuple2(245, '8a8a8a'),
			_Utils_Tuple2(246, '949494'),
			_Utils_Tuple2(247, '9e9e9e'),
			_Utils_Tuple2(248, 'a8a8a8'),
			_Utils_Tuple2(249, 'b2b2b2'),
			_Utils_Tuple2(250, 'bcbcbc'),
			_Utils_Tuple2(251, 'c6c6c6'),
			_Utils_Tuple2(252, 'd0d0d0'),
			_Utils_Tuple2(253, 'dadada'),
			_Utils_Tuple2(254, 'e4e4e4'),
			_Utils_Tuple2(255, 'eeeeee')
		]));
var $elm$core$Dict$get = F2(
	function (targetKey, dict) {
		get:
		while (true) {
			if (dict.$ === 'RBEmpty_elm_builtin') {
				return $elm$core$Maybe$Nothing;
			} else {
				var key = dict.b;
				var value = dict.c;
				var left = dict.d;
				var right = dict.e;
				var _v1 = A2($elm$core$Basics$compare, targetKey, key);
				switch (_v1.$) {
					case 'LT':
						var $temp$targetKey = targetKey,
							$temp$dict = left;
						targetKey = $temp$targetKey;
						dict = $temp$dict;
						continue get;
					case 'EQ':
						return $elm$core$Maybe$Just(value);
					default:
						var $temp$targetKey = targetKey,
							$temp$dict = right;
						targetKey = $temp$targetKey;
						dict = $temp$dict;
						continue get;
				}
			}
		}
	});
var $author$project$Terminal$EightBitColors$getColorByNumber = function (number) {
	var _v0 = A2($elm$core$Dict$get, number, $author$project$Terminal$EightBitColors$colors);
	if (_v0.$ === 'Just') {
		var color = _v0.a;
		return color;
	} else {
		return '000000';
	}
};
var $author$project$Terminal$index = F2(
	function (_v0, terminal) {
		var height = _v0.height;
		var _v1 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v1.a;
		var scrollRegion = _v1.b;
		var _v2 = editor.travelable.cursorPosition;
		var x = _v2.x;
		var y = _v2.y;
		var renderableLines = editor.travelable.renderableLines;
		var travelable = editor.travelable;
		var nextTravelable = _Utils_update(
			travelable,
			{
				cursorPosition: {
					x: x,
					y: A2($elm$core$Basics$min, terminal.size.height, y + 1)
				},
				renderableLines: renderableLines
			});
		var nextEditor = _Utils_update(
			editor,
			{travelable: nextTravelable});
		return A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
	});
var $elm$core$List$tail = function (list) {
	if (list.b) {
		var x = list.a;
		var xs = list.b;
		return $elm$core$Maybe$Just(xs);
	} else {
		return $elm$core$Maybe$Nothing;
	}
};
var $author$project$Terminal$insertLines = F2(
	function (number, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var _v1 = editor.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var renderableLines = editor.travelable.renderableLines;
		var travelable = editor.travelable;
		var _v2 = A2(
			$elm$core$Maybe$withDefault,
			_Utils_Tuple2(1, terminal.size.height),
			scrollRegion);
		var start = _v2.a;
		var end = _v2.b;
		var nextTravelable = function () {
			var region = $elm$core$Array$toList(
				A3(
					$elm$core$Array$slice,
					start - 1,
					end,
					$elm$core$Array$fromList(renderableLines)));
			var _v3 = A2($elm_community$list_extra$List$Extra$splitAt, end, renderableLines);
			var tail = _v3.b;
			var _v4 = A2($elm_community$list_extra$List$Extra$splitAt, start - 1, renderableLines);
			var head = _v4.a;
			var nextRenderableLines = $elm$core$List$concat(
				_List_fromArray(
					[
						head,
						_Utils_ap(
						A2(
							$elm$core$List$repeat,
							number,
							A2($author$project$Editor$Lib$createRenderableLine, 0, '')),
						$elm$core$List$reverse(
							A2(
								$elm$core$Maybe$withDefault,
								region,
								$elm$core$List$tail(
									$elm$core$List$reverse(region))))),
						tail
					]));
			return _Utils_update(
				travelable,
				{renderableLines: nextRenderableLines});
		}();
		var nextEditor = _Utils_update(
			editor,
			{travelable: nextTravelable});
		return A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
	});
var $elm$core$String$foldl = _String_foldl;
var $elm$core$Maybe$map = F2(
	function (f, maybe) {
		if (maybe.$ === 'Just') {
			var value = maybe.a;
			return $elm$core$Maybe$Just(
				f(value));
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $elm$core$Basics$neq = _Utils_notEqual;
var $author$project$Terminal$newLine = F2(
	function (_v0, terminal) {
		var height = _v0.height;
		var _v1 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v1.a;
		var scrollRegion = _v1.b;
		var _v2 = editor.travelable.cursorPosition;
		var x = _v2.x;
		var y = _v2.y;
		var renderableLines = editor.travelable.renderableLines;
		var travelable = editor.travelable;
		var _v3 = A2(
			$elm$core$Maybe$withDefault,
			_Utils_Tuple2(1, height),
			scrollRegion);
		var start = _v3.a;
		var end = _v3.b;
		var nextScrollback = function () {
			var _v8 = terminal.activeBuffer;
			if (_v8.$ === 'Alternate') {
				return terminal.scrollback;
			} else {
				var _v9 = _Utils_eq(y + 1, end);
				if (_v9) {
					var scrollbackEditor = terminal.scrollback;
					var scrollbackTravelable = scrollbackEditor.travelable;
					var addToScrollback = A2(
						$elm$core$Maybe$withDefault,
						_List_Nil,
						A2(
							$elm$core$Maybe$map,
							function (h) {
								return _List_fromArray(
									[h]);
							},
							$elm$core$List$head(renderableLines)));
					return _Utils_update(
						scrollbackEditor,
						{
							travelable: _Utils_update(
								scrollbackTravelable,
								{
									renderableLines: $elm$core$List$concat(
										_List_fromArray(
											[scrollbackTravelable.renderableLines, addToScrollback]))
								})
						});
				} else {
					return terminal.scrollback;
				}
			}
		}();
		var nextTravelable = function () {
			if (_Utils_eq(y + 1, end)) {
				var region = $elm$core$Array$toList(
					A3(
						$elm$core$Array$slice,
						start - 1,
						end,
						$elm$core$Array$fromList(renderableLines)));
				var _v4 = A2($elm_community$list_extra$List$Extra$splitAt, end, renderableLines);
				var tail = _v4.b;
				var _v5 = A2($elm_community$list_extra$List$Extra$splitAt, start - 1, renderableLines);
				var head = _v5.a;
				var nextRenderableLines = $elm$core$List$concat(
					_List_fromArray(
						[
							head,
							_Utils_ap(
							A2(
								$elm$core$Maybe$withDefault,
								region,
								$elm$core$List$tail(region)),
							_List_fromArray(
								[
									A2(
									$author$project$Editor$Lib$createRenderableLine,
									0,
									A2($elm$core$String$repeat, terminal.size.width, ' '))
								])),
							tail
						]));
				return _Utils_update(
					travelable,
					{
						cursorPosition: {
							x: x,
							y: A2($elm$core$Basics$min, height - 1, y + 1)
						},
						renderableLines: nextRenderableLines
					});
			} else {
				if (_Utils_eq(y + 1, start) && ((start !== 1) && (!_Utils_eq(end, height)))) {
					var region = $elm$core$Array$toList(
						A3(
							$elm$core$Array$slice,
							start - 1,
							end,
							$elm$core$Array$fromList(renderableLines)));
					var _v6 = A2($elm_community$list_extra$List$Extra$splitAt, end, renderableLines);
					var tail = _v6.b;
					var _v7 = A2($elm_community$list_extra$List$Extra$splitAt, start - 1, renderableLines);
					var head = _v7.a;
					var nextRenderableLines = $elm$core$List$concat(
						_List_fromArray(
							[
								head,
								_Utils_ap(
								_List_fromArray(
									[
										A2(
										$author$project$Editor$Lib$createRenderableLine,
										0,
										A2($elm$core$String$repeat, terminal.size.width, ' '))
									]),
								$elm$core$List$reverse(
									A2(
										$elm$core$Maybe$withDefault,
										region,
										$elm$core$List$tail(
											$elm$core$List$reverse(region))))),
								tail
							]));
					return _Utils_update(
						travelable,
						{
							cursorPosition: {
								x: x,
								y: A2($elm$core$Basics$min, height - 1, y + 1)
							},
							renderableLines: nextRenderableLines
						});
				} else {
					return _Utils_update(
						travelable,
						{
							cursorPosition: {x: x, y: y + 1},
							renderableLines: renderableLines
						});
				}
			}
		}();
		var nextEditor = _Utils_update(
			editor,
			{travelable: nextTravelable});
		var nextTerminal = A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
		return _Utils_update(
			nextTerminal,
			{scrollback: nextScrollback});
	});
var $author$project$Terminal$insertCharacter = F2(
	function (text, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var nextTerminal = _Utils_eq(editor.travelable.cursorPosition.x, terminal.size.width) ? A2($author$project$Terminal$newLine, terminal.size, terminal) : terminal;
		var _v1 = $author$project$Terminal$getBuffer(nextTerminal);
		var nextEditor = _v1.a;
		var _v2 = function () {
			var cp = nextEditor.travelable.cursorPosition;
			return ((_Utils_cmp(cp.y, editor.travelable.cursorPosition.y) > 0) || _Utils_eq(cp.x, terminal.size.width)) ? _Utils_update(
				cp,
				{x: 0, y: cp.y}) : _Utils_update(
				cp,
				{x: cp.x, y: cp.y});
		}();
		var x = _v2.x;
		var y = _v2.y;
		var travelable = nextEditor.travelable;
		var nextRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				var start = A3(
					$elm$core$String$padRight,
					x,
					_Utils_chr(' '),
					A3($elm$core$String$slice, 0, x, renderableLine.text));
				var middle = text;
				var end = A3(
					$elm$core$String$slice,
					x + $elm$core$String$length(text),
					$elm$core$String$length(renderableLine.text),
					renderableLine.text);
				var nextText = function () {
					var t = _Utils_ap(
						start,
						_Utils_ap(middle, end));
					return A3(
						$elm$core$String$slice,
						0,
						A2(
							$elm$core$Basics$min,
							terminal.size.width,
							$elm$core$String$length(t)),
						t);
				}();
				return _Utils_update(
					renderableLine,
					{
						multilineSymbols: A4($author$project$Terminal$setStyle, renderableLine, x, x + 1, nextTerminal.styles),
						text: nextText
					});
			},
			nextEditor.travelable.renderableLines);
		return A2(
			$author$project$Terminal$updateTerminalEditor,
			_Utils_update(
				editor,
				{
					travelable: _Utils_update(
						travelable,
						{
							cursorPosition: {x: x + 1, y: y},
							renderableLines: nextRenderableLines
						})
				}),
			nextTerminal);
	});
var $author$project$Terminal$insertLongText = F2(
	function (text, state) {
		return A3(
			$elm$core$String$foldl,
			F2(
				function (_char, nextState) {
					return A2(
						$author$project$Terminal$insertCharacter,
						$elm$core$String$fromChar(_char),
						nextState);
				}),
			state,
			text);
	});
var $author$project$Terminal$insertSpaces = F2(
	function (count, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var _v1 = editor.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var travelable = editor.travelable;
		var nextRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				var start = A3($elm$core$String$slice, 0, x, renderableLine.text);
				var middle = A2($elm$core$String$repeat, count, ' ');
				var end = A3(
					$elm$core$String$slice,
					x,
					$elm$core$String$length(renderableLine.text),
					renderableLine.text);
				var nextText = A3(
					$elm$core$String$slice,
					0,
					terminal.size.width,
					_Utils_ap(
						start,
						_Utils_ap(middle, end)));
				return _Utils_update(
					renderableLine,
					{
						multilineSymbols: A4($author$project$Terminal$setStyle, renderableLine, x, x + count, terminal.styles),
						text: nextText
					});
			},
			travelable.renderableLines);
		return A2(
			$author$project$Terminal$updateTerminalEditor,
			_Utils_update(
				editor,
				{
					travelable: _Utils_update(
						travelable,
						{renderableLines: nextRenderableLines})
				}),
			terminal);
	});
var $author$project$Terminal$insertText = F2(
	function (text, terminal) {
		var _v0 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v0.a;
		var scrollRegion = _v0.b;
		var _v1 = editor.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var len = x + $elm$core$String$length(text);
		var nextX = (_Utils_cmp(len, terminal.size.width) > 0) ? 0 : len;
		var nextY = (_Utils_cmp(len, terminal.size.width) > 0) ? (y + 1) : y;
		var travelable = editor.travelable;
		var nextRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			function (renderableLine) {
				var start = A3(
					$elm$core$String$padRight,
					x,
					_Utils_chr(' '),
					A3($elm$core$String$slice, 0, x, renderableLine.text));
				var middle = text;
				var end = A3(
					$elm$core$String$slice,
					x + $elm$core$String$length(text),
					$elm$core$String$length(renderableLine.text),
					renderableLine.text);
				var nextText = _Utils_ap(
					start,
					_Utils_ap(middle, end));
				return _Utils_update(
					renderableLine,
					{
						multilineSymbols: A4(
							$author$project$Terminal$setStyle,
							renderableLine,
							x,
							x + $elm$core$String$length(text),
							terminal.styles),
						text: nextText
					});
			},
			travelable.renderableLines);
		return A2(
			$author$project$Terminal$updateTerminalEditor,
			_Utils_update(
				editor,
				{
					travelable: _Utils_update(
						travelable,
						{
							cursorPosition: {x: nextX, y: nextY},
							renderableLines: nextRenderableLines
						})
				}),
			terminal);
	});
var $author$project$Terminal$reverseIndex = F2(
	function (_v0, terminal) {
		var height = _v0.height;
		var _v1 = $author$project$Terminal$getBuffer(terminal);
		var editor = _v1.a;
		var scrollRegion = _v1.b;
		var _v2 = editor.travelable.cursorPosition;
		var x = _v2.x;
		var y = _v2.y;
		var renderableLines = editor.travelable.renderableLines;
		var travelable = editor.travelable;
		var _v3 = !y;
		if (_v3) {
			var _v4 = A2(
				$elm$core$Maybe$withDefault,
				_Utils_Tuple2(1, height),
				scrollRegion);
			var start = _v4.a;
			var end = _v4.b;
			var _v5 = A2($elm_community$list_extra$List$Extra$splitAt, end, renderableLines);
			var tail = _v5.b;
			var _v6 = A2($elm_community$list_extra$List$Extra$splitAt, start - 1, renderableLines);
			var head = _v6.a;
			var region = $elm$core$Array$toList(
				A3(
					$elm$core$Array$slice,
					start - 1,
					end,
					$elm$core$Array$fromList(renderableLines)));
			var nextRenderableLines = $elm$core$List$concat(
				_List_fromArray(
					[
						head,
						_Utils_ap(
						A2(
							$elm$core$Maybe$withDefault,
							region,
							$elm$core$List$tail(region)),
						_List_fromArray(
							[
								A2(
								$author$project$Editor$Lib$createRenderableLine,
								0,
								A2($elm$core$String$repeat, terminal.size.width, ' '))
							])),
						tail
					]));
			var nextTravelable = _Utils_update(
				travelable,
				{
					cursorPosition: {
						x: x,
						y: A2($elm$core$Basics$max, 0, y - 1)
					},
					renderableLines: nextRenderableLines
				});
			var nextEditor = _Utils_update(
				editor,
				{travelable: nextTravelable});
			return A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
		} else {
			var nextTravelable = _Utils_update(
				travelable,
				{
					cursorPosition: {
						x: x,
						y: A2($elm$core$Basics$max, 0, y - 1)
					},
					renderableLines: renderableLines
				});
			var nextEditor = _Utils_update(
				editor,
				{travelable: nextTravelable});
			return A2($author$project$Terminal$updateTerminalEditor, nextEditor, terminal);
		}
	});
var $author$project$Terminal$setAnsiStyle = F2(
	function (number, styles) {
		return (!number) ? A3(
			$elm$core$Dict$insert,
			'font-weight',
			'normal',
			A3(
				$elm$core$Dict$insert,
				'text-decoration',
				'none',
				A3(
					$elm$core$Dict$insert,
					'background',
					'',
					A3($elm$core$Dict$insert, 'color', '', styles)))) : ((((30 <= number) && (number <= 37)) || ((90 <= number) && (number <= 97))) ? A3(
			$elm$core$Dict$insert,
			'font-weight',
			'normal',
			A3(
				$elm$core$Dict$insert,
				'color',
				$author$project$Terminal$getAnsiColor(number),
				styles)) : ((number === 39) ? A3($elm$core$Dict$insert, 'color', '', styles) : ((number === 49) ? A3($elm$core$Dict$insert, 'background', '', styles) : A3(
			$elm$core$Dict$insert,
			'font-weight',
			'normal',
			A3(
				$elm$core$Dict$insert,
				'background',
				$author$project$Terminal$getAnsiColor(number),
				styles)))));
	});
var $author$project$Editor$Lib$startUpdateEditor = F2(
	function (b, a) {
		return A2(
			F2(
				function (aa, bb) {
					return _Utils_Tuple2(aa, bb);
				}),
			a,
			b);
	})($elm$core$Platform$Cmd$none);
var $author$project$Terminal$terminalBufferPorts = {
	requestChange: function (code) {
		return $elm$core$Platform$Cmd$none;
	},
	requestCompletion: function (completionRequest) {
		return $elm$core$Platform$Cmd$none;
	},
	requestCopy: function (_v0) {
		return $elm$core$Platform$Cmd$none;
	},
	requestPaste: function (_v1) {
		return $elm$core$Platform$Cmd$none;
	},
	requestRun: function (_v2) {
		return $elm$core$Platform$Cmd$none;
	},
	requestSave: function (code) {
		return $elm$core$Platform$Cmd$none;
	}
};
var $author$project$Editor$Msg$NoOp = {$: 'NoOp'};
var $author$project$Editor$Lib$addMsg = F2(
	function (message, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			model,
			$elm$core$Platform$Cmd$batch(
				A2(
					$elm$core$List$cons,
					msg,
					_List_fromArray(
						[message]))));
	});
var $elm$core$Basics$composeL = F3(
	function (g, f, x) {
		return g(
			f(x));
	});
var $elm$core$Task$onError = _Scheduler_onError;
var $elm$core$Task$attempt = F2(
	function (resultToMessage, task) {
		return $elm$core$Task$command(
			$elm$core$Task$Perform(
				A2(
					$elm$core$Task$onError,
					A2(
						$elm$core$Basics$composeL,
						A2($elm$core$Basics$composeL, $elm$core$Task$succeed, resultToMessage),
						$elm$core$Result$Err),
					A2(
						$elm$core$Task$andThen,
						A2(
							$elm$core$Basics$composeL,
							A2($elm$core$Basics$composeL, $elm$core$Task$succeed, resultToMessage),
							$elm$core$Result$Ok),
						task))));
	});
var $author$project$Editor$Constants$characterWidth = 0.6 * 14;
var $elm$browser$Browser$Dom$getViewportOf = _Browser_getViewportOf;
var $author$project$Editor$Constants$lineHeight = 24;
var $elm$browser$Browser$Dom$setViewportOf = _Browser_setViewportOf;
var $author$project$Editor$Lib$scrollToCursor = function (_v0) {
	var model = _v0.a;
	var msg = _v0.b;
	return A2(
		$author$project$Editor$Lib$addMsg,
		$elm$core$Platform$Cmd$batch(
			_List_fromArray(
				[
					A2(
					$elm$core$Task$attempt,
					function (_v1) {
						return $author$project$Editor$Msg$NoOp;
					},
					A2(
						$elm$core$Task$andThen,
						function (rendered) {
							var cursorColumn = model.travelable.cursorPosition.x * $author$project$Editor$Constants$characterWidth;
							return (_Utils_cmp(cursorColumn, rendered.viewport.x) < 0) ? A3($elm$browser$Browser$Dom$setViewportOf, 'editor-rendered', cursorColumn, rendered.viewport.height) : ((_Utils_cmp(cursorColumn, (rendered.viewport.x + rendered.viewport.width) - $author$project$Editor$Constants$characterWidth) > 0) ? A3($elm$browser$Browser$Dom$setViewportOf, 'editor-rendered', (cursorColumn - rendered.viewport.width) + $author$project$Editor$Constants$characterWidth, rendered.viewport.height) : $elm$core$Task$succeed(_Utils_Tuple0));
						},
						$elm$browser$Browser$Dom$getViewportOf('editor-rendered'))),
					A2(
					$elm$core$Task$attempt,
					function (_v2) {
						return $author$project$Editor$Msg$NoOp;
					},
					A2(
						$elm$core$Task$andThen,
						function (container) {
							var lineHeight = $author$project$Editor$Constants$lineHeight;
							var cursorLine = model.travelable.cursorPosition.y * $author$project$Editor$Constants$lineHeight;
							return (_Utils_cmp(cursorLine, model.travelable.scrollTop) < 0) ? A3($elm$browser$Browser$Dom$setViewportOf, 'editor-container', container.viewport.width, model.travelable.cursorPosition.y * lineHeight) : ((_Utils_cmp(cursorLine, (model.travelable.scrollTop + container.viewport.height) - $author$project$Editor$Constants$lineHeight) > 0) ? A3($elm$browser$Browser$Dom$setViewportOf, 'editor-container', container.viewport.width, (cursorLine - container.viewport.height) + lineHeight) : $elm$core$Task$succeed(_Utils_Tuple0));
						},
						$elm$browser$Browser$Dom$getViewportOf('editor-container')))
				])),
		_Utils_Tuple2(model, msg));
};
var $author$project$Editor$Lib$updateCursorPosition = F2(
	function (cursorPosition, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		var travelable = model.travelable;
		return $author$project$Editor$Lib$scrollToCursor(
			_Utils_Tuple2(
				_Utils_update(
					model,
					{
						completions: _List_Nil,
						travelable: _Utils_update(
							travelable,
							{cursorPosition: cursorPosition})
					}),
				$elm$core$Platform$Cmd$batch(
					A2($elm$core$List$cons, msg, _List_Nil))));
	});
var $elm$core$Basics$always = F2(
	function (a, _v0) {
		return a;
	});
var $author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile = F2(
	function (file, model) {
		return A2($elm$core$Dict$get, file, model.histories);
	});
var $author$project$Editor$Lib$syncScrollPosition = F2(
	function (nextTravelable, model) {
		return $elm$core$Platform$Cmd$batch(
			_List_fromArray(
				[
					function () {
					var _v0 = !_Utils_eq(nextTravelable.scrollLeft, model.travelable.scrollLeft);
					if (_v0) {
						return A2(
							$elm$core$Task$attempt,
							function (_v1) {
								return $author$project$Editor$Msg$NoOp;
							},
							A2(
								$elm$core$Task$andThen,
								function (container) {
									return A3($elm$browser$Browser$Dom$setViewportOf, 'editor-rendered', nextTravelable.scrollLeft, container.scene.height);
								},
								$elm$browser$Browser$Dom$getViewportOf('editor-rendered')));
					} else {
						return $elm$core$Platform$Cmd$none;
					}
				}(),
					function () {
					var _v2 = !_Utils_eq(nextTravelable.scrollTop, model.travelable.scrollTop);
					if (_v2) {
						return A2(
							$elm$core$Task$attempt,
							function (_v3) {
								return $author$project$Editor$Msg$NoOp;
							},
							A2(
								$elm$core$Task$andThen,
								function (container) {
									return A3($elm$browser$Browser$Dom$setViewportOf, 'editor-container', container.scene.width, nextTravelable.scrollTop);
								},
								$elm$browser$Browser$Dom$getViewportOf('editor-container')));
					} else {
						return $elm$core$Platform$Cmd$none;
					}
				}()
				]));
	});
var $elm$core$Dict$getMin = function (dict) {
	getMin:
	while (true) {
		if ((dict.$ === 'RBNode_elm_builtin') && (dict.d.$ === 'RBNode_elm_builtin')) {
			var left = dict.d;
			var $temp$dict = left;
			dict = $temp$dict;
			continue getMin;
		} else {
			return dict;
		}
	}
};
var $elm$core$Dict$moveRedLeft = function (dict) {
	if (((dict.$ === 'RBNode_elm_builtin') && (dict.d.$ === 'RBNode_elm_builtin')) && (dict.e.$ === 'RBNode_elm_builtin')) {
		if ((dict.e.d.$ === 'RBNode_elm_builtin') && (dict.e.d.a.$ === 'Red')) {
			var clr = dict.a;
			var k = dict.b;
			var v = dict.c;
			var _v1 = dict.d;
			var lClr = _v1.a;
			var lK = _v1.b;
			var lV = _v1.c;
			var lLeft = _v1.d;
			var lRight = _v1.e;
			var _v2 = dict.e;
			var rClr = _v2.a;
			var rK = _v2.b;
			var rV = _v2.c;
			var rLeft = _v2.d;
			var _v3 = rLeft.a;
			var rlK = rLeft.b;
			var rlV = rLeft.c;
			var rlL = rLeft.d;
			var rlR = rLeft.e;
			var rRight = _v2.e;
			return A5(
				$elm$core$Dict$RBNode_elm_builtin,
				$elm$core$Dict$Red,
				rlK,
				rlV,
				A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, lK, lV, lLeft, lRight),
					rlL),
				A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, rK, rV, rlR, rRight));
		} else {
			var clr = dict.a;
			var k = dict.b;
			var v = dict.c;
			var _v4 = dict.d;
			var lClr = _v4.a;
			var lK = _v4.b;
			var lV = _v4.c;
			var lLeft = _v4.d;
			var lRight = _v4.e;
			var _v5 = dict.e;
			var rClr = _v5.a;
			var rK = _v5.b;
			var rV = _v5.c;
			var rLeft = _v5.d;
			var rRight = _v5.e;
			if (clr.$ === 'Black') {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, rK, rV, rLeft, rRight));
			} else {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, rK, rV, rLeft, rRight));
			}
		}
	} else {
		return dict;
	}
};
var $elm$core$Dict$moveRedRight = function (dict) {
	if (((dict.$ === 'RBNode_elm_builtin') && (dict.d.$ === 'RBNode_elm_builtin')) && (dict.e.$ === 'RBNode_elm_builtin')) {
		if ((dict.d.d.$ === 'RBNode_elm_builtin') && (dict.d.d.a.$ === 'Red')) {
			var clr = dict.a;
			var k = dict.b;
			var v = dict.c;
			var _v1 = dict.d;
			var lClr = _v1.a;
			var lK = _v1.b;
			var lV = _v1.c;
			var _v2 = _v1.d;
			var _v3 = _v2.a;
			var llK = _v2.b;
			var llV = _v2.c;
			var llLeft = _v2.d;
			var llRight = _v2.e;
			var lRight = _v1.e;
			var _v4 = dict.e;
			var rClr = _v4.a;
			var rK = _v4.b;
			var rV = _v4.c;
			var rLeft = _v4.d;
			var rRight = _v4.e;
			return A5(
				$elm$core$Dict$RBNode_elm_builtin,
				$elm$core$Dict$Red,
				lK,
				lV,
				A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, llK, llV, llLeft, llRight),
				A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					lRight,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, rK, rV, rLeft, rRight)));
		} else {
			var clr = dict.a;
			var k = dict.b;
			var v = dict.c;
			var _v5 = dict.d;
			var lClr = _v5.a;
			var lK = _v5.b;
			var lV = _v5.c;
			var lLeft = _v5.d;
			var lRight = _v5.e;
			var _v6 = dict.e;
			var rClr = _v6.a;
			var rK = _v6.b;
			var rV = _v6.c;
			var rLeft = _v6.d;
			var rRight = _v6.e;
			if (clr.$ === 'Black') {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, rK, rV, rLeft, rRight));
			} else {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					$elm$core$Dict$Black,
					k,
					v,
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, rK, rV, rLeft, rRight));
			}
		}
	} else {
		return dict;
	}
};
var $elm$core$Dict$removeHelpPrepEQGT = F7(
	function (targetKey, dict, color, key, value, left, right) {
		if ((left.$ === 'RBNode_elm_builtin') && (left.a.$ === 'Red')) {
			var _v1 = left.a;
			var lK = left.b;
			var lV = left.c;
			var lLeft = left.d;
			var lRight = left.e;
			return A5(
				$elm$core$Dict$RBNode_elm_builtin,
				color,
				lK,
				lV,
				lLeft,
				A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Red, key, value, lRight, right));
		} else {
			_v2$2:
			while (true) {
				if ((right.$ === 'RBNode_elm_builtin') && (right.a.$ === 'Black')) {
					if (right.d.$ === 'RBNode_elm_builtin') {
						if (right.d.a.$ === 'Black') {
							var _v3 = right.a;
							var _v4 = right.d;
							var _v5 = _v4.a;
							return $elm$core$Dict$moveRedRight(dict);
						} else {
							break _v2$2;
						}
					} else {
						var _v6 = right.a;
						var _v7 = right.d;
						return $elm$core$Dict$moveRedRight(dict);
					}
				} else {
					break _v2$2;
				}
			}
			return dict;
		}
	});
var $elm$core$Dict$removeMin = function (dict) {
	if ((dict.$ === 'RBNode_elm_builtin') && (dict.d.$ === 'RBNode_elm_builtin')) {
		var color = dict.a;
		var key = dict.b;
		var value = dict.c;
		var left = dict.d;
		var lColor = left.a;
		var lLeft = left.d;
		var right = dict.e;
		if (lColor.$ === 'Black') {
			if ((lLeft.$ === 'RBNode_elm_builtin') && (lLeft.a.$ === 'Red')) {
				var _v3 = lLeft.a;
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					color,
					key,
					value,
					$elm$core$Dict$removeMin(left),
					right);
			} else {
				var _v4 = $elm$core$Dict$moveRedLeft(dict);
				if (_v4.$ === 'RBNode_elm_builtin') {
					var nColor = _v4.a;
					var nKey = _v4.b;
					var nValue = _v4.c;
					var nLeft = _v4.d;
					var nRight = _v4.e;
					return A5(
						$elm$core$Dict$balance,
						nColor,
						nKey,
						nValue,
						$elm$core$Dict$removeMin(nLeft),
						nRight);
				} else {
					return $elm$core$Dict$RBEmpty_elm_builtin;
				}
			}
		} else {
			return A5(
				$elm$core$Dict$RBNode_elm_builtin,
				color,
				key,
				value,
				$elm$core$Dict$removeMin(left),
				right);
		}
	} else {
		return $elm$core$Dict$RBEmpty_elm_builtin;
	}
};
var $elm$core$Dict$removeHelp = F2(
	function (targetKey, dict) {
		if (dict.$ === 'RBEmpty_elm_builtin') {
			return $elm$core$Dict$RBEmpty_elm_builtin;
		} else {
			var color = dict.a;
			var key = dict.b;
			var value = dict.c;
			var left = dict.d;
			var right = dict.e;
			if (_Utils_cmp(targetKey, key) < 0) {
				if ((left.$ === 'RBNode_elm_builtin') && (left.a.$ === 'Black')) {
					var _v4 = left.a;
					var lLeft = left.d;
					if ((lLeft.$ === 'RBNode_elm_builtin') && (lLeft.a.$ === 'Red')) {
						var _v6 = lLeft.a;
						return A5(
							$elm$core$Dict$RBNode_elm_builtin,
							color,
							key,
							value,
							A2($elm$core$Dict$removeHelp, targetKey, left),
							right);
					} else {
						var _v7 = $elm$core$Dict$moveRedLeft(dict);
						if (_v7.$ === 'RBNode_elm_builtin') {
							var nColor = _v7.a;
							var nKey = _v7.b;
							var nValue = _v7.c;
							var nLeft = _v7.d;
							var nRight = _v7.e;
							return A5(
								$elm$core$Dict$balance,
								nColor,
								nKey,
								nValue,
								A2($elm$core$Dict$removeHelp, targetKey, nLeft),
								nRight);
						} else {
							return $elm$core$Dict$RBEmpty_elm_builtin;
						}
					}
				} else {
					return A5(
						$elm$core$Dict$RBNode_elm_builtin,
						color,
						key,
						value,
						A2($elm$core$Dict$removeHelp, targetKey, left),
						right);
				}
			} else {
				return A2(
					$elm$core$Dict$removeHelpEQGT,
					targetKey,
					A7($elm$core$Dict$removeHelpPrepEQGT, targetKey, dict, color, key, value, left, right));
			}
		}
	});
var $elm$core$Dict$removeHelpEQGT = F2(
	function (targetKey, dict) {
		if (dict.$ === 'RBNode_elm_builtin') {
			var color = dict.a;
			var key = dict.b;
			var value = dict.c;
			var left = dict.d;
			var right = dict.e;
			if (_Utils_eq(targetKey, key)) {
				var _v1 = $elm$core$Dict$getMin(right);
				if (_v1.$ === 'RBNode_elm_builtin') {
					var minKey = _v1.b;
					var minValue = _v1.c;
					return A5(
						$elm$core$Dict$balance,
						color,
						minKey,
						minValue,
						left,
						$elm$core$Dict$removeMin(right));
				} else {
					return $elm$core$Dict$RBEmpty_elm_builtin;
				}
			} else {
				return A5(
					$elm$core$Dict$balance,
					color,
					key,
					value,
					left,
					A2($elm$core$Dict$removeHelp, targetKey, right));
			}
		} else {
			return $elm$core$Dict$RBEmpty_elm_builtin;
		}
	});
var $elm$core$Dict$remove = F2(
	function (key, dict) {
		var _v0 = A2($elm$core$Dict$removeHelp, key, dict);
		if ((_v0.$ === 'RBNode_elm_builtin') && (_v0.a.$ === 'Red')) {
			var _v1 = _v0.a;
			var k = _v0.b;
			var v = _v0.c;
			var l = _v0.d;
			var r = _v0.e;
			return A5($elm$core$Dict$RBNode_elm_builtin, $elm$core$Dict$Black, k, v, l, r);
		} else {
			var x = _v0;
			return x;
		}
	});
var $elm$core$Dict$update = F3(
	function (targetKey, alter, dictionary) {
		var _v0 = alter(
			A2($elm$core$Dict$get, targetKey, dictionary));
		if (_v0.$ === 'Just') {
			var value = _v0.a;
			return A3($elm$core$Dict$insert, targetKey, value, dictionary);
		} else {
			return A2($elm$core$Dict$remove, targetKey, dictionary);
		}
	});
var $author$project$Editor$Lib$updateEditor = F2(
	function (model, _v0) {
		var nextModel = _v0.a;
		var msg = _v0.b;
		var nextCurrentHistoryIndexAndHistory = A2($author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile, model.file, nextModel);
		var currentHistoryIndex = A2(
			$elm$core$Maybe$map,
			$elm$core$Tuple$first,
			A2($author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile, model.file, model));
		var hasHistoryChange = !_Utils_eq(
			currentHistoryIndex,
			A2($elm$core$Maybe$map, $elm$core$Tuple$first, nextCurrentHistoryIndexAndHistory));
		var nextTravelable = function () {
			var _v6 = _Utils_Tuple2(hasHistoryChange, nextCurrentHistoryIndexAndHistory);
			if (_v6.a && (_v6.b.$ === 'Just')) {
				var _v7 = _v6.b.a;
				var nextHistoryIndex = _v7.a;
				var nextHistory = _v7.b;
				var _v8 = A2($elm_community$list_extra$List$Extra$getAt, nextHistoryIndex, nextHistory);
				if (_v8.$ === 'Just') {
					var historicalTravelable = _v8.a;
					return historicalTravelable;
				} else {
					return model.travelable;
				}
			} else {
				return nextModel.travelable;
			}
		}();
		var updatedNextHistory = function () {
			var _v2 = _Utils_Tuple2(
				!_Utils_eq(nextModel.travelable.cursorPosition.y, model.travelable.cursorPosition.y),
				nextCurrentHistoryIndexAndHistory);
			_v2$2:
			while (true) {
				if (_v2.a) {
					if (_v2.b.$ === 'Just') {
						var _v3 = _v2.b.a;
						var nextHistoryIndex = _v3.a;
						var nextHistory = _v3.b;
						var _v4 = A2($elm_community$list_extra$List$Extra$splitAt, nextHistoryIndex, nextHistory);
						var head = _v4.a;
						var tail = _v4.b;
						return $elm$core$Maybe$Just(
							_Utils_Tuple2(
								nextHistoryIndex,
								$elm$core$List$concat(
									_List_fromArray(
										[
											head,
											_List_fromArray(
											[nextTravelable]),
											tail
										]))));
					} else {
						break _v2$2;
					}
				} else {
					if (_v2.b.$ === 'Just') {
						var _v5 = _v2.b.a;
						var nextHistoryIndex = _v5.a;
						var nextHistory = _v5.b;
						return $elm$core$Maybe$Just(
							_Utils_Tuple2(nextHistoryIndex, nextHistory));
					} else {
						break _v2$2;
					}
				}
			}
			return $elm$core$Maybe$Nothing;
		}();
		var requestChangeMessage = function () {
			if (hasHistoryChange) {
				return model.ports.requestChange(
					$author$project$Editor$Lib$renderableLinesToContents(nextTravelable.renderableLines));
			} else {
				return $elm$core$Platform$Cmd$none;
			}
		}();
		return _Utils_Tuple2(
			_Utils_update(
				nextModel,
				{
					histories: A3(
						$elm$core$Dict$update,
						model.file,
						$elm$core$Basics$always(updatedNextHistory),
						model.histories),
					travelable: nextTravelable
				}),
			$elm$core$Platform$Cmd$batch(
				_List_fromArray(
					[
						msg,
						requestChangeMessage,
						A2($author$project$Editor$Lib$syncScrollPosition, nextTravelable, model)
					])));
	});
var $elm_community$list_extra$List$Extra$updateIfIndex = F3(
	function (predicate, update, list) {
		return A2(
			$elm$core$List$indexedMap,
			F2(
				function (i, x) {
					return predicate(i) ? update(x) : x;
				}),
			list);
	});
var $author$project$Terminal$updateTerminalScrollRegion = F2(
	function (updatedScrollRegion, terminal) {
		var _v0 = terminal.activeBuffer;
		if (_v0.$ === 'Primary') {
			var buf = terminal.primaryBuffer;
			return _Utils_update(
				terminal,
				{
					primaryBuffer: _Utils_update(
						buf,
						{scrollRegion: updatedScrollRegion})
				});
		} else {
			var buf = terminal.alternateBuffer;
			return _Utils_update(
				terminal,
				{
					alternateBuffer: _Utils_update(
						buf,
						{scrollRegion: updatedScrollRegion})
				});
		}
	});
var $author$project$Terminal$run = F2(
	function (commands, model) {
		var nextTerminal = A3(
			$elm$core$List$foldl,
			F2(
				function (command, terminal) {
					var _v2 = $author$project$Terminal$getBuffer(terminal);
					var editor = _v2.a;
					var scrollRegion = _v2.b;
					var travelable = editor.travelable;
					var _v3 = travelable.cursorPosition;
					var x = _v3.x;
					var y = _v3.y;
					switch (command.$) {
						case 'TerminalCommandSequenceAndSingleStringArgument':
							var sequence = command.a;
							var arg = command.b;
							switch (sequence) {
								case 'set-icon-name-and-window-title':
									return terminal;
								case 'set-icon-name':
									return terminal;
								case 'set-window-title':
									return terminal;
								default:
									return terminal;
							}
						case 'TerminalCommandText':
							var text = command.a;
							return (text === '') ? terminal : ((_Utils_cmp(
								x + $elm$core$String$length(text),
								terminal.size.width) < 0) ? A2($author$project$Terminal$insertText, text, terminal) : A2($author$project$Terminal$insertLongText, text, terminal));
						case 'TerminalCommandSequenceAndDoubleArgument':
							var sequence = command.a;
							var arg1 = command.b;
							var arg2 = command.c;
							switch (sequence) {
								case '[H':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: arg2 - 1, y: arg1 - 1}
													})
											}),
										terminal);
								case '[r':
									return A2(
										$author$project$Terminal$updateTerminalScrollRegion,
										$elm$core$Maybe$Just(
											_Utils_Tuple2(arg1, arg2)),
										terminal);
								case '[m':
									return _Utils_update(
										terminal,
										{
											styles: A3(
												$elm$core$Dict$insert,
												'color',
												$author$project$Terminal$getAnsiColor(arg2),
												A3($elm$core$Dict$insert, 'font-weight', 'bold', terminal.styles))
										});
								default:
									var unhandled = sequence;
									return terminal;
							}
						case 'TerminalCommandSequenceAndSingleArgument':
							var sequence = command.a;
							var argument = command.b;
							switch (sequence) {
								case '[A':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: x,
															y: A2(
																$elm$core$Basics$max,
																0,
																y - A2($elm$core$Basics$max, 1, argument))
														}
													})
											}),
										terminal);
								case '[B':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: x,
															y: A2(
																$elm$core$Basics$min,
																model.size.height - 1,
																y + A2($elm$core$Basics$max, 1, argument))
														}
													})
											}),
										terminal);
								case '[C':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: A2(
																$elm$core$Basics$min,
																terminal.size.width,
																x + A2($elm$core$Basics$max, 1, argument)),
															y: y
														}
													})
											}),
										terminal);
								case '[D':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: A2(
																$elm$core$Basics$max,
																0,
																x - A2($elm$core$Basics$max, 1, argument)),
															y: y
														}
													})
											}),
										terminal);
								case '[E':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: 0,
															y: A2(
																$elm$core$Basics$min,
																model.size.height - 1,
																y + A2($elm$core$Basics$max, 1, argument))
														}
													})
											}),
										terminal);
								case '[F':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: 0,
															y: A2(
																$elm$core$Basics$max,
																0,
																y - A2($elm$core$Basics$max, 1, argument))
														}
													})
											}),
										terminal);
								case '[G':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: A2(
																$elm$core$Basics$max,
																0,
																A2($elm$core$Basics$max, 1, argument) - 1),
															y: y
														}
													})
											}),
										terminal);
								case '[d':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: x,
															y: A2(
																$elm$core$Basics$min,
																model.size.height - 1,
																A2($elm$core$Basics$max, 1, argument) - 1)
														}
													})
											}),
										terminal);
								case '[@':
									return A2($author$project$Terminal$insertSpaces, argument, terminal);
								case '[X':
									return A2($author$project$Terminal$eraseCharacters, argument, terminal);
								case '[P':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateAt,
										y,
										function (renderableLine) {
											return _Utils_update(
												renderableLine,
												{
													text: A3($author$project$Terminal$deleteCharacters, x, argument, renderableLine.text)
												});
										},
										travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[L':
									return A2($author$project$Terminal$insertLines, argument, terminal);
								case '[M':
									return A2($author$project$Terminal$deleteLines, argument, terminal);
								case '[T':
									var len = $elm$core$List$length(travelable.renderableLines);
									var nextRenderableLines = $elm$core$Array$toList(
										A3(
											$elm$core$Array$slice,
											0,
											len,
											$elm$core$Array$fromList(
												$elm$core$List$concat(
													_List_fromArray(
														[
															A2(
															$elm$core$List$repeat,
															argument,
															A2($author$project$Editor$Lib$createRenderableLine, 0, '')),
															travelable.renderableLines
														])))));
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[S':
									var len = $elm$core$List$length(travelable.renderableLines);
									var nextRenderableLines = $elm$core$Array$toList(
										A3(
											$elm$core$Array$slice,
											argument,
											len + argument,
											$elm$core$Array$fromList(
												$elm$core$List$concat(
													_List_fromArray(
														[
															travelable.renderableLines,
															A2(
															$elm$core$List$repeat,
															argument,
															A2($author$project$Editor$Lib$createRenderableLine, 0, ''))
														])))));
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[m-fg-256':
									return _Utils_update(
										terminal,
										{
											styles: A3(
												$elm$core$Dict$insert,
												'font-weight',
												'normal',
												A3(
													$elm$core$Dict$insert,
													'color',
													'#' + $author$project$Terminal$EightBitColors$getColorByNumber(argument),
													terminal.styles))
										});
								case '[m-bg-256':
									return _Utils_update(
										terminal,
										{
											styles: A3(
												$elm$core$Dict$insert,
												'font-weight',
												'normal',
												A3(
													$elm$core$Dict$insert,
													'background',
													'#' + $author$project$Terminal$EightBitColors$getColorByNumber(argument),
													terminal.styles))
										});
								case '[m':
									return _Utils_update(
										terminal,
										{
											styles: A2($author$project$Terminal$setAnsiStyle, argument, terminal.styles)
										});
								default:
									var unhandled = sequence;
									return terminal;
							}
						case 'TerminalCommandSequenceAndTripleArgument':
							var sequence = command.a;
							var arg1 = command.b;
							var arg2 = command.c;
							var arg3 = command.d;
							switch (sequence) {
								case '[m-bg-rgb':
									return _Utils_update(
										terminal,
										{
											styles: A3(
												$elm$core$Dict$insert,
												'background',
												'rgb(' + ($elm$core$String$fromInt(arg1) + (',' + ($elm$core$String$fromInt(arg2) + (',' + ($elm$core$String$fromInt(arg3) + ')'))))),
												terminal.styles)
										});
								case '[m-fg-rgb':
									return _Utils_update(
										terminal,
										{
											styles: A3(
												$elm$core$Dict$insert,
												'color',
												'rgb(' + ($elm$core$String$fromInt(arg1) + (',' + ($elm$core$String$fromInt(arg2) + (',' + ($elm$core$String$fromInt(arg3) + ')'))))),
												terminal.styles)
										});
								default:
									var unhandled = sequence;
									return terminal;
							}
						default:
							var sequence = command.a;
							switch (sequence) {
								case '\n':
									return A2($author$project$Terminal$newLine, model.size, terminal);
								case 'E':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: 0, y: y + 1}
													})
											}),
										terminal);
								case 'D':
									return A2($author$project$Terminal$index, model.size, terminal);
								case 'M':
									return A2($author$project$Terminal$reverseIndex, model.size, terminal);
								case '\u0008':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: A2($elm$core$Basics$max, 0, x - 1),
															y: y
														}
													})
											}),
										terminal);
								case '\u000D':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: 0, y: y}
													})
											}),
										terminal);
								case '#8':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: 0, y: 0},
														renderableLines: $author$project$Editor$Lib$contentsToRenderableLines(
															A2(
																$elm$core$String$repeat,
																model.size.height,
																A2($elm$core$String$repeat, model.size.width, 'E') + '\n'))
													})
											}),
										terminal);
								case '[E':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: 0,
															y: A2($elm$core$Basics$min, model.size.height - 1, y + 1)
														}
													})
											}),
										terminal);
								case '[F':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: 0,
															y: A2($elm$core$Basics$max, 0, y - 1)
														}
													})
											}),
										terminal);
								case '[H':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: 0, y: 0}
													})
											}),
										terminal);
								case '[K':
									var nextRenderableLines = A4($author$project$Terminal$eraseLineFromCursorToEnd, model.size.width, x, y, travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[0K':
									var nextRenderableLines = A4($author$project$Terminal$eraseLineFromCursorToEnd, model.size.width, x, y, travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[1K':
									var nextRenderableLines = A4($author$project$Terminal$eraseLineFromStartToCursor, model.size.width, x, y, travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[2K':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateAt,
										y,
										function (renderableLine) {
											return _Utils_update(
												renderableLine,
												{
													text: A2($elm$core$String$repeat, model.size.width, ' ')
												});
										},
										travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[L':
									return A2($author$project$Terminal$insertLines, 1, terminal);
								case '[M':
									return A2($author$project$Terminal$deleteLines, 1, terminal);
								case '[J':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateIfIndex,
										function (i) {
											return _Utils_cmp(i, y) > 0;
										},
										function (line) {
											return _Utils_update(
												line,
												{
													multilineSymbols: _List_Nil,
													text: A2($elm$core$String$repeat, model.size.width, ' ')
												});
										},
										A4($author$project$Terminal$eraseLineFromCursorToEnd, model.size.width, x, y, travelable.renderableLines));
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[0J':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateIfIndex,
										function (i) {
											return _Utils_cmp(i, y) > 0;
										},
										function (line) {
											return _Utils_update(
												line,
												{
													multilineSymbols: _List_Nil,
													text: A2($elm$core$String$repeat, model.size.width, ' ')
												});
										},
										A4($author$project$Terminal$eraseLineFromCursorToEnd, model.size.width, x, y, travelable.renderableLines));
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[1J':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateIfIndex,
										function (i) {
											return _Utils_cmp(i, y) < 0;
										},
										function (line) {
											return _Utils_update(
												line,
												{
													multilineSymbols: _List_Nil,
													text: A2($elm$core$String$repeat, model.size.width, ' ')
												});
										},
										A4($author$project$Terminal$eraseLineFromStartToCursor, model.size.width, x, y, travelable.renderableLines));
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								case '[2J':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														renderableLines: $author$project$Editor$Lib$contentsToRenderableLines(
															A2(
																$elm$core$String$repeat,
																model.size.height,
																A2($elm$core$String$repeat, model.size.width, ' ') + '\n'))
													})
											}),
										terminal);
								case '[?1049h':
									return _Utils_update(
										terminal,
										{
											activeBuffer: $author$project$Terminal$Types$Alternate,
											alternateBuffer: A2($author$project$Terminal$makeEmptyBuffer, terminal.size, $author$project$Terminal$terminalBufferPorts)
										});
								case '[?1049l':
									return _Utils_update(
										terminal,
										{activeBuffer: $author$project$Terminal$Types$Primary});
								case '[4m':
									return _Utils_update(
										terminal,
										{
											styles: A3($elm$core$Dict$insert, 'text-decoration', 'underline', terminal.styles)
										});
								case '[0m':
									return _Utils_update(
										terminal,
										{
											styles: $elm$core$Dict$fromList(_List_Nil)
										});
								case '[49m':
									return _Utils_update(
										terminal,
										{
											styles: $elm$core$Dict$fromList(_List_Nil)
										});
								case '[m':
									return _Utils_update(
										terminal,
										{
											styles: $elm$core$Dict$fromList(_List_Nil)
										});
								case '[A':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: x,
															y: A2($elm$core$Basics$max, 0, y - 1)
														}
													})
											}),
										terminal);
								case '[B':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: x,
															y: A2($elm$core$Basics$min, model.size.height - 1, y + 1)
														}
													})
											}),
										terminal);
								case '[C':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: x + 1, y: y}
													})
											}),
										terminal);
								case '[D':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {
															x: A2($elm$core$Basics$max, 0, x - 1),
															y: y
														}
													})
											}),
										terminal);
								case '[G':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: 0, y: y}
													})
											}),
										terminal);
								case '[d':
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{
														cursorPosition: {x: x, y: 0}
													})
											}),
										terminal);
								case '[@':
									return A2($author$project$Terminal$insertSpaces, 1, terminal);
								case '[X':
									return A2($author$project$Terminal$eraseCharacters, 1, terminal);
								case '[P':
									var nextRenderableLines = A3(
										$elm_community$list_extra$List$Extra$updateAt,
										y,
										function (renderableLine) {
											return _Utils_update(
												renderableLine,
												{
													text: A3($author$project$Terminal$deleteCharacters, x, 1, renderableLine.text)
												});
										},
										travelable.renderableLines);
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{
												travelable: _Utils_update(
													travelable,
													{renderableLines: nextRenderableLines})
											}),
										terminal);
								default:
									var unhandled = sequence;
									return terminal;
							}
					}
				}),
			model,
			commands);
		var _v0 = $author$project$Terminal$getBuffer(nextTerminal);
		var nextTerminalEditor = _v0.a;
		var _v1 = A2(
			$author$project$Editor$Lib$updateEditor,
			nextTerminalEditor,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				nextTerminalEditor.travelable.cursorPosition,
				$author$project$Editor$Lib$startUpdateEditor(
					_Utils_update(
						nextTerminalEditor,
						{travelable: nextTerminalEditor.travelable}))));
		var nextEditor = _v1.a;
		var editorMsgs = _v1.b;
		return _Utils_Tuple2(
			A2($author$project$Terminal$updateTerminalEditor, nextEditor, nextTerminal),
			editorMsgs);
	});
var $author$project$Terminal$Types$NoOp = {$: 'NoOp'};
var $author$project$Terminal$scrollToBottom = function (id) {
	return A2(
		$elm$core$Task$attempt,
		function (_v0) {
			return $author$project$Terminal$Types$NoOp;
		},
		A2(
			$elm$core$Task$andThen,
			function (info) {
				return A3($elm$browser$Browser$Dom$setViewportOf, id, 0, info.scene.height);
			},
			$elm$browser$Browser$Dom$getViewportOf(id)));
};
var $author$project$Editor$Msg$Selecting = {$: 'Selecting'};
var $author$project$Editor$Lib$updateSelection = F2(
	function (selection, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				model,
				{selection: selection}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$Lib$handleSelectionUpdate = F3(
	function (model, spot, selection) {
		var _v0 = selection;
		var start = _v0.a;
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				spot,
				A2(
					$author$project$Editor$Lib$updateSelection,
					$elm$core$Maybe$Just(
						_Utils_Tuple2(start, spot)),
					$author$project$Editor$Lib$startUpdateEditor(model))));
	});
var $author$project$Editor$Lib$getTopCoordinate = F2(
	function (a, b) {
		return (_Utils_cmp(a.y, b.y) < 0) ? a : (_Utils_eq(a.y, b.y) ? ((_Utils_cmp(a.x, b.x) < 0) ? a : b) : b);
	});
var $author$project$Editor$Lib$getBottomCoordinate = F2(
	function (a, b) {
		var _v0 = _Utils_eq(
			A2($author$project$Editor$Lib$getTopCoordinate, b, a),
			a);
		if (_v0) {
			return b;
		} else {
			return a;
		}
	});
var $author$project$Editor$Lib$orderSelectionCoordinates = function (_v0) {
	var a = _v0.a;
	var b = _v0.b;
	return _Utils_Tuple2(
		A2($author$project$Editor$Lib$getTopCoordinate, a, b),
		A2($author$project$Editor$Lib$getBottomCoordinate, a, b));
};
var $author$project$Editor$Clipboard$cut = function (model) {
	var _v0 = model.selection;
	if (_v0.$ === 'Just') {
		var selected = _v0.a;
		var travelable = model.travelable;
		var _v1 = $author$project$Editor$Lib$orderSelectionCoordinates(selected);
		var start = _v1.a;
		var end = _v1.b;
		var endLine = A2($elm$core$Basics$max, start.y, end.y);
		var afterHighlight = A2($elm$core$List$drop, endLine + 1, model.travelable.renderableLines);
		var startLine = A2($elm$core$Basics$min, start.y, end.y);
		var _v2 = A3(
			$elm$core$List$foldl,
			F2(
				function (lineNumber, _v3) {
					var acc = _v3.a;
					var lines = _v3.b;
					if (_Utils_eq(lineNumber, start.y)) {
						if (_Utils_cmp(start.y, end.y) < 0) {
							var _v4 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
							if (_v4.$ === 'Just') {
								var renderableLine = _v4.a;
								var without = A3($elm$core$String$slice, 0, start.x, renderableLine.text);
								var text = A3(
									$elm$core$String$slice,
									start.x,
									$elm$core$String$length(renderableLine.text),
									renderableLine.text) + '\n';
								return _Utils_Tuple2(
									_Utils_ap(acc, text),
									A2(
										$elm$core$List$append,
										lines,
										_List_fromArray(
											[
												_Utils_update(
												renderableLine,
												{text: without})
											])));
							} else {
								return _Utils_Tuple2(acc, lines);
							}
						} else {
							if (_Utils_eq(start.y, end.y)) {
								var _v5 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
								if (_v5.$ === 'Just') {
									var renderableLine = _v5.a;
									var without = _Utils_ap(
										A3(
											$elm$core$String$slice,
											0,
											A2($elm$core$Basics$min, start.x, end.x),
											renderableLine.text),
										A3(
											$elm$core$String$slice,
											A2($elm$core$Basics$max, start.x, end.x) + 1,
											$elm$core$String$length(renderableLine.text),
											renderableLine.text));
									var text = A3(
										$elm$core$String$slice,
										A2($elm$core$Basics$min, start.x, end.x),
										A2($elm$core$Basics$max, start.x, end.x) + 1,
										renderableLine.text);
									return _Utils_Tuple2(
										_Utils_ap(acc, text),
										A2(
											$elm$core$List$append,
											lines,
											_List_fromArray(
												[
													_Utils_update(
													renderableLine,
													{text: without})
												])));
								} else {
									return _Utils_Tuple2(acc, lines);
								}
							} else {
								var _v6 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
								if (_v6.$ === 'Just') {
									var renderableLine = _v6.a;
									var without = A3(
										$elm$core$String$slice,
										start.x + 1,
										$elm$core$String$length(renderableLine.text),
										renderableLine.text);
									var text = A3($elm$core$String$slice, 0, start.x + 1, renderableLine.text);
									return _Utils_Tuple2(
										_Utils_ap(acc, text),
										A2(
											$elm$core$List$append,
											lines,
											_List_fromArray(
												[
													_Utils_update(
													renderableLine,
													{text: without})
												])));
								} else {
									return _Utils_Tuple2(acc, lines);
								}
							}
						}
					} else {
						if (_Utils_eq(lineNumber, end.y)) {
							if (_Utils_cmp(start.y, end.y) < 0) {
								var _v7 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
								if (_v7.$ === 'Just') {
									var renderableLine = _v7.a;
									var without = A3(
										$elm$core$String$slice,
										end.x + 1,
										$elm$core$String$length(renderableLine.text),
										renderableLine.text);
									var text = A3($elm$core$String$slice, 0, end.x + 1, renderableLine.text);
									return _Utils_Tuple2(
										_Utils_ap(acc, text),
										A2(
											$elm$core$List$append,
											lines,
											_List_fromArray(
												[
													_Utils_update(
													renderableLine,
													{text: without})
												])));
								} else {
									return _Utils_Tuple2(acc, lines);
								}
							} else {
								if (_Utils_eq(start.y, end.y)) {
									var _v8 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
									if (_v8.$ === 'Just') {
										var renderableLine = _v8.a;
										var without = _Utils_ap(
											A3(
												$elm$core$String$slice,
												0,
												A2($elm$core$Basics$min, start.x, end.x),
												renderableLine.text),
											A3(
												$elm$core$String$slice,
												A2($elm$core$Basics$max, start.x, end.x),
												$elm$core$String$length(renderableLine.text),
												renderableLine.text));
										var text = A3(
											$elm$core$String$slice,
											A2($elm$core$Basics$min, start.x, end.x),
											A2($elm$core$Basics$max, start.x, end.x),
											renderableLine.text);
										return _Utils_Tuple2(
											_Utils_ap(acc, text),
											A2(
												$elm$core$List$append,
												lines,
												_List_fromArray(
													[
														_Utils_update(
														renderableLine,
														{text: without})
													])));
									} else {
										return _Utils_Tuple2(acc, lines);
									}
								} else {
									var _v9 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
									if (_v9.$ === 'Just') {
										var renderableLine = _v9.a;
										var without = A3($elm$core$String$slice, 0, end.x, renderableLine.text);
										var text = A3(
											$elm$core$String$slice,
											end.x,
											$elm$core$String$length(renderableLine.text),
											renderableLine.text) + '\n';
										return _Utils_Tuple2(
											_Utils_ap(acc, text),
											A2(
												$elm$core$List$append,
												lines,
												_List_fromArray(
													[
														_Utils_update(
														renderableLine,
														{text: without})
													])));
									} else {
										return _Utils_Tuple2(acc, lines);
									}
								}
							}
						} else {
							var _v10 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, model.travelable.renderableLines);
							if (_v10.$ === 'Just') {
								var renderableLine = _v10.a;
								var text = renderableLine.text + '\n';
								return _Utils_Tuple2(
									_Utils_ap(acc, text),
									lines);
							} else {
								return _Utils_Tuple2(acc, lines);
							}
						}
					}
				}),
			_Utils_Tuple2('', _List_Nil),
			A2($elm$core$List$range, startLine, endLine));
		var selection = _v2.a;
		var slines = _v2.b;
		var beforeHighlight = A2($elm$core$List$take, startLine, model.travelable.renderableLines);
		var _v11 = !_Utils_eq(start.y, end.y);
		if (_v11) {
			var text = A2(
				$elm$core$String$join,
				'',
				A2(
					$elm$core$List$map,
					function ($) {
						return $.text;
					},
					slines));
			return _Utils_Tuple2(
				selection,
				_Utils_update(
					travelable,
					{
						cursorPosition: (_Utils_cmp(start.y, end.y) < 0) ? start : ((_Utils_cmp(start.x, end.x) < 0) ? start : end),
						renderableLines: $elm$core$List$concat(
							_List_fromArray(
								[
									beforeHighlight,
									_List_fromArray(
									[
										A2(
										$author$project$Editor$Lib$createRenderableLine,
										$elm$core$List$length(model.travelable.renderableLines),
										text)
									]),
									afterHighlight
								]))
					}));
		} else {
			return _Utils_Tuple2(
				selection,
				_Utils_update(
					travelable,
					{
						cursorPosition: start,
						renderableLines: $elm$core$List$concat(
							_List_fromArray(
								[beforeHighlight, slines, afterHighlight]))
					}));
		}
	} else {
		return _Utils_Tuple2('', model.travelable);
	}
};
var $elm_community$string_extra$String$Extra$replaceSlice = F4(
	function (substitution, start, end, string) {
		return _Utils_ap(
			A3($elm$core$String$slice, 0, start, string),
			_Utils_ap(
				substitution,
				A3(
					$elm$core$String$slice,
					end,
					$elm$core$String$length(string),
					string)));
	});
var $elm_community$string_extra$String$Extra$insertAt = F3(
	function (insert, pos, string) {
		return A4($elm_community$string_extra$String$Extra$replaceSlice, insert, pos, pos, string);
	});
var $author$project$Editor$Lib$withRequestChange = function (_v0) {
	var model = _v0.a;
	var msg = _v0.b;
	return A2(
		$author$project$Editor$Lib$addMsg,
		model.ports.requestChange(
			$author$project$Editor$Lib$renderableLinesToContents(model.travelable.renderableLines)),
		_Utils_Tuple2(model, msg));
};
var $author$project$Editor$Lib$updateRenderableLines = F2(
	function (renderableLines, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		var travelable = model.travelable;
		return $author$project$Editor$Lib$withRequestChange(
			_Utils_Tuple2(
				_Utils_update(
					model,
					{
						travelable: _Utils_update(
							travelable,
							{renderableLines: renderableLines})
					}),
				msg));
	});
var $author$project$Editor$Clipboard$paste = F2(
	function (model, pasted) {
		paste:
		while (true) {
			var pastedRenderableLines = $author$project$Editor$Lib$contentsToRenderableLines(pasted);
			var _v0 = model.travelable.cursorPosition;
			var x = _v0.x;
			var y = _v0.y;
			var _v1 = model.selection;
			if (_v1.$ === 'Nothing') {
				var _v2 = $elm$core$List$length(pastedRenderableLines);
				if (_v2 === 1) {
					var travelable = model.travelable;
					return _Utils_update(
						model,
						{
							travelable: _Utils_update(
								travelable,
								{
									cursorPosition: {
										x: x + $elm$core$String$length(pasted),
										y: y
									},
									renderableLines: A3(
										$elm_community$list_extra$List$Extra$updateAt,
										y,
										function (line) {
											return _Utils_update(
												line,
												{
													text: A3($elm_community$string_extra$String$Extra$insertAt, pasted, x, line.text)
												});
										},
										model.travelable.renderableLines)
								})
						});
				} else {
					var yLine = A2(
						$elm$core$Maybe$withDefault,
						A2(
							$author$project$Editor$Lib$createRenderableLine,
							$elm$core$List$length(model.travelable.renderableLines),
							''),
						A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines));
					var secondHalfYLine = A3(
						$elm$core$String$slice,
						x,
						$elm$core$String$length(yLine.text),
						yLine.text);
					var middleLinesOfPasted = $elm$core$List$reverse(
						A2(
							$elm$core$Maybe$withDefault,
							_List_Nil,
							$elm$core$List$tail(
								$elm$core$List$reverse(
									A2(
										$elm$core$Maybe$withDefault,
										_List_Nil,
										$elm$core$List$tail(pastedRenderableLines))))));
					var lastLineOfPastedText = A2(
						$elm$core$Maybe$withDefault,
						'',
						A2(
							$elm$core$Maybe$map,
							function ($) {
								return $.text;
							},
							$elm_community$list_extra$List$Extra$last(pastedRenderableLines)));
					var firstLineOfPastedText = A2(
						$elm$core$Maybe$withDefault,
						'',
						A2(
							$elm$core$Maybe$map,
							function ($) {
								return $.text;
							},
							$elm$core$List$head(pastedRenderableLines)));
					var firstHalfYLine = A3($elm$core$String$slice, 0, x, yLine.text);
					var beforeYLine = A2($elm$core$List$take, y, model.travelable.renderableLines);
					var afterYLine = A2($elm$core$List$drop, y + 1, model.travelable.renderableLines);
					var nextRenderableLines = $elm$core$List$concat(
						_List_fromArray(
							[
								beforeYLine,
								_List_fromArray(
								[
									_Utils_update(
									yLine,
									{
										text: _Utils_ap(firstHalfYLine, firstLineOfPastedText)
									})
								]),
								middleLinesOfPasted,
								_List_fromArray(
								[
									_Utils_update(
									yLine,
									{
										text: _Utils_ap(lastLineOfPastedText, secondHalfYLine)
									})
								]),
								afterYLine
							]));
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateCursorPosition,
							{
								x: $elm$core$String$length(lastLineOfPastedText),
								y: (y + $elm$core$List$length(pastedRenderableLines)) - 1
							},
							A2(
								$author$project$Editor$Lib$updateRenderableLines,
								nextRenderableLines,
								$author$project$Editor$Lib$startUpdateEditor(model)))).a;
				}
			} else {
				var travelable = model.travelable;
				var _v3 = $author$project$Editor$Clipboard$cut(model);
				var nextTravelable = _v3.b;
				var $temp$model = _Utils_update(
					model,
					{
						selection: $elm$core$Maybe$Nothing,
						travelable: _Utils_update(
							travelable,
							{cursorPosition: nextTravelable.cursorPosition, renderableLines: nextTravelable.renderableLines})
					}),
					$temp$pasted = pasted;
				model = $temp$model;
				pasted = $temp$pasted;
				continue paste;
			}
		}
	});
var $author$project$Editor$Msg$Completion = F2(
	function (label, textEdit) {
		return {label: label, textEdit: textEdit};
	});
var $author$project$Editor$Msg$TextEdit = F2(
	function (newText, range) {
		return {newText: newText, range: range};
	});
var $author$project$Editor$Msg$Range = F2(
	function (start, end) {
		return {end: end, start: start};
	});
var $author$project$Editor$Msg$Position = F2(
	function (line, character) {
		return {character: character, line: line};
	});
var $author$project$Editor$Decoders$decodePosition = A3(
	$elm$json$Json$Decode$map2,
	$author$project$Editor$Msg$Position,
	A2($elm$json$Json$Decode$field, 'line', $elm$json$Json$Decode$int),
	A2($elm$json$Json$Decode$field, 'character', $elm$json$Json$Decode$int));
var $author$project$Editor$Decoders$decodeRange = A3(
	$elm$json$Json$Decode$map2,
	$author$project$Editor$Msg$Range,
	A2($elm$json$Json$Decode$field, 'start', $author$project$Editor$Decoders$decodePosition),
	A2($elm$json$Json$Decode$field, 'end', $author$project$Editor$Decoders$decodePosition));
var $author$project$Editor$Completions$decodeTextEdit = A3(
	$elm$json$Json$Decode$map2,
	$author$project$Editor$Msg$TextEdit,
	A2($elm$json$Json$Decode$field, 'newText', $elm$json$Json$Decode$string),
	A2($elm$json$Json$Decode$field, 'range', $author$project$Editor$Decoders$decodeRange));
var $elm$json$Json$Decode$maybe = function (decoder) {
	return $elm$json$Json$Decode$oneOf(
		_List_fromArray(
			[
				A2($elm$json$Json$Decode$map, $elm$core$Maybe$Just, decoder),
				$elm$json$Json$Decode$succeed($elm$core$Maybe$Nothing)
			]));
};
var $author$project$Editor$Completions$decodeJson = $elm$json$Json$Decode$list(
	A3(
		$elm$json$Json$Decode$map2,
		$author$project$Editor$Msg$Completion,
		A2($elm$json$Json$Decode$field, 'label', $elm$json$Json$Decode$string),
		$elm$json$Json$Decode$maybe(
			A2($elm$json$Json$Decode$field, 'textEdit', $author$project$Editor$Completions$decodeTextEdit))));
var $elm$core$List$filter = F2(
	function (isGood, list) {
		return A3(
			$elm$core$List$foldr,
			F2(
				function (x, xs) {
					return isGood(x) ? A2($elm$core$List$cons, x, xs) : xs;
				}),
			_List_Nil,
			list);
	});
var $elm$core$Maybe$andThen = F2(
	function (callback, maybeValue) {
		if (maybeValue.$ === 'Just') {
			var value = maybeValue.a;
			return callback(value);
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $elm$regex$Regex$Match = F4(
	function (match, index, number, submatches) {
		return {index: index, match: match, number: number, submatches: submatches};
	});
var $elm$regex$Regex$findAtMost = _Regex_findAtMost;
var $elm$regex$Regex$fromStringWith = _Regex_fromStringWith;
var $elm$regex$Regex$fromString = function (string) {
	return A2(
		$elm$regex$Regex$fromStringWith,
		{caseInsensitive: false, multiline: false},
		string);
};
var $elm$regex$Regex$never = _Regex_never;
var $elm$core$String$reverse = _String_reverse;
var $author$project$Editor$Syntax$Util$getCurrentToken = F3(
	function (x, y, renderableLines) {
		return A2(
			$elm$core$Maybe$withDefault,
			'',
			A2(
				$elm$core$Maybe$map,
				$elm$core$String$reverse,
				A2(
					$elm$core$Maybe$map,
					function ($) {
						return $.match;
					},
					A2(
						$elm$core$Maybe$andThen,
						$elm$core$List$head,
						A2(
							$elm$core$Maybe$map,
							A2(
								$elm$regex$Regex$findAtMost,
								1,
								A2(
									$elm$core$Maybe$withDefault,
									$elm$regex$Regex$never,
									$elm$regex$Regex$fromString('[^\\s]+'))),
							A2(
								$elm$core$Maybe$map,
								$elm$core$String$reverse,
								A2(
									$elm$core$Maybe$map,
									A2($elm$core$String$slice, 0, x),
									A2(
										$elm$core$Maybe$map,
										function ($) {
											return $.text;
										},
										A2($elm_community$list_extra$List$Extra$getAt, y, renderableLines)))))))));
	});
var $author$project$Editor$Lib$updateCompletions = F2(
	function (completions, _v0) {
		var state = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				state,
				{completions: completions}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$Completions$update = F2(
	function (json, model) {
		var _v0 = A2($elm$json$Json$Decode$decodeValue, $author$project$Editor$Completions$decodeJson, json);
		if (_v0.$ === 'Ok') {
			var completions = _v0.a;
			var _v1 = model.travelable.cursorPosition;
			var x = _v1.x;
			var y = _v1.y;
			var token = A3($author$project$Editor$Syntax$Util$getCurrentToken, x, y, model.travelable.renderableLines);
			var filteredCompletions = function () {
				if (token === '') {
					return completions;
				} else {
					return A2(
						$elm$core$List$filter,
						function (completion) {
							return A2($elm$core$String$startsWith, token, completion.label);
						},
						completions);
				}
			}();
			return A2(
				$author$project$Editor$Lib$updateEditor,
				model,
				A2(
					$author$project$Editor$Lib$updateCompletions,
					filteredCompletions,
					$author$project$Editor$Lib$startUpdateEditor(model)));
		} else {
			var error = _v0.a;
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		}
	});
var $author$project$Editor$Msg$Error = F3(
	function (line, col, message) {
		return {col: col, line: line, message: message};
	});
var $author$project$Editor$Errors$decodeJson = $elm$json$Json$Decode$list(
	A4(
		$elm$json$Json$Decode$map3,
		$author$project$Editor$Msg$Error,
		A2($elm$json$Json$Decode$field, 'line', $elm$json$Json$Decode$int),
		A2(
			$elm$json$Json$Decode$field,
			'col',
			$elm$json$Json$Decode$maybe($elm$json$Json$Decode$int)),
		A2($elm$json$Json$Decode$field, 'message', $elm$json$Json$Decode$string)));
var $author$project$Editor$Lib$updateErrors = F2(
	function (errors, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		var travelable = model.travelable;
		var _v1 = _Utils_eq(errors, model.errors);
		if (_v1) {
			return _Utils_Tuple2(
				model,
				$elm$core$Platform$Cmd$batch(
					A2($elm$core$List$cons, msg, _List_Nil)));
		} else {
			var nextRenderableLines = A2(
				$elm$core$List$indexedMap,
				F2(
					function (lineNumber, renderableLine) {
						var lineErrors = A2(
							$elm$core$List$filter,
							function (err) {
								return _Utils_eq(err.line, lineNumber);
							},
							errors);
						return _Utils_update(
							renderableLine,
							{errors: lineErrors});
					}),
				model.travelable.renderableLines);
			return _Utils_Tuple2(
				_Utils_update(
					model,
					{
						errors: errors,
						travelable: _Utils_update(
							travelable,
							{renderableLines: nextRenderableLines})
					}),
				$elm$core$Platform$Cmd$batch(
					A2($elm$core$List$cons, msg, _List_Nil)));
		}
	});
var $author$project$Editor$Errors$update = F2(
	function (json, model) {
		var _v0 = A2($elm$json$Json$Decode$decodeValue, $author$project$Editor$Errors$decodeJson, json);
		if (_v0.$ === 'Ok') {
			var errors = _v0.a;
			return A2(
				$author$project$Editor$Lib$updateEditor,
				model,
				A2(
					$author$project$Editor$Lib$updateErrors,
					errors,
					$author$project$Editor$Lib$startUpdateEditor(model)));
		} else {
			var error = _v0.a;
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		}
	});
var $author$project$Editor$Clipboard$copy = function (editor) {
	var _v0 = editor.selection;
	if (_v0.$ === 'Just') {
		var _v1 = _v0.a;
		var start = _v1.a;
		var end = _v1.b;
		var startLine = A2($elm$core$Basics$min, start.y, end.y);
		var endLine = A2($elm$core$Basics$max, start.y, end.y);
		return A3(
			$elm$core$List$foldl,
			F2(
				function (lineNumber, acc) {
					if (_Utils_eq(lineNumber, start.y)) {
						if (_Utils_cmp(start.y, end.y) < 0) {
							var _v2 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
							if (_v2.$ === 'Just') {
								var renderableLine = _v2.a;
								return acc + (A3(
									$elm$core$String$slice,
									start.x,
									$elm$core$String$length(renderableLine.text),
									renderableLine.text) + '\n');
							} else {
								return acc;
							}
						} else {
							if (_Utils_eq(start.y, end.y)) {
								var _v3 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
								if (_v3.$ === 'Just') {
									var renderableLine = _v3.a;
									return _Utils_ap(
										acc,
										A3(
											$elm$core$String$slice,
											A2($elm$core$Basics$min, start.x, end.x),
											A2($elm$core$Basics$max, start.x, end.x) + 1,
											renderableLine.text));
								} else {
									return acc;
								}
							} else {
								var _v4 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
								if (_v4.$ === 'Just') {
									var renderableLine = _v4.a;
									return _Utils_ap(
										acc,
										A3($elm$core$String$slice, 0, start.x + 1, renderableLine.text));
								} else {
									return acc;
								}
							}
						}
					} else {
						if (_Utils_eq(lineNumber, end.y)) {
							if (_Utils_cmp(start.y, end.y) < 0) {
								var _v5 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
								if (_v5.$ === 'Just') {
									var renderableLine = _v5.a;
									return _Utils_ap(
										acc,
										A3($elm$core$String$slice, 0, end.x + 1, renderableLine.text));
								} else {
									return acc;
								}
							} else {
								if (_Utils_eq(start.y, end.y)) {
									var _v6 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
									if (_v6.$ === 'Just') {
										var renderableLine = _v6.a;
										return _Utils_ap(
											acc,
											A3(
												$elm$core$String$slice,
												A2($elm$core$Basics$min, start.x, end.x),
												A2($elm$core$Basics$max, start.x, end.x),
												renderableLine.text));
									} else {
										return acc;
									}
								} else {
									var _v7 = A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines);
									if (_v7.$ === 'Just') {
										var renderableLine = _v7.a;
										return acc + (A3(
											$elm$core$String$slice,
											end.x,
											$elm$core$String$length(renderableLine.text),
											renderableLine.text) + '\n');
									} else {
										return acc;
									}
								}
							}
						} else {
							return acc + (A2(
								$elm$core$Maybe$withDefault,
								'',
								A2(
									$elm$core$Maybe$map,
									function ($) {
										return $.text;
									},
									A2($elm_community$list_extra$List$Extra$getAt, lineNumber, editor.travelable.renderableLines))) + '\n');
						}
					}
				}),
			'',
			A2($elm$core$List$range, startLine, endLine));
	} else {
		return '';
	}
};
var $author$project$Editor$Lib$goBackwardInHistory = function (_v0) {
	var model = _v0.a;
	var cmds = _v0.b;
	return _Utils_Tuple2(
		_Utils_update(
			model,
			{
				histories: A3(
					$elm$core$Dict$update,
					model.file,
					$elm$core$Maybe$map(
						function (_v1) {
							var index = _v1.a;
							var history = _v1.b;
							return _Utils_Tuple2(
								A2($elm$core$Basics$max, 0, index - 1),
								history);
						}),
					model.histories)
			}),
		cmds);
};
var $author$project$Editor$Lib$snapshotTravelableHistory = function (model) {
	var nextHistories = function () {
		var _v0 = A2($author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile, model.file, model);
		if (_v0.$ === 'Just') {
			var _v1 = _v0.a;
			var index = _v1.a;
			var history = _v1.b;
			var _v2 = _Utils_eq(
				$elm$core$Maybe$Just(model.travelable),
				A2($elm_community$list_extra$List$Extra$getAt, index, history));
			if (_v2) {
				return model.histories;
			} else {
				var _v3 = A2($elm_community$list_extra$List$Extra$splitAt, index, history);
				var head = _v3.a;
				var tail = _v3.b;
				return A3(
					$elm$core$Dict$update,
					model.file,
					$elm$core$Basics$always(
						$elm$core$Maybe$Just(
							_Utils_Tuple2(
								index,
								$elm$core$List$concat(
									_List_fromArray(
										[
											head,
											_List_fromArray(
											[model.travelable]),
											tail
										]))))),
					model.histories);
			}
		} else {
			return model.histories;
		}
	}();
	return _Utils_update(
		model,
		{histories: nextHistories});
};
var $author$project$Editor$Lib$goForwardInHistory = function (_v0) {
	var model = _v0.a;
	var cmds = _v0.b;
	var nextModel = $author$project$Editor$Lib$snapshotTravelableHistory(model);
	return _Utils_Tuple2(
		_Utils_update(
			nextModel,
			{
				histories: A3(
					$elm$core$Dict$update,
					nextModel.file,
					$elm$core$Maybe$map(
						function (_v1) {
							var index = _v1.a;
							var history = _v1.b;
							return _Utils_Tuple2(
								A2(
									$elm$core$Basics$min,
									$elm$core$List$length(history) - 1,
									index) + 1,
								history);
						}),
					nextModel.histories)
			}),
		cmds);
};
var $elm$core$String$append = _String_append;
var $elm_community$list_extra$List$Extra$removeAt = F2(
	function (index, l) {
		if (index < 0) {
			return l;
		} else {
			var tail = $elm$core$List$tail(
				A2($elm$core$List$drop, index, l));
			var head = A2($elm$core$List$take, index, l);
			if (tail.$ === 'Nothing') {
				return l;
			} else {
				var t = tail.a;
				return A2($elm$core$List$append, head, t);
			}
		}
	});
var $author$project$Editor$Lib$updateSelectionState = F2(
	function (selectionState, _v0) {
		var state = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				state,
				{selectionState: selectionState}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$Mode$Insert$Handlers$Backspace$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var currentRenderableLineMaybe = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
	if (currentRenderableLineMaybe.$ === 'Just') {
		var currentRenderableLine = currentRenderableLineMaybe.a;
		var _v2 = model.selection;
		if (_v2.$ === 'Just') {
			var _v3 = $author$project$Editor$Clipboard$cut(model);
			var afterCutTravelable = _v3.b;
			return A2(
				$author$project$Editor$Lib$updateEditor,
				model,
				A2(
					$author$project$Editor$Lib$updateSelection,
					$elm$core$Maybe$Nothing,
					A2(
						$author$project$Editor$Lib$updateSelectionState,
						$author$project$Editor$Msg$None,
						A2(
							$author$project$Editor$Lib$updateCursorPosition,
							afterCutTravelable.cursorPosition,
							A2(
								$author$project$Editor$Lib$updateRenderableLines,
								afterCutTravelable.renderableLines,
								$author$project$Editor$Lib$startUpdateEditor(model))))));
		} else {
			var _v4 = (x - 1) >= 0;
			if (_v4) {
				var updatedRenderableLines = A3(
					$elm_community$list_extra$List$Extra$updateAt,
					y,
					function (a) {
						return _Utils_update(
							a,
							{
								text: A4($elm_community$string_extra$String$Extra$replaceSlice, '', x - 1, x, a.text)
							});
					},
					model.travelable.renderableLines);
				var updatedRenderableLine = _Utils_update(
					currentRenderableLine,
					{
						text: A4($elm_community$string_extra$String$Extra$replaceSlice, '', x - 1, x, currentRenderableLine.text)
					});
				return A2(
					$author$project$Editor$Lib$updateEditor,
					model,
					A2(
						$author$project$Editor$Lib$updateCursorPosition,
						{
							x: A2(
								$elm$core$Basics$max,
								0,
								A2(
									$elm$core$Basics$min,
									x - 1,
									A2(
										$elm$core$Basics$max,
										0,
										$elm$core$String$length(updatedRenderableLine.text)))),
							y: y
						},
						A2(
							$author$project$Editor$Lib$updateRenderableLines,
							updatedRenderableLines,
							$author$project$Editor$Lib$startUpdateEditor(model))));
			} else {
				var _v5 = y > 0;
				if (_v5) {
					var previousRenderableLine = A2(
						$elm$core$Maybe$withDefault,
						A2(
							$author$project$Editor$Lib$createRenderableLine,
							$elm$core$List$length(model.travelable.renderableLines),
							''),
						A2($elm_community$list_extra$List$Extra$getAt, y - 1, model.travelable.renderableLines));
					var updatedPreviousRenderableLine = _Utils_update(
						previousRenderableLine,
						{
							text: A2($elm$core$String$append, previousRenderableLine.text, currentRenderableLine.text)
						});
					var updatedRenderableLines = A3(
						$elm_community$list_extra$List$Extra$updateAt,
						y - 1,
						$elm$core$Basics$always(updatedPreviousRenderableLine),
						A2($elm_community$list_extra$List$Extra$removeAt, y, model.travelable.renderableLines));
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateCursorPosition,
							{
								x: $elm$core$String$length(previousRenderableLine.text),
								y: y - 1
							},
							A2(
								$author$project$Editor$Lib$updateRenderableLines,
								updatedRenderableLines,
								$author$project$Editor$Lib$startUpdateEditor(model))));
				} else {
					return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
				}
			}
		}
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Msg$CompletionRequest = F3(
	function (line, character, token) {
		return {character: character, line: line, token: token};
	});
var $author$project$Editor$Mode$Insert$Handlers$Character$insertText = F2(
	function (text, model) {
		var travelable = model.travelable;
		var _v0 = model.travelable.cursorPosition;
		var x = _v0.x;
		var y = _v0.y;
		var currentRenderableLine = function () {
			var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
			if (_v1.$ === 'Just') {
				var rL = _v1.a;
				return rL;
			} else {
				return A2(
					$author$project$Editor$Lib$createRenderableLine,
					$elm$core$List$length(model.travelable.renderableLines),
					'');
			}
		}();
		var nextCursorPosition = {
			x: x + $elm$core$String$length(text),
			y: y
		};
		var nextRenderableLine = function () {
			var newText = A3($elm_community$string_extra$String$Extra$insertAt, text, nextCursorPosition.x - 1, currentRenderableLine.text);
			return _Utils_update(
				currentRenderableLine,
				{text: newText});
		}();
		var renderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			$elm$core$Basics$always(nextRenderableLine),
			model.travelable.renderableLines);
		return _Utils_update(
			travelable,
			{cursorPosition: nextCursorPosition, renderableLines: renderableLines});
	});
var $author$project$Editor$Mode$Insert$Handlers$Character$handle = F2(
	function (key, model) {
		var _v0 = key.metaKey || ($elm$core$String$length(key.key) !== 1);
		if (_v0) {
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		} else {
			var _v1 = key.key;
			if (_v1 === '') {
				return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
			} else {
				var text = _v1;
				var afterCutTravelable = $author$project$Editor$Clipboard$cut(model).b;
				var afterInsertTextTravelable = A2(
					$author$project$Editor$Mode$Insert$Handlers$Character$insertText,
					text,
					_Utils_update(
						model,
						{travelable: afterCutTravelable}));
				var _v2 = afterInsertTextTravelable.cursorPosition;
				var x = _v2.x;
				var y = _v2.y;
				var tok = A3($author$project$Editor$Syntax$Util$getCurrentToken, x, y, afterInsertTextTravelable.renderableLines);
				return A2(
					$author$project$Editor$Lib$updateEditor,
					model,
					A2(
						$author$project$Editor$Lib$addMsg,
						model.ports.requestCompletion(
							A3($author$project$Editor$Msg$CompletionRequest, y, x, tok)),
						A2(
							$author$project$Editor$Lib$updateSelection,
							$elm$core$Maybe$Nothing,
							A2(
								$author$project$Editor$Lib$updateSelectionState,
								$author$project$Editor$Msg$None,
								A2(
									$author$project$Editor$Lib$updateCursorPosition,
									afterInsertTextTravelable.cursorPosition,
									A2(
										$author$project$Editor$Lib$updateRenderableLines,
										afterInsertTextTravelable.renderableLines,
										$author$project$Editor$Lib$startUpdateEditor(model)))))));
			}
		}
	});
var $elm_community$list_extra$List$Extra$find = F2(
	function (predicate, list) {
		find:
		while (true) {
			if (!list.b) {
				return $elm$core$Maybe$Nothing;
			} else {
				var first = list.a;
				var rest = list.b;
				if (predicate(first)) {
					return $elm$core$Maybe$Just(first);
				} else {
					var $temp$predicate = predicate,
						$temp$list = rest;
					predicate = $temp$predicate;
					list = $temp$list;
					continue find;
				}
			}
		}
	});
var $author$project$Editor$VerticalMovement$getCursorPositionFromLineTransition = F4(
	function (renderableLines, previousCursorPositions, cursorPosition, targetPosition) {
		var targetLineIndex = A2($elm$core$Basics$max, 0, targetPosition.y);
		var targetRenderableLineIndex = function () {
			var _v2 = A2($elm_community$list_extra$List$Extra$getAt, targetLineIndex, renderableLines);
			if (_v2.$ === 'Just') {
				return targetLineIndex;
			} else {
				return $elm$core$List$length(renderableLines) - 1;
			}
		}();
		var targetRenderableLineMaybe = A2($elm_community$list_extra$List$Extra$getAt, targetRenderableLineIndex, renderableLines);
		var targetColumnIndex = targetPosition.x;
		var lastNonZeroColumnCursorPosition = A2(
			$elm$core$Maybe$withDefault,
			{x: 0, y: 0},
			A2(
				$elm_community$list_extra$List$Extra$find,
				function (prev) {
					return prev.x > 0;
				},
				previousCursorPositions));
		var _v0 = cursorPosition;
		var x = _v0.x;
		var y = _v0.y;
		if (targetRenderableLineMaybe.$ === 'Just') {
			var targetRenderableLine = targetRenderableLineMaybe.a;
			return (_Utils_cmp(
				$elm$core$String$length(targetRenderableLine.text),
				targetColumnIndex) < 0) ? {
				x: A2(
					$elm$core$Basics$max,
					0,
					$elm$core$String$length(targetRenderableLine.text) - 1),
				y: targetRenderableLineIndex
			} : {
				x: A2(
					$elm$core$Basics$min,
					A2(
						$elm$core$Basics$max,
						0,
						$elm$core$String$length(targetRenderableLine.text) - 1),
					A2($elm$core$Basics$max, 0, lastNonZeroColumnCursorPosition.x)),
				y: targetRenderableLineIndex
			};
		} else {
			return {x: 0, y: 0};
		}
	});
var $author$project$Editor$Lib$previousCursorPositionsForCurrentFile = function (model) {
	return A2(
		$elm$core$Maybe$withDefault,
		_List_Nil,
		A2(
			$elm$core$Maybe$map,
			$elm$core$List$map(
				function ($) {
					return $.cursorPosition;
				}),
			A2(
				$elm$core$Maybe$map,
				$elm$core$Tuple$second,
				A2($author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile, model.file, model))));
};
var $author$project$Editor$Mode$Insert$Handlers$DownArrow$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var cursorPositions = A4(
		$author$project$Editor$VerticalMovement$getCursorPositionFromLineTransition,
		model.travelable.renderableLines,
		$author$project$Editor$Lib$previousCursorPositionsForCurrentFile(model),
		model.travelable.cursorPosition,
		{x: x, y: y + 1});
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			cursorPositions,
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Insert$Handlers$Enter$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$splitAt, y, model.travelable.renderableLines);
	var headOfLines = _v1.a;
	var tailOfLines = _v1.b;
	var _v2 = $elm$core$List$head(tailOfLines);
	if (_v2.$ === 'Just') {
		var currentRenderableLine = _v2.a;
		var tailOfLineText = A3(
			$elm$core$String$slice,
			x,
			$elm$core$String$length(currentRenderableLine.text),
			currentRenderableLine.text);
		var nextLine = A2(
			$author$project$Editor$Lib$createRenderableLine,
			$elm$core$List$length(model.travelable.renderableLines),
			tailOfLineText);
		var headOfLine = A3($elm$core$String$slice, 0, x, currentRenderableLine.text);
		var updatedCurrentLine = _Utils_update(
			currentRenderableLine,
			{text: headOfLine});
		var updatedRenderableLines = $elm$core$List$concat(
			_List_fromArray(
				[
					headOfLines,
					_List_fromArray(
					[updatedCurrentLine]),
					_List_fromArray(
					[nextLine]),
					A2(
					$elm$core$Maybe$withDefault,
					_List_Nil,
					$elm$core$List$tail(tailOfLines))
				]));
		var _v3 = A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			$author$project$Editor$Lib$startUpdateEditor(model));
		var nextModel = _v3.a;
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				{x: 0, y: y + 1},
				A2(
					$author$project$Editor$Lib$updateRenderableLines,
					updatedRenderableLines,
					$author$project$Editor$Lib$startUpdateEditor(nextModel))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Lib$updateMode = F2(
	function (mode, _v0) {
		var state = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				state,
				{mode: mode}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$Lib$updateNormalBuffer = F2(
	function (normalBuffer, _v0) {
		var state = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				state,
				{normalBuffer: normalBuffer}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$Mode$Insert$Handlers$Escape$handle = function (model) {
	var _v0 = model.config.vimMode;
	if (_v0) {
		var prevNormalBuffer = model.normalBuffer;
		var _v1 = model.travelable.cursorPosition;
		var x = _v1.x;
		var y = _v1.y;
		var currentRenderableLineLength = function () {
			var _v2 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
			if (_v2.$ === 'Just') {
				var renderableLine = _v2.a;
				return A2(
					$elm$core$Basics$max,
					0,
					$elm$core$String$length(renderableLine.text) - 1);
			} else {
				return 0;
			}
		}();
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				{
					x: A2($elm$core$Basics$min, x, currentRenderableLineLength),
					y: y
				},
				A2(
					$author$project$Editor$Lib$updateSelection,
					$elm$core$Maybe$Nothing,
					A2(
						$author$project$Editor$Lib$updateMode,
						$author$project$Editor$Msg$Normal,
						A2(
							$author$project$Editor$Lib$updateNormalBuffer,
							_Utils_update(
								prevNormalBuffer,
								{command: ''}),
							$author$project$Editor$Lib$startUpdateEditor(model))))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Insert$Handlers$LeftArrow$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{
				x: A2($elm$core$Basics$max, 0, x - 1),
				y: y
			},
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Insert$Handlers$RightArrow$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var currentRenderableLineLength = function () {
		var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
		if (_v1.$ === 'Just') {
			var renderableLine = _v1.a;
			return A2(
				$elm$core$Basics$max,
				0,
				$elm$core$String$length(renderableLine.text));
		} else {
			return 0;
		}
	}();
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{
				x: A2($elm$core$Basics$min, currentRenderableLineLength, x + 1),
				y: y
			},
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Insert$Handlers$Tab$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var currentRenderableLineMaybe = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
	if (currentRenderableLineMaybe.$ === 'Just') {
		var currentRenderableLine = currentRenderableLineMaybe.a;
		var nextRenderableLine = function () {
			var newText = A3($elm_community$string_extra$String$Extra$insertAt, '  ', x, currentRenderableLine.text);
			return _Utils_update(
				currentRenderableLine,
				{text: newText});
		}();
		var renderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			$elm$core$Basics$always(nextRenderableLine),
			model.travelable.renderableLines);
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				{x: x + 2, y: y},
				A2(
					$author$project$Editor$Lib$updateRenderableLines,
					renderableLines,
					$author$project$Editor$Lib$startUpdateEditor(model))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Insert$Handlers$UpArrow$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var cursorPositions = A4(
		$author$project$Editor$VerticalMovement$getCursorPositionFromLineTransition,
		model.travelable.renderableLines,
		$author$project$Editor$Lib$previousCursorPositionsForCurrentFile(model),
		model.travelable.cursorPosition,
		{x: x, y: y - 1});
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			cursorPositions,
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Insert$Insert$update = F2(
	function (key, model) {
		return (key.code === 'Escape') ? $author$project$Editor$Mode$Insert$Handlers$Escape$handle(model) : ((key.code === 'Backspace') ? $author$project$Editor$Mode$Insert$Handlers$Backspace$handle(model) : ((key.code === 'Tab') ? $author$project$Editor$Mode$Insert$Handlers$Tab$handle(model) : ((key.code === 'Enter') ? $author$project$Editor$Mode$Insert$Handlers$Enter$handle(model) : ((key.code === 'ArrowLeft') ? $author$project$Editor$Mode$Insert$Handlers$LeftArrow$handle(model) : ((key.code === 'ArrowRight') ? $author$project$Editor$Mode$Insert$Handlers$RightArrow$handle(model) : ((key.code === 'ArrowUp') ? $author$project$Editor$Mode$Insert$Handlers$UpArrow$handle(model) : ((key.code === 'ArrowDown') ? $author$project$Editor$Mode$Insert$Handlers$DownArrow$handle(model) : A2($author$project$Editor$Mode$Insert$Handlers$Character$handle, key, model))))))));
	});
var $author$project$Editor$Words$getWordUntilEnd = function (text) {
	return A2(
		$elm$core$Maybe$map,
		function ($) {
			return $.match;
		},
		$elm$core$List$head(
			A3(
				$elm$core$Basics$apR,
				A2(
					$elm$core$Maybe$withDefault,
					$elm$regex$Regex$never,
					$elm$regex$Regex$fromString('(\\w+)')),
				$elm$regex$Regex$findAtMost(1),
				text)));
};
var $author$project$Editor$Mode$Normal$Handlers$CW$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
	if (_v1.$ === 'Just') {
		var renderableLine = _v1.a;
		var wordLength = function () {
			var _v2 = $author$project$Editor$Words$getWordUntilEnd(
				A3(
					$elm$core$String$slice,
					x,
					$elm$core$String$length(renderableLine.text),
					renderableLine.text));
			if (_v2.$ === 'Just') {
				var word = _v2.a;
				return $elm$core$String$length(word);
			} else {
				return 0;
			}
		}();
		var updatedRenderableLine = _Utils_update(
			renderableLine,
			{
				text: A4($elm_community$string_extra$String$Extra$replaceSlice, '', x, x + wordLength, renderableLine.text)
			});
		var updatedRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			$elm$core$Basics$always(updatedRenderableLine),
			model.travelable.renderableLines);
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateMode,
				$author$project$Editor$Msg$Insert,
				A2(
					$author$project$Editor$Lib$updateNormalBuffer,
					_Utils_update(
						prevNormalBuffer,
						{command: ''}),
					A2(
						$author$project$Editor$Lib$updateRenderableLines,
						updatedRenderableLines,
						$author$project$Editor$Lib$startUpdateEditor(model)))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Lib$resetNormalBuffer = function (_v0) {
	var model = _v0.a;
	var msg = _v0.b;
	var prevNormalBuffer = model.normalBuffer;
	return _Utils_Tuple2(
		_Utils_update(
			model,
			{
				normalBuffer: _Utils_update(
					prevNormalBuffer,
					{command: '', number: 0})
			}),
		$elm$core$Platform$Cmd$batch(
			A2($elm$core$List$cons, msg, _List_Nil)));
};
var $author$project$Editor$Mode$Normal$Handlers$D$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	var _v0 = $author$project$Editor$Clipboard$cut(model);
	var cut = _v0.a;
	var afterCutTravelable = _v0.b;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateNormalBuffer,
			_Utils_update(
				prevNormalBuffer,
				{clipboard: cut}),
			$author$project$Editor$Lib$resetNormalBuffer(
				A2(
					$author$project$Editor$Lib$updateSelection,
					$elm$core$Maybe$Nothing,
					A2(
						$author$project$Editor$Lib$updateRenderableLines,
						afterCutTravelable.renderableLines,
						$author$project$Editor$Lib$startUpdateEditor(model))))));
};
var $author$project$Editor$Mode$Normal$Handlers$DD$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$splitAt, y, model.travelable.renderableLines);
	var before = _v1.a;
	var tail = _v1.b;
	var _v2 = A2(
		$elm_community$list_extra$List$Extra$splitAt,
		A2($elm$core$Basics$max, 1, model.normalBuffer.number),
		tail);
	var after = _v2.b;
	var updatedRenderableLines = function () {
		var updated = A2($elm$core$List$append, before, after);
		var _v3 = $elm$core$List$length(updated);
		if (!_v3) {
			return _List_fromArray(
				[
					A2(
					$author$project$Editor$Lib$createRenderableLine,
					$elm$core$List$length(model.travelable.renderableLines),
					'')
				]);
		} else {
			return updated;
		}
	}();
	var nextLineIndex = A2(
		$elm$core$Basics$max,
		0,
		A2(
			$elm$core$Basics$min,
			$elm$core$List$length(updatedRenderableLines) - 1,
			y));
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{x: 0, y: nextLineIndex},
			$author$project$Editor$Lib$resetNormalBuffer(
				A2(
					$author$project$Editor$Lib$updateRenderableLines,
					updatedRenderableLines,
					$author$project$Editor$Lib$startUpdateEditor(model)))));
};
var $author$project$Editor$Mode$Normal$Handlers$DW$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
	if (_v1.$ === 'Just') {
		var renderableLine = _v1.a;
		var wordLength = function () {
			var _v2 = $author$project$Editor$Words$getWordUntilEnd(
				A3(
					$elm$core$String$slice,
					x,
					$elm$core$String$length(renderableLine.text),
					renderableLine.text));
			if (_v2.$ === 'Just') {
				var word = _v2.a;
				return $elm$core$String$length(word);
			} else {
				return 0;
			}
		}();
		var updatedRenderableLine = _Utils_update(
			renderableLine,
			{
				text: A4($elm_community$string_extra$String$Extra$replaceSlice, '', x, x + wordLength, renderableLine.text)
			});
		var updatedRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			$elm$core$Basics$always(updatedRenderableLine),
			model.travelable.renderableLines);
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateNormalBuffer,
				_Utils_update(
					prevNormalBuffer,
					{command: ''}),
				A2(
					$author$project$Editor$Lib$updateRenderableLines,
					updatedRenderableLines,
					$author$project$Editor$Lib$startUpdateEditor(model))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Normal$Handlers$Escape$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateSelection,
			$elm$core$Maybe$Nothing,
			A2(
				$author$project$Editor$Lib$updateNormalBuffer,
				_Utils_update(
					prevNormalBuffer,
					{command: ''}),
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$GG$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{x: 0, y: 0},
			A2(
				$author$project$Editor$Lib$updateNormalBuffer,
				_Utils_update(
					prevNormalBuffer,
					{command: ''}),
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$H$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{
				x: A2(
					$elm$core$Basics$max,
					0,
					x - A2($elm$core$Basics$max, 1, model.normalBuffer.number)),
				y: y
			},
			$author$project$Editor$Lib$resetNormalBuffer(
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$I$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateMode,
			$author$project$Editor$Msg$Insert,
			A2(
				$author$project$Editor$Lib$updateNormalBuffer,
				_Utils_update(
					prevNormalBuffer,
					{command: ''}),
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$J$handle = function (model) {
	var _v0 = model.normalBuffer;
	var number = _v0.number;
	var command = _v0.command;
	if (command === 'd') {
		return $author$project$Editor$Mode$Normal$Handlers$DD$handle(model);
	} else {
		var _v2 = model.travelable.cursorPosition;
		var x = _v2.x;
		var y = _v2.y;
		var cursorPositions = A4(
			$author$project$Editor$VerticalMovement$getCursorPositionFromLineTransition,
			model.travelable.renderableLines,
			$author$project$Editor$Lib$previousCursorPositionsForCurrentFile(model),
			model.travelable.cursorPosition,
			{
				x: x,
				y: y + A2($elm$core$Basics$max, 1, number)
			});
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				cursorPositions,
				$author$project$Editor$Lib$resetNormalBuffer(
					$author$project$Editor$Lib$startUpdateEditor(model))));
	}
};
var $author$project$Editor$Mode$Normal$Handlers$K$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var cursorPositions = A4(
		$author$project$Editor$VerticalMovement$getCursorPositionFromLineTransition,
		model.travelable.renderableLines,
		$author$project$Editor$Lib$previousCursorPositionsForCurrentFile(model),
		model.travelable.cursorPosition,
		{
			x: x,
			y: y - A2($elm$core$Basics$max, 1, model.normalBuffer.number)
		});
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			cursorPositions,
			$author$project$Editor$Lib$resetNormalBuffer(
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$L$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var currentRenderableLineLength = function () {
		var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
		if (_v1.$ === 'Just') {
			var renderableLine = _v1.a;
			return A2(
				$elm$core$Basics$max,
				0,
				$elm$core$String$length(renderableLine.text) - 1);
		} else {
			return 0;
		}
	}();
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{
				x: A2(
					$elm$core$Basics$min,
					currentRenderableLineLength,
					x + A2($elm$core$Basics$max, 1, model.normalBuffer.number)),
				y: y
			},
			$author$project$Editor$Lib$resetNormalBuffer(
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$O$handle = function (model) {
	var prevNormalBuffer = model.normalBuffer;
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$splitAt, y, model.travelable.renderableLines);
	var headOfLines = _v1.a;
	var tailOfLines = _v1.b;
	var updatedRenderableLines = function () {
		var tailOfTailLines = A2(
			$elm$core$Maybe$withDefault,
			_List_Nil,
			$elm$core$List$tail(tailOfLines));
		var headOfTailLines = function () {
			var _v2 = $elm$core$List$head(tailOfLines);
			if (_v2.$ === 'Just') {
				var h = _v2.a;
				return _List_fromArray(
					[h]);
			} else {
				return _List_Nil;
			}
		}();
		return $elm$core$List$concat(
			_List_fromArray(
				[
					headOfLines,
					headOfTailLines,
					_List_fromArray(
					[
						A2(
						$author$project$Editor$Lib$createRenderableLine,
						$elm$core$List$length(model.travelable.renderableLines),
						'')
					]),
					tailOfTailLines
				]));
	}();
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateMode,
			$author$project$Editor$Msg$Insert,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				{x: 0, y: y + 1},
				A2(
					$author$project$Editor$Lib$updateNormalBuffer,
					_Utils_update(
						prevNormalBuffer,
						{command: ''}),
					A2(
						$author$project$Editor$Lib$updateRenderableLines,
						updatedRenderableLines,
						$author$project$Editor$Lib$startUpdateEditor(model))))));
};
var $elm$core$String$endsWith = _String_endsWith;
var $author$project$Editor$Lib$runHandler = function (handler) {
	return function (_v0) {
		var model = _v0.a;
		var msgs = _v0.b;
		var _v1 = handler(model);
		var nextModel = _v1.a;
		return _Utils_Tuple2(nextModel, msgs);
	};
};
var $elm$core$String$trimRight = _String_trimRight;
var $author$project$Editor$Mode$Normal$Handlers$P$handle = function (model) {
	var _v0 = A2($elm$core$String$endsWith, '\n', model.normalBuffer.clipboard);
	if (_v0) {
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateMode,
				$author$project$Editor$Msg$Normal,
				function (_v1) {
					var m = _v1.a;
					var msgs = _v1.b;
					return _Utils_Tuple2(
						A2(
							$author$project$Editor$Clipboard$paste,
							m,
							$elm$core$String$trimRight(model.normalBuffer.clipboard)),
						msgs);
				}(
					A2(
						$author$project$Editor$Lib$runHandler,
						$author$project$Editor$Mode$Normal$Handlers$O$handle,
						$author$project$Editor$Lib$startUpdateEditor(model)))));
	} else {
		return _Utils_Tuple2(
			A2($author$project$Editor$Clipboard$paste, model, model.normalBuffer.clipboard),
			$elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Normal$Handlers$R$handle = F2(
	function (_char, model) {
		var prevNormalBuffer = model.normalBuffer;
		var _v0 = model.travelable.cursorPosition;
		var x = _v0.x;
		var y = _v0.y;
		var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
		if (_v1.$ === 'Just') {
			var renderableLine = _v1.a;
			var updatedRenderableLine = _Utils_update(
				renderableLine,
				{
					text: A4($elm_community$string_extra$String$Extra$replaceSlice, _char, x, x + 1, renderableLine.text)
				});
			var updatedRenderableLines = A3(
				$elm_community$list_extra$List$Extra$updateAt,
				y,
				$elm$core$Basics$always(updatedRenderableLine),
				model.travelable.renderableLines);
			return A2(
				$author$project$Editor$Lib$updateEditor,
				model,
				A2(
					$author$project$Editor$Lib$updateNormalBuffer,
					_Utils_update(
						prevNormalBuffer,
						{command: ''}),
					A2(
						$author$project$Editor$Lib$updateRenderableLines,
						updatedRenderableLines,
						$author$project$Editor$Lib$startUpdateEditor(model))));
		} else {
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		}
	});
var $author$project$Editor$Mode$Normal$Handlers$ShiftA$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var currentRenderableLineLength = function () {
		var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
		if (_v1.$ === 'Just') {
			var renderableLine = _v1.a;
			return A2(
				$elm$core$Basics$max,
				0,
				$elm$core$String$length(renderableLine.text));
		} else {
			return 0;
		}
	}();
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateMode,
			$author$project$Editor$Msg$Insert,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				{x: currentRenderableLineLength, y: y},
				$author$project$Editor$Lib$startUpdateEditor(model))));
};
var $author$project$Editor$Mode$Normal$Handlers$ShiftG$handle = function (model) {
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			{
				x: 0,
				y: A2(
					$elm$core$Basics$max,
					0,
					$elm$core$List$length(model.travelable.renderableLines) - 1)
			},
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Normal$Handlers$ShiftW$getNextWord = function (model) {
	getNextWord:
	while (true) {
		var currentCursorPosition = model.travelable.cursorPosition;
		var _v0 = function () {
			var _v1 = A2($elm_community$list_extra$List$Extra$getAt, currentCursorPosition.y, model.travelable.renderableLines);
			if (_v1.$ === 'Just') {
				var renderableLine = _v1.a;
				var len = $elm$core$String$length(renderableLine.text);
				return _Utils_Tuple2(
					len,
					A3($elm$core$String$slice, currentCursorPosition.x, len, renderableLine.text));
			} else {
				return _Utils_Tuple2(0, '');
			}
		}();
		var lengthOfLine = _v0.a;
		var restOfLineText = _v0.b;
		var _v2 = function () {
			var _v3 = (!lengthOfLine) || ((!$elm$core$String$length(restOfLineText)) || _Utils_eq(currentCursorPosition.x, lengthOfLine - 1));
			if (_v3) {
				return _Utils_Tuple2('failure', currentCursorPosition);
			} else {
				return A3(
					$elm$core$String$foldl,
					F2(
						function (_char, _v4) {
							var start = _v4.a;
							var next = _v4.b;
							var _v5 = _Utils_Tuple2(start, _char);
							switch (_v5.a) {
								case '':
									return _Utils_Tuple2(
										$elm$core$String$fromChar(_char),
										{x: next.x + 1, y: next.y});
								case '$':
									return _Utils_Tuple2('$', next);
								case ' ':
									if (' ' === _v5.b.valueOf()) {
										return _Utils_Tuple2(
											start,
											{x: next.x + 1, y: next.y});
									} else {
										return _Utils_Tuple2('$', next);
									}
								default:
									if (' ' === _v5.b.valueOf()) {
										return _Utils_Tuple2(
											' ',
											{x: next.x + 1, y: next.y});
									} else {
										var _v6 = _Utils_eq(next.x + 1, lengthOfLine);
										if (_v6) {
											return _Utils_Tuple2(
												'failure',
												{x: 0, y: 0});
										} else {
											return _Utils_Tuple2(
												start,
												{x: next.x + 1, y: next.y});
										}
									}
							}
						}),
					_Utils_Tuple2(
						'',
						{x: currentCursorPosition.x, y: currentCursorPosition.y}),
					restOfLineText);
			}
		}();
		var succeeded = _v2.a;
		var x = _v2.b.x;
		var y = _v2.b.y;
		if (succeeded === 'failure') {
			var _v8 = A2($elm_community$list_extra$List$Extra$getAt, currentCursorPosition.y + 1, model.travelable.renderableLines);
			if (_v8.$ === 'Just') {
				var nextRenderableLine = _v8.a;
				var _v9 = A3($elm$core$String$slice, 0, 1, nextRenderableLine.text);
				if (_v9 === ' ') {
					var travelable = model.travelable;
					var $temp$model = _Utils_update(
						model,
						{
							travelable: _Utils_update(
								travelable,
								{
									cursorPosition: {x: 0, y: currentCursorPosition.y + 1},
									renderableLines: model.travelable.renderableLines
								})
						});
					model = $temp$model;
					continue getNextWord;
				} else {
					return $elm$core$Maybe$Just(
						{x: 0, y: currentCursorPosition.y + 1});
				}
			} else {
				return $elm$core$Maybe$Just(
					{x: x, y: y});
			}
		} else {
			return $elm$core$Maybe$Just(
				{x: x, y: y});
		}
	}
};
var $author$project$Editor$Mode$Normal$Handlers$ShiftW$handle = function (model) {
	var _v0 = $author$project$Editor$Mode$Normal$Handlers$ShiftW$getNextWord(model);
	if (_v0.$ === 'Just') {
		var next = _v0.a;
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				next,
				$author$project$Editor$Lib$startUpdateEditor(model)));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Normal$Handlers$W$Done = {$: 'Done'};
var $author$project$Editor$Mode$Normal$Handlers$W$Failure = {$: 'Failure'};
var $author$project$Editor$Mode$Normal$Handlers$W$LookingForAnything = {$: 'LookingForAnything'};
var $author$project$Editor$Mode$Normal$Handlers$W$NonWord = {$: 'NonWord'};
var $author$project$Editor$Mode$Normal$Handlers$W$Space = {$: 'Space'};
var $author$project$Editor$Mode$Normal$Handlers$W$Start = {$: 'Start'};
var $author$project$Editor$Mode$Normal$Handlers$W$Word = {$: 'Word'};
var $elm$regex$Regex$contains = _Regex_contains;
var $author$project$Editor$Mode$Normal$Handlers$W$isWord = $elm$regex$Regex$contains(
	A2(
		$elm$core$Maybe$withDefault,
		$elm$regex$Regex$never,
		$elm$regex$Regex$fromString('\\w')));
var $author$project$Editor$Mode$Normal$Handlers$W$getNextWord = function (model) {
	getNextWord:
	while (true) {
		var currentCursorPosition = model.travelable.cursorPosition;
		var _v0 = function () {
			var _v1 = A2($elm_community$list_extra$List$Extra$getAt, currentCursorPosition.y, model.travelable.renderableLines);
			if (_v1.$ === 'Just') {
				var renderableLine = _v1.a;
				var len = $elm$core$String$length(renderableLine.text);
				return _Utils_Tuple2(
					len,
					A3($elm$core$String$slice, currentCursorPosition.x, len, renderableLine.text));
			} else {
				return _Utils_Tuple2(0, '');
			}
		}();
		var lengthOfLine = _v0.a;
		var restOfLineText = _v0.b;
		var _v2 = function () {
			var _v3 = (!lengthOfLine) || ((!$elm$core$String$length(restOfLineText)) || _Utils_eq(currentCursorPosition.x, lengthOfLine - 1));
			if (_v3) {
				return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Failure, currentCursorPosition);
			} else {
				return A3(
					$elm$core$String$foldl,
					F2(
						function (_char, _v4) {
							var start = _v4.a;
							var next = _v4.b;
							var stringChar = $elm$core$String$fromChar(_char);
							var state = $author$project$Editor$Mode$Normal$Handlers$W$isWord(stringChar) ? $author$project$Editor$Mode$Normal$Handlers$W$Word : ((stringChar === ' ') ? $author$project$Editor$Mode$Normal$Handlers$W$Space : $author$project$Editor$Mode$Normal$Handlers$W$NonWord);
							var _v5 = _Utils_Tuple2(start, state);
							_v5$12:
							while (true) {
								switch (_v5.a.$) {
									case 'Start':
										var _v6 = _v5.a;
										return _Utils_Tuple2(
											state,
											{x: next.x + 1, y: next.y});
									case 'Done':
										var _v7 = _v5.a;
										return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
									case 'Space':
										switch (_v5.b.$) {
											case 'Word':
												var _v8 = _v5.a;
												var _v9 = _v5.b;
												return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
											case 'Space':
												var _v10 = _v5.a;
												var _v11 = _v5.b;
												return _Utils_Tuple2(
													start,
													{x: next.x + 1, y: next.y});
											default:
												break _v5$12;
										}
									case 'Word':
										switch (_v5.b.$) {
											case 'Space':
												var _v16 = _v5.a;
												var _v17 = _v5.b;
												return _Utils_Tuple2(
													$author$project$Editor$Mode$Normal$Handlers$W$LookingForAnything,
													{x: next.x + 1, y: next.y});
											case 'Word':
												var _v18 = _v5.a;
												var _v19 = _v5.b;
												return _Utils_Tuple2(
													start,
													{x: next.x + 1, y: next.y});
											case 'NonWord':
												var _v20 = _v5.a;
												var _v21 = _v5.b;
												return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
											default:
												break _v5$12;
										}
									case 'LookingForAnything':
										switch (_v5.b.$) {
											case 'NonWord':
												var _v22 = _v5.a;
												var _v23 = _v5.b;
												return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
											case 'Word':
												var _v24 = _v5.a;
												var _v25 = _v5.b;
												return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
											default:
												break _v5$12;
										}
									case 'NonWord':
										switch (_v5.b.$) {
											case 'NonWord':
												var _v12 = _v5.a;
												var _v13 = _v5.b;
												return _Utils_Tuple2(
													start,
													{x: next.x + 1, y: next.y});
											case 'Space':
												var _v14 = _v5.a;
												var _v15 = _v5.b;
												return _Utils_Tuple2(
													$author$project$Editor$Mode$Normal$Handlers$W$LookingForAnything,
													{x: next.x + 1, y: next.y});
											case 'Word':
												var _v26 = _v5.a;
												var _v27 = _v5.b;
												return _Utils_Tuple2($author$project$Editor$Mode$Normal$Handlers$W$Done, next);
											default:
												break _v5$12;
										}
									default:
										break _v5$12;
								}
							}
							return _Utils_Tuple2(
								$author$project$Editor$Mode$Normal$Handlers$W$Failure,
								{x: 0, y: 0});
						}),
					_Utils_Tuple2(
						$author$project$Editor$Mode$Normal$Handlers$W$Start,
						{x: currentCursorPosition.x, y: currentCursorPosition.y}),
					restOfLineText);
			}
		}();
		var succeeded = _v2.a;
		var x = _v2.b.x;
		var y = _v2.b.y;
		if (succeeded.$ === 'Failure') {
			var _v29 = A2($elm_community$list_extra$List$Extra$getAt, currentCursorPosition.y + 1, model.travelable.renderableLines);
			if (_v29.$ === 'Just') {
				var nextRenderableLine = _v29.a;
				var _v30 = A3($elm$core$String$slice, 0, 1, nextRenderableLine.text);
				if (_v30 === ' ') {
					var travelable = model.travelable;
					var $temp$model = _Utils_update(
						model,
						{
							travelable: _Utils_update(
								travelable,
								{
									cursorPosition: {x: 0, y: currentCursorPosition.y + 1},
									renderableLines: model.travelable.renderableLines
								})
						});
					model = $temp$model;
					continue getNextWord;
				} else {
					return $elm$core$Maybe$Just(
						{x: 0, y: currentCursorPosition.y + 1});
				}
			} else {
				return $elm$core$Maybe$Just(
					{x: x, y: y});
			}
		} else {
			return $elm$core$Maybe$Just(
				{x: x, y: y});
		}
	}
};
var $author$project$Editor$Mode$Normal$Handlers$W$handle = function (model) {
	var _v0 = $author$project$Editor$Mode$Normal$Handlers$W$getNextWord(model);
	if (_v0.$ === 'Just') {
		var next = _v0.a;
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				next,
				$author$project$Editor$Lib$startUpdateEditor(model)));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Normal$Handlers$X$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var _v1 = A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines);
	if (_v1.$ === 'Just') {
		var renderableLine = _v1.a;
		var updatedRenderableLine = _Utils_update(
			renderableLine,
			{
				text: A4($elm_community$string_extra$String$Extra$replaceSlice, '', x, x + 1, renderableLine.text)
			});
		var updatedRenderableLines = A3(
			$elm_community$list_extra$List$Extra$updateAt,
			y,
			$elm$core$Basics$always(updatedRenderableLine),
			model.travelable.renderableLines);
		var prevNormalBuffer = model.normalBuffer;
		var cursorPosition = function () {
			var _v2 = _Utils_eq(
				x,
				$elm$core$String$length(updatedRenderableLine.text));
			if (_v2) {
				return {x: x, y: y};
			} else {
				return {x: x, y: y};
			}
		}();
		return A2(
			$author$project$Editor$Lib$updateEditor,
			model,
			A2(
				$author$project$Editor$Lib$updateCursorPosition,
				cursorPosition,
				A2(
					$author$project$Editor$Lib$updateNormalBuffer,
					_Utils_update(
						prevNormalBuffer,
						{command: ''}),
					A2(
						$author$project$Editor$Lib$updateRenderableLines,
						updatedRenderableLines,
						$author$project$Editor$Lib$startUpdateEditor(model)))));
	} else {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	}
};
var $author$project$Editor$Mode$Normal$Handlers$YY$handle = function (model) {
	var prevBuffer = model.normalBuffer;
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	var line = A2(
		$elm$core$Maybe$withDefault,
		'',
		A2(
			$elm$core$Maybe$map,
			function ($) {
				return $.text;
			},
			A2($elm_community$list_extra$List$Extra$getAt, y, model.travelable.renderableLines))) + '\n';
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateNormalBuffer,
			_Utils_update(
				prevBuffer,
				{clipboard: line}),
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $author$project$Editor$Mode$Normal$Handlers$Zero$handle = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var y = _v0.y;
	var cursorPosition = {x: 0, y: y};
	return A2(
		$author$project$Editor$Lib$updateEditor,
		model,
		A2(
			$author$project$Editor$Lib$updateCursorPosition,
			cursorPosition,
			$author$project$Editor$Lib$startUpdateEditor(model)));
};
var $elm$core$Basics$negate = function (n) {
	return -n;
};
var $elm$core$String$right = F2(
	function (n, string) {
		return (n < 1) ? '' : A3(
			$elm$core$String$slice,
			-n,
			$elm$core$String$length(string),
			string);
	});
var $author$project$Editor$Mode$Normal$Normal$update = F2(
	function (key, model) {
		if (key.code === 'Escape') {
			return $author$project$Editor$Mode$Normal$Handlers$Escape$handle(model);
		} else {
			if (key.shiftKey && (key.code === 'KeyA')) {
				return $author$project$Editor$Mode$Normal$Handlers$ShiftA$handle(model);
			} else {
				if (key.shiftKey && (key.code === 'KeyG')) {
					return $author$project$Editor$Mode$Normal$Handlers$ShiftG$handle(model);
				} else {
					if (key.shiftKey && (key.code === 'KeyW')) {
						return $author$project$Editor$Mode$Normal$Handlers$ShiftW$handle(model);
					} else {
						if ((key.code === 'KeyD') && (!_Utils_eq(model.selection, $elm$core$Maybe$Nothing))) {
							return $author$project$Editor$Mode$Normal$Handlers$D$handle(model);
						} else {
							if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'y') && (key.code === 'KeyY')) {
								return $author$project$Editor$Mode$Normal$Handlers$YY$handle(model);
							} else {
								if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'd') && (key.code === 'KeyD')) {
									return $author$project$Editor$Mode$Normal$Handlers$DD$handle(model);
								} else {
									if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'd') && (key.code === 'KeyW')) {
										return $author$project$Editor$Mode$Normal$Handlers$DW$handle(model);
									} else {
										if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'c') && (key.code === 'KeyW')) {
											return $author$project$Editor$Mode$Normal$Handlers$CW$handle(model);
										} else {
											if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'g') && (key.code === 'KeyG')) {
												return $author$project$Editor$Mode$Normal$Handlers$GG$handle(model);
											} else {
												if ((A2($elm$core$String$right, 1, model.normalBuffer.command) === 'r') && ($elm$core$String$length(key.key) === 1)) {
													return A2($author$project$Editor$Mode$Normal$Handlers$R$handle, key.key, model);
												} else {
													if (key.code === 'KeyW') {
														return $author$project$Editor$Mode$Normal$Handlers$W$handle(model);
													} else {
														if (key.code === 'Digit0') {
															return $author$project$Editor$Mode$Normal$Handlers$Zero$handle(model);
														} else {
															if (key.code === 'KeyI') {
																return $author$project$Editor$Mode$Normal$Handlers$I$handle(model);
															} else {
																if (key.code === 'KeyH') {
																	return $author$project$Editor$Mode$Normal$Handlers$H$handle(model);
																} else {
																	if (key.code === 'KeyJ') {
																		return $author$project$Editor$Mode$Normal$Handlers$J$handle(model);
																	} else {
																		if (key.code === 'KeyK') {
																			return $author$project$Editor$Mode$Normal$Handlers$K$handle(model);
																		} else {
																			if (key.code === 'KeyL') {
																				return $author$project$Editor$Mode$Normal$Handlers$L$handle(model);
																			} else {
																				if (key.code === 'KeyP') {
																					return $author$project$Editor$Mode$Normal$Handlers$P$handle(model);
																				} else {
																					if (key.code === 'KeyX') {
																						return $author$project$Editor$Mode$Normal$Handlers$X$handle(model);
																					} else {
																						if (key.code === 'KeyO') {
																							return $author$project$Editor$Mode$Normal$Handlers$O$handle(model);
																						} else {
																							if (key.code === 'ArrowLeft') {
																								return $author$project$Editor$Mode$Insert$Handlers$LeftArrow$handle(model);
																							} else {
																								if (key.code === 'ArrowRight') {
																									return $author$project$Editor$Mode$Insert$Handlers$RightArrow$handle(model);
																								} else {
																									if (key.code === 'ArrowUp') {
																										return $author$project$Editor$Mode$Insert$Handlers$UpArrow$handle(model);
																									} else {
																										if (key.code === 'ArrowDown') {
																											return $author$project$Editor$Mode$Insert$Handlers$DownArrow$handle(model);
																										} else {
																											var prevNormalBuffer = model.normalBuffer;
																											var _v0 = function () {
																												var _v1 = $elm$core$String$toInt(key.key);
																												if (_v1.$ === 'Just') {
																													var number = _v1.a;
																													return _Utils_Tuple2(
																														$elm$core$Maybe$Just(number),
																														$elm$core$Maybe$Nothing);
																												} else {
																													return _Utils_Tuple2(
																														$elm$core$Maybe$Nothing,
																														$elm$core$Maybe$Just(key.key));
																												}
																											}();
																											var maybeNumber = _v0.a;
																											var maybeCommand = _v0.b;
																											var normalBuffer = _Utils_update(
																												prevNormalBuffer,
																												{
																													command: function () {
																														if (maybeCommand.$ === 'Just') {
																															var command = maybeCommand.a;
																															return _Utils_ap(prevNormalBuffer.command, command);
																														} else {
																															return prevNormalBuffer.command;
																														}
																													}(),
																													number: function () {
																														if (maybeNumber.$ === 'Just') {
																															var number = maybeNumber.a;
																															return A2(
																																$elm$core$Maybe$withDefault,
																																0,
																																$elm$core$String$toInt(
																																	_Utils_ap(
																																		$elm$core$String$fromInt(prevNormalBuffer.number),
																																		$elm$core$String$fromInt(number))));
																														} else {
																															return prevNormalBuffer.number;
																														}
																													}()
																												});
																											return A2(
																												$author$project$Editor$Lib$updateEditor,
																												model,
																												A2(
																													$author$project$Editor$Lib$updateNormalBuffer,
																													normalBuffer,
																													$author$project$Editor$Lib$startUpdateEditor(model)));
																										}
																									}
																								}
																							}
																						}
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	});
var $author$project$Editor$Lib$updateSelectedCompletionIndex = F2(
	function (selectedCompletionIndex, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		return _Utils_Tuple2(
			_Utils_update(
				model,
				{selectedCompletionIndex: selectedCompletionIndex}),
			msg);
	});
var $author$project$Editor$Keys$update = F2(
	function (rawKey, model) {
		if (rawKey.$ === 'Up') {
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		} else {
			var key = rawKey.a;
			if (key.ctrlKey && (key.code === 'Space')) {
				var contents = $author$project$Editor$Lib$renderableLinesToContents(model.travelable.renderableLines);
				var _v1 = model.travelable.cursorPosition;
				var x = _v1.x;
				var y = _v1.y;
				var tok = A3($author$project$Editor$Syntax$Util$getCurrentToken, x, y, model.travelable.renderableLines);
				return _Utils_Tuple2(
					model,
					model.ports.requestCompletion(
						{character: x, line: y, token: tok}));
			} else {
				if (key.metaKey && (key.code === 'KeyS')) {
					var contents = $author$project$Editor$Lib$renderableLinesToContents(model.travelable.renderableLines);
					return _Utils_Tuple2(
						model,
						model.ports.requestSave(contents));
				} else {
					if (key.metaKey && (key.code === 'KeyA')) {
						return A2(
							$author$project$Editor$Lib$updateSelection,
							$elm$core$Maybe$Just(
								_Utils_Tuple2(
									{x: 0, y: 0},
									{
										x: function () {
											var _v2 = $elm_community$list_extra$List$Extra$last(model.travelable.renderableLines);
											if (_v2.$ === 'Just') {
												var renderableLine = _v2.a;
												return A2(
													$elm$core$Basics$max,
													0,
													$elm$core$String$length(renderableLine.text) - 1);
											} else {
												return 0;
											}
										}(),
										y: $elm$core$List$length(model.travelable.renderableLines) - 1
									})),
							$author$project$Editor$Lib$startUpdateEditor(model));
					} else {
						if (key.metaKey && (key.code === 'KeyC')) {
							return _Utils_Tuple2(
								model,
								model.ports.requestCopy(
									$author$project$Editor$Clipboard$copy(model)));
						} else {
							if (key.metaKey && (key.code === 'KeyX')) {
								var _v3 = $author$project$Editor$Clipboard$cut(model);
								var selection = _v3.a;
								var nextTravelable = _v3.b;
								var _v4 = A2(
									$author$project$Editor$Lib$updateEditor,
									model,
									A2(
										$author$project$Editor$Lib$updateCursorPosition,
										nextTravelable.cursorPosition,
										A2(
											$author$project$Editor$Lib$updateRenderableLines,
											nextTravelable.renderableLines,
											A2(
												$author$project$Editor$Lib$updateSelection,
												$elm$core$Maybe$Nothing,
												$author$project$Editor$Lib$startUpdateEditor(model)))));
								var nextModel = _v4.a;
								var cmd = _v4.b;
								return _Utils_Tuple2(
									nextModel,
									$elm$core$Platform$Cmd$batch(
										_List_fromArray(
											[
												model.ports.requestCopy(selection),
												cmd
											])));
							} else {
								if (key.metaKey && (key.code === 'KeyV')) {
									return _Utils_Tuple2(
										model,
										model.ports.requestPaste(_Utils_Tuple0));
								} else {
									if (key.metaKey && (key.code === 'Enter')) {
										return _Utils_Tuple2(
											model,
											model.ports.requestRun(
												$author$project$Editor$Lib$renderableLinesToContents(model.travelable.renderableLines)));
									} else {
										if (key.metaKey && (key.shiftKey && (key.code === 'KeyZ'))) {
											return A2(
												$author$project$Editor$Lib$updateEditor,
												model,
												$author$project$Editor$Lib$goBackwardInHistory(
													A2(
														$author$project$Editor$Lib$updateSelection,
														$elm$core$Maybe$Nothing,
														$author$project$Editor$Lib$startUpdateEditor(model))));
										} else {
											if (key.metaKey && (key.code === 'KeyZ')) {
												return A2(
													$author$project$Editor$Lib$updateEditor,
													model,
													$author$project$Editor$Lib$goForwardInHistory(
														A2(
															$author$project$Editor$Lib$updateSelection,
															$elm$core$Maybe$Nothing,
															$author$project$Editor$Lib$startUpdateEditor(model))));
											} else {
												if ((key.code === 'ArrowDown') && ($elm$core$List$length(model.completions) > 0)) {
													return A2(
														$author$project$Editor$Lib$updateEditor,
														model,
														A2(
															$author$project$Editor$Lib$updateSelectedCompletionIndex,
															A2(
																$elm$core$Basics$min,
																$elm$core$List$length(model.completions) - 1,
																model.selectedCompletionIndex + 1),
															$author$project$Editor$Lib$startUpdateEditor(model)));
												} else {
													if ((key.code === 'ArrowUp') && ($elm$core$List$length(model.completions) > 0)) {
														return A2(
															$author$project$Editor$Lib$updateEditor,
															model,
															A2(
																$author$project$Editor$Lib$updateSelectedCompletionIndex,
																A2($elm$core$Basics$max, 0, model.selectedCompletionIndex - 1),
																$author$project$Editor$Lib$startUpdateEditor(model)));
													} else {
														if ((key.code === 'Enter') && ($elm$core$List$length(model.completions) > 0)) {
															var maybeCompletion = A2($elm_community$list_extra$List$Extra$getAt, model.selectedCompletionIndex, model.completions);
															var maybeTextEdit = A2(
																$elm$core$Maybe$map,
																function ($) {
																	return $.textEdit;
																},
																maybeCompletion);
															if ((maybeTextEdit.$ === 'Just') && (maybeTextEdit.a.$ === 'Just')) {
																var textEdit = maybeTextEdit.a.a;
																var _v6 = function (_v7) {
																	var m = _v7.a;
																	var msg = _v7.b;
																	return _Utils_Tuple2(
																		A2($author$project$Editor$Clipboard$paste, m, textEdit.newText),
																		msg);
																}(
																	A2(
																		$author$project$Editor$Lib$updateSelection,
																		$elm$core$Maybe$Nothing,
																		$author$project$Editor$Lib$startUpdateEditor(model)));
																var nextModel = _v6.a;
																return A2(
																	$author$project$Editor$Lib$updateEditor,
																	model,
																	A2(
																		$author$project$Editor$Lib$updateCursorPosition,
																		{
																			x: textEdit.range.start.character + $elm$core$String$length(textEdit.newText),
																			y: textEdit.range.end.line
																		},
																		function (_v8) {
																			var m = _v8.a;
																			var msg = _v8.b;
																			return _Utils_Tuple2(
																				_Utils_update(
																					m,
																					{completions: _List_Nil, selectedCompletionIndex: 0}),
																				msg);
																		}(
																			A2(
																				$author$project$Editor$Lib$updateRenderableLines,
																				nextModel.travelable.renderableLines,
																				$author$project$Editor$Lib$startUpdateEditor(model)))));
															} else {
																return _Utils_Tuple2(
																	_Utils_update(
																		model,
																		{completions: _List_Nil, selectedCompletionIndex: 0}),
																	$elm$core$Platform$Cmd$none);
															}
														} else {
															var _v9 = model.mode;
															if (_v9.$ === 'Insert') {
																return A2($author$project$Editor$Mode$Insert$Insert$update, key, model);
															} else {
																return A2($author$project$Editor$Mode$Normal$Normal$update, key, model);
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	});
var $author$project$Editor$Save$update = F2(
	function (json, model) {
		return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
	});
var $author$project$Editor$Symbols$JsonSymbol = F2(
	function (kind, location) {
		return {kind: kind, location: location};
	});
var $author$project$Editor$Msg$Location = function (range) {
	return {range: range};
};
var $author$project$Editor$Decoders$decodeLocation = A2(
	$elm$json$Json$Decode$map,
	$author$project$Editor$Msg$Location,
	A2($elm$json$Json$Decode$field, 'range', $author$project$Editor$Decoders$decodeRange));
var $author$project$Editor$Symbols$decodeJson = $elm$json$Json$Decode$list(
	A3(
		$elm$json$Json$Decode$map2,
		$author$project$Editor$Symbols$JsonSymbol,
		A2($elm$json$Json$Decode$field, 'kind', $elm$json$Json$Decode$int),
		A2($elm$json$Json$Decode$field, 'location', $author$project$Editor$Decoders$decodeLocation)));
var $author$project$Editor$Symbols$jsonSymbolsToSymbols = function (jsonSymbols) {
	return A2(
		$elm$core$List$map,
		function (s) {
			return {
				end: {character: s.location.range.end.character, line: s.location.range.end.line},
				kind: s.kind,
				start: {character: s.location.range.start.character, line: s.location.range.start.line}
			};
		},
		jsonSymbols);
};
var $author$project$Editor$Lib$updateSymbols = F2(
	function (symbols, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		var travelable = model.travelable;
		var historyIndex = A2(
			$elm$core$Maybe$map,
			$elm$core$Tuple$first,
			A2($author$project$Editor$Lib$getCurrentHistoryIndexAndHistoryByFile, model.file, model));
		var _v1 = _Utils_eq(symbols, model.symbols) && _Utils_eq(
			historyIndex,
			$elm$core$Maybe$Just(0));
		if (_v1) {
			return _Utils_Tuple2(
				model,
				$elm$core$Platform$Cmd$batch(
					A2($elm$core$List$cons, msg, _List_Nil)));
		} else {
			var nextRenderableLines = A2(
				$elm$core$List$indexedMap,
				F2(
					function (lineNumber, renderableLine) {
						var lineSymbols = A2(
							$elm$core$List$map,
							function (symbol) {
								return (_Utils_eq(lineNumber, symbol.start.line) && _Utils_eq(lineNumber, symbol.end.line)) ? {
									end: $elm$core$Maybe$Just(symbol.end.character),
									kind: symbol.kind,
									start: symbol.start.character,
									styles: _List_Nil
								} : (((_Utils_cmp(lineNumber, symbol.start.line) > 0) && (_Utils_cmp(lineNumber, symbol.end.line) < 0)) ? {end: $elm$core$Maybe$Nothing, kind: symbol.kind, start: 0, styles: _List_Nil} : ((_Utils_eq(lineNumber, symbol.start.line) && (_Utils_cmp(lineNumber, symbol.end.line) < 0)) ? {end: $elm$core$Maybe$Nothing, kind: symbol.kind, start: symbol.start.character, styles: _List_Nil} : {
									end: $elm$core$Maybe$Just(symbol.end.character),
									kind: symbol.kind,
									start: 0,
									styles: _List_Nil
								}));
							},
							A2(
								$elm$core$List$filter,
								function (symbol) {
									return (_Utils_cmp(symbol.start.line, lineNumber) < 1) && ((_Utils_cmp(symbol.end.line, lineNumber) > -1) && (symbol.kind >= 100));
								},
								symbols));
						return _Utils_update(
							renderableLine,
							{multilineSymbols: lineSymbols});
					}),
				model.travelable.renderableLines);
			return _Utils_Tuple2(
				_Utils_update(
					model,
					{
						symbols: symbols,
						travelable: _Utils_update(
							travelable,
							{renderableLines: nextRenderableLines})
					}),
				msg);
		}
	});
var $author$project$Editor$Symbols$update = F2(
	function (json, model) {
		var _v0 = A2($elm$json$Json$Decode$decodeValue, $author$project$Editor$Symbols$decodeJson, json);
		if (_v0.$ === 'Ok') {
			var symbols = _v0.a;
			return A2(
				$author$project$Editor$Lib$updateSymbols,
				$author$project$Editor$Symbols$jsonSymbolsToSymbols(symbols),
				$author$project$Editor$Lib$startUpdateEditor(model));
		} else {
			var error = _v0.a;
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		}
	});
var $author$project$Editor$Lib$updateDoubleTripleClick = F2(
	function (cursorPosition, _v0) {
		var model = _v0.a;
		var msg = _v0.b;
		var previousDoubleTripleClickPosition = model.doubleTripleClick.b;
		var nextDoubleTripleClickCount = function () {
			var _v9 = _Utils_eq(cursorPosition, previousDoubleTripleClickPosition);
			if (_v9) {
				return model.doubleTripleClick.a + 1;
			} else {
				return 1;
			}
		}();
		var tripleClick = nextDoubleTripleClickCount === 3;
		var doubleClick = nextDoubleTripleClickCount === 2;
		var nextDoubleTripleClick = doubleClick ? _Utils_Tuple2(nextDoubleTripleClickCount, cursorPosition) : (tripleClick ? _Utils_Tuple2(1, cursorPosition) : _Utils_Tuple2(nextDoubleTripleClickCount, cursorPosition));
		var nextSelection = function () {
			if (doubleClick) {
				var _v1 = function () {
					var _v2 = A2($elm_community$list_extra$List$Extra$getAt, cursorPosition.y, model.travelable.renderableLines);
					if (_v2.$ === 'Just') {
						var renderableLine = _v2.a;
						var _v3 = $author$project$Editor$Words$getWordUntilEnd(
							A3($elm$core$String$slice, cursorPosition.x, cursorPosition.x + 1, renderableLine.text));
						if (_v3.$ === 'Just') {
							var _v4 = A3(
								$elm$core$List$foldl,
								F2(
									function (_char, _v5) {
										var x = _v5.a;
										var keepGoing = _v5.b;
										if (keepGoing) {
											var _v7 = $author$project$Editor$Words$getWordUntilEnd(_char);
											if (_v7.$ === 'Just') {
												return _Utils_Tuple2(x - 1, true);
											} else {
												return _Utils_Tuple2(x, false);
											}
										} else {
											return _Utils_Tuple2(x, keepGoing);
										}
									}),
								_Utils_Tuple2(cursorPosition.x, true),
								$elm$core$List$reverse(
									A2(
										$elm$core$String$split,
										'',
										A3($elm$core$String$slice, 0, cursorPosition.x, renderableLine.text))));
							var backtrackedX = _v4.a;
							return _Utils_Tuple2(
								backtrackedX,
								(backtrackedX + $elm$core$String$length(
									A2(
										$elm$core$Maybe$withDefault,
										'',
										$author$project$Editor$Words$getWordUntilEnd(
											A3(
												$elm$core$String$slice,
												backtrackedX,
												$elm$core$String$length(renderableLine.text),
												renderableLine.text))))) - 1);
						} else {
							return _Utils_Tuple2(cursorPosition.x, cursorPosition.x);
						}
					} else {
						return _Utils_Tuple2(cursorPosition.x, cursorPosition.x);
					}
				}();
				var wordStart = _v1.a;
				var wordEnd = _v1.b;
				return $elm$core$Maybe$Just(
					_Utils_Tuple2(
						{x: wordStart, y: cursorPosition.y},
						{x: wordEnd, y: cursorPosition.y}));
			} else {
				if (tripleClick) {
					return $elm$core$Maybe$Just(
						_Utils_Tuple2(
							{x: 0, y: cursorPosition.y},
							{
								x: function () {
									var _v8 = A2($elm_community$list_extra$List$Extra$getAt, cursorPosition.y, model.travelable.renderableLines);
									if (_v8.$ === 'Just') {
										var renderableLine = _v8.a;
										return $elm$core$String$length(renderableLine.text);
									} else {
										return 0;
									}
								}(),
								y: cursorPosition.y
							}));
				} else {
					return model.selection;
				}
			}
		}();
		return _Utils_Tuple2(
			_Utils_update(
				model,
				{doubleTripleClick: nextDoubleTripleClick, selection: nextSelection}),
			$elm$core$Platform$Cmd$batch(
				A2($elm$core$List$cons, msg, _List_Nil)));
	});
var $author$project$Editor$update = F2(
	function (msg, model) {
		var _v0 = model.active;
		if (!_v0) {
			return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
		} else {
			var travelable = model.travelable;
			switch (msg.$) {
				case 'NoOp':
					return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
				case 'RenderedScroll':
					var rendered = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							model,
							{
								travelable: _Utils_update(
									travelable,
									{scrollLeft: rendered.scrollLeft})
							}),
						$elm$core$Platform$Cmd$none);
				case 'ContainerScroll':
					var container = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							model,
							{
								travelable: _Utils_update(
									travelable,
									{scrollTop: container.scrollTop})
							}),
						$elm$core$Platform$Cmd$none);
				case 'ErrorsResponse':
					var errors = msg.a;
					return A2($author$project$Editor$Errors$update, errors, model);
				case 'CompletionResponse':
					var completions = msg.a;
					return A2($author$project$Editor$Completions$update, completions, model);
				case 'SymbolResponse':
					var symbols = msg.a;
					return A2($author$project$Editor$Symbols$update, symbols, model);
				case 'RawKeyboardMsg':
					var m = msg.a;
					return A2($author$project$Editor$Keys$update, m, model);
				case 'SaveResponse':
					var json = msg.a;
					return A2($author$project$Editor$Save$update, json, model);
				case 'PasteResponse':
					var string = msg.a;
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						$author$project$Editor$Lib$withRequestChange(
							A2(
								$author$project$Editor$Lib$updateSelection,
								$elm$core$Maybe$Nothing,
								$author$project$Editor$Lib$startUpdateEditor(
									A2($author$project$Editor$Clipboard$paste, model, string)))));
				case 'ClearSelection':
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateSelection,
							$elm$core$Maybe$Nothing,
							A2(
								$author$project$Editor$Lib$updateSelectionState,
								$author$project$Editor$Msg$None,
								$author$project$Editor$Lib$startUpdateEditor(model))));
				case 'WindowMouseUp':
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateSelectionState,
							$author$project$Editor$Msg$None,
							$author$project$Editor$Lib$startUpdateEditor(model)));
				case 'MouseUp':
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateSelectionState,
							$author$project$Editor$Msg$None,
							$author$project$Editor$Lib$startUpdateEditor(model)));
				case 'MouseDown':
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateSelection,
							$elm$core$Maybe$Nothing,
							A2(
								$author$project$Editor$Lib$updateSelectionState,
								$author$project$Editor$Msg$Selecting,
								$author$project$Editor$Lib$startUpdateEditor(model))));
				case 'MouseMove':
					var spot = msg.a;
					var _v2 = model.selectionState;
					if (_v2.$ === 'Selecting') {
						var lineLength = A2(
							$elm$core$Maybe$withDefault,
							0,
							A2(
								$elm$core$Maybe$map,
								A2(
									$elm$core$Basics$composeL,
									$elm$core$String$length,
									function ($) {
										return $.text;
									}),
								A2($elm_community$list_extra$List$Extra$getAt, spot.y, model.travelable.renderableLines)));
						var restrictedSpot = {
							x: A2(
								$elm$core$Basics$max,
								0,
								A2($elm$core$Basics$min, lineLength - 1, spot.x)),
							y: A2($elm$core$Basics$max, 0, spot.y)
						};
						var _v3 = model.selection;
						if (_v3.$ === 'Just') {
							var selection = _v3.a;
							return A3($author$project$Editor$Lib$handleSelectionUpdate, model, restrictedSpot, selection);
						} else {
							return A2(
								$author$project$Editor$Lib$updateEditor,
								model,
								A2(
									$author$project$Editor$Lib$updateSelection,
									$elm$core$Maybe$Just(
										_Utils_Tuple2(restrictedSpot, restrictedSpot)),
									$author$project$Editor$Lib$startUpdateEditor(model)));
						}
					} else {
						return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
					}
				default:
					var clickLocation = msg.a;
					var lineLength = A2(
						$elm$core$Maybe$withDefault,
						0,
						A2(
							$elm$core$Maybe$map,
							A2(
								$elm$core$Basics$composeL,
								$elm$core$String$length,
								function ($) {
									return $.text;
								}),
							A2($elm_community$list_extra$List$Extra$getAt, clickLocation.y, model.travelable.renderableLines)));
					var cursorPosition = {
						x: A2($elm$core$Basics$min, lineLength, clickLocation.x),
						y: clickLocation.y
					};
					return A2(
						$author$project$Editor$Lib$updateEditor,
						model,
						A2(
							$author$project$Editor$Lib$updateCursorPosition,
							cursorPosition,
							A2(
								$author$project$Editor$Lib$updateDoubleTripleClick,
								cursorPosition,
								$author$project$Editor$Lib$startUpdateEditor(model))));
			}
		}
	});
var $author$project$Terminal$update = F2(
	function (msg, model) {
		switch (msg.$) {
			case 'NoOp':
				return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
			case 'ReceivedTerminalResized':
				var json = msg.a;
				var _v1 = A2($elm$json$Json$Decode$decodeValue, $author$project$Terminal$Decoders$decodeTerminalResized, json);
				if (_v1.$ === 'Ok') {
					var height = _v1.a.height;
					var width = _v1.a.width;
					var nextTerminal = function () {
						var _v2 = model.terminal.activeBuffer;
						if (_v2.$ === 'Alternate') {
							return model.terminal;
						} else {
							var term = model.terminal;
							var editor = term.primaryBuffer.editor;
							var currentLineCount = $elm$core$List$length(editor.travelable.renderableLines);
							if (_Utils_cmp(height, currentLineCount) > 0) {
								var travelable = editor.travelable;
								var nextTravelable = _Utils_update(
									travelable,
									{
										renderableLines: _Utils_ap(
											travelable.renderableLines,
											A2(
												$elm$core$List$repeat,
												height - currentLineCount,
												A2($author$project$Editor$Lib$createRenderableLine, 0, '')))
									});
								return A2(
									$author$project$Terminal$updateTerminalEditor,
									_Utils_update(
										editor,
										{travelable: nextTravelable}),
									_Utils_update(
										term,
										{
											size: {height: height, width: width}
										}));
							} else {
								if (_Utils_cmp(height, currentLineCount) < 0) {
									var travelable = editor.travelable;
									var nextRenderableLines = $elm$core$List$reverse(
										$elm$core$Array$toList(
											A3(
												$elm$core$Array$slice,
												0,
												height,
												$elm$core$Array$fromList(
													$elm$core$List$reverse(travelable.renderableLines)))));
									var _v3 = travelable.cursorPosition;
									var x = _v3.x;
									var y = _v3.y;
									var nextTravelable = _Utils_update(
										travelable,
										{
											cursorPosition: {
												x: x,
												y: A2(
													$elm$core$Basics$max,
													0,
													A2($elm$core$Basics$min, height - 1, y))
											},
											renderableLines: nextRenderableLines
										});
									return A2(
										$author$project$Terminal$updateTerminalEditor,
										_Utils_update(
											editor,
											{travelable: nextTravelable}),
										_Utils_update(
											term,
											{
												size: {height: height, width: width}
											}));
								} else {
									return _Utils_update(
										term,
										{
											size: {height: height, width: width}
										});
								}
							}
						}
					}();
					return _Utils_Tuple2(
						_Utils_update(
							model,
							{terminal: nextTerminal}),
						$elm$core$Platform$Cmd$none);
				} else {
					var err = _v1.a;
					return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
				}
			case 'ReceivedTerminalOutput':
				var json = msg.a;
				var _v4 = A2($elm$json$Json$Decode$decodeValue, $author$project$Terminal$Decoders$decodeTerminalCommands, json);
				if (_v4.$ === 'Ok') {
					var commands = _v4.a;
					var _v5 = A2($author$project$Terminal$run, commands, model.terminal);
					var nextTerminal = _v5.a;
					var msgs = _v5.b;
					return _Utils_Tuple2(
						_Utils_update(
							model,
							{terminal: nextTerminal}),
						$elm$core$Platform$Cmd$batch(
							_List_fromArray(
								[
									A2($elm$core$Platform$Cmd$map, $author$project$Terminal$Types$TerminalEditorMsg, msgs),
									$author$project$Terminal$scrollToBottom('terminal-container')
								])));
				} else {
					var err = _v4.a;
					return _Utils_Tuple2(model, $elm$core$Platform$Cmd$none);
				}
			default:
				var editorMsg = msg.a;
				var term = model.terminal;
				var _v6 = $author$project$Terminal$getBuffer(term);
				var editor = _v6.a;
				var _v7 = A2($author$project$Editor$update, editorMsg, editor);
				var nextEditor = _v7.a;
				var msgs = _v7.b;
				var nextTerminal = A2($author$project$Terminal$updateTerminalEditor, nextEditor, term);
				return _Utils_Tuple2(
					_Utils_update(
						model,
						{terminal: nextTerminal}),
					$elm$core$Platform$Cmd$batch(
						_List_fromArray(
							[
								A2($elm$core$Platform$Cmd$map, $author$project$Terminal$Types$TerminalEditorMsg, msgs)
							])));
		}
	});
var $author$project$Main$update = F2(
	function (msg, model) {
		if (msg.$ === 'RawKeyboardMsg') {
			var m = msg.a;
			return A2($author$project$Keybindings$handleKeybindings, model, m);
		} else {
			var terminalMsg = msg.a;
			var _v1 = A2($author$project$Terminal$update, terminalMsg, model.terminal);
			var nextTerminal = _v1.a;
			var terminalMsgs = _v1.b;
			return _Utils_Tuple2(
				_Utils_update(
					model,
					{terminal: nextTerminal}),
				A2($elm$core$Platform$Cmd$map, $author$project$Msg$TerminalMsg, terminalMsgs));
		}
	});
var $elm$html$Html$Attributes$stringProperty = F2(
	function (key, string) {
		return A2(
			_VirtualDom_property,
			key,
			$elm$json$Json$Encode$string(string));
	});
var $elm$html$Html$Attributes$class = $elm$html$Html$Attributes$stringProperty('className');
var $elm$html$Html$div = _VirtualDom_node('div');
var $elm$virtual_dom$VirtualDom$map = _VirtualDom_map;
var $elm$html$Html$map = $elm$virtual_dom$VirtualDom$map;
var $elm$html$Html$Attributes$id = $elm$html$Html$Attributes$stringProperty('id');
var $author$project$Editor$Msg$ContainerScroll = function (a) {
	return {$: 'ContainerScroll', a: a};
};
var $elm$virtual_dom$VirtualDom$style = _VirtualDom_style;
var $elm$html$Html$Attributes$style = $elm$virtual_dom$VirtualDom$style;
var $author$project$Editor$Styles$editorContainerStyles = function (active) {
	return _List_fromArray(
		[
			A2($elm$html$Html$Attributes$style, 'font-family', 'JetBrainsMono Nerd Font Mono, Monaco, monospace'),
			A2($elm$html$Html$Attributes$style, 'font-size', 'var(--font-size)'),
			A2($elm$html$Html$Attributes$style, 'line-height', 'var(--line-height)'),
			A2($elm$html$Html$Attributes$style, 'color', 'var(--text-color)'),
			A2($elm$html$Html$Attributes$style, 'margin', '0'),
			A2($elm$html$Html$Attributes$style, 'background', 'var(--background-color)'),
			A2($elm$html$Html$Attributes$style, 'flex', '3'),
			A2($elm$html$Html$Attributes$style, 'width', '100%'),
			A2($elm$html$Html$Attributes$style, 'height', '100%'),
			A2($elm$html$Html$Attributes$style, 'overflow-x', 'hidden'),
			A2($elm$html$Html$Attributes$style, 'overflow-y', 'scroll'),
			A2($elm$html$Html$Attributes$style, 'display', 'flex'),
			function () {
			if (active) {
				return A2($elm$html$Html$Attributes$style, 'user-select', 'none');
			} else {
				return A2($elm$html$Html$Attributes$style, 'user-select', 'text');
			}
		}()
		]);
};
var $elm$virtual_dom$VirtualDom$lazy = _VirtualDom_lazy;
var $elm$html$Html$Lazy$lazy = $elm$virtual_dom$VirtualDom$lazy;
var $elm$virtual_dom$VirtualDom$lazy2 = _VirtualDom_lazy2;
var $elm$html$Html$Lazy$lazy2 = $elm$virtual_dom$VirtualDom$lazy2;
var $author$project$Editor$Msg$ScrollTop = function (scrollTop) {
	return {scrollTop: scrollTop};
};
var $elm$json$Json$Decode$at = F2(
	function (fields, decoder) {
		return A3($elm$core$List$foldr, $elm$json$Json$Decode$field, decoder, fields);
	});
var $elm$virtual_dom$VirtualDom$Normal = function (a) {
	return {$: 'Normal', a: a};
};
var $elm$virtual_dom$VirtualDom$on = _VirtualDom_on;
var $elm$html$Html$Events$on = F2(
	function (event, decoder) {
		return A2(
			$elm$virtual_dom$VirtualDom$on,
			event,
			$elm$virtual_dom$VirtualDom$Normal(decoder));
	});
var $author$project$Editor$onScrollY = function (tagger) {
	return A2(
		$elm$html$Html$Events$on,
		'scroll',
		A2(
			$elm$json$Json$Decode$map,
			tagger,
			A2(
				$elm$json$Json$Decode$map,
				$author$project$Editor$Msg$ScrollTop,
				A2(
					$elm$json$Json$Decode$at,
					_List_fromArray(
						['target', 'scrollTop']),
					$elm$json$Json$Decode$int))));
};
var $elm$virtual_dom$VirtualDom$text = _VirtualDom_text;
var $elm$html$Html$text = $elm$virtual_dom$VirtualDom$text;
var $elm$html$Html$Attributes$classList = function (classes) {
	return $elm$html$Html$Attributes$class(
		A2(
			$elm$core$String$join,
			' ',
			A2(
				$elm$core$List$map,
				$elm$core$Tuple$first,
				A2($elm$core$List$filter, $elm$core$Tuple$second, classes))));
};
var $author$project$Editor$Styles$editorPseudoStyles = '\n    :root {\n        /**\n         * font ratio is usually 0.6 * font-size = width of monospace character\n         */\n        --font-size: 14px;\n        --line-height: 24px;\n        --text-color: #d4d4d4;\n        --background-color: #1e1e1e;\n        --completion-background-color: #635c5c;\n        --completion-selected-background-color: #2b6cb0;\n        --cursor-color: rgba(255, 255, 255, 0.36);\n        --selection-color: rgba(58, 119, 215, 0.36);\n        --error-color: rgba(255, 0, 0, 0.6);\n        --error-message-background-color: #2d3748;\n        --error-text-color: white;\n    }\n\n    .error {\n         border-bottom: 1px solid var(--error-color);\n         position: relative;\n         padding-bottom: 3px;\n    }\n\n    .error:hover .message, .message:hover {\n        display: block;\n        overflow: scroll;\n        max-height: 250px;\n        max-width: 500px;\n    }\n\n    .error .message {\n        z-index: 1;\n        top: 100%;\n        color: white;\n        position: absolute;\n        left: 0;\n        user-select: text;\n        white-space: pre;\n        display: none;\n        width: max-content;\n        background: var(--error-message-background-color);\n        padding: 10px;\n    }\n\n    /** Normal mode cursor **/\n    .mode--normal .cursor::before {\n        content: " ";\n        white-space: pre;\n        position: absolute;\n        height: var(--line-height);\n        border-bottom: 1px solid white;\n        background: var(--cursor-color);\n    }\n\n    /** Insert mode cursor **/\n    .mode--insert .cursor::before {\n        content: " ";\n        position: absolute;\n        height: var(--line-height);\n        border-left: 2px solid var(--cursor-color);\n        background: transparent;\n    }\n\n    .mode--insert .cursor-at-end::after {\n        content: " ";\n        margin-left: -1px;\n        border-left: 2px solid var(--cursor-color);\n    }\n    ';
var $elm$core$String$fromFloat = _String_fromNumber;
var $author$project$Editor$Styles$editorStyles = F2(
	function (config, lineNumbersWidth) {
		return _List_fromArray(
			[
				A2($elm$html$Html$Attributes$style, 'display', 'flex'),
				A2($elm$html$Html$Attributes$style, 'min-height', '100%'),
				A2($elm$html$Html$Attributes$style, 'height', 'fit-content'),
				function () {
				var _v0 = config.showLineNumbers;
				if (_v0) {
					return A2(
						$elm$html$Html$Attributes$style,
						'width',
						'calc(100% - ' + ($elm$core$String$fromFloat(lineNumbersWidth) + 'px)'));
				} else {
					return A2($elm$html$Html$Attributes$style, 'width', '100%');
				}
			}(),
				A2($elm$html$Html$Attributes$style, 'position', 'relative'),
				A2($elm$html$Html$Attributes$style, 'cursor', 'text')
			]);
	});
var $author$project$Editor$Constants$lineNumbersRightMargin = 5;
var $author$project$Editor$Lib$getEditorLineNumbersWidth = function (numberOfLines) {
	return A2(
		$elm$core$Basics$max,
		40,
		$author$project$Editor$Constants$characterWidth * $elm$core$String$length(
			$elm$core$String$fromInt(numberOfLines))) + $author$project$Editor$Constants$lineNumbersRightMargin;
};
var $elm$virtual_dom$VirtualDom$lazy3 = _VirtualDom_lazy3;
var $elm$html$Html$Lazy$lazy3 = $elm$virtual_dom$VirtualDom$lazy3;
var $elm$virtual_dom$VirtualDom$lazy4 = _VirtualDom_lazy4;
var $elm$html$Html$Lazy$lazy4 = $elm$virtual_dom$VirtualDom$lazy4;
var $elm$virtual_dom$VirtualDom$node = function (tag) {
	return _VirtualDom_node(
		_VirtualDom_noScript(tag));
};
var $elm$html$Html$node = $elm$virtual_dom$VirtualDom$node;
var $author$project$Editor$Lib$renderCompletions = F2(
	function (selectedCompletionIndex, completions) {
		return A2(
			$elm$html$Html$div,
			_List_fromArray(
				[
					A2($elm$html$Html$Attributes$style, 'position', 'absolute'),
					A2(
					$elm$html$Html$Attributes$style,
					'top',
					$elm$core$String$fromInt($author$project$Editor$Constants$lineHeight) + 'px'),
					A2($elm$html$Html$Attributes$style, 'background', 'var(--completion-background-color)'),
					A2($elm$html$Html$Attributes$style, 'width', 'max-content'),
					A2($elm$html$Html$Attributes$style, 'display', 'flex'),
					A2($elm$html$Html$Attributes$style, 'flex-direction', 'column')
				]),
			A2(
				$elm$core$List$indexedMap,
				F2(
					function (index, completion) {
						return A2(
							$elm$html$Html$div,
							_List_fromArray(
								[
									A2($elm$html$Html$Attributes$style, 'padding', '0 8px'),
									A2(
									$elm$html$Html$Attributes$style,
									'background',
									_Utils_eq(selectedCompletionIndex, index) ? 'var(--completion-selected-background-color)' : '')
								]),
							_List_fromArray(
								[
									$elm$html$Html$text(completion.label)
								]));
					}),
				completions));
	});
var $author$project$Editor$Styles$cursorStyles = _List_fromArray(
	[
		A2($elm$html$Html$Attributes$style, 'background', 'var(--background-color)'),
		A2($elm$html$Html$Attributes$style, 'pointer-events', 'none')
	]);
var $elm$html$Html$span = _VirtualDom_node('span');
var $author$project$Editor$Lib$renderCursor = F4(
	function (config, cursorPositions, scrollLeft, renderedCompletions) {
		var _v0 = config.showCursor;
		if (!_v0) {
			return $elm$html$Html$text('');
		} else {
			var _v1 = cursorPositions;
			var x = _v1.x;
			var y = _v1.y;
			return A2(
				$elm$html$Html$span,
				_Utils_ap(
					_List_fromArray(
						[
							$elm$html$Html$Attributes$class('cursor'),
							A2($elm$html$Html$Attributes$style, 'position', 'absolute'),
							A2(
							$elm$html$Html$Attributes$style,
							'left',
							$elm$core$String$fromFloat((x * $author$project$Editor$Constants$characterWidth) - scrollLeft) + 'px'),
							A2(
							$elm$html$Html$Attributes$style,
							'top',
							$elm$core$String$fromInt(y * $author$project$Editor$Constants$lineHeight) + 'px')
						]),
					$author$project$Editor$Styles$cursorStyles),
				_List_fromArray(
					[renderedCompletions]));
		}
	});
var $elm$core$Basics$abs = function (n) {
	return (n < 0) ? (-n) : n;
};
var $author$project$Editor$Styles$selectionStyles = _List_fromArray(
	[
		A2($elm$html$Html$Attributes$style, 'position', 'absolute'),
		A2($elm$html$Html$Attributes$style, 'background', 'var(--selection-color)'),
		A2($elm$html$Html$Attributes$style, 'pointer-events', 'none')
	]);
var $author$project$Editor$Lib$renderSelection = F2(
	function (selection, scrollLeft) {
		if (selection.$ === 'Just') {
			var _v1 = selection.a;
			var start = _v1.a;
			var end = _v1.b;
			var _v2 = _Utils_eq(start.y, end.y);
			if (_v2) {
				return A2(
					$elm$html$Html$div,
					_Utils_ap(
						_List_fromArray(
							[
								A2(
								$elm$html$Html$Attributes$style,
								'left',
								$elm$core$String$fromFloat(
									((_Utils_cmp(start.x, end.x) < 1) ? (start.x * $author$project$Editor$Constants$characterWidth) : (end.x * $author$project$Editor$Constants$characterWidth)) - scrollLeft) + 'px'),
								A2(
								$elm$html$Html$Attributes$style,
								'top',
								$elm$core$String$fromInt(start.y * $author$project$Editor$Constants$lineHeight) + 'px'),
								A2(
								$elm$html$Html$Attributes$style,
								'width',
								$elm$core$String$fromFloat(
									($elm$core$Basics$abs(start.x - end.x) + 1) * $author$project$Editor$Constants$characterWidth) + 'px'),
								A2(
								$elm$html$Html$Attributes$style,
								'height',
								$elm$core$String$fromInt($author$project$Editor$Constants$lineHeight) + 'px')
							]),
						$author$project$Editor$Styles$selectionStyles),
					_List_Nil);
			} else {
				var left = (((_Utils_cmp(start.y, end.y) < 0) || _Utils_eq(start.y, end.y)) ? (start.x * $author$project$Editor$Constants$characterWidth) : 0) - scrollLeft;
				return A2(
					$elm$html$Html$div,
					_List_Nil,
					_List_fromArray(
						[
							A2(
							$elm$html$Html$div,
							_Utils_ap(
								_List_fromArray(
									[
										A2(
										$elm$html$Html$Attributes$style,
										'left',
										$elm$core$String$fromFloat(left) + 'px'),
										A2(
										$elm$html$Html$Attributes$style,
										'top',
										$elm$core$String$fromInt(start.y * $author$project$Editor$Constants$lineHeight) + 'px'),
										A2(
										$elm$html$Html$Attributes$style,
										'width',
										((_Utils_cmp(start.y, end.y) < 0) || _Utils_eq(start.y, end.y)) ? ('calc(100% - ' + ($elm$core$String$fromFloat(left) + 'px)')) : ($elm$core$String$fromFloat((start.x + 1) * $author$project$Editor$Constants$characterWidth) + 'px')),
										A2(
										$elm$html$Html$Attributes$style,
										'height',
										$elm$core$String$fromInt($author$project$Editor$Constants$lineHeight) + 'px')
									]),
								$author$project$Editor$Styles$selectionStyles),
							_List_Nil),
							A2(
							$elm$html$Html$div,
							_Utils_ap(
								_List_fromArray(
									[
										A2($elm$html$Html$Attributes$style, 'left', '0'),
										A2(
										$elm$html$Html$Attributes$style,
										'top',
										$elm$core$String$fromInt(
											(((_Utils_cmp(start.y, end.y) < 0) ? start.y : end.y) + 1) * $author$project$Editor$Constants$lineHeight) + 'px'),
										A2($elm$html$Html$Attributes$style, 'width', '100%'),
										A2(
										$elm$html$Html$Attributes$style,
										'height',
										$elm$core$String$fromInt(
											$author$project$Editor$Constants$lineHeight * A2(
												$elm$core$Basics$max,
												0,
												$elm$core$Basics$abs(end.y - start.y) - 1)) + 'px')
									]),
								$author$project$Editor$Styles$selectionStyles),
							_List_Nil),
							A2(
							$elm$html$Html$div,
							_Utils_ap(
								_List_fromArray(
									[
										A2(
										$elm$html$Html$Attributes$style,
										'left',
										$elm$core$String$fromFloat(
											(((_Utils_cmp(start.y, end.y) < 0) || _Utils_eq(start.y, end.y)) ? 0 : (end.x * $author$project$Editor$Constants$characterWidth)) - scrollLeft) + 'px'),
										A2(
										$elm$html$Html$Attributes$style,
										'top',
										$elm$core$String$fromInt(end.y * $author$project$Editor$Constants$lineHeight) + 'px'),
										A2(
										$elm$html$Html$Attributes$style,
										'width',
										((_Utils_cmp(start.y, end.y) < 0) || _Utils_eq(start.y, end.y)) ? ($elm$core$String$fromFloat((end.x + 1) * $author$project$Editor$Constants$characterWidth) + 'px') : '100%'),
										A2(
										$elm$html$Html$Attributes$style,
										'height',
										$elm$core$String$fromInt($author$project$Editor$Constants$lineHeight) + 'px')
									]),
								$author$project$Editor$Styles$selectionStyles),
							_List_Nil)
						]));
			}
		} else {
			return A2($elm$html$Html$div, _List_Nil, _List_Nil);
		}
	});
var $author$project$Editor$Msg$RenderedScroll = function (a) {
	return {$: 'RenderedScroll', a: a};
};
var $elm$virtual_dom$VirtualDom$keyedNode = function (tag) {
	return _VirtualDom_keyedNode(
		_VirtualDom_noScript(tag));
};
var $elm$html$Html$Keyed$node = $elm$virtual_dom$VirtualDom$keyedNode;
var $author$project$Editor$Msg$ScrollLeft = function (scrollLeft) {
	return {scrollLeft: scrollLeft};
};
var $author$project$Editor$onScrollX = function (tagger) {
	return A2(
		$elm$html$Html$Events$on,
		'scroll',
		A2(
			$elm$json$Json$Decode$map,
			tagger,
			A2(
				$elm$json$Json$Decode$map,
				$author$project$Editor$Msg$ScrollLeft,
				A2(
					$elm$json$Json$Decode$at,
					_List_fromArray(
						['target', 'scrollLeft']),
					$elm$json$Json$Decode$int))));
};
var $author$project$Editor$Styles$renderedStyles = function (config) {
	return _List_fromArray(
		[
			function () {
			var _v0 = config.padRight;
			if (_v0) {
				return A2($elm$html$Html$Attributes$style, 'padding-right', '250px');
			} else {
				return A2($elm$html$Html$Attributes$style, 'padding-right', '0');
			}
		}(),
			function () {
			var _v1 = config.padBottom;
			if (_v1) {
				return A2($elm$html$Html$Attributes$style, 'padding-bottom', '250px');
			} else {
				return A2($elm$html$Html$Attributes$style, 'padding-bottom', '0');
			}
		}(),
			A2($elm$html$Html$Attributes$style, 'height', '100%'),
			A2($elm$html$Html$Attributes$style, 'flex', '1'),
			A2($elm$html$Html$Attributes$style, 'overflow', 'hidden'),
			A2($elm$html$Html$Attributes$style, 'margin-top', '0'),
			A2($elm$html$Html$Attributes$style, 'white-space', 'pre'),
			A2($elm$html$Html$Attributes$style, 'color', 'var(--text-color)'),
			A2($elm$html$Html$Attributes$style, 'overflow-x', 'scroll')
		]);
};
var $author$project$Editor$Msg$MouseClick = function (a) {
	return {$: 'MouseClick', a: a};
};
var $author$project$Editor$Msg$MouseDown = function (a) {
	return {$: 'MouseDown', a: a};
};
var $author$project$Editor$Msg$MouseMove = function (a) {
	return {$: 'MouseMove', a: a};
};
var $author$project$Editor$Msg$MouseUp = function (a) {
	return {$: 'MouseUp', a: a};
};
var $elm$virtual_dom$VirtualDom$Custom = function (a) {
	return {$: 'Custom', a: a};
};
var $elm$html$Html$Events$custom = F2(
	function (event, decoder) {
		return A2(
			$elm$virtual_dom$VirtualDom$on,
			event,
			$elm$virtual_dom$VirtualDom$Custom(decoder));
	});
var $elm$core$Basics$round = _Basics_round;
var $author$project$Editor$Lib$mouseEventToEditorPosition = F3(
	function (event, msg, lineNumber) {
		return A2(
			$elm$html$Html$Events$custom,
			event,
			A2(
				$elm$json$Json$Decode$map,
				function (message) {
					return {message: message, preventDefault: false, stopPropagation: false};
				},
				A2(
					$elm$json$Json$Decode$map,
					function (x) {
						return msg(
							{
								x: $elm$core$Basics$round((x - ($author$project$Editor$Constants$characterWidth / 2)) / $author$project$Editor$Constants$characterWidth),
								y: lineNumber
							});
					},
					A2($elm$json$Json$Decode$field, 'offsetX', $elm$json$Json$Decode$int))));
	});
var $author$project$Editor$Syntax$SymbolKind$kindToSymbolClass = function (number) {
	switch (number) {
		case 100:
			return 'syntax-multiline-string';
		case 101:
			return 'syntax-multiline-comment';
		default:
			return '';
	}
};
var $hecrj$html_parser$Html$Parser$Element = F3(
	function (a, b, c) {
		return {$: 'Element', a: a, b: b, c: c};
	});
var $elm$parser$Parser$Advanced$Bad = F2(
	function (a, b) {
		return {$: 'Bad', a: a, b: b};
	});
var $elm$parser$Parser$Advanced$Good = F3(
	function (a, b, c) {
		return {$: 'Good', a: a, b: b, c: c};
	});
var $elm$parser$Parser$Advanced$Parser = function (a) {
	return {$: 'Parser', a: a};
};
var $elm$parser$Parser$Advanced$andThen = F2(
	function (callback, _v0) {
		var parseA = _v0.a;
		return $elm$parser$Parser$Advanced$Parser(
			function (s0) {
				var _v1 = parseA(s0);
				if (_v1.$ === 'Bad') {
					var p = _v1.a;
					var x = _v1.b;
					return A2($elm$parser$Parser$Advanced$Bad, p, x);
				} else {
					var p1 = _v1.a;
					var a = _v1.b;
					var s1 = _v1.c;
					var _v2 = callback(a);
					var parseB = _v2.a;
					var _v3 = parseB(s1);
					if (_v3.$ === 'Bad') {
						var p2 = _v3.a;
						var x = _v3.b;
						return A2($elm$parser$Parser$Advanced$Bad, p1 || p2, x);
					} else {
						var p2 = _v3.a;
						var b = _v3.b;
						var s2 = _v3.c;
						return A3($elm$parser$Parser$Advanced$Good, p1 || p2, b, s2);
					}
				}
			});
	});
var $elm$parser$Parser$andThen = $elm$parser$Parser$Advanced$andThen;
var $elm$parser$Parser$Advanced$backtrackable = function (_v0) {
	var parse = _v0.a;
	return $elm$parser$Parser$Advanced$Parser(
		function (s0) {
			var _v1 = parse(s0);
			if (_v1.$ === 'Bad') {
				var x = _v1.b;
				return A2($elm$parser$Parser$Advanced$Bad, false, x);
			} else {
				var a = _v1.b;
				var s1 = _v1.c;
				return A3($elm$parser$Parser$Advanced$Good, false, a, s1);
			}
		});
};
var $elm$parser$Parser$backtrackable = $elm$parser$Parser$Advanced$backtrackable;
var $elm$parser$Parser$UnexpectedChar = {$: 'UnexpectedChar'};
var $elm$parser$Parser$Advanced$AddRight = F2(
	function (a, b) {
		return {$: 'AddRight', a: a, b: b};
	});
var $elm$parser$Parser$Advanced$DeadEnd = F4(
	function (row, col, problem, contextStack) {
		return {col: col, contextStack: contextStack, problem: problem, row: row};
	});
var $elm$parser$Parser$Advanced$Empty = {$: 'Empty'};
var $elm$parser$Parser$Advanced$fromState = F2(
	function (s, x) {
		return A2(
			$elm$parser$Parser$Advanced$AddRight,
			$elm$parser$Parser$Advanced$Empty,
			A4($elm$parser$Parser$Advanced$DeadEnd, s.row, s.col, x, s.context));
	});
var $elm$parser$Parser$Advanced$isSubChar = _Parser_isSubChar;
var $elm$parser$Parser$Advanced$chompIf = F2(
	function (isGood, expecting) {
		return $elm$parser$Parser$Advanced$Parser(
			function (s) {
				var newOffset = A3($elm$parser$Parser$Advanced$isSubChar, isGood, s.offset, s.src);
				return _Utils_eq(newOffset, -1) ? A2(
					$elm$parser$Parser$Advanced$Bad,
					false,
					A2($elm$parser$Parser$Advanced$fromState, s, expecting)) : (_Utils_eq(newOffset, -2) ? A3(
					$elm$parser$Parser$Advanced$Good,
					true,
					_Utils_Tuple0,
					{col: 1, context: s.context, indent: s.indent, offset: s.offset + 1, row: s.row + 1, src: s.src}) : A3(
					$elm$parser$Parser$Advanced$Good,
					true,
					_Utils_Tuple0,
					{col: s.col + 1, context: s.context, indent: s.indent, offset: newOffset, row: s.row, src: s.src}));
			});
	});
var $elm$parser$Parser$chompIf = function (isGood) {
	return A2($elm$parser$Parser$Advanced$chompIf, isGood, $elm$parser$Parser$UnexpectedChar);
};
var $elm$parser$Parser$Advanced$chompWhileHelp = F5(
	function (isGood, offset, row, col, s0) {
		chompWhileHelp:
		while (true) {
			var newOffset = A3($elm$parser$Parser$Advanced$isSubChar, isGood, offset, s0.src);
			if (_Utils_eq(newOffset, -1)) {
				return A3(
					$elm$parser$Parser$Advanced$Good,
					_Utils_cmp(s0.offset, offset) < 0,
					_Utils_Tuple0,
					{col: col, context: s0.context, indent: s0.indent, offset: offset, row: row, src: s0.src});
			} else {
				if (_Utils_eq(newOffset, -2)) {
					var $temp$isGood = isGood,
						$temp$offset = offset + 1,
						$temp$row = row + 1,
						$temp$col = 1,
						$temp$s0 = s0;
					isGood = $temp$isGood;
					offset = $temp$offset;
					row = $temp$row;
					col = $temp$col;
					s0 = $temp$s0;
					continue chompWhileHelp;
				} else {
					var $temp$isGood = isGood,
						$temp$offset = newOffset,
						$temp$row = row,
						$temp$col = col + 1,
						$temp$s0 = s0;
					isGood = $temp$isGood;
					offset = $temp$offset;
					row = $temp$row;
					col = $temp$col;
					s0 = $temp$s0;
					continue chompWhileHelp;
				}
			}
		}
	});
var $elm$parser$Parser$Advanced$chompWhile = function (isGood) {
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			return A5($elm$parser$Parser$Advanced$chompWhileHelp, isGood, s.offset, s.row, s.col, s);
		});
};
var $elm$parser$Parser$chompWhile = $elm$parser$Parser$Advanced$chompWhile;
var $elm$parser$Parser$Advanced$map2 = F3(
	function (func, _v0, _v1) {
		var parseA = _v0.a;
		var parseB = _v1.a;
		return $elm$parser$Parser$Advanced$Parser(
			function (s0) {
				var _v2 = parseA(s0);
				if (_v2.$ === 'Bad') {
					var p = _v2.a;
					var x = _v2.b;
					return A2($elm$parser$Parser$Advanced$Bad, p, x);
				} else {
					var p1 = _v2.a;
					var a = _v2.b;
					var s1 = _v2.c;
					var _v3 = parseB(s1);
					if (_v3.$ === 'Bad') {
						var p2 = _v3.a;
						var x = _v3.b;
						return A2($elm$parser$Parser$Advanced$Bad, p1 || p2, x);
					} else {
						var p2 = _v3.a;
						var b = _v3.b;
						var s2 = _v3.c;
						return A3(
							$elm$parser$Parser$Advanced$Good,
							p1 || p2,
							A2(func, a, b),
							s2);
					}
				}
			});
	});
var $elm$parser$Parser$Advanced$ignorer = F2(
	function (keepParser, ignoreParser) {
		return A3($elm$parser$Parser$Advanced$map2, $elm$core$Basics$always, keepParser, ignoreParser);
	});
var $elm$parser$Parser$ignorer = $elm$parser$Parser$Advanced$ignorer;
var $hecrj$html_parser$Html$Parser$chompOneOrMore = function (fn) {
	return A2(
		$elm$parser$Parser$ignorer,
		$elm$parser$Parser$chompIf(fn),
		$elm$parser$Parser$chompWhile(fn));
};
var $elm$parser$Parser$Advanced$mapChompedString = F2(
	function (func, _v0) {
		var parse = _v0.a;
		return $elm$parser$Parser$Advanced$Parser(
			function (s0) {
				var _v1 = parse(s0);
				if (_v1.$ === 'Bad') {
					var p = _v1.a;
					var x = _v1.b;
					return A2($elm$parser$Parser$Advanced$Bad, p, x);
				} else {
					var p = _v1.a;
					var a = _v1.b;
					var s1 = _v1.c;
					return A3(
						$elm$parser$Parser$Advanced$Good,
						p,
						A2(
							func,
							A3($elm$core$String$slice, s0.offset, s1.offset, s0.src),
							a),
						s1);
				}
			});
	});
var $elm$parser$Parser$Advanced$getChompedString = function (parser) {
	return A2($elm$parser$Parser$Advanced$mapChompedString, $elm$core$Basics$always, parser);
};
var $elm$parser$Parser$getChompedString = $elm$parser$Parser$Advanced$getChompedString;
var $hecrj$html_parser$Html$Parser$isSpaceCharacter = function (c) {
	return _Utils_eq(
		c,
		_Utils_chr(' ')) || (_Utils_eq(
		c,
		_Utils_chr('\t')) || (_Utils_eq(
		c,
		_Utils_chr('\n')) || (_Utils_eq(
		c,
		_Utils_chr('\u000D')) || (_Utils_eq(
		c,
		_Utils_chr('\u000C')) || _Utils_eq(
		c,
		_Utils_chr('\u00A0'))))));
};
var $elm$parser$Parser$Problem = function (a) {
	return {$: 'Problem', a: a};
};
var $elm$parser$Parser$Advanced$problem = function (x) {
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			return A2(
				$elm$parser$Parser$Advanced$Bad,
				false,
				A2($elm$parser$Parser$Advanced$fromState, s, x));
		});
};
var $elm$parser$Parser$problem = function (msg) {
	return $elm$parser$Parser$Advanced$problem(
		$elm$parser$Parser$Problem(msg));
};
var $elm$parser$Parser$Advanced$succeed = function (a) {
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			return A3($elm$parser$Parser$Advanced$Good, false, a, s);
		});
};
var $elm$parser$Parser$succeed = $elm$parser$Parser$Advanced$succeed;
var $elm$core$String$toLower = _String_toLower;
var $hecrj$html_parser$Html$Parser$closingTag = function (name) {
	var chompName = A2(
		$elm$parser$Parser$andThen,
		function (closingName) {
			return _Utils_eq(
				$elm$core$String$toLower(closingName),
				name) ? $elm$parser$Parser$succeed(_Utils_Tuple0) : $elm$parser$Parser$problem('closing tag does not match opening tag: ' + name);
		},
		$elm$parser$Parser$getChompedString(
			$hecrj$html_parser$Html$Parser$chompOneOrMore(
				function (c) {
					return (!$hecrj$html_parser$Html$Parser$isSpaceCharacter(c)) && (!_Utils_eq(
						c,
						_Utils_chr('>')));
				})));
	return A2(
		$elm$parser$Parser$ignorer,
		A2(
			$elm$parser$Parser$ignorer,
			A2(
				$elm$parser$Parser$ignorer,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$chompIf(
						$elm$core$Basics$eq(
							_Utils_chr('<'))),
					$elm$parser$Parser$chompIf(
						$elm$core$Basics$eq(
							_Utils_chr('/')))),
				chompName),
			$elm$parser$Parser$chompWhile($hecrj$html_parser$Html$Parser$isSpaceCharacter)),
		$elm$parser$Parser$chompIf(
			$elm$core$Basics$eq(
				_Utils_chr('>'))));
};
var $hecrj$html_parser$Html$Parser$Comment = function (a) {
	return {$: 'Comment', a: a};
};
var $elm$parser$Parser$Advanced$findSubString = _Parser_findSubString;
var $elm$parser$Parser$Advanced$fromInfo = F4(
	function (row, col, x, context) {
		return A2(
			$elm$parser$Parser$Advanced$AddRight,
			$elm$parser$Parser$Advanced$Empty,
			A4($elm$parser$Parser$Advanced$DeadEnd, row, col, x, context));
	});
var $elm$parser$Parser$Advanced$chompUntil = function (_v0) {
	var str = _v0.a;
	var expecting = _v0.b;
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			var _v1 = A5($elm$parser$Parser$Advanced$findSubString, str, s.offset, s.row, s.col, s.src);
			var newOffset = _v1.a;
			var newRow = _v1.b;
			var newCol = _v1.c;
			return _Utils_eq(newOffset, -1) ? A2(
				$elm$parser$Parser$Advanced$Bad,
				false,
				A4($elm$parser$Parser$Advanced$fromInfo, newRow, newCol, expecting, s.context)) : A3(
				$elm$parser$Parser$Advanced$Good,
				_Utils_cmp(s.offset, newOffset) < 0,
				_Utils_Tuple0,
				{col: newCol, context: s.context, indent: s.indent, offset: newOffset, row: newRow, src: s.src});
		});
};
var $elm$parser$Parser$Expecting = function (a) {
	return {$: 'Expecting', a: a};
};
var $elm$parser$Parser$Advanced$Token = F2(
	function (a, b) {
		return {$: 'Token', a: a, b: b};
	});
var $elm$parser$Parser$toToken = function (str) {
	return A2(
		$elm$parser$Parser$Advanced$Token,
		str,
		$elm$parser$Parser$Expecting(str));
};
var $elm$parser$Parser$chompUntil = function (str) {
	return $elm$parser$Parser$Advanced$chompUntil(
		$elm$parser$Parser$toToken(str));
};
var $elm$parser$Parser$Advanced$keeper = F2(
	function (parseFunc, parseArg) {
		return A3($elm$parser$Parser$Advanced$map2, $elm$core$Basics$apL, parseFunc, parseArg);
	});
var $elm$parser$Parser$keeper = $elm$parser$Parser$Advanced$keeper;
var $elm$parser$Parser$Advanced$isSubString = _Parser_isSubString;
var $elm$parser$Parser$Advanced$token = function (_v0) {
	var str = _v0.a;
	var expecting = _v0.b;
	var progress = !$elm$core$String$isEmpty(str);
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			var _v1 = A5($elm$parser$Parser$Advanced$isSubString, str, s.offset, s.row, s.col, s.src);
			var newOffset = _v1.a;
			var newRow = _v1.b;
			var newCol = _v1.c;
			return _Utils_eq(newOffset, -1) ? A2(
				$elm$parser$Parser$Advanced$Bad,
				false,
				A2($elm$parser$Parser$Advanced$fromState, s, expecting)) : A3(
				$elm$parser$Parser$Advanced$Good,
				progress,
				_Utils_Tuple0,
				{col: newCol, context: s.context, indent: s.indent, offset: newOffset, row: newRow, src: s.src});
		});
};
var $elm$parser$Parser$token = function (str) {
	return $elm$parser$Parser$Advanced$token(
		$elm$parser$Parser$toToken(str));
};
var $hecrj$html_parser$Html$Parser$commentString = A2(
	$elm$parser$Parser$keeper,
	A2(
		$elm$parser$Parser$ignorer,
		A2(
			$elm$parser$Parser$ignorer,
			$elm$parser$Parser$succeed($elm$core$Basics$identity),
			$elm$parser$Parser$token('<!')),
		$elm$parser$Parser$token('--')),
	A2(
		$elm$parser$Parser$ignorer,
		$elm$parser$Parser$getChompedString(
			$elm$parser$Parser$chompUntil('-->')),
		$elm$parser$Parser$token('-->')));
var $elm$parser$Parser$Advanced$map = F2(
	function (func, _v0) {
		var parse = _v0.a;
		return $elm$parser$Parser$Advanced$Parser(
			function (s0) {
				var _v1 = parse(s0);
				if (_v1.$ === 'Good') {
					var p = _v1.a;
					var a = _v1.b;
					var s1 = _v1.c;
					return A3(
						$elm$parser$Parser$Advanced$Good,
						p,
						func(a),
						s1);
				} else {
					var p = _v1.a;
					var x = _v1.b;
					return A2($elm$parser$Parser$Advanced$Bad, p, x);
				}
			});
	});
var $elm$parser$Parser$map = $elm$parser$Parser$Advanced$map;
var $hecrj$html_parser$Html$Parser$comment = A2($elm$parser$Parser$map, $hecrj$html_parser$Html$Parser$Comment, $hecrj$html_parser$Html$Parser$commentString);
var $elm$core$List$any = F2(
	function (isOkay, list) {
		any:
		while (true) {
			if (!list.b) {
				return false;
			} else {
				var x = list.a;
				var xs = list.b;
				if (isOkay(x)) {
					return true;
				} else {
					var $temp$isOkay = isOkay,
						$temp$list = xs;
					isOkay = $temp$isOkay;
					list = $temp$list;
					continue any;
				}
			}
		}
	});
var $elm$core$List$member = F2(
	function (x, xs) {
		return A2(
			$elm$core$List$any,
			function (a) {
				return _Utils_eq(a, x);
			},
			xs);
	});
var $hecrj$html_parser$Html$Parser$voidElements = _List_fromArray(
	['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
var $hecrj$html_parser$Html$Parser$isVoidElement = function (name) {
	return A2($elm$core$List$member, name, $hecrj$html_parser$Html$Parser$voidElements);
};
var $elm$parser$Parser$Done = function (a) {
	return {$: 'Done', a: a};
};
var $elm$parser$Parser$Loop = function (a) {
	return {$: 'Loop', a: a};
};
var $elm$parser$Parser$Advanced$loopHelp = F4(
	function (p, state, callback, s0) {
		loopHelp:
		while (true) {
			var _v0 = callback(state);
			var parse = _v0.a;
			var _v1 = parse(s0);
			if (_v1.$ === 'Good') {
				var p1 = _v1.a;
				var step = _v1.b;
				var s1 = _v1.c;
				if (step.$ === 'Loop') {
					var newState = step.a;
					var $temp$p = p || p1,
						$temp$state = newState,
						$temp$callback = callback,
						$temp$s0 = s1;
					p = $temp$p;
					state = $temp$state;
					callback = $temp$callback;
					s0 = $temp$s0;
					continue loopHelp;
				} else {
					var result = step.a;
					return A3($elm$parser$Parser$Advanced$Good, p || p1, result, s1);
				}
			} else {
				var p1 = _v1.a;
				var x = _v1.b;
				return A2($elm$parser$Parser$Advanced$Bad, p || p1, x);
			}
		}
	});
var $elm$parser$Parser$Advanced$loop = F2(
	function (state, callback) {
		return $elm$parser$Parser$Advanced$Parser(
			function (s) {
				return A4($elm$parser$Parser$Advanced$loopHelp, false, state, callback, s);
			});
	});
var $elm$parser$Parser$Advanced$Done = function (a) {
	return {$: 'Done', a: a};
};
var $elm$parser$Parser$Advanced$Loop = function (a) {
	return {$: 'Loop', a: a};
};
var $elm$parser$Parser$toAdvancedStep = function (step) {
	if (step.$ === 'Loop') {
		var s = step.a;
		return $elm$parser$Parser$Advanced$Loop(s);
	} else {
		var a = step.a;
		return $elm$parser$Parser$Advanced$Done(a);
	}
};
var $elm$parser$Parser$loop = F2(
	function (state, callback) {
		return A2(
			$elm$parser$Parser$Advanced$loop,
			state,
			function (s) {
				return A2(
					$elm$parser$Parser$map,
					$elm$parser$Parser$toAdvancedStep,
					callback(s));
			});
	});
var $elm$parser$Parser$Advanced$Append = F2(
	function (a, b) {
		return {$: 'Append', a: a, b: b};
	});
var $elm$parser$Parser$Advanced$oneOfHelp = F3(
	function (s0, bag, parsers) {
		oneOfHelp:
		while (true) {
			if (!parsers.b) {
				return A2($elm$parser$Parser$Advanced$Bad, false, bag);
			} else {
				var parse = parsers.a.a;
				var remainingParsers = parsers.b;
				var _v1 = parse(s0);
				if (_v1.$ === 'Good') {
					var step = _v1;
					return step;
				} else {
					var step = _v1;
					var p = step.a;
					var x = step.b;
					if (p) {
						return step;
					} else {
						var $temp$s0 = s0,
							$temp$bag = A2($elm$parser$Parser$Advanced$Append, bag, x),
							$temp$parsers = remainingParsers;
						s0 = $temp$s0;
						bag = $temp$bag;
						parsers = $temp$parsers;
						continue oneOfHelp;
					}
				}
			}
		}
	});
var $elm$parser$Parser$Advanced$oneOf = function (parsers) {
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			return A3($elm$parser$Parser$Advanced$oneOfHelp, s, $elm$parser$Parser$Advanced$Empty, parsers);
		});
};
var $elm$parser$Parser$oneOf = $elm$parser$Parser$Advanced$oneOf;
var $hecrj$html_parser$Html$Parser$many = function (parser_) {
	return A2(
		$elm$parser$Parser$loop,
		_List_Nil,
		function (list) {
			return $elm$parser$Parser$oneOf(
				_List_fromArray(
					[
						A2(
						$elm$parser$Parser$map,
						function (_new) {
							return $elm$parser$Parser$Loop(
								A2($elm$core$List$cons, _new, list));
						},
						parser_),
						$elm$parser$Parser$succeed(
						$elm$parser$Parser$Done(
							$elm$core$List$reverse(list)))
					]));
		});
};
var $elm$core$Tuple$pair = F2(
	function (a, b) {
		return _Utils_Tuple2(a, b);
	});
var $hecrj$html_parser$Html$Parser$isTagAttributeCharacter = function (c) {
	return (!$hecrj$html_parser$Html$Parser$isSpaceCharacter(c)) && ((!_Utils_eq(
		c,
		_Utils_chr('\"'))) && ((!_Utils_eq(
		c,
		_Utils_chr('\''))) && ((!_Utils_eq(
		c,
		_Utils_chr('>'))) && ((!_Utils_eq(
		c,
		_Utils_chr('/'))) && (!_Utils_eq(
		c,
		_Utils_chr('=')))))));
};
var $hecrj$html_parser$Html$Parser$tagAttributeName = A2(
	$elm$parser$Parser$map,
	$elm$core$String$toLower,
	$elm$parser$Parser$getChompedString(
		$hecrj$html_parser$Html$Parser$chompOneOrMore($hecrj$html_parser$Html$Parser$isTagAttributeCharacter)));
var $hecrj$html_parser$Html$Parser$chompSemicolon = $elm$parser$Parser$chompIf(
	$elm$core$Basics$eq(
		_Utils_chr(';')));
var $hecrj$html_parser$Html$Parser$NamedCharacterReferences$dict = $elm$core$Dict$fromList(
	_List_fromArray(
		[
			_Utils_Tuple2('Aacute', 'Á'),
			_Utils_Tuple2('aacute', 'á'),
			_Utils_Tuple2('Abreve', 'Ă'),
			_Utils_Tuple2('abreve', 'ă'),
			_Utils_Tuple2('ac', '∾'),
			_Utils_Tuple2('acd', '∿'),
			_Utils_Tuple2('acE', '∾̳'),
			_Utils_Tuple2('Acirc', 'Â'),
			_Utils_Tuple2('acirc', 'â'),
			_Utils_Tuple2('acute', '´'),
			_Utils_Tuple2('Acy', 'А'),
			_Utils_Tuple2('acy', 'а'),
			_Utils_Tuple2('AElig', 'Æ'),
			_Utils_Tuple2('aelig', 'æ'),
			_Utils_Tuple2('af', '\u2061'),
			_Utils_Tuple2('Afr', '\uD835\uDD04'),
			_Utils_Tuple2('afr', '\uD835\uDD1E'),
			_Utils_Tuple2('Agrave', 'À'),
			_Utils_Tuple2('agrave', 'à'),
			_Utils_Tuple2('alefsym', 'ℵ'),
			_Utils_Tuple2('aleph', 'ℵ'),
			_Utils_Tuple2('Alpha', 'Α'),
			_Utils_Tuple2('alpha', 'α'),
			_Utils_Tuple2('Amacr', 'Ā'),
			_Utils_Tuple2('amacr', 'ā'),
			_Utils_Tuple2('amalg', '⨿'),
			_Utils_Tuple2('amp', '&'),
			_Utils_Tuple2('AMP', '&'),
			_Utils_Tuple2('andand', '⩕'),
			_Utils_Tuple2('And', '⩓'),
			_Utils_Tuple2('and', '∧'),
			_Utils_Tuple2('andd', '⩜'),
			_Utils_Tuple2('andslope', '⩘'),
			_Utils_Tuple2('andv', '⩚'),
			_Utils_Tuple2('ang', '∠'),
			_Utils_Tuple2('ange', '⦤'),
			_Utils_Tuple2('angle', '∠'),
			_Utils_Tuple2('angmsdaa', '⦨'),
			_Utils_Tuple2('angmsdab', '⦩'),
			_Utils_Tuple2('angmsdac', '⦪'),
			_Utils_Tuple2('angmsdad', '⦫'),
			_Utils_Tuple2('angmsdae', '⦬'),
			_Utils_Tuple2('angmsdaf', '⦭'),
			_Utils_Tuple2('angmsdag', '⦮'),
			_Utils_Tuple2('angmsdah', '⦯'),
			_Utils_Tuple2('angmsd', '∡'),
			_Utils_Tuple2('angrt', '∟'),
			_Utils_Tuple2('angrtvb', '⊾'),
			_Utils_Tuple2('angrtvbd', '⦝'),
			_Utils_Tuple2('angsph', '∢'),
			_Utils_Tuple2('angst', 'Å'),
			_Utils_Tuple2('angzarr', '⍼'),
			_Utils_Tuple2('Aogon', 'Ą'),
			_Utils_Tuple2('aogon', 'ą'),
			_Utils_Tuple2('Aopf', '\uD835\uDD38'),
			_Utils_Tuple2('aopf', '\uD835\uDD52'),
			_Utils_Tuple2('apacir', '⩯'),
			_Utils_Tuple2('ap', '≈'),
			_Utils_Tuple2('apE', '⩰'),
			_Utils_Tuple2('ape', '≊'),
			_Utils_Tuple2('apid', '≋'),
			_Utils_Tuple2('apos', '\''),
			_Utils_Tuple2('ApplyFunction', '\u2061'),
			_Utils_Tuple2('approx', '≈'),
			_Utils_Tuple2('approxeq', '≊'),
			_Utils_Tuple2('Aring', 'Å'),
			_Utils_Tuple2('aring', 'å'),
			_Utils_Tuple2('Ascr', '\uD835\uDC9C'),
			_Utils_Tuple2('ascr', '\uD835\uDCB6'),
			_Utils_Tuple2('Assign', '≔'),
			_Utils_Tuple2('ast', '*'),
			_Utils_Tuple2('asymp', '≈'),
			_Utils_Tuple2('asympeq', '≍'),
			_Utils_Tuple2('Atilde', 'Ã'),
			_Utils_Tuple2('atilde', 'ã'),
			_Utils_Tuple2('Auml', 'Ä'),
			_Utils_Tuple2('auml', 'ä'),
			_Utils_Tuple2('awconint', '∳'),
			_Utils_Tuple2('awint', '⨑'),
			_Utils_Tuple2('backcong', '≌'),
			_Utils_Tuple2('backepsilon', '϶'),
			_Utils_Tuple2('backprime', '‵'),
			_Utils_Tuple2('backsim', '∽'),
			_Utils_Tuple2('backsimeq', '⋍'),
			_Utils_Tuple2('Backslash', '∖'),
			_Utils_Tuple2('Barv', '⫧'),
			_Utils_Tuple2('barvee', '⊽'),
			_Utils_Tuple2('barwed', '⌅'),
			_Utils_Tuple2('Barwed', '⌆'),
			_Utils_Tuple2('barwedge', '⌅'),
			_Utils_Tuple2('bbrk', '⎵'),
			_Utils_Tuple2('bbrktbrk', '⎶'),
			_Utils_Tuple2('bcong', '≌'),
			_Utils_Tuple2('Bcy', 'Б'),
			_Utils_Tuple2('bcy', 'б'),
			_Utils_Tuple2('bdquo', '„'),
			_Utils_Tuple2('becaus', '∵'),
			_Utils_Tuple2('because', '∵'),
			_Utils_Tuple2('Because', '∵'),
			_Utils_Tuple2('bemptyv', '⦰'),
			_Utils_Tuple2('bepsi', '϶'),
			_Utils_Tuple2('bernou', 'ℬ'),
			_Utils_Tuple2('Bernoullis', 'ℬ'),
			_Utils_Tuple2('Beta', 'Β'),
			_Utils_Tuple2('beta', 'β'),
			_Utils_Tuple2('beth', 'ℶ'),
			_Utils_Tuple2('between', '≬'),
			_Utils_Tuple2('Bfr', '\uD835\uDD05'),
			_Utils_Tuple2('bfr', '\uD835\uDD1F'),
			_Utils_Tuple2('bigcap', '⋂'),
			_Utils_Tuple2('bigcirc', '◯'),
			_Utils_Tuple2('bigcup', '⋃'),
			_Utils_Tuple2('bigodot', '⨀'),
			_Utils_Tuple2('bigoplus', '⨁'),
			_Utils_Tuple2('bigotimes', '⨂'),
			_Utils_Tuple2('bigsqcup', '⨆'),
			_Utils_Tuple2('bigstar', '★'),
			_Utils_Tuple2('bigtriangledown', '▽'),
			_Utils_Tuple2('bigtriangleup', '△'),
			_Utils_Tuple2('biguplus', '⨄'),
			_Utils_Tuple2('bigvee', '⋁'),
			_Utils_Tuple2('bigwedge', '⋀'),
			_Utils_Tuple2('bkarow', '⤍'),
			_Utils_Tuple2('blacklozenge', '⧫'),
			_Utils_Tuple2('blacksquare', '▪'),
			_Utils_Tuple2('blacktriangle', '▴'),
			_Utils_Tuple2('blacktriangledown', '▾'),
			_Utils_Tuple2('blacktriangleleft', '◂'),
			_Utils_Tuple2('blacktriangleright', '▸'),
			_Utils_Tuple2('blank', '␣'),
			_Utils_Tuple2('blk12', '▒'),
			_Utils_Tuple2('blk14', '░'),
			_Utils_Tuple2('blk34', '▓'),
			_Utils_Tuple2('block', '█'),
			_Utils_Tuple2('bne', '=⃥'),
			_Utils_Tuple2('bnequiv', '≡⃥'),
			_Utils_Tuple2('bNot', '⫭'),
			_Utils_Tuple2('bnot', '⌐'),
			_Utils_Tuple2('Bopf', '\uD835\uDD39'),
			_Utils_Tuple2('bopf', '\uD835\uDD53'),
			_Utils_Tuple2('bot', '⊥'),
			_Utils_Tuple2('bottom', '⊥'),
			_Utils_Tuple2('bowtie', '⋈'),
			_Utils_Tuple2('boxbox', '⧉'),
			_Utils_Tuple2('boxdl', '┐'),
			_Utils_Tuple2('boxdL', '╕'),
			_Utils_Tuple2('boxDl', '╖'),
			_Utils_Tuple2('boxDL', '╗'),
			_Utils_Tuple2('boxdr', '┌'),
			_Utils_Tuple2('boxdR', '╒'),
			_Utils_Tuple2('boxDr', '╓'),
			_Utils_Tuple2('boxDR', '╔'),
			_Utils_Tuple2('boxh', '─'),
			_Utils_Tuple2('boxH', '═'),
			_Utils_Tuple2('boxhd', '┬'),
			_Utils_Tuple2('boxHd', '╤'),
			_Utils_Tuple2('boxhD', '╥'),
			_Utils_Tuple2('boxHD', '╦'),
			_Utils_Tuple2('boxhu', '┴'),
			_Utils_Tuple2('boxHu', '╧'),
			_Utils_Tuple2('boxhU', '╨'),
			_Utils_Tuple2('boxHU', '╩'),
			_Utils_Tuple2('boxminus', '⊟'),
			_Utils_Tuple2('boxplus', '⊞'),
			_Utils_Tuple2('boxtimes', '⊠'),
			_Utils_Tuple2('boxul', '┘'),
			_Utils_Tuple2('boxuL', '╛'),
			_Utils_Tuple2('boxUl', '╜'),
			_Utils_Tuple2('boxUL', '╝'),
			_Utils_Tuple2('boxur', '└'),
			_Utils_Tuple2('boxuR', '╘'),
			_Utils_Tuple2('boxUr', '╙'),
			_Utils_Tuple2('boxUR', '╚'),
			_Utils_Tuple2('boxv', '│'),
			_Utils_Tuple2('boxV', '║'),
			_Utils_Tuple2('boxvh', '┼'),
			_Utils_Tuple2('boxvH', '╪'),
			_Utils_Tuple2('boxVh', '╫'),
			_Utils_Tuple2('boxVH', '╬'),
			_Utils_Tuple2('boxvl', '┤'),
			_Utils_Tuple2('boxvL', '╡'),
			_Utils_Tuple2('boxVl', '╢'),
			_Utils_Tuple2('boxVL', '╣'),
			_Utils_Tuple2('boxvr', '├'),
			_Utils_Tuple2('boxvR', '╞'),
			_Utils_Tuple2('boxVr', '╟'),
			_Utils_Tuple2('boxVR', '╠'),
			_Utils_Tuple2('bprime', '‵'),
			_Utils_Tuple2('breve', '˘'),
			_Utils_Tuple2('Breve', '˘'),
			_Utils_Tuple2('brvbar', '¦'),
			_Utils_Tuple2('bscr', '\uD835\uDCB7'),
			_Utils_Tuple2('Bscr', 'ℬ'),
			_Utils_Tuple2('bsemi', '⁏'),
			_Utils_Tuple2('bsim', '∽'),
			_Utils_Tuple2('bsime', '⋍'),
			_Utils_Tuple2('bsolb', '⧅'),
			_Utils_Tuple2('bsol', '\\'),
			_Utils_Tuple2('bsolhsub', '⟈'),
			_Utils_Tuple2('bull', '•'),
			_Utils_Tuple2('bullet', '•'),
			_Utils_Tuple2('bump', '≎'),
			_Utils_Tuple2('bumpE', '⪮'),
			_Utils_Tuple2('bumpe', '≏'),
			_Utils_Tuple2('Bumpeq', '≎'),
			_Utils_Tuple2('bumpeq', '≏'),
			_Utils_Tuple2('Cacute', 'Ć'),
			_Utils_Tuple2('cacute', 'ć'),
			_Utils_Tuple2('capand', '⩄'),
			_Utils_Tuple2('capbrcup', '⩉'),
			_Utils_Tuple2('capcap', '⩋'),
			_Utils_Tuple2('cap', '∩'),
			_Utils_Tuple2('Cap', '⋒'),
			_Utils_Tuple2('capcup', '⩇'),
			_Utils_Tuple2('capdot', '⩀'),
			_Utils_Tuple2('CapitalDifferentialD', 'ⅅ'),
			_Utils_Tuple2('caps', '∩︀'),
			_Utils_Tuple2('caret', '⁁'),
			_Utils_Tuple2('caron', 'ˇ'),
			_Utils_Tuple2('Cayleys', 'ℭ'),
			_Utils_Tuple2('ccaps', '⩍'),
			_Utils_Tuple2('Ccaron', 'Č'),
			_Utils_Tuple2('ccaron', 'č'),
			_Utils_Tuple2('Ccedil', 'Ç'),
			_Utils_Tuple2('ccedil', 'ç'),
			_Utils_Tuple2('Ccirc', 'Ĉ'),
			_Utils_Tuple2('ccirc', 'ĉ'),
			_Utils_Tuple2('Cconint', '∰'),
			_Utils_Tuple2('ccups', '⩌'),
			_Utils_Tuple2('ccupssm', '⩐'),
			_Utils_Tuple2('Cdot', 'Ċ'),
			_Utils_Tuple2('cdot', 'ċ'),
			_Utils_Tuple2('cedil', '¸'),
			_Utils_Tuple2('Cedilla', '¸'),
			_Utils_Tuple2('cemptyv', '⦲'),
			_Utils_Tuple2('cent', '¢'),
			_Utils_Tuple2('centerdot', '·'),
			_Utils_Tuple2('CenterDot', '·'),
			_Utils_Tuple2('cfr', '\uD835\uDD20'),
			_Utils_Tuple2('Cfr', 'ℭ'),
			_Utils_Tuple2('CHcy', 'Ч'),
			_Utils_Tuple2('chcy', 'ч'),
			_Utils_Tuple2('check', '✓'),
			_Utils_Tuple2('checkmark', '✓'),
			_Utils_Tuple2('Chi', 'Χ'),
			_Utils_Tuple2('chi', 'χ'),
			_Utils_Tuple2('circ', 'ˆ'),
			_Utils_Tuple2('circeq', '≗'),
			_Utils_Tuple2('circlearrowleft', '↺'),
			_Utils_Tuple2('circlearrowright', '↻'),
			_Utils_Tuple2('circledast', '⊛'),
			_Utils_Tuple2('circledcirc', '⊚'),
			_Utils_Tuple2('circleddash', '⊝'),
			_Utils_Tuple2('CircleDot', '⊙'),
			_Utils_Tuple2('circledR', '®'),
			_Utils_Tuple2('circledS', 'Ⓢ'),
			_Utils_Tuple2('CircleMinus', '⊖'),
			_Utils_Tuple2('CirclePlus', '⊕'),
			_Utils_Tuple2('CircleTimes', '⊗'),
			_Utils_Tuple2('cir', '○'),
			_Utils_Tuple2('cirE', '⧃'),
			_Utils_Tuple2('cire', '≗'),
			_Utils_Tuple2('cirfnint', '⨐'),
			_Utils_Tuple2('cirmid', '⫯'),
			_Utils_Tuple2('cirscir', '⧂'),
			_Utils_Tuple2('ClockwiseContourIntegral', '∲'),
			_Utils_Tuple2('CloseCurlyDoubleQuote', '”'),
			_Utils_Tuple2('CloseCurlyQuote', '’'),
			_Utils_Tuple2('clubs', '♣'),
			_Utils_Tuple2('clubsuit', '♣'),
			_Utils_Tuple2('colon', ':'),
			_Utils_Tuple2('Colon', '∷'),
			_Utils_Tuple2('Colone', '⩴'),
			_Utils_Tuple2('colone', '≔'),
			_Utils_Tuple2('coloneq', '≔'),
			_Utils_Tuple2('comma', ','),
			_Utils_Tuple2('commat', '@'),
			_Utils_Tuple2('comp', '∁'),
			_Utils_Tuple2('compfn', '∘'),
			_Utils_Tuple2('complement', '∁'),
			_Utils_Tuple2('complexes', 'ℂ'),
			_Utils_Tuple2('cong', '≅'),
			_Utils_Tuple2('congdot', '⩭'),
			_Utils_Tuple2('Congruent', '≡'),
			_Utils_Tuple2('conint', '∮'),
			_Utils_Tuple2('Conint', '∯'),
			_Utils_Tuple2('ContourIntegral', '∮'),
			_Utils_Tuple2('copf', '\uD835\uDD54'),
			_Utils_Tuple2('Copf', 'ℂ'),
			_Utils_Tuple2('coprod', '∐'),
			_Utils_Tuple2('Coproduct', '∐'),
			_Utils_Tuple2('copy', '©'),
			_Utils_Tuple2('COPY', '©'),
			_Utils_Tuple2('copysr', '℗'),
			_Utils_Tuple2('CounterClockwiseContourIntegral', '∳'),
			_Utils_Tuple2('crarr', '↵'),
			_Utils_Tuple2('cross', '✗'),
			_Utils_Tuple2('Cross', '⨯'),
			_Utils_Tuple2('Cscr', '\uD835\uDC9E'),
			_Utils_Tuple2('cscr', '\uD835\uDCB8'),
			_Utils_Tuple2('csub', '⫏'),
			_Utils_Tuple2('csube', '⫑'),
			_Utils_Tuple2('csup', '⫐'),
			_Utils_Tuple2('csupe', '⫒'),
			_Utils_Tuple2('ctdot', '⋯'),
			_Utils_Tuple2('cudarrl', '⤸'),
			_Utils_Tuple2('cudarrr', '⤵'),
			_Utils_Tuple2('cuepr', '⋞'),
			_Utils_Tuple2('cuesc', '⋟'),
			_Utils_Tuple2('cularr', '↶'),
			_Utils_Tuple2('cularrp', '⤽'),
			_Utils_Tuple2('cupbrcap', '⩈'),
			_Utils_Tuple2('cupcap', '⩆'),
			_Utils_Tuple2('CupCap', '≍'),
			_Utils_Tuple2('cup', '∪'),
			_Utils_Tuple2('Cup', '⋓'),
			_Utils_Tuple2('cupcup', '⩊'),
			_Utils_Tuple2('cupdot', '⊍'),
			_Utils_Tuple2('cupor', '⩅'),
			_Utils_Tuple2('cups', '∪︀'),
			_Utils_Tuple2('curarr', '↷'),
			_Utils_Tuple2('curarrm', '⤼'),
			_Utils_Tuple2('curlyeqprec', '⋞'),
			_Utils_Tuple2('curlyeqsucc', '⋟'),
			_Utils_Tuple2('curlyvee', '⋎'),
			_Utils_Tuple2('curlywedge', '⋏'),
			_Utils_Tuple2('curren', '¤'),
			_Utils_Tuple2('curvearrowleft', '↶'),
			_Utils_Tuple2('curvearrowright', '↷'),
			_Utils_Tuple2('cuvee', '⋎'),
			_Utils_Tuple2('cuwed', '⋏'),
			_Utils_Tuple2('cwconint', '∲'),
			_Utils_Tuple2('cwint', '∱'),
			_Utils_Tuple2('cylcty', '⌭'),
			_Utils_Tuple2('dagger', '†'),
			_Utils_Tuple2('Dagger', '‡'),
			_Utils_Tuple2('daleth', 'ℸ'),
			_Utils_Tuple2('darr', '↓'),
			_Utils_Tuple2('Darr', '↡'),
			_Utils_Tuple2('dArr', '⇓'),
			_Utils_Tuple2('dash', '‐'),
			_Utils_Tuple2('Dashv', '⫤'),
			_Utils_Tuple2('dashv', '⊣'),
			_Utils_Tuple2('dbkarow', '⤏'),
			_Utils_Tuple2('dblac', '˝'),
			_Utils_Tuple2('Dcaron', 'Ď'),
			_Utils_Tuple2('dcaron', 'ď'),
			_Utils_Tuple2('Dcy', 'Д'),
			_Utils_Tuple2('dcy', 'д'),
			_Utils_Tuple2('ddagger', '‡'),
			_Utils_Tuple2('ddarr', '⇊'),
			_Utils_Tuple2('DD', 'ⅅ'),
			_Utils_Tuple2('dd', 'ⅆ'),
			_Utils_Tuple2('DDotrahd', '⤑'),
			_Utils_Tuple2('ddotseq', '⩷'),
			_Utils_Tuple2('deg', '°'),
			_Utils_Tuple2('Del', '∇'),
			_Utils_Tuple2('Delta', 'Δ'),
			_Utils_Tuple2('delta', 'δ'),
			_Utils_Tuple2('demptyv', '⦱'),
			_Utils_Tuple2('dfisht', '⥿'),
			_Utils_Tuple2('Dfr', '\uD835\uDD07'),
			_Utils_Tuple2('dfr', '\uD835\uDD21'),
			_Utils_Tuple2('dHar', '⥥'),
			_Utils_Tuple2('dharl', '⇃'),
			_Utils_Tuple2('dharr', '⇂'),
			_Utils_Tuple2('DiacriticalAcute', '´'),
			_Utils_Tuple2('DiacriticalDot', '˙'),
			_Utils_Tuple2('DiacriticalDoubleAcute', '˝'),
			_Utils_Tuple2('DiacriticalGrave', '`'),
			_Utils_Tuple2('DiacriticalTilde', '˜'),
			_Utils_Tuple2('diam', '⋄'),
			_Utils_Tuple2('diamond', '⋄'),
			_Utils_Tuple2('Diamond', '⋄'),
			_Utils_Tuple2('diamondsuit', '♦'),
			_Utils_Tuple2('diams', '♦'),
			_Utils_Tuple2('die', '¨'),
			_Utils_Tuple2('DifferentialD', 'ⅆ'),
			_Utils_Tuple2('digamma', 'ϝ'),
			_Utils_Tuple2('disin', '⋲'),
			_Utils_Tuple2('div', '÷'),
			_Utils_Tuple2('divide', '÷'),
			_Utils_Tuple2('divideontimes', '⋇'),
			_Utils_Tuple2('divonx', '⋇'),
			_Utils_Tuple2('DJcy', 'Ђ'),
			_Utils_Tuple2('djcy', 'ђ'),
			_Utils_Tuple2('dlcorn', '⌞'),
			_Utils_Tuple2('dlcrop', '⌍'),
			_Utils_Tuple2('dollar', '$'),
			_Utils_Tuple2('Dopf', '\uD835\uDD3B'),
			_Utils_Tuple2('dopf', '\uD835\uDD55'),
			_Utils_Tuple2('Dot', '¨'),
			_Utils_Tuple2('dot', '˙'),
			_Utils_Tuple2('DotDot', '⃜'),
			_Utils_Tuple2('doteq', '≐'),
			_Utils_Tuple2('doteqdot', '≑'),
			_Utils_Tuple2('DotEqual', '≐'),
			_Utils_Tuple2('dotminus', '∸'),
			_Utils_Tuple2('dotplus', '∔'),
			_Utils_Tuple2('dotsquare', '⊡'),
			_Utils_Tuple2('doublebarwedge', '⌆'),
			_Utils_Tuple2('DoubleContourIntegral', '∯'),
			_Utils_Tuple2('DoubleDot', '¨'),
			_Utils_Tuple2('DoubleDownArrow', '⇓'),
			_Utils_Tuple2('DoubleLeftArrow', '⇐'),
			_Utils_Tuple2('DoubleLeftRightArrow', '⇔'),
			_Utils_Tuple2('DoubleLeftTee', '⫤'),
			_Utils_Tuple2('DoubleLongLeftArrow', '⟸'),
			_Utils_Tuple2('DoubleLongLeftRightArrow', '⟺'),
			_Utils_Tuple2('DoubleLongRightArrow', '⟹'),
			_Utils_Tuple2('DoubleRightArrow', '⇒'),
			_Utils_Tuple2('DoubleRightTee', '⊨'),
			_Utils_Tuple2('DoubleUpArrow', '⇑'),
			_Utils_Tuple2('DoubleUpDownArrow', '⇕'),
			_Utils_Tuple2('DoubleVerticalBar', '∥'),
			_Utils_Tuple2('DownArrowBar', '⤓'),
			_Utils_Tuple2('downarrow', '↓'),
			_Utils_Tuple2('DownArrow', '↓'),
			_Utils_Tuple2('Downarrow', '⇓'),
			_Utils_Tuple2('DownArrowUpArrow', '⇵'),
			_Utils_Tuple2('DownBreve', '̑'),
			_Utils_Tuple2('downdownarrows', '⇊'),
			_Utils_Tuple2('downharpoonleft', '⇃'),
			_Utils_Tuple2('downharpoonright', '⇂'),
			_Utils_Tuple2('DownLeftRightVector', '⥐'),
			_Utils_Tuple2('DownLeftTeeVector', '⥞'),
			_Utils_Tuple2('DownLeftVectorBar', '⥖'),
			_Utils_Tuple2('DownLeftVector', '↽'),
			_Utils_Tuple2('DownRightTeeVector', '⥟'),
			_Utils_Tuple2('DownRightVectorBar', '⥗'),
			_Utils_Tuple2('DownRightVector', '⇁'),
			_Utils_Tuple2('DownTeeArrow', '↧'),
			_Utils_Tuple2('DownTee', '⊤'),
			_Utils_Tuple2('drbkarow', '⤐'),
			_Utils_Tuple2('drcorn', '⌟'),
			_Utils_Tuple2('drcrop', '⌌'),
			_Utils_Tuple2('Dscr', '\uD835\uDC9F'),
			_Utils_Tuple2('dscr', '\uD835\uDCB9'),
			_Utils_Tuple2('DScy', 'Ѕ'),
			_Utils_Tuple2('dscy', 'ѕ'),
			_Utils_Tuple2('dsol', '⧶'),
			_Utils_Tuple2('Dstrok', 'Đ'),
			_Utils_Tuple2('dstrok', 'đ'),
			_Utils_Tuple2('dtdot', '⋱'),
			_Utils_Tuple2('dtri', '▿'),
			_Utils_Tuple2('dtrif', '▾'),
			_Utils_Tuple2('duarr', '⇵'),
			_Utils_Tuple2('duhar', '⥯'),
			_Utils_Tuple2('dwangle', '⦦'),
			_Utils_Tuple2('DZcy', 'Џ'),
			_Utils_Tuple2('dzcy', 'џ'),
			_Utils_Tuple2('dzigrarr', '⟿'),
			_Utils_Tuple2('Eacute', 'É'),
			_Utils_Tuple2('eacute', 'é'),
			_Utils_Tuple2('easter', '⩮'),
			_Utils_Tuple2('Ecaron', 'Ě'),
			_Utils_Tuple2('ecaron', 'ě'),
			_Utils_Tuple2('Ecirc', 'Ê'),
			_Utils_Tuple2('ecirc', 'ê'),
			_Utils_Tuple2('ecir', '≖'),
			_Utils_Tuple2('ecolon', '≕'),
			_Utils_Tuple2('Ecy', 'Э'),
			_Utils_Tuple2('ecy', 'э'),
			_Utils_Tuple2('eDDot', '⩷'),
			_Utils_Tuple2('Edot', 'Ė'),
			_Utils_Tuple2('edot', 'ė'),
			_Utils_Tuple2('eDot', '≑'),
			_Utils_Tuple2('ee', 'ⅇ'),
			_Utils_Tuple2('efDot', '≒'),
			_Utils_Tuple2('Efr', '\uD835\uDD08'),
			_Utils_Tuple2('efr', '\uD835\uDD22'),
			_Utils_Tuple2('eg', '⪚'),
			_Utils_Tuple2('Egrave', 'È'),
			_Utils_Tuple2('egrave', 'è'),
			_Utils_Tuple2('egs', '⪖'),
			_Utils_Tuple2('egsdot', '⪘'),
			_Utils_Tuple2('el', '⪙'),
			_Utils_Tuple2('Element', '∈'),
			_Utils_Tuple2('elinters', '⏧'),
			_Utils_Tuple2('ell', 'ℓ'),
			_Utils_Tuple2('els', '⪕'),
			_Utils_Tuple2('elsdot', '⪗'),
			_Utils_Tuple2('Emacr', 'Ē'),
			_Utils_Tuple2('emacr', 'ē'),
			_Utils_Tuple2('empty', '∅'),
			_Utils_Tuple2('emptyset', '∅'),
			_Utils_Tuple2('EmptySmallSquare', '◻'),
			_Utils_Tuple2('emptyv', '∅'),
			_Utils_Tuple2('EmptyVerySmallSquare', '▫'),
			_Utils_Tuple2('emsp13', '\u2004'),
			_Utils_Tuple2('emsp14', '\u2005'),
			_Utils_Tuple2('emsp', '\u2003'),
			_Utils_Tuple2('ENG', 'Ŋ'),
			_Utils_Tuple2('eng', 'ŋ'),
			_Utils_Tuple2('ensp', '\u2002'),
			_Utils_Tuple2('Eogon', 'Ę'),
			_Utils_Tuple2('eogon', 'ę'),
			_Utils_Tuple2('Eopf', '\uD835\uDD3C'),
			_Utils_Tuple2('eopf', '\uD835\uDD56'),
			_Utils_Tuple2('epar', '⋕'),
			_Utils_Tuple2('eparsl', '⧣'),
			_Utils_Tuple2('eplus', '⩱'),
			_Utils_Tuple2('epsi', 'ε'),
			_Utils_Tuple2('Epsilon', 'Ε'),
			_Utils_Tuple2('epsilon', 'ε'),
			_Utils_Tuple2('epsiv', 'ϵ'),
			_Utils_Tuple2('eqcirc', '≖'),
			_Utils_Tuple2('eqcolon', '≕'),
			_Utils_Tuple2('eqsim', '≂'),
			_Utils_Tuple2('eqslantgtr', '⪖'),
			_Utils_Tuple2('eqslantless', '⪕'),
			_Utils_Tuple2('Equal', '⩵'),
			_Utils_Tuple2('equals', '='),
			_Utils_Tuple2('EqualTilde', '≂'),
			_Utils_Tuple2('equest', '≟'),
			_Utils_Tuple2('Equilibrium', '⇌'),
			_Utils_Tuple2('equiv', '≡'),
			_Utils_Tuple2('equivDD', '⩸'),
			_Utils_Tuple2('eqvparsl', '⧥'),
			_Utils_Tuple2('erarr', '⥱'),
			_Utils_Tuple2('erDot', '≓'),
			_Utils_Tuple2('escr', 'ℯ'),
			_Utils_Tuple2('Escr', 'ℰ'),
			_Utils_Tuple2('esdot', '≐'),
			_Utils_Tuple2('Esim', '⩳'),
			_Utils_Tuple2('esim', '≂'),
			_Utils_Tuple2('Eta', 'Η'),
			_Utils_Tuple2('eta', 'η'),
			_Utils_Tuple2('ETH', 'Ð'),
			_Utils_Tuple2('eth', 'ð'),
			_Utils_Tuple2('Euml', 'Ë'),
			_Utils_Tuple2('euml', 'ë'),
			_Utils_Tuple2('euro', '€'),
			_Utils_Tuple2('excl', '!'),
			_Utils_Tuple2('exist', '∃'),
			_Utils_Tuple2('Exists', '∃'),
			_Utils_Tuple2('expectation', 'ℰ'),
			_Utils_Tuple2('exponentiale', 'ⅇ'),
			_Utils_Tuple2('ExponentialE', 'ⅇ'),
			_Utils_Tuple2('fallingdotseq', '≒'),
			_Utils_Tuple2('Fcy', 'Ф'),
			_Utils_Tuple2('fcy', 'ф'),
			_Utils_Tuple2('female', '♀'),
			_Utils_Tuple2('ffilig', 'ﬃ'),
			_Utils_Tuple2('fflig', 'ﬀ'),
			_Utils_Tuple2('ffllig', 'ﬄ'),
			_Utils_Tuple2('Ffr', '\uD835\uDD09'),
			_Utils_Tuple2('ffr', '\uD835\uDD23'),
			_Utils_Tuple2('filig', 'ﬁ'),
			_Utils_Tuple2('FilledSmallSquare', '◼'),
			_Utils_Tuple2('FilledVerySmallSquare', '▪'),
			_Utils_Tuple2('fjlig', 'fj'),
			_Utils_Tuple2('flat', '♭'),
			_Utils_Tuple2('fllig', 'ﬂ'),
			_Utils_Tuple2('fltns', '▱'),
			_Utils_Tuple2('fnof', 'ƒ'),
			_Utils_Tuple2('Fopf', '\uD835\uDD3D'),
			_Utils_Tuple2('fopf', '\uD835\uDD57'),
			_Utils_Tuple2('forall', '∀'),
			_Utils_Tuple2('ForAll', '∀'),
			_Utils_Tuple2('fork', '⋔'),
			_Utils_Tuple2('forkv', '⫙'),
			_Utils_Tuple2('Fouriertrf', 'ℱ'),
			_Utils_Tuple2('fpartint', '⨍'),
			_Utils_Tuple2('frac12', '½'),
			_Utils_Tuple2('frac13', '⅓'),
			_Utils_Tuple2('frac14', '¼'),
			_Utils_Tuple2('frac15', '⅕'),
			_Utils_Tuple2('frac16', '⅙'),
			_Utils_Tuple2('frac18', '⅛'),
			_Utils_Tuple2('frac23', '⅔'),
			_Utils_Tuple2('frac25', '⅖'),
			_Utils_Tuple2('frac34', '¾'),
			_Utils_Tuple2('frac35', '⅗'),
			_Utils_Tuple2('frac38', '⅜'),
			_Utils_Tuple2('frac45', '⅘'),
			_Utils_Tuple2('frac56', '⅚'),
			_Utils_Tuple2('frac58', '⅝'),
			_Utils_Tuple2('frac78', '⅞'),
			_Utils_Tuple2('frasl', '⁄'),
			_Utils_Tuple2('frown', '⌢'),
			_Utils_Tuple2('fscr', '\uD835\uDCBB'),
			_Utils_Tuple2('Fscr', 'ℱ'),
			_Utils_Tuple2('gacute', 'ǵ'),
			_Utils_Tuple2('Gamma', 'Γ'),
			_Utils_Tuple2('gamma', 'γ'),
			_Utils_Tuple2('Gammad', 'Ϝ'),
			_Utils_Tuple2('gammad', 'ϝ'),
			_Utils_Tuple2('gap', '⪆'),
			_Utils_Tuple2('Gbreve', 'Ğ'),
			_Utils_Tuple2('gbreve', 'ğ'),
			_Utils_Tuple2('Gcedil', 'Ģ'),
			_Utils_Tuple2('Gcirc', 'Ĝ'),
			_Utils_Tuple2('gcirc', 'ĝ'),
			_Utils_Tuple2('Gcy', 'Г'),
			_Utils_Tuple2('gcy', 'г'),
			_Utils_Tuple2('Gdot', 'Ġ'),
			_Utils_Tuple2('gdot', 'ġ'),
			_Utils_Tuple2('ge', '≥'),
			_Utils_Tuple2('gE', '≧'),
			_Utils_Tuple2('gEl', '⪌'),
			_Utils_Tuple2('gel', '⋛'),
			_Utils_Tuple2('geq', '≥'),
			_Utils_Tuple2('geqq', '≧'),
			_Utils_Tuple2('geqslant', '⩾'),
			_Utils_Tuple2('gescc', '⪩'),
			_Utils_Tuple2('ges', '⩾'),
			_Utils_Tuple2('gesdot', '⪀'),
			_Utils_Tuple2('gesdoto', '⪂'),
			_Utils_Tuple2('gesdotol', '⪄'),
			_Utils_Tuple2('gesl', '⋛︀'),
			_Utils_Tuple2('gesles', '⪔'),
			_Utils_Tuple2('Gfr', '\uD835\uDD0A'),
			_Utils_Tuple2('gfr', '\uD835\uDD24'),
			_Utils_Tuple2('gg', '≫'),
			_Utils_Tuple2('Gg', '⋙'),
			_Utils_Tuple2('ggg', '⋙'),
			_Utils_Tuple2('gimel', 'ℷ'),
			_Utils_Tuple2('GJcy', 'Ѓ'),
			_Utils_Tuple2('gjcy', 'ѓ'),
			_Utils_Tuple2('gla', '⪥'),
			_Utils_Tuple2('gl', '≷'),
			_Utils_Tuple2('glE', '⪒'),
			_Utils_Tuple2('glj', '⪤'),
			_Utils_Tuple2('gnap', '⪊'),
			_Utils_Tuple2('gnapprox', '⪊'),
			_Utils_Tuple2('gne', '⪈'),
			_Utils_Tuple2('gnE', '≩'),
			_Utils_Tuple2('gneq', '⪈'),
			_Utils_Tuple2('gneqq', '≩'),
			_Utils_Tuple2('gnsim', '⋧'),
			_Utils_Tuple2('Gopf', '\uD835\uDD3E'),
			_Utils_Tuple2('gopf', '\uD835\uDD58'),
			_Utils_Tuple2('grave', '`'),
			_Utils_Tuple2('GreaterEqual', '≥'),
			_Utils_Tuple2('GreaterEqualLess', '⋛'),
			_Utils_Tuple2('GreaterFullEqual', '≧'),
			_Utils_Tuple2('GreaterGreater', '⪢'),
			_Utils_Tuple2('GreaterLess', '≷'),
			_Utils_Tuple2('GreaterSlantEqual', '⩾'),
			_Utils_Tuple2('GreaterTilde', '≳'),
			_Utils_Tuple2('Gscr', '\uD835\uDCA2'),
			_Utils_Tuple2('gscr', 'ℊ'),
			_Utils_Tuple2('gsim', '≳'),
			_Utils_Tuple2('gsime', '⪎'),
			_Utils_Tuple2('gsiml', '⪐'),
			_Utils_Tuple2('gtcc', '⪧'),
			_Utils_Tuple2('gtcir', '⩺'),
			_Utils_Tuple2('gt', '>'),
			_Utils_Tuple2('GT', '>'),
			_Utils_Tuple2('Gt', '≫'),
			_Utils_Tuple2('gtdot', '⋗'),
			_Utils_Tuple2('gtlPar', '⦕'),
			_Utils_Tuple2('gtquest', '⩼'),
			_Utils_Tuple2('gtrapprox', '⪆'),
			_Utils_Tuple2('gtrarr', '⥸'),
			_Utils_Tuple2('gtrdot', '⋗'),
			_Utils_Tuple2('gtreqless', '⋛'),
			_Utils_Tuple2('gtreqqless', '⪌'),
			_Utils_Tuple2('gtrless', '≷'),
			_Utils_Tuple2('gtrsim', '≳'),
			_Utils_Tuple2('gvertneqq', '≩︀'),
			_Utils_Tuple2('gvnE', '≩︀'),
			_Utils_Tuple2('Hacek', 'ˇ'),
			_Utils_Tuple2('hairsp', '\u200A'),
			_Utils_Tuple2('half', '½'),
			_Utils_Tuple2('hamilt', 'ℋ'),
			_Utils_Tuple2('HARDcy', 'Ъ'),
			_Utils_Tuple2('hardcy', 'ъ'),
			_Utils_Tuple2('harrcir', '⥈'),
			_Utils_Tuple2('harr', '↔'),
			_Utils_Tuple2('hArr', '⇔'),
			_Utils_Tuple2('harrw', '↭'),
			_Utils_Tuple2('Hat', '^'),
			_Utils_Tuple2('hbar', 'ℏ'),
			_Utils_Tuple2('Hcirc', 'Ĥ'),
			_Utils_Tuple2('hcirc', 'ĥ'),
			_Utils_Tuple2('hearts', '♥'),
			_Utils_Tuple2('heartsuit', '♥'),
			_Utils_Tuple2('hellip', '…'),
			_Utils_Tuple2('hercon', '⊹'),
			_Utils_Tuple2('hfr', '\uD835\uDD25'),
			_Utils_Tuple2('Hfr', 'ℌ'),
			_Utils_Tuple2('HilbertSpace', 'ℋ'),
			_Utils_Tuple2('hksearow', '⤥'),
			_Utils_Tuple2('hkswarow', '⤦'),
			_Utils_Tuple2('hoarr', '⇿'),
			_Utils_Tuple2('homtht', '∻'),
			_Utils_Tuple2('hookleftarrow', '↩'),
			_Utils_Tuple2('hookrightarrow', '↪'),
			_Utils_Tuple2('hopf', '\uD835\uDD59'),
			_Utils_Tuple2('Hopf', 'ℍ'),
			_Utils_Tuple2('horbar', '―'),
			_Utils_Tuple2('HorizontalLine', '─'),
			_Utils_Tuple2('hscr', '\uD835\uDCBD'),
			_Utils_Tuple2('Hscr', 'ℋ'),
			_Utils_Tuple2('hslash', 'ℏ'),
			_Utils_Tuple2('Hstrok', 'Ħ'),
			_Utils_Tuple2('hstrok', 'ħ'),
			_Utils_Tuple2('HumpDownHump', '≎'),
			_Utils_Tuple2('HumpEqual', '≏'),
			_Utils_Tuple2('hybull', '⁃'),
			_Utils_Tuple2('hyphen', '‐'),
			_Utils_Tuple2('Iacute', 'Í'),
			_Utils_Tuple2('iacute', 'í'),
			_Utils_Tuple2('ic', '\u2063'),
			_Utils_Tuple2('Icirc', 'Î'),
			_Utils_Tuple2('icirc', 'î'),
			_Utils_Tuple2('Icy', 'И'),
			_Utils_Tuple2('icy', 'и'),
			_Utils_Tuple2('Idot', 'İ'),
			_Utils_Tuple2('IEcy', 'Е'),
			_Utils_Tuple2('iecy', 'е'),
			_Utils_Tuple2('iexcl', '¡'),
			_Utils_Tuple2('iff', '⇔'),
			_Utils_Tuple2('ifr', '\uD835\uDD26'),
			_Utils_Tuple2('Ifr', 'ℑ'),
			_Utils_Tuple2('Igrave', 'Ì'),
			_Utils_Tuple2('igrave', 'ì'),
			_Utils_Tuple2('ii', 'ⅈ'),
			_Utils_Tuple2('iiiint', '⨌'),
			_Utils_Tuple2('iiint', '∭'),
			_Utils_Tuple2('iinfin', '⧜'),
			_Utils_Tuple2('iiota', '℩'),
			_Utils_Tuple2('IJlig', 'Ĳ'),
			_Utils_Tuple2('ijlig', 'ĳ'),
			_Utils_Tuple2('Imacr', 'Ī'),
			_Utils_Tuple2('imacr', 'ī'),
			_Utils_Tuple2('image', 'ℑ'),
			_Utils_Tuple2('ImaginaryI', 'ⅈ'),
			_Utils_Tuple2('imagline', 'ℐ'),
			_Utils_Tuple2('imagpart', 'ℑ'),
			_Utils_Tuple2('imath', 'ı'),
			_Utils_Tuple2('Im', 'ℑ'),
			_Utils_Tuple2('imof', '⊷'),
			_Utils_Tuple2('imped', 'Ƶ'),
			_Utils_Tuple2('Implies', '⇒'),
			_Utils_Tuple2('incare', '℅'),
			_Utils_Tuple2('in', '∈'),
			_Utils_Tuple2('infin', '∞'),
			_Utils_Tuple2('infintie', '⧝'),
			_Utils_Tuple2('inodot', 'ı'),
			_Utils_Tuple2('intcal', '⊺'),
			_Utils_Tuple2('int', '∫'),
			_Utils_Tuple2('Int', '∬'),
			_Utils_Tuple2('integers', 'ℤ'),
			_Utils_Tuple2('Integral', '∫'),
			_Utils_Tuple2('intercal', '⊺'),
			_Utils_Tuple2('Intersection', '⋂'),
			_Utils_Tuple2('intlarhk', '⨗'),
			_Utils_Tuple2('intprod', '⨼'),
			_Utils_Tuple2('InvisibleComma', '\u2063'),
			_Utils_Tuple2('InvisibleTimes', '\u2062'),
			_Utils_Tuple2('IOcy', 'Ё'),
			_Utils_Tuple2('iocy', 'ё'),
			_Utils_Tuple2('Iogon', 'Į'),
			_Utils_Tuple2('iogon', 'į'),
			_Utils_Tuple2('Iopf', '\uD835\uDD40'),
			_Utils_Tuple2('iopf', '\uD835\uDD5A'),
			_Utils_Tuple2('Iota', 'Ι'),
			_Utils_Tuple2('iota', 'ι'),
			_Utils_Tuple2('iprod', '⨼'),
			_Utils_Tuple2('iquest', '¿'),
			_Utils_Tuple2('iscr', '\uD835\uDCBE'),
			_Utils_Tuple2('Iscr', 'ℐ'),
			_Utils_Tuple2('isin', '∈'),
			_Utils_Tuple2('isindot', '⋵'),
			_Utils_Tuple2('isinE', '⋹'),
			_Utils_Tuple2('isins', '⋴'),
			_Utils_Tuple2('isinsv', '⋳'),
			_Utils_Tuple2('isinv', '∈'),
			_Utils_Tuple2('it', '\u2062'),
			_Utils_Tuple2('Itilde', 'Ĩ'),
			_Utils_Tuple2('itilde', 'ĩ'),
			_Utils_Tuple2('Iukcy', 'І'),
			_Utils_Tuple2('iukcy', 'і'),
			_Utils_Tuple2('Iuml', 'Ï'),
			_Utils_Tuple2('iuml', 'ï'),
			_Utils_Tuple2('Jcirc', 'Ĵ'),
			_Utils_Tuple2('jcirc', 'ĵ'),
			_Utils_Tuple2('Jcy', 'Й'),
			_Utils_Tuple2('jcy', 'й'),
			_Utils_Tuple2('Jfr', '\uD835\uDD0D'),
			_Utils_Tuple2('jfr', '\uD835\uDD27'),
			_Utils_Tuple2('jmath', 'ȷ'),
			_Utils_Tuple2('Jopf', '\uD835\uDD41'),
			_Utils_Tuple2('jopf', '\uD835\uDD5B'),
			_Utils_Tuple2('Jscr', '\uD835\uDCA5'),
			_Utils_Tuple2('jscr', '\uD835\uDCBF'),
			_Utils_Tuple2('Jsercy', 'Ј'),
			_Utils_Tuple2('jsercy', 'ј'),
			_Utils_Tuple2('Jukcy', 'Є'),
			_Utils_Tuple2('jukcy', 'є'),
			_Utils_Tuple2('Kappa', 'Κ'),
			_Utils_Tuple2('kappa', 'κ'),
			_Utils_Tuple2('kappav', 'ϰ'),
			_Utils_Tuple2('Kcedil', 'Ķ'),
			_Utils_Tuple2('kcedil', 'ķ'),
			_Utils_Tuple2('Kcy', 'К'),
			_Utils_Tuple2('kcy', 'к'),
			_Utils_Tuple2('Kfr', '\uD835\uDD0E'),
			_Utils_Tuple2('kfr', '\uD835\uDD28'),
			_Utils_Tuple2('kgreen', 'ĸ'),
			_Utils_Tuple2('KHcy', 'Х'),
			_Utils_Tuple2('khcy', 'х'),
			_Utils_Tuple2('KJcy', 'Ќ'),
			_Utils_Tuple2('kjcy', 'ќ'),
			_Utils_Tuple2('Kopf', '\uD835\uDD42'),
			_Utils_Tuple2('kopf', '\uD835\uDD5C'),
			_Utils_Tuple2('Kscr', '\uD835\uDCA6'),
			_Utils_Tuple2('kscr', '\uD835\uDCC0'),
			_Utils_Tuple2('lAarr', '⇚'),
			_Utils_Tuple2('Lacute', 'Ĺ'),
			_Utils_Tuple2('lacute', 'ĺ'),
			_Utils_Tuple2('laemptyv', '⦴'),
			_Utils_Tuple2('lagran', 'ℒ'),
			_Utils_Tuple2('Lambda', 'Λ'),
			_Utils_Tuple2('lambda', 'λ'),
			_Utils_Tuple2('lang', '⟨'),
			_Utils_Tuple2('Lang', '⟪'),
			_Utils_Tuple2('langd', '⦑'),
			_Utils_Tuple2('langle', '⟨'),
			_Utils_Tuple2('lap', '⪅'),
			_Utils_Tuple2('Laplacetrf', 'ℒ'),
			_Utils_Tuple2('laquo', '«'),
			_Utils_Tuple2('larrb', '⇤'),
			_Utils_Tuple2('larrbfs', '⤟'),
			_Utils_Tuple2('larr', '←'),
			_Utils_Tuple2('Larr', '↞'),
			_Utils_Tuple2('lArr', '⇐'),
			_Utils_Tuple2('larrfs', '⤝'),
			_Utils_Tuple2('larrhk', '↩'),
			_Utils_Tuple2('larrlp', '↫'),
			_Utils_Tuple2('larrpl', '⤹'),
			_Utils_Tuple2('larrsim', '⥳'),
			_Utils_Tuple2('larrtl', '↢'),
			_Utils_Tuple2('latail', '⤙'),
			_Utils_Tuple2('lAtail', '⤛'),
			_Utils_Tuple2('lat', '⪫'),
			_Utils_Tuple2('late', '⪭'),
			_Utils_Tuple2('lates', '⪭︀'),
			_Utils_Tuple2('lbarr', '⤌'),
			_Utils_Tuple2('lBarr', '⤎'),
			_Utils_Tuple2('lbbrk', '❲'),
			_Utils_Tuple2('lbrace', '{'),
			_Utils_Tuple2('lbrack', '['),
			_Utils_Tuple2('lbrke', '⦋'),
			_Utils_Tuple2('lbrksld', '⦏'),
			_Utils_Tuple2('lbrkslu', '⦍'),
			_Utils_Tuple2('Lcaron', 'Ľ'),
			_Utils_Tuple2('lcaron', 'ľ'),
			_Utils_Tuple2('Lcedil', 'Ļ'),
			_Utils_Tuple2('lcedil', 'ļ'),
			_Utils_Tuple2('lceil', '⌈'),
			_Utils_Tuple2('lcub', '{'),
			_Utils_Tuple2('Lcy', 'Л'),
			_Utils_Tuple2('lcy', 'л'),
			_Utils_Tuple2('ldca', '⤶'),
			_Utils_Tuple2('ldquo', '“'),
			_Utils_Tuple2('ldquor', '„'),
			_Utils_Tuple2('ldrdhar', '⥧'),
			_Utils_Tuple2('ldrushar', '⥋'),
			_Utils_Tuple2('ldsh', '↲'),
			_Utils_Tuple2('le', '≤'),
			_Utils_Tuple2('lE', '≦'),
			_Utils_Tuple2('LeftAngleBracket', '⟨'),
			_Utils_Tuple2('LeftArrowBar', '⇤'),
			_Utils_Tuple2('leftarrow', '←'),
			_Utils_Tuple2('LeftArrow', '←'),
			_Utils_Tuple2('Leftarrow', '⇐'),
			_Utils_Tuple2('LeftArrowRightArrow', '⇆'),
			_Utils_Tuple2('leftarrowtail', '↢'),
			_Utils_Tuple2('LeftCeiling', '⌈'),
			_Utils_Tuple2('LeftDoubleBracket', '⟦'),
			_Utils_Tuple2('LeftDownTeeVector', '⥡'),
			_Utils_Tuple2('LeftDownVectorBar', '⥙'),
			_Utils_Tuple2('LeftDownVector', '⇃'),
			_Utils_Tuple2('LeftFloor', '⌊'),
			_Utils_Tuple2('leftharpoondown', '↽'),
			_Utils_Tuple2('leftharpoonup', '↼'),
			_Utils_Tuple2('leftleftarrows', '⇇'),
			_Utils_Tuple2('leftrightarrow', '↔'),
			_Utils_Tuple2('LeftRightArrow', '↔'),
			_Utils_Tuple2('Leftrightarrow', '⇔'),
			_Utils_Tuple2('leftrightarrows', '⇆'),
			_Utils_Tuple2('leftrightharpoons', '⇋'),
			_Utils_Tuple2('leftrightsquigarrow', '↭'),
			_Utils_Tuple2('LeftRightVector', '⥎'),
			_Utils_Tuple2('LeftTeeArrow', '↤'),
			_Utils_Tuple2('LeftTee', '⊣'),
			_Utils_Tuple2('LeftTeeVector', '⥚'),
			_Utils_Tuple2('leftthreetimes', '⋋'),
			_Utils_Tuple2('LeftTriangleBar', '⧏'),
			_Utils_Tuple2('LeftTriangle', '⊲'),
			_Utils_Tuple2('LeftTriangleEqual', '⊴'),
			_Utils_Tuple2('LeftUpDownVector', '⥑'),
			_Utils_Tuple2('LeftUpTeeVector', '⥠'),
			_Utils_Tuple2('LeftUpVectorBar', '⥘'),
			_Utils_Tuple2('LeftUpVector', '↿'),
			_Utils_Tuple2('LeftVectorBar', '⥒'),
			_Utils_Tuple2('LeftVector', '↼'),
			_Utils_Tuple2('lEg', '⪋'),
			_Utils_Tuple2('leg', '⋚'),
			_Utils_Tuple2('leq', '≤'),
			_Utils_Tuple2('leqq', '≦'),
			_Utils_Tuple2('leqslant', '⩽'),
			_Utils_Tuple2('lescc', '⪨'),
			_Utils_Tuple2('les', '⩽'),
			_Utils_Tuple2('lesdot', '⩿'),
			_Utils_Tuple2('lesdoto', '⪁'),
			_Utils_Tuple2('lesdotor', '⪃'),
			_Utils_Tuple2('lesg', '⋚︀'),
			_Utils_Tuple2('lesges', '⪓'),
			_Utils_Tuple2('lessapprox', '⪅'),
			_Utils_Tuple2('lessdot', '⋖'),
			_Utils_Tuple2('lesseqgtr', '⋚'),
			_Utils_Tuple2('lesseqqgtr', '⪋'),
			_Utils_Tuple2('LessEqualGreater', '⋚'),
			_Utils_Tuple2('LessFullEqual', '≦'),
			_Utils_Tuple2('LessGreater', '≶'),
			_Utils_Tuple2('lessgtr', '≶'),
			_Utils_Tuple2('LessLess', '⪡'),
			_Utils_Tuple2('lesssim', '≲'),
			_Utils_Tuple2('LessSlantEqual', '⩽'),
			_Utils_Tuple2('LessTilde', '≲'),
			_Utils_Tuple2('lfisht', '⥼'),
			_Utils_Tuple2('lfloor', '⌊'),
			_Utils_Tuple2('Lfr', '\uD835\uDD0F'),
			_Utils_Tuple2('lfr', '\uD835\uDD29'),
			_Utils_Tuple2('lg', '≶'),
			_Utils_Tuple2('lgE', '⪑'),
			_Utils_Tuple2('lHar', '⥢'),
			_Utils_Tuple2('lhard', '↽'),
			_Utils_Tuple2('lharu', '↼'),
			_Utils_Tuple2('lharul', '⥪'),
			_Utils_Tuple2('lhblk', '▄'),
			_Utils_Tuple2('LJcy', 'Љ'),
			_Utils_Tuple2('ljcy', 'љ'),
			_Utils_Tuple2('llarr', '⇇'),
			_Utils_Tuple2('ll', '≪'),
			_Utils_Tuple2('Ll', '⋘'),
			_Utils_Tuple2('llcorner', '⌞'),
			_Utils_Tuple2('Lleftarrow', '⇚'),
			_Utils_Tuple2('llhard', '⥫'),
			_Utils_Tuple2('lltri', '◺'),
			_Utils_Tuple2('Lmidot', 'Ŀ'),
			_Utils_Tuple2('lmidot', 'ŀ'),
			_Utils_Tuple2('lmoustache', '⎰'),
			_Utils_Tuple2('lmoust', '⎰'),
			_Utils_Tuple2('lnap', '⪉'),
			_Utils_Tuple2('lnapprox', '⪉'),
			_Utils_Tuple2('lne', '⪇'),
			_Utils_Tuple2('lnE', '≨'),
			_Utils_Tuple2('lneq', '⪇'),
			_Utils_Tuple2('lneqq', '≨'),
			_Utils_Tuple2('lnsim', '⋦'),
			_Utils_Tuple2('loang', '⟬'),
			_Utils_Tuple2('loarr', '⇽'),
			_Utils_Tuple2('lobrk', '⟦'),
			_Utils_Tuple2('longleftarrow', '⟵'),
			_Utils_Tuple2('LongLeftArrow', '⟵'),
			_Utils_Tuple2('Longleftarrow', '⟸'),
			_Utils_Tuple2('longleftrightarrow', '⟷'),
			_Utils_Tuple2('LongLeftRightArrow', '⟷'),
			_Utils_Tuple2('Longleftrightarrow', '⟺'),
			_Utils_Tuple2('longmapsto', '⟼'),
			_Utils_Tuple2('longrightarrow', '⟶'),
			_Utils_Tuple2('LongRightArrow', '⟶'),
			_Utils_Tuple2('Longrightarrow', '⟹'),
			_Utils_Tuple2('looparrowleft', '↫'),
			_Utils_Tuple2('looparrowright', '↬'),
			_Utils_Tuple2('lopar', '⦅'),
			_Utils_Tuple2('Lopf', '\uD835\uDD43'),
			_Utils_Tuple2('lopf', '\uD835\uDD5D'),
			_Utils_Tuple2('loplus', '⨭'),
			_Utils_Tuple2('lotimes', '⨴'),
			_Utils_Tuple2('lowast', '∗'),
			_Utils_Tuple2('lowbar', '_'),
			_Utils_Tuple2('LowerLeftArrow', '↙'),
			_Utils_Tuple2('LowerRightArrow', '↘'),
			_Utils_Tuple2('loz', '◊'),
			_Utils_Tuple2('lozenge', '◊'),
			_Utils_Tuple2('lozf', '⧫'),
			_Utils_Tuple2('lpar', '('),
			_Utils_Tuple2('lparlt', '⦓'),
			_Utils_Tuple2('lrarr', '⇆'),
			_Utils_Tuple2('lrcorner', '⌟'),
			_Utils_Tuple2('lrhar', '⇋'),
			_Utils_Tuple2('lrhard', '⥭'),
			_Utils_Tuple2('lrm', '\u200E'),
			_Utils_Tuple2('lrtri', '⊿'),
			_Utils_Tuple2('lsaquo', '‹'),
			_Utils_Tuple2('lscr', '\uD835\uDCC1'),
			_Utils_Tuple2('Lscr', 'ℒ'),
			_Utils_Tuple2('lsh', '↰'),
			_Utils_Tuple2('Lsh', '↰'),
			_Utils_Tuple2('lsim', '≲'),
			_Utils_Tuple2('lsime', '⪍'),
			_Utils_Tuple2('lsimg', '⪏'),
			_Utils_Tuple2('lsqb', '['),
			_Utils_Tuple2('lsquo', '‘'),
			_Utils_Tuple2('lsquor', '‚'),
			_Utils_Tuple2('Lstrok', 'Ł'),
			_Utils_Tuple2('lstrok', 'ł'),
			_Utils_Tuple2('ltcc', '⪦'),
			_Utils_Tuple2('ltcir', '⩹'),
			_Utils_Tuple2('lt', '<'),
			_Utils_Tuple2('LT', '<'),
			_Utils_Tuple2('Lt', '≪'),
			_Utils_Tuple2('ltdot', '⋖'),
			_Utils_Tuple2('lthree', '⋋'),
			_Utils_Tuple2('ltimes', '⋉'),
			_Utils_Tuple2('ltlarr', '⥶'),
			_Utils_Tuple2('ltquest', '⩻'),
			_Utils_Tuple2('ltri', '◃'),
			_Utils_Tuple2('ltrie', '⊴'),
			_Utils_Tuple2('ltrif', '◂'),
			_Utils_Tuple2('ltrPar', '⦖'),
			_Utils_Tuple2('lurdshar', '⥊'),
			_Utils_Tuple2('luruhar', '⥦'),
			_Utils_Tuple2('lvertneqq', '≨︀'),
			_Utils_Tuple2('lvnE', '≨︀'),
			_Utils_Tuple2('macr', '¯'),
			_Utils_Tuple2('male', '♂'),
			_Utils_Tuple2('malt', '✠'),
			_Utils_Tuple2('maltese', '✠'),
			_Utils_Tuple2('Map', '⤅'),
			_Utils_Tuple2('map', '↦'),
			_Utils_Tuple2('mapsto', '↦'),
			_Utils_Tuple2('mapstodown', '↧'),
			_Utils_Tuple2('mapstoleft', '↤'),
			_Utils_Tuple2('mapstoup', '↥'),
			_Utils_Tuple2('marker', '▮'),
			_Utils_Tuple2('mcomma', '⨩'),
			_Utils_Tuple2('Mcy', 'М'),
			_Utils_Tuple2('mcy', 'м'),
			_Utils_Tuple2('mdash', '—'),
			_Utils_Tuple2('mDDot', '∺'),
			_Utils_Tuple2('measuredangle', '∡'),
			_Utils_Tuple2('MediumSpace', '\u205F'),
			_Utils_Tuple2('Mellintrf', 'ℳ'),
			_Utils_Tuple2('Mfr', '\uD835\uDD10'),
			_Utils_Tuple2('mfr', '\uD835\uDD2A'),
			_Utils_Tuple2('mho', '℧'),
			_Utils_Tuple2('micro', 'µ'),
			_Utils_Tuple2('midast', '*'),
			_Utils_Tuple2('midcir', '⫰'),
			_Utils_Tuple2('mid', '∣'),
			_Utils_Tuple2('middot', '·'),
			_Utils_Tuple2('minusb', '⊟'),
			_Utils_Tuple2('minus', '−'),
			_Utils_Tuple2('minusd', '∸'),
			_Utils_Tuple2('minusdu', '⨪'),
			_Utils_Tuple2('MinusPlus', '∓'),
			_Utils_Tuple2('mlcp', '⫛'),
			_Utils_Tuple2('mldr', '…'),
			_Utils_Tuple2('mnplus', '∓'),
			_Utils_Tuple2('models', '⊧'),
			_Utils_Tuple2('Mopf', '\uD835\uDD44'),
			_Utils_Tuple2('mopf', '\uD835\uDD5E'),
			_Utils_Tuple2('mp', '∓'),
			_Utils_Tuple2('mscr', '\uD835\uDCC2'),
			_Utils_Tuple2('Mscr', 'ℳ'),
			_Utils_Tuple2('mstpos', '∾'),
			_Utils_Tuple2('Mu', 'Μ'),
			_Utils_Tuple2('mu', 'μ'),
			_Utils_Tuple2('multimap', '⊸'),
			_Utils_Tuple2('mumap', '⊸'),
			_Utils_Tuple2('nabla', '∇'),
			_Utils_Tuple2('Nacute', 'Ń'),
			_Utils_Tuple2('nacute', 'ń'),
			_Utils_Tuple2('nang', '∠⃒'),
			_Utils_Tuple2('nap', '≉'),
			_Utils_Tuple2('napE', '⩰̸'),
			_Utils_Tuple2('napid', '≋̸'),
			_Utils_Tuple2('napos', 'ŉ'),
			_Utils_Tuple2('napprox', '≉'),
			_Utils_Tuple2('natural', '♮'),
			_Utils_Tuple2('naturals', 'ℕ'),
			_Utils_Tuple2('natur', '♮'),
			_Utils_Tuple2('nbsp', '\u00A0'),
			_Utils_Tuple2('nbump', '≎̸'),
			_Utils_Tuple2('nbumpe', '≏̸'),
			_Utils_Tuple2('ncap', '⩃'),
			_Utils_Tuple2('Ncaron', 'Ň'),
			_Utils_Tuple2('ncaron', 'ň'),
			_Utils_Tuple2('Ncedil', 'Ņ'),
			_Utils_Tuple2('ncedil', 'ņ'),
			_Utils_Tuple2('ncong', '≇'),
			_Utils_Tuple2('ncongdot', '⩭̸'),
			_Utils_Tuple2('ncup', '⩂'),
			_Utils_Tuple2('Ncy', 'Н'),
			_Utils_Tuple2('ncy', 'н'),
			_Utils_Tuple2('ndash', '–'),
			_Utils_Tuple2('nearhk', '⤤'),
			_Utils_Tuple2('nearr', '↗'),
			_Utils_Tuple2('neArr', '⇗'),
			_Utils_Tuple2('nearrow', '↗'),
			_Utils_Tuple2('ne', '≠'),
			_Utils_Tuple2('nedot', '≐̸'),
			_Utils_Tuple2('NegativeMediumSpace', '\u200B'),
			_Utils_Tuple2('NegativeThickSpace', '\u200B'),
			_Utils_Tuple2('NegativeThinSpace', '\u200B'),
			_Utils_Tuple2('NegativeVeryThinSpace', '\u200B'),
			_Utils_Tuple2('nequiv', '≢'),
			_Utils_Tuple2('nesear', '⤨'),
			_Utils_Tuple2('nesim', '≂̸'),
			_Utils_Tuple2('NestedGreaterGreater', '≫'),
			_Utils_Tuple2('NestedLessLess', '≪'),
			_Utils_Tuple2('NewLine', '\n'),
			_Utils_Tuple2('nexist', '∄'),
			_Utils_Tuple2('nexists', '∄'),
			_Utils_Tuple2('Nfr', '\uD835\uDD11'),
			_Utils_Tuple2('nfr', '\uD835\uDD2B'),
			_Utils_Tuple2('ngE', '≧̸'),
			_Utils_Tuple2('nge', '≱'),
			_Utils_Tuple2('ngeq', '≱'),
			_Utils_Tuple2('ngeqq', '≧̸'),
			_Utils_Tuple2('ngeqslant', '⩾̸'),
			_Utils_Tuple2('nges', '⩾̸'),
			_Utils_Tuple2('nGg', '⋙̸'),
			_Utils_Tuple2('ngsim', '≵'),
			_Utils_Tuple2('nGt', '≫⃒'),
			_Utils_Tuple2('ngt', '≯'),
			_Utils_Tuple2('ngtr', '≯'),
			_Utils_Tuple2('nGtv', '≫̸'),
			_Utils_Tuple2('nharr', '↮'),
			_Utils_Tuple2('nhArr', '⇎'),
			_Utils_Tuple2('nhpar', '⫲'),
			_Utils_Tuple2('ni', '∋'),
			_Utils_Tuple2('nis', '⋼'),
			_Utils_Tuple2('nisd', '⋺'),
			_Utils_Tuple2('niv', '∋'),
			_Utils_Tuple2('NJcy', 'Њ'),
			_Utils_Tuple2('njcy', 'њ'),
			_Utils_Tuple2('nlarr', '↚'),
			_Utils_Tuple2('nlArr', '⇍'),
			_Utils_Tuple2('nldr', '‥'),
			_Utils_Tuple2('nlE', '≦̸'),
			_Utils_Tuple2('nle', '≰'),
			_Utils_Tuple2('nleftarrow', '↚'),
			_Utils_Tuple2('nLeftarrow', '⇍'),
			_Utils_Tuple2('nleftrightarrow', '↮'),
			_Utils_Tuple2('nLeftrightarrow', '⇎'),
			_Utils_Tuple2('nleq', '≰'),
			_Utils_Tuple2('nleqq', '≦̸'),
			_Utils_Tuple2('nleqslant', '⩽̸'),
			_Utils_Tuple2('nles', '⩽̸'),
			_Utils_Tuple2('nless', '≮'),
			_Utils_Tuple2('nLl', '⋘̸'),
			_Utils_Tuple2('nlsim', '≴'),
			_Utils_Tuple2('nLt', '≪⃒'),
			_Utils_Tuple2('nlt', '≮'),
			_Utils_Tuple2('nltri', '⋪'),
			_Utils_Tuple2('nltrie', '⋬'),
			_Utils_Tuple2('nLtv', '≪̸'),
			_Utils_Tuple2('nmid', '∤'),
			_Utils_Tuple2('NoBreak', '\u2060'),
			_Utils_Tuple2('NonBreakingSpace', '\u00A0'),
			_Utils_Tuple2('nopf', '\uD835\uDD5F'),
			_Utils_Tuple2('Nopf', 'ℕ'),
			_Utils_Tuple2('Not', '⫬'),
			_Utils_Tuple2('not', '¬'),
			_Utils_Tuple2('NotCongruent', '≢'),
			_Utils_Tuple2('NotCupCap', '≭'),
			_Utils_Tuple2('NotDoubleVerticalBar', '∦'),
			_Utils_Tuple2('NotElement', '∉'),
			_Utils_Tuple2('NotEqual', '≠'),
			_Utils_Tuple2('NotEqualTilde', '≂̸'),
			_Utils_Tuple2('NotExists', '∄'),
			_Utils_Tuple2('NotGreater', '≯'),
			_Utils_Tuple2('NotGreaterEqual', '≱'),
			_Utils_Tuple2('NotGreaterFullEqual', '≧̸'),
			_Utils_Tuple2('NotGreaterGreater', '≫̸'),
			_Utils_Tuple2('NotGreaterLess', '≹'),
			_Utils_Tuple2('NotGreaterSlantEqual', '⩾̸'),
			_Utils_Tuple2('NotGreaterTilde', '≵'),
			_Utils_Tuple2('NotHumpDownHump', '≎̸'),
			_Utils_Tuple2('NotHumpEqual', '≏̸'),
			_Utils_Tuple2('notin', '∉'),
			_Utils_Tuple2('notindot', '⋵̸'),
			_Utils_Tuple2('notinE', '⋹̸'),
			_Utils_Tuple2('notinva', '∉'),
			_Utils_Tuple2('notinvb', '⋷'),
			_Utils_Tuple2('notinvc', '⋶'),
			_Utils_Tuple2('NotLeftTriangleBar', '⧏̸'),
			_Utils_Tuple2('NotLeftTriangle', '⋪'),
			_Utils_Tuple2('NotLeftTriangleEqual', '⋬'),
			_Utils_Tuple2('NotLess', '≮'),
			_Utils_Tuple2('NotLessEqual', '≰'),
			_Utils_Tuple2('NotLessGreater', '≸'),
			_Utils_Tuple2('NotLessLess', '≪̸'),
			_Utils_Tuple2('NotLessSlantEqual', '⩽̸'),
			_Utils_Tuple2('NotLessTilde', '≴'),
			_Utils_Tuple2('NotNestedGreaterGreater', '⪢̸'),
			_Utils_Tuple2('NotNestedLessLess', '⪡̸'),
			_Utils_Tuple2('notni', '∌'),
			_Utils_Tuple2('notniva', '∌'),
			_Utils_Tuple2('notnivb', '⋾'),
			_Utils_Tuple2('notnivc', '⋽'),
			_Utils_Tuple2('NotPrecedes', '⊀'),
			_Utils_Tuple2('NotPrecedesEqual', '⪯̸'),
			_Utils_Tuple2('NotPrecedesSlantEqual', '⋠'),
			_Utils_Tuple2('NotReverseElement', '∌'),
			_Utils_Tuple2('NotRightTriangleBar', '⧐̸'),
			_Utils_Tuple2('NotRightTriangle', '⋫'),
			_Utils_Tuple2('NotRightTriangleEqual', '⋭'),
			_Utils_Tuple2('NotSquareSubset', '⊏̸'),
			_Utils_Tuple2('NotSquareSubsetEqual', '⋢'),
			_Utils_Tuple2('NotSquareSuperset', '⊐̸'),
			_Utils_Tuple2('NotSquareSupersetEqual', '⋣'),
			_Utils_Tuple2('NotSubset', '⊂⃒'),
			_Utils_Tuple2('NotSubsetEqual', '⊈'),
			_Utils_Tuple2('NotSucceeds', '⊁'),
			_Utils_Tuple2('NotSucceedsEqual', '⪰̸'),
			_Utils_Tuple2('NotSucceedsSlantEqual', '⋡'),
			_Utils_Tuple2('NotSucceedsTilde', '≿̸'),
			_Utils_Tuple2('NotSuperset', '⊃⃒'),
			_Utils_Tuple2('NotSupersetEqual', '⊉'),
			_Utils_Tuple2('NotTilde', '≁'),
			_Utils_Tuple2('NotTildeEqual', '≄'),
			_Utils_Tuple2('NotTildeFullEqual', '≇'),
			_Utils_Tuple2('NotTildeTilde', '≉'),
			_Utils_Tuple2('NotVerticalBar', '∤'),
			_Utils_Tuple2('nparallel', '∦'),
			_Utils_Tuple2('npar', '∦'),
			_Utils_Tuple2('nparsl', '⫽⃥'),
			_Utils_Tuple2('npart', '∂̸'),
			_Utils_Tuple2('npolint', '⨔'),
			_Utils_Tuple2('npr', '⊀'),
			_Utils_Tuple2('nprcue', '⋠'),
			_Utils_Tuple2('nprec', '⊀'),
			_Utils_Tuple2('npreceq', '⪯̸'),
			_Utils_Tuple2('npre', '⪯̸'),
			_Utils_Tuple2('nrarrc', '⤳̸'),
			_Utils_Tuple2('nrarr', '↛'),
			_Utils_Tuple2('nrArr', '⇏'),
			_Utils_Tuple2('nrarrw', '↝̸'),
			_Utils_Tuple2('nrightarrow', '↛'),
			_Utils_Tuple2('nRightarrow', '⇏'),
			_Utils_Tuple2('nrtri', '⋫'),
			_Utils_Tuple2('nrtrie', '⋭'),
			_Utils_Tuple2('nsc', '⊁'),
			_Utils_Tuple2('nsccue', '⋡'),
			_Utils_Tuple2('nsce', '⪰̸'),
			_Utils_Tuple2('Nscr', '\uD835\uDCA9'),
			_Utils_Tuple2('nscr', '\uD835\uDCC3'),
			_Utils_Tuple2('nshortmid', '∤'),
			_Utils_Tuple2('nshortparallel', '∦'),
			_Utils_Tuple2('nsim', '≁'),
			_Utils_Tuple2('nsime', '≄'),
			_Utils_Tuple2('nsimeq', '≄'),
			_Utils_Tuple2('nsmid', '∤'),
			_Utils_Tuple2('nspar', '∦'),
			_Utils_Tuple2('nsqsube', '⋢'),
			_Utils_Tuple2('nsqsupe', '⋣'),
			_Utils_Tuple2('nsub', '⊄'),
			_Utils_Tuple2('nsubE', '⫅̸'),
			_Utils_Tuple2('nsube', '⊈'),
			_Utils_Tuple2('nsubset', '⊂⃒'),
			_Utils_Tuple2('nsubseteq', '⊈'),
			_Utils_Tuple2('nsubseteqq', '⫅̸'),
			_Utils_Tuple2('nsucc', '⊁'),
			_Utils_Tuple2('nsucceq', '⪰̸'),
			_Utils_Tuple2('nsup', '⊅'),
			_Utils_Tuple2('nsupE', '⫆̸'),
			_Utils_Tuple2('nsupe', '⊉'),
			_Utils_Tuple2('nsupset', '⊃⃒'),
			_Utils_Tuple2('nsupseteq', '⊉'),
			_Utils_Tuple2('nsupseteqq', '⫆̸'),
			_Utils_Tuple2('ntgl', '≹'),
			_Utils_Tuple2('Ntilde', 'Ñ'),
			_Utils_Tuple2('ntilde', 'ñ'),
			_Utils_Tuple2('ntlg', '≸'),
			_Utils_Tuple2('ntriangleleft', '⋪'),
			_Utils_Tuple2('ntrianglelefteq', '⋬'),
			_Utils_Tuple2('ntriangleright', '⋫'),
			_Utils_Tuple2('ntrianglerighteq', '⋭'),
			_Utils_Tuple2('Nu', 'Ν'),
			_Utils_Tuple2('nu', 'ν'),
			_Utils_Tuple2('num', '#'),
			_Utils_Tuple2('numero', '№'),
			_Utils_Tuple2('numsp', '\u2007'),
			_Utils_Tuple2('nvap', '≍⃒'),
			_Utils_Tuple2('nvdash', '⊬'),
			_Utils_Tuple2('nvDash', '⊭'),
			_Utils_Tuple2('nVdash', '⊮'),
			_Utils_Tuple2('nVDash', '⊯'),
			_Utils_Tuple2('nvge', '≥⃒'),
			_Utils_Tuple2('nvgt', '>⃒'),
			_Utils_Tuple2('nvHarr', '⤄'),
			_Utils_Tuple2('nvinfin', '⧞'),
			_Utils_Tuple2('nvlArr', '⤂'),
			_Utils_Tuple2('nvle', '≤⃒'),
			_Utils_Tuple2('nvlt', '<⃒'),
			_Utils_Tuple2('nvltrie', '⊴⃒'),
			_Utils_Tuple2('nvrArr', '⤃'),
			_Utils_Tuple2('nvrtrie', '⊵⃒'),
			_Utils_Tuple2('nvsim', '∼⃒'),
			_Utils_Tuple2('nwarhk', '⤣'),
			_Utils_Tuple2('nwarr', '↖'),
			_Utils_Tuple2('nwArr', '⇖'),
			_Utils_Tuple2('nwarrow', '↖'),
			_Utils_Tuple2('nwnear', '⤧'),
			_Utils_Tuple2('Oacute', 'Ó'),
			_Utils_Tuple2('oacute', 'ó'),
			_Utils_Tuple2('oast', '⊛'),
			_Utils_Tuple2('Ocirc', 'Ô'),
			_Utils_Tuple2('ocirc', 'ô'),
			_Utils_Tuple2('ocir', '⊚'),
			_Utils_Tuple2('Ocy', 'О'),
			_Utils_Tuple2('ocy', 'о'),
			_Utils_Tuple2('odash', '⊝'),
			_Utils_Tuple2('Odblac', 'Ő'),
			_Utils_Tuple2('odblac', 'ő'),
			_Utils_Tuple2('odiv', '⨸'),
			_Utils_Tuple2('odot', '⊙'),
			_Utils_Tuple2('odsold', '⦼'),
			_Utils_Tuple2('OElig', 'Œ'),
			_Utils_Tuple2('oelig', 'œ'),
			_Utils_Tuple2('ofcir', '⦿'),
			_Utils_Tuple2('Ofr', '\uD835\uDD12'),
			_Utils_Tuple2('ofr', '\uD835\uDD2C'),
			_Utils_Tuple2('ogon', '˛'),
			_Utils_Tuple2('Ograve', 'Ò'),
			_Utils_Tuple2('ograve', 'ò'),
			_Utils_Tuple2('ogt', '⧁'),
			_Utils_Tuple2('ohbar', '⦵'),
			_Utils_Tuple2('ohm', 'Ω'),
			_Utils_Tuple2('oint', '∮'),
			_Utils_Tuple2('olarr', '↺'),
			_Utils_Tuple2('olcir', '⦾'),
			_Utils_Tuple2('olcross', '⦻'),
			_Utils_Tuple2('oline', '‾'),
			_Utils_Tuple2('olt', '⧀'),
			_Utils_Tuple2('Omacr', 'Ō'),
			_Utils_Tuple2('omacr', 'ō'),
			_Utils_Tuple2('Omega', 'Ω'),
			_Utils_Tuple2('omega', 'ω'),
			_Utils_Tuple2('Omicron', 'Ο'),
			_Utils_Tuple2('omicron', 'ο'),
			_Utils_Tuple2('omid', '⦶'),
			_Utils_Tuple2('ominus', '⊖'),
			_Utils_Tuple2('Oopf', '\uD835\uDD46'),
			_Utils_Tuple2('oopf', '\uD835\uDD60'),
			_Utils_Tuple2('opar', '⦷'),
			_Utils_Tuple2('OpenCurlyDoubleQuote', '“'),
			_Utils_Tuple2('OpenCurlyQuote', '‘'),
			_Utils_Tuple2('operp', '⦹'),
			_Utils_Tuple2('oplus', '⊕'),
			_Utils_Tuple2('orarr', '↻'),
			_Utils_Tuple2('Or', '⩔'),
			_Utils_Tuple2('or', '∨'),
			_Utils_Tuple2('ord', '⩝'),
			_Utils_Tuple2('order', 'ℴ'),
			_Utils_Tuple2('orderof', 'ℴ'),
			_Utils_Tuple2('ordf', 'ª'),
			_Utils_Tuple2('ordm', 'º'),
			_Utils_Tuple2('origof', '⊶'),
			_Utils_Tuple2('oror', '⩖'),
			_Utils_Tuple2('orslope', '⩗'),
			_Utils_Tuple2('orv', '⩛'),
			_Utils_Tuple2('oS', 'Ⓢ'),
			_Utils_Tuple2('Oscr', '\uD835\uDCAA'),
			_Utils_Tuple2('oscr', 'ℴ'),
			_Utils_Tuple2('Oslash', 'Ø'),
			_Utils_Tuple2('oslash', 'ø'),
			_Utils_Tuple2('osol', '⊘'),
			_Utils_Tuple2('Otilde', 'Õ'),
			_Utils_Tuple2('otilde', 'õ'),
			_Utils_Tuple2('otimesas', '⨶'),
			_Utils_Tuple2('Otimes', '⨷'),
			_Utils_Tuple2('otimes', '⊗'),
			_Utils_Tuple2('Ouml', 'Ö'),
			_Utils_Tuple2('ouml', 'ö'),
			_Utils_Tuple2('ovbar', '⌽'),
			_Utils_Tuple2('OverBar', '‾'),
			_Utils_Tuple2('OverBrace', '⏞'),
			_Utils_Tuple2('OverBracket', '⎴'),
			_Utils_Tuple2('OverParenthesis', '⏜'),
			_Utils_Tuple2('para', '¶'),
			_Utils_Tuple2('parallel', '∥'),
			_Utils_Tuple2('par', '∥'),
			_Utils_Tuple2('parsim', '⫳'),
			_Utils_Tuple2('parsl', '⫽'),
			_Utils_Tuple2('part', '∂'),
			_Utils_Tuple2('PartialD', '∂'),
			_Utils_Tuple2('Pcy', 'П'),
			_Utils_Tuple2('pcy', 'п'),
			_Utils_Tuple2('percnt', '%'),
			_Utils_Tuple2('period', '.'),
			_Utils_Tuple2('permil', '‰'),
			_Utils_Tuple2('perp', '⊥'),
			_Utils_Tuple2('pertenk', '‱'),
			_Utils_Tuple2('Pfr', '\uD835\uDD13'),
			_Utils_Tuple2('pfr', '\uD835\uDD2D'),
			_Utils_Tuple2('Phi', 'Φ'),
			_Utils_Tuple2('phi', 'φ'),
			_Utils_Tuple2('phiv', 'ϕ'),
			_Utils_Tuple2('phmmat', 'ℳ'),
			_Utils_Tuple2('phone', '☎'),
			_Utils_Tuple2('Pi', 'Π'),
			_Utils_Tuple2('pi', 'π'),
			_Utils_Tuple2('pitchfork', '⋔'),
			_Utils_Tuple2('piv', 'ϖ'),
			_Utils_Tuple2('planck', 'ℏ'),
			_Utils_Tuple2('planckh', 'ℎ'),
			_Utils_Tuple2('plankv', 'ℏ'),
			_Utils_Tuple2('plusacir', '⨣'),
			_Utils_Tuple2('plusb', '⊞'),
			_Utils_Tuple2('pluscir', '⨢'),
			_Utils_Tuple2('plus', '+'),
			_Utils_Tuple2('plusdo', '∔'),
			_Utils_Tuple2('plusdu', '⨥'),
			_Utils_Tuple2('pluse', '⩲'),
			_Utils_Tuple2('PlusMinus', '±'),
			_Utils_Tuple2('plusmn', '±'),
			_Utils_Tuple2('plussim', '⨦'),
			_Utils_Tuple2('plustwo', '⨧'),
			_Utils_Tuple2('pm', '±'),
			_Utils_Tuple2('Poincareplane', 'ℌ'),
			_Utils_Tuple2('pointint', '⨕'),
			_Utils_Tuple2('popf', '\uD835\uDD61'),
			_Utils_Tuple2('Popf', 'ℙ'),
			_Utils_Tuple2('pound', '£'),
			_Utils_Tuple2('prap', '⪷'),
			_Utils_Tuple2('Pr', '⪻'),
			_Utils_Tuple2('pr', '≺'),
			_Utils_Tuple2('prcue', '≼'),
			_Utils_Tuple2('precapprox', '⪷'),
			_Utils_Tuple2('prec', '≺'),
			_Utils_Tuple2('preccurlyeq', '≼'),
			_Utils_Tuple2('Precedes', '≺'),
			_Utils_Tuple2('PrecedesEqual', '⪯'),
			_Utils_Tuple2('PrecedesSlantEqual', '≼'),
			_Utils_Tuple2('PrecedesTilde', '≾'),
			_Utils_Tuple2('preceq', '⪯'),
			_Utils_Tuple2('precnapprox', '⪹'),
			_Utils_Tuple2('precneqq', '⪵'),
			_Utils_Tuple2('precnsim', '⋨'),
			_Utils_Tuple2('pre', '⪯'),
			_Utils_Tuple2('prE', '⪳'),
			_Utils_Tuple2('precsim', '≾'),
			_Utils_Tuple2('prime', '′'),
			_Utils_Tuple2('Prime', '″'),
			_Utils_Tuple2('primes', 'ℙ'),
			_Utils_Tuple2('prnap', '⪹'),
			_Utils_Tuple2('prnE', '⪵'),
			_Utils_Tuple2('prnsim', '⋨'),
			_Utils_Tuple2('prod', '∏'),
			_Utils_Tuple2('Product', '∏'),
			_Utils_Tuple2('profalar', '⌮'),
			_Utils_Tuple2('profline', '⌒'),
			_Utils_Tuple2('profsurf', '⌓'),
			_Utils_Tuple2('prop', '∝'),
			_Utils_Tuple2('Proportional', '∝'),
			_Utils_Tuple2('Proportion', '∷'),
			_Utils_Tuple2('propto', '∝'),
			_Utils_Tuple2('prsim', '≾'),
			_Utils_Tuple2('prurel', '⊰'),
			_Utils_Tuple2('Pscr', '\uD835\uDCAB'),
			_Utils_Tuple2('pscr', '\uD835\uDCC5'),
			_Utils_Tuple2('Psi', 'Ψ'),
			_Utils_Tuple2('psi', 'ψ'),
			_Utils_Tuple2('puncsp', '\u2008'),
			_Utils_Tuple2('Qfr', '\uD835\uDD14'),
			_Utils_Tuple2('qfr', '\uD835\uDD2E'),
			_Utils_Tuple2('qint', '⨌'),
			_Utils_Tuple2('qopf', '\uD835\uDD62'),
			_Utils_Tuple2('Qopf', 'ℚ'),
			_Utils_Tuple2('qprime', '⁗'),
			_Utils_Tuple2('Qscr', '\uD835\uDCAC'),
			_Utils_Tuple2('qscr', '\uD835\uDCC6'),
			_Utils_Tuple2('quaternions', 'ℍ'),
			_Utils_Tuple2('quatint', '⨖'),
			_Utils_Tuple2('quest', '?'),
			_Utils_Tuple2('questeq', '≟'),
			_Utils_Tuple2('quot', '\"'),
			_Utils_Tuple2('QUOT', '\"'),
			_Utils_Tuple2('rAarr', '⇛'),
			_Utils_Tuple2('race', '∽̱'),
			_Utils_Tuple2('Racute', 'Ŕ'),
			_Utils_Tuple2('racute', 'ŕ'),
			_Utils_Tuple2('radic', '√'),
			_Utils_Tuple2('raemptyv', '⦳'),
			_Utils_Tuple2('rang', '⟩'),
			_Utils_Tuple2('Rang', '⟫'),
			_Utils_Tuple2('rangd', '⦒'),
			_Utils_Tuple2('range', '⦥'),
			_Utils_Tuple2('rangle', '⟩'),
			_Utils_Tuple2('raquo', '»'),
			_Utils_Tuple2('rarrap', '⥵'),
			_Utils_Tuple2('rarrb', '⇥'),
			_Utils_Tuple2('rarrbfs', '⤠'),
			_Utils_Tuple2('rarrc', '⤳'),
			_Utils_Tuple2('rarr', '→'),
			_Utils_Tuple2('Rarr', '↠'),
			_Utils_Tuple2('rArr', '⇒'),
			_Utils_Tuple2('rarrfs', '⤞'),
			_Utils_Tuple2('rarrhk', '↪'),
			_Utils_Tuple2('rarrlp', '↬'),
			_Utils_Tuple2('rarrpl', '⥅'),
			_Utils_Tuple2('rarrsim', '⥴'),
			_Utils_Tuple2('Rarrtl', '⤖'),
			_Utils_Tuple2('rarrtl', '↣'),
			_Utils_Tuple2('rarrw', '↝'),
			_Utils_Tuple2('ratail', '⤚'),
			_Utils_Tuple2('rAtail', '⤜'),
			_Utils_Tuple2('ratio', '∶'),
			_Utils_Tuple2('rationals', 'ℚ'),
			_Utils_Tuple2('rbarr', '⤍'),
			_Utils_Tuple2('rBarr', '⤏'),
			_Utils_Tuple2('RBarr', '⤐'),
			_Utils_Tuple2('rbbrk', '❳'),
			_Utils_Tuple2('rbrace', '}'),
			_Utils_Tuple2('rbrack', ']'),
			_Utils_Tuple2('rbrke', '⦌'),
			_Utils_Tuple2('rbrksld', '⦎'),
			_Utils_Tuple2('rbrkslu', '⦐'),
			_Utils_Tuple2('Rcaron', 'Ř'),
			_Utils_Tuple2('rcaron', 'ř'),
			_Utils_Tuple2('Rcedil', 'Ŗ'),
			_Utils_Tuple2('rcedil', 'ŗ'),
			_Utils_Tuple2('rceil', '⌉'),
			_Utils_Tuple2('rcub', '}'),
			_Utils_Tuple2('Rcy', 'Р'),
			_Utils_Tuple2('rcy', 'р'),
			_Utils_Tuple2('rdca', '⤷'),
			_Utils_Tuple2('rdldhar', '⥩'),
			_Utils_Tuple2('rdquo', '”'),
			_Utils_Tuple2('rdquor', '”'),
			_Utils_Tuple2('rdsh', '↳'),
			_Utils_Tuple2('real', 'ℜ'),
			_Utils_Tuple2('realine', 'ℛ'),
			_Utils_Tuple2('realpart', 'ℜ'),
			_Utils_Tuple2('reals', 'ℝ'),
			_Utils_Tuple2('Re', 'ℜ'),
			_Utils_Tuple2('rect', '▭'),
			_Utils_Tuple2('reg', '®'),
			_Utils_Tuple2('REG', '®'),
			_Utils_Tuple2('ReverseElement', '∋'),
			_Utils_Tuple2('ReverseEquilibrium', '⇋'),
			_Utils_Tuple2('ReverseUpEquilibrium', '⥯'),
			_Utils_Tuple2('rfisht', '⥽'),
			_Utils_Tuple2('rfloor', '⌋'),
			_Utils_Tuple2('rfr', '\uD835\uDD2F'),
			_Utils_Tuple2('Rfr', 'ℜ'),
			_Utils_Tuple2('rHar', '⥤'),
			_Utils_Tuple2('rhard', '⇁'),
			_Utils_Tuple2('rharu', '⇀'),
			_Utils_Tuple2('rharul', '⥬'),
			_Utils_Tuple2('Rho', 'Ρ'),
			_Utils_Tuple2('rho', 'ρ'),
			_Utils_Tuple2('rhov', 'ϱ'),
			_Utils_Tuple2('RightAngleBracket', '⟩'),
			_Utils_Tuple2('RightArrowBar', '⇥'),
			_Utils_Tuple2('rightarrow', '→'),
			_Utils_Tuple2('RightArrow', '→'),
			_Utils_Tuple2('Rightarrow', '⇒'),
			_Utils_Tuple2('RightArrowLeftArrow', '⇄'),
			_Utils_Tuple2('rightarrowtail', '↣'),
			_Utils_Tuple2('RightCeiling', '⌉'),
			_Utils_Tuple2('RightDoubleBracket', '⟧'),
			_Utils_Tuple2('RightDownTeeVector', '⥝'),
			_Utils_Tuple2('RightDownVectorBar', '⥕'),
			_Utils_Tuple2('RightDownVector', '⇂'),
			_Utils_Tuple2('RightFloor', '⌋'),
			_Utils_Tuple2('rightharpoondown', '⇁'),
			_Utils_Tuple2('rightharpoonup', '⇀'),
			_Utils_Tuple2('rightleftarrows', '⇄'),
			_Utils_Tuple2('rightleftharpoons', '⇌'),
			_Utils_Tuple2('rightrightarrows', '⇉'),
			_Utils_Tuple2('rightsquigarrow', '↝'),
			_Utils_Tuple2('RightTeeArrow', '↦'),
			_Utils_Tuple2('RightTee', '⊢'),
			_Utils_Tuple2('RightTeeVector', '⥛'),
			_Utils_Tuple2('rightthreetimes', '⋌'),
			_Utils_Tuple2('RightTriangleBar', '⧐'),
			_Utils_Tuple2('RightTriangle', '⊳'),
			_Utils_Tuple2('RightTriangleEqual', '⊵'),
			_Utils_Tuple2('RightUpDownVector', '⥏'),
			_Utils_Tuple2('RightUpTeeVector', '⥜'),
			_Utils_Tuple2('RightUpVectorBar', '⥔'),
			_Utils_Tuple2('RightUpVector', '↾'),
			_Utils_Tuple2('RightVectorBar', '⥓'),
			_Utils_Tuple2('RightVector', '⇀'),
			_Utils_Tuple2('ring', '˚'),
			_Utils_Tuple2('risingdotseq', '≓'),
			_Utils_Tuple2('rlarr', '⇄'),
			_Utils_Tuple2('rlhar', '⇌'),
			_Utils_Tuple2('rlm', '\u200F'),
			_Utils_Tuple2('rmoustache', '⎱'),
			_Utils_Tuple2('rmoust', '⎱'),
			_Utils_Tuple2('rnmid', '⫮'),
			_Utils_Tuple2('roang', '⟭'),
			_Utils_Tuple2('roarr', '⇾'),
			_Utils_Tuple2('robrk', '⟧'),
			_Utils_Tuple2('ropar', '⦆'),
			_Utils_Tuple2('ropf', '\uD835\uDD63'),
			_Utils_Tuple2('Ropf', 'ℝ'),
			_Utils_Tuple2('roplus', '⨮'),
			_Utils_Tuple2('rotimes', '⨵'),
			_Utils_Tuple2('RoundImplies', '⥰'),
			_Utils_Tuple2('rpar', ')'),
			_Utils_Tuple2('rpargt', '⦔'),
			_Utils_Tuple2('rppolint', '⨒'),
			_Utils_Tuple2('rrarr', '⇉'),
			_Utils_Tuple2('Rrightarrow', '⇛'),
			_Utils_Tuple2('rsaquo', '›'),
			_Utils_Tuple2('rscr', '\uD835\uDCC7'),
			_Utils_Tuple2('Rscr', 'ℛ'),
			_Utils_Tuple2('rsh', '↱'),
			_Utils_Tuple2('Rsh', '↱'),
			_Utils_Tuple2('rsqb', ']'),
			_Utils_Tuple2('rsquo', '’'),
			_Utils_Tuple2('rsquor', '’'),
			_Utils_Tuple2('rthree', '⋌'),
			_Utils_Tuple2('rtimes', '⋊'),
			_Utils_Tuple2('rtri', '▹'),
			_Utils_Tuple2('rtrie', '⊵'),
			_Utils_Tuple2('rtrif', '▸'),
			_Utils_Tuple2('rtriltri', '⧎'),
			_Utils_Tuple2('RuleDelayed', '⧴'),
			_Utils_Tuple2('ruluhar', '⥨'),
			_Utils_Tuple2('rx', '℞'),
			_Utils_Tuple2('Sacute', 'Ś'),
			_Utils_Tuple2('sacute', 'ś'),
			_Utils_Tuple2('sbquo', '‚'),
			_Utils_Tuple2('scap', '⪸'),
			_Utils_Tuple2('Scaron', 'Š'),
			_Utils_Tuple2('scaron', 'š'),
			_Utils_Tuple2('Sc', '⪼'),
			_Utils_Tuple2('sc', '≻'),
			_Utils_Tuple2('sccue', '≽'),
			_Utils_Tuple2('sce', '⪰'),
			_Utils_Tuple2('scE', '⪴'),
			_Utils_Tuple2('Scedil', 'Ş'),
			_Utils_Tuple2('scedil', 'ş'),
			_Utils_Tuple2('Scirc', 'Ŝ'),
			_Utils_Tuple2('scirc', 'ŝ'),
			_Utils_Tuple2('scnap', '⪺'),
			_Utils_Tuple2('scnE', '⪶'),
			_Utils_Tuple2('scnsim', '⋩'),
			_Utils_Tuple2('scpolint', '⨓'),
			_Utils_Tuple2('scsim', '≿'),
			_Utils_Tuple2('Scy', 'С'),
			_Utils_Tuple2('scy', 'с'),
			_Utils_Tuple2('sdotb', '⊡'),
			_Utils_Tuple2('sdot', '⋅'),
			_Utils_Tuple2('sdote', '⩦'),
			_Utils_Tuple2('searhk', '⤥'),
			_Utils_Tuple2('searr', '↘'),
			_Utils_Tuple2('seArr', '⇘'),
			_Utils_Tuple2('searrow', '↘'),
			_Utils_Tuple2('sect', '§'),
			_Utils_Tuple2('semi', ';'),
			_Utils_Tuple2('seswar', '⤩'),
			_Utils_Tuple2('setminus', '∖'),
			_Utils_Tuple2('setmn', '∖'),
			_Utils_Tuple2('sext', '✶'),
			_Utils_Tuple2('Sfr', '\uD835\uDD16'),
			_Utils_Tuple2('sfr', '\uD835\uDD30'),
			_Utils_Tuple2('sfrown', '⌢'),
			_Utils_Tuple2('sharp', '♯'),
			_Utils_Tuple2('SHCHcy', 'Щ'),
			_Utils_Tuple2('shchcy', 'щ'),
			_Utils_Tuple2('SHcy', 'Ш'),
			_Utils_Tuple2('shcy', 'ш'),
			_Utils_Tuple2('ShortDownArrow', '↓'),
			_Utils_Tuple2('ShortLeftArrow', '←'),
			_Utils_Tuple2('shortmid', '∣'),
			_Utils_Tuple2('shortparallel', '∥'),
			_Utils_Tuple2('ShortRightArrow', '→'),
			_Utils_Tuple2('ShortUpArrow', '↑'),
			_Utils_Tuple2('shy', '\u00AD'),
			_Utils_Tuple2('Sigma', 'Σ'),
			_Utils_Tuple2('sigma', 'σ'),
			_Utils_Tuple2('sigmaf', 'ς'),
			_Utils_Tuple2('sigmav', 'ς'),
			_Utils_Tuple2('sim', '∼'),
			_Utils_Tuple2('simdot', '⩪'),
			_Utils_Tuple2('sime', '≃'),
			_Utils_Tuple2('simeq', '≃'),
			_Utils_Tuple2('simg', '⪞'),
			_Utils_Tuple2('simgE', '⪠'),
			_Utils_Tuple2('siml', '⪝'),
			_Utils_Tuple2('simlE', '⪟'),
			_Utils_Tuple2('simne', '≆'),
			_Utils_Tuple2('simplus', '⨤'),
			_Utils_Tuple2('simrarr', '⥲'),
			_Utils_Tuple2('slarr', '←'),
			_Utils_Tuple2('SmallCircle', '∘'),
			_Utils_Tuple2('smallsetminus', '∖'),
			_Utils_Tuple2('smashp', '⨳'),
			_Utils_Tuple2('smeparsl', '⧤'),
			_Utils_Tuple2('smid', '∣'),
			_Utils_Tuple2('smile', '⌣'),
			_Utils_Tuple2('smt', '⪪'),
			_Utils_Tuple2('smte', '⪬'),
			_Utils_Tuple2('smtes', '⪬︀'),
			_Utils_Tuple2('SOFTcy', 'Ь'),
			_Utils_Tuple2('softcy', 'ь'),
			_Utils_Tuple2('solbar', '⌿'),
			_Utils_Tuple2('solb', '⧄'),
			_Utils_Tuple2('sol', '/'),
			_Utils_Tuple2('Sopf', '\uD835\uDD4A'),
			_Utils_Tuple2('sopf', '\uD835\uDD64'),
			_Utils_Tuple2('spades', '♠'),
			_Utils_Tuple2('spadesuit', '♠'),
			_Utils_Tuple2('spar', '∥'),
			_Utils_Tuple2('sqcap', '⊓'),
			_Utils_Tuple2('sqcaps', '⊓︀'),
			_Utils_Tuple2('sqcup', '⊔'),
			_Utils_Tuple2('sqcups', '⊔︀'),
			_Utils_Tuple2('Sqrt', '√'),
			_Utils_Tuple2('sqsub', '⊏'),
			_Utils_Tuple2('sqsube', '⊑'),
			_Utils_Tuple2('sqsubset', '⊏'),
			_Utils_Tuple2('sqsubseteq', '⊑'),
			_Utils_Tuple2('sqsup', '⊐'),
			_Utils_Tuple2('sqsupe', '⊒'),
			_Utils_Tuple2('sqsupset', '⊐'),
			_Utils_Tuple2('sqsupseteq', '⊒'),
			_Utils_Tuple2('square', '□'),
			_Utils_Tuple2('Square', '□'),
			_Utils_Tuple2('SquareIntersection', '⊓'),
			_Utils_Tuple2('SquareSubset', '⊏'),
			_Utils_Tuple2('SquareSubsetEqual', '⊑'),
			_Utils_Tuple2('SquareSuperset', '⊐'),
			_Utils_Tuple2('SquareSupersetEqual', '⊒'),
			_Utils_Tuple2('SquareUnion', '⊔'),
			_Utils_Tuple2('squarf', '▪'),
			_Utils_Tuple2('squ', '□'),
			_Utils_Tuple2('squf', '▪'),
			_Utils_Tuple2('srarr', '→'),
			_Utils_Tuple2('Sscr', '\uD835\uDCAE'),
			_Utils_Tuple2('sscr', '\uD835\uDCC8'),
			_Utils_Tuple2('ssetmn', '∖'),
			_Utils_Tuple2('ssmile', '⌣'),
			_Utils_Tuple2('sstarf', '⋆'),
			_Utils_Tuple2('Star', '⋆'),
			_Utils_Tuple2('star', '☆'),
			_Utils_Tuple2('starf', '★'),
			_Utils_Tuple2('straightepsilon', 'ϵ'),
			_Utils_Tuple2('straightphi', 'ϕ'),
			_Utils_Tuple2('strns', '¯'),
			_Utils_Tuple2('sub', '⊂'),
			_Utils_Tuple2('Sub', '⋐'),
			_Utils_Tuple2('subdot', '⪽'),
			_Utils_Tuple2('subE', '⫅'),
			_Utils_Tuple2('sube', '⊆'),
			_Utils_Tuple2('subedot', '⫃'),
			_Utils_Tuple2('submult', '⫁'),
			_Utils_Tuple2('subnE', '⫋'),
			_Utils_Tuple2('subne', '⊊'),
			_Utils_Tuple2('subplus', '⪿'),
			_Utils_Tuple2('subrarr', '⥹'),
			_Utils_Tuple2('subset', '⊂'),
			_Utils_Tuple2('Subset', '⋐'),
			_Utils_Tuple2('subseteq', '⊆'),
			_Utils_Tuple2('subseteqq', '⫅'),
			_Utils_Tuple2('SubsetEqual', '⊆'),
			_Utils_Tuple2('subsetneq', '⊊'),
			_Utils_Tuple2('subsetneqq', '⫋'),
			_Utils_Tuple2('subsim', '⫇'),
			_Utils_Tuple2('subsub', '⫕'),
			_Utils_Tuple2('subsup', '⫓'),
			_Utils_Tuple2('succapprox', '⪸'),
			_Utils_Tuple2('succ', '≻'),
			_Utils_Tuple2('succcurlyeq', '≽'),
			_Utils_Tuple2('Succeeds', '≻'),
			_Utils_Tuple2('SucceedsEqual', '⪰'),
			_Utils_Tuple2('SucceedsSlantEqual', '≽'),
			_Utils_Tuple2('SucceedsTilde', '≿'),
			_Utils_Tuple2('succeq', '⪰'),
			_Utils_Tuple2('succnapprox', '⪺'),
			_Utils_Tuple2('succneqq', '⪶'),
			_Utils_Tuple2('succnsim', '⋩'),
			_Utils_Tuple2('succsim', '≿'),
			_Utils_Tuple2('SuchThat', '∋'),
			_Utils_Tuple2('sum', '∑'),
			_Utils_Tuple2('Sum', '∑'),
			_Utils_Tuple2('sung', '♪'),
			_Utils_Tuple2('sup1', '¹'),
			_Utils_Tuple2('sup2', '²'),
			_Utils_Tuple2('sup3', '³'),
			_Utils_Tuple2('sup', '⊃'),
			_Utils_Tuple2('Sup', '⋑'),
			_Utils_Tuple2('supdot', '⪾'),
			_Utils_Tuple2('supdsub', '⫘'),
			_Utils_Tuple2('supE', '⫆'),
			_Utils_Tuple2('supe', '⊇'),
			_Utils_Tuple2('supedot', '⫄'),
			_Utils_Tuple2('Superset', '⊃'),
			_Utils_Tuple2('SupersetEqual', '⊇'),
			_Utils_Tuple2('suphsol', '⟉'),
			_Utils_Tuple2('suphsub', '⫗'),
			_Utils_Tuple2('suplarr', '⥻'),
			_Utils_Tuple2('supmult', '⫂'),
			_Utils_Tuple2('supnE', '⫌'),
			_Utils_Tuple2('supne', '⊋'),
			_Utils_Tuple2('supplus', '⫀'),
			_Utils_Tuple2('supset', '⊃'),
			_Utils_Tuple2('Supset', '⋑'),
			_Utils_Tuple2('supseteq', '⊇'),
			_Utils_Tuple2('supseteqq', '⫆'),
			_Utils_Tuple2('supsetneq', '⊋'),
			_Utils_Tuple2('supsetneqq', '⫌'),
			_Utils_Tuple2('supsim', '⫈'),
			_Utils_Tuple2('supsub', '⫔'),
			_Utils_Tuple2('supsup', '⫖'),
			_Utils_Tuple2('swarhk', '⤦'),
			_Utils_Tuple2('swarr', '↙'),
			_Utils_Tuple2('swArr', '⇙'),
			_Utils_Tuple2('swarrow', '↙'),
			_Utils_Tuple2('swnwar', '⤪'),
			_Utils_Tuple2('szlig', 'ß'),
			_Utils_Tuple2('Tab', '\t'),
			_Utils_Tuple2('target', '⌖'),
			_Utils_Tuple2('Tau', 'Τ'),
			_Utils_Tuple2('tau', 'τ'),
			_Utils_Tuple2('tbrk', '⎴'),
			_Utils_Tuple2('Tcaron', 'Ť'),
			_Utils_Tuple2('tcaron', 'ť'),
			_Utils_Tuple2('Tcedil', 'Ţ'),
			_Utils_Tuple2('tcedil', 'ţ'),
			_Utils_Tuple2('Tcy', 'Т'),
			_Utils_Tuple2('tcy', 'т'),
			_Utils_Tuple2('tdot', '⃛'),
			_Utils_Tuple2('telrec', '⌕'),
			_Utils_Tuple2('Tfr', '\uD835\uDD17'),
			_Utils_Tuple2('tfr', '\uD835\uDD31'),
			_Utils_Tuple2('there4', '∴'),
			_Utils_Tuple2('therefore', '∴'),
			_Utils_Tuple2('Therefore', '∴'),
			_Utils_Tuple2('Theta', 'Θ'),
			_Utils_Tuple2('theta', 'θ'),
			_Utils_Tuple2('thetasym', 'ϑ'),
			_Utils_Tuple2('thetav', 'ϑ'),
			_Utils_Tuple2('thickapprox', '≈'),
			_Utils_Tuple2('thicksim', '∼'),
			_Utils_Tuple2('ThickSpace', '\u205F\u200A'),
			_Utils_Tuple2('ThinSpace', '\u2009'),
			_Utils_Tuple2('thinsp', '\u2009'),
			_Utils_Tuple2('thkap', '≈'),
			_Utils_Tuple2('thksim', '∼'),
			_Utils_Tuple2('THORN', 'Þ'),
			_Utils_Tuple2('thorn', 'þ'),
			_Utils_Tuple2('tilde', '˜'),
			_Utils_Tuple2('Tilde', '∼'),
			_Utils_Tuple2('TildeEqual', '≃'),
			_Utils_Tuple2('TildeFullEqual', '≅'),
			_Utils_Tuple2('TildeTilde', '≈'),
			_Utils_Tuple2('timesbar', '⨱'),
			_Utils_Tuple2('timesb', '⊠'),
			_Utils_Tuple2('times', '×'),
			_Utils_Tuple2('timesd', '⨰'),
			_Utils_Tuple2('tint', '∭'),
			_Utils_Tuple2('toea', '⤨'),
			_Utils_Tuple2('topbot', '⌶'),
			_Utils_Tuple2('topcir', '⫱'),
			_Utils_Tuple2('top', '⊤'),
			_Utils_Tuple2('Topf', '\uD835\uDD4B'),
			_Utils_Tuple2('topf', '\uD835\uDD65'),
			_Utils_Tuple2('topfork', '⫚'),
			_Utils_Tuple2('tosa', '⤩'),
			_Utils_Tuple2('tprime', '‴'),
			_Utils_Tuple2('trade', '™'),
			_Utils_Tuple2('TRADE', '™'),
			_Utils_Tuple2('triangle', '▵'),
			_Utils_Tuple2('triangledown', '▿'),
			_Utils_Tuple2('triangleleft', '◃'),
			_Utils_Tuple2('trianglelefteq', '⊴'),
			_Utils_Tuple2('triangleq', '≜'),
			_Utils_Tuple2('triangleright', '▹'),
			_Utils_Tuple2('trianglerighteq', '⊵'),
			_Utils_Tuple2('tridot', '◬'),
			_Utils_Tuple2('trie', '≜'),
			_Utils_Tuple2('triminus', '⨺'),
			_Utils_Tuple2('TripleDot', '⃛'),
			_Utils_Tuple2('triplus', '⨹'),
			_Utils_Tuple2('trisb', '⧍'),
			_Utils_Tuple2('tritime', '⨻'),
			_Utils_Tuple2('trpezium', '⏢'),
			_Utils_Tuple2('Tscr', '\uD835\uDCAF'),
			_Utils_Tuple2('tscr', '\uD835\uDCC9'),
			_Utils_Tuple2('TScy', 'Ц'),
			_Utils_Tuple2('tscy', 'ц'),
			_Utils_Tuple2('TSHcy', 'Ћ'),
			_Utils_Tuple2('tshcy', 'ћ'),
			_Utils_Tuple2('Tstrok', 'Ŧ'),
			_Utils_Tuple2('tstrok', 'ŧ'),
			_Utils_Tuple2('twixt', '≬'),
			_Utils_Tuple2('twoheadleftarrow', '↞'),
			_Utils_Tuple2('twoheadrightarrow', '↠'),
			_Utils_Tuple2('Uacute', 'Ú'),
			_Utils_Tuple2('uacute', 'ú'),
			_Utils_Tuple2('uarr', '↑'),
			_Utils_Tuple2('Uarr', '↟'),
			_Utils_Tuple2('uArr', '⇑'),
			_Utils_Tuple2('Uarrocir', '⥉'),
			_Utils_Tuple2('Ubrcy', 'Ў'),
			_Utils_Tuple2('ubrcy', 'ў'),
			_Utils_Tuple2('Ubreve', 'Ŭ'),
			_Utils_Tuple2('ubreve', 'ŭ'),
			_Utils_Tuple2('Ucirc', 'Û'),
			_Utils_Tuple2('ucirc', 'û'),
			_Utils_Tuple2('Ucy', 'У'),
			_Utils_Tuple2('ucy', 'у'),
			_Utils_Tuple2('udarr', '⇅'),
			_Utils_Tuple2('Udblac', 'Ű'),
			_Utils_Tuple2('udblac', 'ű'),
			_Utils_Tuple2('udhar', '⥮'),
			_Utils_Tuple2('ufisht', '⥾'),
			_Utils_Tuple2('Ufr', '\uD835\uDD18'),
			_Utils_Tuple2('ufr', '\uD835\uDD32'),
			_Utils_Tuple2('Ugrave', 'Ù'),
			_Utils_Tuple2('ugrave', 'ù'),
			_Utils_Tuple2('uHar', '⥣'),
			_Utils_Tuple2('uharl', '↿'),
			_Utils_Tuple2('uharr', '↾'),
			_Utils_Tuple2('uhblk', '▀'),
			_Utils_Tuple2('ulcorn', '⌜'),
			_Utils_Tuple2('ulcorner', '⌜'),
			_Utils_Tuple2('ulcrop', '⌏'),
			_Utils_Tuple2('ultri', '◸'),
			_Utils_Tuple2('Umacr', 'Ū'),
			_Utils_Tuple2('umacr', 'ū'),
			_Utils_Tuple2('uml', '¨'),
			_Utils_Tuple2('UnderBar', '_'),
			_Utils_Tuple2('UnderBrace', '⏟'),
			_Utils_Tuple2('UnderBracket', '⎵'),
			_Utils_Tuple2('UnderParenthesis', '⏝'),
			_Utils_Tuple2('Union', '⋃'),
			_Utils_Tuple2('UnionPlus', '⊎'),
			_Utils_Tuple2('Uogon', 'Ų'),
			_Utils_Tuple2('uogon', 'ų'),
			_Utils_Tuple2('Uopf', '\uD835\uDD4C'),
			_Utils_Tuple2('uopf', '\uD835\uDD66'),
			_Utils_Tuple2('UpArrowBar', '⤒'),
			_Utils_Tuple2('uparrow', '↑'),
			_Utils_Tuple2('UpArrow', '↑'),
			_Utils_Tuple2('Uparrow', '⇑'),
			_Utils_Tuple2('UpArrowDownArrow', '⇅'),
			_Utils_Tuple2('updownarrow', '↕'),
			_Utils_Tuple2('UpDownArrow', '↕'),
			_Utils_Tuple2('Updownarrow', '⇕'),
			_Utils_Tuple2('UpEquilibrium', '⥮'),
			_Utils_Tuple2('upharpoonleft', '↿'),
			_Utils_Tuple2('upharpoonright', '↾'),
			_Utils_Tuple2('uplus', '⊎'),
			_Utils_Tuple2('UpperLeftArrow', '↖'),
			_Utils_Tuple2('UpperRightArrow', '↗'),
			_Utils_Tuple2('upsi', 'υ'),
			_Utils_Tuple2('Upsi', 'ϒ'),
			_Utils_Tuple2('upsih', 'ϒ'),
			_Utils_Tuple2('Upsilon', 'Υ'),
			_Utils_Tuple2('upsilon', 'υ'),
			_Utils_Tuple2('UpTeeArrow', '↥'),
			_Utils_Tuple2('UpTee', '⊥'),
			_Utils_Tuple2('upuparrows', '⇈'),
			_Utils_Tuple2('urcorn', '⌝'),
			_Utils_Tuple2('urcorner', '⌝'),
			_Utils_Tuple2('urcrop', '⌎'),
			_Utils_Tuple2('Uring', 'Ů'),
			_Utils_Tuple2('uring', 'ů'),
			_Utils_Tuple2('urtri', '◹'),
			_Utils_Tuple2('Uscr', '\uD835\uDCB0'),
			_Utils_Tuple2('uscr', '\uD835\uDCCA'),
			_Utils_Tuple2('utdot', '⋰'),
			_Utils_Tuple2('Utilde', 'Ũ'),
			_Utils_Tuple2('utilde', 'ũ'),
			_Utils_Tuple2('utri', '▵'),
			_Utils_Tuple2('utrif', '▴'),
			_Utils_Tuple2('uuarr', '⇈'),
			_Utils_Tuple2('Uuml', 'Ü'),
			_Utils_Tuple2('uuml', 'ü'),
			_Utils_Tuple2('uwangle', '⦧'),
			_Utils_Tuple2('vangrt', '⦜'),
			_Utils_Tuple2('varepsilon', 'ϵ'),
			_Utils_Tuple2('varkappa', 'ϰ'),
			_Utils_Tuple2('varnothing', '∅'),
			_Utils_Tuple2('varphi', 'ϕ'),
			_Utils_Tuple2('varpi', 'ϖ'),
			_Utils_Tuple2('varpropto', '∝'),
			_Utils_Tuple2('varr', '↕'),
			_Utils_Tuple2('vArr', '⇕'),
			_Utils_Tuple2('varrho', 'ϱ'),
			_Utils_Tuple2('varsigma', 'ς'),
			_Utils_Tuple2('varsubsetneq', '⊊︀'),
			_Utils_Tuple2('varsubsetneqq', '⫋︀'),
			_Utils_Tuple2('varsupsetneq', '⊋︀'),
			_Utils_Tuple2('varsupsetneqq', '⫌︀'),
			_Utils_Tuple2('vartheta', 'ϑ'),
			_Utils_Tuple2('vartriangleleft', '⊲'),
			_Utils_Tuple2('vartriangleright', '⊳'),
			_Utils_Tuple2('vBar', '⫨'),
			_Utils_Tuple2('Vbar', '⫫'),
			_Utils_Tuple2('vBarv', '⫩'),
			_Utils_Tuple2('Vcy', 'В'),
			_Utils_Tuple2('vcy', 'в'),
			_Utils_Tuple2('vdash', '⊢'),
			_Utils_Tuple2('vDash', '⊨'),
			_Utils_Tuple2('Vdash', '⊩'),
			_Utils_Tuple2('VDash', '⊫'),
			_Utils_Tuple2('Vdashl', '⫦'),
			_Utils_Tuple2('veebar', '⊻'),
			_Utils_Tuple2('vee', '∨'),
			_Utils_Tuple2('Vee', '⋁'),
			_Utils_Tuple2('veeeq', '≚'),
			_Utils_Tuple2('vellip', '⋮'),
			_Utils_Tuple2('verbar', '|'),
			_Utils_Tuple2('Verbar', '‖'),
			_Utils_Tuple2('vert', '|'),
			_Utils_Tuple2('Vert', '‖'),
			_Utils_Tuple2('VerticalBar', '∣'),
			_Utils_Tuple2('VerticalLine', '|'),
			_Utils_Tuple2('VerticalSeparator', '❘'),
			_Utils_Tuple2('VerticalTilde', '≀'),
			_Utils_Tuple2('VeryThinSpace', '\u200A'),
			_Utils_Tuple2('Vfr', '\uD835\uDD19'),
			_Utils_Tuple2('vfr', '\uD835\uDD33'),
			_Utils_Tuple2('vltri', '⊲'),
			_Utils_Tuple2('vnsub', '⊂⃒'),
			_Utils_Tuple2('vnsup', '⊃⃒'),
			_Utils_Tuple2('Vopf', '\uD835\uDD4D'),
			_Utils_Tuple2('vopf', '\uD835\uDD67'),
			_Utils_Tuple2('vprop', '∝'),
			_Utils_Tuple2('vrtri', '⊳'),
			_Utils_Tuple2('Vscr', '\uD835\uDCB1'),
			_Utils_Tuple2('vscr', '\uD835\uDCCB'),
			_Utils_Tuple2('vsubnE', '⫋︀'),
			_Utils_Tuple2('vsubne', '⊊︀'),
			_Utils_Tuple2('vsupnE', '⫌︀'),
			_Utils_Tuple2('vsupne', '⊋︀'),
			_Utils_Tuple2('Vvdash', '⊪'),
			_Utils_Tuple2('vzigzag', '⦚'),
			_Utils_Tuple2('Wcirc', 'Ŵ'),
			_Utils_Tuple2('wcirc', 'ŵ'),
			_Utils_Tuple2('wedbar', '⩟'),
			_Utils_Tuple2('wedge', '∧'),
			_Utils_Tuple2('Wedge', '⋀'),
			_Utils_Tuple2('wedgeq', '≙'),
			_Utils_Tuple2('weierp', '℘'),
			_Utils_Tuple2('Wfr', '\uD835\uDD1A'),
			_Utils_Tuple2('wfr', '\uD835\uDD34'),
			_Utils_Tuple2('Wopf', '\uD835\uDD4E'),
			_Utils_Tuple2('wopf', '\uD835\uDD68'),
			_Utils_Tuple2('wp', '℘'),
			_Utils_Tuple2('wr', '≀'),
			_Utils_Tuple2('wreath', '≀'),
			_Utils_Tuple2('Wscr', '\uD835\uDCB2'),
			_Utils_Tuple2('wscr', '\uD835\uDCCC'),
			_Utils_Tuple2('xcap', '⋂'),
			_Utils_Tuple2('xcirc', '◯'),
			_Utils_Tuple2('xcup', '⋃'),
			_Utils_Tuple2('xdtri', '▽'),
			_Utils_Tuple2('Xfr', '\uD835\uDD1B'),
			_Utils_Tuple2('xfr', '\uD835\uDD35'),
			_Utils_Tuple2('xharr', '⟷'),
			_Utils_Tuple2('xhArr', '⟺'),
			_Utils_Tuple2('Xi', 'Ξ'),
			_Utils_Tuple2('xi', 'ξ'),
			_Utils_Tuple2('xlarr', '⟵'),
			_Utils_Tuple2('xlArr', '⟸'),
			_Utils_Tuple2('xmap', '⟼'),
			_Utils_Tuple2('xnis', '⋻'),
			_Utils_Tuple2('xodot', '⨀'),
			_Utils_Tuple2('Xopf', '\uD835\uDD4F'),
			_Utils_Tuple2('xopf', '\uD835\uDD69'),
			_Utils_Tuple2('xoplus', '⨁'),
			_Utils_Tuple2('xotime', '⨂'),
			_Utils_Tuple2('xrarr', '⟶'),
			_Utils_Tuple2('xrArr', '⟹'),
			_Utils_Tuple2('Xscr', '\uD835\uDCB3'),
			_Utils_Tuple2('xscr', '\uD835\uDCCD'),
			_Utils_Tuple2('xsqcup', '⨆'),
			_Utils_Tuple2('xuplus', '⨄'),
			_Utils_Tuple2('xutri', '△'),
			_Utils_Tuple2('xvee', '⋁'),
			_Utils_Tuple2('xwedge', '⋀'),
			_Utils_Tuple2('Yacute', 'Ý'),
			_Utils_Tuple2('yacute', 'ý'),
			_Utils_Tuple2('YAcy', 'Я'),
			_Utils_Tuple2('yacy', 'я'),
			_Utils_Tuple2('Ycirc', 'Ŷ'),
			_Utils_Tuple2('ycirc', 'ŷ'),
			_Utils_Tuple2('Ycy', 'Ы'),
			_Utils_Tuple2('ycy', 'ы'),
			_Utils_Tuple2('yen', '¥'),
			_Utils_Tuple2('Yfr', '\uD835\uDD1C'),
			_Utils_Tuple2('yfr', '\uD835\uDD36'),
			_Utils_Tuple2('YIcy', 'Ї'),
			_Utils_Tuple2('yicy', 'ї'),
			_Utils_Tuple2('Yopf', '\uD835\uDD50'),
			_Utils_Tuple2('yopf', '\uD835\uDD6A'),
			_Utils_Tuple2('Yscr', '\uD835\uDCB4'),
			_Utils_Tuple2('yscr', '\uD835\uDCCE'),
			_Utils_Tuple2('YUcy', 'Ю'),
			_Utils_Tuple2('yucy', 'ю'),
			_Utils_Tuple2('yuml', 'ÿ'),
			_Utils_Tuple2('Yuml', 'Ÿ'),
			_Utils_Tuple2('Zacute', 'Ź'),
			_Utils_Tuple2('zacute', 'ź'),
			_Utils_Tuple2('Zcaron', 'Ž'),
			_Utils_Tuple2('zcaron', 'ž'),
			_Utils_Tuple2('Zcy', 'З'),
			_Utils_Tuple2('zcy', 'з'),
			_Utils_Tuple2('Zdot', 'Ż'),
			_Utils_Tuple2('zdot', 'ż'),
			_Utils_Tuple2('zeetrf', 'ℨ'),
			_Utils_Tuple2('ZeroWidthSpace', '\u200B'),
			_Utils_Tuple2('Zeta', 'Ζ'),
			_Utils_Tuple2('zeta', 'ζ'),
			_Utils_Tuple2('zfr', '\uD835\uDD37'),
			_Utils_Tuple2('Zfr', 'ℨ'),
			_Utils_Tuple2('ZHcy', 'Ж'),
			_Utils_Tuple2('zhcy', 'ж'),
			_Utils_Tuple2('zigrarr', '⇝'),
			_Utils_Tuple2('zopf', '\uD835\uDD6B'),
			_Utils_Tuple2('Zopf', 'ℤ'),
			_Utils_Tuple2('Zscr', '\uD835\uDCB5'),
			_Utils_Tuple2('zscr', '\uD835\uDCCF'),
			_Utils_Tuple2('zwj', '\u200D'),
			_Utils_Tuple2('zwnj', '\u200C')
		]));
var $hecrj$html_parser$Html$Parser$namedCharacterReference = A2(
	$elm$parser$Parser$map,
	function (reference) {
		return A2(
			$elm$core$Maybe$withDefault,
			'&' + (reference + ';'),
			A2($elm$core$Dict$get, reference, $hecrj$html_parser$Html$Parser$NamedCharacterReferences$dict));
	},
	$elm$parser$Parser$getChompedString(
		$hecrj$html_parser$Html$Parser$chompOneOrMore($elm$core$Char$isAlpha)));
var $elm$core$Basics$composeR = F3(
	function (f, g, x) {
		return g(
			f(x));
	});
var $elm$core$Char$fromCode = _Char_fromCode;
var $elm$core$Basics$pow = _Basics_pow;
var $rtfeldman$elm_hex$Hex$fromStringHelp = F3(
	function (position, chars, accumulated) {
		fromStringHelp:
		while (true) {
			if (!chars.b) {
				return $elm$core$Result$Ok(accumulated);
			} else {
				var _char = chars.a;
				var rest = chars.b;
				switch (_char.valueOf()) {
					case '0':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated;
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '1':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + A2($elm$core$Basics$pow, 16, position);
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '2':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (2 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '3':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (3 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '4':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (4 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '5':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (5 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '6':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (6 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '7':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (7 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '8':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (8 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case '9':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (9 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'a':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (10 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'b':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (11 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'c':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (12 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'd':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (13 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'e':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (14 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					case 'f':
						var $temp$position = position - 1,
							$temp$chars = rest,
							$temp$accumulated = accumulated + (15 * A2($elm$core$Basics$pow, 16, position));
						position = $temp$position;
						chars = $temp$chars;
						accumulated = $temp$accumulated;
						continue fromStringHelp;
					default:
						var nonHex = _char;
						return $elm$core$Result$Err(
							$elm$core$String$fromChar(nonHex) + ' is not a valid hexadecimal character.');
				}
			}
		}
	});
var $elm$core$Result$map = F2(
	function (func, ra) {
		if (ra.$ === 'Ok') {
			var a = ra.a;
			return $elm$core$Result$Ok(
				func(a));
		} else {
			var e = ra.a;
			return $elm$core$Result$Err(e);
		}
	});
var $elm$core$Result$mapError = F2(
	function (f, result) {
		if (result.$ === 'Ok') {
			var v = result.a;
			return $elm$core$Result$Ok(v);
		} else {
			var e = result.a;
			return $elm$core$Result$Err(
				f(e));
		}
	});
var $elm$core$String$foldr = _String_foldr;
var $elm$core$String$toList = function (string) {
	return A3($elm$core$String$foldr, $elm$core$List$cons, _List_Nil, string);
};
var $rtfeldman$elm_hex$Hex$fromString = function (str) {
	if ($elm$core$String$isEmpty(str)) {
		return $elm$core$Result$Err('Empty strings are not valid hexadecimal strings.');
	} else {
		var result = function () {
			if (A2($elm$core$String$startsWith, '-', str)) {
				var list = A2(
					$elm$core$Maybe$withDefault,
					_List_Nil,
					$elm$core$List$tail(
						$elm$core$String$toList(str)));
				return A2(
					$elm$core$Result$map,
					$elm$core$Basics$negate,
					A3(
						$rtfeldman$elm_hex$Hex$fromStringHelp,
						$elm$core$List$length(list) - 1,
						list,
						0));
			} else {
				return A3(
					$rtfeldman$elm_hex$Hex$fromStringHelp,
					$elm$core$String$length(str) - 1,
					$elm$core$String$toList(str),
					0);
			}
		}();
		var formatError = function (err) {
			return A2(
				$elm$core$String$join,
				' ',
				_List_fromArray(
					['\"' + (str + '\"'), 'is not a valid hexadecimal string because', err]));
		};
		return A2($elm$core$Result$mapError, formatError, result);
	}
};
var $elm$core$Char$isHexDigit = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return ((48 <= code) && (code <= 57)) || (((65 <= code) && (code <= 70)) || ((97 <= code) && (code <= 102)));
};
var $hecrj$html_parser$Html$Parser$hexadecimal = A2(
	$elm$parser$Parser$andThen,
	function (hex) {
		var _v0 = $rtfeldman$elm_hex$Hex$fromString(
			$elm$core$String$toLower(hex));
		if (_v0.$ === 'Ok') {
			var value = _v0.a;
			return $elm$parser$Parser$succeed(value);
		} else {
			var error = _v0.a;
			return $elm$parser$Parser$problem(error);
		}
	},
	$elm$parser$Parser$getChompedString(
		$hecrj$html_parser$Html$Parser$chompOneOrMore($elm$core$Char$isHexDigit)));
var $elm$parser$Parser$ExpectingInt = {$: 'ExpectingInt'};
var $elm$parser$Parser$Advanced$consumeBase = _Parser_consumeBase;
var $elm$parser$Parser$Advanced$consumeBase16 = _Parser_consumeBase16;
var $elm$parser$Parser$Advanced$bumpOffset = F2(
	function (newOffset, s) {
		return {col: s.col + (newOffset - s.offset), context: s.context, indent: s.indent, offset: newOffset, row: s.row, src: s.src};
	});
var $elm$parser$Parser$Advanced$chompBase10 = _Parser_chompBase10;
var $elm$parser$Parser$Advanced$isAsciiCode = _Parser_isAsciiCode;
var $elm$parser$Parser$Advanced$consumeExp = F2(
	function (offset, src) {
		if (A3($elm$parser$Parser$Advanced$isAsciiCode, 101, offset, src) || A3($elm$parser$Parser$Advanced$isAsciiCode, 69, offset, src)) {
			var eOffset = offset + 1;
			var expOffset = (A3($elm$parser$Parser$Advanced$isAsciiCode, 43, eOffset, src) || A3($elm$parser$Parser$Advanced$isAsciiCode, 45, eOffset, src)) ? (eOffset + 1) : eOffset;
			var newOffset = A2($elm$parser$Parser$Advanced$chompBase10, expOffset, src);
			return _Utils_eq(expOffset, newOffset) ? (-newOffset) : newOffset;
		} else {
			return offset;
		}
	});
var $elm$parser$Parser$Advanced$consumeDotAndExp = F2(
	function (offset, src) {
		return A3($elm$parser$Parser$Advanced$isAsciiCode, 46, offset, src) ? A2(
			$elm$parser$Parser$Advanced$consumeExp,
			A2($elm$parser$Parser$Advanced$chompBase10, offset + 1, src),
			src) : A2($elm$parser$Parser$Advanced$consumeExp, offset, src);
	});
var $elm$parser$Parser$Advanced$finalizeInt = F5(
	function (invalid, handler, startOffset, _v0, s) {
		var endOffset = _v0.a;
		var n = _v0.b;
		if (handler.$ === 'Err') {
			var x = handler.a;
			return A2(
				$elm$parser$Parser$Advanced$Bad,
				true,
				A2($elm$parser$Parser$Advanced$fromState, s, x));
		} else {
			var toValue = handler.a;
			return _Utils_eq(startOffset, endOffset) ? A2(
				$elm$parser$Parser$Advanced$Bad,
				_Utils_cmp(s.offset, startOffset) < 0,
				A2($elm$parser$Parser$Advanced$fromState, s, invalid)) : A3(
				$elm$parser$Parser$Advanced$Good,
				true,
				toValue(n),
				A2($elm$parser$Parser$Advanced$bumpOffset, endOffset, s));
		}
	});
var $elm$core$String$toFloat = _String_toFloat;
var $elm$parser$Parser$Advanced$finalizeFloat = F6(
	function (invalid, expecting, intSettings, floatSettings, intPair, s) {
		var intOffset = intPair.a;
		var floatOffset = A2($elm$parser$Parser$Advanced$consumeDotAndExp, intOffset, s.src);
		if (floatOffset < 0) {
			return A2(
				$elm$parser$Parser$Advanced$Bad,
				true,
				A4($elm$parser$Parser$Advanced$fromInfo, s.row, s.col - (floatOffset + s.offset), invalid, s.context));
		} else {
			if (_Utils_eq(s.offset, floatOffset)) {
				return A2(
					$elm$parser$Parser$Advanced$Bad,
					false,
					A2($elm$parser$Parser$Advanced$fromState, s, expecting));
			} else {
				if (_Utils_eq(intOffset, floatOffset)) {
					return A5($elm$parser$Parser$Advanced$finalizeInt, invalid, intSettings, s.offset, intPair, s);
				} else {
					if (floatSettings.$ === 'Err') {
						var x = floatSettings.a;
						return A2(
							$elm$parser$Parser$Advanced$Bad,
							true,
							A2($elm$parser$Parser$Advanced$fromState, s, invalid));
					} else {
						var toValue = floatSettings.a;
						var _v1 = $elm$core$String$toFloat(
							A3($elm$core$String$slice, s.offset, floatOffset, s.src));
						if (_v1.$ === 'Nothing') {
							return A2(
								$elm$parser$Parser$Advanced$Bad,
								true,
								A2($elm$parser$Parser$Advanced$fromState, s, invalid));
						} else {
							var n = _v1.a;
							return A3(
								$elm$parser$Parser$Advanced$Good,
								true,
								toValue(n),
								A2($elm$parser$Parser$Advanced$bumpOffset, floatOffset, s));
						}
					}
				}
			}
		}
	});
var $elm$parser$Parser$Advanced$number = function (c) {
	return $elm$parser$Parser$Advanced$Parser(
		function (s) {
			if (A3($elm$parser$Parser$Advanced$isAsciiCode, 48, s.offset, s.src)) {
				var zeroOffset = s.offset + 1;
				var baseOffset = zeroOffset + 1;
				return A3($elm$parser$Parser$Advanced$isAsciiCode, 120, zeroOffset, s.src) ? A5(
					$elm$parser$Parser$Advanced$finalizeInt,
					c.invalid,
					c.hex,
					baseOffset,
					A2($elm$parser$Parser$Advanced$consumeBase16, baseOffset, s.src),
					s) : (A3($elm$parser$Parser$Advanced$isAsciiCode, 111, zeroOffset, s.src) ? A5(
					$elm$parser$Parser$Advanced$finalizeInt,
					c.invalid,
					c.octal,
					baseOffset,
					A3($elm$parser$Parser$Advanced$consumeBase, 8, baseOffset, s.src),
					s) : (A3($elm$parser$Parser$Advanced$isAsciiCode, 98, zeroOffset, s.src) ? A5(
					$elm$parser$Parser$Advanced$finalizeInt,
					c.invalid,
					c.binary,
					baseOffset,
					A3($elm$parser$Parser$Advanced$consumeBase, 2, baseOffset, s.src),
					s) : A6(
					$elm$parser$Parser$Advanced$finalizeFloat,
					c.invalid,
					c.expecting,
					c._int,
					c._float,
					_Utils_Tuple2(zeroOffset, 0),
					s)));
			} else {
				return A6(
					$elm$parser$Parser$Advanced$finalizeFloat,
					c.invalid,
					c.expecting,
					c._int,
					c._float,
					A3($elm$parser$Parser$Advanced$consumeBase, 10, s.offset, s.src),
					s);
			}
		});
};
var $elm$parser$Parser$Advanced$int = F2(
	function (expecting, invalid) {
		return $elm$parser$Parser$Advanced$number(
			{
				binary: $elm$core$Result$Err(invalid),
				expecting: expecting,
				_float: $elm$core$Result$Err(invalid),
				hex: $elm$core$Result$Err(invalid),
				_int: $elm$core$Result$Ok($elm$core$Basics$identity),
				invalid: invalid,
				octal: $elm$core$Result$Err(invalid)
			});
	});
var $elm$parser$Parser$int = A2($elm$parser$Parser$Advanced$int, $elm$parser$Parser$ExpectingInt, $elm$parser$Parser$ExpectingInt);
var $hecrj$html_parser$Html$Parser$numericCharacterReference = function () {
	var codepoint = $elm$parser$Parser$oneOf(
		_List_fromArray(
			[
				A2(
				$elm$parser$Parser$keeper,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed($elm$core$Basics$identity),
					$elm$parser$Parser$chompIf(
						function (c) {
							return _Utils_eq(
								c,
								_Utils_chr('x')) || _Utils_eq(
								c,
								_Utils_chr('X'));
						})),
				$hecrj$html_parser$Html$Parser$hexadecimal),
				A2(
				$elm$parser$Parser$keeper,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed($elm$core$Basics$identity),
					$elm$parser$Parser$chompWhile(
						$elm$core$Basics$eq(
							_Utils_chr('0')))),
				$elm$parser$Parser$int)
			]));
	return A2(
		$elm$parser$Parser$keeper,
		A2(
			$elm$parser$Parser$ignorer,
			$elm$parser$Parser$succeed($elm$core$Basics$identity),
			$elm$parser$Parser$chompIf(
				$elm$core$Basics$eq(
					_Utils_chr('#')))),
		A2(
			$elm$parser$Parser$map,
			A2($elm$core$Basics$composeR, $elm$core$Char$fromCode, $elm$core$String$fromChar),
			codepoint));
}();
var $hecrj$html_parser$Html$Parser$characterReference = A2(
	$elm$parser$Parser$keeper,
	A2(
		$elm$parser$Parser$ignorer,
		$elm$parser$Parser$succeed($elm$core$Basics$identity),
		$elm$parser$Parser$chompIf(
			$elm$core$Basics$eq(
				_Utils_chr('&')))),
	$elm$parser$Parser$oneOf(
		_List_fromArray(
			[
				A2(
				$elm$parser$Parser$ignorer,
				$elm$parser$Parser$backtrackable($hecrj$html_parser$Html$Parser$namedCharacterReference),
				$hecrj$html_parser$Html$Parser$chompSemicolon),
				A2(
				$elm$parser$Parser$ignorer,
				$elm$parser$Parser$backtrackable($hecrj$html_parser$Html$Parser$numericCharacterReference),
				$hecrj$html_parser$Html$Parser$chompSemicolon),
				$elm$parser$Parser$succeed('&')
			])));
var $hecrj$html_parser$Html$Parser$tagAttributeQuotedValue = function (quote) {
	var isQuotedValueChar = function (c) {
		return (!_Utils_eq(c, quote)) && (!_Utils_eq(
			c,
			_Utils_chr('&')));
	};
	return A2(
		$elm$parser$Parser$keeper,
		A2(
			$elm$parser$Parser$ignorer,
			$elm$parser$Parser$succeed($elm$core$Basics$identity),
			$elm$parser$Parser$chompIf(
				$elm$core$Basics$eq(quote))),
		A2(
			$elm$parser$Parser$ignorer,
			A2(
				$elm$parser$Parser$map,
				$elm$core$String$join(''),
				$hecrj$html_parser$Html$Parser$many(
					$elm$parser$Parser$oneOf(
						_List_fromArray(
							[
								$elm$parser$Parser$getChompedString(
								$hecrj$html_parser$Html$Parser$chompOneOrMore(isQuotedValueChar)),
								$hecrj$html_parser$Html$Parser$characterReference
							])))),
			$elm$parser$Parser$chompIf(
				$elm$core$Basics$eq(quote))));
};
var $elm$core$List$isEmpty = function (xs) {
	if (!xs.b) {
		return true;
	} else {
		return false;
	}
};
var $hecrj$html_parser$Html$Parser$oneOrMore = F2(
	function (type_, parser_) {
		return A2(
			$elm$parser$Parser$loop,
			_List_Nil,
			function (list) {
				return $elm$parser$Parser$oneOf(
					_List_fromArray(
						[
							A2(
							$elm$parser$Parser$map,
							function (_new) {
								return $elm$parser$Parser$Loop(
									A2($elm$core$List$cons, _new, list));
							},
							parser_),
							$elm$core$List$isEmpty(list) ? $elm$parser$Parser$problem('expecting at least one ' + type_) : $elm$parser$Parser$succeed(
							$elm$parser$Parser$Done(
								$elm$core$List$reverse(list)))
						]));
			});
	});
var $hecrj$html_parser$Html$Parser$tagAttributeUnquotedValue = function () {
	var isUnquotedValueChar = function (c) {
		return (!$hecrj$html_parser$Html$Parser$isSpaceCharacter(c)) && ((!_Utils_eq(
			c,
			_Utils_chr('\"'))) && ((!_Utils_eq(
			c,
			_Utils_chr('\''))) && ((!_Utils_eq(
			c,
			_Utils_chr('='))) && ((!_Utils_eq(
			c,
			_Utils_chr('<'))) && ((!_Utils_eq(
			c,
			_Utils_chr('>'))) && ((!_Utils_eq(
			c,
			_Utils_chr('`'))) && (!_Utils_eq(
			c,
			_Utils_chr('&')))))))));
	};
	return A2(
		$elm$parser$Parser$map,
		$elm$core$String$join(''),
		A2(
			$hecrj$html_parser$Html$Parser$oneOrMore,
			'attribute value',
			$elm$parser$Parser$oneOf(
				_List_fromArray(
					[
						$elm$parser$Parser$getChompedString(
						$hecrj$html_parser$Html$Parser$chompOneOrMore(isUnquotedValueChar)),
						$hecrj$html_parser$Html$Parser$characterReference
					]))));
}();
var $hecrj$html_parser$Html$Parser$tagAttributeValue = $elm$parser$Parser$oneOf(
	_List_fromArray(
		[
			A2(
			$elm$parser$Parser$keeper,
			A2(
				$elm$parser$Parser$ignorer,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed($elm$core$Basics$identity),
					$elm$parser$Parser$chompIf(
						$elm$core$Basics$eq(
							_Utils_chr('=')))),
				$elm$parser$Parser$chompWhile($hecrj$html_parser$Html$Parser$isSpaceCharacter)),
			$elm$parser$Parser$oneOf(
				_List_fromArray(
					[
						$hecrj$html_parser$Html$Parser$tagAttributeUnquotedValue,
						$hecrj$html_parser$Html$Parser$tagAttributeQuotedValue(
						_Utils_chr('\"')),
						$hecrj$html_parser$Html$Parser$tagAttributeQuotedValue(
						_Utils_chr('\''))
					]))),
			$elm$parser$Parser$succeed('')
		]));
var $hecrj$html_parser$Html$Parser$tagAttribute = A2(
	$elm$parser$Parser$keeper,
	A2(
		$elm$parser$Parser$keeper,
		$elm$parser$Parser$succeed($elm$core$Tuple$pair),
		A2(
			$elm$parser$Parser$ignorer,
			$hecrj$html_parser$Html$Parser$tagAttributeName,
			$elm$parser$Parser$chompWhile($hecrj$html_parser$Html$Parser$isSpaceCharacter))),
	A2(
		$elm$parser$Parser$ignorer,
		$hecrj$html_parser$Html$Parser$tagAttributeValue,
		$elm$parser$Parser$chompWhile($hecrj$html_parser$Html$Parser$isSpaceCharacter)));
var $hecrj$html_parser$Html$Parser$tagAttributes = $hecrj$html_parser$Html$Parser$many($hecrj$html_parser$Html$Parser$tagAttribute);
var $hecrj$html_parser$Html$Parser$tagName = A2(
	$elm$parser$Parser$map,
	$elm$core$String$toLower,
	$elm$parser$Parser$getChompedString(
		A2(
			$elm$parser$Parser$ignorer,
			$elm$parser$Parser$chompIf($elm$core$Char$isAlphaNum),
			$elm$parser$Parser$chompWhile(
				function (c) {
					return $elm$core$Char$isAlphaNum(c) || _Utils_eq(
						c,
						_Utils_chr('-'));
				}))));
var $hecrj$html_parser$Html$Parser$Text = function (a) {
	return {$: 'Text', a: a};
};
var $hecrj$html_parser$Html$Parser$text = A2(
	$elm$parser$Parser$map,
	A2(
		$elm$core$Basics$composeR,
		$elm$core$String$join(''),
		$hecrj$html_parser$Html$Parser$Text),
	A2(
		$hecrj$html_parser$Html$Parser$oneOrMore,
		'text element',
		$elm$parser$Parser$oneOf(
			_List_fromArray(
				[
					$elm$parser$Parser$getChompedString(
					$hecrj$html_parser$Html$Parser$chompOneOrMore(
						function (c) {
							return (!_Utils_eq(
								c,
								_Utils_chr('<'))) && (!_Utils_eq(
								c,
								_Utils_chr('&')));
						})),
					$hecrj$html_parser$Html$Parser$characterReference
				]))));
function $hecrj$html_parser$Html$Parser$cyclic$node() {
	return $elm$parser$Parser$oneOf(
		_List_fromArray(
			[
				$hecrj$html_parser$Html$Parser$text,
				$hecrj$html_parser$Html$Parser$comment,
				$hecrj$html_parser$Html$Parser$cyclic$element()
			]));
}
function $hecrj$html_parser$Html$Parser$cyclic$element() {
	return A2(
		$elm$parser$Parser$andThen,
		function (_v0) {
			var name = _v0.a;
			var attributes = _v0.b;
			return $hecrj$html_parser$Html$Parser$isVoidElement(name) ? A2(
				$elm$parser$Parser$ignorer,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed(
						A3($hecrj$html_parser$Html$Parser$Element, name, attributes, _List_Nil)),
					$elm$parser$Parser$oneOf(
						_List_fromArray(
							[
								$elm$parser$Parser$chompIf(
								$elm$core$Basics$eq(
									_Utils_chr('/'))),
								$elm$parser$Parser$succeed(_Utils_Tuple0)
							]))),
				$elm$parser$Parser$chompIf(
					$elm$core$Basics$eq(
						_Utils_chr('>')))) : A2(
				$elm$parser$Parser$keeper,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed(
						A2($hecrj$html_parser$Html$Parser$Element, name, attributes)),
					$elm$parser$Parser$chompIf(
						$elm$core$Basics$eq(
							_Utils_chr('>')))),
				A2(
					$elm$parser$Parser$ignorer,
					$hecrj$html_parser$Html$Parser$many(
						$elm$parser$Parser$backtrackable(
							$hecrj$html_parser$Html$Parser$cyclic$node())),
					$hecrj$html_parser$Html$Parser$closingTag(name)));
		},
		A2(
			$elm$parser$Parser$keeper,
			A2(
				$elm$parser$Parser$keeper,
				A2(
					$elm$parser$Parser$ignorer,
					$elm$parser$Parser$succeed($elm$core$Tuple$pair),
					$elm$parser$Parser$chompIf(
						$elm$core$Basics$eq(
							_Utils_chr('<')))),
				A2(
					$elm$parser$Parser$ignorer,
					$hecrj$html_parser$Html$Parser$tagName,
					$elm$parser$Parser$chompWhile($hecrj$html_parser$Html$Parser$isSpaceCharacter))),
			$hecrj$html_parser$Html$Parser$tagAttributes));
}
try {
	var $hecrj$html_parser$Html$Parser$node = $hecrj$html_parser$Html$Parser$cyclic$node();
	$hecrj$html_parser$Html$Parser$cyclic$node = function () {
		return $hecrj$html_parser$Html$Parser$node;
	};
	var $hecrj$html_parser$Html$Parser$element = $hecrj$html_parser$Html$Parser$cyclic$element();
	$hecrj$html_parser$Html$Parser$cyclic$element = function () {
		return $hecrj$html_parser$Html$Parser$element;
	};
} catch ($) {
	throw 'Some top-level definitions from `Html.Parser` are causing infinite recursion:\n\n  ┌─────┐\n  │    node\n  │     ↓\n  │    element\n  └─────┘\n\nThese errors are very tricky, so read https://elm-lang.org/0.19.1/bad-recursion to learn how to fix it!';}
var $elm$parser$Parser$DeadEnd = F3(
	function (row, col, problem) {
		return {col: col, problem: problem, row: row};
	});
var $elm$parser$Parser$problemToDeadEnd = function (p) {
	return A3($elm$parser$Parser$DeadEnd, p.row, p.col, p.problem);
};
var $elm$parser$Parser$Advanced$bagToList = F2(
	function (bag, list) {
		bagToList:
		while (true) {
			switch (bag.$) {
				case 'Empty':
					return list;
				case 'AddRight':
					var bag1 = bag.a;
					var x = bag.b;
					var $temp$bag = bag1,
						$temp$list = A2($elm$core$List$cons, x, list);
					bag = $temp$bag;
					list = $temp$list;
					continue bagToList;
				default:
					var bag1 = bag.a;
					var bag2 = bag.b;
					var $temp$bag = bag1,
						$temp$list = A2($elm$parser$Parser$Advanced$bagToList, bag2, list);
					bag = $temp$bag;
					list = $temp$list;
					continue bagToList;
			}
		}
	});
var $elm$parser$Parser$Advanced$run = F2(
	function (_v0, src) {
		var parse = _v0.a;
		var _v1 = parse(
			{col: 1, context: _List_Nil, indent: 1, offset: 0, row: 1, src: src});
		if (_v1.$ === 'Good') {
			var value = _v1.b;
			return $elm$core$Result$Ok(value);
		} else {
			var bag = _v1.b;
			return $elm$core$Result$Err(
				A2($elm$parser$Parser$Advanced$bagToList, bag, _List_Nil));
		}
	});
var $elm$parser$Parser$run = F2(
	function (parser, source) {
		var _v0 = A2($elm$parser$Parser$Advanced$run, parser, source);
		if (_v0.$ === 'Ok') {
			var a = _v0.a;
			return $elm$core$Result$Ok(a);
		} else {
			var problems = _v0.a;
			return $elm$core$Result$Err(
				A2($elm$core$List$map, $elm$parser$Parser$problemToDeadEnd, problems));
		}
	});
var $hecrj$html_parser$Html$Parser$run = function (str) {
	return $elm$core$String$isEmpty(str) ? $elm$core$Result$Ok(_List_Nil) : A2(
		$elm$parser$Parser$run,
		A2($hecrj$html_parser$Html$Parser$oneOrMore, 'node', $hecrj$html_parser$Html$Parser$node),
		str);
};
var $elm$virtual_dom$VirtualDom$attribute = F2(
	function (key, value) {
		return A2(
			_VirtualDom_attribute,
			_VirtualDom_noOnOrFormAction(key),
			_VirtualDom_noJavaScriptOrHtmlUri(value));
	});
var $elm$html$Html$Attributes$attribute = $elm$virtual_dom$VirtualDom$attribute;
var $hecrj$html_parser$Html$Parser$Util$toAttribute = function (_v0) {
	var name = _v0.a;
	var value = _v0.b;
	return A2($elm$html$Html$Attributes$attribute, name, value);
};
var $hecrj$html_parser$Html$Parser$Util$toVirtualDom = function (nodes) {
	return A2($elm$core$List$map, $hecrj$html_parser$Html$Parser$Util$toVirtualDomEach, nodes);
};
var $hecrj$html_parser$Html$Parser$Util$toVirtualDomEach = function (node) {
	switch (node.$) {
		case 'Element':
			var name = node.a;
			var attrs = node.b;
			var children = node.c;
			return A3(
				$elm$html$Html$node,
				name,
				A2($elm$core$List$map, $hecrj$html_parser$Html$Parser$Util$toAttribute, attrs),
				$hecrj$html_parser$Html$Parser$Util$toVirtualDom(children));
		case 'Text':
			var s = node.a;
			return $elm$html$Html$text(s);
		default:
			return $elm$html$Html$text('');
	}
};
var $author$project$Editor$Syntax$Util$highlight = F4(
	function (contents, symbols, lineErrors, tokens) {
		var tokensLength = $elm$core$List$length(tokens);
		var _v0 = A3(
			$elm_community$list_extra$List$Extra$indexedFoldl,
			F3(
				function (charIndex, _char, _v1) {
					var tokenIndex = _v1.a;
					var collected = _v1.b;
					var acc = _v1.c;
					if (_Utils_cmp(charIndex, tokenIndex) < 0) {
						return _Utils_Tuple3(tokenIndex, collected, acc);
					} else {
						var _v2 = A2(
							$elm_community$list_extra$List$Extra$find,
							function (token) {
								return _Utils_eq(token.index, charIndex);
							},
							tokens);
						if (_v2.$ === 'Just') {
							var token = _v2.a;
							var _v3 = $elm$core$String$length(collected);
							if (!_v3) {
								return _Utils_Tuple3(
									token.index + token.length,
									'',
									_Utils_ap(
										acc,
										_List_fromArray(
											[token])));
							} else {
								var len = _v3;
								return _Utils_Tuple3(
									token.index + token.length,
									'',
									$elm$core$List$concat(
										_List_fromArray(
											[
												acc,
												_List_fromArray(
												[
													{_class: '', index: charIndex - len, length: len, styles: _List_Nil}
												]),
												_List_fromArray(
												[token])
											])));
							}
						} else {
							if (_Utils_eq(
								charIndex,
								$elm$core$String$length(contents) - 1)) {
								var len = $elm$core$String$length(collected);
								return _Utils_Tuple3(
									0,
									'',
									_Utils_ap(
										acc,
										_List_fromArray(
											[
												{_class: '', index: charIndex - len, length: len + 1, styles: _List_Nil}
											])));
							} else {
								return _Utils_Tuple3(
									tokenIndex + 1,
									_Utils_ap(collected, _char),
									acc);
							}
						}
					}
				}),
			_Utils_Tuple3(0, '', _List_Nil),
			A2($elm$core$String$split, '', contents));
		var filledInTokens = _v0.c;
		return $elm$core$List$concat(
			A2(
				$elm$core$List$indexedMap,
				F2(
					function (index, token) {
						var matchTokenErrors = A2(
							$elm$core$List$filter,
							function (err) {
								var _v8 = err.col;
								if (_v8.$ === 'Just') {
									var col = _v8.a;
									return ((_Utils_cmp(col, token.index) > -1) && (_Utils_cmp(col, token.index + token.length) < 0)) || ((_Utils_cmp(
										col,
										$elm$core$String$length(contents)) > -1) && _Utils_eq(index, tokensLength));
								} else {
									return false;
								}
							},
							lineErrors);
						var _v4 = A2(
							$elm$core$Maybe$withDefault,
							_Utils_Tuple2(token._class, token.styles),
							A2(
								$elm$core$Maybe$map,
								function (symbol) {
									return _Utils_Tuple2(
										$author$project$Editor$Syntax$SymbolKind$kindToSymbolClass(symbol.kind),
										symbol.styles);
								},
								A2(
									$elm_community$list_extra$List$Extra$find,
									function (symbol) {
										return (_Utils_cmp(symbol.start, token.index) < 1) && (_Utils_cmp(
											A2(
												$elm$core$Maybe$withDefault,
												$elm$core$String$length(contents),
												symbol.end),
											token.index + token.length) > -1);
									},
									symbols)));
						var tokenClass = _v4.a;
						var tokenStyles = _v4.b;
						return _List_fromArray(
							[
								A2(
								$elm$html$Html$span,
								_Utils_ap(
									_List_fromArray(
										[
											$elm$html$Html$Attributes$class(tokenClass),
											$elm$html$Html$Attributes$classList(
											_List_fromArray(
												[
													_Utils_Tuple2(
													'error',
													$elm$core$List$length(matchTokenErrors) > 0)
												]))
										]),
									A2(
										$elm$core$List$map,
										function (_v5) {
											var k = _v5.a;
											var v = _v5.b;
											return A2($elm$html$Html$Attributes$style, k, v);
										},
										tokenStyles)),
								_List_fromArray(
									[
										$elm$html$Html$text(
										A3($elm$core$String$slice, token.index, token.index + token.length, contents)),
										function () {
										var _v6 = $elm$core$List$head(matchTokenErrors);
										if (_v6.$ === 'Nothing') {
											return $elm$html$Html$text('');
										} else {
											var error = _v6.a;
											return A2(
												$elm$html$Html$div,
												_List_fromArray(
													[
														$elm$html$Html$Attributes$class('message')
													]),
												function () {
													var _v7 = $hecrj$html_parser$Html$Parser$run(error.message);
													if (_v7.$ === 'Ok') {
														var parsedNodes = _v7.a;
														return $hecrj$html_parser$Html$Parser$Util$toVirtualDom(parsedNodes);
													} else {
														var err = _v7.a;
														return _List_Nil;
													}
												}());
										}
									}()
									]))
							]);
					}),
				filledInTokens));
	});
var $author$project$Editor$Syntax$Util$symbolsToTokens = F2(
	function (contents, symbols) {
		return A3(
			$elm$core$List$foldl,
			F2(
				function (_v0, acc) {
					var start = _v0.start;
					var end = _v0.end;
					var styles = _v0.styles;
					var len = $elm$core$String$length(
						A3(
							$elm$core$String$slice,
							start,
							function () {
								if (end.$ === 'Nothing') {
									return $elm$core$String$length(contents);
								} else {
									var e = end.a;
									return e;
								}
							}(),
							contents));
					if (!len) {
						return acc;
					} else {
						return _Utils_ap(
							acc,
							_List_fromArray(
								[
									{_class: '', index: start, length: len, styles: styles}
								]));
					}
				}),
			_List_Nil,
			symbols);
	});
var $elm$regex$Regex$find = _Regex_findAtMost(_Regex_infinity);
var $elm_community$list_extra$List$Extra$findIndexHelp = F3(
	function (index, predicate, list) {
		findIndexHelp:
		while (true) {
			if (!list.b) {
				return $elm$core$Maybe$Nothing;
			} else {
				var x = list.a;
				var xs = list.b;
				if (predicate(x)) {
					return $elm$core$Maybe$Just(index);
				} else {
					var $temp$index = index + 1,
						$temp$predicate = predicate,
						$temp$list = xs;
					index = $temp$index;
					predicate = $temp$predicate;
					list = $temp$list;
					continue findIndexHelp;
				}
			}
		}
	});
var $elm_community$list_extra$List$Extra$findIndex = $elm_community$list_extra$List$Extra$findIndexHelp(0);
var $author$project$Editor$Syntax$Util$positionToSyntaxToken = F2(
	function (_v0, syntax) {
		var position = _v0.a;
		var index = _v0.b;
		var matchLength = _v0.c;
		if (position.$ === 'Just') {
			var syntaxIndex = position.a;
			return $elm$core$Maybe$Just(
				{
					_class: A2(
						$elm$core$Maybe$withDefault,
						'',
						A2(
							$elm$core$Maybe$map,
							function ($) {
								return $._class;
							},
							A2($elm_community$list_extra$List$Extra$getAt, syntaxIndex, syntax))),
					index: index,
					length: matchLength,
					styles: _List_Nil
				});
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $author$project$Editor$Syntax$Util$tokenize = F2(
	function (text, syntaxMatches) {
		return A2(
			$elm$core$List$filterMap,
			$elm$core$Basics$identity,
			A2(
				$elm$core$List$map,
				function (match) {
					var matchTypeIndex = A2(
						$elm_community$list_extra$List$Extra$findIndex,
						function (is) {
							if (is.$ === 'Just') {
								return true;
							} else {
								return false;
							}
						},
						match.submatches);
					var firstSubmatch = A2(
						$elm$core$Maybe$withDefault,
						'',
						$elm$core$List$head(
							A2($elm$core$List$filterMap, $elm$core$Basics$identity, match.submatches)));
					return A2(
						$author$project$Editor$Syntax$Util$positionToSyntaxToken,
						_Utils_Tuple3(
							matchTypeIndex,
							match.index,
							$elm$core$String$length(firstSubmatch)),
						syntaxMatches);
				},
				A2(
					$elm$regex$Regex$find,
					A2(
						$elm$core$Maybe$withDefault,
						$elm$regex$Regex$never,
						$elm$regex$Regex$fromString(
							A2(
								$elm$core$String$join,
								'|',
								A2(
									$elm$core$List$map,
									function ($) {
										return $.regex;
									},
									syntaxMatches)))),
					text)));
	});
var $author$project$Editor$Syntax$Util$viewLine = F4(
	function (syntax, contents, symbols, errors) {
		if (syntax.$ === 'Nothing') {
			var _v1 = $elm$core$List$length(symbols);
			if (!_v1) {
				return A2(
					$elm$html$Html$div,
					_List_fromArray(
						[
							A2($elm$html$Html$Attributes$style, 'height', '1.5rem'),
							A2($elm$html$Html$Attributes$style, 'display', 'flex')
						]),
					_List_fromArray(
						[
							$elm$html$Html$text(contents)
						]));
			} else {
				return A2(
					$elm$html$Html$div,
					_List_fromArray(
						[
							A2($elm$html$Html$Attributes$style, 'height', '1.5rem'),
							A2($elm$html$Html$Attributes$style, 'display', 'flex')
						]),
					A4(
						$author$project$Editor$Syntax$Util$highlight,
						contents,
						symbols,
						_List_Nil,
						A2($author$project$Editor$Syntax$Util$symbolsToTokens, contents, symbols)));
			}
		} else {
			var s = syntax.a;
			var fullLineErrors = A2(
				$elm$core$List$filter,
				function (error) {
					return _Utils_eq(error.col, $elm$core$Maybe$Nothing);
				},
				errors);
			var fullLineError = function () {
				var _v2 = $elm$core$List$head(fullLineErrors);
				if (_v2.$ === 'Nothing') {
					return $elm$core$Maybe$Nothing;
				} else {
					var error = _v2.a;
					return $elm$core$Maybe$Just(
						A2(
							$elm$html$Html$div,
							_List_fromArray(
								[
									$elm$html$Html$Attributes$class('message')
								]),
							_List_fromArray(
								[
									$elm$html$Html$text(error.message)
								])));
				}
			}();
			return A2(
				$elm$html$Html$div,
				_List_fromArray(
					[
						$elm$html$Html$Attributes$classList(
						_List_fromArray(
							[
								_Utils_Tuple2(
								'error',
								!_Utils_eq(fullLineError, $elm$core$Maybe$Nothing))
							]))
					]),
				A2(
					$elm$core$List$cons,
					A2(
						$elm$core$Maybe$withDefault,
						$elm$html$Html$text(''),
						fullLineError),
					A4(
						$author$project$Editor$Syntax$Util$highlight,
						contents,
						symbols,
						errors,
						A2($author$project$Editor$Syntax$Util$tokenize, contents, s))));
		}
	});
var $author$project$Editor$viewLine = F4(
	function (config, syntax, lineNumber, renderableLine) {
		return A2(
			$elm$html$Html$div,
			_List_fromArray(
				[
					A2(
					$elm$html$Html$Attributes$style,
					'height',
					$elm$core$String$fromInt($author$project$Editor$Constants$lineHeight) + 'px'),
					A2($elm$html$Html$Attributes$style, 'min-width', 'fit-content'),
					A2(
					$elm$html$Html$Attributes$style,
					'padding-right',
					config.padRight ? '250px' : ''),
					A3($author$project$Editor$Lib$mouseEventToEditorPosition, 'click', $author$project$Editor$Msg$MouseClick, lineNumber),
					A3($author$project$Editor$Lib$mouseEventToEditorPosition, 'mousedown', $author$project$Editor$Msg$MouseDown, lineNumber),
					A3($author$project$Editor$Lib$mouseEventToEditorPosition, 'mousemove', $author$project$Editor$Msg$MouseMove, lineNumber),
					A3($author$project$Editor$Lib$mouseEventToEditorPosition, 'mouseup', $author$project$Editor$Msg$MouseUp, lineNumber)
				]),
			_List_fromArray(
				[
					A5($elm$html$Html$Lazy$lazy4, $author$project$Editor$Syntax$Util$viewLine, syntax, renderableLine.text, renderableLine.multilineSymbols, renderableLine.errors)
				]));
	});
var $author$project$Editor$viewKeyedLine = F4(
	function (config, syntax, lineNumber, renderableLine) {
		return _Utils_Tuple2(
			renderableLine.key,
			A5($elm$html$Html$Lazy$lazy4, $author$project$Editor$viewLine, config, syntax, lineNumber, renderableLine));
	});
var $author$project$Editor$viewRendered = F3(
	function (config, syntax, renderableLines) {
		return A3(
			$elm$html$Html$Keyed$node,
			'div',
			_Utils_ap(
				_List_fromArray(
					[
						$author$project$Editor$onScrollX($author$project$Editor$Msg$RenderedScroll),
						$elm$html$Html$Attributes$id('editor-rendered'),
						A2(
						$elm$html$Html$Attributes$style,
						'width',
						'calc(100% - ' + ($elm$core$String$fromFloat(
							$author$project$Editor$Lib$getEditorLineNumbersWidth(
								$elm$core$List$length(renderableLines))) + 'px'))
					]),
				$author$project$Editor$Styles$renderedStyles(config)),
			A2(
				$elm$core$List$indexedMap,
				A2($author$project$Editor$viewKeyedLine, config, syntax),
				renderableLines));
	});
var $author$project$Editor$viewEditor = function (model) {
	var _v0 = model.travelable.cursorPosition;
	var x = _v0.x;
	var y = _v0.y;
	return A2(
		$elm$html$Html$div,
		_Utils_ap(
			_List_fromArray(
				[
					$elm$html$Html$Attributes$class('editor'),
					$elm$html$Html$Attributes$id('editor'),
					$elm$html$Html$Attributes$classList(
					_List_fromArray(
						[
							_Utils_Tuple2(
							'mode--normal',
							_Utils_eq(model.mode, $author$project$Editor$Msg$Normal)),
							_Utils_Tuple2(
							'mode--insert',
							_Utils_eq(model.mode, $author$project$Editor$Msg$Insert))
						])),
					A2(
					$elm$html$Html$Attributes$style,
					'min-height',
					$elm$core$String$fromInt(
						$author$project$Editor$Constants$lineHeight * $elm$core$List$length(model.travelable.renderableLines)) + 'px')
				]),
			A2(
				$author$project$Editor$Styles$editorStyles,
				model.config,
				$author$project$Editor$Lib$getEditorLineNumbersWidth(
					$elm$core$List$length(model.travelable.renderableLines)))),
		_List_fromArray(
			[
				A3(
				$elm$html$Html$node,
				'style',
				_List_Nil,
				_List_fromArray(
					[
						$elm$html$Html$text($author$project$Editor$Styles$editorPseudoStyles)
					])),
				A4($elm$html$Html$Lazy$lazy3, $author$project$Editor$viewRendered, model.config, model.syntax, model.travelable.renderableLines),
				A5(
				$elm$html$Html$Lazy$lazy4,
				$author$project$Editor$Lib$renderCursor,
				model.config,
				model.travelable.cursorPosition,
				model.travelable.scrollLeft,
				function () {
					var _v1 = $elm$core$List$length(model.completions) > 0;
					if (_v1) {
						return A2($author$project$Editor$Lib$renderCompletions, model.selectedCompletionIndex, model.completions);
					} else {
						return $elm$html$Html$text('');
					}
				}()),
				A3($elm$html$Html$Lazy$lazy2, $author$project$Editor$Lib$renderSelection, model.selection, model.travelable.scrollLeft)
			]));
};
var $author$project$Editor$Styles$editorLineNumbersStyles = function (config) {
	return _List_fromArray(
		[
			A2($elm$html$Html$Attributes$style, 'color', 'rgba(255, 255, 255, 0.25)'),
			function () {
			var _v0 = config.padBottom;
			if (_v0) {
				return A2($elm$html$Html$Attributes$style, 'padding-bottom', '250px');
			} else {
				return A2($elm$html$Html$Attributes$style, 'padding-bottom', '0');
			}
		}(),
			A2($elm$html$Html$Attributes$style, 'min-height', '100%'),
			A2($elm$html$Html$Attributes$style, 'height', 'fit-content'),
			A2(
			$elm$html$Html$Attributes$style,
			'margin-right',
			$elm$core$String$fromFloat($author$project$Editor$Constants$lineNumbersRightMargin) + 'px'),
			A2($elm$html$Html$Attributes$style, 'min-width', '40px'),
			A2($elm$html$Html$Attributes$style, 'text-align', 'center'),
			A2($elm$html$Html$Attributes$style, 'background', '#333333'),
			A2($elm$html$Html$Attributes$style, 'z-index', '1')
		]);
};
var $author$project$Editor$viewLineNumbers = F2(
	function (config, renderableLines) {
		var numberOfLines = $elm$core$List$length(renderableLines);
		return A2(
			$elm$html$Html$div,
			_Utils_ap(
				_List_fromArray(
					[
						A2(
						$elm$html$Html$Attributes$style,
						'width',
						$elm$core$String$fromFloat(
							$author$project$Editor$Lib$getEditorLineNumbersWidth(numberOfLines)) + 'px')
					]),
				$author$project$Editor$Styles$editorLineNumbersStyles(config)),
			A2(
				$elm$core$List$map,
				function (index) {
					return A2(
						$elm$html$Html$div,
						_List_Nil,
						_List_fromArray(
							[
								$elm$html$Html$text(
								$elm$core$String$fromInt(index))
							]));
				},
				A2($elm$core$List$range, 1, numberOfLines)));
	});
var $author$project$Editor$view = function (model) {
	return A2(
		$elm$html$Html$div,
		_Utils_ap(
			_List_fromArray(
				[
					$author$project$Editor$onScrollY($author$project$Editor$Msg$ContainerScroll),
					$elm$html$Html$Attributes$id('editor-container')
				]),
			$author$project$Editor$Styles$editorContainerStyles(model.active)),
		_List_fromArray(
			[
				function () {
				var _v0 = model.config.showLineNumbers;
				if (_v0) {
					return A3($elm$html$Html$Lazy$lazy2, $author$project$Editor$viewLineNumbers, model.config, model.travelable.renderableLines);
				} else {
					return $elm$html$Html$text('');
				}
			}(),
				A2($elm$html$Html$Lazy$lazy, $author$project$Editor$viewEditor, model)
			]));
};
var $author$project$Terminal$viewScrollback = function (terminal) {
	var _v0 = terminal.activeBuffer;
	if (_v0.$ === 'Primary') {
		var buffer = terminal.primaryBuffer;
		var _v1 = $elm$core$List$length(terminal.scrollback.travelable.renderableLines);
		if (!_v1) {
			return $elm$html$Html$text('');
		} else {
			return A2(
				$elm$html$Html$div,
				_List_fromArray(
					[
						A2($elm$html$Html$Attributes$style, 'height', 'min-content')
					]),
				_List_fromArray(
					[
						A2(
						$elm$html$Html$map,
						$elm$core$Basics$always($author$project$Terminal$Types$NoOp),
						$author$project$Editor$view(terminal.scrollback))
					]));
		}
	} else {
		return $elm$html$Html$text('');
	}
};
var $author$project$Terminal$view = function (model) {
	return A2(
		$elm$html$Html$div,
		_List_fromArray(
			[
				$elm$html$Html$Attributes$class('overflow-hidden')
			]),
		_List_fromArray(
			[
				A2(
				$elm$html$Html$div,
				_List_fromArray(
					[
						$elm$html$Html$Attributes$id('terminal-container'),
						$elm$html$Html$Attributes$class('w-full h-full overflow-y-scroll p-1')
					]),
				_List_fromArray(
					[
						$author$project$Terminal$viewScrollback(model.terminal),
						A2(
						$elm$html$Html$map,
						$author$project$Terminal$Types$TerminalEditorMsg,
						A2(
							$elm$html$Html$div,
							_List_fromArray(
								[
									$elm$html$Html$Attributes$id('terminal')
								]),
							_List_fromArray(
								[
									$author$project$Editor$view(
									$author$project$Terminal$getBuffer(model.terminal).a)
								])))
					]))
			]));
};
var $author$project$Main$view = function (model) {
	return A2(
		$elm$html$Html$div,
		_List_fromArray(
			[
				$elm$html$Html$Attributes$class('w-full h-full')
			]),
		_List_fromArray(
			[
				A2(
				$elm$html$Html$map,
				$author$project$Msg$TerminalMsg,
				$author$project$Terminal$view(model.terminal))
			]));
};
var $author$project$Main$main = $elm$browser$Browser$element(
	{init: $author$project$Main$init, subscriptions: $author$project$Main$subscriptions, update: $author$project$Main$update, view: $author$project$Main$view});
_Platform_export({'Main':{'init':$author$project$Main$main(
	$elm$json$Json$Decode$succeed(
		{}))(0)}});}(this));