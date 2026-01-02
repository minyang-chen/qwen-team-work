/**
 * Truncator for large tool outputs to prevent context overflow
 */
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TruncationConfig {
  threshold: number;        // Character count threshold
  truncateLines: number;    // Number of lines to keep
  outputDir: string;        // Directory to save full output
}

export interface TruncationResult {
  content: string;
  outputFile?: string;
  truncated: boolean;
}

export class ToolOutputTruncator {
  constructor(private config: TruncationConfig) {}
  
  async truncateIfNeeded(
    content: string,
    callId: string
  ): Promise<TruncationResult> {
    if (content.length <= this.config.threshold) {
      return { content, truncated: false };
    }

    let lines = content.split('\n');
    
    // If content is long but has few lines, wrap it
    if (lines.length <= this.config.truncateLines) {
      const wrapWidth = 120;
      const wrappedLines: string[] = [];
      for (const line of lines) {
        if (line.length > wrapWidth) {
          for (let i = 0; i < line.length; i += wrapWidth) {
            wrappedLines.push(line.substring(i, i + wrapWidth));
          }
        } else {
          wrappedLines.push(line);
        }
      }
      lines = wrappedLines;
    }

    const head = Math.floor(this.config.truncateLines / 5);
    const beginning = lines.slice(0, head);
    const end = lines.slice(-(this.config.truncateLines - head));
    
    const truncatedContent =
      beginning.join('\n') + 
      '\n... [CONTENT TRUNCATED] ...\n' + 
      end.join('\n');

    // Save full output to file
    const safeFileName = `${path.basename(callId)}.output`;
    const outputFile = path.join(this.config.outputDir, safeFileName);
    
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.writeFile(outputFile, content);

      return {
        content: `Tool output was too large and has been truncated.
Full output saved to: ${outputFile}
Use read_file tool to view complete output.

Truncated output (showing beginning and end):
${truncatedContent}`,
        outputFile,
        truncated: true
      };
    } catch (error) {
      return {
        content: truncatedContent + `\n[Note: Could not save full output to file]`,
        truncated: true
      };
    }
  }
}
