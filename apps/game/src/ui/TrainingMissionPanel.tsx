import { Check, ChevronRight, RotateCcw, Target } from 'lucide-react';
import {
  translate,
  type ExercisePhase,
  type Locale,
  type MessageKey,
  type TrainingAction,
} from '@prestes/content';
import type { RuntimeObjective } from '../training/exercise';

export interface TrainingMissionPanelProps {
  locale: Locale;
  phase: ExercisePhase;
  phaseIndex: number;
  totalPhases: number;
  objectives: readonly RuntimeObjective[];
  completed: boolean;
  failed: boolean;
  failureReason: string | null;
  feedbackKey: string | null;
  completedDrills: ReadonlySet<TrainingAction>;
  debrief: {
    timeTicks: number;
    ammo: number;
    peakSuppression: number;
    alive: number;
    total: number;
  } | null;
  onContinue: () => void;
  onReplay: () => void;
  onRetry: () => void;
}

const DRILL_KEYS: Partial<Record<TrainingAction, MessageKey>> = {
  'camera-pan': 'training.step.pan',
  'camera-zoom': 'training.step.zoom',
  'camera-rotate': 'training.step.rotate',
  select: 'training.step.select',
  move: 'training.step.move',
  formation: 'training.bootcamp.stepFormation',
  'hold-fire': 'training.bootcamp.stepHoldFire',
  suppress: 'training.bootcamp.stepSuppress',
  flank: 'training.bootcamp.stepFlank',
  attack: 'training.bootcamp.stepAttack',
  'stance-crouch': 'training.step.crouch',
  'stance-prone': 'training.step.prone',
  defend: 'training.bootcamp.stepDefend',
  ambush: 'training.bootcamp.stepAmbush',
  'protect-officer': 'training.bootcamp.stepProtectOfficer',
  rescue: 'training.bootcamp.stepRescue',
  withdraw: 'training.bootcamp.stepWithdraw',
  bounding: 'training.bootcamp.stepBounding',
};

function formatTicks(ticks: number): string {
  const total = Math.max(0, Math.ceil(ticks / 10));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TrainingMissionPanel({
  locale,
  phase,
  phaseIndex,
  totalPhases,
  objectives,
  completed,
  failed,
  failureReason,
  feedbackKey,
  completedDrills,
  debrief,
  onContinue,
  onReplay,
  onRetry,
}: TrainingMissionPanelProps) {
  const t = (key: MessageKey, values?: Readonly<Record<string, string | number>>) =>
    translate(locale, key, values);
  const done = objectives.filter((objective) => objective.done).length;
  const progress = objectives.length === 0 ? 0 : (done / objectives.length) * 100;

  return (
    <aside
      className="tutorial-panel training-mission-panel"
      data-testid="training-panel"
      data-phase={phase.id}
    >
      <header>
        <span>
          <Target aria-hidden="true" size={15} />
          {t('training.bootcamp.title')}
        </span>
        <span className="tutorial-fictional">{t('training.fictional')}</span>
      </header>

      <div className="tutorial-chapter">
        <span>{t(phase.titleKey)}</span>
        <strong>{t('training.exercise.phase', { phase: phaseIndex + 1, total: totalPhases })}</strong>
        <span data-testid="training-zone">{t(phase.objectiveKey)}</span>
      </div>

      {completed ? (
        <div className="tutorial-graduation" data-testid="training-complete">
          <strong>{t('training.exercise.debrief.title')}</strong>
          {debrief ? (
            <dl className="training-debrief-grid">
              <dt>{t('training.exercise.debrief.time')}</dt>
              <dd>{formatTicks(debrief.timeTicks)}</dd>
              <dt>{t('training.exercise.debrief.ammo')}</dt>
              <dd>{debrief.ammo}</dd>
              <dt>{t('training.exercise.debrief.suppression')}</dt>
              <dd>{debrief.peakSuppression}%</dd>
              <dt>{t('training.exercise.debrief.status')}</dt>
              <dd>
                {debrief.alive}/{debrief.total}
              </dd>
            </dl>
          ) : null}
          <p>{t('training.exercise.debrief.assessment')}</p>
          <div className="tutorial-actions">
            <button type="button" className="secondary" onClick={onReplay} data-testid="training-replay">
              <RotateCcw aria-hidden="true" size={15} />
              {t('training.exercise.debrief.replay')}
            </button>
            <button type="button" className="secondary" onClick={onContinue} data-testid="training-continue">
              <ChevronRight aria-hidden="true" size={15} />
              {t('training.exercise.debrief.continue')}
            </button>
          </div>
        </div>
      ) : failed ? (
        <div className="tutorial-graduation training-failure" data-testid="training-failure">
          <strong>{t('training.exercise.failure.title')}</strong>
          <p>{failureReason ? t(failureReason as MessageKey) : t('training.exercise.failure.line')}</p>
          <div className="tutorial-actions">
            <button type="button" className="secondary" onClick={onRetry} data-testid="training-retry">
              <RotateCcw aria-hidden="true" size={15} />
              {t('training.exercise.retryPhase')}
            </button>
            <button type="button" className="secondary" onClick={onReplay} data-testid="training-replay">
              {t('training.exercise.restart')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="tutorial-objective" data-testid="training-objective">
            {t(phase.objectiveKey)}
          </p>
          <p className="tutorial-dialogue" data-testid="training-dialogue">
            {t(phase.instructorKey)}
          </p>
          <p className="tutorial-hint">{t(phase.hintKey)}</p>

          <div className="training-objectives" data-testid="training-objectives">
            {objectives.map((objective) => (
              <div
                key={objective.id}
                className={`training-objective-row ${objective.done ? 'done' : ''}`}
              >
                <span>{objective.done ? <Check aria-hidden="true" size={13} /> : null}</span>
                <span>{t(objective.labelKey)}</span>
                <strong>
                  {objective.kind === 'hold'
                    ? `${formatTicks(objective.current)} / ${formatTicks(objective.target)}`
                    : `${objective.current}/${objective.target}`}
                </strong>
              </div>
            ))}
          </div>

          <div className="tutorial-progress" aria-label={`${done}/${objectives.length}`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          {feedbackKey ? (
            <p className="tutorial-feedback" data-testid="training-feedback">
              <Check aria-hidden="true" size={14} />
              {t(feedbackKey as MessageKey)}
            </p>
          ) : null}

          <details className="training-drills">
            <summary>{t('training.exercise.drills')}</summary>
            <p>{t('training.exercise.drillsHint')}</p>
            <ul>
              {phase.drills.map((drill) => (
                <li key={drill} className={completedDrills.has(drill) ? 'done' : ''}>
                  {t(DRILL_KEYS[drill] ?? 'training.objective')}
                </li>
              ))}
            </ul>
          </details>

          <div className="tutorial-actions">
            <button type="button" className="secondary" onClick={onReplay} data-testid="training-replay">
              <RotateCcw aria-hidden="true" size={15} />
              {t('training.exercise.restart')}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}



