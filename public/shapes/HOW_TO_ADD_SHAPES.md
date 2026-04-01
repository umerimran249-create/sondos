# How to Add Custom Shapes

## Quick Steps

1. **Put your image here** — copy your PNG, JPG or SVG into this `/public/shapes/` folder.
   - Best results with transparent background (PNG / SVG)
   - Recommended size: at least 200 × 150 px

2. **Open the component** — `components/QuoteDrawingCanvas.tsx`

3. **Find the template array** near the top (around line 50) — it says:
   ```
   const CUSTOM_SHAPE_TEMPLATES: ShapeTemplate[] = [
   ```

4. **Add your shape entry** like this:

```typescript
{
  id: "my-shape",            // unique slug, no spaces
  label: "My Shape",         // shown in the panel
  kind: "countertop",        // countertop | island | backsplash | cutout
  stroke: "#D4AF37",         // border colour on canvas
  image: "/shapes/my-shape.png",  // path from /public/
  defaultWidthFt: 4,         // starting width in feet
  defaultHeightFt: 2,        // starting height in feet
  defaultCorners: 4,         // how many corners (affects add-on cost)
},
```

---

## For Accurate Square Footage (Optional)

If you want the exact sqft calculated from your shape's outline (instead of width × height),
add `normalizedPoints` — the shape's polygon outline as 0-to-1 coordinates:

- `(0, 0)` = top-left corner of the bounding box
- `(1, 1)` = bottom-right corner
- Trace the shape **clockwise**

Example — Peninsula (a rectangle with a notch cut out of one side):
```typescript
normalizedPoints: [
  { x: 0,    y: 0 },
  { x: 1,    y: 0 },
  { x: 1,    y: 0.6 },
  { x: 0.5,  y: 0.6 },
  { x: 0.5,  y: 1 },
  { x: 0,    y: 1 },
],
```

---

## Common Shape Examples

| Shape | Stroke Colour |
|-------|--------------|
| Countertop | `#D4AF37` (gold) |
| Island | `#60a5fa` (blue) |
| Backsplash | `#a855f7` (purple) |
| Cutout | `#f97316` (orange) |
| Specialty | `#4ade80` (green) |
