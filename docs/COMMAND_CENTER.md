# OBSIDIAN ECOSYSTEM — 3D INTERACTIVE COMMAND CENTER
## Complete Exhaustive Build Prompt for a Cinematic Agent Civilization

**Instructions for the AI (Claude Code, Cursor, etc.):** You are to build a full-screen 3D web application exactly as described below. Every detail — every color, every animation parameter, every geometry, every character — must be implemented precisely. Do not simplify, do not use generic placeholders. This is a production-ready, investor-demo-quality interface for an autonomous AI agent command center. The code must be clean, component-based, and fully functional with mock data. No backend is required.

---

# TABLE OF CONTENTS

1. Overall Vision and Aesthetic
2. Technology Stack and Project Structure
3. 3D Scene Architecture
4. The Platform and Environment
5. City Chambers — Complete Specifications
6. Agent Characters — Design and Behavior
7. Connection Lines and Data Flow
8. Camera System and Controls
9. Lighting and Post-Processing
10. HUD / UI Overlays
11. City Detail Panel (on click)
12. Interactions and State Management
13. Mock Data and Live Simulation
14. Implementation Plan for Claude Code
15. Final Acceptance Checklist

---

## 1. OVERALL VISION AND AESTHETIC

The Obsidian Ecosystem Command Center is a 3D, top-down, isometric-style view of a floating metallic platform in deep space, upon which 11 miniature cities (rooms/modules) are arranged. Each city is a tiny, highly detailed diorama populated by visible 3D agent characters who walk, work, and interact. The user can orbit the scene, click a city to zoom in and view its interior, and open a side panel with detailed information.

**Aesthetic keywords:** Cinematic, sci-fi, premium, living world, tangible, glass, neon, brushed metal, holographic, volumetric lighting, Studio Ghibli warmth mixed with Blade Runner's high-tech.

**Core experience:** The user feels like a sovereign observing a civilization from a floating command platform. They can descend into any city, see the agents working, and understand the ecosystem's state at a glance.

---

## 2. TECHNOLOGY STACK AND PROJECT STRUCTURE

### 2.1 Dependencies (package.json)

```json
{
  "name": "obsidian-command-center",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.4.5",
    "tailwindcss": "^3.4.3",
    "@react-three/fiber": "^8.16.1",
    "@react-three/drei": "^9.105.0",
    "@react-three/postprocessing": "^2.16.1",
    "three": "^0.164.1",
    "framer-motion": "^11.1.7",
    "zustand": "^4.5.2",
    "recharts": "^2.12.7",
    "lucide-react": "^0.378.0",
    "gsap": "^3.12.5",
    "@react-spring/three": "^9.7.3",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.2",
    "@types/three": "^0.164.0",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19"
  }
}
```

### 2.2 File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Scene.tsx                  # Main 3D canvas
│   ├── Platform.tsx              # The floating base
│   ├── CityChamber.tsx           # One city module
│   ├── AgentCharacter.tsx        # A single agent 3D figure
│   ├── ConnectionLines.tsx       # Data flow lines
│   ├── StarsAndNebula.tsx        # Background
│   ├── PostProcessing.tsx        # Bloom, etc.
│   ├── CameraController.tsx      # Camera logic
│   ├── HUD/
│   │   ├── TopBar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── BottomTimeline.tsx
│   │   └── CityDetailPanel.tsx
│   └── UI/
│       ├── GlassPanel.tsx
│       └── NeonBorder.tsx
├── store/
│   └── ecosystemStore.ts         # Zustand store
├── data/
│   └── mockData.ts               # All city & agent mock data
├── types/
│   └── index.ts                  # TypeScript interfaces
└── utils/
    └── helpers.ts
```

---

## 3. 3D SCENE ARCHITECTURE

### 3.1 Scene Setup (Scene.tsx)

- Use `<Canvas>` from React Three Fiber with `shadows`, `camera={{ position: [0, 20, 30], fov: 45, near: 0.1, far: 200 }}`.
- Enable `gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}`.
- Set `style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}`.

### 3.2 Coordinate System

- Y is up. The platform lies horizontally (XZ plane). The viewing angle is top-down isometric: camera position (10, 20, 20) looking at (0,0,0) by default.
- Each city chamber is placed on the platform at a specific (x, 0, z) position, rotated to face outward or inward as needed.

---

## 4. THE PLATFORM AND ENVIRONMENT

### 4.1 Platform Geometry

- A large hexagonal disc, radius 15 units, thickness 0.3 units.
- Top surface: dark brushed metal material, roughness 0.7, metalness 0.9, color `#1E2330`.
- Bottom surface: same but darker.
- Edge bevel: a 0.05-unit rounded rectangle extruded along the perimeter, material is emissive cyan `#4ECDC4` at 10% intensity.
- Grid: Use a `<Grid>` from Drei or a custom shader grid on the top surface. Lines every 1 unit, 0.03 unit thick, color `#4ECDC4` at 8% opacity, fading with distance.

### 4.2 Navigation Lights

- Small red (`#E63946`) and white (`#FFFFFF`) sphere lights placed along the hexagon edge every 2 units, positioned just above the surface. They blink slowly (period 1.2s, duty cycle 50%).

### 4.3 Particle Fog

- A giant `Points` object with 500 tiny particles (size 0.02, color `#4ECDC4`, opacity 0.3) scattered in a cylinder around the platform (radius 25, height 10). They move slowly upward and drift horizontally, then reset when out of bounds.

### 4.4 Background Stars and Nebula

- Stars: 3000 points of random size (0.01–0.04), colors sampled from a palette: 90% white/blue-white, 10% gold/cyan. Stored in a buffer geometry. Use a custom shader material with twinkling (multiply by a smooth noise function based on time and position).
- Nebula: A large sphere (radius 80) placed far behind the platform (z = -50). Use a `MeshStandardMaterial` with a custom texture or a `ShaderMaterial` with a procedural cloud noise, colored deep purple `#1A1030` fading to transparent at edges, with cyan `#00F5D4` wisps.

---

## 5. CITY CHAMBERS — COMPLETE SPECIFICATIONS

There are 11 city chambers arranged in a ring on the platform. Each chamber is a rectangular glass box with interior objects and agent characters. The chambers are placed at a radius of 10 from the center, at equal angles (360/11 ≈ 32.7°). They are rotated so that their open side faces the center.

**Chamber coordinates:** For city index i (0–10), angle = `i * (2*Math.PI/11) - Math.PI/2`. Position = `(cos(angle)*10, 0, sin(angle)*10)`. The chamber is then rotated by angle around Y so its "front" faces inward.

### 5.1 Chamber Exterior (Glass Box)

- Dimensions: width 2.5, height 1.8, depth 1.8.
- Frame: 0.08-unit thick box edges (`BoxGeometry` for edge pieces), material dark metal (`#1A1A2E`, roughness 0.4, metalness 0.8).
- Glass panels: six `PlaneGeometry` (front, back, left, right, top, bottom) with `MeshPhysicalMaterial` { roughness: 0.1, metalness: 0, clearcoat: 0.2, transmission: 0.9, ior: 1.5, color: `#FFFFFF` }.
- Neon trim: thin (0.02-unit) `BoxGeometry` strips along all edges, color = city's accent color, emissive with intensity 2.0.

### 5.2 City-Specific Interiors

Each city has a unique interior diorama built from simple geometries and animated elements. See per-city chamber blocks below, plus `docs/cities/` for the full textual spec.

#### City 1: Aletheia (Trading & Signals)
- Color: Verdigris `#4ECDC4`
- Interior layout: Mini trading floor. On the floor is a grid of 3x3 tiny desks (boxes 0.1x0.05x0.1) with tiny monitors (rotated planes). In the center, a holographic ticker display: a rotating ring with floating stock symbols (text sprites).
- Agents: 6, wearing suits (dark body, white collar). They stand near desks, occasionally moving between them. One agent stands at a podium pointing at the ticker.
- Animation: Ticker ring rotates continuously. Monitor screens flicker with random color blocks. Agents gesture (arm raise) every few seconds.
- Props: 9 desk boxes, 9 monitor planes, 1 podium, 1 ticker ring.

#### City 2: Mnemosyne (Knowledge & Memory)
- Color: Solar Gold `#FFD166`
- Interior: Central dome (semi-sphere radius 0.6) with a glowing golden orb inside. Shelves along walls: rows of tiny boxes (books) on brackets.
- Agents: 4, wearing robes (long oval bodies). They float slightly above the floor and orbit the dome.
- Animation: Dome orb pulses brightness. Floating agents gently bob and orbit.
- Props: dome, orb, 20 tiny shelf boxes.

#### City 3: Prometheus (Research)
- Color: Cyan Aurora `#00F5D4`
- Interior: Two glass domes (spheres) with spinning data rings inside. One contains a small lightning bolt (zigzag line that flashes).
- Agents: 5, wearing lab coats (white body, black glasses). They move between domes, sometimes stopping to "write" on a floating clipboard.
- Animation: Lightning flickers at random intervals. Rings spin.
- Props: 2 domes, 2 data rings, 1 lightning bolt mesh.

#### City 4: Hephaestus (Infrastructure)
- Color: Ember `#FF6B35`
- Interior: Server racks (3 tall boxes with blinking LED strips). Cables (bezier curves) connecting racks.
- Agents: 3, wearing technician outfits (orange vest, dark pants). They walk along the racks, occasionally stopping to "inspect" a rack (lean forward).
- Animation: LEDs blink in patterns. Cables pulse with orange light.
- Props: 3 rack boxes, LED strips, cables.

#### City 5: Themis (Governance)
- Color: Lunar Silver `#E0E0E0`
- Interior: Columns (thin cylinders) forming a small courthouse. In the center, a tiny scale of justice (two plates on a beam).
- Agents: 3, wearing formal robes (black and white). They stand in a semi-circle facing the scale.
- Animation: Scale occasionally tips slightly back and forth if risk levels change.
- Props: 6 columns, scale model.

#### City 6: Agora (External Comms)
- Color: Ghost White `#F8F9FA`
- Interior: Satellite dishes (small cones) facing outward. A miniature port with tiny ships (flat ellipses) docked.
- Agents: 4, wearing comms gear (headset). They stand by the dishes. Occasionally a ship moves to the edge of the chamber and returns.
- Animation: Dishes rotate slowly. Ships glide.
- Props: 3 dishes, 2 ships.

#### City 7: Iris (Monitoring)
- Color: Deep Amethyst `#7209B7`
- Interior: Radar screen (a rotating line on a circle). Floating "eye" triangles that scan the room.
- Agents: 3, wearing dark uniforms with purple visors. They stand at attention.
- Animation: Radar line rotates. Eyes pulsate.
- Props: 1 radar dish, 2 floating eye triangles.

#### City 8: Chronos (Time)
- Color: Pure White `#FFFFFF`
- Interior: Giant pendulum (a sphere on a rod) swinging. Clock faces on the walls.
- Agents: 2, wearing clockwork-themed outfits (brass gears on chest). They observe the pendulum.
- Animation: Pendulum swings with physics. Clock hands move.
- Props: pendulum, 3 wall clocks.

#### City 9: Narcissus (Self-Architecture)
- Color: Mirror (highly reflective) with cyan highlights
- Interior: A miniature replica of the entire command platform (a smaller hexagon with tiny city blocks). A reflective pool (plane with mirror material) on the floor.
- Agents: 2, wearing mirror-like silver suits. They stand still, observing the mini platform.
- Animation: Mini platform updates in sync with the main platform (self-similarity).
- Props: mini hexagon, mirror pool.

#### City 10: Eris (Adversary)
- Color: Crimson Forge `#E63946`
- Interior: Dark, chaotic. Inverted spires hanging from the ceiling. Broken circuits (line segments) that spark occasionally. Red smoke particles.
- Agents: 3, wearing dark, spiky armor. They move erratically, sometimes glitching (rapid position changes).
- Animation: Smoke particles swirl. Spires slowly rotate. Sporadic sparks.
- Props: 4 inverted spires, smoke particle system.

#### City 11: Janus (Physical Gateway)
- Color: Split color: left side silver, right side deep blue `#0B1D3A`
- Interior: A two-faced archway. On one side, a miniature satellite and sensor array. On the other, a small factory arm (a simple robotic arm).
- Agents: 2, one silver suit, one blue suit. They stand on opposite sides of the arch.
- Animation: Robotic arm moves a tiny cube back and forth. Sensor array rotates.
- Props: archway, satellite, robotic arm.

---

## 6. AGENT CHARACTERS — DESIGN AND BEHAVIOR

Agents are not dots; they are fully modeled 3D characters. Each agent consists of:

- **Body**: A capsule or cylinder for the torso, cylinders/boxes for limbs, and a sphere for the head.
- **Clothing**: Colored materials matching their city and role.
- **Accessories**: Hats, tools, glowing ID badges, etc.
- **Animations**: Walking (bob up/down, limb swing), idle (slight sway), gesture (raise arm), working (lean forward, typing).

### 6.1 Agent Model Construction

Use a reusable `AgentCharacter` component that receives props: `agentId`, `cityColor`, `role`, `outfit`, `accessory`, `animationState`.

**Body parts (all measurements in world units, relative to agent's local coordinate system):**
- **Torso**: `CapsuleGeometry(0.12, 0.35, 4, 8)`, material = `MeshStandardMaterial` with color from outfit.
- **Head**: `SphereGeometry(0.1, 8, 8)`, positioned above torso (y=0.25), same material. Eyes: two small black spheres (0.02 radius) placed on front of head.
- **Arms**: `CapsuleGeometry(0.04, 0.25, 4, 6)` for upper arm, same for lower arm, connected via a shoulder joint (positioned on torso side). The hand is a small sphere (0.03). Left/right mirrored.
- **Legs**: `CapsuleGeometry(0.05, 0.3, 4, 6)` for thigh, similar for calf, feet: boxes (0.06, 0.03, 0.1).
- **Accessory**: Depends on role. Examples: glasses (two rings), helmet (half sphere), tool (a wrench or clipboard), wings (for floating agents), etc. Attached to head or hand as appropriate.

**Materials**: Use `MeshToonMaterial` or `MeshStandardMaterial` with roughness 0.6 for a slightly stylized look, not photoreal.

### 6.2 Agent Skeleton and Animation

For simplicity, instead of a full skeleton, animate limbs by rotating them around their pivot point using `useFrame`. Each limb is a `<group>` that can be rotated. For walking:

- Thigh swings forward/backward (±0.3 rad) with sin(time*speed).
- Lower leg compensates slightly.
- Arms swing opposite to legs.
- Body bobs up and down (±0.03) with a double-frequency sine.

Idle: slight sway (body rotation on Z axis ±0.02 rad). Gesture: one arm raises 45° over 0.5s then drops.

### 6.3 Agent Pathfinding and Movement

Within a city chamber, agents follow predefined waypoints. Waypoints are arranged in a loop (e.g., corners and center). In `useFrame`, move agent position linearly toward current waypoint at a speed of 0.3 units/sec. When within 0.1 of waypoint, switch to next. Agents should face direction of movement (rotate body group).

### 6.4 Agent IDs and Roles (per city)

Each city has a set of agents defined in mock data. For example, Aletheia: momentum-agent-01, risk-overlord, signal-blender, etc. Their appearance is generated procedurally based on agent ID (use a simple hash to pick colors, accessories) so they are consistent across sessions.

---

## 7. CONNECTION LINES AND DATA FLOW

Between chambers, draw animated Bezier curves representing real-time data transfer.

- Use Drei's `<Line>` with a custom dashed material, or create a `TubeGeometry` along a `CubicBezierCurve3`.
- Line thickness: 0.03. Color: match source city's accent.
- Animation: The dash offset or a moving gradient texture is shifted over time to indicate flow direction (from source to target). Achieve via a custom shader material with `uTime` uniform, or by moving a texture along the curve.
- Connection pairs: Predefined based on the ecosystem map (e.g., Aletheia ↔ Mnemosyne, Prometheus ↔ Aletheia, etc.). Show all active connections, but only animate those that have had recent message traffic (based on mock data updates).
- When a new "advancement" occurs (mock event), a glowing orb (sphere) travels along the curve from one city to another over 2 seconds, then fades.

---

## 8. CAMERA SYSTEM AND CONTROLS

Use Drei's `OrbitControls` with careful limits.

- **Default view**: Camera at (8, 14, 18), target (0,1,0). This gives an isometric overview.
- **Auto-rotate**: If user hasn't interacted for 5 seconds, slowly rotate around the Y axis at 0.05 rad/s. Stop on any user interaction.
- **Orbit limits**:
  - `enableDamping`: true
  - `minDistance`: 8
  - `maxDistance`: 30
  - `maxPolarAngle`: `Math.PI/2.5` (limit to mostly top-down)
  - `minPolarAngle`: `Math.PI/4`
  - `enablePan`: false (user can only orbit and zoom)
- **Click a city**: When user clicks a chamber (raycasting), the camera smoothly animates (GSAP) to a position 4 units away from the chamber's front center, looking at the chamber's center. The chamber's glass opacity reduces to 0.3 so interior is clearly visible. A side panel opens (see section 10).
- **Click empty space or press "Back to Ecosystem"**: Camera returns to default overview.

---

## 9. LIGHTING AND POST-PROCESSING

### 9.1 Lighting

- Ambient light: `color="#404060" intensity={0.4}`
- Main directional light: `position={[20, 30, 10]} intensity={1.5} castShadow` (shadow map 2048x2048, PCF soft). Color: warm white `#FFF3E0`.
- Fill light: `position={[-10, 10, -10]} intensity={0.5}` cool blue `#AAC8FF`.
- Point lights near each city: one per city, placed 1 unit above center, color matching city accent, intensity 0.5, distance 4. Casts soft glow on interior.

### 9.2 Post-Processing

Use `@react-three/postprocessing` with the following effects in this order:

1. `Bloom`: intensity 0.5, luminanceThreshold 0.2, radius 1.
2. `Vignette`: darkness 0.3, offset 0.1.
3. `ChromaticAberration`: offset 0.001 (very subtle).
4. `Scanline`: density 2048, opacity 0.03.
5. `Noise`: opacity 0.01.
6. `GodRays` (optional): from the sun light, if performance permits.

---

## 10. HUD / UI OVERLAYS

All UI is rendered as HTML/CSS overlaid on the 3D canvas using absolute positioning, with backdrop blur and glassmorphism styling.

### 10.1 Top Bar (fixed, top, full width, z-index 10)

- Height: 56px.
- Background: `bg-[#0A0A0F]/70 backdrop-blur-xl border-b border-[#2A2A3E]/50`.
- Left section: Logo "ORUX AGENT COMMAND" in Cinzel font, text-gold `#FFD166`, size 18px, letter spacing 4px.
- Center: Status indicator: a green (`#4ECDC4`) pulsing dot + "LIVE" text. Next to it, mode switch pills: "SIMULATION" (active) / "REAL-TIME" (inactive). Search input with glass styling, placeholder "Find agent, task, signal…".
- Right section: Current UTC time (digital, monospace). A crown icon indicating "Owner Connected" (always on for mock).

### 10.2 Right Sidebar (fixed, right, top 56px to bottom, width 320px, z-index 10)

- Glass panel: `bg-[#121624]/70 backdrop-blur-xl border-l border-[#2A2A3E]/50`.
- Sections (scrollable):
  - **Active Missions**: list of current backtests, dream sessions, with progress bars.
  - **Latest Agent Alerts**: scrollable log, each entry color-coded (info/cyan, warning/orange, error/red). Timestamp and message.
  - **System Health**: inline bars (CPU, Memory, Disk, Network). Realistic mock values that fluctuate.
  - **Risk Warnings**: a list of cities with elevated risk, with red pulsing indicators.
  - **Pending Human Approvals**: mock items (e.g., "Approve new strategy", "Confirm parameter change").

### 10.3 Bottom Timeline (fixed, bottom, full width, height 40px, z-index 10)

- Glass panel as top.
- Horizontal scrollable list of recent activity items. Each item is a small capsule with left border colored by city accent. Text: timestamp + agent action (e.g., "14:32:05 momentum-agent-01: BUY AAPL signal 0.72").
- New items slide in from left, oldest fade out.

### 10.4 City Detail Panel (right side, overlays sidebar)

Appears when a city is clicked. It slides in from the right (Framer Motion) on top of the right sidebar, width 420px.

- Header: city name in Cinzel, status badge, close button.
- Agent roster: list of agents in that city with status dot, current task, performance sparkline (Recharts mini line chart).
- Live signals (for applicable cities): table with symbol, direction, confidence bar.
- Risk level: gauge (CSS) or progress bar.
- Recent logs: terminal-style text block.
- Connected cities: small icon buttons that can be clicked to jump to that city.

---

## 11. CITY DETAIL PANEL (on click)

Implementation details:

- The panel uses Framer Motion `motion.div` with `initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}`.
- Data is pulled from Zustand store based on `selectedCityId`.
- The panel's content scrolls independently.
- Each agent row is interactive: click to highlight that agent in the 3D view (camera points to it, agent briefly pulses).

---

## 12. INTERACTIONS AND STATE MANAGEMENT

### 12.1 Zustand Store (ecosystemStore.ts)

```typescript
interface CityData {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  status: 'healthy' | 'degraded' | 'critical' | 'dreaming';
  agents: AgentData[];
  metrics: { cpu: number; memory: number; risk: number; sharpe?: number; };
  logs: LogEntry[];
  signals?: Signal[];
  position: [number, number, number];
  rotation: number;
}

interface AgentData {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'sleeping' | 'error' | 'retired';
  task: string;
  performance: number[]; // last 20 data points for sparkline
  position_in_chamber: [number, number, number];
}

interface EcosystemStore {
  cities: CityData[];
  selectedCityId: string | null;
  selectCity: (id: string | null) => void;
  updateCity: (id: string, patch: Partial<CityData>) => void;
  currentTime: number;
}
```

### 12.2 Interactions

- **Hover** over a chamber: slight glow increase (emissive boost on neon trim) and cursor pointer.
- **Click** on chamber: `selectCity(id)` → camera animation + panel open.
- **Click** on agent within chamber (raycasting): if city is selected, focus on that agent; otherwise, select city and then focus.
- **Double-click** empty space: deselect city, camera returns.
- **Keyboard**: ESC deselects.

---

## 13. MOCK DATA AND LIVE SIMULATION

### 13.1 Initial Data (mockData.ts)

Define all 11 cities with their agents, initial metrics, and logs. The data is static but realistic. Example for Aletheia:

```typescript
export const initialCities: CityData[] = [
  {
    id: 'aletheia',
    name: 'Aletheia',
    color: '#4ECDC4',
    accentColor: '#4ECDC4',
    status: 'healthy',
    position: [10, 0, 0],
    rotation: 0,
    agents: [
      {
        id: 'momentum-01',
        name: 'Momentum Agent',
        role: 'Trader',
        status: 'active',
        task: 'Analyzing AAPL',
        performance: [0.1, 0.2, /* ... */],
        position_in_chamber: [0.4, 0, 0.4]
      },
      // ... 5 more agents
    ],
    metrics: { cpu: 34, memory: 56, risk: 42, sharpe: 1.2 },
    logs: [
      { time: '14:32:05', message: 'Generated BUY signal AAPL', level: 'info' },
      // ...
    ],
    signals: [
      { symbol: 'AAPL', direction: 'BUY', confidence: 0.72 },
      // ...
    ]
  },
  // ... other 10 cities
];
```

### 13.2 Live Simulation

In a `useEffect` in the Scene component (or a dedicated hook), run a `setInterval` (every 2 seconds) that updates the Zustand store:

- Randomly change some agent's status or task.
- Append new log entries (trim to last 50).
- Fluctuate metrics within realistic ranges.
- Randomly trigger a "data flow" event that animates a connection line orb.
- Update agent positions slightly (they move toward waypoints).

This makes the UI feel alive.

---

## 14. IMPLEMENTATION PLAN FOR CLAUDE CODE

Build in this order:

1. **Project scaffolding**: Create Next.js app, install dependencies, set up Tailwind, global CSS.
2. **Types and store**: Define TypeScript interfaces, set up Zustand store.
3. **Mock data**: Populate all 11 cities with full data.
4. **Basic 3D scene**: Canvas, platform, camera, basic lighting.
5. **City chambers**: Build the external glass box with neon trim. Place all 11.
6. **Agent characters**: Create the `AgentCharacter` component with body parts and basic animation.
7. **Populate interiors**: Add props and agents to each city.
8. **Connection lines**: Add animated Bezier curves between cities.
9. **Post-processing and environment**: Add stars, nebula, fog, bloom.
10. **HUD overlays**: Top bar, right sidebar, bottom timeline.
11. **City detail panel**: Implement the slide-in panel with data.
12. **Interactions**: Raycasting for city selection, camera animation, agent selection.
13. **Live simulation**: Wire up the interval to update mock data and animate accordingly.
14. **Polishing**: Adjust materials, animations, performance.

---

## 15. FINAL ACCEPTANCE CHECKLIST

- All 11 city chambers are visible with distinct interiors and colors.
- Agents are visible 3D characters that move and animate.
- Connection lines pulse and flow.
- Clicking a city zooms in and opens a detail panel with accurate data.
- HUD is fully functional and shows live-updated information.
- The background is stunning: stars, nebula, fog.
- Post-processing bloom and glow create a premium feel.
- Performance: 30+ FPS on a mid-range GPU.
- No console errors or warnings.
- Code is well-structured and clean.

---

**This is the complete specification. Implement every detail exactly. No shortcuts. No generic fallbacks. Build the Obsidian Ecosystem Command Center as described.**
