module.exports = {
  glob: ['./*.spec.js'],
  babel: {
    enable: false,
  },
  mocha: {
    bail: false,
    timeout: 30000,
  },
};
