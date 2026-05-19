import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def generate_qr_png(data: str, box_size: int = 16) -> bytes:
    """Generate a printable-quality (>=500x500px) QR code PNG."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    if img.size[0] < 500:
        img = img.resize((500, 500))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
