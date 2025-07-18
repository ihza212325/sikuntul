const express = require("express");
const app = express();
const port = 3000;
const cron = require("node-cron");
const axios = require("axios");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Add health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "TradingView Scanner",
  });
});

// Add self-ping every 5 minutes to prevent sleep
setInterval(async () => {
  try {
    const response = await axios.get(
      `https://sikuntul-production.up.railway.app/health`
    );
    console.log("Self-ping successful:", response.data.status);
  } catch (error) {
    console.log("Self-ping failed:", error.message);
  }
}, 5 * 60 * 1000); // 5 minutes

cron.schedule("0 1 * * *", async () => {
  console.log("Running daily TradingView scanner at 8 AM WIB (1 AM UTC)");

  try {
    const requestBody = {
      columns: [
        "name",
        "description",
        "logoid",
        "update_mode",
        "type",
        "typespecs",
        "close",
        "pricescale",
        "minmov",
        "fractional",
        "minmove2",
        "currency",
        "SMA200",
        "change",
        "volume",
        "exchange",
      ],
      filter: [
        { left: "close", operation: "greater", right: "SMA200" },
        { left: "change", operation: "greater", right: 0 },
        {
          left: "average_volume_30d_calc",
          operation: "greater",
          right: 10000000,
        },
        { left: "MACD.macd", operation: "greater", right: "MACD.signal" },
        {
          left: "volume",
          operation: "greater",
          right: "average_volume_30d_calc",
        },
        { left: "is_primary", operation: "equal", right: true },
      ],
      ignore_unknown_fields: false,
      options: { lang: "en" },
      range: [0, 100],
      sort: { sortBy: "SMA200", sortOrder: "desc" },
      symbols: {},
      markets: ["indonesia"],
      filter2: {
        operator: "and",
        operands: [
          {
            operation: {
              operator: "and",
              operands: [
                {
                  expression: {
                    left: "recommendation_mark",
                    operation: "nequal",
                    right: 1.25,
                  },
                },
              ],
            },
          },
          {
            operation: {
              operator: "or",
              operands: [
                {
                  expression: {
                    left: "recommendation_mark",
                    operation: "in_range",
                    right: [1, 1.25],
                  },
                },
              ],
            },
          },
          {
            operation: {
              operator: "or",
              operands: [
                {
                  operation: {
                    operator: "and",
                    operands: [
                      {
                        expression: {
                          left: "type",
                          operation: "equal",
                          right: "stock",
                        },
                      },
                      {
                        expression: {
                          left: "typespecs",
                          operation: "has",
                          right: ["common"],
                        },
                      },
                    ],
                  },
                },
                {
                  operation: {
                    operator: "and",
                    operands: [
                      {
                        expression: {
                          left: "type",
                          operation: "equal",
                          right: "stock",
                        },
                      },
                      {
                        expression: {
                          left: "typespecs",
                          operation: "has",
                          right: ["preferred"],
                        },
                      },
                    ],
                  },
                },
                {
                  operation: {
                    operator: "and",
                    operands: [
                      {
                        expression: {
                          left: "type",
                          operation: "equal",
                          right: "dr",
                        },
                      },
                    ],
                  },
                },
                {
                  operation: {
                    operator: "and",
                    operands: [
                      {
                        expression: {
                          left: "type",
                          operation: "equal",
                          right: "fund",
                        },
                      },
                      {
                        expression: {
                          left: "typespecs",
                          operation: "has_none_of",
                          right: ["etf"],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };

    // console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      "https://scanner.tradingview.com/indonesia/scan?label-product=screener-stock",
      requestBody,
      {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "text/plain;charset=UTF-8",
          dnt: "1",
          origin: "https://www.tradingview.com",
          priority: "u=1, i",
          referer: "https://www.tradingview.com/",
          "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          cookie:
            'cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true}; device_t=RFVlYUJnOjA.9cX440p2p7P_TC7WFlV2hKDw6H-kaEyECxfO0r03yVg; sessionid=ikjgnrlaiis60j2vlsy7i0h4k3appf67; sessionid_sign=v3:vgn4CjG5rh4w/pDUNYIMXrjS885ZeEzZRcaIAvOE4bc=; png=97c2dec9-dcad-4a63-823c-ad29919b7f7a; etg=97c2dec9-dcad-4a63-823c-ad29919b7f7a; cachec=97c2dec9-dcad-4a63-823c-ad29919b7f7a; tv_ecuid=97c2dec9-dcad-4a63-823c-ad29919b7f7a; theme=dark; _sp_ses.cf1a=*; _sp_id.cf1a=94a09b8c-8261-415e-8c7e-4225f8797fbf.1752771545.3.1752818700.1752815298.bf380b83-d77c-433b-abbf-677c09d7e726.a01b9327-2257-44ca-b90f-5f32f3763b9e.29ee1448-87b0-4c63-99cb-72ce62bc1815.1752818301193.12',
        },
      }
    );

    // console.log("Response status:", response.status);
    // console.log("Response data keys:", Object.keys(response.data));
    // console.log("Total count:", response.data.totalCount);
    // console.log("Data length:", response.data.data?.length || 0);

    // Transform the data into the new format
    const transformedData = response.data.data
      .map((item) => {
        const name = item.d[0]; // BREN
        const price = item.d[6]; // 7725
        const sma = item.d[12]; // 7178.7
        const selisih = price - sma;

        return {
          name: name,
          price: price,
          sma: sma,
          selisih: selisih,
        };
      })
      .sort((a, b) => a.selisih - b.selisih); // Sort by selisih from smallest to largest

    console.log("Scanner data:", transformedData.slice(0, 5));
    console.log("Total stocks found:", response.data.totalCount);

    // Save top 5 results to JSON file
    const top5Data = transformedData.slice(0, 5);
    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `scanner_results.json`;
    const filePath = path.join(__dirname, "..", "data", fileName);

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, "..", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const jsonData = {
      timestamp: new Date().toISOString(),
      totalCount: response.data.totalCount,
      top5Results: top5Data,
      scanInfo: {
        filters: requestBody.filter,
        markets: requestBody.markets,
        sortBy: requestBody.sort.sortBy,
      },
    };

    // Compare with previous JSON file
    const files = fs
      .readdirSync(dataDir)
      .filter(
        (file) => file.startsWith("scanner_results") && file.endsWith(".json")
      );

    if (files.length > 0) {
      // Sort files by creation time (newest first)
      files.sort((a, b) => {
        const statsA = fs.statSync(path.join(dataDir, a));
        const statsB = fs.statSync(path.join(dataDir, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });

      // Get the newest file
      const previousFile = files[0];
      const previousFilePath = path.join(dataDir, previousFile);

      try {
        const previousData = JSON.parse(
          fs.readFileSync(previousFilePath, "utf8")
        );
        const currentNames = top5Data.map((stock) => stock.name);
        const previousNames = previousData.top5Results.map(
          (stock) => stock.name
        );

        // Compare arrays
        const isSame =
          currentNames.length === previousNames.length &&
          currentNames.every((name, index) => name === previousNames[index]);

        if (isSame) {
          console.log("masih sama");
          // Don't save new JSON file if data is the same
        } else {
          console.log("data berubah");
          console.log("Current:", currentNames);
          console.log("Previous:", previousNames);

          // Save new JSON file only when data changes
          fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
          console.log(`Data saved to: ${filePath}`);

          // Send email only when data changes
          const subject = transformedData
            .slice(0, 5)
            .map((stock) => `${stock.name}`)
            .join(" - ");

          console.log(subject, "ini subject");

          if (transformedData.length > 0) {
            const mailOptions = {
              from: {
                email: "hello@demomailtrap.co",
                name: "Medallion Fund",
              },
              to: [
                {
                  email: "ihza212325@gmail.com",
                },
                {
                  email: "ulaaryoda.indonesia@gmail.com",
                },
              ],
              subject: subject,
              text: `Found ${
                response.data.totalCount
              } stocks matching criteria\n\nTop 5 Results:\n${transformedData
                .slice(0, 5)
                .map(
                  (stock) =>
                    `${stock.name} - Price: ${stock.price}, SMA: ${stock.sma}, Difference: ${stock.selisih}`
                )
                .join("\n")}`,
              html: `
                <h2>TradingView Scanner Results</h2>
                <p>Found ${
                  response.data.totalCount
                } stocks matching criteria</p>
                <h3>Top 5 Results:</h3>
                <ul>
                  ${transformedData
                    .slice(0, 5)
                    .map(
                      (stock) =>
                        `<li><strong>${stock.name}</strong> - Price: ${stock.price}, SMA: ${stock.sma}, Difference: ${stock.selisih}</li>`
                    )
                    .join("")}
                </ul>
              `,
              category: "TradingView Scanner",
            };

            // Send email using Mailtrap API
            const sendEmailWithRetry = async (retries = 3) => {
              for (let i = 0; i < retries; i++) {
                try {
                  const emailResponse = await axios.post(
                    "https://send.api.mailtrap.io/api/send",
                    mailOptions,
                    {
                      headers: {
                        Authorization:
                          "Bearer 36df90f47b1972dc2c725acb18978e43",
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  console.log("Email sent successfully:", emailResponse.data);
                  return;
                } catch (error) {
                  console.error(
                    `Email attempt ${i + 1} failed:`,
                    error.response?.data || error.message
                  );
                  if (i === retries - 1) {
                    console.error("All email attempts failed");
                  } else {
                    // Wait 2 seconds before retry
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                  }
                }
              }
            };

            // Send email with retry logic
            sendEmailWithRetry();
          }
        }
      } catch (error) {
        console.log("Error reading previous file:", error.message);
        // If error reading previous file, save new file anyway
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`Data saved to: ${filePath}`);
      }
    } else {
      // First time running, save the file
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      console.log(`Data saved to: ${filePath}`);
    }
  } catch (error) {
    console.error("Error making request to TradingView:", error.message);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
