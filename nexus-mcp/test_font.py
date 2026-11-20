import fitz
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Test with TextWriter approach
doc = fitz.open()
page = doc.new_page()
font = fitz.Font(fontfile=r"C:\Windows\Fonts\Nirmala.ttc")

hindi_text = "\u0935\u093f\u0927\u093f\u0915 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0930\u093f\u092a\u094b\u0930\u094d\u091f"
kannada_text = "\u0c95\u0cbe\u0ca8\u0cc2\u0ca8\u0cc1 \u0cb5\u0cbf\u0cb6\u0ccd\u0cb2\u0cc7\u0cb7\u0ca3\u0cc6 \u0cb5\u0cb0\u0ca6\u0cbf"

tw = fitz.TextWriter(page.rect)
tw.append((50, 80), "Test: Hindi + Kannada with Nirmala UI", font=fitz.Font("helv"), fontsize=14)
tw.append((50, 130), f"Hindi: {hindi_text}", font=font, fontsize=18)
tw.append((50, 180), f"Kannada: {kannada_text}", font=font, fontsize=18)
tw.write_text(page)

out = "test_nirmala.pdf"
doc.save(out)
doc.close()

# Read back and check codepoints
doc2 = fitz.open(out)
text = doc2[0].get_text()
lines = text.strip().split("\n")
for line in lines:
    codes = [hex(ord(c)) for c in line if ord(c) > 0x0900]
    if codes:
        print(f"Line: {line}")
        print(f"  Indic codepoints found: {len(codes)} -> {codes[:10]}")
    else:
        print(f"Line: {line}")

doc2.close()
print(f"\nFile saved: {out} ({os.path.getsize(out)} bytes)")
print("SUCCESS - Open test_nirmala.pdf to verify visually!")
