-- Builds assets/hud/prestes-hud.aseprite: the battle HUD's frames, plates and
-- ornaments (redo-battle-hud D1).
--
-- After the owner's review on 2026-11-12 every piece is cut from his reference
-- image at its own size by tools/hud/hud_pieces.py (labels painted out, map
-- cleared). This script lays the pieces into one sprite, one slice per piece;
-- a frame's slice carries its nine-slice centre, which the CSS reads as
-- `border-image-slice` through hud.json. Run once to seed the source; then
-- edit it in Aseprite and export with `pnpm hud-art`.
--
-- Run: Aseprite.exe -b --script-param pieces=<dir> --script-param out=<file.aseprite> --script build-hud.lua

local dir = app.params["pieces"]
local out = app.params["out"]
assert(dir and out, "usage: --script-param pieces=<dir> --script-param out=<file.aseprite>")

local pieces = {}
for line in io.lines(dir .. "/pieces.txt") do
  local fields = {}
  for field in line:gmatch("%S+") do table.insert(fields, field) end
  if #fields >= 5 then
    local piece = {
      name = fields[1],
      x = tonumber(fields[2]), y = tonumber(fields[3]),
      w = tonumber(fields[4]), h = tonumber(fields[5]),
    }
    if #fields == 9 then
      piece.insets = { tonumber(fields[6]), tonumber(fields[7]), tonumber(fields[8]), tonumber(fields[9]) }
    end
    table.insert(pieces, piece)
  end
end

local atlas = Image { fromFile = dir .. "/pieces.png" }
local sprite = Sprite(atlas.width, atlas.height, ColorMode.RGB)
sprite.cels[1].image:drawImage(atlas, Point(0, 0))
sprite.layers[1].name = "hud"

for _, p in ipairs(pieces) do
  local s = sprite:newSlice(Rectangle(p.x, p.y, p.w, p.h))
  s.name = p.name
  if p.insets then
    local top, right, bottom, left = p.insets[1], p.insets[2], p.insets[3], p.insets[4]
    s.center = Rectangle(left, top, p.w - left - right, p.h - top - bottom)
  end
end

sprite:saveAs(out)
print("HUD source: " .. #pieces .. " slices -> " .. out)
