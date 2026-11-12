-- Builds assets/hud/prestes-hud.aseprite: the battle HUD's frames and ornaments
-- (redo-battle-hud D1).
--
-- Frames are drawn here in pixels, in a palette sampled from the owner's
-- reference image, so their edges tile; each is a slice with a nine-slice
-- centre that the CSS reads as `border-image-slice`. Ornaments come from
-- `hud_pieces.py` (cut from the reference, the owner allowed it) and are laid
-- in as plain slices. Run once to seed the source; then edit it in Aseprite
-- and export with `pnpm hud-art` (re-running this overwrites those edits).
--
-- Run: Aseprite.exe -b --script-param ornaments=<dir> --script-param out=<file.aseprite> --script build-hud.lua

local dir = app.params["ornaments"]
local out = app.params["out"]
assert(dir and out, "usage: --script-param ornaments=<dir> --script-param out=<file.aseprite>")

local rgba = app.pixelColor.rgba
local function hex(h, a)
  return rgba(tonumber(h:sub(2, 3), 16), tonumber(h:sub(4, 5), 16), tonumber(h:sub(6, 7), 16), a or 255)
end

-- Palette sampled from the reference (frame wood, gold titles, rust tab, parchment).
local C = {
  ink = hex("#140d07"),
  woodDark = hex("#3a2412"),
  wood = hex("#5a3a1e"),
  woodMid = hex("#6e4726"),
  woodLight = hex("#8a5a30"),
  woodHi = hex("#a8743e"),
  brassDark = hex("#6e4a1e"),
  brass = hex("#b8863e"),
  brassHi = hex("#e8c070"),
  panel = hex("#2a1d12"),
  panelDark = hex("#1e140c"),
  panelLine = hex("#4a3420"),
  parchDark = hex("#b0844c"),
  parch = hex("#cf9f62"),
  parchLight = hex("#ddb47a"),
  rustDark = hex("#5a2c12"),
  rust = hex("#82421d"),
  rustHi = hex("#b0602c"),
  btn = hex("#2e2014"),
  btnHover = hex("#3c2a1a"),
  btnActive = hex("#4a3420"),
  btnDisabled = hex("#241a12"),
  clear = rgba(0, 0, 0, 0),
}

-- Ornament atlas from hud_pieces.py.
local ornaments = {}
for line in io.lines(dir .. "/ornaments.txt") do
  local name, x, y, w, h = line:match("^(%S+) (%d+) (%d+) (%d+) (%d+)$")
  if name then
    table.insert(ornaments, { name = name, x = tonumber(x), y = tonumber(y), w = tonumber(w), h = tonumber(h) })
  end
end
local atlas = Image { fromFile = dir .. "/ornaments.png" }

local WIDTH, FRAMES_HEIGHT = 460, 64
local height = FRAMES_HEIGHT
for _, o in ipairs(ornaments) do height = height + o.h + 2 end

local sprite = Sprite(WIDTH, height, ColorMode.RGB)
local image = sprite.cels[1].image

local function px(x, y, c) image:drawPixel(x, y, c) end
local function fill(x, y, w, h, c)
  for yy = y, y + h - 1 do for xx = x, x + w - 1 do px(xx, yy, c) end end
end
local function hline(x, y, w, c) fill(x, y, w, 1, c) end
local function vline(x, y, h, c) fill(x, y, 1, h, c) end

local slices = {}
local function slice(name, x, y, w, h, centre)
  local s = sprite:newSlice(Rectangle(x, y, w, h))
  s.name = name
  if centre then s.center = Rectangle(centre[1], centre[2], centre[3], centre[4]) end
  table.insert(slices, s)
end

-- A plank band: dark outline, a lit top row, wood body with grain every
-- `period` pixels (so a repeated edge tiles), a shadow row.
local function woodBand(x, y, w, h, horizontal, period)
  fill(x, y, w, h, C.wood)
  if horizontal then
    hline(x, y, w, C.woodHi)
    hline(x, y + h - 1, w, C.woodDark)
    for xx = x, x + w - 1 do
      local k = (xx - x) % period
      if k == 2 or k == 3 then px(xx, y + 1 + ((xx // period) % math.max(1, h - 3)), C.woodMid) end
      if k == 7 then px(xx, y + h - 2, C.woodLight) end
    end
  else
    vline(x, y, h, C.woodHi)
    vline(x + w - 1, y, h, C.woodDark)
    for yy = y, y + h - 1 do
      local k = (yy - y) % period
      if k == 2 or k == 3 then px(x + 1 + ((yy // period) % math.max(1, w - 3)), yy, C.woodMid) end
      if k == 7 then px(x + w - 2, yy, C.woodLight) end
    end
  end
end

-- A brass corner bracket with a rivet, `size` pixels on a side.
local function bracket(x, y, size, flipX, flipY)
  local function at(i, j)
    local xx = flipX and (x + size - 1 - i) or (x + i)
    local yy = flipY and (y + size - 1 - j) or (y + j)
    return xx, yy
  end
  for i = 0, size - 1 do
    for j = 0, size - 1 do
      if i < 3 or j < 3 then
        local xx, yy = at(i, j)
        local c = C.brass
        if i == 0 or j == 0 then c = C.brassHi end
        if (i == 2 and j >= 2) or (j == 2 and i >= 2) then c = C.brassDark end
        px(xx, yy, c)
      end
    end
  end
  local rx, ry = at(1, 1)
  px(rx, ry, C.ink)
end

local function rivet(x, y)
  px(x, y, C.brassHi); px(x + 1, y, C.brass); px(x, y + 1, C.brass); px(x + 1, y + 1, C.brassDark)
end

-- Outline a w x h box in ink.
local function outline(x, y, w, h, c)
  hline(x, y, w, c or C.ink); hline(x, y + h - 1, w, c or C.ink)
  vline(x, y, h, c or C.ink); vline(x + w - 1, y, h, c or C.ink)
end

local cursor = 0
local function place(w)
  local x = cursor
  cursor = cursor + w + 2
  return x
end

-- panel: wood frame with a title band on top (Troops, Orders). 32 x 40;
-- frame 6, title band 16; centre = the transparent interior.
do
  local x, y, w, h = place(32), 0, 32, 40
  woodBand(x + 1, y + 1, w - 2, 16, true, 10)        -- title band
  hline(x + 1, y + 6, w - 2, C.woodMid)               -- plank seam
  hline(x + 1, y + 11, w - 2, C.woodMid)
  woodBand(x + 1, y + h - 7, w - 2, 6, true, 10)      -- bottom
  woodBand(x + 1, y + 17, 6, h - 24, false, 10)       -- left
  woodBand(x + w - 7, y + 17, 6, h - 24, false, 10)   -- right
  hline(x + 7, y + 17, w - 14, C.ink)                 -- inner lip
  hline(x + 7, y + h - 8, w - 14, C.ink)
  vline(x + 7, y + 17, h - 24, C.ink)
  vline(x + w - 8, y + 17, h - 24, C.ink)
  outline(x, y, w, h)
  bracket(x + 1, y + 1, 7, false, false); bracket(x + w - 8, y + 1, 7, true, false)
  bracket(x + 1, y + h - 8, 7, false, true); bracket(x + w - 8, y + h - 8, 7, true, true)
  rivet(x + 9, y + 7); rivet(x + w - 11, y + 7)
  slice("panel", x, y, w, h, { 8, 18, w - 16, h - 26 })
end

-- card-parchment: the troop summary's card, wood frame around parchment. 32 x 32.
do
  local x, y, w, h = place(32), 0, 32, 32
  fill(x + 7, y + 7, w - 14, h - 14, C.parch)
  for yy = y + 7, y + h - 8 do
    for xx = x + 7, x + w - 8 do
      local k = (xx * 7 + yy * 13) % 23
      if k == 0 then px(xx, yy, C.parchDark) elseif k == 5 or k == 11 then px(xx, yy, C.parchLight) end
    end
  end
  woodBand(x + 1, y + 1, w - 2, 6, true, 9)
  woodBand(x + 1, y + h - 7, w - 2, 6, true, 9)
  woodBand(x + 1, y + 7, 6, h - 14, false, 9)
  woodBand(x + w - 7, y + 7, 6, h - 14, false, 9)
  outline(x + 7, y + 7, w - 14, h - 14, C.woodDark)
  outline(x, y, w, h)
  bracket(x + 1, y + 1, 7, false, false); bracket(x + w - 8, y + 1, 7, true, false)
  bracket(x + 1, y + h - 8, 7, false, true); bracket(x + w - 8, y + h - 8, 7, true, true)
  slice("card-parchment", x, y, w, h, { 8, 8, w - 16, h - 16 })
end

-- plate-parchment: the summary's title plate, parchment with wood ends. 32 x 14.
do
  local x, y, w, h = place(32), 0, 32, 14
  fill(x + 1, y + 1, w - 2, h - 2, C.parchLight)
  hline(x + 1, y + h - 2, w - 2, C.parchDark)
  hline(x + 1, y + 1, w - 2, hex("#ecc890"))
  woodBand(x + 1, y + 1, 5, h - 2, false, 6)
  woodBand(x + w - 6, y + 1, 5, h - 2, false, 6)
  rivet(x + 2, y + 6); rivet(x + w - 4, y + 6)
  outline(x, y, w, h)
  slice("plate-parchment", x, y, w, h, { 7, 3, w - 14, h - 6 })
end

-- rail: a top-bar rail, wood frame around a dark well. 24 x 24.
do
  local x, y, w, h = place(24), 0, 24, 24
  fill(x + 5, y + 5, w - 10, h - 10, C.panel)
  woodBand(x + 1, y + 1, w - 2, 4, true, 8)
  woodBand(x + 1, y + h - 5, w - 2, 4, true, 8)
  woodBand(x + 1, y + 5, 4, h - 10, false, 8)
  woodBand(x + w - 5, y + 5, 4, h - 10, false, 8)
  outline(x + 5, y + 5, w - 10, h - 10, C.ink)
  outline(x, y, w, h)
  rivet(x + 1, y + 1); rivet(x + w - 3, y + 1); rivet(x + 1, y + h - 3); rivet(x + w - 3, y + h - 3)
  slice("rail", x, y, w, h, { 6, 6, w - 12, h - 12 })
end

-- Buttons: a dark face in a lit frame. 14 x 14 each.
local function button(name, face, frame, light, shade)
  local x, y, w, h = place(14), 0, 14, 14
  fill(x + 1, y + 1, w - 2, h - 2, face)
  outline(x, y, w, h)
  outline(x + 1, y + 1, w - 2, h - 2, frame)
  hline(x + 2, y + 2, w - 4, light)
  vline(x + 2, y + 2, h - 4, light)
  hline(x + 2, y + h - 3, w - 4, shade)
  vline(x + w - 3, y + 2, h - 4, shade)
  slice(name, x, y, w, h, { 4, 4, w - 8, h - 8 })
end
button("button", C.btn, C.woodMid, C.woodDark, C.panelDark)
button("button-hover", C.btnHover, C.woodLight, C.woodMid, C.panelDark)
button("button-active", C.btnActive, C.brassHi, C.brass, C.brassDark)
button("button-disabled", C.btnDisabled, C.panelLine, C.panelDark, C.panelDark)
button("tab-active", C.rust, C.rustHi, C.rustHi, C.rustDark)

-- card: a section card in the Troops list, dark with a thin wood rim. 16 x 16.
do
  local x, y, w, h = place(16), 0, 16, 16
  fill(x + 1, y + 1, w - 2, h - 2, C.panelDark)
  outline(x, y, w, h)
  outline(x + 1, y + 1, w - 2, h - 2, C.woodDark)
  hline(x + 2, y + 2, w - 4, C.panelLine)
  slice("card", x, y, w, h, { 4, 4, w - 8, h - 8 })
end
do
  local x, y, w, h = place(16), 0, 16, 16
  fill(x + 1, y + 1, w - 2, h - 2, C.btnActive)
  outline(x, y, w, h)
  outline(x + 1, y + 1, w - 2, h - 2, C.brass)
  hline(x + 2, y + 2, w - 4, C.brassHi)
  slice("card-active", x, y, w, h, { 4, 4, w - 8, h - 8 })
end

-- group: an order group's well inside the Orders column. 12 x 12.
do
  local x, y, w, h = place(12), 0, 12, 12
  fill(x + 1, y + 1, w - 2, h - 2, C.panelDark)
  outline(x, y, w, h, C.panelLine)
  hline(x + 1, y + h - 2, w - 2, C.woodDark)
  slice("group", x, y, w, h, { 3, 3, w - 6, h - 6 })
end

-- Ornaments below the frames.
local oy = FRAMES_HEIGHT
for _, o in ipairs(ornaments) do
  for yy = 0, o.h - 1 do
    for xx = 0, o.w - 1 do
      local c = atlas:getPixel(o.x + xx, o.y + yy)
      if app.pixelColor.rgbaA(c) > 0 then px(xx, oy + yy, c) end
    end
  end
  slice(o.name, 0, oy, o.w, o.h, nil)
  oy = oy + o.h + 2
end

sprite:saveAs(out)
print("HUD source: " .. #slices .. " slices -> " .. out)
