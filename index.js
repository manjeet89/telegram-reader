const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const http = require("http");

// ===============================
// Telegram configuration
// ===============================

const apiId = 34086594;

// IMPORTANT:
// Put your API hash here.
// Do NOT share your API hash publicly.
const apiHash = "63692a62e1da9d19b523410024133737";

// Empty session for first login.
// We will save the session in a later step.
const stringSession = new StringSession("");

// ===============================
// Server configuration
// ===============================

const PORT = process.env.PORT || 3000;

// Number of Telegram messages to return
const MESSAGE_LIMIT = 20;

// Telegram channel/group
let fltChannel = null;

// Telegram client
let client = null;


// ===============================
// JSON response helper
// ===============================

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",

        // Allow Flutter/web requests
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    });

    res.end(JSON.stringify(data));
}


// ===============================
// HTTP Server
// ===============================

const server = http.createServer(async (req, res) => {

    // --------------------------------
    // CORS OPTIONS
    // --------------------------------

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });

        res.end();
        return;
    }


    // --------------------------------
    // GET /telegram/messages
    // --------------------------------

    if (
        req.method === "GET" &&
        req.url === "/telegram/messages"
    ) {

        console.log("");
        console.log("================================");
        console.log("Flutter requested Telegram messages");
        console.log("================================");


        // Check Telegram client
        if (!client) {
            sendJson(res, 500, {
                success: false,
                message: "Telegram client is not initialized",
            });

            return;
        }


        // Check channel
        if (!fltChannel) {
            sendJson(res, 404, {
                success: false,
                message: "FLT Looters channel not found",
            });

            return;
        }


        try {

            console.log("Reading latest messages...");


            // Get latest messages
            const messages = await client.getMessages(
                fltChannel,
                {
                    limit: MESSAGE_LIMIT,
                }
            );


            // Convert Telegram messages
            const result = messages.map((message) => {

                let date = null;

                if (message.date) {

                    const messageDate = new Date(
                        Number(message.date) * 1000
                    );

                    date = messageDate.toISOString();
                }


                return {
                    id: message.id,

                    date: date,

                    text: message.message || "",

                    // Useful later if message contains media
                    hasMedia: !!message.media,
                };
            });


            console.log(
                `Returning ${result.length} messages`
            );


            sendJson(res, 200, {
                success: true,

                channel: "FLT Looters",

                count: result.length,

                messages: result,
            });


        } catch (error) {

            console.error(
                "Telegram message error:",
                error
            );


            sendJson(res, 500, {
                success: false,

                message:
                    "Failed to read Telegram messages",

                error: error.message,
            });
        }

        return;
    }


    // --------------------------------
    // GET /
    // --------------------------------

    if (
        req.method === "GET" &&
        req.url === "/"
    ) {

        sendJson(res, 200, {

            success: true,

            message:
                "Telegram Reader API is running",

            endpoints: [
                "/telegram/messages",
            ],
        });

        return;
    }


    // --------------------------------
    // Unknown endpoint
    // --------------------------------

    sendJson(res, 404, {

        success: false,

        message: "Endpoint not found",

    });

});


// ===============================
// Telegram login
// ===============================

async function startTelegram() {

    console.log("");
    console.log("================================");
    console.log("Starting Telegram...");
    console.log("================================");
    console.log("");


    client = new TelegramClient(
        stringSession,
        apiId,
        apiHash,
        {
            connectionRetries: 5,
        }
    );


    // --------------------------------
    // Login
    // --------------------------------

    await client.start({

        phoneNumber: async () => {

            return await input.text(
                "Enter Telegram phone number: "
            );

        },


        phoneCode: async () => {

            return await input.text(
                "Enter Telegram login code: "
            );

        },


        password: async () => {

            return await input.text(
                "Enter Telegram 2FA password: "
            );

        },


        onError: (err) => {

            console.log(
                "Login error:",
                err
            );

        },

    });


    console.log("");
    console.log("================================");
    console.log("✅ Telegram Login Successful!");
    console.log("================================");
    console.log("");


    // --------------------------------
    // Find FLT Looters
    // --------------------------------

    console.log(
        "Searching for FLT Looters..."
    );

    console.log("");


    const dialogs = await client.getDialogs({});


    fltChannel = null;


    for (const dialog of dialogs) {

        if (!dialog.name) {
            continue;
        }


        console.log(
            "Found:",
            dialog.name
        );


        const normalizedName =
            dialog.name
                .toLowerCase()
                .replace(/\s+/g, "");


        if (
            normalizedName.includes(
                "fltlooters"
            )
        ) {

            fltChannel = dialog.entity;

        }

    }


    // --------------------------------
    // Channel not found
    // --------------------------------

    if (!fltChannel) {

        console.log("");

        console.log(
            "❌ FLT Looters not found."
        );

        console.log("");

        process.exit(1);

    }


    // --------------------------------
    // Channel found
    // --------------------------------

    console.log("");
    console.log("================================");
    console.log("✅ FLT Looters FOUND!");
    console.log("================================");
    console.log("");


    // --------------------------------
    // Start HTTP server
    // --------------------------------

    server.listen(
        PORT,
        "0.0.0.0",
        () => {

            console.log("");
            console.log("================================");
            console.log("🚀 Telegram API Server Started");
            console.log("================================");

            console.log("");

            console.log(
                `Local API: http://localhost:${PORT}`
            );

            console.log("");

            console.log(
                `Messages API: http://localhost:${PORT}/telegram/messages`
            );

            console.log("");

            console.log(
                "Waiting for Flutter requests..."
            );

            console.log("");

        }
    );

}


// ===============================
// Start application
// ===============================

startTelegram()
    .catch((error) => {

        console.error("");
        console.error(
            "❌ Application error:"
        );

        console.error(error);

        process.exit(1);

    });
