import struct, zlib, os, sys

def decode_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    pos = 8
    width = height = bitdepth = colortype = None
    idat = b''
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        ctype = data[pos+4:pos+8]
        chunk = data[pos+8:pos+8+length]
        if ctype == b'IHDR':
            width, height, bitdepth, colortype = struct.unpack('>IIBB', chunk[:10])
        elif ctype == b'IDAT':
            idat += chunk
        pos += 8 + length + 4
    if colortype != 6 or bitdepth != 8:
        raise ValueError(f"unsupported colortype={colortype} bitdepth={bitdepth}")
    raw = zlib.decompress(idat)
    bpp = 4
    stride = width * bpp
    out = bytearray(stride * height)
    prev = bytearray(stride)
    idx = 0
    for y in range(height):
        ft = raw[idx]; idx += 1
        line = raw[idx:idx+stride]; idx += stride
        row_off = y * stride
        if ft == 0:
            out[row_off:row_off+stride] = line
        else:
            cur = bytearray(stride)
            for x in range(stride):
                a = line[x]
                left = cur[x-bpp] if x >= bpp else 0
                up = prev[x]
                upleft = prev[x-bpp] if x >= bpp else 0
                if ft == 1:
                    v = (a + left) & 0xFF
                elif ft == 2:
                    v = (a + up) & 0xFF
                elif ft == 3:
                    v = (a + ((left + up) // 2)) & 0xFF
                elif ft == 4:
                    p = left + up - upleft
                    pa, pb, pc = abs(p-left), abs(p-up), abs(p-upleft)
                    pr = left if (pa <= pb and pa <= pc) else (up if pb <= pc else upleft)
                    v = (a + pr) & 0xFF
                else:
                    v = a
                cur[x] = v
            out[row_off:row_off+stride] = cur
        prev = out[row_off:row_off+stride]
    return width, height, out, stride, bpp

def encode_png(path, width, height, pixels, stride, bpp):
    def chunk(ctype, data):
        return (struct.pack('>I', len(data)) + ctype + data +
                struct.pack('>I', zlib.crc32(ctype + data) & 0xffffffff))
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        row_off = y * stride
        raw.extend(pixels[row_off:row_off+stride])
    idat = zlib.compress(bytes(raw), 6)
    with open(path, 'wb') as f:
        f.write(sig)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))

def alpha_bbox(pixels, stride, bpp, width, height, threshold=10):
    minx, miny, maxx, maxy = width, height, -1, -1
    for y in range(height):
        row_off = y * stride
        row_has = False
        for x in range(width):
            a = pixels[row_off + x*bpp + 3]
            if a > threshold:
                row_has = True
                if x < minx: minx = x
                if x > maxx: maxx = x
        if row_has:
            if y < miny: miny = y
            if y > maxy: maxy = y
    return minx, miny, maxx, maxy

def crop(pixels, stride, bpp, minx, miny, maxx, maxy):
    new_w = maxx - minx + 1
    new_h = maxy - miny + 1
    new_stride = new_w * bpp
    out = bytearray(new_stride * new_h)
    for y in range(new_h):
        src_off = (miny + y) * stride + minx * bpp
        dst_off = y * new_stride
        out[dst_off:dst_off+new_stride] = pixels[src_off:src_off+new_stride]
    return out, new_w, new_h, new_stride

def process(src, dst, pad_frac=0.015):
    try:
        w, h, pixels, stride, bpp = decode_png(src)
    except ValueError as e:
        print(f"SKIP {src}: {e} (not a transparent garment-only cutout yet)")
        return None
    minx, miny, maxx, maxy = alpha_bbox(pixels, stride, bpp, w, h)
    if maxx < 0:
        print(f"SKIP {src}: fully transparent, nothing to trim")
        return None
    # small uniform padding so anti-aliased edges aren't clipped
    pad = int(round((maxx - minx) * pad_frac))
    minx = max(0, minx - pad); miny = max(0, miny - pad)
    maxx = min(w-1, maxx + pad); maxy = min(h-1, maxy + pad)
    cropped, nw, nh, nstride = crop(pixels, stride, bpp, minx, miny, maxx, maxy)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    encode_png(dst, nw, nh, cropped, nstride, bpp)
    return dict(orig=(w,h), new=(nw,nh), bbox=(minx,miny,maxx,maxy),
                top_pct=100*miny/h, left_pct=100*minx/w, right_pct=100*maxx/w)

if __name__ == '__main__':
    # Usage: python3 scripts/trim-vault-images.py [base_dir] [collection ...]
    # Collections default to every id vault.html knows about; any collection
    # whose public/images/<id>-N.png files aren't yet transparent cutouts
    # (colortype 6) is skipped with a message rather than failing the run —
    # so it's safe to re-run this after only SOME collections get real photos.
    args = sys.argv[1:]
    base = args[0] if args and not args[0] in ('party','wedding','vacation') else '.'
    cols = [a for a in args if a in ('party','wedding','vacation')] or ['party','wedding','vacation']
    names = [f'{col}-{i}' for col in cols for i in range(1,11)]
    for name in names:
        src = os.path.join(base, 'public/images', f'{name}.png')
        dst = os.path.join(base, 'public/images/trimmed', f'{name}.png')
        info = process(src, dst)
        if info:
            print(name, info)
