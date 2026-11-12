-- Adds to assets/icons/prestes-icons.aseprite the icons of icons.txt it does
-- not have yet, each in the next free 16 x 16 cell with its named slice,
-- growing the canvas when the last row is full. Icons already in the sprite
-- are left exactly as they are (they may have been redrawn in Aseprite).
--
-- Run: Aseprite.exe -b --script-param txt=<icons.txt> --script-param file=<file.aseprite> --script add-icons.lua
-- (`pnpm icons --add` does this, then exports.)

local txt = app.params["txt"]
local file = app.params["file"]
assert(txt and file, "usage: --script-param txt=... --script-param file=...")

local sprite = app.open(file)
local have = {}
for _, slice in ipairs(sprite.slices) do have[slice.name] = true end

local icons = {}
local current = nil
for line in io.lines(txt) do
  local name = line:match("^== (.+)$")
  if name then
    current = { name = name, rows = {} }
    if not have[name] then table.insert(icons, current) end
  elseif current and #line > 0 then
    table.insert(current.rows, line)
  end
end

local SIZE, GAP, COLS = 16, 2, 8
local white = app.pixelColor.rgba(255, 255, 255, 255)
local count = #sprite.slices
for _, icon in ipairs(icons) do
  local col = count % COLS
  local row = count // COLS
  local ox = col * (SIZE + GAP)
  local oy = row * (SIZE + GAP)
  if oy + SIZE > sprite.height then sprite:crop(0, 0, sprite.width, oy + SIZE) end
  local cel = sprite.cels[1]
  local image = cel.image:clone()
  if image.height < sprite.height or cel.position.y ~= 0 or cel.position.x ~= 0 then
    local full = Image(sprite.width, sprite.height, sprite.colorMode)
    full:drawImage(cel.image, cel.position)
    image = full
  end
  for y, text in ipairs(icon.rows) do
    for x = 1, #text do
      if text:sub(x, x) == "#" then image:drawPixel(ox + x - 1, oy + y - 1, white) end
    end
  end
  cel.image = image
  cel.position = Point(0, 0)
  local slice = sprite:newSlice(Rectangle(ox, oy, SIZE, SIZE))
  slice.name = icon.name
  count = count + 1
end

sprite:saveAs(file)
print("added " .. #icons .. " icons")
