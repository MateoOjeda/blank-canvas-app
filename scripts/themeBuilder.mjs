import fs from 'fs';
import path from 'path';

function hexToParsedHsl(hex) {
  // Remove the hash
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function adjustLightness(hslStr, delta) {
    const parts = hslStr.split(' ');
    let [h, s, l] = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])];
    l = Math.max(0, Math.min(100, l + delta));
    return `${h} ${s}% ${l}%`;
}

const getContrastingForeground = (bgHslStr) => {
    const l = parseFloat(bgHslStr.split(' ')[2]);
    return l > 50 ? '230 28% 15%' : '48 38% 95%';
}

const generateTheme = (name, base, primary, secondary, text) => {
    const bgHsl = hexToParsedHsl(base);
    const fgHsl = hexToParsedHsl(text);
    const primHsl = hexToParsedHsl(primary);
    const secHsl = hexToParsedHsl(secondary);
    
    // Derived values for shadcn mapping
    const isDark = parseFloat(bgHsl.split(' ')[2]) < 50;
    
    // Card is slightly lighter or darker than bg depending on theme mode
    const cardHsl = isDark ? adjustLightness(bgHsl, 3) : adjustLightness(bgHsl, -2);
    const cardFgHsl = fgHsl;

    // Popover = Card
    
    const primFgHsl = getContrastingForeground(primHsl);
    
    // Secondary 
    const secFgHsl = getContrastingForeground(secHsl);
    
    // Muted = even subtler background
    const mutedHsl = isDark ? adjustLightness(bgHsl, 6) : adjustLightness(bgHsl, -5);
    const mutedFgHsl = adjustLightness(fgHsl, isDark ? -20 : 20); // Dimmed text
    
    // Accent = primary or a complementary color
    const accentHsl = primHsl;
    const accentFgHsl = primFgHsl;
    
    // Border = same as muted
    const borderHsl = mutedHsl;
    const inputHsl = borderHsl;
    const ringHsl = primHsl;
    
    // Additional vars mapped 
    const brandRedHsl = primHsl;
    const neonGlowHsl = primHsl;
    const neonOrangeHsl = primHsl;
    

    const css = `
[data-theme="${name}"] {
    --background: ${bgHsl};
    --foreground: ${fgHsl};
    
    --card: ${cardHsl};
    --card-foreground: ${cardFgHsl};
    
    --popover: ${cardHsl};
    --popover-foreground: ${cardFgHsl};
    
    --primary: ${primHsl};
    --primary-foreground: ${primFgHsl};
    
    --secondary: ${secHsl};
    --secondary-foreground: ${secFgHsl};
    
    --muted: ${mutedHsl};
    --muted-foreground: ${mutedFgHsl};
    
    --accent: ${accentHsl};
    --accent-foreground: ${accentFgHsl};
    
    --border: ${borderHsl};
    --input: ${inputHsl};
    --ring: ${ringHsl};
    
    --sidebar-background: ${cardHsl};
    --sidebar-foreground: ${fgHsl};
    --sidebar-primary: ${primHsl};
    --sidebar-primary-foreground: ${primFgHsl};
    --sidebar-accent: ${mutedHsl};
    --sidebar-accent-foreground: ${fgHsl};
    --sidebar-border: ${borderHsl};
    --sidebar-ring: ${ringHsl};

    --brand-red: ${brandRedHsl};
    --neon-glow: ${neonGlowHsl};
    --neon-orange: ${neonOrangeHsl};
    --chart-completed: ${primHsl};
    --chart-pending: ${mutedHsl};
}`;
    return css;
};

// 1.Sobria: Deep Charcoal (#2D3436), Soft Grey (#DFE6E9), Pure White (#FFFFFF), Accent Gold (#D3B037)
// Base: Grey, Text: Charcoal, Primary: Gold, Secondary: White
const t1 = generateTheme('sobria', '#DFE6E9', '#D3B037', '#FFFFFF', '#2D3436');

// 2.Tech / Neon: Electric Blue (#0984E3), Night Black (#1E272E), Cyan Neon (#00CEC9), Cloud White (#F5F6FA)
// Base: Black, Text: White, Primary: Neon, Sec: Blue
const t2 = generateTheme('tech-neon', '#1E272E', '#00CEC9', '#0984E3', '#F5F6FA');

// 3.Tierra: Forest Green (#2D4F1E), Warm Beige (#F5E6CC), Terracotta (#E27D60), Slate Grey (#4A4A4A)
// Base: Beige, Text: Grey, Primary: Terracotta, Sec: Green
const t3 = generateTheme('tierra-nature', '#F5E6CC', '#E27D60', '#2D4F1E', '#4A4A4A');

// 4.Energética: Vivid Orange (#FF7675), Deep Purple (#6C5CE7), Soft Mint (#55E6C1), Dark Slate (#2F3640)
// Base: Slate, Text: Mint(or White?), let's use White (#F1F2F6) for text to be safe, Primary: Orange, Sec: Purple
const t4 = generateTheme('energetica', '#2F3640', '#FF7675', '#6C5CE7', '#F1F2F6');

// 5.Nocturna Elegante: Midnight Navy (#192A56), Champagne (#F7D794), Dusty Rose (#EDA6A3), Pearl White (#FCFBFB)
// Base: Navy, Text: Pearl White, Primary: Champagne, Sec: Rose
const t5 = generateTheme('nocturna-elegante', '#192A56', '#F7D794', '#EDA6A3', '#FCFBFB');

// 6.Kiwi Night: Night (#222222), Kiwi (#89E900), Graphite (#3D3D3D), Volt Silver (#E0FFB3)
const t6 = generateTheme('kiwi-night', '#222222', '#89E900', '#3D3D3D', '#E0FFB3');

// 7.Persian Ghost: Ghost (#F7F7FF), Persian (#27187E), Electric Violet (#758BFD), Deep Space (#110B33)
const t7 = generateTheme('persian-ghost', '#F7F7FF', '#27187E', '#758BFD', '#110B33');

// 8.Imperial Night: Night (#000F08), Imperial (#FB3640), Carbon Grey (#1D1E1C), Silver Steel (#E1E1E1)
const t8 = generateTheme('imperial-night', '#000F08', '#FB3640', '#1D1E1C', '#E1E1E1');

// 9.Cyprus Sand: Cyprus (#004643), Sand (#F0EDE5), Ochre Gold (#D1AC00), Dark Pine (#002B29)
// Base: Cyprus, Text: Sand, Prima: Ochre, Sec: Pine
const t9 = generateTheme('cyprus-sand', '#004643', '#D1AC00', '#002B29', '#F0EDE5');

// 10.Plum Milk: Plum (#381932), Milk (#FFF3E6), Lavender Grey (#8E7C8B), Deep Berry (#240F20)
// Base: Milk, Text: Berry, Prim: Plum, Sec: Lavender
const t10 = generateTheme('plum-milk', '#FFF3E6', '#381932', '#8E7C8B', '#240F20');

// 11.Kamarr: Midnight Blue (#193A56), Obsidian Black (#121212), Slate Blue (#3A5E78), Pale Smoke (#F2F4F5)
const t11 = generateTheme('kamarr', '#121212', '#193A56', '#3A5E78', '#F2F4F5');

// 12.Mari Mari: Marí Crimson (#B03030), Charcoal Black (#1A1A1A), Velvet Maroon (#701C1C), Light Graphite (#E1E1E1)
const t12 = generateTheme('mari-mari', '#1A1A1A', '#B03030', '#701C1C', '#E1E1E1');

// 13.Papelitos: Sky Pastel (#A3D8E0), Cream White (#FBFCF9), Dusty Cyan (#6DAAB3), Soft Charcoal (#4D4D4D)
const t13 = generateTheme('papelitos', '#FBFCF9', '#A3D8E0', '#6DAAB3', '#4D4D4D');

// 14.O'bahia: Deep Ocean (#1C4966), Coal Black (#171717), Steel Blue (#4F738E), Pearl Grey (#EFF1F3)
const t14 = generateTheme('obahia', '#171717', '#1C4966', '#4F738E', '#EFF1F3');

// 15.Ara Yevi: Matte Gold (#D3AC5D), Jet Black (#1F1F1F), Dark Ochre (#8C6E3D), Bone White (#FAF9F6)
const t15 = generateTheme('ara-yevi', '#1F1F1F', '#D3AC5D', '#8C6E3D', '#FAF9F6');

const allCss = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15].join('\n');

const indexPath = path.join(process.cwd(), 'src', 'index.css');
let existing = fs.readFileSync(indexPath, 'utf-8');
// remove existing themes if any to prevent duplicates during testing
existing = existing.split('/* THEMES_START */')[0];

fs.writeFileSync(indexPath, existing + '\n/* THEMES_START */\n@layer base {\n' + allCss + '\n}\n');
console.log('Themes injected successfully.');
