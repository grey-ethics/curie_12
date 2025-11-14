// src/components/Brand/LogoWith3DTorus.tsx
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'

/** The animated “O” (exploding plates + banded 2-color stripes) */
function ExplodingTorus({
  colorA = '#65D36E',
  colorB = '#5865F2',
  radius = 1.1,
  tube = 0.35,
  radialSegments = 6,
  tubularSegments = 32,
  scale = 1,
}: {
  colorA?: string
  colorB?: string
  radius?: number
  tube?: number
  radialSegments?: number
  tubularSegments?: number
  scale?: number
}) {
  const mesh = useRef<THREE.Mesh>(null!)

  const geo = useMemo(() => {
    const g = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments).toNonIndexed()

    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const ori = pos.clone()
    const nor = g.getAttribute('normal') as THREE.BufferAttribute

    // Banded stripes: alternate A/B across N wedges (no teal)
    const CA = new THREE.Color(colorA)
    const CB = new THREE.Color(colorB)
    const colors = new Float32Array(pos.count * 4)
    const bands = 16 // try 8, 12, 16...

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const angleT = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2) // 0..1
      const bandIndex = Math.floor(angleT * bands)
      const chosen = (bandIndex % 2 === 0) ? CA : CB
      colors[i * 4 + 0] = chosen.r
      colors[i * 4 + 1] = chosen.g
      colors[i * 4 + 2] = chosen.b
      colors[i * 4 + 3] = 1
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4))

    ;(g as any).userData = { pos, ori, nor, col: g.getAttribute('color') }
    return g
  }, [colorA, colorB, radius, tube, radialSegments, tubularSegments])

  // Explode/fade animation (no auto-rotation here so mouse control feels natural)
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const { pos, ori, nor, col } = (geo as any).userData

    const n = new THREE.Vector3()
    const v = new THREE.Vector3()
    const plates = pos.count / 6
    for (let i = 0; i < plates; i++) {
      n.fromBufferAttribute(nor, 6 * i)
      const d = (Math.sin(t * 5 + i * i) * 0.5 + 0.5) / 5 // 0..0.2
      for (let k = 0; k < 6; k++) {
        v.fromBufferAttribute(ori, 6 * i + k)
        v.addScaledVector(n, d)
        pos.setXYZ(6 * i + k, v.x, v.y, v.z)
        col.setW(6 * i + k, 1 - 4 * d)
      }
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  return (
    <mesh ref={mesh} geometry={geo} scale={scale}>
      <meshPhongMaterial
        color="#ffffff"
        shininess={510}
        flatShading
        vertexColors
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * Controls:
 *  - (1) wordmarkHeight — size of Curie wordmark (px height)
 *  - (2) wordmarkLeft/Top — place the wordmark block
 *  - (3) donutSize — the canvas size for the donut
 *  - (4) donutLeft/Top — place the donut relative to the wordmark image
 *  - donutScale — shrink the torus inside the canvas to avoid clipping
 *  - enableOrbitControls/enableZoom/autoRotate/autoRotateSpeed — mouse interaction
 */
export default function LogoWith3DTorus({
  wordmarkSrc = '/assets/curie_wordmark_noring.png',
  wordmarkHeight = 96,  // (1)
  wordmarkLeft = 0,     // (2)
  wordmarkTop = 0,      // (2)

  donutSize = 82,       // (3)
  donutLeft = 585,      // (4)
  donutTop = -10,       // (4)
  donutScale = 1.0,

  enableOrbitControls = true,
  enableZoom = false,
  autoRotate = true,
  autoRotateSpeed = 1.2,
}: {
  wordmarkSrc?: string
  wordmarkHeight?: number
  wordmarkLeft?: number
  wordmarkTop?: number
  donutSize?: number
  donutLeft?: number
  donutTop?: number
  donutScale?: number
  enableOrbitControls?: boolean
  enableZoom?: boolean
  autoRotate?: boolean
  autoRotateSpeed?: number
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        lineHeight: 0,
        transform: `translate(${wordmarkLeft}px, ${wordmarkTop}px)`, // (2)
      }}
    >
      {/* (1) control SIZE via height */}
      <img
        src={wordmarkSrc}
        alt="CURIE"
        style={{ display: 'block', height: wordmarkHeight }}
      />

      {/* Donut overlay */}
      <div
        style={{
          position: 'absolute',
          left: donutLeft,   // (4)
          top: donutTop,     // (4)
          width: donutSize,  // (3)
          height: donutSize, // (3)
          pointerEvents: 'auto',
        }}
      >
        <Canvas gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 3.2], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 4]} intensity={1} />
          <ExplodingTorus scale={donutScale} />
          {enableOrbitControls && (
            <OrbitControls
              enablePan={false}
              enableZoom={enableZoom}
              enableRotate
              autoRotate={autoRotate}
              autoRotateSpeed={autoRotateSpeed}
            />
          )}
        </Canvas>
      </div>
    </div>
  )
}
