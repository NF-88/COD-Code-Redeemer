(async function () {
  const redeemerConfig = {
    interval: 1000,
    retryInterval: 2000,
    codes: `
a
b
c
d
    `
      .split("\n")
      .map((code) => code.trim())
      .filter((code) => code),
  };

  async function redeem(code, index) {
    let status = {
      success: false,
      retry: false,
      message: "",
    };

    try {
      const response = await fetch(
        "https://profile.callofduty.com/promotions/redeemCode/",
        {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "en-GB,en;q=0.7",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua":
              '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
          },
          referrer: "https://profile.callofduty.com/promotions/redeemCode",
          body: `code=${code}`,
          method: "POST",
          mode: "cors",
          credentials: "include",
        },
      );

      if (response.status !== 200) {
        status = {
          success: false,
          retry: false,
          message: "Unexpected response status",
        };
      } else {
        try {
          const body = await response.text();

          if (body.includes("success-container")) {
            status = {
              success: true,
              retry: false,
              message: "Redeemed",
            };
          } else if (body.includes("You already used the code entered.")) {
            status = {
              success: true,
              retry: false,
              message: "Already redeemed by self",
            };
          } else if (
            body.includes("The 2XP code you entered has already been redeemed.")
          ) {
            status = {
              success: false,
              retry: false,
              message: "Already redeemed by someone else",
            };
          } else if (body.includes("Too many attempts.")) {
            status = {
              success: false,
              retry: true,
              message: "Rate limited",
            };
          } else {
            status = {
              success: false,
              retry: false,
              message: "Unexpected response body",
            };
          }
        } catch {
          status = {
            success: false,
            retry: false,
            message: "Failed to get response body",
          };
        }
      }
    } catch {
      status = {
        success: false,
        retry: false,
        message: "Request failed",
      };
    }

    console.log(
      `[${index}] ${code} (${status.success ? "Success" : "Failed"}): ${
        status.message
      }`,
    );

    return status;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const statistics = {
    success: 0,
    failed: 0,
  };

  function modifyStatistics(success) {
    if (success) statistics.success += 1;
    else statistics.failed += 1;
  }

  for (const [_index, code] of redeemerConfig.codes.entries()) {
    const index = _index + 1;
    const status = await redeem(code, index);

    if (status.retry) {
      console.log(
        `[${index}] ${code}: Retrying in ${
          redeemerConfig.retryInterval / 1000
        } seconds`,
      );

      await delay(redeemerConfig.retryInterval);
      const retryStatus = await redeem(code, index);
      modifyStatistics(retryStatus.success);
    } else {
      modifyStatistics(status.success);
    }

    await delay(redeemerConfig.interval);
  }

  console.log(
    `[Done] ${statistics.success} succeeded, ${statistics.failed} failed`,
  );
})();