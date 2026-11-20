"""Keep the first 12 original NYU frames; preserve spatial data and timing."""
import gzip
import hashlib
import json
import struct
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with gzip.open(sys.argv[1], 'rb') as source:
    header = bytearray(source.read(352))
    dims = struct.unpack_from('<8h', header, 40)
    assert struct.unpack_from('<i', header)[0] == 348 and dims[0] == 4
    assert struct.unpack_from('<f', header, 108)[0] == 352
    frames = min(12, dims[4])
    size = dims[1] * dims[2] * dims[3] * struct.unpack_from('<h', header, 72)[0] // 8
    data = source.read(size * frames)
    assert len(data) == size * frames
struct.pack_into('<h', header, 48, frames)
# Remove free-text source fields from the distributed sample.
header[148:252] = bytes(104)
header[328:344] = bytes(16)
raw = bytes(header) + data
compressed = gzip.compress(raw, mtime=0)
name = 'nyu-rest-demo.nii.gz'
(root / 'server/materials/demo' / name).write_bytes(compressed)
manifest = dict(file=name, originalBytes=len(raw), compressedBytes=len(compressed),
                dimensions=[*dims[1:4], frames], originalSha256=hashlib.sha256(raw).hexdigest(),
                source='NYU/0050952/session_1/rest_1/rest.nii.gz',
                description='First 12 of 180 frames. Original spatial resolution and TR (2 s).')
(root / 'src/features/mri/fmri-demo-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest))
