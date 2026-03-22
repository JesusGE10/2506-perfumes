import os
from PIL import Image

design_dir = r"c:\Users\jesus\Desktop\Desarrollo Antigravity\perfumes_2506\design\logo"
public_dir = r"c:\Users\jesus\Desktop\Desarrollo Antigravity\perfumes_2506\frontend\public"

logos = [
    "logo-gold.PNG",
    "logo-crema.PNG",
    "logo-hueso.PNG",
    "logo-blanco.PNG"
]

for logo in logos:
    path = os.path.join(design_dir, logo)
    if not os.path.exists(path):
        print(f"Not found: {path}")
        continue
    try:
        img = Image.open(path)
        img = img.convert("RGBA")
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if bbox:
            img_cropped = img.crop(bbox)
            out_name = logo.lower()
            if not out_name.endswith('.png'):
                out_name += '.png'
            out_path = os.path.join(public_dir, out_name)
            img_cropped.save(out_path, "PNG")
            print(f"Cropped and saved {out_path}")
        else:
            print(f"No bbox for {path}")
    except Exception as e:
        print(f"Error processing {logo}: {e}")
