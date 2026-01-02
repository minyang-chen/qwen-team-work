/**
 * Validator for tool registry to ensure all tools have proper declarations
 */

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  toolCount: number;
}

export class ToolRegistryValidator {
  /**
   * Validate tool registry for common issues
   */
  static validate(toolRegistry: any): ValidationResult {
    const tools = toolRegistry.getAllTools();
    const issues: string[] = [];
    
    for (const tool of tools) {
      const declaration = tool.getFunctionDeclaration();
      
      // Check required fields
      if (!declaration.name) {
        issues.push(`Tool missing name: ${JSON.stringify(declaration)}`);
      }
      
      if (!declaration.description) {
        issues.push(`Tool ${declaration.name} missing description`);
      }
      
      // Check parameters
      if (!declaration.parameters || !declaration.parameters.properties) {
        issues.push(`Tool ${declaration.name} missing parameter definitions`);
      } else {
        // Validate parameter types
        const params = declaration.parameters.properties;
        for (const [paramName, paramDef] of Object.entries(params)) {
          if (!(paramDef as any).type) {
            issues.push(`Tool ${declaration.name} parameter ${paramName} missing type`);
          }
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      toolCount: tools.length
    };
  }
  
  /**
   * Fix common tool declaration issues
   */
  static fixCommonIssues(toolRegistry: any): void {
    const tools = toolRegistry.getAllTools();
    
    for (const tool of tools) {
      const declaration = tool.getFunctionDeclaration();
      
      // Fix write_file parameters
      if (declaration.name === 'write_file' && !declaration.parameters?.properties) {
        declaration.parameters = {
          type: "object",
          properties: {
            file_path: { 
              type: "string", 
              description: "Absolute path to the file" 
            },
            content: { 
              type: "string", 
              description: "Content to write" 
            }
          },
          required: ["file_path", "content"]
        };
      }
      
      // Fix run_shell_command parameters
      if (declaration.name === 'run_shell_command' && !declaration.parameters?.properties) {
        declaration.parameters = {
          type: "object",
          properties: {
            command: { 
              type: "string", 
              description: "Shell command to execute" 
            },
            is_background: { 
              type: "boolean", 
              description: "Run in background",
              default: false
            }
          },
          required: ["command"]
        };
      }
      
      // Fix list_directory parameters
      if (declaration.name === 'list_directory' && !declaration.parameters?.properties) {
        declaration.parameters = {
          type: "object",
          properties: {
            path: { 
              type: "string", 
              description: "Directory path to list" 
            }
          },
          required: ["path"]
        };
      }
    }
  }
}
