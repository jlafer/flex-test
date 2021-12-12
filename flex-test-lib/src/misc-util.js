export function terminateProcess(message, code) {
  console.log(message);
  process.exit(code);
}