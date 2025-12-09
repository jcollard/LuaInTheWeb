#!/usr/bin/env node
/**
 * Simple jq-like JSON filter for use in shell pipelines
 * Usage: echo '{"a":1}' | node scripts/jq.js '.a'
 *        node scripts/jq.js '.items[0].name' < file.json
 */

const filter = process.argv[2] || '.'

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input)
    const result = evalFilter(data, filter)
    if (result !== undefined) {
      console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(`Error: ${e.message}`)
    process.exit(1)
  }
})

function evalFilter(data, filter) {
  if (filter === '.') return data

  // Handle pipe with select: .items[] | select(.content.number == 34)
  const pipeSelectMatch = filter.match(/^(.+?\[\])\s*\|\s*select\((.+)\)$/)
  if (pipeSelectMatch) {
    const [, arrayPath, condition] = pipeSelectMatch
    const array = evalFilter(data, arrayPath)
    if (!Array.isArray(array)) return undefined
    const filtered = array.filter((item) => evalCondition(item, condition))
    return filtered.length === 1 ? filtered[0] : filtered
  }

  // Handle array iteration: .items[]
  if (filter.endsWith('[]')) {
    const path = filter.slice(0, -2)
    const array = path === '' ? data : evalPath(data, path)
    return Array.isArray(array) ? array : undefined
  }

  // Handle pipe: .items[] | .name
  if (filter.includes(' | ')) {
    const [first, ...rest] = filter.split(' | ')
    let result = evalFilter(data, first)
    for (const f of rest) {
      if (Array.isArray(result)) {
        result = result.map((item) => evalFilter(item, f)).filter((x) => x !== undefined)
      } else {
        result = evalFilter(result, f)
      }
    }
    return result
  }

  return evalPath(data, filter)
}

function evalPath(data, path) {
  if (!path.startsWith('.')) return undefined
  const parts = path
    .slice(1)
    .split(/\.|\[/)
    .filter(Boolean)

  let current = data
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    const key = part.endsWith(']') ? parseInt(part.slice(0, -1), 10) : part
    current = current[key]
  }
  return current
}

function evalCondition(item, condition) {
  // Handle .field == value
  const eqMatch = condition.match(/^(.+?)\s*==\s*(.+)$/)
  if (eqMatch) {
    const [, path, valueStr] = eqMatch
    const actual = evalPath(item, path)
    const expected = JSON.parse(valueStr)
    return actual === expected
  }
  return false
}
