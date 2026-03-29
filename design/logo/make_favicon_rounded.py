from PIL import Image, ImageDraw

def create_rounded_mask(w, h, radius):
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    return mask

def main():
    bg_color = "#7b1f2e" # Primary Vinotinto color
    base_color_rgba = (123, 31, 46, 255)
    source_path = "logo-crema.PNG"
    dest_path = "../../frontend/src/app/icon.png"
    
    logo = Image.open(source_path).convert("RGBA")
    
    size = 512
    padding_factor = 0.30 # Modern app icon padding
    radius = 115 # iOS icon corner radius equivalent
    
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        
    max_w = int(size * (1 - padding_factor))
    max_h = int(size * (1 - padding_factor))
    logo.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    
    # Create the transparent canvas
    final_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # Create the solid vinotinto block
    bg_block = Image.new("RGBA", (size, size), base_color_rgba)
    
    # Mask to rounded corners
    mask = create_rounded_mask(size, size, radius)
    final_canvas.paste(bg_block, (0, 0), mask)
    
    # Position logo
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    
    # Overlay the logo
    final_canvas.alpha_composite(logo, (x, y))
    
    # Save
    final_canvas.save(dest_path, "PNG")
    print(f"Refined rounded favicon generated and injected to {dest_path}")

if __name__ == '__main__':
    main()
