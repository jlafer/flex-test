export default function(message, exit) {
  console.log(message);
  exit && process.exit(0);
}
