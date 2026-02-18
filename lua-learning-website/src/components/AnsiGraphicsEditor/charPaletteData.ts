export interface CharEntry {
  char: string
  name: string
}

export interface CharCategory {
  id: string
  label: string
  chars: CharEntry[]
}

const c = (char: string, name: string): CharEntry => ({ char, name })

export const CHAR_PALETTE_CATEGORIES: CharCategory[] = [
  {
    id: 'ascii',
    label: 'ASCII',
    chars: [
      c('!', 'Exclamation Mark'), c('"', 'Quotation Mark'), c('#', 'Number Sign'),
      c('$', 'Dollar Sign'), c('%', 'Percent Sign'), c('&', 'Ampersand'),
      c("'", 'Apostrophe'), c('(', 'Left Parenthesis'), c(')', 'Right Parenthesis'),
      c('*', 'Asterisk'), c('+', 'Plus Sign'), c(',', 'Comma'),
      c('-', 'Hyphen-Minus'), c('.', 'Full Stop'), c('/', 'Solidus'),
      c(':', 'Colon'), c(';', 'Semicolon'), c('<', 'Less-Than Sign'),
      c('=', 'Equals Sign'), c('>', 'Greater-Than Sign'), c('?', 'Question Mark'),
      c('@', 'Commercial At'), c('[', 'Left Square Bracket'), c('\\', 'Reverse Solidus'),
      c(']', 'Right Square Bracket'), c('^', 'Circumflex Accent'), c('_', 'Low Line'),
      c('`', 'Grave Accent'), c('{', 'Left Curly Bracket'), c('|', 'Vertical Line'),
      c('}', 'Right Curly Bracket'), c('~', 'Tilde'),
    ],
  },
  {
    id: 'blocks',
    label: 'Blocks',
    chars: [
      // Shading
      c('░', 'Light Shade'), c('▒', 'Medium Shade'), c('▓', 'Dark Shade'), c('█', 'Full Block'),
      // Upper / lower fills
      c('▔', 'Upper One Eighth'), c('▀', 'Upper Half'),
      c('▁', 'Lower One Eighth'), c('▂', 'Lower One Quarter'), c('▃', 'Lower Three Eighths'),
      c('▄', 'Lower Half'), c('▅', 'Lower Five Eighths'), c('▆', 'Lower Three Quarters'),
      c('▇', 'Lower Seven Eighths'),
      // Left / right fills
      c('▏', 'Left One Eighth'), c('▎', 'Left One Quarter'), c('▍', 'Left Three Eighths'),
      c('▌', 'Left Half'), c('▋', 'Left Five Eighths'), c('▊', 'Left Three Quarters'),
      c('▉', 'Left Seven Eighths'),
      c('▕', 'Right One Eighth'), c('▐', 'Right Half'),
      // Quadrants
      c('▘', 'Quadrant Upper Left'), c('▝', 'Quadrant Upper Right'),
      c('▖', 'Quadrant Lower Left'), c('▗', 'Quadrant Lower Right'),
      c('▚', 'Quadrant Diagonal'), c('▞', 'Quadrant Anti-Diagonal'),
      c('▙', 'Quadrant Three Upper-Left'), c('▛', 'Quadrant Three Upper-Right'),
      c('▜', 'Quadrant Three Lower-Right'), c('▟', 'Quadrant Three Lower-Left'),
    ],
  },
  {
    id: 'borders',
    label: 'Borders',
    chars: [
      // Light single
      c('─', 'Light Horizontal'), c('│', 'Light Vertical'),
      c('┌', 'Light Down Right'), c('┐', 'Light Down Left'),
      c('└', 'Light Up Right'), c('┘', 'Light Up Left'),
      c('├', 'Light Vertical Right'), c('┤', 'Light Vertical Left'),
      c('┬', 'Light Down Horizontal'), c('┴', 'Light Up Horizontal'),
      c('┼', 'Light Cross'),
      // Heavy single
      c('━', 'Heavy Horizontal'), c('┃', 'Heavy Vertical'),
      c('┏', 'Heavy Down Right'), c('┓', 'Heavy Down Left'),
      c('┗', 'Heavy Up Right'), c('┛', 'Heavy Up Left'),
      c('┣', 'Heavy Vertical Right'), c('┫', 'Heavy Vertical Left'),
      c('┳', 'Heavy Down Horizontal'), c('┻', 'Heavy Up Horizontal'),
      c('╋', 'Heavy Cross'),
      // Rounded corners
      c('╭', 'Arc Down Right'), c('╮', 'Arc Down Left'),
      c('╰', 'Arc Up Right'), c('╯', 'Arc Up Left'),
      // Double
      c('═', 'Double Horizontal'), c('║', 'Double Vertical'),
      c('╔', 'Double Down Right'), c('╗', 'Double Down Left'),
      c('╚', 'Double Up Right'), c('╝', 'Double Up Left'),
      c('╠', 'Double Vertical Right'), c('╣', 'Double Vertical Left'),
      c('╦', 'Double Down Horizontal'), c('╩', 'Double Up Horizontal'),
      c('╬', 'Double Cross'),
      // Mixed: single vertical / double horizontal
      c('╒', 'Down Single Right Double'), c('╕', 'Down Single Left Double'),
      c('╘', 'Up Single Right Double'), c('╛', 'Up Single Left Double'),
      c('╞', 'Vertical Single Right Double'), c('╡', 'Vertical Single Left Double'),
      c('╥', 'Down Single Horizontal Double'), c('╨', 'Up Single Horizontal Double'),
      c('╪', 'Single Vertical Double Horizontal Cross'),
      // Mixed: double vertical / single horizontal
      c('╓', 'Down Double Right Single'), c('╖', 'Down Double Left Single'),
      c('╙', 'Up Double Right Single'), c('╜', 'Up Double Left Single'),
      c('╟', 'Vertical Double Right Single'), c('╢', 'Vertical Double Left Single'),
      c('╤', 'Down Double Horizontal Single'), c('╧', 'Up Double Horizontal Single'),
      c('╫', 'Double Vertical Single Horizontal Cross'),
      // Dashed lines
      c('┄', 'Light Triple Dash Horizontal'), c('┅', 'Heavy Triple Dash Horizontal'),
      c('┆', 'Light Triple Dash Vertical'), c('┇', 'Heavy Triple Dash Vertical'),
      c('┈', 'Light Quadruple Dash Horizontal'), c('┉', 'Heavy Quadruple Dash Horizontal'),
      c('┊', 'Light Quadruple Dash Vertical'), c('┋', 'Heavy Quadruple Dash Vertical'),
    ],
  },
  {
    id: 'geometric',
    label: 'Geometric',
    chars: [
      c('■', 'Black Square'), c('□', 'White Square'),
      c('▪', 'Small Black Square'), c('▫', 'Small White Square'),
      c('▲', 'Up Triangle'), c('△', 'White Up Triangle'),
      c('►', 'Right Pointer'), c('▷', 'White Right Triangle'),
      c('▼', 'Down Triangle'), c('▽', 'White Down Triangle'),
      c('◄', 'Left Pointer'), c('◁', 'White Left Triangle'),
      c('●', 'Black Circle'), c('○', 'White Circle'),
      c('◆', 'Black Diamond'), c('◇', 'White Diamond'), c('◊', 'Lozenge'),
      c('◘', 'Inverse Bullet'), c('◙', 'Inverse White Circle'),
    ],
  },
  {
    id: 'arrows',
    label: 'Arrows',
    chars: [
      // Cardinal
      c('↑', 'Up Arrow'), c('↓', 'Down Arrow'), c('→', 'Right Arrow'), c('←', 'Left Arrow'),
      c('↕', 'Up Down Arrow'), c('↔', 'Left Right Arrow'),
      // Diagonal
      c('↗', 'Up Right Arrow'), c('↘', 'Down Right Arrow'),
      c('↙', 'Down Left Arrow'), c('↖', 'Up Left Arrow'),
      // Double
      c('⇑', 'Double Up Arrow'), c('⇓', 'Double Down Arrow'),
      c('⇒', 'Double Right Arrow'), c('⇐', 'Double Left Arrow'),
      c('⇕', 'Double Up Down Arrow'), c('⇔', 'Double Left Right Arrow'),
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    chars: [
      // Card suits
      c('♠', 'Spade'), c('♣', 'Club'), c('♥', 'Heart'), c('♦', 'Diamond'),
      // Music
      c('♪', 'Eighth Note'), c('♫', 'Beamed Notes'),
      // Faces & misc
      c('☺', 'White Smiley'), c('☻', 'Black Smiley'), c('☼', 'Sun'),
      c('★', 'Black Star'), c('•', 'Bullet'), c('⌂', 'House'),
      c('✓', 'Check Mark'),
      // Typography
      c('°', 'Degree'), c('§', 'Section'), c('¶', 'Pilcrow'),
      c('©', 'Copyright'), c('®', 'Registered'), c('™', 'Trademark'),
      c('«', 'Left Guillemet'), c('»', 'Right Guillemet'),
      c('¬', 'Not Sign'),
      // Currency
      c('¢', 'Cent'), c('£', 'Pound'), c('¥', 'Yen'), c('µ', 'Micro'),
      // Math
      c('±', 'Plus-Minus'), c('×', 'Multiplication'), c('÷', 'Division'),
      c('≈', 'Almost Equal'), c('≠', 'Not Equal'),
      c('≤', 'Less Than or Equal'), c('≥', 'Greater Than or Equal'),
      c('√', 'Square Root'), c('∞', 'Infinity'),
      // Fractions & superscripts
      c('¹', 'Superscript One'), c('²', 'Superscript Two'), c('³', 'Superscript Three'),
      c('¼', 'One Quarter'), c('½', 'One Half'), c('¾', 'Three Quarters'),
    ],
  },
]
