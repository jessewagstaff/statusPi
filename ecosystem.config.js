module.exports = {
  apps: [
    {
      "name": "display",
      "script": "display/server/index.js",
      "node_args": "--no-expose-wasm"
    }
  ]
};
