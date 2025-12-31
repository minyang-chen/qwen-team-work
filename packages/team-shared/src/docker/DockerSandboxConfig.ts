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
