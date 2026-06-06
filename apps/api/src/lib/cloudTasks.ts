import { CloudTasksClient } from '@google-cloud/tasks';
import { config } from './config.js';

const client = new CloudTasksClient();

interface EnqueueOptions {
  path: string;
  payload: unknown;
  delaySeconds?: number;
}

export async function enqueueJob({ path, payload, delaySeconds = 0 }: EnqueueOptions): Promise<string> {
  if (config.isEmulator()) {
    // In emulator mode, fire-and-forget HTTP call directly (no Cloud Tasks).
    setImmediate(async () => {
      try {
        await fetch(`${config.workerUrl}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('emulator enqueue failed', e);
      }
    });
    return 'emulator-task';
  }

  const parent = client.queuePath(config.gcpProject, config.gcpRegion, config.cloudTasksQueue);
  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: `${config.workerUrl}${path}`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      oidcToken: { serviceAccountEmail: config.tasksInvokerSA },
    },
    scheduleTime: delaySeconds > 0
      ? { seconds: Math.floor(Date.now() / 1000) + delaySeconds }
      : undefined,
  };
  const [response] = await client.createTask({ parent, task });
  return response.name ?? 'unknown';
}
