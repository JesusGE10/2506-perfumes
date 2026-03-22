import os
from PIL import Image

def get_dominant_color(image_path):
    img = Image.open(image_path).convert("RGBA")
    colors = img.getcolors(maxcolors=1000000)
    # filter out transparent pixels (alpha < 128)
    valid_colors = [(count, rgba) for count, rgba in (colors or []) if rgba[3] > 128]
    if not valid_colors:
        return (255, 255, 255) # default white
    # Sort by count
    valid_colors.sort(key=lambda x: x[0], reverse=True)
    return valid_colors[0][1][:3] # return an RGB tuple

def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"

def luminance(r, g, b):
    a = [c / 255.0 for c in (r, g, b)]
    for i in range(3):
        if a[i] <= 0.03928:
            a[i] = a[i] / 12.92
        else:
            a[i] = ((a[i] + 0.055) / 1.055) ** 2.4
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722

def contrast_ratio(rgb1, rgb2):
    lum1 = luminance(*rgb1)
    lum2 = luminance(*rgb2)
    brightest = max(lum1, lum2)
    darkest = min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)

if __name__ == "__main__":
    bg_color = (123, 31, 46) # #7b1f2e Burgundy
    public_dir = r"c:\Users\jesus\Desktop\Desarrollo Antigravity\perfumes_2506\frontend\public"
    logos = ["logo-gold.png", "logo-crema.png", "logo-hueso.png"]
    
    for logo in logos:
        path = os.path.join(public_dir, logo)
        if os.path.exists(path):
            r, g, b = get_dominant_color(path)
            hex_color = rgb_to_hex(r, g, b)
            ratio = contrast_ratio(bg_color, (r, g, b))
            print(f"Logo: {logo}")
            print(f"Dominant Color: {hex_color} (RGB: {r}, {g}, {b})")
            print(f"Contrast with Burgundy (#7b1f2e): {ratio:.2f}:1")
            print("-" * 30)
