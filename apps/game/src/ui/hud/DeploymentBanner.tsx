import type { RejectionReason } from '@prestes/shared';
import type { Translate } from './orderMeta';

/** The refusals of the deployment phase the banner explains (others stay silent, as in battle). */
export const DEPLOYMENT_REFUSALS = ['not_during_deployment', 'outside_deployment_area', 'blocked'] as const satisfies readonly RejectionReason[];
export type DeploymentRefusal = (typeof DEPLOYMENT_REFUSALS)[number];

export function isDeploymentRefusal(reason: RejectionReason): reason is DeploymentRefusal {
  return (DEPLOYMENT_REFUSALS as readonly RejectionReason[]).includes(reason);
}

interface DeploymentBannerProps {
  t: Translate;
  refusal: DeploymentRefusal | null;
  onStartBattle: () => void;
  onReset: () => void;
}

/**
 * add-deployment-phase 3.1: while the battle is in its deployment phase, a
 * banner names it, explains it, and offers "Start battle" (Enter) and
 * "Reset deployment"; a refused order shows its reason under it.
 */
export function DeploymentBanner({ t, refusal, onStartBattle, onReset }: DeploymentBannerProps) {
  return (
    <section className="deployment-banner" data-testid="deployment-banner" aria-live="polite">
      <div className="deployment-banner-text">
        <strong>{t('deployment.title')}</strong>
        <span>{t('deployment.hint')}</span>
      </div>
      <div className="deployment-banner-actions">
        <button type="button" className="secondary" onClick={onReset} data-testid="reset-deployment">
          {t('deployment.reset')}
        </button>
        <button type="button" className="primary" onClick={onStartBattle} data-testid="start-battle" title={t('deployment.startKey')}>
          {t('deployment.start')} <kbd>{t('deployment.key')}</kbd>
        </button>
      </div>
      {refusal ? (
        <p className="deployment-refusal" data-testid="deployment-refusal" data-reason={refusal}>
          {t(`deployment.refusal.${refusal}`)}
        </p>
      ) : null}
    </section>
  );
}
