## 1. Player maps

- [x] 1.1 `listStored()` in the editor persistence: the kept maps, parsed, without the special keys
- [x] 1.2 `playerMaps.ts`: load them, skip authored ids, register them for battle
- [x] 1.3 The player's maps join the skirmish pile and the setup screen's list
- [x] 1.4 A print drawn from each player map, on its sheet and in the setup
- [x] 1.5 A skirmish on a player map plays its document
- [x] 1.6 The editor's Open lists the kept maps; a new map gets its own id

## 2. Checks

- [x] 2.1 Unit tests (authored ids left off, own text, fresh id, print)
- [x] 2.2 e2e: a kept map is on the pile with its print, a battle opens on it; Open lists it
- [x] 2.3 Verify (the roster-builder visual differs only in the soldier thumbnails, from the soldier-model work in progress)
