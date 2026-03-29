from PIL import Image

def main():
    bg_color = "#1a1410" # Graphite color matching the site text for high contrast luxury
    source_path = "logo-crema.PNG"
    dest_path = "../../frontend/src/app/icon.png"
    
    logo = Image.open(source_path).convert("RGBA")
    
    size = 512
    padding_factor = 0.25 # 25% padding
    
    # Crop to the actual visible contents so padding is perfectly symmetrical
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        
    # Resize the logo to fit tightly within the padded area
    max_w = int(size * (1 - padding_factor))
    max_h = int(size * (1 - padding_factor))
    logo.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    
    # Create the solid dark background
    bg = Image.new("RGBA", (size, size), bg_color)
    
    # Position
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    
    # Overlay the logo
    bg.alpha_composite(logo, (x, y))
    
    # Next.js optimal 512x512 PNG save
    bg.save(dest_path, "PNG")
    print(f"Refined favicon generated and injected to {dest_path}")

if __name__ == '__main__':
    main()
