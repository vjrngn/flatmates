# flatmates: Product Roadmap & Progress

## Project Description
**flatmates** is a crowdsourced platform designed to simplify the rental discovery process in high-density urban environments (specifically tailored for the Indian market). It allows users to act as both **Posters** (listing available flats/rooms) and **Seekers** (finding a place to live).

### Core Philosophy:
- **Spatial First:** Discovery happens on a map, not a list.
- **Context Aware:** Captures cultural and landlord-imposed restrictions common in India (Dietary preferences, Religion, Marital status, etc.).
- **Crowdsourced:** Relies on community-driven listings which are later verified via an agentic workflow.
- **High Density Support:** Built to handle multiple unique listings at the same geographic coordinate (e.g., apartment complexes).

---

## ✅ Completed (Done)

### Infrastructure & Backend
- [x] **Project Scaffolding:** Next.js 16 (App Router) with TypeScript and Tailwind CSS 4.
- [x] **Supabase Integration:**
    - SSR-ready client setup (`@supabase/ssr`) for secure server-side database access.
    - Permissive session middleware for automatic token refreshing.
    - Local development stack running via Docker/CLI.
- [x] **OTP Authentication (Phone):**
    - Modal-based login flow.
    - Integrated with Supabase Auth for SMS-based verification.
    - Floating profile UI for session management.
- [x] **Geospatial Database (PostGIS):**
    - Enabled `postgis` extension.
    - Schema: `profiles` and `listings` tables.
    - **Spatial Indexing:** GIST index on `location` (geography point) for high-performance radius queries.
    - **Optimized API:** Database RPC function `get_listings_with_coords` to handle coordinate transformation and radius filtering in SQL.
- [x] **Seed Data:** Initial Bangalore-based dummy listings for immediate development and testing.

### Frontend & UI
- [x] **Map Integration:** Full-screen implementation using `@vis.gl/react-google-maps`.
- [x] **Shadcn/UI Integration:** Configured with custom theme support.
- [x] **Seeker Experience:**
    - Draggable "Search Pin" (Blue) to define search center.
    - Radius Slider (Shadcn) to dynamically adjust search range (500m to 20km).
    - Real-time reactive updates: Map markers refresh instantly when radius or position changes.
- [x] **Poster Experience:**
    - "Click-to-Post" map interaction: Clicking any point on the map captures lat/long.
    - Modal-based listing form (Shadcn Dialog).
    - Support for BHK types, Rent (INR), Amenities, and custom Occupancy Rules.
- [x] **Listing Details:** Interactive yellow markers with InfoWindows showing rent, BHK type, and badges for amenities.

---

## 🚀 Next Steps (To-Do)

### Product Refinement
- [ ] **Advanced Filtering:** Add UI toggles for Veg/Non-Veg, Bachelors, etc., to the seeker view.
- [ ] **Image Support:** Integration with Supabase Storage for property photos.
- [ ] **Agentic Flow:** Initial design of the verification layer to mark listings as "Verified".
- [ ] **My Listings:** Create a view for users to manage their own posts.
