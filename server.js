const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors"); // Ensure this is installed if not already (`npm install node-fetch`)

const PORT = process.env.PORT || 8080;
const app = express();

app.use(cors());
app.use(express.json());

app.post("/getting-metadata", async (req, res) => {
  let customerId = req.header("customerId");
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  console.log("customerId1111", customerId);

   // Extract the numeric part from the `gid://shopify/Customer/` string
   if (customerId.startsWith("gid://shopify/Customer/")) {
    customerId = customerId.split("/").pop(); // Extracts the last part after the last "/"
  }

  console.log("Trimmed customerId:", customerId);


  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: "Customer ID is required.",
    });
  }

  try {
    const response = await fetch(
      `https://sandeepgupta.myshopify.com/admin/api/2023-01/customers/${customerId}/metafields.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    console.log(response)
    if (response.ok) {
      const data = await response.json();

      // Check for metafields existence
      if (!data.metafields || data.metafields.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No metafields found for the given customer.",
        });
      }

      // Filter for the TIN number metafield
      const tinMetafield = data.metafields.find(
        (mf) => mf.namespace === "custom" && mf.key === "tin_number"
      );

      console.log("tinMetafield", tinMetafield)

      return res.status(200).json({
        success: true,
        metafield: tinMetafield || null, // Return the metafield if found
      });
    } else {
      const error = await response.json();
      console.error("Shopify API error:", error);
      return res.status(response.status).json({
        success: false,
        error: error,
      });
    }
  } catch (error) {
    console.error("Error fetching metafields:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }

});

// Endpoint for handling data from the Checkout UI Extension and posting it to Shopify API
app.post("/update-metafield", async (req, res) => {
  const { metafield } = req.body;
  console.log(req.body)
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!metafield || !metafield.ownerId) {
    return res.status(400).json({
      success: false,
      error: "Missing required metafield data or ownerId",
    });
  }

  const customerId = metafield.ownerId.split("/").pop(); // Extract customer ID from ownerId
  if (!customerId) {
    return res.status(400).json({
      success: false,
      error: "Invalid metafield ownerId format",
    });
  }

  try {
    // Send the metafield to Shopify's Admin API
    const shopifyResponse = await fetch(
      `https://sandeepgupta.myshopify.com/admin/api/2023-01/customers/${customerId}/metafields.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ metafield }),
      }
    );

    if (shopifyResponse.ok) {
      const data = await shopifyResponse.json();
      return res.status(200).json({
        success: true,
        message: "Metafield updated successfully",
        data,
      });
    }

    const error = await shopifyResponse.json();
    return res.status(shopifyResponse.status).json({
      success: false,
      error,
    });
  } catch (error) {
    console.error("Error updating metafield:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
});

// General Endpoint for Health Check or Greeting
app.get("/", (req, res) => {
  res.status(200).send(`<h1>Hello, Welcome back Boss! How is your day Today?</h1>`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Your Server is running at PORT ${PORT}`);
});
