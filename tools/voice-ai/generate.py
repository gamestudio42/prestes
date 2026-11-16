"""Gera as falas do roteiro com a voz do dono (Chatterbox Multilingual, MIT).

uso: python tools/voice-ai/generate.py [--only <prefixo>] [--limit N] [--rest S]

Receita aprovada pelo dono em 2026-11-15 (o "lote 3" do teste):
- referência: os trechos mais fortes de audio-src/voice-ref/clovis-comandante.wav;
  soldado +1 semitom, inimigo -1,5, cangaceiro -0,75 (xingamentos por facção);
- emoção alta conforme o tom do roteiro, cfg baixo, temperature 0.7;
- texto sem vírgulas para o modelo (vírgula vira pausa);
- 4 tomadas, escolhida a de duração mais próxima da esperada sem buraco;
- pós: 12% mais rápido (ffmpeg atempo), filtro leve (150-5500 Hz, saturação
  suave) e chiado a -36 dB que acompanha a voz e some depois da fala.

Saída em audio-src/voice/<falante>/<arquivo>.wav (entrada do pnpm prepare:audio);
a fala crua fica em audio-src/voice-ai-raw/. Arquivo que já existe é pulado:
retoma depois de uma queda e nunca sobrescreve uma gravação do dono.
Poupa a GPU: pausa quando passa de HOT_C e só volta abaixo de COOL_C.
"""
import argparse
import os
import subprocess
import sys
import tempfile
import time
import zlib
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio.functional as AF

sys.path.insert(0, str(Path(__file__).parent))
from roteiro import load  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
REF_SRC = ROOT / "audio-src/voice-ref/clovis-comandante.wav"
RAW = ROOT / "audio-src/voice-ai-raw"
OUT = ROOT / "audio-src/voice"
FFMPEG = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "kdenlive", "bin", "ffmpeg.exe")

SHIFT = {"comandante": 0.0, "soldado": 1.0, "inimigo": -1.5, "cangaceiro": -0.75}
# xingamentos são da facção de quem fala; cada facção tem a sua voz
VOICE = {"xingamento/column": "soldado", "xingamento/legalist": "inimigo",
         "xingamento/cangaceiro": "cangaceiro"}
TAKES = 4  # padrão; --takes muda
TEMPO = 1.12
HISS_DB = -36
HOT_C, COOL_C, REST_S = 75, 65, 1.5

QUIET = ("sussurrad", "baixo", "calmo", "atento")
MID = ("cansado", "contido", "prático", "objetivo", "firme", "seco", "neutro", "desdém",
       "desprezo", "ganancioso", "ameaça baixa", "irritado", "frustrado")
LOUD = ("agressivo", "grito", "explosivo", "alto", "pânico", "triunfante", "vitorioso",
        "ódio", "provocando", "desespero")


def style(tone: str) -> tuple[float, float]:
    """(exaggeration, cfg_weight) pelo tom do roteiro."""
    t = tone.lower()
    if any(k in t for k in QUIET):
        return 0.4, 0.5
    if any(k in t for k in LOUD) and "contido" not in t:
        return 1.4, 0.2
    if any(k in t for k in MID):
        return 0.95, 0.3
    return 1.2, 0.25


def gpu_temp() -> int | None:
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"],
                             capture_output=True, text=True, timeout=10).stdout
        return int(out.strip().splitlines()[0])
    except Exception:
        return None


def cool_down():
    t = gpu_temp()
    if t is None or t < HOT_C:
        return t
    print(f"  GPU a {t} °C, pausando até {COOL_C} °C", flush=True)
    while (t := gpu_temp()) is not None and t > COOL_C:
        time.sleep(10)
    return t


def strong_reference(dst: Path) -> Path:
    """Junta os trechos mais fortes da gravação (~10 s, sem silêncios)."""
    a, sr = sf.read(REF_SRC, always_2d=True)
    a = a.mean(1)
    w = int(sr * 0.02)
    n = len(a) // w
    r = np.sqrt((a[: n * w].reshape(n, w) ** 2).mean(1))
    v = r > 0.03
    segs, i = [], 0
    while i < n:
        if v[i]:
            j = i
            while j < n and (v[j] or v[j : j + 8].any()):
                j += 1
            segs.append((i, j))
            i = j
        else:
            i += 1
    out, tot, gap = [], 0.0, np.zeros(int(sr * 0.12))
    for s, e in segs:
        if (e - s) * w / sr > 0.3 and r[s:e].mean() > 0.10:
            out += [a[s * w : e * w], gap]
            tot += (e - s) * w / sr
            if tot > 11:
                break
    ref = np.concatenate(out)
    sf.write(dst, ref * 0.89 / np.abs(ref).max(), sr)
    return dst


def frames_db(a, sr, ms=20):
    w = int(sr * ms / 1000)
    n = len(a) // w
    return 20 * np.log10(np.sqrt((a[: n * w].reshape(n, w) ** 2).mean(1) + 1e-12)), w


def clean(a, sr):
    """Corta silêncio, abafa o ruído entre palavras; devolve (áudio, maior buraco s)."""
    db, w = frames_db(a, sr)
    thr = db.max() - 35
    voiced = np.where(db > thr)[0]
    if len(voiced) == 0:
        return a, 0.0
    s = max(voiced[0] * w - int(0.04 * sr), 0)
    e = min((voiced[-1] + 1) * w + int(0.08 * sr), len(a))
    a = a[s:e].copy()
    db, w = frames_db(a, sr)
    g = np.convolve(np.where(db > thr, 1.0, 10 ** (-18 / 20)), np.ones(5) / 5, mode="same")
    gain = np.repeat(g, w)
    a *= np.pad(gain, (0, len(a) - len(gain)), constant_values=gain[-1])
    f = int(0.01 * sr)
    a[:f] *= np.linspace(0, 1, f)
    a[-f:] *= np.linspace(1, 0, f)
    a *= 10 ** (-1 / 20) / (np.abs(a).max() + 1e-9)
    gaps, run = [0], 0
    for x in frames_db(a, sr)[0] > thr:
        run = 0 if x else run + 1
        gaps.append(run)
    return a, max(gaps) * w / sr


def envelope(y, sr, attack=0.01, release=0.15):
    w = int(sr * 0.01)
    n = len(y) // w + 1
    db = 20 * np.log10(np.array([np.sqrt((y[i * w : (i + 1) * w] ** 2).mean() + 1e-12) for i in range(n)]))
    target = np.clip((db - (db.max() - 40)) / 20, 0, 1)
    ca, cr = np.exp(-0.01 / attack), np.exp(-0.01 / release)
    env, e = np.zeros(n), 0.0
    for i, t in enumerate(target):
        c = ca if t > e else cr
        e = c * e + (1 - c) * t
        env[i] = e
    return np.repeat(env, w)[: len(y)]


def finish(raw: Path, dst: Path, seed: int):
    with tempfile.TemporaryDirectory() as d:
        fast = os.path.join(d, "t.wav")
        subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(raw), "-af", f"atempo={TEMPO}", fast], check=True)
        a, sr = sf.read(fast)
    x = AF.lowpass_biquad(AF.highpass_biquad(torch.tensor(a).float().unsqueeze(0), sr, 150), sr, 5500)
    y = x.squeeze(0).numpy()
    y = np.tanh(1.6 * y / (np.abs(y).max() + 1e-9)) / np.tanh(1.6)
    noise = np.random.default_rng(seed).normal(0, 1, len(y))
    noise = AF.lowpass_biquad(torch.tensor(noise).float().unsqueeze(0), sr, 6000).squeeze(0).numpy()
    noise /= np.sqrt((noise ** 2).mean())
    y = y + noise * 10 ** (HISS_DB / 20) * envelope(y, sr)
    f = int(0.03 * sr)
    y[-f:] *= np.linspace(1, 0, f)
    y *= 10 ** (-1 / 20) / np.abs(y).max()
    dst.parent.mkdir(parents=True, exist_ok=True)
    sf.write(dst, y.astype(np.float32), sr)
    return len(y) / sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="prefixo, ex.: comandante/attack")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--takes", type=int, default=TAKES, help="tentativas por fala")
    ap.add_argument("--rest", type=float, default=REST_S, help="segundos de pausa entre as falas")
    args = ap.parse_args()

    lines, skipped = load(ROOT / "docs/audio/ROTEIRO_RASCUNHO.md")
    todo = [l for l in lines if f"{l.speaker}/{l.name}".startswith(args.only)
            and not (OUT / l.speaker / f"{l.name}.wav").exists()]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(lines)} falas no roteiro, {len(todo)} a gerar; fora do roteiro: {len(skipped)}", flush=True)
    if not todo:
        return

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    (RAW / "refs").mkdir(parents=True, exist_ok=True)
    base = strong_reference(RAW / "refs/forte.wav")
    a, bsr = sf.read(base)
    refs = {}
    for spk, semis in SHIFT.items():
        x = torch.tensor(a).float().unsqueeze(0)
        if semis:
            x = AF.resample(x, int(bsr * 2 ** (semis / 12)), bsr)
        refs[spk] = RAW / "refs" / f"{spk}.wav"
        sf.write(refs[spk], x.squeeze(0).numpy(), bsr)

    model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
    sr = model.sr
    started = time.time()
    for k, l in enumerate(todo, 1):
        temp = cool_down()
        exag, cfg = style(l.tone)
        text = l.text.replace(",", "")
        expected = 0.07 * len(text) + 0.3
        best = None
        for _ in range(args.takes):
            w = model.generate(text, language_id="pt", audio_prompt_path=str(refs[VOICE.get(l.speaker, l.speaker)]),
                               exaggeration=exag, cfg_weight=cfg, temperature=0.7)
            audio, gap = clean(w.squeeze(0).cpu().numpy(), sr)
            dur = len(audio) / sr
            key = (not (dur < expected * 1.8 and gap < 0.3), abs(dur - expected))
            if best is None or key < best[0]:
                best = (key, audio, gap)
        (bad, _), audio, gap = best
        raw = RAW / l.speaker / f"{l.name}.wav"
        raw.parent.mkdir(parents=True, exist_ok=True)
        sf.write(raw, audio, sr)
        dur = finish(raw, OUT / l.speaker / f"{l.name}.wav", zlib.crc32(f"{l.speaker}/{l.name}".encode()))
        eta = (time.time() - started) / k * (len(todo) - k) / 60
        print(f"[{k}/{len(todo)}] {l.speaker}/{l.name} {dur:.2f}s gap={gap:.2f} "
              f"{temp if temp is not None else '?'}°C ~{eta:.0f} min{' (nenhuma tomada passou)' if bad else ''}",
              flush=True)
        torch.cuda.empty_cache()
        if k < len(todo):
            print(f"  pausa de {args.rest:.0f} s", flush=True)
            time.sleep(args.rest)


if __name__ == "__main__":
    main()
