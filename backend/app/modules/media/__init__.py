"""
Media module — image upload pipeline via Cloudflare R2.

Pipeline: binary upload → Pillow WebP optimization → R2 upload → DB persist.
"""
