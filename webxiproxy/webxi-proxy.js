import express from "express";
import cors from "cors";
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

// ✅ Only parse JSON for your own API (not proxied)
app.use('/internal', express.json());

// ✅ Proxy raw body (unparsed) to the device
app.use('/api', createProxyMiddleware({
  target: 'http://10.42.0.1',   // your device IP
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  selfHandleResponse: false,
  onProxyReq: (proxyReq, req, res) => {
    // Important: do not touch req.body here!
  },
}));


app.listen(4000, () => console.log("Proxy running on http://localhost:4000"));
