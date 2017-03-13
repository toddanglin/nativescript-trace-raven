export declare class TraceRaven {
  constructor(dsn: string, environment?: string);
  write(message: string, category: string, type?: number): void;
}
