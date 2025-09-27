import { createWriteStream } from "fs";
import { join } from "path";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  error?: any;
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logFilePath: string;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.logToFile = process.env.LOG_TO_FILE === "true";
    this.logFilePath =
      process.env.LOG_FILE_PATH || join(process.cwd(), "logs", "app.log");
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case "ERROR":
        return LogLevel.ERROR;
      case "WARN":
        return LogLevel.WARN;
      case "INFO":
        return LogLevel.INFO;
      case "DEBUG":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(
    level: string,
    message: string,
    context?: string,
    error?: any,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? this.serializeError(error) : undefined,
      metadata,
    };
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return error;
  }

  private writeToFile(logEntry: LogEntry): void {
    if (!this.logToFile) return;

    try {
      const logStream = createWriteStream(this.logFilePath, { flags: "a" });
      logStream.write(JSON.stringify(logEntry) + "\n");
      logStream.end();
    } catch (error) {
      // Fallback to console if file writing fails
      console.error("Failed to write to log file:", error);
    }
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    context?: string,
    error?: any,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLogEntry(
      levelName,
      message,
      context,
      error,
      metadata
    );

    // Console output with colors
    const timestamp = logEntry.timestamp;
    const contextStr = context ? `[${context}]` : "";
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : "";

    const logMessage = `${timestamp} ${levelName} ${contextStr} ${message}${metadataStr}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        if (error) console.error(error);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
    }

    // Write to file if enabled
    this.writeToFile(logEntry);
  }

  error(
    message: string,
    context?: string,
    error?: any,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.ERROR, "ERROR", message, context, error, metadata);
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.WARN, "WARN", message, context, undefined, metadata);
  }

  info(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.INFO, "INFO", message, context, undefined, metadata);
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.log(LogLevel.DEBUG, "DEBUG", message, context, undefined, metadata);
  }

  // Convenience methods for common use cases
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime?: number
  ): void {
    this.info(`${method} ${url} - ${statusCode}`, "HTTP", {
      method,
      url,
      statusCode,
      responseTime,
    });
  }

  logDatabase(operation: string, table: string, duration?: number): void {
    this.debug(`Database ${operation} on ${table}`, "DATABASE", {
      operation,
      table,
      duration,
    });
  }

  logJob(
    jobId: string,
    status: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    this.info(message, "JOB", { jobId, status, ...metadata });
  }

  logS3(operation: string, key: string, success: boolean, error?: any): void {
    if (success) {
      this.info(`S3 ${operation} successful`, "S3", { operation, key });
    } else {
      this.error(`S3 ${operation} failed`, "S3", error, { operation, key });
    }
  }

  logRabbitMQ(
    operation: string,
    queue: string,
    success: boolean,
    error?: any
  ): void {
    if (success) {
      this.info(`RabbitMQ ${operation} successful`, "RABBITMQ", {
        operation,
        queue,
      });
    } else {
      this.error(`RabbitMQ ${operation} failed`, "RABBITMQ", error, {
        operation,
        queue,
      });
    }
  }
}

// Create and export a singleton instance
const logger = new Logger();
export default logger;
