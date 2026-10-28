# Community Room Icon Studio — Implementation Plan

## 1. Overview & Goals
Empower users to craft distinctive, high-contrast room icons when creating a new Community Room and allow room creators or admins to customize existing room icons at any time. The **Room Icon Studio** will combine custom multi-color vector SVG emblems, stylized monogram initials, and curated emojis with layered badge styling (curated gradients, solid colors, neon glow accents, and selectable badge shapes) while remaining 100% compatible with the existing Supabase `community_rooms` schema (`icon_emoji` and `icon_bg`).

---

## 2. Visual & Customization Architecture

### A. Three Visual Foreground Modes (`icon_emoji` Serialization)
To avoid breaking existing rooms or requiring destructive database migrations, `icon_emoji` and `icon_bg` will support both legacy values (plain emoji/hex) and a structured studio descriptor format:
- **1. Custom SVG Emblem Library (`svg:<emblem-id>`)**:
  - A curated gallery of 24+ bespoke vector SVG emblems tailored to campus & community culture (e.g., Campus Crown, Neon Lightning, Late-Night Moon, Study Flame, Code Brackets, Gaming Controller, Microphone/Podcast, Coffee Cup, Secret Mask, Varsity Trophy, Heart Pulse, Rocket Launch, Confessions Lock, Music Vinyl, Academic Cap, megaphone, etc.) plus existing `BopoiIcon` category artwork.
- **2. Monogram Initials (`mono:<1-3 chars>`)**:
  - Clean, high-contrast typographic badge mode where users can type 1–3 custom characters (or auto-derive initials from the room `#name`, e.g., `UL`, `CS`, `404`) rendered with crisp geometric display typography.
- **3. Emoji Picker (`<emoji>` or `emoji:<char>`)**:
  - Organized quick-pick emoji grid across Campus, Vibe, Tech, Sports, and Nightlife categories.

### B. Multi-Layer Badge Styling (`icon_bg` Serialization)
`icon_bg` will encode the complete badge style configuration (backward-compatible with plain hex strings like `#5420F5`):
- **Fill Style**:
  - **Curated Gradients**: 12+ designer multi-stop gradients (e.g., *Electric Violet*, *Midnight Cyber*, *Sunset Coral*, *Emerald Aurora*, *Crimson Pulse*, *Oceanic Indigo*, *Gold Prestige*, *Obsidian Neon*).
  - **Solid Colors**: 12+ high-contrast campus palette swatches plus custom hex support.
- **Selectable Badge Shapes**:
  - `squircle` (Signature rounded-2xl container — default)
  - `hexagon` (Precision geometric hex badge via SVG clip-path/border)
  - `shield` (Crest/varisty shield silhouette)
  - `circle` (Classic circular emblem)
  - `diamond` (Rotated rounded crest)
- **Neon Glow & Ring Accents**:
  - Toggleable ambient aura glow (`none`, `soft-glow`, `neon-ring`, `double-crest`) that renders an outer luminescence and crisp inner specular border matched to the badge's primary hue.

---

## 3. Component & File Breakdown

### 1. `src/utils/roomIconConfig.ts` (New Utility & Serializer)
- Defines `RoomIconConfig` interface:
  - `mode: 'svg' | 'monogram' | 'emoji'`
  - `value: string` (SVG emblem ID, monogram characters, or emoji)
  - `fillType: 'gradient' | 'solid'`
  - `fillValue: string` (gradient preset ID or hex color)
  - `shape: 'squircle' | 'hexagon' | 'shield' | 'circle' | 'diamond'`
  - `glow: 'none' | 'soft' | 'neon' | 'crest'`
- Provides `parseRoomIcon(iconEmoji, iconBg, fallbackCategory)` and `serializeRoomIcon(config)` so existing rooms and newly customized rooms render seamlessly everywhere.
- Includes a "Randomize / Surprise Me" generator for one-tap high-taste icon combinations.

### 2. `src/components/brand/icons/RoomBadgeIcon.tsx` (New Universal Renderer)
- Renders any room's customized icon consistently at `sm` (28px), `md` (40px), `lg` (48px), and `xl` (64px) sizes.
- Handles the SVG clip-paths/frames for **Squircle, Hexagon, Shield, Circle, and Diamond** shapes, applies the selected solid or multi-stop gradient fill, renders the neon glow/crest ring, and displays the chosen custom SVG emblem, crisp monogram, or emoji inside.

### 3. `src/components/modals/RoomIconStudioPicker.tsx` (New Interactive Studio Component)
- Interactive, touch-friendly studio panel with:
  - **Live Interactive Preview Header**: Shows the room badge at full scale inside a simulated room card header with a **"Surprise Me"** randomizer button.
  - **Tab 1 — Emblem / Content**: Switch between **Custom SVG Emblems**, **Monogram (1–3 chars)**, and **Emoji Grid**.
  - **Tab 2 — Palette & Glow**: Choose between **Curated Gradients**, **Solid Swatches**, and **Neon Glow / Ring Accents**.
  - **Tab 3 — Badge Shape**: Visual selector for **Squircle**, **Hexagon**, **Shield**, **Circle**, and **Diamond** silhouettes.

### 4. Integration Across Room Workflows
- **Room Creation (`src/components/modals/CreateRoomModal.tsx`)**:
  - Embeds the `RoomIconStudioPicker` directly in the room creation flow so creators can design their room's visual identity before launching.
- **Post-Creation Editing (`src/components/views/RoomDetailView.tsx` & `src/context/BopoiContext.tsx`)**:
  - Adds `updateRoomIcon(roomId, iconEmoji, iconBg)` to `BopoiContext` (persisting to `public.community_rooms` in Supabase and updating local state + realtime broadcast).
  - In `RoomDetailView`, if the signed-in user is the **room creator** (`activeRoom.creatorId === user.id`) or an **admin** (`isAdminAccount`), displays an interactive **"Customize Icon"** trigger on the room badge and inside the Room Info drawer, opening a dedicated **Edit Room Icon Modal**.
- **Consistent Rendering Everywhere (`RoomsView.tsx`, `RoomDetailView.tsx`, `HomeFeedView.tsx`, `AdminView.tsx`)**:
  - Upgrades room cards and headers to render via `<RoomBadgeIcon />` so custom shapes, gradients, SVG emblems, monograms, and glow effects appear consistently across the entire app.

---

## 4. Security & Database Persistence
- Uses existing `icon_emoji` and `icon_bg` columns in `public.community_rooms`.
- Adds an RLS UPDATE policy check in `supabase/schema.sql` / `src/data/adminSqlScript.ts` ensuring only the room creator (`auth.uid() = creator_user_id`) or a verified database admin (`public.is_admin()`) can update a room's icon.
