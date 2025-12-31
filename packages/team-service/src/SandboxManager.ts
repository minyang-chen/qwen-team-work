import { DockerSandbox } from '@qwen-team/shared';
import {
  SANDBOX_IDLE_TIMEOUT,
  SANDBOX_CLEANUP_INTERVAL,
  SANDBOX_IMAGE,
  SANDBOX_NETWORK,
  SANDBOX_MEMORY,
  SANDBOX_CPUS,
} from './config.js';

interface SandboxEntry {
  sandbox: DockerSandbox;
  lastActivity: number;
}

export class SandboxManager {
  private sandboxes = new Map<string, SandboxEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Get or create sandbox for user
   */
  async getSandbox(
    userId: string,
    workspaceDir: string,
  ): Promise<DockerSandbox> {
    let entry = this.sandboxes.get(userId);

    if (!entry) {
      const sandbox = new DockerSandbox({
        image: SANDBOX_IMAGE,
        workspaceDir,
        userId,
        network: SANDBOX_NETWORK,
        memory: SANDBOX_MEMORY,
        cpus: SANDBOX_CPUS,
      });

      await sandbox.start();
      console.log('🐳 Created sandbox for user:', userId);

      entry = {
        sandbox,
        lastActivity: Date.now(),
      };

      this.sandboxes.set(userId, entry);
    } else {
      // Update last activity
      entry.lastActivity = Date.now();
    }

    return entry.sandbox;
  }

  /**
   * Update last activity time for user's sandbox
   */
  updateActivity(userId: string): void {
    const entry = this.sandboxes.get(userId);
    if (entry) {
      entry.lastActivity = Date.now();
    }
  }

  /**
   * Start cleanup task to remove idle sandboxes
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const toRemove: string[] = [];

      for (const [userId, entry] of this.sandboxes.entries()) {
        const idleTime = now - entry.lastActivity;

        if (idleTime > SANDBOX_IDLE_TIMEOUT) {
          console.log(
            `🐳 Stopping idle sandbox for user ${userId} (idle: ${Math.floor(idleTime / 60000)}m)`,
          );

          try {
            await entry.sandbox.cleanup();
            toRemove.push(userId);
          } catch (error) {
            console.error(`Failed to stop sandbox for user ${userId}:`, error);
          }
        }
      }

      // Remove stopped sandboxes
      toRemove.forEach((userId) => this.sandboxes.delete(userId));

      if (toRemove.length > 0) {
        console.log(`🐳 Cleaned up ${toRemove.length} idle sandbox(es)`);
      }
    }, SANDBOX_CLEANUP_INTERVAL);

    console.log(
      `🐳 Sandbox cleanup task started (timeout: ${SANDBOX_IDLE_TIMEOUT / 60000}m, interval: ${SANDBOX_CLEANUP_INTERVAL / 60000}m)`,
    );
  }

  /**
   * Stop cleanup task
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Stop all sandboxes
   */
  async stopAll(): Promise<void> {
    console.log('🐳 Stopping all sandboxes');

    const promises = Array.from(this.sandboxes.values()).map((entry) =>
      entry.sandbox
        .cleanup()
        .catch((err: any) => console.error('Error stopping sandbox:', err)),
    );

    await Promise.all(promises);
    this.sandboxes.clear();
  }
}
