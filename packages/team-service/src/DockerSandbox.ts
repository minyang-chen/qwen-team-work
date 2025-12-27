import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerSandboxConfig {
  image: string;
  workspaceDir: string;
  userId: string;
  network?: string;
  memory?: string;
  cpus?: number;
  timeout?: number;
  readOnly?: boolean;
  noNetwork?: boolean;
}

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
      readOnly: config.readOnly ?? true,
      noNetwork: config.noNetwork ?? true
    };
    this.containerName = `qwen-sandbox-${config.userId}`.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Start persistent container for this user
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
        // Create new container
        console.log(`🐳 Creating new container: ${this.containerName}`);
        console.log(`   - Image: ${this.config.image}`);
        console.log(`   - Workspace: ${this.config.workspaceDir}`);

        await execAsync(`docker run -d \
          --name ${this.containerName} \
          --user 1000:1000 \
          --security-opt no-new-privileges:true \
          --cap-drop ALL \
          --cap-add CHOWN \
          --cap-add SETUID \
          --cap-add SETGID \
          --read-only \
          --tmpfs /tmp:rw,noexec,nosuid,size=1G \
          -v "${this.config.workspaceDir}:/workspace:ro" \
          -w /workspace \
          --network ${this.config.noNetwork ? 'none' : (this.config.network || 'bridge')} \
          --memory ${this.config.memory} \
          --cpus ${this.config.cpus} \
          --security-opt apparmor:docker-default \
          ${this.config.image} \
          tail -f /dev/null`);
        console.log(`🐳 ✅ Created new container: ${this.containerName}`);
      }

      this.isRunning = true;
    } catch (error) {
      console.error(
        `🐳 ❌ Failed to start container for user ${this.config.userId}:`,
        error,
      );
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
          '-u',
          'root',
          '-w',
          '/workspace',
          this.containerName,
          '/bin/bash',
          '-c',
          command,
        ],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
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
   * Reset sandbox - remove and recreate container
   */
  async reset(): Promise<void> {
    try {
      await execAsync(`docker rm -f ${this.containerName}`);
      this.isRunning = false;
      await this.start();
      console.log(`🐳 Reset container: ${this.containerName}`);
    } catch (error) {
      console.error('Failed to reset container:', error);
      throw error;
    }
  }

  /**
   * Restart sandbox - stop and start container
   */
  async restart(): Promise<void> {
    try {
      await execAsync(`docker restart ${this.containerName}`);
      console.log(`🐳 Restarted container: ${this.containerName}`);
    } catch (error) {
      console.error('Failed to restart container:', error);
      throw error;
    }
  }

  /**
   * Save sandbox state as image
   */
  async save(snapshotName?: string): Promise<string> {
    const imageName =
      snapshotName || `${this.containerName}-snapshot-${Date.now()}`;
    try {
      await execAsync(`docker commit ${this.containerName} ${imageName}`);
      console.log(`🐳 Saved snapshot: ${imageName}`);
      return imageName;
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      throw error;
    }
  }

  /**
   * Load sandbox from saved image
   */
  async load(snapshotName: string): Promise<void> {
    try {
      // Stop and remove current container
      await execAsync(`docker rm -f ${this.containerName}`);
      this.isRunning = false;

      // Create new container from snapshot
      this.config.image = snapshotName;
      await this.start();
      console.log(`🐳 Loaded snapshot: ${snapshotName}`);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      throw error;
    }
  }

  /**
   * List available snapshots for this user
   */
  async listSnapshots(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `docker images --filter reference="${this.containerName}-snapshot-*" --format "{{Repository}}:{{Tag}}"`,
      );
      return stdout.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Get sandbox information
   */
  async getSandboxInfo(): Promise<{
    containerName: string;
    image: string;
    status: string;
    workspaceDir: string;
    userId: string;
    uptime?: string;
    memory?: string;
    cpu?: string;
  }> {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${this.containerName} --format '{{StateStatus}}|{{StateStartedAt}}|{{HostConfigMemory}}|{{HostConfigNanoCpus}}'`,
      );
      const [status, startedAt, memory, nanoCpus] = stdout.trim().split('|');

      const uptimeMs =
        status === 'running' && startedAt ? Date.now() - new Date(startedAt).getTime() : 0;
      const uptimeHours = Math.floor(uptimeMs / 3600000);
      const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

      return {
        containerName: this.containerName,
        image: this.config.image,
        status: status || 'unknown',
        workspaceDir: this.config.workspaceDir || '/tmp/workspace',
        userId: this.config.userId || 'unknown',
        uptime:
          status === 'running'
            ? `${uptimeHours}h ${uptimeMinutes}m`
            : 'Not running',
        memory: memory ? `${parseInt(memory) / 1024 / 1024 / 1024}GB` : '1GB',
        cpu: nanoCpus ? `${parseInt(nanoCpus) / 1000000000} CPUs` : '2 CPUs',
      };
    } catch {
      return {
        containerName: this.containerName,
        image: this.config.image,
        status: 'not created',
        workspaceDir: this.config.workspaceDir || '/tmp/workspace',
        userId: this.config.userId || 'unknown',
      };
    }
  }

  /**
   * Stop container
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    try {
      await execAsync(`docker stop ${this.containerName}`);
      this.isRunning = false;
      console.log(`🐳 Stopped container: ${this.containerName}`);
    } catch {
      console.error('Failed to stop container');
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

  /**
   * Pull Docker image if not exists
   */
  static async ensureImage(image: string): Promise<void> {
    try {
      await execAsync(`docker pull ${image}`);
    } catch {
      throw new Error(`Failed to pull image ${image}`);
    }
  }

  /**
   * Install package in container
   */
  async installPackage(
    packageManager: 'apt' | 'pip' | 'npm',
    packageName: string,
  ): Promise<void> {
    const commands = {
      apt: `apt-get update && apt-get install -y ${packageName}`,
      pip: `pip install ${packageName}`,
      npm: `npm install -g ${packageName}`,
    };

    await this.execute(commands[packageManager]);
  }
}
