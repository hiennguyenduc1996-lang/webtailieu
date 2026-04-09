import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to extract title from Google Drive URL
  app.post("/api/extract-title", async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes("drive.google.com")) {
      return res.status(400).json({ error: "Invalid Google Drive URL" });
    }

    try {
      // Fetch the page content with a mobile User-Agent which often bypasses some bot checks
      // and configure axios to not throw on 4xx/5xx errors so we can handle them
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
        },
        timeout: 10000,
        validateStatus: () => true // Don't throw on any status code
      });

      if (response.status === 401 || response.status === 403) {
        console.warn(`Access denied (Status ${response.status}) for URL: ${url}`);
        return res.status(response.status).json({ 
          error: "Tài liệu đang ở chế độ riêng tư hoặc bị chặn truy cập. Vui lòng kiểm tra quyền chia sẻ.",
          status: response.status
        });
      }

      const $ = cheerio.load(response.data);
      
      // Try to get title from meta tags first (Open Graph)
      let title = $('meta[property="og:title"]').attr('content');
      
      // Fallback to <title> tag
      if (!title) {
        title = $("title").text();
      }

      // Check if the title is just a generic login page title
      if (title && (title.includes("Đăng nhập") || title.includes("Sign in") || title.includes("Google Drive: Access Denied"))) {
        return res.status(401).json({ error: "Yêu cầu đăng nhập hoặc quyền truy cập bị từ chối." });
      }

      if (title) {
        // Clean up common suffixes
        title = title.replace(" - Google Drive", "")
                     .replace(" - Google Tài liệu", "")
                     .replace(" - Google Sheets", "")
                     .replace(" - Google Slides", "")
                     .trim();
        return res.json({ title });
      }

      res.status(404).json({ error: "Không tìm thấy tiêu đề tài liệu" });
    } catch (error) {
      console.error("Error extracting title:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi lấy thông tin tài liệu" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
