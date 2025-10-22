import { MyBackend } from "../MyBackend";

const EXTENSION = __filename.substring(__filename.length - 2);
if (EXTENSION === "js") require("source-map-support/register");

// AsyncQueueClosedError 로그 필터링 (Agentica 내부 타이밍 이슈)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // AsyncQueueClosedError는 무시 (Agentica 라이브러리 내부 이슈)
  if (args[0]?.name === 'AsyncQueueClosedError') {
    return;
  }
  originalConsoleError.apply(console, args);
};

async function main(): Promise<void> {
  // BACKEND SEVER
  const backend: MyBackend = new MyBackend();
  await backend.open();

  // UNEXPECTED ERRORS
  global.process.on("uncaughtException", console.error);
  global.process.on("unhandledRejection", console.error);
}
main().catch((exp) => {
  console.log(exp);
  process.exit(-1);
});
