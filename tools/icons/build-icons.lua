-- Builds assets/icons/prestes-icons.aseprite from assets/icons/icons.txt.
--
-- One 16 x 16 cell per icon on a single sprite (8 icons per row, 2 px apart),
-- white pixels on transparency, and a named slice over each cell. The game
-- uses the exported sheet as an alpha mask, so only the shape matters: redraw
-- an icon in Aseprite, keep it inside its slice, then run `pnpm icons`.
--
-- Run: Aseprite.exe -b --script-param txt=<icons.txt> --script-param out=<file.aseprite> --script build-icons.lua

local txt = app.params["txt"]
local out = app.params["out"]
assert(txt and out, "usage: --script-param txt=... --script-param out=...")

local icons = {}
local current = nil
for line in io.lines(txt) do
  local name = line:match("^== (.+)$")
  if name then
    current = { name = name, rows = {} }
    table.insert(icons, current)
  elseif current and #line > 0 then
    table.insert(current.rows, line)
  end
end

local SIZE, GAP, COLS = 16, 2, 8
local rows = math.ceil(#icons / COLS)
local width = COLS * (SIZE + GAP) - GAP
local height = rows * (SIZE + GAP) - GAP

local sprite = Sprite(width, height, ColorMode.RGB)
local image = sprite.cels[1].image
local white = app.pixelColor.rgba(255, 255, 255, 255)

for index, icon in ipairs(icons) do
  local col = (index - 1) % COLS
  local row = (index - 1) // COLS
  local ox = col * (SIZE + GAP)
  local oy = row * (SIZE + GAP)
  for y, text in ipairs(icon.rows) do
    for x = 1, #text do
      if text:sub(x, x) == "#" then
        image:drawPixel(ox + x - 1, oy + y - 1, white)
      end
    end
  end
  local slice = sprite:newSlice(Rectangle(ox, oy, SIZE, SIZE))
  slice.name = icon.name
end

sprite:saveAs(out)
