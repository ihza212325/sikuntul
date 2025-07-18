const express = require("express");
const app = express();
const port = 3000;
const cron = require("node-cron");
const axios = require("axios");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

cron.schedule("*/5 * * * * *", async () => {
  console.log("running a task every 5 seconds");

  try {
    const response = await axios.post(
      "https://scanner.tradingview.com/indonesia/scan?label-product=screener-stock",
      {
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
      },
      {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "text/plain;charset=UTF-8",
          cookie:
            '_sp_ses.cf1a=*; cookiePrivacyPreferenceBannerProduction=notApplicable; cookiesSettings={"analytics":true,"advertising":true}; device_t=RFVlYUJnOjA.9cX440p2p7P_TC7WFlV2hKDw6H-kaEyECxfO0r03yVg; sessionid=ikjgnrlaiis60j2vlsy7i0h4k3appf67; sessionid_sign=v3:vgn4CjG5rh4w/pDUNYIMXrjS885ZeEzZRcaIAvOE4bc=; png=97c2dec9-dcad-4a63-823c-ad29919b7f7a; etg=97c2dec9-dcad-4a63-823c-ad29919b7f7a; cachec=97c2dec9-dcad-4a63-823c-ad29919b7f7a; tv_ecuid=97c2dec9-dcad-4a63-823c-ad29919b7f7a; theme=dark; _sp_id.cf1a=94a09b8c-8261-415e-8c7e-4225f8797fbf.1752771545.1.1752779189..24b5134d-6760-46df-bc36-627b4dfd26c7..ed9a0cf3-02d1-43ee-83d2-aae08c36f2ca.1752771545866.301',
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
        },
      }
    );

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

    console.log("Transformed data:", transformedData.slice(0, 5));
    console.log("Total stocks found:", response.data.totalCount);
  } catch (error) {
    console.error("Error making request to TradingView:", error.message);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
