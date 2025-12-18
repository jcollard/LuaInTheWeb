# Math Library

Mathematical functions and constants.

## Constants

```lua
print(math.pi)        -- 3.1415926535898
print(math.huge)      -- inf (infinity)
print(math.maxinteger) -- 9223372036854775807
print(math.mininteger) -- -9223372036854775808
```

## Rounding

### math.floor(x)

Rounds down to the nearest integer.

```lua
print(math.floor(3.7))   -- 3
print(math.floor(-3.7))  -- -4
```

### math.ceil(x)

Rounds up to the nearest integer.

```lua
print(math.ceil(3.2))   -- 4
print(math.ceil(-3.2))  -- -3
```

### math.modf(x)

Returns integer and fractional parts.

```lua
local int, frac = math.modf(3.7)
print(int, frac)  -- 3, 0.7
```

## Absolute and Sign

### math.abs(x)

Returns the absolute value.

```lua
print(math.abs(-5))   -- 5
print(math.abs(5))    -- 5
```

## Min and Max

### math.min(...)

Returns the minimum value.

```lua
print(math.min(3, 1, 4, 1, 5))  -- 1
```

### math.max(...)

Returns the maximum value.

```lua
print(math.max(3, 1, 4, 1, 5))  -- 5
```

## Powers and Roots

### math.sqrt(x)

Returns the square root.

```lua
print(math.sqrt(16))  -- 4.0
print(math.sqrt(2))   -- 1.4142135623731
```

### math.pow(x, y) / x^y

Returns x raised to the power y.

```lua
print(math.pow(2, 10))  -- 1024
print(2^10)             -- 1024
```

### math.exp(x)

Returns e^x.

```lua
print(math.exp(1))  -- 2.718281828...
```

### math.log(x, [base])

Returns the logarithm.

```lua
print(math.log(math.exp(1)))  -- 1 (natural log)
print(math.log(100, 10))      -- 2 (log base 10)
print(math.log(8, 2))         -- 3 (log base 2)
```

## Trigonometry

All angles are in radians.

### math.sin(x), math.cos(x), math.tan(x)

Trigonometric functions.

```lua
print(math.sin(0))           -- 0
print(math.cos(0))           -- 1
print(math.sin(math.pi/2))   -- 1
```

### math.asin(x), math.acos(x), math.atan(y, [x])

Inverse trigonometric functions.

```lua
print(math.asin(1))  -- 1.5707963... (pi/2)
print(math.atan(1, 1))  -- 0.7853981... (pi/4)
```

### math.rad(deg), math.deg(rad)

Convert between degrees and radians.

```lua
print(math.rad(180))  -- 3.1415926... (pi)
print(math.deg(math.pi))  -- 180
```

## Random Numbers

### math.random([m], [n])

Generates random numbers.

```lua
print(math.random())       -- Random float 0 to 1
print(math.random(10))     -- Random integer 1 to 10
print(math.random(5, 10))  -- Random integer 5 to 10
```

### math.randomseed(x)

Sets the random seed.

```lua
math.randomseed(os.time())  -- Seed with current time
```

## Integer Operations

### math.tointeger(x)

Converts to integer if possible.

```lua
print(math.tointeger(3.0))  -- 3
print(math.tointeger(3.5))  -- nil
print(math.tointeger("42")) -- 42
```

### math.type(x)

Returns "integer", "float", or nil.

```lua
print(math.type(3))    -- "integer"
print(math.type(3.0))  -- "float"
print(math.type("3"))  -- nil
```

### math.ult(m, n)

Unsigned integer comparison.

## Floating Point

### math.fmod(x, y)

Returns the remainder of x/y.

```lua
print(math.fmod(10, 3))  -- 1
```

## Common Patterns

### Clamping a value

```lua
local function clamp(value, min, max)
  return math.max(min, math.min(max, value))
end

print(clamp(15, 0, 10))  -- 10
print(clamp(-5, 0, 10))  -- 0
print(clamp(5, 0, 10))   -- 5
```

### Linear interpolation

```lua
local function lerp(a, b, t)
  return a + (b - a) * t
end

print(lerp(0, 100, 0.5))  -- 50
```

### Distance between points

```lua
local function distance(x1, y1, x2, y2)
  return math.sqrt((x2-x1)^2 + (y2-y1)^2)
end

print(distance(0, 0, 3, 4))  -- 5
```
