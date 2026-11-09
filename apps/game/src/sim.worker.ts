import { SimulationEngine, createSimulationHost } from '@prestes/simulation';
import type { PortLike, WorkerRequest } from '@prestes/shared';

const port: PortLike = {
  postMessage: (message) => {
    self.postMessage(message);
  },
};

const host = createSimulationHost(
  (seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment) =>
    // add-deployment-phase: a battle with the phase also has the enemy deploy.
    new SimulationEngine({ seed, sandbox, training, opposition, bounding, scenario, battleMap, rosters, deployment, enemyDeployment: deployment }),
  port,
);

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

scope.onmessage = (event) => {
  host.handle(event.data);
};




