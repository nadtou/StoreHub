import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// We create a unified SVG with both the emblem and the text "HUBSTORES"
// Styled exactly like the official luxury logo with perfect spacing and proportions.
const svgContent = `
<svg width="600" height="600" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&amp;display=swap');
      .logo-text {
        font-family: 'Cinzel', 'Playfair Display', 'Georgia', serif;
        font-weight: 500;
        fill: #D4AF37;
        font-size: 19.5px;
        letter-spacing: 0.18em;
      }
    </style>
  </defs>

  <!-- Shifted emblem group to perfectly balance with the text below -->
  <g transform="translate(10, 15)" stroke="#D4AF37" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    
    <!-- BOUTIQUE AWNING / CANOPY -->
    <path d="M 80,45 H 155" stroke-width="2.6" />
    <path d="M 80,48.5 H 155" stroke-width="1.2" />
    
    <!-- 5 perfectly rounded canopy scallops -->
    <path d="M 80,48.5 V 60 C 80,65.5 95,65.5 95,60" />
    <path d="M 95,48.5 V 60 C 95,65.5 110,65.5 110,60" />
    <path d="M 110,48.5 V 60 C 110,65.5 125,65.5 125,60" />
    <path d="M 125,48.5 V 60 C 125,65.5 140,65.5 140,60" />
    <path d="M 140,48.5 V 60 C 140,65.5 155,65.5 155,60" />
    
    <!-- Canopy vertical seam dividers -->
    <path d="M 95,48.5 V 60" stroke-width="1.0" />
    <path d="M 110,48.5 V 60" stroke-width="1.0" />
    <path d="M 125,48.5 V 60" stroke-width="1.0" />
    <path d="M 140,48.5 V 60" stroke-width="1.0" />
    
    <!-- Shop walls -->
    <path d="M 155,60 V 118" stroke-width="2.2" />
    <path d="M 80,88 V 118" stroke-width="2.2" />
    <path d="M 80,118 H 155" stroke-width="2.2" />

    <!-- CLOTHES HANGER &amp; T-SHIRT inside shop window -->
    <path d="M 117.5,82.5 C 117.5,77 122.5,77 121,74.5 C 119.5,71.5 115,73 116.5,76.5" stroke-width="1.6" />
    <path d="M 104,89.5 L 117.5,83.5 L 131,89.5 Z" stroke-width="1.6" />
    <path d="M 106,89.5 L 99,95 L 103,100 L 108,96 L 108,118 L 127,118 L 127,96 L 132,100 L 136,95 L 129,89.5 L 122,89.5 L 117.5,98.5 L 113,89.5 Z" fill="#D4AF37" stroke="none" />
    <path d="M 113,89.5 L 117.5,98.5 L 122,89.5" stroke="#D4AF37" stroke-width="1.3" />

    <!-- THE FENNEC FOX (highly precise luxury curves) -->
    <!-- Left Big Ear (Outer Leaf) -->
    <path d="M 72.5,69.5 C 72.5,55 60.5,41 48,41 C 39,41 41.5,54.5 50.5,65.5 C 57.5,73.5 66.5,76.5 72.5,76.5 Z" stroke-width="2.6" />
    <!-- Left Ear Inner details -->
    <path d="M 56.5,48.5 C 51.5,55 51.5,62 58.5,68.5" stroke-width="1.3" />
    <path d="M 45,45 C 42.5,51 45,58 51.5,63.5" stroke-width="0.8" />

    <!-- Right Ear (Outer Leaf) -->
    <path d="M 73.5,72 C 73.5,58.5 83.5,44 94,44 C 101,44 98.5,55.5 91.5,64.5 C 87,69 81.5,72 73.5,72 Z" stroke-width="2.2" />
    <!-- Right Ear Inner details -->
    <path d="M 84,48.5 C 86.5,54 85,59.5 80.5,64" stroke-width="1.3" />

    <!-- Head &amp; Muzzle Profile -->
    <path d="M 72.5,76.5 C 72.5,81 81.5,81 84,83 C 86.5,84 84,86.5 80.5,86.5" stroke-width="2.2" />
    <!-- Eye (Closed/Sleeping curve) -->
    <path d="M 67.5,75.5 C 70,74.5 73,75.5 74.5,77.5" stroke-width="1.6" />

    <!-- Elegant body/neck lines -->
    <path d="M 59,83 C 52,92 57.5,107.5 61,118" stroke-width="2.2" />
    <path d="M 72.5,81 C 70,92.5 69,103.5 68,118" stroke-width="2.2" />

    <!-- Gorgeous Sweeping Tail wrapping under the store floor with split tips -->
    <path d="M 61,118 C 50.5,118 50.5,132.5 61,136 C 76.5,139.5 94.5,131.5 112.5,127 C 126,123.5 137.5,118 128.5,112.5 C 115,109 101.5,116 90.5,116 C 79,116 69,112.5 61,118 Z" stroke-width="2.6" />
    <!-- Inner tail split detailing -->
    <path d="M 112.5,127 C 117,123.5 121.5,119 128.5,112.5" stroke-width="1.9" />
    <path d="M 95.5,129 C 102,126.5 107.5,123.5 114,118" stroke-width="1.1" />
  </g>

  <!-- Elegant Brand Typography embedded directly inside the SVG -->
  <text x="120" y="195" class="logo-text" text-anchor="middle">HUBSTORES</text>
</svg>
`;

async function generate() {
  // Directories to ensure
  const dirs = [
    path.join(process.cwd(), 'assets'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'public', 'assets')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Write SVG file to all required locations
  fs.writeFileSync(path.join(process.cwd(), 'assets', 'logo.svg'), svgContent.trim());
  fs.writeFileSync(path.join(process.cwd(), 'public', 'logo.svg'), svgContent.trim());
  fs.writeFileSync(path.join(process.cwd(), 'public', 'assets', 'logo.svg'), svgContent.trim());
  console.log('Saved SVG files.');

  // Convert SVG to PNG using sharp for all locations
  const svgBuffer = Buffer.from(svgContent.trim());
  
  await sharp(svgBuffer)
    .png()
    .toFile(path.join(process.cwd(), 'assets', 'logo.png'));
    
  await sharp(svgBuffer)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'logo.png'));

  await sharp(svgBuffer)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'assets', 'logo.png'));

  console.log('Successfully generated assets/logo.png and public/logo.png in high quality using sharp!');
}

generate().catch(console.error);
