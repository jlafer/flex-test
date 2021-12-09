module.exports = (message, exit) => {
  console.log(message);
  exit && process.exit(0);
}
