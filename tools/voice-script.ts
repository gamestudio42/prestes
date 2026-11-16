import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VOICE_LINES, voiceFile, type VoiceKind, type VoiceLine } from '../packages/content/src';
import { SOUND_FILES } from '../apps/game/src/audio/sound-files';

/**
 * ambient-sound-and-voices 5.2 (D7): the voice script and the audio check.
 *
 * - `docs/audio/VOICE_SCRIPT.md` is written from `VOICE_LINES`: per line its
 *   text, caption, moment, and each take's file, marked recorded or to record
 *   by the manifest (`apps/game/src/audio/sound-files.ts`, written by
 *   `pnpm prepare:audio` from the files that exist).
 * - The check lists the takes without a recording and the voice files without
 *   a line (a report, not a failure: missing takes are skipped in the game),
 *   and fails when the audio set is over its budget
 *   (`tools/audio-budget.json`) or a file is not in the asset register
 *   (`docs/assets.md`).
 *
 * `pnpm check:audio` writes the script and runs the check.
 */

export interface AudioBudget {
  /** Every file under the public audio folder. */
  totalMaxBytes: number;
  /** The voice files. */
  voiceMaxBytes: number;
}

export interface AudioReport {
  /** Takes of the catalogue with no file. */
  missing: string[];
  /** Voice files that no take names. */
  orphans: string[];
  /** Failures: over budget, unregistered. */
  problems: string[];
  totalBytes: number;
  voiceBytes: number;
}

const VOICE_ID = /^(comandante|soldado|inimigo|xingamento)\//;

/** The sound ids of every take of the catalogue. */
export function takeIds(lines: readonly VoiceLine[]): string[] {
  return lines.flatMap((line) => line.takes.map((_, index) => voiceFile(line, index + 1)));
}

/**
 * Whether a sound file is in the asset register: by its path, by its id in
 * backticks, or (a voice take) by the voice row's folder.
 */
export function registered(register: string, id: string, path: string): boolean {
  if (register.includes(path) || register.includes(`\`${id}\``)) return true;
  return VOICE_ID.test(id) && register.includes('public/audio/voice/');
}

export function audioReport(input: {
  lines: readonly VoiceLine[];
  files: Readonly<Record<string, string>>;
  /** Bytes of each file, by its path under the audio folder. */
  sizes: Readonly<Record<string, number>>;
  budget: AudioBudget;
  register: string;
}): AudioReport {
  const takes = takeIds(input.lines);
  const named = new Set(takes);
  const missing = takes.filter((id) => !(id in input.files));
  const orphans = Object.keys(input.files).filter((id) => VOICE_ID.test(id) && !named.has(id));
  const problems: string[] = [];
  let totalBytes = 0;
  let voiceBytes = 0;
  for (const [path, bytes] of Object.entries(input.sizes)) {
    totalBytes += bytes;
    if (path.startsWith('voice/')) voiceBytes += bytes;
  }
  if (totalBytes > input.budget.totalMaxBytes) problems.push(`audio set is ${totalBytes} bytes, over the budget of ${input.budget.totalMaxBytes}`);
  if (voiceBytes > input.budget.voiceMaxBytes) problems.push(`voice files are ${voiceBytes} bytes, over the budget of ${input.budget.voiceMaxBytes}`);
  for (const [id, path] of Object.entries(input.files)) {
    if (!registered(input.register, id, `public/audio/${path}`)) problems.push(`audio file not in docs/assets.md: ${path} (${id})`);
  }
  return { missing, orphans, problems, totalBytes, voiceBytes };
}

const SECTIONS: { title: string; kind: VoiceKind; speaker?: string }[] = [
  { title: '1. Ordens — comandante', kind: 'order' },
  { title: '2. Respostas da seção', kind: 'answer' },
  { title: '3. Avisos dos nossos soldados', kind: 'callout' },
  { title: '4a. Xingamentos — Coluna', kind: 'curse', speaker: 'xingamento/column' },
  { title: '4b. Xingamentos — legalistas', kind: 'curse', speaker: 'xingamento/legalist' },
  { title: '4c. Xingamentos — cangaceiros', kind: 'curse', speaker: 'xingamento/cangaceiro' },
  { title: '5. Avisos do inimigo', kind: 'enemy' },
];

const cell = (text: string) => text.replaceAll('|', '\\|');

/** The script, from the catalogue and the files that exist. */
export function voiceScript(lines: readonly VoiceLine[], files: Readonly<Record<string, string>>, report: Pick<AudioReport, 'missing' | 'orphans'>): string {
  const takes = takeIds(lines);
  const out: string[] = [
    '# Roteiro de vozes',
    '',
    'Gerado por `pnpm check:audio` (`tools/voice-script.ts`) a partir do',
    'catálogo `VOICE_LINES` (`packages/content/src/voice-lines.ts`); não edite à',
    'mão. Cada tomada é `voice/<falante>/<id>-<n>`; ✓ gravada, · a gravar.',
    'Uma tomada que o dono grava em `audio-src/voice/` substitui a gerada.',
    '',
    `**${takes.length - report.missing.length} de ${takes.length} tomadas gravadas.**`,
    '',
  ];
  for (const section of SECTIONS) {
    const group = lines.filter((line) => line.kind === section.kind && (!section.speaker || line.speaker === section.speaker));
    if (group.length === 0) continue;
    out.push(`## ${section.title}`, '');
    const moment = section.kind === 'curse';
    out.push(moment ? '| id | momento | tomada | texto | legenda (EN) | |' : '| id | tomada | texto | legenda (EN) | |');
    out.push(moment ? '|---|---|---|---|---|---|' : '|---|---|---|---|---|');
    for (const line of group) {
      line.takes.forEach((take, index) => {
        const id = voiceFile(line, index + 1);
        const mark = id in files ? '✓' : '·';
        const row = [index === 0 ? line.key : '', ...(moment ? [index === 0 ? (line.moment ?? '') : ''] : []), `\`${id}\``, cell(take.pt), cell(take.en), mark];
        out.push(`| ${row.join(' | ')} |`);
      });
    }
    out.push('');
  }
  if (report.missing.length > 0) out.push('## A gravar', '', ...report.missing.map((id) => `- \`${id}\``), '');
  if (report.orphans.length > 0) out.push('## Arquivos sem fala no catálogo', '', ...report.orphans.map((id) => `- \`${id}\``), '');
  return out.join('\n');
}

function main(): void {
  const root = process.cwd();
  const audio = resolve(root, 'apps/game/public/audio');
  const sizes: Record<string, number> = {};
  for (const path of Object.values(SOUND_FILES)) sizes[path] = statSync(join(audio, path)).size;
  const budget = JSON.parse(readFileSync(resolve(root, 'tools/audio-budget.json'), 'utf8')) as AudioBudget;
  const register = readFileSync(resolve(root, 'docs/assets.md'), 'utf8');
  const report = audioReport({ lines: VOICE_LINES, files: SOUND_FILES, sizes, budget, register });
  writeFileSync(resolve(root, 'docs/audio/VOICE_SCRIPT.md'), voiceScript(VOICE_LINES, SOUND_FILES, report), 'utf8');
  const mb = (bytes: number) => (bytes / 1e6).toFixed(2);
  console.log(`Audio: ${mb(report.totalBytes)} MB in all (budget ${mb(budget.totalMaxBytes)}), voices ${mb(report.voiceBytes)} MB (budget ${mb(budget.voiceMaxBytes)}).`);
  console.log(`Voice takes: ${takeIds(VOICE_LINES).length - report.missing.length} recorded, ${report.missing.length} to record, ${report.orphans.length} files without a line.`);
  for (const id of report.missing) console.log(`  to record: ${id}`);
  for (const id of report.orphans) console.log(`  no line: ${id}`);
  if (report.problems.length > 0) {
    for (const problem of report.problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log('Audio check passed; docs/audio/VOICE_SCRIPT.md written.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
