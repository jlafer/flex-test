export default function(message, exit) {
  console.error(message);
  exit && process.exit(1);
}
