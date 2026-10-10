# Kinetic Decrement over GPU Pixel Readback

Reading canvas pixels via `getImageData()` forces a synchronous GPU-to-CPU pipeline stall and major frame drop on high-DPI displays. We decided to implement kinetic decrementing: each high-velocity scrubbing stroke calculates erased coverage mathematically from cursor velocity and stroke radius, immediately subtracting from Rot Progress while applying `destination-out` compositing on the canvas buffer at 60fps.
