-- polish-menu-desk (design D3): cleanup pass for a rasterized desk sprite.
--
--   aseprite -b --script-param name=<sprite> --script-param src=<png>
--            --script-param png=<out.png> --script-param ase=<out.aseprite>
--            --script tools/aseprite/desk-cleanup.lua
--
-- Every source colour is mapped by hand (below) to a material ramp of at most
-- four shades from art-src/menu/desk-palette.pal. The pass then flattens dither
-- noise into patches, lights the top-left edges, shades the bottom-right edges,
-- draws a 1 px outline in the palette's darkest brown, and moves the art down so
-- its lowest opaque pixel touches the bottom row. The old sprite is kept in the
-- .aseprite source as a locked, hidden "reference" layer.

local P = app.params
local pc = app.pixelColor

local function rgb(r, g, b) return { r, g, b } end

-- Material ramps, dark to light (desk-palette.pal).
local RAMPS = {
  navy = { rgb(44, 58, 82), rgb(59, 74, 107), rgb(63, 90, 122), rgb(111, 143, 174) },
  green = { rgb(27, 69, 54), rgb(46, 97, 80), rgb(79, 128, 106), rgb(107, 154, 127) },
  leather = { rgb(46, 20, 12), rgb(74, 34, 22), rgb(107, 52, 32), rgb(138, 74, 44) },
  paper = { rgb(90, 74, 48), rgb(138, 115, 80), rgb(178, 154, 108), rgb(205, 184, 139) },
  gilt = { rgb(109, 81, 48), rgb(168, 135, 63), rgb(224, 184, 90), rgb(244, 207, 115) },
  dark = { rgb(18, 13, 8), rgb(42, 31, 20), rgb(58, 43, 27) },
  label = { rgb(44, 58, 82), rgb(111, 143, 174), rgb(143, 163, 196) },
}
local OUTLINE = rgb(18, 13, 8)

-- Source colour "r g b" -> { material, shade }.
local MAPS = {
  -- The groove shimmer over the record: a pale sheen on the dark shellac.
  -- Recoloured only (PLAIN), so it stays aligned with the body's disc.
  ['gramophone-grooves'] = {
    ['109 81 48'] = { 'paper', 1 }, ['168 135 63'] = { 'paper', 2 }, ['201 182 143'] = { 'paper', 3 },
  },
  ['campaign-book-closed'] = {
    ['58 58 58'] = { 'navy', 1 }, ['36 52 81'] = { 'navy', 1 }, ['27 39 64'] = { 'navy', 1 },
    ['46 63 99'] = { 'navy', 2 }, ['70 91 134'] = { 'navy', 3 }, ['110 110 110'] = { 'navy', 3 },
    ['88 112 156'] = { 'navy', 4 }, ['114 135 173'] = { 'navy', 4 }, ['160 160 160'] = { 'navy', 4 },
    ['207 207 207'] = { 'navy', 4 },
    ['110 90 62'] = { 'paper', 1 }, ['143 118 85'] = { 'paper', 2 }, ['179 154 113'] = { 'paper', 3 },
    ['201 177 132'] = { 'paper', 4 }, ['240 224 189'] = { 'paper', 4 },
    ['140 99 32'] = { 'gilt', 1 }, ['184 132 42'] = { 'gilt', 2 },
    ['11 16 32'] = { 'dark', 1 }, ['16 24 40'] = { 'dark', 1 }, ['8 6 4'] = { 'dark', 1 },
    ['0 0 0'] = { 'dark', 1 }, ['36 24 17'] = { 'dark', 1 }, ['58 36 22'] = { 'dark', 2 },
  },
  ['compendium-book-closed'] = {
    ['20 53 42'] = { 'green', 1 }, ['27 69 54'] = { 'green', 1 }, ['35 80 64'] = { 'green', 1 },
    ['58 58 58'] = { 'green', 1 }, ['46 97 80'] = { 'green', 2 }, ['58 107 86'] = { 'green', 2 },
    ['79 128 106'] = { 'green', 3 }, ['110 110 110'] = { 'green', 3 }, ['107 154 127'] = { 'green', 4 },
    ['110 90 62'] = { 'paper', 1 }, ['143 118 85'] = { 'paper', 2 }, ['179 154 113'] = { 'paper', 3 },
    ['201 177 132'] = { 'paper', 4 },
    ['140 99 32'] = { 'gilt', 1 },
    ['16 36 26'] = { 'dark', 1 }, ['12 28 22'] = { 'dark', 1 }, ['7 19 14'] = { 'dark', 1 },
    ['0 0 0'] = { 'dark', 1 }, ['8 6 4'] = { 'dark', 1 }, ['36 24 17'] = { 'dark', 1 },
    ['21 16 12'] = { 'dark', 1 },
  },
  ['references-books'] = {
    ['42 15 13'] = { 'leather', 1 }, ['74 31 28'] = { 'leather', 2 }, ['107 45 39'] = { 'leather', 3 },
    ['141 69 59'] = { 'leather', 4 }, ['168 90 75'] = { 'leather', 4 },
    ['110 90 62'] = { 'paper', 2 }, ['143 118 85'] = { 'paper', 2 }, ['110 110 110'] = { 'paper', 2 },
    ['179 154 113'] = { 'paper', 3 }, ['201 177 132'] = { 'paper', 4 }, ['224 203 162'] = { 'paper', 4 },
    ['90 61 20'] = { 'gilt', 1 }, ['140 99 32'] = { 'gilt', 1 }, ['184 132 42'] = { 'gilt', 2 },
    ['217 164 65'] = { 'gilt', 3 },
    ['8 6 4'] = { 'dark', 1 }, ['0 0 0'] = { 'dark', 1 }, ['12 28 28'] = { 'dark', 1 },
    ['21 16 12'] = { 'dark', 1 }, ['36 24 17'] = { 'dark', 1 }, ['20 48 46'] = { 'dark', 2 },
    ['58 36 22'] = { 'dark', 2 }, ['58 40 15'] = { 'dark', 2 }, ['46 90 88'] = { 'dark', 2 },
    ['58 58 58'] = { 'dark', 3 },
  },
  ['gramophone-body'] = {
    ['109 81 48'] = { 'gilt', 1 }, ['168 135 63'] = { 'gilt', 2 }, ['224 184 90'] = { 'gilt', 3 },
    ['244 207 115'] = { 'gilt', 4 }, ['239 226 196'] = { 'gilt', 4 },
    ['46 20 12'] = { 'leather', 1 }, ['74 34 22'] = { 'leather', 2 }, ['107 52 32'] = { 'leather', 3 },
    ['142 58 44'] = { 'leather', 3 }, ['138 74 44'] = { 'leather', 4 }, ['163 71 58'] = { 'leather', 4 },
    ['90 74 48'] = { 'gilt', 1 }, ['138 115 80'] = { 'gilt', 1 }, ['178 154 108'] = { 'gilt', 2 },
    ['205 184 139'] = { 'gilt', 3 }, ['201 182 143'] = { 'gilt', 3 }, ['226 209 170'] = { 'gilt', 4 },
    ['18 13 8'] = { 'dark', 1 }, ['27 20 13'] = { 'dark', 1 }, ['42 31 20'] = { 'dark', 2 },
    ['58 43 27'] = { 'dark', 3 },
    ['44 58 82'] = { 'dark', 2 }, ['59 74 107'] = { 'dark', 2 }, ['63 90 122'] = { 'label', 1 },
    ['111 143 174'] = { 'label', 2 }, ['143 163 196'] = { 'label', 3 },
  },
}

-- Per-sprite fixes applied before the flatten, as boxes in source pixels
-- (inclusive): a pixel of a 'from' material inside the box (or outside it, with
-- 'outside') becomes 'to'; 'keys' maps a source colour inside the box instead. On the campaign cover the tan wear shares its colours
-- with the page edge, so tan above the page block is read as worn leather; on
-- the gramophone the blue belongs only to the record label.
local RULES = {
  ['campaign-book-closed'] = {
    { box = { 0, 0, 127, 63 }, from = { paper = true, gilt = true }, to = { 'navy', 2 } },
  },
  ['gramophone-body'] = {
    { box = { 36, 86, 85, 118 }, outside = true, from = { label = true }, to = { 'gilt', 3 } },
    -- The record itself: its browns stay dark shellac, not brass.
    { box = { 38, 88, 83, 116 }, keys = { ['90 74 48'] = { 'dark', 2 }, ['138 115 80'] = { 'dark', 3 } } },
  },
}

-- Sprites that are only recoloured: no flatten, light, outline or shift.
local PLAIN = { ['gramophone-grooves'] = true }

-- Flatten strength: passes, and the most same-label neighbours a pixel may
-- have and still be replaced.
local FLATTEN = {
  ['references-books'] = { passes = 3, keep = 2 },
}

local name = P.name
local map = assert(MAPS[name], 'no colour map for ' .. tostring(name))
local src = app.open(P.src)
local W, H = src.width, src.height
local flat = Image(src.spec)
flat:drawSprite(src, 1)

-- Label grid: 0 = transparent, otherwise an index into LABELS.
local LABELS, labelIndex = {}, {}
local function labelOf(mat, shade)
  local key = mat .. ':' .. shade
  if not labelIndex[key] then
    LABELS[#LABELS + 1] = { mat, shade }
    labelIndex[key] = #LABELS
  end
  return labelIndex[key]
end

local grid = {}
local function at(g, x, y)
  if x < 0 or y < 0 or x >= W or y >= H then return 0 end
  return g[y * W + x]
end

for y = 0, H - 1 do
  for x = 0, W - 1 do
    local c = flat:getPixel(x, y)
    if pc.rgbaA(c) < 128 then
      grid[y * W + x] = 0
    else
      local key = string.format('%d %d %d', pc.rgbaR(c), pc.rgbaG(c), pc.rgbaB(c))
      local m = assert(map[key], name .. ': unmapped colour ' .. key)
      for _, rule in ipairs(RULES[name] or {}) do
        local b = rule.box
        local inside = x >= b[1] and y >= b[2] and x <= b[3] and y <= b[4]
        if inside ~= (rule.outside == true) then
          if rule.keys and rule.keys[key] then m = rule.keys[key]
          elseif rule.from and rule.from[m[1]] then m = rule.to end
        end
      end
      grid[y * W + x] = labelOf(m[1], m[2])
    end
  end
end

-- 1. Flatten noise: a pixel shared by at most one 8-neighbour takes the most
-- common label around it. Two passes leave patches and a few lone wear pixels.
local flatten = FLATTEN[name] or { passes = 2, keep = 1 }
for _ = 1, PLAIN[name] and 0 or flatten.passes do
  local nextGrid = {}
  for y = 0, H - 1 do
    for x = 0, W - 1 do
      local self = at(grid, x, y)
      nextGrid[y * W + x] = self
      if self ~= 0 then
        local counts, same = {}, 0
        for dy = -1, 1 do
          for dx = -1, 1 do
            if dx ~= 0 or dy ~= 0 then
              local n = at(grid, x + dx, y + dy)
              if n ~= 0 then counts[n] = (counts[n] or 0) + 1 end
              if n == self then same = same + 1 end
            end
          end
        end
        if same <= flatten.keep then
          local best, bestCount = self, 0
          for label, count in pairs(counts) do
            if count > bestCount or (count == bestCount and label < best) then best, bestCount = label, count end
          end
          nextGrid[y * W + x] = best
        end
      end
    end
  end
  grid = nextGrid
end

-- 2. Light from the top left; 3. outline; 4. bottom-align.
local function material(label) return LABELS[label][1] end
local lowest = -1
for y = 0, H - 1 do
  for x = 0, W - 1 do
    if grid[y * W + x] ~= 0 then lowest = math.max(lowest, y) end
  end
end
local shift = PLAIN[name] and 0 or (H - 1) - lowest

local out = Image(ImageSpec { width = W, height = H, colorMode = ColorMode.RGB })
out:clear(pc.rgba(0, 0, 0, 0))
for y = 0, H - 1 do
  for x = 0, W - 1 do
    local label = grid[y * W + x]
    if label ~= 0 then
      local mat, shade = LABELS[label][1], LABELS[label][2]
      local ramp = RAMPS[mat]
      local up, left = at(grid, x, y - 1), at(grid, x - 1, y)
      local down, right = at(grid, x, y + 1), at(grid, x + 1, y)
      local colour
      if PLAIN[name] then
        colour = ramp[shade]
      elseif up == 0 or left == 0 or down == 0 or right == 0 then
        -- Outline, but lit edges use the material's darkest shade so the top
        -- left does not read too heavy (selective outline).
        if (up == 0 or left == 0) and down ~= 0 and right ~= 0 and mat ~= 'dark' then
          colour = ramp[1]
        else
          colour = OUTLINE
        end
      else
        if (material(up) ~= mat or material(left) ~= mat) and shade < #ramp then
          shade = shade + 1
        elseif (material(down) ~= mat or material(right) ~= mat) and shade > 1 then
          shade = shade - 1
        end
        colour = ramp[shade]
      end
      out:drawPixel(x, y + shift, pc.rgba(colour[1], colour[2], colour[3], 255))
    end
  end
end

-- Source file: the cleaned art on top, the old sprite as a locked reference.
local spr = Sprite(W, H, ColorMode.RGB)
local ref = spr.layers[1]
ref.name = 'reference'
spr:newCel(ref, 1, flat, Point(0, 0))
ref.isEditable = false
ref.isVisible = false
local art = spr:newLayer()
art.name = 'art'
spr:newCel(art, 1, out, Point(0, 0))
spr:loadPalette(app.fs.joinPath(app.fs.currentPath, 'art-src/menu/desk-palette.pal'))
spr:saveAs(P.ase)

local export = Sprite(W, H, ColorMode.RGB)
export:newCel(export.layers[1], 1, out, Point(0, 0))
export:saveCopyAs(P.png)
print(string.format('%s: %dx%d, moved down %d row(s)', name, W, H, shift))
