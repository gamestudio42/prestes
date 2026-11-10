import { DEFAULT_BATTLE_MAP, loadAuthoredMap } from '../packages/shared/src';

// author-game-maps D3: the test map is an authored document, loaded on demand; every test file has it ready.
await loadAuthoredMap(DEFAULT_BATTLE_MAP);
