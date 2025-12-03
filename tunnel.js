// tunnel.js
const localtunnel = require("localtunnel");

(async () => {
  const port = 5173;

  const tunnel = await localtunnel({
    port,
    subdomain: "trackguess", // değiştirirsen .env ve panelleri de değiştir
  });

  console.log("LocalTunnel aktif!");
  console.log("URL:", tunnel.url);
  console.log("Port:", port);

  tunnel.on("close", () => {
    console.log("Tunnel kapandı.");
  });

  // Process ayakta kaldığı sürece tünel açık kalır
})();
