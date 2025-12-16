/**
 * Lua 5.4 Standard Library Documentation Data
 * Documentation derived from the official Lua 5.4 Reference Manual
 */

import type { LuaDocEntry } from './luaStandardLibrary'

export const luaGlobalFunctions: Record<string, LuaDocEntry> = {
  print: {
    name: 'print',
    signature: 'print(···)',
    description:
      'Receives any number of arguments and prints their values to stdout, converting each argument to a string following the same rules of tostring.',
  },
  type: {
    name: 'type',
    signature: 'type(v)',
    description:
      'Returns the type of its only argument, coded as a string. The possible results are "nil", "number", "string", "boolean", "table", "function", "thread", and "userdata".',
  },
  tonumber: {
    name: 'tonumber',
    signature: 'tonumber(e [, base])',
    description:
      'When called with no base, tonumber tries to convert its argument to a number. If the argument is already a number or a string convertible to a number, then tonumber returns this number; otherwise, it returns fail.',
  },
  tostring: {
    name: 'tostring',
    signature: 'tostring(v)',
    description: 'Receives a value of any type and converts it to a string in a human-readable format.',
  },
  pairs: {
    name: 'pairs',
    signature: 'pairs(t)',
    description:
      'If t has a metamethod __pairs, calls it with t as argument and returns the first three results from the call. Otherwise, returns three values: the next function, the table t, and nil.',
  },
  ipairs: {
    name: 'ipairs',
    signature: 'ipairs(t)',
    description:
      'Returns three values (an iterator function, the table t, and 0) so that the construction `for i,v in ipairs(t) do body end` will iterate over the key–value pairs (1,t[1]), (2,t[2]), ..., up to the first absent index.',
  },
  next: {
    name: 'next',
    signature: 'next(table [, index])',
    description:
      'Allows a program to traverse all fields of a table. Its first argument is a table and its second argument is an index in this table.',
  },
  select: {
    name: 'select',
    signature: 'select(index, ···)',
    description:
      "If index is a number, returns all arguments after argument number index; a negative number indexes from the end. Otherwise, index must be the string '#'.",
  },
  assert: {
    name: 'assert',
    signature: 'assert(v [, message])',
    description:
      'Raises an error if the value of its argument v is false (i.e., nil or false); otherwise, returns all its arguments.',
  },
  error: {
    name: 'error',
    signature: 'error(message [, level])',
    description:
      'Raises an error with message as the error object. This function never returns.',
  },
  pcall: {
    name: 'pcall',
    signature: 'pcall(f [, arg1, ···])',
    description:
      'Calls the function f with the given arguments in protected mode. Any error inside f is not propagated; instead, pcall catches the error and returns a status code.',
  },
  xpcall: {
    name: 'xpcall',
    signature: 'xpcall(f, msgh [, arg1, ···])',
    description:
      'Similar to pcall, but sets a new message handler msgh. Any error inside f is not propagated; instead, xpcall catches the error and calls the msgh function.',
  },
  setmetatable: {
    name: 'setmetatable',
    signature: 'setmetatable(table, metatable)',
    description:
      'Sets the metatable for the given table. If metatable is nil, removes the metatable of the given table.',
  },
  getmetatable: {
    name: 'getmetatable',
    signature: 'getmetatable(object)',
    description:
      "If object does not have a metatable, returns nil. Otherwise, if the object's metatable has a __metatable field, returns the associated value.",
  },
  rawequal: {
    name: 'rawequal',
    signature: 'rawequal(v1, v2)',
    description: 'Checks whether v1 is equal to v2, without invoking the __eq metamethod. Returns a boolean.',
  },
  rawget: {
    name: 'rawget',
    signature: 'rawget(table, index)',
    description: 'Gets the real value of table[index], without invoking the __index metamethod.',
  },
  rawset: {
    name: 'rawset',
    signature: 'rawset(table, index, value)',
    description: 'Sets the real value of table[index] to value, without invoking the __newindex metamethod.',
  },
  rawlen: {
    name: 'rawlen',
    signature: 'rawlen(v)',
    description: 'Returns the length of the object v, which must be a table or a string, without invoking the __len metamethod.',
  },
  require: {
    name: 'require',
    signature: 'require(modname)',
    description: 'Loads the given module. The function starts by looking into the package.loaded table to determine whether modname is already loaded.',
  },
  load: {
    name: 'load',
    signature: 'load(chunk [, chunkname [, mode [, env]]])',
    description: 'Loads a chunk. If chunk is a string, the chunk is this string. If chunk is a function, load calls it repeatedly to get the chunk pieces.',
  },
  loadfile: {
    name: 'loadfile',
    signature: 'loadfile([filename [, mode [, env]]])',
    description: 'Similar to load, but gets the chunk from file filename or from the standard input.',
  },
  dofile: {
    name: 'dofile',
    signature: 'dofile([filename])',
    description: 'Opens the named file and executes its content as a Lua chunk.',
  },
  collectgarbage: {
    name: 'collectgarbage',
    signature: 'collectgarbage([opt [, arg]])',
    description: 'This function is a generic interface to the garbage collector.',
  },
}

export const stringLibrary: Record<string, LuaDocEntry> = {
  'string.byte': { name: 'string.byte', signature: 'string.byte(s [, i [, j]])', description: 'Returns the internal numeric codes of the characters s[i], s[i+1], ..., s[j].', library: 'string' },
  'string.char': { name: 'string.char', signature: 'string.char(···)', description: 'Receives zero or more integers. Returns a string with length equal to the number of arguments.', library: 'string' },
  'string.dump': { name: 'string.dump', signature: 'string.dump(function [, strip])', description: 'Returns a string containing a binary representation of the given function.', library: 'string' },
  'string.find': { name: 'string.find', signature: 'string.find(s, pattern [, init [, plain]])', description: 'Looks for the first match of pattern in the string s.', library: 'string' },
  'string.format': { name: 'string.format', signature: 'string.format(formatstring, ···)', description: 'Returns a formatted version of its variable number of arguments following the description given in its first argument.', library: 'string' },
  'string.gmatch': { name: 'string.gmatch', signature: 'string.gmatch(s, pattern [, init])', description: 'Returns an iterator function that, each time it is called, returns the next captures from pattern over the string s.', library: 'string' },
  'string.gsub': { name: 'string.gsub', signature: 'string.gsub(s, pattern, repl [, n])', description: 'Returns a copy of s in which all (or the first n) occurrences of the pattern have been replaced.', library: 'string' },
  'string.len': { name: 'string.len', signature: 'string.len(s)', description: 'Returns the length of a string. The empty string "" has length 0.', library: 'string' },
  'string.lower': { name: 'string.lower', signature: 'string.lower(s)', description: 'Returns a copy of this string with all uppercase letters changed to lowercase.', library: 'string' },
  'string.match': { name: 'string.match', signature: 'string.match(s, pattern [, init])', description: 'Looks for the first match of pattern in the string s. If it finds one, then match returns the captures.', library: 'string' },
  'string.pack': { name: 'string.pack', signature: 'string.pack(fmt, v1, v2, ···)', description: 'Returns a binary string containing the values serialized in binary form according to the format string fmt.', library: 'string' },
  'string.packsize': { name: 'string.packsize', signature: 'string.packsize(fmt)', description: 'Returns the size of a string resulting from string.pack with the given format.', library: 'string' },
  'string.rep': { name: 'string.rep', signature: 'string.rep(s, n [, sep])', description: 'Returns a string that is the concatenation of n copies of the string s separated by sep.', library: 'string' },
  'string.reverse': { name: 'string.reverse', signature: 'string.reverse(s)', description: 'Returns a string that is the string s reversed.', library: 'string' },
  'string.sub': { name: 'string.sub', signature: 'string.sub(s, i [, j])', description: 'Returns the substring of s that starts at i and continues until j; i and j can be negative.', library: 'string' },
  'string.unpack': { name: 'string.unpack', signature: 'string.unpack(fmt, s [, pos])', description: 'Returns the values packed in string s according to the format string fmt.', library: 'string' },
  'string.upper': { name: 'string.upper', signature: 'string.upper(s)', description: 'Returns a copy of this string with all lowercase letters changed to uppercase.', library: 'string' },
}

export const tableLibrary: Record<string, LuaDocEntry> = {
  'table.concat': { name: 'table.concat', signature: 'table.concat(list [, sep [, i [, j]]])', description: 'Given a list where all elements are strings or numbers, returns the concatenated string.', library: 'table' },
  'table.insert': { name: 'table.insert', signature: 'table.insert(list, [pos,] value)', description: 'Inserts element value at position pos in list, shifting up the elements.', library: 'table' },
  'table.move': { name: 'table.move', signature: 'table.move(a1, f, e, t [,a2])', description: 'Moves elements from table a1 to table a2.', library: 'table' },
  'table.pack': { name: 'table.pack', signature: 'table.pack(···)', description: 'Returns a new table with all arguments stored into keys 1, 2, etc. and with a field "n" with the total number.', library: 'table' },
  'table.remove': { name: 'table.remove', signature: 'table.remove(list [, pos])', description: 'Removes from list the element at position pos, returning the value of the removed element.', library: 'table' },
  'table.sort': { name: 'table.sort', signature: 'table.sort(list [, comp])', description: 'Sorts list elements in a given order, in-place, from list[1] to list[#list].', library: 'table' },
  'table.unpack': { name: 'table.unpack', signature: 'table.unpack(list [, i [, j]])', description: 'Returns the elements from the given list.', library: 'table' },
}

export const mathLibrary: Record<string, LuaDocEntry> = {
  'math.abs': { name: 'math.abs', signature: 'math.abs(x)', description: 'Returns the absolute value of x.', library: 'math' },
  'math.acos': { name: 'math.acos', signature: 'math.acos(x)', description: 'Returns the arc cosine of x (in radians).', library: 'math' },
  'math.asin': { name: 'math.asin', signature: 'math.asin(x)', description: 'Returns the arc sine of x (in radians).', library: 'math' },
  'math.atan': { name: 'math.atan', signature: 'math.atan(y [, x])', description: 'Returns the arc tangent of y/x (in radians).', library: 'math' },
  'math.ceil': { name: 'math.ceil', signature: 'math.ceil(x)', description: 'Returns the smallest integral value greater than or equal to x.', library: 'math' },
  'math.cos': { name: 'math.cos', signature: 'math.cos(x)', description: 'Returns the cosine of x (assumed to be in radians).', library: 'math' },
  'math.deg': { name: 'math.deg', signature: 'math.deg(x)', description: 'Converts the angle x from radians to degrees.', library: 'math' },
  'math.exp': { name: 'math.exp', signature: 'math.exp(x)', description: 'Returns the value e^x.', library: 'math' },
  'math.floor': { name: 'math.floor', signature: 'math.floor(x)', description: 'Returns the largest integral value less than or equal to x.', library: 'math' },
  'math.fmod': { name: 'math.fmod', signature: 'math.fmod(x, y)', description: 'Returns the remainder of the division of x by y.', library: 'math' },
  'math.huge': { name: 'math.huge', signature: 'math.huge', description: 'A value greater than any other numeric value. Represents positive infinity.', library: 'math' },
  'math.log': { name: 'math.log', signature: 'math.log(x [, base])', description: 'Returns the logarithm of x in the given base. The default for base is e.', library: 'math' },
  'math.max': { name: 'math.max', signature: 'math.max(x, ···)', description: 'Returns the argument with the maximum value.', library: 'math' },
  'math.maxinteger': { name: 'math.maxinteger', signature: 'math.maxinteger', description: 'An integer with the maximum value for an integer.', library: 'math' },
  'math.min': { name: 'math.min', signature: 'math.min(x, ···)', description: 'Returns the argument with the minimum value.', library: 'math' },
  'math.mininteger': { name: 'math.mininteger', signature: 'math.mininteger', description: 'An integer with the minimum value for an integer.', library: 'math' },
  'math.modf': { name: 'math.modf', signature: 'math.modf(x)', description: 'Returns the integral part of x and the fractional part of x.', library: 'math' },
  'math.pi': { name: 'math.pi', signature: 'math.pi', description: 'The value of π.', library: 'math' },
  'math.rad': { name: 'math.rad', signature: 'math.rad(x)', description: 'Converts the angle x from degrees to radians.', library: 'math' },
  'math.random': { name: 'math.random', signature: 'math.random([m [, n]])', description: 'When called without arguments, returns a pseudo-random float in the range [0,1).', library: 'math' },
  'math.randomseed': { name: 'math.randomseed', signature: 'math.randomseed([x [, y]])', description: 'Reinitializes the pseudo-random generator with the given seed.', library: 'math' },
  'math.sin': { name: 'math.sin', signature: 'math.sin(x)', description: 'Returns the sine of x (assumed to be in radians).', library: 'math' },
  'math.sqrt': { name: 'math.sqrt', signature: 'math.sqrt(x)', description: 'Returns the square root of x.', library: 'math' },
  'math.tan': { name: 'math.tan', signature: 'math.tan(x)', description: 'Returns the tangent of x (assumed to be in radians).', library: 'math' },
  'math.tointeger': { name: 'math.tointeger', signature: 'math.tointeger(x)', description: 'If the value x is convertible to an integer, returns that integer.', library: 'math' },
  'math.type': { name: 'math.type', signature: 'math.type(x)', description: 'Returns "integer" if x is an integer, "float" if it is a float, or fail if x is not a number.', library: 'math' },
  'math.ult': { name: 'math.ult', signature: 'math.ult(m, n)', description: 'Returns a boolean, true if and only if integer m is below integer n when compared as unsigned integers.', library: 'math' },
}
