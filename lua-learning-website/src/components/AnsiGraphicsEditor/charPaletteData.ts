export interface CharEntry {
  char: string
  name: string
}

export interface CharCategory {
  id: string
  label: string
  chars: CharEntry[]
}

function entry(char: string, name: string): CharEntry {
  return { char, name }
}

export const CHAR_PALETTE_CATEGORIES: CharCategory[] = [
  {
    id: 'ascii',
    label: 'ASCII',
    chars: [
      entry('!', 'Exclamation Mark'), entry('"', 'Quotation Mark'), entry('#', 'Number Sign'),
      entry('$', 'Dollar Sign'), entry('%', 'Percent Sign'), entry('&', 'Ampersand'),
      entry("'", 'Apostrophe'), entry('(', 'Left Parenthesis'), entry(')', 'Right Parenthesis'),
      entry('*', 'Asterisk'), entry('+', 'Plus Sign'), entry(',', 'Comma'),
      entry('-', 'Hyphen-Minus'), entry('.', 'Full Stop'), entry('/', 'Solidus'),
      entry(':', 'Colon'), entry(';', 'Semicolon'), entry('<', 'Less-Than Sign'),
      entry('=', 'Equals Sign'), entry('>', 'Greater-Than Sign'), entry('?', 'Question Mark'),
      entry('@', 'Commercial At'), entry('[', 'Left Square Bracket'), entry('\\', 'Reverse Solidus'),
      entry(']', 'Right Square Bracket'), entry('^', 'Circumflex Accent'), entry('_', 'Low Line'),
      entry('`', 'Grave Accent'), entry('{', 'Left Curly Bracket'), entry('|', 'Vertical Line'),
      entry('}', 'Right Curly Bracket'), entry('~', 'Tilde'),
    ],
  },
  {
    id: 'blocks',
    label: 'Blocks',
    chars: [
      // Shading
      entry('░', 'Light Shade'), entry('▒', 'Medium Shade'), entry('▓', 'Dark Shade'), entry('█', 'Full Block'),
      // Upper / lower fills
      entry('▔', 'Upper One Eighth'), entry('▀', 'Upper Half'),
      entry('▁', 'Lower One Eighth'), entry('▂', 'Lower One Quarter'), entry('▃', 'Lower Three Eighths'),
      entry('▄', 'Lower Half'), entry('▅', 'Lower Five Eighths'), entry('▆', 'Lower Three Quarters'),
      entry('▇', 'Lower Seven Eighths'),
      // Left / right fills
      entry('▏', 'Left One Eighth'), entry('▎', 'Left One Quarter'), entry('▍', 'Left Three Eighths'),
      entry('▌', 'Left Half'), entry('▋', 'Left Five Eighths'), entry('▊', 'Left Three Quarters'),
      entry('▉', 'Left Seven Eighths'),
      entry('▕', 'Right One Eighth'), entry('▐', 'Right Half'),
      // Quadrants
      entry('▘', 'Quadrant Upper Left'), entry('▝', 'Quadrant Upper Right'),
      entry('▖', 'Quadrant Lower Left'), entry('▗', 'Quadrant Lower Right'),
      entry('▚', 'Quadrant Diagonal'), entry('▞', 'Quadrant Anti-Diagonal'),
      entry('▙', 'Quadrant Three Upper-Left'), entry('▛', 'Quadrant Three Upper-Right'),
      entry('▜', 'Quadrant Three Lower-Right'), entry('▟', 'Quadrant Three Lower-Left'),
    ],
  },
  {
    id: 'borders',
    label: 'Borders',
    chars: [
      // Light single
      entry('─', 'Light Horizontal'), entry('│', 'Light Vertical'),
      entry('┌', 'Light Down Right'), entry('┐', 'Light Down Left'),
      entry('└', 'Light Up Right'), entry('┘', 'Light Up Left'),
      entry('├', 'Light Vertical Right'), entry('┤', 'Light Vertical Left'),
      entry('┬', 'Light Down Horizontal'), entry('┴', 'Light Up Horizontal'),
      entry('┼', 'Light Cross'),
      // Heavy single
      entry('━', 'Heavy Horizontal'), entry('┃', 'Heavy Vertical'),
      entry('┏', 'Heavy Down Right'), entry('┓', 'Heavy Down Left'),
      entry('┗', 'Heavy Up Right'), entry('┛', 'Heavy Up Left'),
      entry('┣', 'Heavy Vertical Right'), entry('┫', 'Heavy Vertical Left'),
      entry('┳', 'Heavy Down Horizontal'), entry('┻', 'Heavy Up Horizontal'),
      entry('╋', 'Heavy Cross'),
      // Rounded corners
      entry('╭', 'Arc Down Right'), entry('╮', 'Arc Down Left'),
      entry('╰', 'Arc Up Right'), entry('╯', 'Arc Up Left'),
      // Double
      entry('═', 'Double Horizontal'), entry('║', 'Double Vertical'),
      entry('╔', 'Double Down Right'), entry('╗', 'Double Down Left'),
      entry('╚', 'Double Up Right'), entry('╝', 'Double Up Left'),
      entry('╠', 'Double Vertical Right'), entry('╣', 'Double Vertical Left'),
      entry('╦', 'Double Down Horizontal'), entry('╩', 'Double Up Horizontal'),
      entry('╬', 'Double Cross'),
      // Mixed: single vertical / double horizontal
      entry('╒', 'Down Single Right Double'), entry('╕', 'Down Single Left Double'),
      entry('╘', 'Up Single Right Double'), entry('╛', 'Up Single Left Double'),
      entry('╞', 'Vertical Single Right Double'), entry('╡', 'Vertical Single Left Double'),
      entry('╥', 'Down Single Horizontal Double'), entry('╨', 'Up Single Horizontal Double'),
      entry('╪', 'Single Vertical Double Horizontal Cross'),
      // Mixed: double vertical / single horizontal
      entry('╓', 'Down Double Right Single'), entry('╖', 'Down Double Left Single'),
      entry('╙', 'Up Double Right Single'), entry('╜', 'Up Double Left Single'),
      entry('╟', 'Vertical Double Right Single'), entry('╢', 'Vertical Double Left Single'),
      entry('╤', 'Down Double Horizontal Single'), entry('╧', 'Up Double Horizontal Single'),
      entry('╫', 'Double Vertical Single Horizontal Cross'),
      // Dashed lines
      entry('┄', 'Light Triple Dash Horizontal'), entry('┅', 'Heavy Triple Dash Horizontal'),
      entry('┆', 'Light Triple Dash Vertical'), entry('┇', 'Heavy Triple Dash Vertical'),
      entry('┈', 'Light Quadruple Dash Horizontal'), entry('┉', 'Heavy Quadruple Dash Horizontal'),
      entry('┊', 'Light Quadruple Dash Vertical'), entry('┋', 'Heavy Quadruple Dash Vertical'),
    ],
  },
  {
    id: 'geometric',
    label: 'Geometric',
    chars: [
      entry('■', 'Black Square'), entry('□', 'White Square'),
      entry('▪', 'Small Black Square'), entry('▫', 'Small White Square'),
      entry('▲', 'Up Triangle'), entry('△', 'White Up Triangle'),
      entry('►', 'Right Pointer'), entry('▷', 'White Right Triangle'),
      entry('▼', 'Down Triangle'), entry('▽', 'White Down Triangle'),
      entry('◄', 'Left Pointer'), entry('◁', 'White Left Triangle'),
      entry('●', 'Black Circle'), entry('○', 'White Circle'),
      entry('◆', 'Black Diamond'), entry('◇', 'White Diamond'), entry('◊', 'Lozenge'),
      entry('◘', 'Inverse Bullet'), entry('◙', 'Inverse White Circle'),
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    chars: [
      // Cardinal
      entry('↑', 'Up Arrow'), entry('↓', 'Down Arrow'), entry('→', 'Right Arrow'), entry('←', 'Left Arrow'),
      entry('↕', 'Up Down Arrow'), entry('↔', 'Left Right Arrow'),
      // Diagonal
      entry('↗', 'Up Right Arrow'), entry('↘', 'Down Right Arrow'),
      entry('↙', 'Down Left Arrow'), entry('↖', 'Up Left Arrow'),
      // Double
      entry('⇑', 'Double Up Arrow'), entry('⇓', 'Double Down Arrow'),
      entry('⇒', 'Double Right Arrow'), entry('⇐', 'Double Left Arrow'),
      entry('⇕', 'Double Up Down Arrow'), entry('⇔', 'Double Left Right Arrow'),
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    chars: [
      // Card suits
      entry('♠', 'Spade'), entry('♣', 'Club'), entry('♥', 'Heart'), entry('♦', 'Diamond'),
      // Music
      entry('♪', 'Eighth Note'), entry('♫', 'Beamed Notes'),
      // Faces & misc
      entry('☺', 'White Smiley'), entry('☻', 'Black Smiley'), entry('☼', 'Sun'),
      entry('★', 'Black Star'), entry('•', 'Bullet'), entry('⌂', 'House'),
      entry('✓', 'Check Mark'),
      // Typography
      entry('°', 'Degree'), entry('§', 'Section'), entry('¶', 'Pilcrow'),
      entry('©', 'Copyright'), entry('®', 'Registered'), entry('™', 'Trademark'),
      entry('«', 'Left Guillemet'), entry('»', 'Right Guillemet'),
      entry('¬', 'Not Sign'),
      // Currency
      entry('¢', 'Cent'), entry('£', 'Pound'), entry('¥', 'Yen'), entry('µ', 'Micro'),
      // Math
      entry('±', 'Plus-Minus'), entry('×', 'Multiplication'), entry('÷', 'Division'),
      entry('≈', 'Almost Equal'), entry('≠', 'Not Equal'),
      entry('≤', 'Less Than or Equal'), entry('≥', 'Greater Than or Equal'),
      entry('√', 'Square Root'), entry('∞', 'Infinity'),
      // Fractions & superscripts
      entry('¹', 'Superscript One'), entry('²', 'Superscript Two'), entry('³', 'Superscript Three'),
      entry('¼', 'One Quarter'), entry('½', 'One Half'), entry('¾', 'Three Quarters'),
    ],
  },
]
