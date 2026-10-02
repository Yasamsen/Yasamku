import axios from "axios";

const MAX_REQUESTS = 99999;
const TIMEOUT = 5000;

/*
 * Masukkan domain yang memang kamu miliki/izinkan untuk dites.
 *
 * Contoh:
 * "api.yasamdev.web.id"
 * "example.com"
 */
const ALLOWED_HOSTS = new Set([
  "https://www.myrepublic.co.id"
]);

function isAllowedTarget(target) {
  try {
    const url = new URL(target);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    return ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function handleHome(req, res) {
  return res.status(200).json({
    status: true,
    message: "Axios Request Tester API aktif.",
    endpoint: "/api/test",
    method: "POST",
    maxRequests: MAX_REQUESTS
  });
}

async function handleTest(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      status: false,
      message: "Method tidak diizinkan. Gunakan POST.",
      error: "Method Not Allowed"
    });
  }

  try {
    const body = req.body || {};

    const target = String(body.target || "").trim();
    const requests = Number(body.requests);

    if (!target) {
      return res.status(400).json({
        status: false,
        message: "Domain atau URL wajib diisi.",
        error: "Target is required"
      });
    }

    if (!isAllowedTarget(target)) {
      return res.status(403).json({
        status: false,
        message: "Domain tidak masuk daftar domain yang diizinkan.",
        error: "Target Not Allowed"
      });
    }

    if (!Number.isInteger(requests)) {
      return res.status(400).json({
        status: false,
        message: "Jumlah request harus berupa angka bulat.",
        error: "Invalid request count"
      });
    }

    if (requests < 1) {
      return res.status(400).json({
        status: false,
        message: "Jumlah request minimal 1.",
        error: "Request count too small"
      });
    }

    if (requests > MAX_REQUESTS) {
      return res.status(400).json({
        status: false,
        message: `Jumlah request maksimal ${MAX_REQUESTS}.`,
        error: "Request count too large",
        maxRequests: MAX_REQUESTS
      });
    }

    const results = [];

    for (let i = 0; i < requests; i++) {
      const start = Date.now();

      try {
        const response = await axios.get(target, {
          timeout: TIMEOUT,
          validateStatus: () => true,
          headers: {
            "User-Agent": "Yasam-Axios-Tester/1.0"
          }
        });

        const duration = Date.now() - start;

        results.push({
          request: i + 1,
          status: response.status,
          statusText: response.statusText,
          time: `${duration} ms`,
          success: response.status >= 200 && response.status < 400
        });
      } catch (error) {
        const duration = Date.now() - start;

        results.push({
          request: i + 1,
          status: "FAILED",
          time: `${duration} ms`,
          success: false,
          error: error.code || error.message
        });
      }
    }

    const successful = results.filter(
      item => item.success === true
    ).length;

    const failed = results.length - successful;

    return res.status(200).json({
      status: true,
      message: "Testing selesai.",
      target,
      total: results.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan saat menjalankan tester.",
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  const path = req.url?.split("?")[0];

  if (path === "/" || path === "/api") {
    return handleHome(req, res);
  }

  if (path === "/api/test") {
    return handleTest(req, res);
  }

  return res.status(404).json({
    status: false,
    message: "Endpoint tidak ditemukan.",
    error: "Not Found"
  });
}