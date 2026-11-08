-- polish-menu-desk 3.3, 3.5, 3.6: desk sprites drawn in code, in the books'
-- language (design D3 steps 2 to 6): desk-palette ramps of at most four shades,
-- flat patches, light from the top left, a 1 px outline in the palette's darkest
-- brown, and the lowest opaque pixel on the bottom row.
--
--   aseprite -b --script-param name=<references|compass|book-frame|emblem>
--            --script-param png=<out.png> --script-param ase=<out.aseprite>
--            --script tools/aseprite/desk-draw.lua

local P = app.params
local pc = app.pixelColor

local function rgb(r, g, b) return { r, g, b } end
local RAMPS = {
  leather = { rgb(46, 20, 12), rgb(74, 34, 22), rgb(107, 52, 32), rgb(138, 74, 44) },
  navy = { rgb(44, 58, 82), rgb(59, 74, 107), rgb(63, 90, 122), rgb(111, 143, 174) },
  green = { rgb(27, 69, 54), rgb(46, 97, 80), rgb(79, 128, 106), rgb(107, 154, 127) },
  paper = { rgb(90, 74, 48), rgb(138, 115, 80), rgb(178, 154, 108), rgb(205, 184, 139) },
  page = { rgb(205, 184, 139), rgb(226, 209, 170), rgb(239, 226, 196), rgb(255, 244, 218) },
  gilt = { rgb(109, 81, 48), rgb(168, 135, 63), rgb(224, 184, 90), rgb(244, 207, 115) },
  dark = { rgb(18, 13, 8), rgb(42, 31, 20), rgb(58, 43, 27) },
  red = { rgb(142, 58, 44), rgb(163, 71, 58) },
}
local OUTLINE = RAMPS.dark[1]

local W, H, img

local function canvas(w, h)
  W, H = w, h
  img = Image(ImageSpec { width = w, height = h, colorMode = ColorMode.RGB })
  img:clear(pc.rgba(0, 0, 0, 0))
end

local function put(x, y, c, a)
  x, y = math.floor(x), math.floor(y)
  if x < 0 or y < 0 or x >= W or y >= H then return end
  img:drawPixel(x, y, pc.rgba(c[1], c[2], c[3], a or 255))
end

local function opaque(x, y)
  if x < 0 or y < 0 or x >= W or y >= H then return false end
  return pc.rgbaA(img:getPixel(x, y)) > 0
end

local function rect(x0, y0, x1, y1, c)
  for y = y0, y1 do for x = x0, x1 do put(x, y, c) end end
end

-- A parallelogram whose rows run from xs(y) to xe(y).
local function rows(y0, y1, xs, xe, colourAt)
  for y = y0, y1 do
    for x = math.floor(xs(y) + 0.5), math.floor(xe(y) + 0.5) do put(x, y, colourAt(x, y)) end
  end
end

-- Outline: opaque pixels next to transparency take the outline colour, except
-- on the lit top-left edges, which keep a darker shade of their own (passed in
-- as `lit`, a function of the pixel's current colour) so they do not read heavy.
local function outline()
  local edge = {}
  for y = 0, H - 1 do
    for x = 0, W - 1 do
      if opaque(x, y) then
        local up, left = opaque(x, y - 1), opaque(x - 1, y)
        local down, right = opaque(x, y + 1), opaque(x + 1, y)
        if not (up and left and down and right) then edge[#edge + 1] = { x, y } end
      end
    end
  end
  for _, p in ipairs(edge) do put(p[1], p[2], OUTLINE) end
end

local function bottomAlign()
  local lowest = -1
  for y = 0, H - 1 do for x = 0, W - 1 do if opaque(x, y) then lowest = y end end end
  local shift = (H - 1) - lowest
  if shift > 0 then
    local copy = img:clone()
    img:clear(pc.rgba(0, 0, 0, 0))
    img:drawImage(copy, Point(0, shift))
  end
  return shift
end

---------------------------------------------------------------------------
-- 3.3 The reference pile: three closed books seen from the front left, the
-- spines toward the viewer and the page block on the right end.
---------------------------------------------------------------------------
local function book(fx, fy, fw, fh, ramp, bands)
  local DX, DY = 12, 8
  local L = RAMPS[ramp]
  -- Top board: lit, the front edge brightest.
  rows(fy - DY, fy - 1,
    function(y) return fx + (fy - y) * DX / DY end,
    function(y) return fx + fw - 1 + (fy - y) * DX / DY end,
    function(_, y) return y == fy - 1 and L[4] or L[3] end)
  -- Page block on the right end, in shade; the boards show as its top and
  -- bottom rows.
  rows(fy - DY, fy + fh - 1,
    function(y) return fx + fw + math.max(0, (fy - y) * DX / DY) end,
    function(y) return fx + fw - 1 + math.min(DX, (fy + fh - 1 - y) * DX / DY) end,
    function(_, y)
      if y >= fy + fh - 2 then return L[1] end
      if (y - fy) % 3 == 0 then return RAMPS.paper[3] end
      return RAMPS.paper[4]
    end)
  -- Spine: a rounded leather face, lit along the top.
  rows(fy, fy + fh - 1, function() return fx end, function() return fx + fw - 1 end, function(x, y)
    local r = y - fy
    if r <= 1 then return L[4] end
    if r >= fh - 2 then return L[1] end
    if r >= fh - 5 then return L[2] end
    return L[3]
  end)
  -- Raised gilt bands and a title panel between the middle two.
  local step = fw // (bands + 1)
  for i = 1, bands do
    local bx = fx + i * step
    rect(bx, fy + 1, bx, fy + fh - 3, RAMPS.gilt[3])
    rect(bx + 1, fy + 1, bx + 1, fy + fh - 3, RAMPS.gilt[1])
  end
  local mid = bands // 2
  local px0, px1 = fx + mid * step + 4, fx + (mid + 1) * step - 3
  rect(px0, fy + 4, px1, fy + fh - 6, RAMPS.dark[2])
  rect(px0 + 2, fy + fh // 2 - 1, px1 - 2, fy + fh // 2 - 1, RAMPS.gilt[2])
  -- Wear: a few scuffed pixels on the spine corners.
  put(fx + 1, fy + fh - 3, RAMPS.paper[2])
  put(fx + fw - 2, fy + 2, L[2])
  put(fx + 2, fy + 2, L[2])
end

local function drawReferences()
  canvas(128, 80)
  book(4, 58, 98, 22, 'leather', 4)
  book(8, 36, 92, 20, 'navy', 3)
  book(14, 16, 82, 18, 'leather', 3)
  -- The dark seam where each book rests on the one below.
  outline()
end

---------------------------------------------------------------------------
-- 3.5 The closed compass: a brass case with a bail ring, a cream dial, the
-- rose and a red north point, at the finer 64 x 64 pixel.
---------------------------------------------------------------------------
local function drawCompass()
  canvas(64, 64)
  local cx, cy, R = 31.5, 34.5, 29
  local G, D, Pg = RAMPS.gilt, RAMPS.dark, RAMPS.page
  -- Bail ring and crown.
  for y = 0, 10 do
    for x = 24, 39 do
      local d = math.sqrt((x - 31.5) ^ 2 + (y - 4.5) ^ 2)
      if d <= 4.6 and d >= 2.2 then put(x, y, (x + y < 34) and G[4] or G[2]) end
    end
  end
  rect(28, 7, 35, 9, G[2])
  rect(28, 7, 31, 7, G[4])
  for y = 0, H - 1 do
    for x = 0, W - 1 do
      local dx, dy = x - cx, y - cy
      local d = math.sqrt(dx * dx + dy * dy)
      local lit = -(dx + dy) / math.max(d, 0.01) -- toward the top left
      if d <= R then
        if d > 25 then
          -- Case rim: four brass shades by the light.
          put(x, y, lit > 0.55 and G[4] or lit > -0.1 and G[3] or lit > -0.6 and G[2] or G[1])
        elseif d > 23 then
          put(x, y, lit > 0.3 and G[2] or G[1]) -- bezel step
        else
          put(x, y, (lit < -0.75 and d > 20) and Pg[1] or Pg[2]) -- dial
        end
      end
    end
  end
  -- Ticks at the eight points.
  for i = 0, 7 do
    local a = i * math.pi / 4
    local len = (i % 2 == 0) and 3 or 1
    for r = 22 - len, 21 do put(cx + math.sin(a) * r, cy - math.cos(a) * r, D[2]) end
  end
  -- Intercardinal points: small and pale.
  for i = 0, 3 do
    local a = math.pi / 4 + i * math.pi / 2
    for r = 0, 11 do
      local w = math.floor((11 - r) / 4)
      for s = -w, w do
        put(cx + math.sin(a) * r + math.cos(a) * s, cy - math.cos(a) * r + math.sin(a) * s, RAMPS.paper[2])
      end
    end
  end
  -- Cardinal points: each arm split into a light and a dark half; north red.
  for i = 0, 3 do
    local a = i * math.pi / 2
    local ux, uy = math.sin(a), -math.cos(a)
    local vx, vy = -uy, ux
    for r = 0, 18 do
      local w = math.floor((18 - r) / 4.5)
      for s = -w, w do
        local light, dark = G[3], D[2]
        if i == 0 then light, dark = RAMPS.red[2], RAMPS.red[1] end
        put(cx + ux * r + vx * s, cy + uy * r + vy * s, s <= 0 and light or dark)
      end
    end
  end
  -- Centre pin and a glint on the glass.
  rect(31, 34, 32, 35, G[4])
  put(32, 35, G[1])
  for _, p in ipairs({ { 16, 22 }, { 17, 21 }, { 18, 20 }, { 19, 19 }, { 20, 18 }, { 17, 23 } }) do
    put(p[1], p[2], Pg[4])
  end
  outline()
end

---------------------------------------------------------------------------
-- 3.6 The open-book frame: a 48 x 48 9-slice (16 px corners), drawn as light
-- and shade over a transparent board so CSS can tint it with --book-cover. The
-- gilt rule and corners are opaque.
---------------------------------------------------------------------------
local function drawBookFrame()
  canvas(48, 48)
  local G = RAMPS.gilt
  local black, white = rgb(0, 0, 0), rgb(255, 255, 255)
  for y = 0, 47 do
    for x = 0, 47 do
      local e = math.min(x, y, 47 - x, 47 - y)
      if e == 0 then
        put(x, y, OUTLINE)
      elseif e == 1 then
        -- Board edge: light on the top left, shade on the bottom right.
        if x == 1 or y == 1 then put(x, y, white, 70) else put(x, y, black, 90) end
      elseif e == 5 or e == 7 then
        -- Double gilt rule, one tone per side so the stretched edges stay even:
        -- lit on the top and left, darker on the bottom and right.
        put(x, y, (e == x or e == y) and G[3] or G[2])
      elseif e == 6 then
        put(x, y, black, 40)
      elseif e >= 13 then
        put(x, y, black, 110) -- inner shadow toward the pages
      end
    end
  end
  -- Stepped gilt corner pieces.
  for _, c in ipairs({ { 0, 0, 1, 1 }, { 47, 0, -1, 1 }, { 0, 47, 1, -1 }, { 47, 47, -1, -1 } }) do
    for i = 0, 8 do
      for j = 0, 8 do
        if (i <= 2 or j <= 2) and i + j <= 10 then
          put(c[1] + c[3] * (3 + i), c[2] + c[4] * (3 + j), (c[3] + c[4] > 0) and G[4] or G[2])
        end
      end
    end
  end
end

---------------------------------------------------------------------------
-- 3.6 Placeholder section emblem (design D14): a drawn star in a wreath of
-- dots, in page ink. It is not a historical image.
---------------------------------------------------------------------------
local function drawEmblem()
  canvas(48, 48)
  local ink, soft = RAMPS.dark[2], RAMPS.paper[2]
  local cx, cy = 23.5, 23.5
  for i = 0, 23 do
    local a = i * math.pi / 12
    put(cx + math.cos(a) * 22, cy + math.sin(a) * 22, soft)
  end
  -- Five-pointed star, filled by testing each pixel against the outline.
  local pts = {}
  for i = 0, 9 do
    local a = -math.pi / 2 + i * math.pi / 5
    local r = (i % 2 == 0) and 17 or 7
    pts[#pts + 1] = { cx + math.cos(a) * r, cy + math.sin(a) * r }
  end
  local function inside(x, y)
    local c = false
    local j = #pts
    for i = 1, #pts do
      local xi, yi, xj, yj = pts[i][1], pts[i][2], pts[j][1], pts[j][2]
      if (yi > y) ~= (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi then c = not c end
      j = i
    end
    return c
  end
  for y = 0, 47 do
    for x = 0, 47 do
      if inside(x + 0.5, y + 0.5) then put(x, y, (x + 0.5 < cx) and soft or ink) end
    end
  end
end

local DRAW = {
  references = { drawReferences, true },
  compass = { drawCompass, true },
  ['book-frame'] = { drawBookFrame, false },
  emblem = { drawEmblem, false },
}

local job = assert(DRAW[P.name], 'unknown sprite ' .. tostring(P.name))
job[1]()
local shift = job[2] and bottomAlign() or 0

local spr = Sprite(W, H, ColorMode.RGB)
spr.layers[1].name = 'art'
spr:newCel(spr.layers[1], 1, img, Point(0, 0))
spr:loadPalette(app.fs.joinPath(app.fs.currentPath, 'art-src/menu/desk-palette.pal'))
spr:saveAs(P.ase)
local export = Sprite(W, H, ColorMode.RGB)
export:newCel(export.layers[1], 1, img, Point(0, 0))
export:saveCopyAs(P.png)
print(string.format('%s: %dx%d, moved down %d row(s)', P.name, W, H, shift))
