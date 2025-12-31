import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import type { DockerSandboxConfig } from './DockerSandboxConfig.js';

const execAsync = promisify(exec);

export class DockerSandbox {
  private config: DockerSandboxConfig;
  private containerName: string;
  private isRunning: boolean = false;
  private readonly MAX_MEMORY = '2G';
  private readonly MAX_CPUS = 2;
  private readonly DEFAULT_TIMEOUT = 30000;

  constructor(config: DockerSandboxConfig) {
    this.config = {
      ...config,
      memory: config.memory || this.MAX_MEMORY,
      cpus: config.cpus || this.MAX_CPUS,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
      readOnly: config.readOnly ?? false, // Allow writes for user workspace
      noNetwork: config.noNetwork ?? false // Allow network for package installs
    };
    this.containerName = `qwen-sandbox-${config.userId}`.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Start persistent container for user session
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      console.log(`🐳 Starting sandbox for user ${this.config.userId}`);

      // Check if container already exists
      const { stdout } = await execAsync(
        `docker ps -a --filter name=${this.containerName} --format "{{.Names}}"`,
      );

      if (stdout.trim() === this.containerName) {
        // Container exists, start it
        await execAsync(`docker start ${this.containerName}`);
        console.log(`🐳 ✅ Started existing container: ${this.containerName}`);
      } else {
        // Create new container for user session
        console.log(`🐳 Creating new container: ${this.containerName}`);
        
        await execAsync(`docker run -d \
          --name ${this.containerName} \
          --user 1000:1000 \
          --security-opt no-new-privileges:true \
          --cap-drop ALL \
          --cap-add CHOWN \
          --cap-add SETUID \
          --cap-add SETGID \
          --tmpfs /tmp:rw,noexec,nosuid,size=1G \
          -v "${this.config.workspaceDir}:/workspace" \
          -w /workspace \
          --network ${this.config.noNetwork ? 'none' : (this.config.network || 'bridge')} \
          --memory ${this.config.memory} \
          --cpus ${this.config.cpus} \
          --security-opt apparmor:docker-default \
          ${this.config.image} \
          tail -f /dev/null`);
        console.log(`🐳 ✅ Created container for session: ${this.containerName}`);
      }

      this.isRunning = true;
    } catch (error) {
      console.error(`🐳 ❌ Failed to start container for user ${this.config.userId}:`, error);
      throw error;
    }
  }

  /**
   * Execute command in persistent container
   */
  async execute(
    command: string,
    signal?: AbortSignal,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    await this.start();

    return new Promise((resolve, reject) => {
      const proc = spawn(
        'docker',
        [
          'exec',
          '-u', '1000:1000',
          '-w', '/workspace',
          this.containerName,
          '/bin/bash',
          '-c',
          command,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: any) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      proc.on('error', (error) => {
        reject(error);
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
        });
      }
    });
  }

  /**
   * Cleanup container on user logout/session timeout
   */
  async cleanup(): Promise<void> {
    try {
      console.log(`🐳 Cleaning up container for user ${this.config.userId}`);
      await execAsync(`docker rm -f ${this.containerName}`);
      this.isRunning = false;
      console.log(`🐳 ✅ Cleaned up container: ${this.containerName}`);
    } catch (error) {
      console.error(`🐳 ❌ Failed to cleanup container: ${error}`);
    }
  }

  /**
   * Get container status
   */
  async getStatus(): Promise<'running' | 'stopped' | 'not-found'> {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${this.containerName} --format '{{.State.Status}}'`
      );
      return stdout.trim() as 'running' | 'stopped';
    } catch {
      return 'not-found';
    }
  }

  /**
   * Check if Docker is available
   */
  static async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  getContainerName(): string {
    return this.containerName;
  }

  getUserId(): string {
    return this.config.userId;
  }
}
